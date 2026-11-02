// =========================================================================================
// almacen-json.js — la carta en datos.json (GitHub) en vez de Google Sheets.
//
// Imita al Código.gs: intercepta las llamadas del editor a la URL de Apps Script / CSV
// publicado de cada modo (getWebAppUrl / getCsvUrl de config.js) y las resuelve contra el
// datos.json del repo de la web en GitHub:
//   GET  ?accion=csv            -> CSV con las mismas columnas y orden que "Hoja 1"
//   GET  ?accion=categorias     -> "ID,Activa" (las de "ocultas" en NO)
//   POST (sin accion)           -> guardado completo (misma mezcla que doPost: lo que no venga
//                                  en el payload se conserva; los platos que no vengan se borran)
//   POST ?accion=categorias     -> activa/desactiva pestaña o interruptor (fotos / info)
//   POST ?accion=infoplato      -> Info de un plato (+ huella INFO_HASH_FICHA)
// En el editor de la web (EDITOR_SITIO) también Menús Especiales (WEBAPP_URL_MENUS_ESPECIALES):
//   <carpeta de datos.json>/menus-especiales.json = { menus: [...], platosManuales: [...] }
//   Cada restaurante el suyo. La 1ª vez se copia lo que haya en la hoja de Menús Especiales.
// Cada guardado sube en un solo commit datos.json + datos/base.json + datos/<idioma>.json
// (lo que lee la web pública, por idiomas; solo los que cambian).
// El resto de peticiones (Gemini, Menús Especiales...) pasan tal cual.
//
// Token de GitHub: se pide la 1ª vez y se guarda en este navegador (hace de contraseña).
// Para cambiarlo: consola -> AlmacenJSON.cambiarToken()
// activo (abajo): 'url' = solo con ?json en la dirección; true = siempre; false = nunca.
// Se carga justo después de config.js (ver index.html).
//
// Editor dentro de la web (cartas\editores, lo monta construir.ps1 en <web>/editor/):
// window.EDITOR_SITIO (sitio-editor.js) fija UN restaurante, siempre JSON, guarda en el
// "datosGitHub" de su sitio.json y el token lo pone la pantalla de acceso (login.html).
// =========================================================================================
(function () {
    'use strict';
    window.APP_VERSIONS = window.APP_VERSIONS || {};
    window.APP_VERSIONS.almacenJson = '1.3.0';

    const BASE_RG = [
        'ID', 'Precio', 'Activa', 'Nombre_ES', 'Carpeta', 'Archivo_Foto', 'Alergenos_Cod',
        'Nombre_EN', 'Nombre_DE', 'Nombre_FR', 'Nombre_IT', 'Nombre_RU', 'Nombre_NL',
        'Nombre_PL', 'Nombre_SV', 'Nombre_NO', 'Nombre_DA', 'Nombre_FI', 'Nombre_PT',
        'Nombre_RO', 'Nombre_HU', 'Nombre_CS', 'Nombre_EL', 'Nombre_TR', 'Nombre_AR',
        'Nombre_ZH', 'Nombre_JA', 'Nombre_CA', 'Nombre_EU', 'Nombre_GL', 'Nombre_VA', 'Nombre_KO',
        'Opciones_Inactivas'
    ];

    // ---------- CONFIGURACIÓN ----------
    const CONFIG = /*CONFIG_INICIO*/{
        // 'url'  = solo si abres el editor con ?json (en pruebas: el editor normal sigue con Sheets)
        // true   = siempre (cuando las webs reales pasen a JSON) · false = nunca
        activo: 'url',
        modos: {
            restaurante001: { repo: 'srcorsario/cartas-pruebas', ruta: 'rg/datos.json', restaurante: 'rg', columnasBase: BASE_RG },
            restaurante002: { repo: 'srcorsario/cartas-pruebas', ruta: 'usopen/datos.json', restaurante: 'usopen', columnasBase: BASE_RG }
        }
    }/*CONFIG_FIN*/;
    // -----------------------------------

    // ---------- editor dentro de la web ----------
    const SITIO = window.EDITOR_SITIO || null;
    const MODOS_TODOS = Object.keys(CONFIG.modos);
    if (SITIO) {
        const base = CONFIG.modos[SITIO.modo];
        if (!base) throw new Error('[almacen-json] modo desconocido en EDITOR_SITIO: ' + SITIO.modo);
        CONFIG.activo = true;
        CONFIG.modos = {};
        CONFIG.modos[SITIO.modo] = Object.assign({}, base, { repo: SITIO.repo, ruta: SITIO.ruta, restaurante: SITIO.restaurante });
        const rc = window.RESTAURANTES_CONFIG;
        if (rc) Object.keys(rc).forEach(m => { rc[m].enabled = (m === SITIO.modo); });
        window.currentMode = SITIO.modo;
        // Pestaña inicial: la del editor de este restaurante (los botones ya existen aquí).
        if (SITIO.modo === 'restaurante002') {
            const a = document.getElementById('tab-btn-rg'), b = document.getElementById('tab-btn-usopen');
            if (a && b) { a.classList.remove('active'); b.classList.add('active'); }
        }
        // Traductor Pro e importar CSV: solo este restaurante.
        const ocultar = (id, subir) => {
            let el = document.getElementById(id);
            for (let i = 0; el && i < (subir || 0); i++) el = el.parentElement;
            if (el) el.style.display = 'none';
        };
        const otro = SITIO.modo === 'restaurante002' ? { url: 'sheetsUrlRG', dest: 'modal-dest-rg' } : { url: 'sheetsUrlUSOpen', dest: 'modal-dest-usopen' };
        ocultar(otro.url, 2);   // input -> fila -> bloque "WEB ..."
        ocultar(otro.dest);
    }

    const fetchOriginal = window.fetch.bind(window);
    const CLAVE_TOKEN = SITIO ? SITIO.claveToken : 'almacenJson.token';
    const API = 'https://api.github.com/repos/';

    // ---------- token ----------
    function leerToken() {
        try { return sessionStorage.getItem(CLAVE_TOKEN) || localStorage.getItem(CLAVE_TOKEN) || ''; } catch (e) { return ''; }
    }
    function borrarToken() {
        try { sessionStorage.removeItem(CLAVE_TOKEN); } catch (e) { }
        try { localStorage.removeItem(CLAVE_TOKEN); } catch (e) { }
    }
    function pedirToken(motivo) {
        // En el editor de la web no se pide token: se vuelve a la pantalla de acceso.
        if (SITIO) { if (window.AccesoEditor) window.AccesoEditor.caducado(motivo); return ''; }
        const t = (window.prompt((motivo ? motivo + '\n\n' : '') +
            'Token de GitHub para leer y guardar la carta (datos.json).\nSe guarda solo en este navegador.') || '').trim();
        if (t) { try { localStorage.setItem(CLAVE_TOKEN, t); } catch (e) { } }
        return t;
    }
    function token() { return leerToken() || pedirToken(); }

    // ---------- utilidades ----------
    const b64aTexto = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0)));
    function textoAB64(txt) {
        const bytes = new TextEncoder().encode(txt);
        let bin = '';
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        return btoa(bin);
    }
    const clonar = (o) => JSON.parse(JSON.stringify(o));
    const respuesta = (texto, estado, tipo) => new Response(texto, { status: estado || 200, headers: { 'Content-Type': tipo || 'text/plain; charset=utf-8' } });
    const idNum = (v) => parseFloat(v);

    function escaparCsv(v) {
        const t = (v === null || v === undefined) ? '' : String(v);
        return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    }

    // ---------- datos.json <-> filas de "Hoja 1" ----------
    function cabecerasDe(datos, cfg) {
        const info = new Set(), extra = [];
        (datos.platos || []).forEach(p => {
            Object.keys(p.info || {}).forEach(k => info.add('INFO_' + k.toUpperCase()));
            Object.keys(p.extra || {}).forEach(k => { if (!extra.some(e => e.toUpperCase() === k.toUpperCase())) extra.push(k); });
        });
        const infos = Array.from(info).sort().map(k => 'INFO_' + k.replace('INFO_', '').toLowerCase());
        return cfg.columnasBase.concat(infos, extra, ['Hash_Fila']);
    }

    function valorDePlato(p, h) {
        const H = h.toUpperCase();
        switch (H) {
            case 'ID': return p.id;
            case 'PRECIO': return p.precio;
            case 'ACTIVA': return p.activa;
            case 'CARPETA': return p.carpeta;
            case 'ARCHIVO_FOTO': return p.archivo;
            case 'ALERGENOS_COD': return (p.alergenos || []).join(',');
            case 'OPCIONES_INACTIVAS': return (p.opcionesInactivas || []).join(',');
            case 'PRECIO_MEDIA': return p.precioMedia;
            case 'HASH_FILA': return '';
        }
        if (H.indexOf('NOMBRE_') === 0) return (p.nombre || {})[H.slice(7)];
        if (H.indexOf('INFO_') === 0) return (p.info || {})[H.slice(5)];
        const ex = p.extra || {};
        const k = Object.keys(ex).find(x => x.toUpperCase() === H);
        return k ? ex[k] : '';
    }

    // fila: { CABECERA_MAYUS: valor }. Parte del plato anterior para no perder nada que no
    // esté en las columnas de este editor (p. ej. precioMedia en RG).
    function platoDeFila(fila, previo) {
        const p = previo ? clonar(previo) : { id: '', activa: '', precio: '', precioMedia: '', carpeta: '', archivo: '', alergenos: [], opcionesInactivas: [], nombre: {}, info: {} };
        p.nombre = p.nombre || {}; p.info = p.info || {};
        const s = (v) => (v === null || v === undefined) ? '' : String(v).trim();
        Object.keys(fila).forEach(H => {
            const v = s(fila[H]);
            switch (H) {
                case 'ID': p.id = v; break;
                case 'PRECIO': p.precio = v; break;
                case 'ACTIVA': p.activa = v; break;
                case 'CARPETA': p.carpeta = v; break;
                case 'ARCHIVO_FOTO': p.archivo = v; break;
                case 'ALERGENOS_COD': p.alergenos = v.split(',').map(x => x.trim()).filter(x => x); break;
                case 'OPCIONES_INACTIVAS': p.opcionesInactivas = v.split(',').map(x => parseInt(x, 10)).filter(n => !isNaN(n)); break;
                case 'PRECIO_MEDIA': p.precioMedia = v; break;
                case 'HASH_FILA': break;
                default:
                    if (H.indexOf('NOMBRE_') === 0) { if (v) p.nombre[H.slice(7)] = v; else delete p.nombre[H.slice(7)]; }
                    else if (H.indexOf('INFO_') === 0) { if (v) p.info[H.slice(5)] = v; else delete p.info[H.slice(5)]; }
                    else {
                        p.extra = p.extra || {};
                        const k = Object.keys(p.extra).find(x => x.toUpperCase() === H) || H;
                        if (v) p.extra[k] = v; else delete p.extra[k];
                        if (!Object.keys(p.extra).length) delete p.extra;
                    }
            }
        });
        return p;
    }

    function csvDe(datos, cfg) {
        const cab = cabecerasDe(datos, cfg);
        const lineas = [cab.map(escaparCsv).join(',')];
        (datos.platos || []).forEach(p => lineas.push(cab.map(h => escaparCsv(valorDePlato(p, h))).join(',')));
        return lineas.join('\r\n');
    }

    // Mismo formato que hoja-a-json.ps1 (un plato por bloque) para que los cambios se lean bien.
    function serializar(d) {
        const J = JSON.stringify;
        const dic = (o, sangria) => {
            const ks = Object.keys(o || {});
            if (!ks.length) return '{}';
            return '{\n' + ks.map(k => sangria + '    ' + J(k) + ': ' + J(String(o[k]))).join(',\n') + '\n' + sangria + '}';
        };
        const platos = (d.platos || []).map(p => {
            let b = '    {\n' +
                '        "id": ' + J(String(p.id)) + ', "activa": ' + J(String(p.activa || '')) +
                ', "precio": ' + J(String(p.precio == null ? '' : p.precio)) + ', "precioMedia": ' + J(String(p.precioMedia == null ? '' : p.precioMedia)) + ',\n' +
                '        "carpeta": ' + J(String(p.carpeta || '')) + ', "archivo": ' + J(String(p.archivo || '')) + ',\n' +
                '        "alergenos": ' + J(p.alergenos || []).replace(/","/g, '", "') + ', "opcionesInactivas": ' + J(p.opcionesInactivas || []).replace(/,/g, ', ') + ',\n' +
                '        "nombre": ' + dic(p.nombre, '        ') + ',\n' +
                '        "info": ' + dic(p.info, '        ');
            if (p.extra && Object.keys(p.extra).length) b += ',\n        "extra": ' + dic(p.extra, '        ');
            return b + '\n    }';
        });
        return '{\n' +
            '  "formato": ' + J(d.formato || 1) + ',\n' +
            '  "restaurante": ' + J(d.restaurante || '') + ',\n' +
            '  "generado": ' + J(d.generado || '') + ',\n' +
            '  "guardado": ' + J(new Date().toISOString()) + ',\n' +
            '  "ocultas": ' + J(d.ocultas || []).replace(/","/g, '", "') + ',\n' +
            '  "platos": [\n' + platos.join(',\n') + '\n  ]\n}\n';
    }

    // ---------- GitHub ----------
    async function gh(cfg, opciones, intentoToken, ref) {
        const t = token();
        if (!t) throw new Error('Sin token de GitHub');
        const r = await fetchOriginal(API + cfg.repo + '/contents/' + cfg.ruta + (ref ? '?ref=' + ref : ''), Object.assign({ cache: 'no-store' }, opciones, {
            headers: Object.assign({ Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json' }, (opciones && opciones.headers) || {})
        }));
        if ((r.status === 401 || r.status === 403) && !intentoToken) {
            borrarToken();
            if (pedirToken('El token no vale o no tiene permiso para ' + cfg.repo + ' (HTTP ' + r.status + ').')) return gh(cfg, opciones, true, ref);
        }
        return r;
    }

    async function leerRemoto(cfg) {
        const r = await gh(cfg, { method: 'GET' });
        if (r.status === 404) return { datos: { formato: 1, restaurante: cfg.restaurante, generado: '', ocultas: [], platos: [] }, sha: null };
        if (!r.ok) throw new Error('GitHub HTTP ' + r.status + ' leyendo ' + cfg.repo + '/' + cfg.ruta);
        const j = await r.json();
        let texto;
        if (j.content && j.encoding === 'base64') texto = b64aTexto(j.content);
        else {
            const r2 = await gh(cfg, { method: 'GET', headers: { Accept: 'application/vnd.github.raw' } });
            if (!r2.ok) throw new Error('GitHub HTTP ' + r2.status + ' (raw)');
            texto = await r2.text();
        }
        return { datos: JSON.parse(texto), sha: j.sha };
    }

    // ---------- datos.json -> datos/base.json + datos/<idioma>.json (lo que lee la web) ----------
    // Mismo formato y huella "h" que construir.ps1 (Dividir-Datos).
    const IDIOMAS_WEB = ['ES', 'EN', 'DE', 'FR', 'IT', 'RU', 'NL', 'PL', 'SV', 'NO', 'DA', 'FI', 'PT', 'RO', 'HU', 'CS', 'EL', 'TR', 'AR', 'ZH', 'JA', 'KO', 'CA', 'EU', 'GL', 'VA'];
    const hex = (buf, n) => Array.from(new Uint8Array(buf)).slice(0, n || 1e9).map(b => b.toString(16).padStart(2, '0')).join('');
    async function dividir(datos) {
        const S = (v) => (v === null || v === undefined) ? '' : String(v);
        const J = JSON.stringify;
        const porIdioma = {}; IDIOMAS_WEB.forEach(l => { porIdioma[l] = []; });
        const filas = [];
        for (const p of (datos.platos || [])) {
            const id = S(p.id); if (!id) continue;
            const al = (p.alergenos || []).map(S), op = (p.opcionesInactivas || []).map(S);
            const partes = [id, S(p.activa), S(p.precio), S(p.precioMedia), S(p.carpeta), S(p.archivo), al.join(','), op.join(',')];
            IDIOMAS_WEB.forEach(l => {
                const n = S((p.nombre || {})[l]), i = S((p.info || {})[l]);
                partes.push(n, i);
                if (n || i) porIdioma[l].push(J(id) + ':[' + J(n) + ',' + J(i) + ']');
            });
            const h = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(partes.join('\u001f'))), 6);
            filas.push('{"id":' + J(id) + ',"activa":' + J(S(p.activa)) + ',"precio":' + J(S(p.precio)) + ',"precioMedia":' + J(S(p.precioMedia)) +
                ',"carpeta":' + J(S(p.carpeta)) + ',"archivo":' + J(S(p.archivo)) + ',"alergenos":[' + al.map(x => J(x)).join(',') +
                '],"opcionesInactivas":[' + op.join(',') + '],"h":' + J(h) + '}');
        }
        const res = { 'datos/base.json': '{"ocultas":[' + (datos.ocultas || []).map(x => J(S(x))).join(',') + '],"platos":[\n' + filas.join(',\n') + '\n]}\n' };
        IDIOMAS_WEB.forEach(l => { res['datos/' + l.toLowerCase() + '.json'] = '{\n' + porIdioma[l].join(',\n') + '\n}\n'; });
        return res;
    }

    // ---------- commit de varios archivos a la vez (API de Git de GitHub) ----------
    async function ghApi(cfg, ruta, metodo, cuerpo) {
        const t = token();
        const r = await fetchOriginal('https://api.github.com/repos/' + cfg.repo + ruta, {
            method: metodo || 'GET', cache: 'no-store',
            headers: { Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
            body: cuerpo ? JSON.stringify(cuerpo) : undefined
        });
        if (!r.ok) { const e = new Error('GitHub HTTP ' + r.status + ' en ' + ruta + ': ' + (await r.text()).slice(0, 200)); e.status = r.status; throw e; }
        return r.json();
    }
    async function shaBlob(texto) {
        const b = new TextEncoder().encode(texto);
        const cab = new TextEncoder().encode('blob ' + b.length + '\0');
        const todo = new Uint8Array(cab.length + b.length); todo.set(cab); todo.set(b, cab.length);
        return hex(await crypto.subtle.digest('SHA-1', todo));
    }

    // Sube datos.json + los archivos de la web que cambien, en UN commit. Si datos.json cambió en
    // GitHub desde que se leyó (otro dispositivo), lanza "conflicto" para releer y reaplicar.
    async function escribirRemoto(cfg, datos, shaLeido, mensaje, e) {
        const dir = cfg.ruta.indexOf('/') >= 0 ? cfg.ruta.slice(0, cfg.ruta.lastIndexOf('/') + 1) : '';
        const archivos = Object.assign({ [cfg.ruta]: serializar(datos) }, {});
        const web = await dividir(datos);
        Object.keys(web).forEach(k => {
            if (!e.ultimosWeb || e.ultimosWeb[k] !== web[k]) archivos[dir + k] = web[k];
        });
        if (!e.rama) e.rama = (await ghApi(cfg, '', 'GET')).default_branch || 'main';
        let entradas = null;
        for (let intento = 0; intento < 4; intento++) {
            const ref = await ghApi(cfg, '/git/ref/heads/' + e.rama);
            const cabeza = ref.object.sha;
            const actual = await gh(cfg, { method: 'GET' }, false, cabeza);
            if (actual.status === 200) {
                const shaActual = (await actual.json()).sha;
                if (shaActual !== shaLeido) { const c = new Error('conflicto'); c.conflicto = true; throw c; }
            } else if (actual.status !== 404 || shaLeido) { const c = new Error('conflicto'); c.conflicto = true; throw c; }
            const commitCabeza = await ghApi(cfg, '/git/commits/' + cabeza);
            if (!entradas) {
                entradas = await Promise.all(Object.keys(archivos).map(ruta =>
                    ghApi(cfg, '/git/blobs', 'POST', { content: archivos[ruta], encoding: 'utf-8' })
                        .then(b => ({ path: ruta, mode: '100644', type: 'blob', sha: b.sha }))));
            }
            const arbol = await ghApi(cfg, '/git/trees', 'POST', { base_tree: commitCabeza.tree.sha, tree: entradas });
            const commit = await ghApi(cfg, '/git/commits', 'POST', { message: mensaje, tree: arbol.sha, parents: [cabeza] });
            try {
                await ghApi(cfg, '/git/refs/heads/' + e.rama, 'PATCH', { sha: commit.sha, force: false });
            } catch (err) {
                if (err.status === 422 || err.status === 409) continue; // alguien subió algo a la vez: otra vuelta
                throw err;
            }
            e.ultimosWeb = web;
            return shaBlob(archivos[cfg.ruta]);
        }
        throw new Error('El repo cambia sin parar; vuelve a guardar en un momento.');
    }

    // ---------- estado y cola de guardado por modo ----------
    // vista = remoto + cambios aún no confirmados. Los cambios se agrupan (unos segundos) en un
    // solo commit; si otro dispositivo guardó entretanto, se relee y se vuelven a aplicar.
    const estados = {};
    function est(modo) {
        return estados[modo] || (estados[modo] = { base: null, sha: null, vista: null, sinConfirmar: [], temporizador: null, cadena: Promise.resolve(), esperando: [] });
    }

    async function refrescar(modo) {
        const e = est(modo), cfg = CONFIG.modos[modo];
        const { datos, sha } = await leerRemoto(cfg);
        e.base = datos; e.sha = sha; e.ultimosWeb = null;
        e.vista = clonar(datos);
        e.sinConfirmar.forEach(c => c.op(e.vista));
    }

    async function vista(modo, fresca) {
        const e = est(modo);
        if (!e.vista || (fresca && e.sinConfirmar.length === 0)) await refrescar(modo);
        return e.vista;
    }

    function encolar(modo, op, mensaje, retraso) {
        const e = est(modo);
        return vista(modo).then(v => {
            op(v);
            e.sinConfirmar.push({ op, mensaje });
            return new Promise((resolver, rechazar) => {
                e.esperando.push({ resolver, rechazar });
                clearTimeout(e.temporizador);
                e.temporizador = setTimeout(() => { e.cadena = e.cadena.then(() => vaciar(modo)); }, retraso);
            });
        });
    }

    async function vaciar(modo) {
        const e = est(modo), cfg = CONFIG.modos[modo];
        const lote = e.sinConfirmar.slice(), esperando = e.esperando.splice(0);
        if (!lote.length) { esperando.forEach(w => w.resolver()); return; }
        const mensajes = Array.from(new Set(lote.map(c => c.mensaje)));
        const mensaje = 'Editor: ' + mensajes.slice(0, 3).join(' · ') + (mensajes.length > 3 ? ' (+' + (mensajes.length - 3) + ')' : '');
        try {
            for (let intento = 0; ; intento++) {
                try {
                    const datos = clonar(e.vista);
                    e.sha = await escribirRemoto(cfg, datos, e.sha, mensaje, e);
                    // Confirmados los del lote; los que llegaran después siguen pendientes.
                    e.sinConfirmar = e.sinConfirmar.filter(c => lote.indexOf(c) === -1);
                    e.base = datos;
                    break;
                } catch (err) {
                    if (!err.conflicto || intento >= 3) throw err;
                    await refrescar(modo);
                }
            }
            esperando.forEach(w => w.resolver());
        } catch (err) {
            console.error('[almacen-json] No se pudo guardar en GitHub:', err);
            alert('❌ NO se ha guardado en GitHub (' + cfg.repo + '/' + cfg.ruta + '):\n' + err.message + '\n\nLos cambios siguen en esta pestaña; vuelve a guardar.');
            esperando.forEach(w => w.rechazar(err));
        }
    }

    // ---------- operaciones (equivalentes a Código.gs) ----------
    function opGuardarTodo(payload, cfg) {
        return (datos) => {
            const previos = {};
            (datos.platos || []).forEach(p => { previos[idNum(p.id)] = p; });
            const infoSet = {};
            cabecerasDe(datos, cfg).forEach(h => { if (h.toUpperCase().indexOf('INFO_') === 0) infoSet[h.toUpperCase()] = true; });
            payload.forEach(p => Object.keys(p).forEach(k => { if (k.toUpperCase().indexOf('INFO_') === 0) infoSet[k.toUpperCase()] = true; }));
            const cabs = cfg.columnasBase.concat(Object.keys(infoSet).sort().map(k => 'INFO_' + k.replace('INFO_', '').toLowerCase()));

            const ordenados = payload.slice().sort((a, b) => (idNum(a.id || a.ID) || 0) - (idNum(b.id || b.ID) || 0));
            datos.platos = ordenados.map(p => {
                const previo = previos[idNum(p.id || p.ID)] || null;
                const fila = {};
                cabs.forEach(k => {
                    const K = k.toUpperCase();
                    let claves = [k, k.toLowerCase(), K, k.toLowerCase().replace(/_/g, ''), k.toLowerCase().replace(/([a-z])([A-Z])/g, '$1_$2')];
                    if (K === 'ACTIVA') claves = ['activa', 'Activa', 'ACTIVA'];
                    else if (K === 'ARCHIVO_FOTO') claves = ['archivo_foto', 'archivoFoto', 'Archivo_Foto', 'ARCHIVO_FOTO', 'imagen', 'foto'];
                    else if (K === 'ALERGENOS_COD') claves = ['alergenos_cod', 'alergenosCod', 'Alergenos_Cod', 'ALERGENOS_COD', 'alergenos'];
                    else if (K === 'PRECIO') claves = ['precio', 'Precio', 'PRECIO'];
                    else if (K === 'CARPETA') claves = ['carpeta', 'Carpeta', 'CARPETA'];
                    else if (K === 'OPCIONES_INACTIVAS') claves = ['opciones_inactivas', 'opcionesInactivas', 'Opciones_Inactivas', 'OPCIONES_INACTIVAS'];
                    else if (K === 'PRECIO_MEDIA') claves = ['precio_media', 'precioMedia', 'Precio_Media', 'PRECIO_MEDIA'];
                    else if (K.indexOf('INFO_') === 0) { const l = K.slice(5).toLowerCase(); claves = ['info_' + l, 'info_' + l.toUpperCase(), 'INFO_' + l.toUpperCase()]; }
                    let v, hay = false;
                    for (const c of claves) { if (p[c] !== undefined && p[c] !== null) { v = p[c]; hay = true; break; } }
                    if (!hay) Object.keys(p).forEach(prop => { if (prop.toUpperCase() === K && p[prop] !== undefined && p[prop] !== null) { v = p[prop]; hay = true; } });
                    if (!hay && previo) { v = valorDePlato(previo, k); hay = v !== undefined && v !== null; }
                    fila[K] = hay ? (typeof v === 'object' ? JSON.stringify(v) : v) : '';
                });
                return platoDeFila(fila, previo);
            });
        };
    }

    function opCategoria(cuerpo) {
        return (datos) => {
            const id = String(cuerpo.id || '').trim();
            if (!id) return;
            const s = new Set((datos.ocultas || []).map(String));
            if (cuerpo.activa) s.delete(id); else s.add(id);
            datos.ocultas = Array.from(s);
        };
    }

    function opInfoPlato(cuerpo) {
        return (datos) => {
            const p = (datos.platos || []).find(x => idNum(x.id) === idNum(cuerpo.id));
            if (!p) { console.warn('[almacen-json] infoplato: no existe el plato', cuerpo.id); return; }
            p.info = p.info || {};
            Object.keys(cuerpo.info || {}).forEach(l => {
                const v = cuerpo.info[l];
                p.info[l.toUpperCase()] = typeof v === 'string' ? v : JSON.stringify(v);
            });
            if (cuerpo.hashFicha !== undefined && cuerpo.hashFicha !== null && String(cuerpo.hashFicha)) p.info.HASH_FICHA = String(cuerpo.hashFicha);
        };
    }

    // ---------- interceptor ----------
    function baseUrl(u) { return String(u || '').split('?')[0].split('#')[0]; }
    function modoDeUrl(url) {
        const b = baseUrl(url);
        if (!b) return null;
        for (const modo of MODOS_TODOS) {
            const w = typeof window.getWebAppUrl === 'function' ? window.getWebAppUrl(modo) : '';
            const c = typeof window.getCsvUrl === 'function' ? window.getCsvUrl(modo) : '';
            if ((w && baseUrl(w) === b) || (c && baseUrl(c) === b)) return modo;
        }
        return null;
    }

    async function manejar(modo, url, init) {
        const cfg = CONFIG.modos[modo];
        const params = new URL(url, location.href).searchParams;
        const accion = params.get('accion') || '';
        const metodo = String(init.method || 'GET').toUpperCase();
        try {
            if (metodo === 'GET') {
                const d = await vista(modo, true);
                if (accion === 'categorias') {
                    return respuesta(['ID,Activa'].concat((d.ocultas || []).map(id => escaparCsv(id) + ',NO')).join('\r\n'), 200, 'text/csv; charset=utf-8');
                }
                return respuesta(csvDe(d, cfg), 200, 'text/csv; charset=utf-8');
            }
            const cuerpo = init.body ? JSON.parse(init.body) : null;
            if (accion === 'categorias') {
                await encolar(modo, opCategoria(cuerpo), 'pestaña ' + cuerpo.id + (cuerpo.activa ? ' activa' : ' oculta'), 300);
                return respuesta('OK: pestaña ' + cuerpo.id);
            }
            if (accion === 'infoplato') {
                // No se espera al commit: los lotes de Info mandan muchas seguidas y se agrupan.
                encolar(modo, opInfoPlato(cuerpo), 'info', 4000).catch(() => { });
                return respuesta('OK: Info guardada para el plato ID ' + cuerpo.id);
            }
            if (!Array.isArray(cuerpo) || !cuerpo.length) return respuesta('Error: Datos vacíos recibidos.');
            await encolar(modo, opGuardarTodo(cuerpo, cfg), 'guardar carta (' + cuerpo.length + ' platos)', 300);
            return respuesta('Sincronización Correcta: ' + cuerpo.length + ' filas.');
        } catch (err) {
            console.error('[almacen-json]', err);
            return respuesta('Error: ' + err.message, 500);
        }
    }

    // ---------- Menús Especiales (solo editor de la web) ----------
    const urlMenus = () => (typeof window.WEBAPP_URL_MENUS_ESPECIALES === 'string') ? window.WEBAPP_URL_MENUS_ESPECIALES : '';
    const cfgMenus = () => {
        const c = CONFIG.modos[SITIO.modo];
        return { repo: c.repo, ruta: c.ruta.replace(/[^/]*$/, '') + 'menus-especiales.json' };
    };
    const jsonResp = (o) => respuesta(JSON.stringify(o), 200, 'application/json; charset=utf-8');
    let colaMenus = Promise.resolve();

    async function leerMenus() {
        const cfg = cfgMenus();
        const r = await gh(cfg, { method: 'GET' });
        if (r.ok) {
            const j = await r.json();
            const d = JSON.parse(b64aTexto(j.content || ''));
            return { datos: { menus: d.menus || [], platosManuales: d.platosManuales || [] }, sha: j.sha };
        }
        if (r.status !== 404) throw new Error('GitHub HTTP ' + r.status + ' leyendo ' + cfg.ruta);
        // 1ª vez: se parte de lo que haya en la hoja de Menús Especiales (solo lectura).
        const datos = { menus: [], platosManuales: [] };
        const u = urlMenus();
        if (u) {
            try {
                const [m, p] = await Promise.all([
                    fetchOriginal(u + '?accion=listarMenus&zx=' + Date.now(), { cache: 'no-store' }).then(x => x.json()),
                    fetchOriginal(u + '?accion=listarPlatosManuales&zx=' + Date.now(), { cache: 'no-store' }).then(x => x.json())
                ]);
                if (m && Array.isArray(m.menus)) datos.menus = m.menus;
                if (p && Array.isArray(p.platos)) datos.platosManuales = p.platos;
                console.log('[almacen-json] menus-especiales.json nuevo: copiados de la hoja', datos.menus.length, 'menús y', datos.platosManuales.length, 'platos');
            } catch (e) { console.warn('[almacen-json] No se pudo copiar la hoja de Menús Especiales:', e); }
        }
        return { datos, sha: null };
    }

    // op(datos) -> respuesta (objeto); se reintenta si otro dispositivo guardó a la vez.
    function cambiarMenus(op, mensaje) {
        const tarea = colaMenus.then(async () => {
            for (let intento = 0; intento < 3; intento++) {
                const { datos, sha } = await leerMenus();
                const res = op(datos);
                if (!res.ok) return res;
                const texto = JSON.stringify({ formato: 1, restaurante: SITIO.restaurante, guardado: new Date().toISOString(), menus: datos.menus, platosManuales: datos.platosManuales }, null, 1) + '\n';
                const cuerpo = { message: 'Menús Especiales: ' + mensaje, content: textoAB64(texto) };
                if (sha) cuerpo.sha = sha;
                const r = await gh(cfgMenus(), { method: 'PUT', body: JSON.stringify(cuerpo) });
                if (r.ok) return res;
                if (r.status !== 409 && r.status !== 422) throw new Error('GitHub HTTP ' + r.status + ' guardando menús');
            }
            throw new Error('No se pudo guardar (otro dispositivo guardando a la vez). Reintenta.');
        });
        colaMenus = tarea.catch(() => { });
        return tarea;
    }

    const normalizarPlato = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

    async function manejarMenus(url, init) {
        const accion = new URL(url, location.href).searchParams.get('accion') || '';
        const metodo = String(init.method || 'GET').toUpperCase();
        try {
            if (metodo === 'GET') {
                await colaMenus;
                const { datos } = await leerMenus();
                if (accion === 'listarPlatosManuales') return jsonResp({ ok: true, platos: datos.platosManuales });
                const menus = datos.menus.slice().sort((a, b) => String(b.fechaModificacion || '').localeCompare(String(a.fechaModificacion || '')));
                return jsonResp({ ok: true, menus });
            }
            const c = JSON.parse(typeof init.body === 'string' ? init.body : '{}');
            const ahora = new Date().toISOString();
            let res;
            if (accion === 'eliminarMenu') {
                const id = String(c.id || '').trim();
                res = await cambiarMenus(d => {
                    const i = d.menus.findIndex(m => String(m.id) === id);
                    if (i < 0) return { ok: false, error: 'No se encontró ningún menú con ese id.' };
                    d.menus.splice(i, 1); return { ok: true };
                }, 'borrar menú');
            } else if (accion === 'guardarPlatoManual') {
                const es = String(c.es || '').trim(), en = String(c.en || '').trim(), tipo = c.tipo === 'postre' ? 'postre' : 'principal';
                if (!es) return jsonResp({ ok: false, error: 'Falta el nombre del plato.' });
                res = await cambiarMenus(d => {
                    const p = d.platosManuales.find(x => normalizarPlato(x.es) === normalizarPlato(es));
                    if (p) { p.en = en; p.tipo = tipo; return { ok: true, id: p.id, creado: false }; }
                    const id = d.platosManuales.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
                    d.platosManuales.push({ id, es, en, tipo }); return { ok: true, id, creado: true };
                }, 'plato ' + es);
            } else if (accion === 'eliminarPlatoManual') {
                const id = Number(c.id);
                res = await cambiarMenus(d => {
                    const i = d.platosManuales.findIndex(x => Number(x.id) === id);
                    if (i < 0) return { ok: false, error: 'No se encontró ningún plato con ese id.' };
                    d.platosManuales.splice(i, 1); return { ok: true };
                }, 'borrar plato');
            } else {
                const nombre = String(c.nombre || '').trim();
                if (!nombre) return jsonResp({ ok: false, error: 'Falta el nombre del menú.' });
                const idE = String(c.id || '').trim();
                res = await cambiarMenus(d => {
                    const m = idE && d.menus.find(x => String(x.id) === idE);
                    if (m) { m.nombre = nombre; m.config = c.config || {}; m.fechaModificacion = ahora; return { ok: true, id: idE, creado: false }; }
                    const id = (crypto.randomUUID ? crypto.randomUUID() : 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2));
                    d.menus.push({ id, nombre, config: c.config || {}, fechaCreacion: ahora, fechaModificacion: ahora });
                    return { ok: true, id, creado: true };
                }, 'guardar ' + nombre);
            }
            return jsonResp(res);
        } catch (err) {
            console.error('[almacen-json] menús', err);
            return jsonResp({ ok: false, error: err.message });
        }
    }

    let activo = CONFIG.activo === true;
    if (CONFIG.activo === 'url') {
        try {
            const q = new URLSearchParams(location.search);
            if (q.has('json')) sessionStorage.setItem('almacenJson.activo', q.get('json') === '0' ? '0' : '1');
            activo = sessionStorage.getItem('almacenJson.activo') === '1';
        } catch (e) { activo = /[?&]json(=1)?(&|$)/.test(location.search); }
    }

    if (activo) {
        window.fetch = function (input, init) {
            const url = typeof input === 'string' ? input : (input && input.url) || '';
            if (SITIO && urlMenus() && baseUrl(url) === baseUrl(urlMenus())) return manejarMenus(url, init || {});
            const modo = modoDeUrl(url);
            if (!modo) return fetchOriginal(input, init);
            // Editor de la web: nunca toca el Sheets/Apps Script de otro restaurante.
            if (!CONFIG.modos[modo]) return Promise.resolve(respuesta('Error: este editor solo es de ' + (SITIO ? SITIO.restaurante : '?'), 403));
            return manejar(modo, url, init || {});
        };
        window.addEventListener('beforeunload', (ev) => {
            if (Object.values(estados).some(e => e.sinConfirmar.length)) { ev.preventDefault(); ev.returnValue = ''; }
        });
        console.log('[almacen-json] Carta en GitHub:', Object.values(CONFIG.modos).map(m => m.repo + '/' + m.ruta).join(', '));
    }

    window.AlmacenJSON = {
        config: CONFIG,
        activo: activo,
        cambiarToken: () => { borrarToken(); return !!pedirToken(); },
        pendientes: () => Object.fromEntries(Object.entries(estados).map(([m, e]) => [m, e.sinConfirmar.length])),
        _serializar: serializar, _csvDe: csvDe
    };
})();
