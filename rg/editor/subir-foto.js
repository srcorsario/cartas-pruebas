// =========================================================================================
// subir-foto.js — "📷 Fotos del plato" en la ficha del plato (editor dentro de la web).
//   Gestor de las fotos de un plato en GitHub, junto a datos.json:
//     activas:      <web>/imagenes/<carpeta>/<nombre>01.webp … 04.webp
//     desactivadas: <web>/imagenes/<carpeta>/desactivadas/<nombre>0N.webp (la web no las ve)
//   La web busca primero la 01 y luego 02, 03, 04 seguidas (se para en el primer hueco), así
//   que al guardar las activas SIEMPRE se renumeran 01, 02, 03… sin huecos.
//   Añadir: cualquier imagen que abra el navegador -> recorte (Cropper.js: libre, 4:3, 1:1...,
//   girar) -> máx. MAX_LADO px -> WebP (si el navegador no sabe crear WebP, con el codificador
//   libwebp de jSquash). Las fotos ya subidas también se pueden volver a recortar. Mover, desactivar, eliminar y
//   cambiar el nombre se guardan juntos en UN commit (Git Data API).
// Lo inserta construir.ps1 en <web>/editor/. Usa el token de la sesión (login.html).
// =========================================================================================
(function () {
    'use strict';
    var S = window.EDITOR_SITIO;
    if (!S) return;
    window.APP_VERSIONS = window.APP_VERSIONS || {};
    window.APP_VERSIONS.subirFoto = '1.23.0'; // 9 nov: 🖼️ Fotos de internet: filtro por SECCIÓN (categoría del plato asignado, o "Sin asignar") y "↩ Desasignar" en las fotos asignadas (quita la marca en todos los navegadores; no borra la foto del plato). 1.22.1, 9 nov: 📷 Fotos del plato: las desactivadas (de repuesto) también se pueden recortar/girar (✂ Recortar). 1.22.0, 9 nov: 📷 Fotos del plato: "🔍 Buscar repetidas" (marca en rojo las fotos iguales a otra del plato) + "🗑 Quitar repetidas (N)"; VISOR a pantalla completa al pulsar una foto: ← → o clic a los lados para pasar, Supr = eliminar (Intro = sí, Esc = no), Esc cierra. 1.21.0, 9 nov: 📷 Fotos del plato avisa si la foto que añades ya está en el plato (huella exacta de la original ya asignada a este plato, o parecido visual con alguna de sus fotos aunque esté recortada) y pregunta si añadirla igualmente; las fotos añadidas a mano también quedan anotadas como asignadas. 1.20.0, 9 nov: fotos de la CARPETA DEL PC solo en memoria (ya no van a localStorage: lo llenaban en Opera; las que quedaron guardadas se quitan y liberan sitio) y sus miniaturas se hacen pequeñas (300 px), de 2 en 2 y solo las que se ven (antes cargaba 145 fotos enteras: Chrome iba lento y Firefox salía en blanco). 1.19.3, 9 nov: fotos escaneadas de 📷 Fotos del plato: filas de alto fijo (140 px), ya no se amontonan (Chrome/Firefox/Opera). 1.19.1, 9 nov: si el navegador está lleno (localStorage, compartido por todas las webs de srcorsario.github.io) la lista de fotos no se guardaba y no salía nada: ahora libera las cachés de carta de las webs (se rehacen solas) y, si aun así no cabe, avisa. 1.19.0, 9 nov: 📷 Fotos del plato: botón "📂 Carpeta del PC" (y "Volver a abrir") para elegir fotos de una carpeta, como en 🖼️ Fotos de internet. 1.18.3, 9 nov: 📷 Fotos del plato usa todo el alto (las fotos en la web crecen) y en cada tarjeta los textos y botones van siempre en el mismo sitio. 1.18.2, 9 nov: repetidas solo por huella (mismo archivo); "mismas medidas y KB" solo si no hay huella (ocultaba fotos distintas). 1.18.1, 9 nov: "📷 Fotos del plato" a pantalla completa; al volver a recortar una foto se abre con el último recuadro, giro y formato puestos (sobre la original). 1.18.0, 9 nov: recorte de fotos de plato en VERTICAL 3:4 de serie (la web se ve sobre todo en el móvil; se recuerda el último formato en cada dispositivo; logos/QR siguen libres), nuevo 4:5; al girar la foto se vuelve a encajar entera en la ventana y el recuadro se rehace (antes se salía por un lado). 1.17.1, 9 nov: buscador de platos por palabras sueltas en cualquier orden ("arroz vaca"), sin tildes ni mayúsculas. 1.17.0, 9 nov: 🖼️ Fotos de internet: "🍽 Asignar por plato" (eliges el plato o platos y luego marcas las fotos; todas van en UN commit: las 4 primeras activas si hay hueco, el resto de repuesto) y "☑ Seleccionar varias" -> "👥 Agrupar como…" (grupos con nombre, compartidos en fotos-internet.json, salen como una tarjeta; "Asignar grupo" cuando el plato exista). 1.16.0, 9 nov: fotos quitadas (✕) = descartadas para siempre en esa web, por dirección y por huella, guardadas en GitHub (fotos-internet.json, vale en todos los navegadores); también qué foto original (huella) está asignada a qué platos; Vaciar ya no borra descartes; ♻ Restaurar descartadas. 1.15.1: tarjetas de 🖼️ Fotos de internet todas iguales (botones siempre abajo, medidas en 2 líneas fijas). 1.15.0: 📂 cargar fotos de una carpeta del PC en 🖼️ Fotos de internet (se recuerda la carpeta por web; editar/asignar igual). 1.14.0: repuestos ILIMITADOS (desactivadas 01..99+; con 4 activas lo nuevo va a repuesto) + hash SHA-256 de cada foto de internet (repetidas por contenido). 1.13.2: Opera: hay que MARCAR "resultados de la página de búsqueda" (si no, no corre en Google Maps). 1.13.1: "Buscar como" de serie desde sitio.json (buscarFotos), p. ej. RG = Roland Garros Manacor. 1.13.0: "Buscar como" en 🖼️ Fotos de internet (p. ej. Roland Garros Manacor) + Instalar la extensión: opciones de Opera con captura y "cada navegador por separado". 1.12.0: 8 nov: 🧩 Instalar la extensión: descarga escaner-fotos.zip (lo genera construir) + tutorial paso a paso según el navegador; aviso de versión nueva. 1.11.1: 7 nov: buscando en "Asignar a platos" ya no salen repetidos los ★. 1.11.0: "Asignar a platos…" = ventana grande con casillas (nada marcado de serie; parecidos arriba con ★). 1.10.0: en 🖼️ Fotos de internet: ✂ Editar (recortar) y Asignar a VARIOS platos a la vez (sube 1 vez, WebP 1080, un commit). 1.9.0: cada foto lleva su restaurante de origen; cada web solo acepta los suyos (pregunta Sí/No la 1ª vez). 1.8.1: TripAdvisor: una foto en varios tamaños = una sola (clave por ruta y por medidas+peso), vista previa más nítida. 1.8.0: medidas/peso/formato bajo cada foto (se miden al verlas) + mínimo de resolución (oculta y no guarda las pequeñas). 1.7.0: botones Maps/TripAdvisor con enlace guardado + 💾 guardar todas en el PC a máxima calidad (sueltas, sin zip). 1.6.1: ✕ sin repintar (no vuelve arriba), se conserva la posición al repintar, 🖼️ Fotos de internet a pantalla completa. 1.6.0: sección "🖼️ Fotos de internet" en la cabecera (galería + asignar a plato) y extensión Escáner de fotos (herramientas\\extension-fotos): Google bloquea los marcadores. 1.5.1: escáner: <picture><source>, data-src, alt, galería por encima (TripAdvisor). 1.5.0: escáner sin innerHTML (Google lo bloquea: Trusted Types) + nombre del plato de cada foto + sugerencias por nombre. 1.4.0: escáner a fondo (escucha fetch/XHR, datos internos, bajar solo). 1.3.0: escáner de fotos (marcador) + galería para asignar a cada plato. 1.2.0: traer fotos de Google Maps / TripAdvisor (enlaces + pegar Ctrl+V, arrastrar o URL). 1.1.0: subirImagen() para logos y QR (marca.js)

    var MAX_LADO = 1080, CALIDAD = 0.8, MAX_FOTOS = 4;   // 1080 px: nítida en móvil, ~100-200 KB
    var JSQUASH = 'https://cdn.jsdelivr.net/npm/@jsquash/webp@1.5.0/encode.js';
    var CROPPER = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/';
    var REPO = 'https://api.github.com/repos/' + S.repo;
    var dirWeb = S.ruta.replace(/[^/]*$/, '');   // carpeta de datos.json en el repo = la web
    var DESACT = 'desactivadas';
    // Activas: <base>01..04.webp (la web). Desactivadas ("de repuesto", sin límite): <base>01, 02… 10, 11….webp
    function num2(n) { return n < 10 ? '0' + n : String(n); }
    function patronDes(b) { return new RegExp('^' + b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\d{2,3})\\.webp$', 'i'); }

    // ---------- GitHub ----------
    function token() {
        try { return sessionStorage.getItem(S.claveToken) || localStorage.getItem(S.claveToken) || ''; } catch (e) { return ''; }
    }
    async function api(ruta, opciones, crudo) {
        opciones = opciones || {};
        var r = await fetch(REPO + ruta, {
            method: opciones.method || 'GET', cache: 'no-store', body: opciones.body ? JSON.stringify(opciones.body) : undefined,
            headers: { Authorization: 'Bearer ' + token(), Accept: crudo ? 'application/vnd.github.raw' : 'application/vnd.github+json' }
        });
        if (r.status === 401 && window.AccesoEditor) window.AccesoEditor.caducado();
        return r;
    }
    var codRuta = function (p) { return p.split('/').map(encodeURIComponent).join('/'); };
    async function listar(carpetaRepo) {
        var r = await api('/contents/' + codRuta(carpetaRepo));
        if (r.status === 404) return [];
        if (!r.ok) throw new Error('GitHub HTTP ' + r.status + ' leyendo ' + carpetaRepo);
        var j = await r.json();
        return Array.isArray(j) ? j.filter(function (f) { return f.type === 'file'; }) : [];
    }
    var ramaCache = null;
    async function rama() {
        if (ramaCache) return ramaCache;
        var r = await api('');
        if (!r.ok) throw new Error('GitHub HTTP ' + r.status);
        ramaCache = (await r.json()).default_branch || 'main';
        return ramaCache;
    }
    // cambios: [{ path, sha }] (sha null = borrar). Un solo commit; reintenta si otro guardó a la vez.
    async function commit(cambios, mensaje) {
        var b = await rama();
        for (var intento = 0; intento < 4; intento++) {
            var ref = await api('/git/ref/heads/' + encodeURIComponent(b));
            if (!ref.ok) throw new Error('GitHub HTTP ' + ref.status + ' (rama)');
            var padre = (await ref.json()).object.sha;
            var com = await api('/git/commits/' + padre);
            var arbolBase = (await com.json()).tree.sha;
            var arbol = await api('/git/trees', { method: 'POST', body: {
                base_tree: arbolBase,
                tree: cambios.map(function (c) { return { path: c.path, mode: '100644', type: 'blob', sha: c.sha }; })
            } });
            if (!arbol.ok) throw new Error('GitHub HTTP ' + arbol.status + ' (árbol)');
            var nuevo = await api('/git/commits', { method: 'POST', body: { message: mensaje, tree: (await arbol.json()).sha, parents: [padre] } });
            if (!nuevo.ok) throw new Error('GitHub HTTP ' + nuevo.status + ' (commit)');
            var act = await api('/git/refs/heads/' + encodeURIComponent(b), { method: 'PATCH', body: { sha: (await nuevo.json()).sha } });
            if (act.ok) return;
            if (act.status !== 422 && act.status !== 409) throw new Error('GitHub HTTP ' + act.status + ' (guardar)');
        }
        throw new Error('Otro dispositivo está guardando a la vez. Vuelve a intentarlo.');
    }
    async function subirBlob(blob) {
        var b64 = await new Promise(function (ok, ko) {
            var fr = new FileReader();
            fr.onload = function () { ok(String(fr.result).split(',')[1]); };
            fr.onerror = ko; fr.readAsDataURL(blob);
        });
        var r = await api('/git/blobs', { method: 'POST', body: { content: b64, encoding: 'base64' } });
        if (!r.ok) throw new Error('GitHub HTTP ' + r.status + ' (subir foto)');
        return (await r.json()).sha;
    }

    // ---------- utilidades ----------
    function slug(t) {
        return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
            .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
    }
    function kb(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB'; }
    function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function platoActual() {
        try {
            /* global platoEditandoId, esNuevoPlato, datosTempNuevo, datosLocales */
            if (typeof esNuevoPlato !== 'undefined' && esNuevoPlato && typeof datosTempNuevo !== 'undefined') return datosTempNuevo;
            var lista = window.datosLocales || (typeof datosLocales !== 'undefined' ? datosLocales : []);
            var id = typeof platoEditandoId !== 'undefined' ? platoEditandoId : null;
            return (lista || []).find(function (x) { return x.id === id; }) || null;
        } catch (e) { return null; }
    }

    // ---------- fotos de Google Maps / TripAdvisor ----------
    // No se descargan solas (sus condiciones no lo permiten): se abren sus páginas de fotos y la foto
    // elegida se trae pegándola (clic derecho -> Copiar imagen -> Ctrl+V), arrastrándola o con su URL.
    var CLAVE_Q = 'sf-busqueda-' + (S.restaurante || S.modo || '');
    function busquedaLocal() {
        try { var g = localStorage.getItem(CLAVE_Q); if (g) return g; } catch (e) { }
        if (S.buscarFotos) return String(S.buscarFotos);   // sitio.json -> "buscarFotos" (lo pasa construir)
        var c = window.CONTACTO_WEB || {};
        if (c.mapa) return c.mapa;
        var n = String((window.MARCA && window.MARCA.nombre) || S.titulo || '').replace(/\s+(menu|carta)$/i, '');
        var pob = String(c.direccion || '').split(/[,\n]/).pop().replace(/\d{5}/, '').trim();
        return (n + ' ' + (pob || 'Manacor')).trim();
    }
    function enlacesExternos(q, plato) {
        var e = encodeURIComponent;
        return {
            maps: 'https://www.google.com/maps/search/?api=1&query=' + e(q),
            trip: 'https://www.tripadvisor.es/Search?q=' + e(q),
            img: 'https://www.google.com/search?tbm=isch&q=' + e((plato ? plato + ' ' : '') + q)
        };
    }
    // Fotos de Google en tamaño grande. Vale la dirección de la imagen o la de la barra de Google Maps
    // mientras se ve la foto (lleva dentro …googleusercontent.com%2F<id>%3Dw…): -> lh3…/<id>=s2000.
    function idGoogle(u) {
        var d = String(u);
        try { d = decodeURIComponent(d); } catch (e) { }
        var m = d.match(/googleusercontent\.com\/([^=!?&#\s"')]+)/);
        return m && !/^(a|a-)\//.test(m[1]) ? m[1] : '';
    }
    function mejorarUrl(u) {
        var id = idGoogle(u);
        return id ? 'https://lh3.googleusercontent.com/' + id + '=s2000' : u;
    }
    function candidatas(u) {
        var c = [];
        if (/dynamic-media-cdn\.tripadvisor\.com\//.test(u)) c.push(u.replace(/\?.*$/, '') + '?w=1600&h=-1&s=1');
        else if (/tripadvisor\.com\/media\/photo-[a-z]\//.test(u)) c.push(u.replace(/\/photo-[a-z]\//, '/photo-o/'), u.replace(/\/photo-[a-z]\//, '/photo-w/'));
        c.push(mejorarUrl(u));
        if (!/google\.[a-z.]+\/maps/.test(u)) c.push(u);
        return c.filter(function (x, i) { return c.indexOf(x) === i; });
    }
    async function archivoDeUrl(u) {
        var lista = candidatas(u), r = null, b = null, bloqueada = false;
        for (var i = 0; i < lista.length && !b; i++) {
            try { r = await fetch(lista[i], { mode: 'cors', cache: 'no-store', referrerPolicy: 'no-referrer' }); }
            catch (e) { bloqueada = true; continue; }
            if (r.ok) { var x = await r.blob(); if (/^image\//.test(x.type)) b = x; }
        }
        if (!b) {
            var err = new Error(bloqueada && !(r && r.ok)
                ? 'Esa web no deja traer la foto directamente: '
                : 'No se pudo descargar la foto' + (r ? ' (HTTP ' + r.status + ')' : '') + '. Puede que ya no exista. Prueba: ');
            err.abrir = lista[0];
            throw err;
        }
        return new File([b], 'foto-web.' + (b.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg'), { type: b.type });
    }

    // ---------- galería de fotos escaneadas (por web, en este dispositivo) ----------
    var CLAVE_G = 'sf-galeria-' + (S.restaurante || S.modo || '');
    function claveFoto(u) { var id = idGoogle(u); if (id) return 'g:' + id; var ta = String(u).match(/tripadvisor\.com\/media\/photo-[a-z](?:\/\d{3,})?\/([^?#]+)/); if (ta) return 'ta:' + ta[1]; return String(u).replace(/[?#].*$/, '').replace(/=[^\/=]*$/, '').replace(/\/photo-[a-z]\//, '/photo-?/'); }
    // Las fotos de la carpeta del PC (u = "local:…") van SOLO en memoria (localesMem): el archivo está en el PC y
    // localStorage (compartido por todas las webs de srcorsario.github.io) se llenaba.
    var localesMem = [];
    function leerGaleria() {
        var g; try { g = JSON.parse(localStorage.getItem(CLAVE_G) || '[]') || []; } catch (e) { g = []; }
        var nl = g.length; g = g.filter(function (x) { return x && !esLocal(x.u); });
        if (g.length !== nl) guardarLS(CLAVE_G, JSON.stringify(g));   // limpieza: las de carpeta guardadas antes de 1.20
        // Juntar entradas que ahora son la misma foto (p. ej. TripAdvisor en varios tamaños): se conserva lo útil de cada una.
        var v = {}, out = [];
        g.forEach(function (x) {
            var c = claveFoto(x.u), y = v[c];
            if (!y) { v[c] = x; out.push(x); return; }
            ['t', 'usada', 'w', 'h', 'kb', 'tipo'].forEach(function (k) { if (!y[k] && x[k]) y[k] = x[k]; });
        });
        if (out.length !== g.length) guardarGaleria(out);
        return out.concat(localesMem);
    }
    // localStorage es UNO para todas las webs de srcorsario.github.io (~5 MB): las cachés de carta de la web pública
    // (<id>-menu-v1, se rehacen solas al abrirla) pueden llenarlo. Si no cabe, se borran y se reintenta.
    function guardarLS(clave, texto) {
        try { localStorage.setItem(clave, texto); return true; } catch (e) { }
        try {
            for (var i = localStorage.length - 1; i >= 0; i--) { var k = localStorage.key(i); if (/-menu-v\d+$/.test(k)) localStorage.removeItem(k); }
            localStorage.setItem(clave, texto); return true;
        } catch (e2) { return false; }
    }
    function guardarGaleria(g) {
        localesMem = g.filter(function (x) { return esLocal(x.u); });
        if (guardarLS(CLAVE_G, JSON.stringify(g.filter(function (x) { return !esLocal(x.u); }).slice(-400)))) return true;
        try { window.alert('No cabe la lista de fotos en este navegador (almacenamiento lleno). Pulsa "Vaciar lista" o quita fotos que no uses.'); } catch (e) { }
        return false;
    }
    var CLAVE_D = 'sf-descartadas-' + (S.restaurante || S.modo || '');
    // Descartadas (✕ Quitar): por clave (dirección) y por huella (hash). En este navegador (localStorage) y, compartidas
    // por web, en GitHub: <web>/fotos-internet.json (se guarda unos segundos después del último ✕, en un commit).
    var ARCH_DESC = dirWeb + 'fotos-internet.json';
    // + asignadas: { huella de la ORIGINAL: "8004 Ferrochino + 16003 Ferrochino" } (aunque se suba recortada)
    var descRemoto = { claves: {}, hashes: {}, asignadas: {}, grupos: {} }, descPend = { claves: {}, hashes: {}, asignadas: {}, grupos: {} }, descReloj = null, descCargado = null;
    function leerDescLocal() { try { return JSON.parse(localStorage.getItem(CLAVE_D) || '{}') || {}; } catch (e) { return {}; } }
    function leerDesc() {
        var d = leerDescLocal();
        Object.keys(descRemoto.claves).forEach(function (k) { d[k] = 1; });
        Object.keys(descPend.claves).forEach(function (k) { d[k] = 1; });
        return d;
    }
    function hashDescartado(h) { return !!(h && (descRemoto.hashes[h] || descPend.hashes[h])); }
    function esDescartada(x) { return !!(x && (leerDesc()[claveFoto(x.u)] || hashDescartado(x.hash))); }
    function descartar(c, hash) {
        var d = leerDescLocal(); d[c] = 1; try { localStorage.setItem(CLAVE_D, JSON.stringify(d)); } catch (e) { }
        descPend.claves[c] = 1; if (hash) descPend.hashes[hash] = 1;
        programarDescartes();
    }
    function cargarDescartes() {
        if (descCargado) return descCargado;
        descCargado = (async function () {
            try {
                var r = await api('/contents/' + codRuta(ARCH_DESC), {}, true);
                if (r.ok) { var o = JSON.parse(await r.text()); descRemoto = { claves: o.claves || {}, hashes: o.hashes || {}, asignadas: o.asignadas || {}, grupos: o.grupos || {} }; }
            } catch (e) { }
            // Quitar de la lista las que otro navegador ya descartó, y marcar las ya asignadas (por la huella de la original)
            var g = leerGaleria(), g2 = g.filter(function (x) { return !esDescartada(x); }), marcadas = 0;
            g2.forEach(function (x) { var a = x.hash && descRemoto.asignadas[x.hash]; if (a && x.usada !== a) { x.usada = a; marcadas++; } });
            if (g2.length !== g.length || marcadas) { guardarGaleria(g2); if (alRecibir) alRecibir(); contarBoton(); }
            return descRemoto;
        })();
        return descCargado;
    }
    function programarDescartes(ms) { clearTimeout(descReloj); descReloj = setTimeout(guardarDescartes, ms || 4000); }
    async function guardarDescartes() {
        descReloj = null;
        var p = descPend; descPend = { claves: {}, hashes: {}, asignadas: {}, grupos: {} };
        if (!Object.keys(p.claves).length && !Object.keys(p.hashes).length && !Object.keys(p.asignadas).length && !Object.keys(p.grupos).length && !p.restaurar) return;
        try {
            descCargado = null; await cargarDescartes();   // juntar con lo que haya guardado otro navegador
            if (p.restaurar) { descRemoto.claves = {}; descRemoto.hashes = {}; }
            Object.keys(p.claves).forEach(function (k) { descRemoto.claves[k] = 1; });
            Object.keys(p.hashes).forEach(function (k) { descRemoto.hashes[k] = 1; });
            Object.keys(p.asignadas).forEach(function (k) { if (p.asignadas[k]) descRemoto.asignadas[k] = p.asignadas[k]; else delete descRemoto.asignadas[k]; });   // null = ↩ desasignada
            Object.keys(p.grupos).forEach(function (k) { if (p.grupos[k]) descRemoto.grupos[k] = p.grupos[k]; else delete descRemoto.grupos[k]; });
            var txt = JSON.stringify({
                nota: 'Fotos de internet de esta web (🖼️ Fotos de internet). claves/hashes: descartadas con ✕ (no vuelven a la lista). asignadas: huella de la foto ORIGINAL -> platos donde se puso (aunque se subiera recortada). grupos: nombre -> claves de sus fotos (👥 Agrupar como…).',
                claves: descRemoto.claves, hashes: descRemoto.hashes, asignadas: descRemoto.asignadas, grupos: descRemoto.grupos
            }, null, 1);
            var sha = await subirBlob(new Blob([txt], { type: 'application/json' }));
            await commit([{ path: ARCH_DESC, sha: sha }], 'Fotos de internet: ' + Object.keys(descRemoto.claves).length + ' descartadas, ' + Object.keys(descRemoto.asignadas).length + ' asignadas, ' + Object.keys(descRemoto.grupos).length + ' grupos');
        } catch (e) {
            Object.keys(p.claves).forEach(function (k) { descPend.claves[k] = 1; });
            Object.keys(p.hashes).forEach(function (k) { descPend.hashes[k] = 1; });
            Object.keys(p.asignadas).forEach(function (k) { if (!(k in descPend.asignadas)) descPend.asignadas[k] = p.asignadas[k]; });
            Object.keys(p.grupos).forEach(function (k) { if (!(k in descPend.grupos)) descPend.grupos[k] = p.grupos[k]; });
            if (p.restaurar) descPend.restaurar = true;
            programarDescartes(15000);   // reintentar
        }
    }
    function restaurarDescartes() {
        try { localStorage.removeItem(CLAVE_D); } catch (e) { }
        descRemoto.claves = {}; descRemoto.hashes = {}; descPend = { claves: {}, hashes: {}, asignadas: descPend.asignadas, grupos: descPend.grupos, restaurar: true };
        programarDescartes(300);
    }
    // Grupos de fotos con nombre (👥 Agrupar como…): { nombre: [claves] }. Lo guardado en GitHub + lo pendiente (null = borrado).
    function leerGrupos() {
        var g = {};
        Object.keys(descRemoto.grupos).forEach(function (k) { if (Array.isArray(descRemoto.grupos[k])) g[k] = descRemoto.grupos[k].slice(); });
        Object.keys(descPend.grupos).forEach(function (k) { if (descPend.grupos[k]) g[k] = descPend.grupos[k].slice(); else delete g[k]; });
        return g;
    }
    function ponerGrupo(nombre, claves) { descPend.grupos[nombre] = claves && claves.length ? claves.slice() : null; programarDescartes(); }
    // Mete fotos en un grupo (las saca de cualquier otro). Devuelve cuántas tiene ahora.
    function agrupar(nombre, claves) {
        var gr = leerGrupos(), dest = gr[nombre] || [];
        Object.keys(gr).forEach(function (n) {
            if (n === nombre) return;
            var r = gr[n].filter(function (c) { return claves.indexOf(c) < 0; });
            if (r.length !== gr[n].length) ponerGrupo(n, r);
        });
        claves.forEach(function (c) { if (dest.indexOf(c) < 0) dest.push(c); });
        ponerGrupo(nombre, dest);
        return dest.length;
    }
    function sacarDeGrupo(clave) {
        var gr = leerGrupos();
        Object.keys(gr).forEach(function (n) { var i = gr[n].indexOf(clave); if (i >= 0) { gr[n].splice(i, 1); ponerGrupo(n, gr[n]); } });
    }
    // Si se cierra con descartes sin guardar, el navegador pregunta (y se intenta guardar).
    window.addEventListener('beforeunload', function (e) { if (descReloj) { guardarDescartes(); e.preventDefault(); e.returnValue = ''; } });
    // Restaurante de origen de cada foto (lo pone el escáner): cada web acepta solo los suyos.
    var SIN_ORIGEN = '(sin restaurante: escaneadas antes)';
    var CLAVE_O = 'sf-origenes-' + (S.restaurante || S.modo || '');
    function leerOrigenes() { try { return JSON.parse(localStorage.getItem(CLAVE_O) || '{}') || {}; } catch (e) { return {}; } }
    function ponerOrigen(de, v) { var o = leerOrigenes(); if (v) o[de] = v; else delete o[de]; try { localStorage.setItem(CLAVE_O, JSON.stringify(o)); } catch (e) { } }
    var pendientes = {};   // { origen: [fotos] } que aún no se sabe si son de esta web
    function origenDe(x) { return (x && x.de) || SIN_ORIGEN; }
    function recibirFotos(lista) {
        var o = leerOrigenes(), grupos = {}, n = 0;
        (Array.isArray(lista) ? lista : []).forEach(function (x) { var d = origenDe(x); (grupos[d] = grupos[d] || []).push(x); });
        Object.keys(grupos).forEach(function (d) {
            if (o[d] === 'si') n += sumarEscaneo(grupos[d]);
            else if (o[d] !== 'no') {
                var g = leerGaleria(), ya = {};
                g.forEach(function (x) { ya[claveFoto(x.u)] = 1; });
                var nuevas = grupos[d].filter(function (x) { return x && x.u && !ya[claveFoto(x.u)]; });
                if (nuevas.length || d === SIN_ORIGEN && grupos[d].length) pendientes[d] = grupos[d];
            }
        });
        return n;
    }
    function decidirOrigen(d, si) {
        ponerOrigen(d, si ? 'si' : 'no');
        var lista = pendientes[d] || []; delete pendientes[d];
        if (si) return sumarEscaneo(lista);
        // No es de esta web: fuera de la lista las de ese origen que no estén asignadas
        var quitar = {}; lista.forEach(function (x) { quitar[claveFoto(x.u)] = 1; });
        var g = leerGaleria().filter(function (x) { return x.usada || !(quitar[claveFoto(x.u)] || (x.de ? x.de === d : d === SIN_ORIGEN)); });
        guardarGaleria(g);
        return 0;
    }
    function vaciarTodo() { guardarGaleria([]);   // los descartes se quedan (♻ Restaurar descartadas para borrarlos)
        var o = leerOrigenes(), mios = Object.keys(o).filter(function (d) { return o[d] === 'si'; });
        try { window.postMessage({ tipo: 'FOTOS-CARTA-QUITAR', de: mios, sinOrigen: mios.indexOf(SIN_ORIGEN) >= 0 }, location.origin); } catch (e) { } }
    function miniatura(u) {
        var id = idGoogle(u);
        if (id) return 'https://lh3.googleusercontent.com/' + id + '=w400';
        if (/dynamic-media-cdn\.tripadvisor\.com\//.test(u)) return u.replace(/\?.*$/, '') + '?w=500&h=-1&s=1';
        var m = String(u).match(/^(https:\/\/[^\/]+\/media\/)photo-[a-z](?:\/\d{3,})?\/([^?#]+)/);
        return m ? m[1] + 'photo-s/' + m[2] : u;
    }
    // ---------- 📂 fotos de una carpeta del PC (p. ej. la de "Guardar todas") ----------
    // En la lista van como u = "local:<nombre de archivo>"; el archivo se lee de la carpeta elegida, que se
    // recuerda por web (IndexedDB) y al volver hay que dar permiso con un clic (lo pide el navegador).
    var CLAVE_CARPETA = 'carpeta-' + (S.restaurante || S.modo || '');
    var archivosLocales = {}, urlsLocales = {}, urlsMini = {}, carpetaLocal = null;   // nombre -> FileSystemFileHandle | File
    function esLocal(u) { return String(u).indexOf('local:') === 0; }
    function idb(modo, fn) {
        return new Promise(function (ok, ko) {
            var r = indexedDB.open('sf-fotos', 1);
            r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
            r.onerror = function () { ko(r.error); };
            r.onsuccess = function () {
                try { var tx = r.result.transaction('kv', modo), q = fn(tx.objectStore('kv')); tx.oncomplete = function () { ok(q && q.result); r.result.close(); }; tx.onerror = function () { ko(tx.error); }; }
                catch (e) { try { r.result.close(); } catch (e2) { } ko(e); }
            };
        });
    }
    function idbGet(k) { return idb('readonly', function (st) { return st.get(k); }).catch(function () { return null; }); }
    function idbSet(k, v) { return idb('readwrite', function (st) { st.put(v, k); }).catch(function () { }); }
    function tituloDeArchivo(n) {
        return String(n).replace(/\.[a-z0-9]+$/i, '').replace(/^\d{1,4}\s*-\s*/, '').replace(/\s*\((tripadvisor|google)\)\s*$/i, '').replace(/[_]+/g, ' ').trim();
    }
    async function leerCarpeta(h) {
        var n = 0; archivosLocales = {};
        for await (var e of h.values()) {
            if (e.kind === 'file' && /\.(jpe?g|png|webp|gif|avif|heic)$/i.test(e.name)) { archivosLocales[e.name] = e; n++; }
        }
        carpetaLocal = h.name;
        return n;
    }
    function meterLocales() {
        localesMem = localesMem.filter(function (x) { return archivosLocales[String(x.u).slice(6)]; });   // otra carpeta: fuera
        var g = leerGaleria(), ya = {}, d = leerDesc(), n = 0;
        g.forEach(function (x) { ya[claveFoto(x.u)] = 1; });
        Object.keys(archivosLocales).sort().forEach(function (nm) {
            var u = 'local:' + nm;
            if (ya[claveFoto(u)] || d[claveFoto(u)]) return;
            g.push({ u: u, t: tituloDeArchivo(nm), de: 'Carpeta del PC: ' + carpetaLocal }); n++;
        });
        guardarGaleria(g);
        return n;
    }
    // nueva = true: elegir carpeta; si no, reabrir la recordada (pide permiso: llamar desde un clic).
    async function abrirCarpeta(nueva) {
        var h = null;
        if (window.showDirectoryPicker) {
            if (nueva) { h = await window.showDirectoryPicker({ id: 'fotos-internet', mode: 'read' }); await idbSet(CLAVE_CARPETA, h); }
            else {
                h = await idbGet(CLAVE_CARPETA);
                if (!h) throw new Error('No hay carpeta recordada: usa "Cargar fotos de una carpeta del PC".');
                if ((await h.queryPermission({ mode: 'read' })) !== 'granted' && (await h.requestPermission({ mode: 'read' })) !== 'granted') throw new Error('Sin permiso para leer la carpeta.');
            }
            return { leidas: await leerCarpeta(h), nuevas: meterLocales() };
        }
        // Sin showDirectoryPicker (otros navegadores): elegir la carpeta con un <input>, solo para esta sesión
        return new Promise(function (ok, ko) {
            var inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.setAttribute('webkitdirectory', '');
            inp.onchange = function () {
                archivosLocales = {};
                Array.prototype.forEach.call(inp.files, function (f) { if (/^image\//.test(f.type) && f.webkitRelativePath.split('/').length === 2) archivosLocales[f.name] = f; });
                carpetaLocal = (inp.files[0] && inp.files[0].webkitRelativePath.split('/')[0]) || 'carpeta';
                ok({ leidas: Object.keys(archivosLocales).length, nuevas: meterLocales() });
            };
            inp.click();
        });
    }
    async function archivoLocal(u) {
        var nm = String(u).slice(6), h = archivosLocales[nm];
        if (!h) throw new Error('Esta foto es de una carpeta del PC: pulsa "📂 Volver a abrir" (abajo en 📷 Fotos del plato o arriba en 🖼️ Fotos de internet).');
        return h.getFile ? await h.getFile() : h;
    }
    // Original de una foto de la lista: de internet (máxima calidad) o de la carpeta del PC.
    async function obtenerOriginal(x) { return esLocal(x.u) ? archivoLocal(x.u) : bajarMaxima(x.u); }
    // Pone las miniaturas de las fotos locales (se leen del disco) en lo que se acaba de pintar.
    // ---------- ¿misma foto? ----------
    async function huellaArchivo(b) {
        try { var dg = await crypto.subtle.digest('SHA-256', await b.arrayBuffer()); return Array.prototype.map.call(new Uint8Array(dg).slice(0, 16), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
        catch (e) { return ''; }
    }
    // Huella visual (dHash 16x16 = 256 bits) de la imagen; con "aspecto" (ancho/alto), del trozo con esa proporción en la
    // posición pos (0 = arriba/izquierda, 0.5 = centro, 1 = abajo/derecha). bm: ImageBitmap ya abierto (opcional).
    async function huellaVisual(b, aspecto, pos, bm0) {
        var bm = bm0 || await createImageBitmap(b), w = bm.width, h = bm.height, sx = 0, sy = 0;
        if (pos == null) pos = 0.5;
        if (aspecto) { if (w / h > aspecto) { sx = (w - h * aspecto) * pos; w = h * aspecto; } else { sy = (h - w / aspecto) * pos; h = w / aspecto; } }
        var c = document.createElement('canvas'); c.width = 17; c.height = 16;
        var cx = c.getContext('2d'); cx.drawImage(bm, sx, sy, w, h, 0, 0, 17, 16);
        var asp = bm.width / bm.height; if (!bm0 && bm.close) bm.close();
        var d = cx.getImageData(0, 0, 17, 16).data, bits = [];
        for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) {
            var i = (y * 17 + x) * 4, j = i + 4;
            bits.push((d[i] * 3 + d[i + 1] * 6 + d[i + 2]) < (d[j] * 3 + d[j + 1] * 6 + d[j + 2]) ? 1 : 0);
        }
        return { bits: bits, aspecto: asp };
    }
    function distanciaVisual(a, b) { var n = 0; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; }
    // Huellas del trozo con esa proporción en 11 posiciones (el recorte puede no estar centrado).
    async function huellasPosiciones(b, aspecto) {
        var bm = await createImageBitmap(b), out = [];
        try { for (var i = 0; i <= 10; i++) out.push((await huellaVisual(b, aspecto, i / 10, bm)).bits); }
        finally { if (bm.close) bm.close(); }
        return out;
    }

    // Miniaturas pequeñas (300 px) de las fotos locales: solo las que se ven, de 2 en 2 (las fotos enteras de
    // 4000 px x 145 colgaban el navegador). urlsLocales = archivo entero (para "ver en grande"), urlsMini = miniatura.
    var colaMini = [], enCursoMini = 0, obsMini = null;
    function ponerMini(nm) {
        document.querySelectorAll('img[data-local]').forEach(function (im) { if (im.dataset.local === nm && urlsMini[nm]) { im.src = urlsMini[nm]; im.alt = ''; } });
    }
    async function hacerMini(nm) {
        var f = await archivoLocal('local:' + nm);
        if (!urlsLocales[nm]) urlsLocales[nm] = URL.createObjectURL(f);
        var bm = null;
        try { bm = await createImageBitmap(f, { resizeWidth: 300, resizeQuality: 'medium' }); } catch (e) { }
        if (!bm) bm = await createImageBitmap(f);
        var k = Math.min(1, 300 / bm.width), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(bm.width * k)); c.height = Math.max(1, Math.round(bm.height * k));
        c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height); if (bm.close) bm.close();
        var b = await new Promise(function (ok) { c.toBlob(ok, 'image/jpeg', 0.75); });
        urlsMini[nm] = URL.createObjectURL(b || f);
    }
    function siguienteMini() {
        while (enCursoMini < 2 && colaMini.length) {
            var nm = colaMini.shift();
            if (urlsMini[nm]) { ponerMini(nm); continue; }
            enCursoMini++;
            hacerMini(nm).then(function (n) { return function () { ponerMini(n); }; }(nm), function () { })
                .then(function () { enCursoMini--; siguienteMini(); });
        }
    }
    function pintarLocales(raiz) {
        if (!obsMini && window.IntersectionObserver) obsMini = new IntersectionObserver(function (es) {
            es.forEach(function (e) {
                if (!e.isIntersecting) return;
                obsMini.unobserve(e.target);
                var nm = e.target.dataset.local;
                if (colaMini.indexOf(nm) < 0) colaMini.push(nm);
            });
            siguienteMini();
        }, { rootMargin: '300px' });
        raiz.querySelectorAll('img[data-local]').forEach(function (im) {
            var nm = im.dataset.local;
            im.removeAttribute('loading');
            if (urlsMini[nm]) { im.src = urlsMini[nm]; return; }
            if (!archivosLocales[nm]) { im.alt = '📂 abre la carpeta'; return; }
            im.alt = '…';
            if (obsMini) obsMini.observe(im); else { colaMini.push(nm); siguienteMini(); }
        });
    }
    // Si la vista previa grande no existe, se usa la dirección escaneada; si tampoco, se oculta la tarjeta.
    function imgPrevia(u, ocultar) {
        if (esLocal(u)) return '<img loading="lazy" data-local="' + esc(String(u).slice(6)) + '" alt="" style="background:#e5e7eb">';
        return '<img loading="lazy" referrerpolicy="no-referrer" src="' + esc(miniatura(u)) + '" data-o="' + esc(u) + '" alt="" ' +
            'onerror="if(!this.dataset.r&&this.src!==this.dataset.o){this.dataset.r=1;this.src=this.dataset.o}else{' + ocultar + '}">';
    }
    // Misma foto con distinta dirección (TripAdvisor): mismas medidas y peso de la original = repetida. Se queda la asignada o con nombre.
    function repetidas(g) {
        var vistos = {}, dup = {};
        g.slice().sort(function (a, b) { return (b.usada ? 2 : b.t ? 1 : 0) - (a.usada ? 2 : a.t ? 1 : 0); }).forEach(function (x) {
            var fs = [];
            if (x.hash) fs.push('h:' + x.hash);
            if (x.w && x.kb) fs.push('m:' + x.w + 'x' + x.h + '-' + x.kb);
            if (!fs.length) return;
            // Con huella, solo cuenta la huella (mismo archivo exacto); "mismas medidas y KB" solo para las que no la tienen
            // (antes ocultaba como repetidas fotos distintas que pesaban lo mismo: medidas estándar de Google/TripAdvisor).
            if ((x.hash ? fs.slice(0, 1) : fs).some(function (f) { return vistos[f]; })) dup[claveFoto(x.u)] = 1;
            fs.forEach(function (f) { vistos[f] = 1; });
        });
        return dup;
    }
    var alRecibir = null;
    function indiceDe(g, k) { for (var i = 0; i < g.length; i++) if (claveFoto(g[i].u) === k) return i; return -1; }   // ventana abierta que se repinta cuando llegan fotos de la extensión
    function sumarEscaneo(lista) {
        var g = leerGaleria(), v = leerDesc(), n = 0;
        g.forEach(function (x) { v[claveFoto(x.u)] = 1; });
        var porClave = {};
        g.forEach(function (x) { porClave[claveFoto(x.u)] = x; });
        (Array.isArray(lista) ? lista : []).forEach(function (o) {
            var u = typeof o === 'string' ? o : o && o.u, t = o && typeof o === 'object' ? String(o.t || '').slice(0, 80) : '';
            var de = typeof o === 'string' ? 'manual' : String((o && o.de) || '').slice(0, 80);
            if (typeof u !== 'string' || !/^https:\/\//.test(u)) return;
            var gid = idGoogle(u);
            if (gid) u = 'https://lh3.googleusercontent.com/' + gid + '=w640';
            else if (!/tripadvisor\.com\/media\//.test(u)) return;
            var c = claveFoto(u);
            if (v[c]) { if (t && porClave[c] && !porClave[c].t) porClave[c].t = t; return; }
            v[c] = 1; var x = { u: u }; if (t) x.t = t; if (de) x.de = de; g.push(x); porClave[c] = x; n++;
        });
        guardarGaleria(g);
        return n;
    }
    // Parecido entre el nombre del plato y el de la foto (palabras de 4+ letras, por sus 4 primeras).
    function palabras(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 4; }).map(function (w) { return w.slice(0, 4); }); }
    function normBusca(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
    function parecido(a, b) { var pa = palabras(a), pb = palabras(b); return pa.filter(function (w, i) { return pa.indexOf(w) === i && pb.indexOf(w) >= 0; }).length; }
    // Marcador (bookmarklet) a fondo: se ejecuta en Google Maps / TripAdvisor y se QUEDA ESCUCHANDO:
    // lee lo que hay en la página (imágenes, fondos y los datos internos del HTML), cada respuesta que
    // la web carga después (fetch/XHR) y lo que va apareciendo. Panel: contador, "Bajar solo" (desplaza
    // la galería hasta el final) y "Copiar". Copia "FOTOS-CARTA:[...]". Sin comentarios // dentro.
    function escaner(modoExt) {
        if (window.__fotosCarta) { window.__fotosCarta.mostrar(); return; }
        var L = [], V = {}, ui = {};
        function enviar() { clearTimeout(ui.te); ui.te = setTimeout(function () { try { window.postMessage({ tipo: 'FOTOS-CARTA-ESC', fotos: L.slice() }, '*'); } catch (x) { } }, 800); }
        var RX = /https:\/\/[a-z0-9.-]*(?:googleusercontent|ggpht)\.com\/[^"'\s\\)<>,\]}|!]+|https:\/\/(?:dynamic-media-cdn|media-cdn)\.tripadvisor\.com\/media\/[^"'\s\\)<>,\]}|!]+/g;
        function idG(u) { var m = u.match(/googleusercontent\.com\/([^=!?&#\s"')]+)/); return m ? m[1] : ''; }
        function k(u) { var id = idG(u); if (id) return 'g:' + id; var ta = String(u).match(/tripadvisor\.com\/media\/photo-[a-z](?:\/\d{3,})?\/([^?#]+)/); if (ta) return 'ta:' + ta[1]; return u.replace(/[?#].*$/, '').replace(/=[^\/=]*$/, '').replace(/\/photo-[a-z]\//, '/photo-?/'); }
        function origen() {
            var h = location.href, m;
            try { h = decodeURIComponent(h); } catch (x) { }
            if ((m = h.match(/\/maps\/place\/([^\/@?]+)/))) return m[1].replace(/\+/g, ' ').trim() + ' (Google Maps)';
            if ((m = h.match(/-d\d+-Reviews-([^.\/?#]+)/))) return m[1].split('-')[0].replace(/_/g, ' ').trim() + ' (TripAdvisor)';
            return String(document.title || location.hostname).split(/[-|–·]/)[0].trim().slice(0, 60);
        }
        function nombreDe(e) {
            for (var n = e, k2 = 0; n && n !== document.body && k2 < 6; n = n.parentElement, k2++) {
                var alt = k2 === 0 && n.getAttribute && n.getAttribute('alt');
                if (alt && alt.length > 2 && alt.length < 90 && !/^(foto|photo|imagen|image|picture)\b|\b(foto|photo) (de|of)\b/i.test(alt)) return alt.trim();
                var al = n.getAttribute && n.getAttribute('aria-label');
                if (al && al.length > 2 && al.length < 90 && !/^(foto|photo|imagen|image|v[ií]deo)\b/i.test(al)) return al.trim();
                if (n.querySelectorAll && n.querySelectorAll('img').length > 2) break;
                var tx = (n.innerText || '').split('\n').map(function (x) { return x.trim(); })
                    .filter(function (x) { return x.length > 2 && x.length < 70 && !/^(popular|foto|photo|v[ií]deo|\d+(\s|$))/i.test(x); });
                if (tx.length) return tx[0];
            }
            return '';
        }
        function add(u, tit) {
            if (!u) return;
            u = String(u).replace(/&amp;/g, '&').trim();
            if (u.indexOf('//') === 0) u = 'https:' + u;
            if (!/^https:/.test(u)) return;
            var id = idG(u), t = /tripadvisor\.com\/media\//.test(u);
            if (!id && !t) return;
            if (id && !/^(p|gps-cs-s|grass-cs|geougc-cs|geougc|gps-proxy|proxy)\//.test(id)) return;
            if (t && (/avatar/i.test(u) || /\/photo-[a-z]\/[^?]*\.(png|gif|svg)/i.test(u))) return;
            if (t && /[?&]w=(\d+)/.test(u) && +RegExp.$1 < 100) return;
            var c = k(u);
            if (V[c]) { if (tit && !V[c].t) { V[c].t = tit; enviar(); } return; }
            V[c] = { u: u, de: origen() }; if (tit) V[c].t = tit;
            L.push(V[c]); pintar(); enviar();
        }
        function texto(t) {
            if (!t || typeof t !== 'string') return;
            if (t.length > 8e6) t = t.slice(0, 8e6);
            t = t.replace(/\\u003d/gi, '=').replace(/\\u0026/gi, '&').replace(/\\u002f/gi, '/').replace(/\\\//g, '/').replace(/%2F/gi, '/').replace(/%3D/gi, '=').replace(/%3A/gi, ':');
            (t.match(RX) || []).forEach(function (u) { add(u); });
        }
        function fondos(bg, tit) { (String(bg || '').match(/url\(["']?[^"')]+/g) || []).forEach(function (m) { add(m.replace(/^url\(["']?/, ''), tit); }); }
        function barrer() {
            texto(location.href);
            var els = document.querySelectorAll('img,source,[style*="url("],[role="img"],button,a,[data-src],[data-lazyurl],[data-srcset]');
            for (var i = 0; i < els.length; i++) {
                var e = els[i];
                var nom = '';
                var tom = function () { if (!nom) nom = nombreDe(e) || ' '; return nom.trim(); };
                if (e.tagName === 'IMG') { var su = e.currentSrc || e.src; if (/googleusercontent|tripadvisor/.test(su)) add(su, tom()); }
                ['srcset', 'data-srcset', 'data-src', 'data-lazyurl'].forEach(function (at) {
                    var v = e.getAttribute(at);
                    if (v && /googleusercontent|tripadvisor/.test(v)) v.split(',').forEach(function (s) { add(s.trim().split(' ')[0], tom()); });
                });
                if (e.style && e.style.backgroundImage) fondos(e.style.backgroundImage, e.style.backgroundImage.indexOf('http') >= 0 ? tom() : '');
                else if (e.tagName !== 'IMG' && els.length < 5000) { var cs = getComputedStyle(e).backgroundImage; if (cs && cs !== 'none') fondos(cs, /googleusercontent|tripadvisor/.test(cs) ? tom() : ''); }
            }
        }
        var f0 = window.fetch;
        if (f0) window.fetch = function () {
            var pr = f0.apply(this, arguments);
            pr.then(function (r) { try { var ct = r.headers.get('content-type') || ''; if (!/image|video|font|octet/.test(ct)) r.clone().text().then(texto, function () { }); } catch (x) { } }, function () { });
            return pr;
        };
        var s0 = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function () {
            this.addEventListener('load', function () { try { if (!this.responseType || this.responseType === 'text') texto(this.responseText); } catch (x) { } });
            return s0.apply(this, arguments);
        };
        function arrancar() {
            texto(document.documentElement.innerHTML);
            document.querySelectorAll('script').forEach(function (sc) { texto(sc.textContent); });
            barrer();
            setInterval(barrer, 1500);
        }

        function caja() {
            var m = 0, best = null;
            document.querySelectorAll('div,section,ul').forEach(function (e) {
                if (e.scrollHeight - e.clientHeight < 200 || e.clientHeight < 150) return;
                var oy = getComputedStyle(e).overflowY;
                if (oy !== 'auto' && oy !== 'scroll') return;
                var r = e.getBoundingClientRect();
                if (r.width < 100 || r.bottom < 0 || r.top > innerHeight) return;
                var enc = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + Math.min(r.height, innerHeight) / 2)));
                if (!enc || !(e.contains(enc) || enc.contains(e))) return;
                var n = e.querySelectorAll('img,source,[style*="url("]').length;
                if (n > m) { m = n; best = e; }
            });
            return best || document.scrollingElement;
        }
        var bajando = false;
        function bajar() {
            if (bajando) { bajando = false; return; }
            var c = caja(), quieto = 0, alto = -1;
            bajando = true; pintar();
            (function paso() {
                if (!bajando) { pintar(); return; }
                c.scrollTop = c.scrollTop + c.clientHeight * 0.9;
                c.dispatchEvent(new Event('scroll'));
                setTimeout(function () {
                    barrer();
                    var fin = c.scrollTop + c.clientHeight >= c.scrollHeight - 5;
                    if (fin && c.scrollHeight === alto) quieto++; else quieto = 0;
                    alto = c.scrollHeight;
                    if (quieto >= 4) { bajando = false; pintar(); return; }
                    paso();
                }, 900);
            })();
        }
        function copiar() {
            var txt = 'FOTOS-CARTA:' + JSON.stringify(L);
            var conNombre = L.filter(function (x) { return x.t; }).length;
            var ok = function () { ui.msg.textContent = '✔ ' + L.length + ' copiadas (' + conNombre + ' con nombre). En el editor (📷 Fotos del plato) pulsa Ctrl+V.'; };
            var aMano = function () {
                var ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0';
                document.body.appendChild(ta); ta.select(); var r = false;
                try { r = document.execCommand('copy'); } catch (x) { }
                ta.remove();
                if (r) ok(); else ui.msg.textContent = 'No se pudo copiar. Vuelve a pulsar Copiar.';
            };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, aMano); else aMano();
        }
        function el(tag, css, txt, padre) { var x = document.createElement(tag); if (css) x.style.cssText = css; if (txt) x.textContent = txt; if (padre) padre.appendChild(x); return x; }
        var d = el('div', 'position:fixed;top:12px;right:12px;z-index:2147483647;background:#1f2328;color:#fff;padding:10px 12px;border-radius:10px;font:13px/1.35 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.4);width:290px');
        var cab = el('div', 'display:flex;justify-content:space-between;align-items:center', '', d);
        el('b', '', '\uD83D\uDCE5 Escáner de fotos', cab);
        var cerrarX = el('span', 'cursor:pointer;padding:0 4px', '\u2715', cab);
        ui.n = el('div', 'font-size:22px;font-weight:700;margin:4px 0', '0', d);
        var editorAqui = !!window.EDITOR_SITIO || /github\.io$/.test(location.hostname);
        el('div', 'font-size:11px;opacity:.8;margin-bottom:8px', editorAqui
            ? 'Esto es el editor: pulsa el marcador en la página de Google Maps o TripAdvisor del restaurante.'
            : 'Sigue escuchando: en Maps abre la pestaña Carta (o Fotos), cambia de sección y usa "Bajar solo". Las fotos llegan solas al editor (🖼️ Fotos de internet).', d);
        var fila = el('div', 'display:flex;gap:6px', '', d);
        ui.b = el('button', 'flex:1;padding:6px;border:0;border-radius:6px;cursor:pointer;background:#fff;color:#1f2328', '\u21E3 Bajar solo', fila);
        var bk = el('button', 'flex:1;padding:6px;border:0;border-radius:6px;background:#16a34a;color:#fff;font-weight:700;cursor:pointer', 'Copiar', fila);
        ui.msg = el('div', 'font-size:11px;margin-top:6px;min-height:14px', '', d);
        ui.b.onclick = bajar;
        bk.onclick = copiar;
        cerrarX.onclick = function () { ui.cerrado = true; d.remove(); };
        function pintar() {
            if (!ui.n) return;
            if (modoExt && L.length && !ui.cerrado && !d.isConnected && document.body) document.body.appendChild(d); ui.n.textContent = L.length + ' fotos'; ui.b.textContent = bajando ? '■ Parar' : '⇣ Bajar solo'; }
        window.__fotosCarta = { mostrar: function () { ui.cerrado = false; if (!d.isConnected) document.body.appendChild(d); barrer(); pintar(); } };
        function montar() { arrancar(); if (!modoExt) document.body.appendChild(d); pintar(); }
        if (document.body) montar(); else document.addEventListener('DOMContentLoaded', montar);
    }

    // ---------- imagen -> WebP reducida ----------
    async function abrirImagen(file) {
        try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { }
        try { return await createImageBitmap(file); } catch (e) { }
        return await new Promise(function (ok, ko) {
            var img = new Image(), url = URL.createObjectURL(file);
            img.onload = function () { URL.revokeObjectURL(url); ok(img); };
            img.onerror = function () { URL.revokeObjectURL(url); ko(new Error('El navegador no reconoce "' + file.name + '" como imagen' + (/hei[cf]/i.test(file.name) ? ' (HEIC del iPhone: en Ajustes > Cámara > Formatos elige "Más compatible", o hazle una captura)' : '') + '.')); };
            img.src = url;
        });
    }
    async function canvasAWebp(c, calidad) {
        calidad = calidad || CALIDAD;
        var blob = await new Promise(function (ok) { c.toBlob(ok, 'image/webp', calidad); });
        if (!blob || blob.type !== 'image/webp') {
            var mod = await import(JSQUASH);
            var buf = await mod.default(c.getContext('2d').getImageData(0, 0, c.width, c.height), { quality: Math.round(calidad * 100) });
            blob = new Blob([buf], { type: 'image/webp' });
        }
        return blob;
    }
    // Sin recorte (si no carga Cropper.js): solo reducir.
    async function aWebp(file, op) {
        op = op || {};
        var lado = op.maxLado || MAX_LADO;
        var img = await abrirImagen(file);
        var w = img.width, h = img.height, f = Math.min(1, lado / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * f)), ch = Math.max(1, Math.round(h * f));
        var c = document.createElement('canvas');
        c.width = cw; c.height = ch;
        var cx = c.getContext('2d');
        cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
        cx.drawImage(img, 0, 0, cw, ch);
        var blob = await canvasAWebp(c, op.calidad);
        return { blob: blob, info: w + '×' + h + ' → ' + cw + '×' + ch + ', ' + kb(blob.size) };
    }

    // ---------- recortar (Cropper.js, se carga la 1ª vez) ----------
    var cropperListo = null;
    function cargarCropper() {
        if (window.Cropper) return Promise.resolve();
        if (cropperListo) return cropperListo;
        cropperListo = new Promise(function (ok, ko) {
            var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = CROPPER + 'cropper.min.css'; document.head.appendChild(l);
            var sc = document.createElement('script'); sc.src = CROPPER + 'cropper.min.js';
            sc.onload = function () { ok(); }; sc.onerror = function () { cropperListo = null; ko(new Error('No se pudo cargar el recortador')); };
            document.head.appendChild(sc);
        });
        return cropperListo;
    }
    // Formato del recorte de las fotos de plato: de serie VERTICAL 3:4 (la carta se mira sobre todo en el móvil: 810×1080).
    // Se recuerda el último elegido en este dispositivo ('libre' = sin proporción). Logos/QR (subirImagen) empiezan siempre libres.
    var CLAVE_FMT = 'sf-formato-recorte';
    var formatoRec = (function () { try { var v = localStorage.getItem(CLAVE_FMT); return v === null ? 3 / 4 : v === 'libre' ? NaN : (+v || 3 / 4); } catch (e) { return 3 / 4; } })();
    // Devuelve { blob, info } o null si se cancela.
    // op (opcional, logos/QR de marca.js): { maxLado, calidad, transparente }
    async function recortar(fuente, titulo, op) {
        op = op || {};
        var lado = op.maxLado || MAX_LADO;
        try { await cargarCropper(); } catch (e) { return await aWebp(fuente, op); }
        var url = URL.createObjectURL(fuente);
        var ok = await new Promise(function (r) { var im = new Image(); im.onload = function () { r(true); }; im.onerror = function () { r(false); }; im.src = url; });
        if (!ok) {
            URL.revokeObjectURL(url);
            throw new Error('El navegador no reconoce "' + (fuente.name || 'la foto') + '" como imagen' + (/hei[cf]/i.test(fuente.name || '') ? ' (HEIC del iPhone: en Ajustes > Cámara > Formatos elige "Más compatible", o hazle una captura)' : '') + '.');
        }
        return await new Promise(function (resolver) {
            var capa = document.createElement('div');
            capa.id = 'sf-rec';
            var formatos = [['📱 3:4', 3 / 4, 'Vertical, el recomendado: llena la pantalla del móvil (810×1080)'], ['4:5', 4 / 5, 'Vertical algo más ancho'], ['1:1', 1, 'Cuadrada'], ['4:3', 4 / 3, 'Horizontal'], ['16:9', 16 / 9, 'Horizontal panorámica'], ['Libre', NaN, 'Sin proporción fija']];
            var prev = op.datos || null;   // último recorte de esta foto (x, y, width, height, rotate, fmt): se reabre igual
            var fmt = prev && 'fmt' in prev ? prev.fmt : op.libre ? NaN : formatoRec;
            capa.innerHTML = '<div class="sf-rec-caja"><div class="sf-rec-cab"><b>✂ Recortar</b> <small>' + esc(titulo || '') + '</small></div>' +
                '<div class="sf-rec-zona"><img alt=""></div>' +
                '<div class="sf-rec-barra">' + formatos.map(function (f, i) { return '<button data-f="' + i + '" title="' + f[2] + '">' + f[0] + '</button>'; }).join('') +
                '<span class="sf-sep"></span><button data-g="-90" title="Girar a la izquierda">⟲</button><button data-g="90" title="Girar a la derecha">⟳</button>' +
                '<button data-r="1" title="Volver a la foto entera">Restablecer</button></div>' +
                '<div class="sf-rec-info"></div>' +
                '<div class="sf-bot"><button class="sf-no">Cancelar</button><button class="sf-ok">Usar foto</button></div></div>';
            document.body.appendChild(capa);
            var img = capa.querySelector('img'), info = capa.querySelector('.sf-rec-info');
            img.src = url;
            var cr = new window.Cropper(img, {
                viewMode: 1, autoCropArea: 1, aspectRatio: fmt, background: false, responsive: true,
                checkOrientation: true, movable: true, zoomable: true, toggleDragModeOnDblclick: false,
                ready: function () {
                    if (!prev) return;
                    if (prev.rotate) { cr.rotate(prev.rotate); encajar(); }
                    cr.setData({ x: prev.x, y: prev.y, width: prev.width, height: prev.height });
                },
                crop: function (e) {
                    var w = Math.round(e.detail.width), h = Math.round(e.detail.height), f = Math.min(1, lado / Math.max(w, h));
                    info.textContent = w + '×' + h + ' → se guarda a ' + Math.round(w * f) + '×' + Math.round(h * f) + ' px';
                }
            });
            var marcar = function () {
                capa.querySelectorAll('[data-f]').forEach(function (b) {
                    var v = formatos[+b.dataset.f][1];
                    b.classList.toggle('activo', (isNaN(v) && isNaN(fmt)) || v === fmt);
                });
            };
            marcar();
            capa.querySelectorAll('[data-f]').forEach(function (b) {
                b.onclick = function () {
                    fmt = formatos[+b.dataset.f][1];
                    if (!op.libre) { formatoRec = fmt; try { localStorage.setItem(CLAVE_FMT, isNaN(fmt) ? 'libre' : String(fmt)); } catch (e) { } }
                    cr.setAspectRatio(fmt); marcar();
                };
            });
            // Girar: Cropper deja la foto girada más grande que la ventana (se sale por un lado). Se vuelve a encajar
            // entera y centrada, y el recuadro se rehace al máximo con el formato elegido.
            var encajar = function () {
                cr.clear();   // sin recuadro: si no, Cropper no deja la foto más pequeña que el recuadro
                var c = cr.getContainerData(), cv = cr.getCanvasData();
                if (!c.width || !cv.width) { cr.crop(); return; }
                var k = Math.min(c.width / cv.width, c.height / cv.height), w = cv.width * k, h = cv.height * k;
                cr.setCanvasData({ left: (c.width - w) / 2, top: (c.height - h) / 2, width: w, height: h });
                cr.crop(); cr.setAspectRatio(fmt);
            };
            capa.querySelectorAll('[data-g]').forEach(function (b) { b.onclick = function () { cr.rotate(+b.dataset.g); encajar(); }; });
            capa.querySelector('[data-r]').onclick = function () { cr.reset(); };
            var fin = function (v) { cr.destroy(); capa.remove(); URL.revokeObjectURL(url); resolver(v); };
            capa.querySelector('.sf-no').onclick = function () { fin(null); };
            capa.querySelector('.sf-ok').onclick = async function () {
                this.disabled = true; this.textContent = 'Preparando…';
                var d = cr.getData(true);
                var f = Math.min(1, lado / Math.max(d.width, d.height));
                var c = cr.getCroppedCanvas({ width: Math.round(d.width * f), height: Math.round(d.height * f), imageSmoothingEnabled: true, imageSmoothingQuality: 'high', fillColor: op.transparente ? 'transparent' : '#fff' });
                var blob = await canvasAWebp(c, op.calidad);
                fin({ blob: blob, info: d.width + '×' + d.height + ' → ' + c.width + '×' + c.height + ', ' + kb(blob.size), datos: { x: d.x, y: d.y, width: d.width, height: d.height, rotate: d.rotate || 0, fmt: fmt } });
            };
        });
    }

    // ---------- ventana ----------
    var CSS = '#sf-fondo{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px}' +
        '#sf-caja{background:#fff;color:#1f2328;border-radius:12px;max-width:720px;width:100%;padding:20px;font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;max-height:92vh;overflow:auto}' +
        '#sf-caja h3{margin:0 0 4px;font-size:1.1rem}#sf-caja h4{margin:16px 0 8px;font-size:.8rem;text-transform:uppercase;letter-spacing:.05em;color:#6b6f76}' +
        '#sf-caja .sf-sub{font-size:.82rem;color:#6b6f76;margin:0 0 12px}' +
        '#sf-caja input[type=text]{padding:7px 9px;border:1px solid #ccc;border-radius:7px;font:inherit;width:220px}' +
        '.sf-rejilla{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}' +
        '.sf-foto{border:1px solid #e3e0d8;border-radius:10px;padding:6px;background:#faf9f6;display:flex;flex-direction:column;gap:6px}' +
        '.sf-foto.nueva{border-color:#16a34a}.sf-foto .sf-img{aspect-ratio:4/3;background:#eee center/cover no-repeat;border-radius:7px}' +
        '.sf-foto .sf-num{font-weight:700;font-size:.82rem}.sf-foto .sf-num small{font-weight:400;color:#6b6f76}' +
        '.sf-acc{display:flex;flex-wrap:wrap;gap:4px}.sf-acc button{flex:1 1 auto;padding:4px 6px;border:1px solid #d6d2c6;border-radius:6px;background:#fff;cursor:pointer;font-size:.78rem}' +
        '.sf-acc button:disabled{opacity:.35;cursor:default}.sf-acc .peligro{color:#b42318}' +
        '#sf-caja.sf-plato{max-width:none;width:100%;height:calc(100vh - 32px);max-height:none;box-sizing:border-box;display:flex;flex-direction:column}#sf-caja.sf-plato>*{flex:0 0 auto}' +
        '#sf-caja.sf-plato .sf-rejilla{grid-template-columns:repeat(auto-fill,minmax(190px,300px));grid-auto-rows:330px}' +
        '#sf-caja.sf-plato .sf-rejilla.sf-crece{flex:1 0 auto;min-height:330px;grid-auto-rows:minmax(330px,1fr)}' +
        '.sf-plato .sf-foto{display:grid;grid-template-rows:minmax(120px,1fr) auto auto auto;gap:6px}' +
        '.sf-plato .sf-foto .sf-img{aspect-ratio:auto;height:100%;background-size:contain;background-color:#ece9e2}' +
        '.sf-plato .sf-foto .sf-info{min-height:1.3em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
        '.sf-plato .sf-acc{display:grid;grid-template-columns:repeat(6,1fr);gap:4px}.sf-plato .sf-acc button{min-width:0;white-space:nowrap}' +
        '.sf-plato .sf-foto .sf-img{cursor:zoom-in}.sf-plato .sf-foto.rep{border-color:#dc2626;background:#fef2f2}.sf-rep-fila{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px;font-size:.82rem}.sf-rep-fila button{padding:5px 10px;border:1px solid #d6d2c6;border-radius:7px;background:#fff;cursor:pointer;font-size:.8rem}.sf-rep-fila .peligro{border-color:#dc2626;color:#b42318}' +
        '#sf-ver{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:100002;display:flex;flex-direction:column;color:#fff;font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;user-select:none}' +
        '#sf-ver .v-cab{display:flex;gap:12px;align-items:center;padding:10px 16px}#sf-ver .v-cab b{font-size:1rem}#sf-ver .v-cab small{color:#cbd5e1}#sf-ver .v-cab .v-x{margin-left:auto}' +
        '#sf-ver button{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:8px;padding:6px 12px;cursor:pointer;font:inherit}#sf-ver button:hover{background:rgba(255,255,255,.25)}' +
        '#sf-ver .v-zona{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;padding:0 60px 16px}#sf-ver .v-zona img{max-width:100%;max-height:100%;object-fit:contain;border-radius:6px}' +
        '#sf-ver .v-izq,#sf-ver .v-der{position:absolute;top:0;bottom:0;width:35%;cursor:pointer;display:flex;align-items:center;font-size:2.4rem;color:rgba(255,255,255,.5)}#sf-ver .v-izq{left:0;padding-left:14px}#sf-ver .v-der{right:0;justify-content:flex-end;padding-right:14px}#sf-ver .v-izq:hover,#sf-ver .v-der:hover{color:#fff}' +
        '#sf-ver .v-conf{position:absolute;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center}#sf-ver .v-conf div{background:#fff;color:#1f2328;border-radius:12px;padding:18px 22px;display:flex;flex-direction:column;gap:12px;align-items:center}#sf-ver .v-conf button{color:#1f2328;background:#e5e7eb;border:0}#sf-ver .v-conf .si{background:#dc2626;color:#fff}' +
        '.sf-plato .sf-acc .c2{grid-column:span 2}.sf-plato .sf-acc .c3{grid-column:span 3}.sf-plato .sf-acc .c6{grid-column:span 6}.sf-plato .sf-acc .oculto{visibility:hidden}' +
        '.sf-vacio{color:#6b6f76;font-size:.85rem;padding:6px 0}' +
        '#sf-msg{min-height:1.2em;margin-top:12px;font-size:.85rem}' +
        '.sf-bot{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}.sf-bot button{padding:9px 14px;border-radius:8px;border:0;cursor:pointer;font:600 14px system-ui,sans-serif}' +
        '.sf-ok{background:#16a34a;color:#fff}.sf-no{background:#e5e7eb}.sf-add{background:#1f2328;color:#fff;margin-right:auto}.sf-bot button:disabled{opacity:.5;cursor:progress}' +
        '#sf-rec{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:100001;display:flex;align-items:center;justify-content:center;padding:12px}' +
        '.sf-rec-caja{background:#fff;color:#1f2328;border-radius:12px;width:100%;max-width:900px;padding:14px;font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;max-height:96vh;display:flex;flex-direction:column;gap:10px}' +
        '.sf-rec-cab small{color:#6b6f76}.sf-rec-zona{height:60vh;min-height:240px;background:#222;border-radius:8px;overflow:hidden}.sf-rec-zona img{display:block;max-width:100%}' +
        '.sf-rec-barra{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.sf-rec-barra button{padding:6px 10px;border:1px solid #d6d2c6;border-radius:7px;background:#fff;cursor:pointer;font-size:.85rem}' +
        '.sf-rec-barra button.activo{background:#1f2328;color:#fff;border-color:#1f2328}.sf-sep{flex:0 0 8px}.sf-rec-info{font-size:.8rem;color:#6b6f76}' +
        '.sf-rec-caja .sf-bot{margin-top:0}' +
        '.sf-ext{border:1px dashed #cbd5e1;border-radius:10px;padding:10px;background:#f8fafc;display:flex;flex-direction:column;gap:8px}' +
        '.sf-ext-fila{display:flex;flex-wrap:wrap;gap:6px;align-items:center}#sf-caja .sf-ext-fila input{flex:1 1 200px;width:auto}' +
        '.sf-ext-fila a{padding:6px 10px;border-radius:7px;border:1px solid #d6d2c6;background:#fff;color:#1f2328;text-decoration:none;font-size:.82rem;white-space:nowrap}' +
        '.sf-drop{border:2px dashed #94a3b8;border-radius:9px;padding:14px;text-align:center;color:#475569;font-size:.85rem;background:#fff;outline:none}' +
        '.sf-drop.encima,.sf-drop:focus{border-color:#16a34a;background:#f0fdf4}.sf-drop.lleno{opacity:.5}' +
        '.sf-ext small{color:#6b6f76;font-size:.75rem}' +
        '.sfg-pasos{background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:8px 12px;font-size:.86rem}.sfg-pasos summary{cursor:pointer}.sfg-pasos ol{margin:8px 0 0;padding-left:20px}.sfg-pasos li{margin:4px 0}.sfg-pasos code{background:#eef2f7;padding:1px 4px;border-radius:4px;font-size:.8rem}' +
        '#sf-caja .sf-gal-cab input[type=text]{padding:4px 8px}#sf-caja .sf-ext-fila input{flex:1 1 200px}' +
        '.sfg-org{margin-top:10px;padding:10px 12px;border:2px solid #f59e0b;background:#fffbeb;border-radius:9px;font-size:.88rem;display:flex;flex-wrap:wrap;gap:6px;align-items:center}.sfg-org button{padding:6px 10px;border-radius:7px;cursor:pointer;font-size:.8rem}.sfg-org button:not(.sfg-b){border:1px solid #d6d2c6;background:#fff}' +
        '.sfg-orgs{margin-top:8px;font-size:.78rem;color:#6b6f76}.sfg-orgs a{color:#b42318;text-decoration:none}' +
        '.sfg-buscar{margin-top:10px;display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;font-size:.86rem}.sfg-buscar label{display:flex;gap:6px;align-items:center;font-weight:600}.sfg-buscar input{width:280px;padding:7px 9px;border:1px solid #ccc;border-radius:7px;font-weight:400}.sfg-buscar small{color:#6b6f76;flex:1 1 300px}' +
        '.sfg-ir{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.sfg-ir>div{display:flex;gap:6px;align-items:center}.sfg-ir a{text-decoration:none;padding:9px 12px;font-size:.88rem}.sfg-ir input{flex:1;min-width:0;padding:7px 9px;border:1px solid #ccc;border-radius:7px;font-size:.8rem}' +
        '@media(max-width:700px){.sfg-ir{grid-template-columns:1fr}}' +
        '.sfg-b{padding:6px 10px;border-radius:7px;border:0;background:#1f2328;color:#fff;cursor:pointer;font-size:.8rem;white-space:nowrap}' +
        '.sfg-rejilla{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px;margin-top:10px}' +
        '.sfg-card{border:1px solid #e3e0d8;border-radius:10px;padding:6px;background:#faf9f6;display:flex;flex-direction:column;gap:5px}.sfg-card.usada{opacity:.55}' +
        '.sfg-card{position:relative}.sfg-card.sel{outline:3px solid #15803d;outline-offset:-1px;background:#ecfdf3}.sfg-selmodo .sfg-card[data-k],.sfg-selmodo .sfg-grupo{cursor:pointer}' +
        '.sfg-nsel{position:absolute;top:10px;left:10px;min-width:26px;height:26px;border-radius:13px;background:rgba(255,255,255,.9);border:2px solid #1f2328;color:#1f2328;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:.85rem;z-index:1;padding:0 4px;box-sizing:border-box}.sfg-card.sel .sfg-nsel{background:#15803d;border-color:#15803d;color:#fff}' +
        '.sfg-grupo{background:#eef6ff;border-color:#93c5fd;box-shadow:5px 5px 0 -1px #dbeafe,5px 5px 0 0 #93c5fd}.sfg-grupo .sfg-t{color:#1e40af}' +
        '.sfg-hint{font-size:.75rem;color:#6b6f76;text-align:center;padding:5px 0}' +
        '.sfg-ops{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.sfg-ops button{font-size:.85rem;padding:8px 12px}' +
        '#sfg-barra{position:fixed;left:0;right:0;bottom:0;z-index:100001;background:#1f2328;color:#fff;padding:10px 16px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;box-shadow:0 -4px 16px rgba(0,0,0,.25);font:14px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif}' +
        '#sfg-barra .sfg-barra-t{flex:1 1 300px;min-width:0}#sfg-barra small{color:#cbd5e1}#sfg-barra button{padding:7px 11px;border-radius:7px;border:1px solid #475569;background:#334155;color:#fff;cursor:pointer;font-size:.82rem;white-space:nowrap}#sfg-barra button.ok{background:#15803d;border-color:#15803d;font-weight:700}#sfg-barra button:disabled{opacity:.45;cursor:default}' +
        '#sfg-toast{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:100004;max-width:min(900px,92vw);background:#fff;border:1px solid #d6d2c6;border-radius:9px;padding:9px 14px;box-shadow:0 6px 20px rgba(0,0,0,.2);font:14px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif;display:none}' +
        '.sfg-card img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:7px;display:block;background:#e5e7eb}' +
        '.sfg-i{font-size:.72rem;color:#6b6f76;line-height:1.25em;min-height:2.5em;overflow:hidden}.sfg-i.peq{color:#b42318;font-weight:600}' +
        '.sfg-t{font-size:.8rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sfg-u{font-size:.74rem;color:#15803d}' +
        '#sfg-inst{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100003;display:flex;align-items:center;justify-content:center;padding:16px}' +
        '.sfg-in-caja{background:#fff;color:#1f2328;border-radius:12px;width:100%;max-width:720px;max-height:92vh;overflow:auto;padding:18px 20px;font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}' +
        '.sfg-in-estado{margin:10px 0;padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0}' +
        '.sfg-in-pasos{list-style:none;padding:0;margin:10px 0;display:flex;flex-direction:column;gap:12px}.sfg-in-pasos>li{display:flex;gap:12px;align-items:flex-start}.sfg-in-pasos ul li{margin:2px 0}' +
        '.sfg-in-n{flex:0 0 28px;height:28px;border-radius:50%;background:#1f2328;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700}' +
        '.sfg-in-pasos a.sfg-b{display:inline-block;margin-top:4px;text-decoration:none;padding:8px 12px}.sfg-in-pasos code,.sfg-in-caja code{background:#eef2f7;padding:1px 5px;border-radius:4px;font-size:.84rem}' +
        '#sfg-pop{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100002;display:flex;align-items:center;justify-content:center;padding:16px}' +
        '.sfg-pop-caja{background:#fff;color:#1f2328;border-radius:12px;width:100%;max-width:760px;height:90vh;display:flex;flex-direction:column;gap:10px;padding:16px;font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif}' +
        '.sfg-pop-cab{display:flex;gap:12px;align-items:center}.sfg-pop-cab img{width:110px;height:82px;object-fit:cover;border-radius:8px;flex:0 0 auto;background:#eee}' +
        '.sfg-pop-q{padding:9px 11px;border:1px solid #ccc;border-radius:8px;font:inherit}' +
        '.sfg-pop-lista{flex:1;overflow:auto;border:1px solid #e3e0d8;border-radius:9px;padding:4px 8px}' +
        '.sfg-pc{font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:#6b6f76;margin:10px 0 2px;font-weight:700}' +
        '.sfg-pf{display:flex;gap:8px;align-items:center;padding:6px 6px;border-radius:7px;cursor:pointer;font-size:.88rem}.sfg-pf:hover{background:#f5f5f4}.sfg-pf.on{background:#dcfce7}.sfg-pf input{width:18px;height:18px}' +
        '.sfg-pop-sel{font-size:.78rem;max-width:55%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
        '.sfg-chips{display:flex;flex-wrap:wrap;gap:4px}.sfg-chip{background:#e0f2fe;color:#075985;border-radius:12px;padding:2px 8px;font-size:.72rem;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sfg-chip b{cursor:pointer;margin-left:3px;color:#b42318}' +
        '.sfg-a2{display:flex;gap:4px}.sfg-a2 button{flex:1;padding:4px 6px;border:1px solid #d6d2c6;border-radius:6px;background:#fff;cursor:pointer;font-size:.75rem}' +
        '.sfg-card>.sfg-a{margin-top:auto}.sfg-a{display:flex;gap:4px}.sfg-a input{flex:1;min-width:0;padding:5px 6px;border:1px solid #ccc;border-radius:6px;font-size:.78rem}.sfg-a button[data-x]{border:1px solid #d6d2c6;background:#fff;border-radius:6px;cursor:pointer;padding:0 7px}' +
        '.sf-gal-cab{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:.82rem}.sf-gal-cab button{padding:3px 8px;border:1px solid #d6d2c6;border-radius:6px;background:#fff;cursor:pointer;font-size:.75rem}' +
        '.sf-gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;max-height:62vh;overflow:auto}' +
        '.sf-g{position:relative;aspect-ratio:1;border-radius:7px;overflow:hidden;cursor:pointer;background:#e5e7eb}.sf-g img{width:100%;height:100%;object-fit:cover;display:block}' +
        '.sf-plato .sf-ext>*{flex:none}.sf-plato .sf-gal{grid-template-columns:repeat(auto-fill,minmax(140px,1fr));grid-auto-rows:140px}.sf-plato .sf-g{aspect-ratio:auto;height:140px;min-height:0}.sf-plato .sf-g img{position:absolute;inset:0;width:100%;height:100%}' +
        '.sf-g.parece{outline:3px solid #f59e0b;outline-offset:-3px}.sf-g:hover{outline:3px solid #16a34a;outline-offset:-3px}.sf-g.usada{opacity:.45}.sf-g.aqui{outline:3px solid #2563eb;outline-offset:-3px}' +
        '.sf-g span{position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,.65);color:#fff;font-size:.68rem;padding:2px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
        '.sf-g button{position:absolute;top:3px;right:3px;border:0;border-radius:50%;width:20px;height:20px;background:rgba(0,0,0,.6);color:#fff;cursor:pointer;font-size:.7rem;line-height:20px;padding:0}' +
        '.sf-btn{margin-top:6px;padding:5px 9px;border-radius:7px;border:1px solid #cbd5e1;background:#f8fafc;cursor:pointer;font-size:.78rem;white-space:nowrap}';

    async function gestor(op) {
        op = op && op.url ? op : null;
        var p = platoActual();
        if (!p) { alert('Abre primero la ficha de un plato.'); return; }
        var carpeta = String(p.carpeta || '').trim();
        if (!carpeta) { alert('Este plato no tiene carpeta de fotos (columna Carpeta).'); return; }
        var campo = document.getElementById('edit-imagen');
        var actual = (campo && campo.value) || p.imagen || '';
        var mm = String(actual).match(/^(.*)0\d\.webp$/i);
        var baseOriginal = mm ? mm[1] : '';
        var base = baseOriginal || slug((document.getElementById('edit-es') || {}).value || p.es || ('plato_' + p.id));
        var dirAct = dirWeb + 'imagenes/' + carpeta + '/', dirDes = dirAct + DESACT + '/';

        var fondo = document.createElement('div');
        fondo.id = 'sf-fondo';
        fondo.innerHTML = '<div id="sf-caja" class="sf-plato"><h3>📷 Fotos del plato</h3><p class="sf-sub">Cargando…</p></div>';
        document.body.appendChild(fondo);
        var caja = fondo.querySelector('#sf-caja');
        var urls = [];
        var cerrar = function () { urls.forEach(URL.revokeObjectURL); fondo.remove(); document.removeEventListener('paste', alPegar); alRecibir = null; };
        var busq = busquedaLocal(), verUsadas = false, hayCarpetaP = null;
        idbGet(CLAVE_CARPETA).then(function (h) { if (h && !carpetaLocal) { hayCarpetaP = h; if (!guardando && caja.querySelector('.sf-bot')) pintar(); } });
        var nombrePlato = function () { return String((document.getElementById('edit-es') || {}).value || p.es || ('plato ' + p.id)).trim(); };

        // Estado: listas de { path (original o null), sha, blob?, info? }
        var activas = [], desact = [], originales = [];
        try {
            var patron = baseOriginal ? new RegExp('^' + baseOriginal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '0(\\d)\\.webp$', 'i') : null;
            if (patron) {
                var a = await listar(dirAct.slice(0, -1)), d = await listar(dirDes.slice(0, -1));
                a.forEach(function (f) { var m = f.name.match(patron); if (m) activas.push({ n: +m[1], path: f.path, sha: f.sha }); });
                var patD = patronDes(baseOriginal);
                d.forEach(function (f) { var m = f.name.match(patD); if (m) desact.push({ n: +m[1], path: f.path, sha: f.sha }); });
                activas.sort(function (x, y) { return x.n - y.n; }); desact.sort(function (x, y) { return x.n - y.n; });
                originales = activas.concat(desact).map(function (x) { return { path: x.path, sha: x.sha }; });
                // Miniaturas (se cargan en segundo plano)
                activas.concat(desact).forEach(function (x) {
                    api('/contents/' + codRuta(x.path), {}, true).then(function (r) { return r.ok ? r.blob() : null; }).then(function (bl) {
                        if (!bl) return; x.fuente = bl; x.url = URL.createObjectURL(bl); urls.push(x.url); if (!guardando && document.body.contains(fondo)) pintar();
                    }).catch(function () { });
                });
            }
        } catch (e) { caja.querySelector('.sf-sub').textContent = 'No se pudieron leer las fotos: ' + e.message; return; }

        var huecosAviso = activas.length && activas.some(function (x, i) { return x.n !== i + 1; });
        var entrada = document.createElement('input');
        entrada.type = 'file'; entrada.accept = 'image/*'; entrada.multiple = true; entrada.style.display = 'none';
        fondo.appendChild(entrada);
        var guardando = false;

        function tarjeta(x, i, esActiva) {
            var n = esActiva ? i + 1 : null;
            var nombre = esActiva ? (n === 1 ? '01 <small>principal</small>' : '0' + n + ' <small>galería</small>') : '<small>desactivada</small>';
            var acc = esActiva
                ? '<button data-a="izq" class="c2" ' + (i === 0 ? 'disabled' : '') + ' title="Antes">◀</button>' +
                  '<button data-a="der" class="c2" ' + (i === activas.length - 1 ? 'disabled' : '') + ' title="Después">▶</button>' +
                  (i > 0 ? '<button data-a="pri" class="c2" title="Poner como principal (01)">★ 01</button>' : '<button class="c2 oculto" disabled tabindex="-1">★ 01</button>') +
                  '<button data-a="rec" class="c6" title="Recortar o girar" ' + (x.fuente || x.blob ? '' : 'disabled') + '>✂ Recortar</button>' +
                  '<button data-a="off" class="c3" title="La web deja de mostrarla (se guarda aparte)">Desactivar</button>' +
                  '<button data-a="del" class="c3 peligro">Eliminar</button>'
                : '<button data-a="rec" class="c6" title="Recortar o girar" ' + (x.fuente || x.blob ? '' : 'disabled') + '>✂ Recortar</button>' +
                  '<button data-a="on" class="c3" ' + (activas.length >= MAX_FOTOS ? 'disabled title="Ya hay 4 activas"' : '') + '>Activar</button>' +
                  '<button data-a="del" class="c3 peligro">Eliminar</button>';
            return '<div class="sf-foto' + (x.blob ? ' nueva' : '') + (x.rep ? ' rep' : '') + '" data-l="' + (esActiva ? 'a' : 'd') + '" data-i="' + i + '">' +
                '<div class="sf-img" style="background-image:url(' + (x.url || '') + ')"></div>' +
                '<div class="sf-num">' + nombre + (x.blob ? ' <small>· nueva</small>' : '') + '</div>' +
                (x.rep ? '<div class="sf-num sf-info" style="color:#b42318">⚠ repetida de ' + esc(x.rep) + '</div>' :
                '<div class="sf-num sf-info"' + (x.info ? ' title="' + esc(x.info) + '"' : '') + '><small>' + (x.info ? esc(x.info) : '&nbsp;') + '</small></div>') +
                '<div class="sf-acc">' + acc + '</div></div>';
        }
        function enEstePlato(u) { var c = claveFoto(u); return activas.concat(desact).some(function (x) { return x.gal === c; }); }
        function galeriaHtml() {
            var g = leerGaleria();
            if (!g.length) return '';
            var usadas = g.filter(function (x) { return x.usada; }).length;
            var dupG = repetidas(g);
            var np = nombrePlato() + ' ' + String((document.getElementById('edit-en') || {}).value || p.en || '');
            var vis = g.map(function (x, i) { return { x: x, i: i, p: x.t ? parecido(np, x.t) : 0 }; })
                .filter(function (o) { return (verUsadas || !o.x.usada || enEstePlato(o.x.u)) && !esPequena(o.x) && !dupG[claveFoto(o.x.u)] && !hashDescartado(o.x.hash); })
                .sort(function (a, b) { return (b.p - a.p) || (a.i - b.i); });
            var nPar = vis.filter(function (o) { return o.p > 0; }).length;
            return '<div class="sf-gal-cab"><b>Fotos escaneadas: ' + (g.length - usadas) + ' sin usar' + (usadas ? ' · ' + usadas + ' usadas' : '') + '</b>' +
                (usadas ? '<label><input type="checkbox" id="sf-ver-usadas"' + (verUsadas ? ' checked' : '') + '> ver usadas</label>' : '') +
                '<button type="button" id="sf-gal-vaciar">Vaciar lista</button><small>' + (nPar ? '★ ' + nPar + ' parecen este plato (salen primero). ' : '') + 'Pulsa una para ponerla en este plato.</small></div>' +
                (vis.length ? '<div class="sf-gal">' + vis.map(function (o) {
                    var aqui = enEstePlato(o.x.u);
                    return '<div class="sf-g' + (aqui ? ' aqui' : o.x.usada ? ' usada' : o.p ? ' parece' : '') + '" data-k="' + esc(claveFoto(o.x.u)) + '" title="' + esc((o.x.t ? o.x.t + ' · ' : '') + (o.x.usada ? 'Usada en: ' + o.x.usada : 'Poner en este plato')) + '">' +
                        imgPrevia(o.x.u, "this.parentNode.style.display='none'") +
                        (aqui ? '<span>· en este plato</span>' : o.x.usada ? '<span>✔ ' + esc(o.x.usada) + '</span>' : o.x.t ? '<span>' + (o.p ? '★ ' : '') + esc(o.x.t) + '</span>' : '') +
                        '<button type="button" data-x="1" title="Quitar de la lista">✕</button></div>';
                }).join('') + '</div>' : '<div class="sf-vacio">Todas usadas.</div>');
        }
        function activarGaleria() {
            var vu = caja.querySelector('#sf-ver-usadas');
            if (vu) vu.onchange = function () { verUsadas = vu.checked; pintar(); };
            var vac = caja.querySelector('#sf-gal-vaciar');
            if (vac) vac.onclick = function () {
                (window.confirmarEditor ? window.confirmarEditor('¿Vaciar la lista de fotos escaneadas? (no toca las fotos ya puestas en platos)') : Promise.resolve(confirm('¿Vaciar la lista?')))
                    .then(function (ok) { if (ok) { vaciarTodo(); pintar(); } });
            };
            caja.querySelectorAll('.sf-g').forEach(function (el) {
                el.onclick = async function (e) {
                    var g = leerGaleria(), ix = indiceDe(g, el.dataset.k), x = g[ix];
                    if (!x) return;
                    if (e.target.dataset.x) {
                        e.stopPropagation();
                        descartar(el.dataset.k, x.hash); g.splice(ix, 1); guardarGaleria(g); el.remove();
                        var cb = caja.querySelector('.sf-gal-cab b'); if (cb) cb.textContent = 'Fotos escaneadas: ' + g.filter(function (q) { return !q.usada; }).length + ' sin usar';
                        return;
                    }
                    if (enEstePlato(x.u)) { avisar('Esa foto ya está en este plato.', '#b45309'); return; }
                    if (esLocal(x.u)) { try { await añadir([await archivoLocal(x.u)], claveFoto(x.u)); } catch (e2) { avisar(e2.message || String(e2)); } }
                    else await añadirUrl(x.u, claveFoto(x.u));
                };
            });
        }
        function pintar() {
            var sg0 = caja.querySelector('.sf-gal'), stG = sg0 ? sg0.scrollTop : 0, stC = caja.scrollTop;
            setTimeout(function () { var sg = caja.querySelector('.sf-gal'); if (sg) sg.scrollTop = stG; caja.scrollTop = stC; }, 0);
            caja.innerHTML = '<h3>📷 Fotos del plato</h3>' +
                '<p class="sf-sub">imagenes/' + esc(carpeta) + '/ · la web enseña la 01 y luego 02, 03, 04 seguidas. Al guardar se renumeran sin huecos.' +
                (huecosAviso ? ' <b style="color:#b45309">Había huecos en la numeración: se corrigen al guardar.</b>' : '') + '</p>' +
                '<div><label style="font-size:.82rem;color:#555">Nombre de las fotos: </label><input type="text" id="sf-base" value="' + esc(base) + '"> <small style="color:#6b6f76">→ ' + esc(base) + '01.webp…</small></div>' +
                (activas.length + desact.length > 1 ? '<div class="sf-rep-fila"><button type="button" id="sf-rep-buscar">🔍 Buscar repetidas</button>' +
                    (nRep() ? '<button type="button" id="sf-rep-quitar" class="peligro">🗑 Quitar repetidas (' + nRep() + ')</button>' : '') +
                    '<small style="color:#6b6f76">Pulsa una foto para verla en grande (← → pasar · Supr eliminar).</small></div>' : '') +
                '<h4>En la web (' + activas.length + '/' + MAX_FOTOS + ')</h4>' +
                (activas.length ? '<div class="sf-rejilla sf-crece">' + activas.map(function (x, i) { return tarjeta(x, i, true); }).join('') + '</div>' : '<div class="sf-vacio">Ninguna: el plato sale sin 📸 en la web.</div>') +
                (desact.length ? '<h4>Desactivadas · de repuesto (' + desact.length + ')</h4><div class="sf-rejilla">' + desact.map(function (x, i) { return tarjeta(x, i, false); }).join('') + '</div>' : '') +
                '<h4>Traer de Google Maps / TripAdvisor</h4><div class="sf-ext">' +
                '<div class="sf-ext-fila"><input type="text" id="sf-q" value="' + esc(busq) + '" title="Qué buscar (se recuerda en este dispositivo)">' +
                '<a id="sf-l-maps" target="_blank" rel="noopener">🗺️ Google Maps</a><a id="sf-l-trip" target="_blank" rel="noopener">🦉 TripAdvisor</a>' +
                '<a id="sf-l-img" target="_blank" rel="noopener" title="Google Imágenes: nombre del plato + restaurante">🔍 Este plato</a></div>' +
                '<div class="sf-drop" tabindex="0">' +
                'En la foto: clic derecho → <b>Copiar imagen</b>, y aquí <b>Ctrl+V</b><br>· o arrastra la foto aquí · o pega su dirección' +
                (activas.length >= MAX_FOTOS ? '<br><small>Ya hay ' + MAX_FOTOS + ' activas: las nuevas quedan de repuesto (Desactivadas).</small>' : '') + '</div>' +
                '<small>Las fotos que trae la extensión Escáner de fotos salen aquí abajo. Para verlas todas y repartirlas entre platos: botón <b>🖼️ Fotos de internet</b> de arriba.</small>' +
                galeriaHtml() +
                '<small>En Maps: ficha del restaurante → Fotos → "Menú" / "Comida". Usa solo fotos del propio restaurante o con permiso de quien la hizo.</small></div>' +
                '<p id="sf-msg"></p>' +
                '<div class="sf-bot"><button class="sf-add" style="margin-right:0">＋ Añadir fotos</button>' +
                '<button class="sf-add" id="sf-carpeta" style="margin-right:0;background:#2563eb" title="Elegir una carpeta del PC: sus fotos salen abajo, en la lista; pulsa una para ponerla en este plato">📂 Carpeta del PC</button>' +
                (hayCarpetaP && !carpetaLocal ? '<button class="sf-add" id="sf-reabrir" style="margin-right:0;background:#1d4ed8">📂 Volver a abrir' + (hayCarpetaP.name ? ' «' + esc(hayCarpetaP.name) + '»' : '') + '</button>' : '') +
                '<span style="margin-right:auto;align-self:center;font-size:.8rem;color:#15803d">' + (carpetaLocal ? '📂 ' + esc(carpetaLocal) + ': ' + Object.keys(archivosLocales).length + ' fotos' : '') + '</span>' +
                '<button class="sf-no">Cancelar</button><button class="sf-ok">Guardar</button></div>';
            caja.querySelector('#sf-base').oninput = function () { base = slug(this.value) || base; };
            caja.querySelector('#sf-base').onchange = function () { pintar(); };
            caja.querySelector('.sf-no').onclick = function () { if (!guardando) cerrar(); };
            caja.querySelector('.sf-add').onclick = function () { entrada.click(); };
            var trasCarpetaP = function (r) {
                hayCarpetaP = null; pintar(); if (typeof contarBoton === 'function') contarBoton();
                avisar('📂 ' + carpetaLocal + ': ' + r.leidas + ' fotos' + (r.nuevas ? ', ' + r.nuevas + ' nuevas' : '') + '. Están en la lista de abajo (Fotos escaneadas): pulsa una para ponerla en este plato.', '#15803d');
                setTimeout(function () { var g = caja.querySelector('.sf-gal-cab'); if (g) g.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 50);
            };
            var errCarpetaP = function (e) { if (e && e.name === 'AbortError') return; avisar(e.message || String(e)); };
            caja.querySelector('#sf-carpeta').onclick = function () { abrirCarpeta(true).then(trasCarpetaP, errCarpetaP); };
            var rbP = caja.querySelector('#sf-reabrir'); if (rbP) rbP.onclick = function () { abrirCarpeta(false).then(trasCarpetaP, errCarpetaP); };
            caja.querySelector('.sf-ok').onclick = guardar;
            var q = caja.querySelector('#sf-q');
            var ponerEnlaces = function () {
                var l = enlacesExternos(q.value.trim(), (document.getElementById('edit-es') || {}).value || p.es || '');
                caja.querySelector('#sf-l-maps').href = l.maps; caja.querySelector('#sf-l-trip').href = l.trip; caja.querySelector('#sf-l-img').href = l.img;
            };
            ponerEnlaces();
            q.oninput = function () { busq = q.value; ponerEnlaces(); try { localStorage.setItem(CLAVE_Q, q.value.trim()); } catch (e) { } };
            activarGaleria();
            pintarLocales(caja);
            var zona = caja.querySelector('.sf-drop');
            zona.ondragover = function (e) { e.preventDefault(); zona.classList.add('encima'); };
            zona.ondragleave = function () { zona.classList.remove('encima'); };
            zona.ondrop = function (e) {
                e.preventDefault(); zona.classList.remove('encima');
                var dt = e.dataTransfer, fs = Array.prototype.filter.call(dt.files || [], function (f) { return /^image\//.test(f.type); });
                if (fs.length) { añadir(fs); return; }
                var html = dt.getData('text/html'), m = html && html.match(/<img[^>]+src=["']([^"']+)["']/i);
                var u = (m && m[1].replace(/&amp;/g, '&')) || (dt.getData('text/uri-list') || dt.getData('text/plain') || '').split('\n')[0].trim();
                if (u) añadirUrl(u);
            };
            caja.querySelectorAll('.sf-foto .sf-img').forEach(function (el) {
                el.onclick = function () { var t = el.closest('.sf-foto'); verFotos((t.dataset.l === 'a' ? 0 : activas.length) + (+t.dataset.i)); };
            });
            var rb1 = caja.querySelector('#sf-rep-buscar'); if (rb1) rb1.onclick = function () { buscarRepetidas(rb1); };
            var rb2 = caja.querySelector('#sf-rep-quitar'); if (rb2) rb2.onclick = function () {
                var n = nRep();
                (window.confirmarEditor ? window.confirmarEditor('¿Quitar las ' + n + ' fotos repetidas? (se borran al pulsar Guardar)') : Promise.resolve(confirm('¿Quitar ' + n + ' repetidas?')))
                    .then(function (ok) {
                        if (!ok) return;
                        [activas, desact].forEach(function (l) { for (var i = l.length - 1; i >= 0; i--) if (l[i].rep) l.splice(i, 1); });
                        pintar(); avisar('Quitadas ' + n + ' repetidas. Pulsa Guardar para borrarlas de GitHub.', '#15803d');
                    });
            };
            caja.querySelectorAll('.sf-foto button').forEach(function (b) {
                b.onclick = function () {
                    var t = b.closest('.sf-foto'), lista = t.dataset.l === 'a' ? activas : desact, i = +t.dataset.i, x = lista[i];
                    switch (b.dataset.a) {
                        case 'izq': lista.splice(i, 1); lista.splice(i - 1, 0, x); break;
                        case 'der': lista.splice(i, 1); lista.splice(i + 1, 0, x); break;
                        case 'pri': lista.splice(i, 1); lista.unshift(x); break;
                        case 'off': activas.splice(i, 1); desact.push(x); break;
                        case 'on': desact.splice(i, 1); activas.push(x); break;
                        case 'del':
                            (window.confirmarEditor ? window.confirmarEditor('¿Eliminar esta foto del todo?') : Promise.resolve(confirm('¿Eliminar esta foto del todo?')))
                                .then(function (ok) { if (ok) { lista.splice(i, 1); pintar(); } });
                            return;
                        case 'rec':
                            recortar(x.fuente || x.blob, 'foto ' + etiquetaFoto(x), { datos: x.fuente ? x.recorte : null }).then(function (r) {
                                if (!r) return;
                                var u = URL.createObjectURL(r.blob); urls.push(u);
                                if (!x.fuente) x.fuente = x.blob;
                                x.recorte = r.datos;   // para reabrir con el mismo recuadro/giro
                                x.blob = r.blob;   // x.fuente sigue siendo la original: se puede volver a recortar desde ella
                                x.url = u; x.info = r.info; x.sha = null; x.hv = null; x.rep = null;
                                pintar();
                            }).catch(function (e) { alert(e.message || e); });
                            return;
                    }
                    pintar();
                };
            });
        }
        entrada.onchange = function () {
            var files = Array.prototype.slice.call(entrada.files); entrada.value = '';
            añadir(files);
        };
        function avisar(t, color) { var m = caja.querySelector('#sf-msg'); if (m) { m.style.color = color || '#b42318'; m.textContent = t; } }
        async function añadirUrl(u, gal) {
            if (!/^(https?:|data:image\/)/i.test(u)) { avisar('Eso no es la dirección de una imagen.'); return; }
            if (/google\.[a-z.]+\/maps/.test(u) && !idGoogle(u)) { avisar('Ese enlace de Maps no lleva foto: ábrela en grande y copia la dirección de la barra entonces.'); return; }
            avisar('Descargando la foto…', '#555');
            try { await añadir([await archivoDeUrl(u)], gal); }
            catch (e) {
                avisar(e.message || String(e));
                var m = caja.querySelector('#sf-msg');
                if (e.abrir && m) m.insertAdjacentHTML('beforeend', '<a href="' + esc(e.abrir) + '" target="_blank" rel="noopener noreferrer">ábrela en grande</a>, clic derecho → "Copiar imagen", y aquí Ctrl+V.');
            }
        }
        // Ctrl+V con la ventana abierta (no mientras se recorta ni dentro de un campo de texto con texto pegado)
        function alPegar(e) {
            if (!document.body.contains(fondo) || document.getElementById('sf-rec') || guardando) return;
            var esc0 = (e.clipboardData && e.clipboardData.getData('text/plain') || '').trim();
            if (esc0.indexOf('FOTOS-CARTA:') === 0) {
                e.preventDefault();
                var lista; try { lista = JSON.parse(esc0.slice(12)); } catch (x) { lista = []; }
                var n = sumarEscaneo(lista);
                pintar();
                avisar('📥 ' + n + ' fotos nuevas en "Fotos escaneadas"' + (lista.length - n > 0 ? ' (' + (lista.length - n) + ' ya estaban)' : '') + '. Pulsa una para ponerla en este plato.', '#15803d');
                return;
            }
            var it = (e.clipboardData && e.clipboardData.items) || [], fs = [];
            for (var k = 0; k < it.length; k++) if (it[k].kind === 'file' && /^image\//.test(it[k].type)) { var f = it[k].getAsFile(); if (f) fs.push(f); }
            if (fs.length) { e.preventDefault(); añadir(fs.map(function (f, i) { return new File([f], 'pegada' + (i ? i + 1 : '') + '.' + (f.type.split('/')[1] || 'png'), { type: f.type }); })); return; }
            if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
            var t = (e.clipboardData && e.clipboardData.getData('text/plain') || '').trim();
            if (/^https?:\/\/\S+$/i.test(t)) { e.preventDefault(); añadirUrl(t); }
        }
        document.addEventListener('paste', alPegar);
        // ¿Ya está en este plato? Exacta: la original ya se asignó a este plato (huella SHA). Parecida: misma imagen
        // (huella visual del centro con la proporción de cada foto del plato; aguanta recortes centrados y recompresión).
        async function yaEnPlato(f, hashOrig) {
            var a = hashOrig && (descRemoto.asignadas[hashOrig] || descPend.asignadas[hashOrig]);
            if (a && String(a).split(' + ').some(function (t) { return t.split(' ')[0] === String(p.id); })) {
                if (activas.length + desact.length) return 'la misma foto original ya se puso en este plato';
            }
            var todas = activas.map(function (x, i) { return { x: x, n: '0' + (i + 1) + (i ? ' (galería)' : ' (principal)') }; })
                .concat(desact.map(function (x, i) { return { x: x, n: 'desactivada ' + (i + 1) }; }));
            var cache = {};
            for (var i = 0; i < todas.length; i++) {
                var x = todas[i].x, b = x.blob || x.fuente;
                if (!b) continue;
                if (x.hashOrig && x.hashOrig === hashOrig) return todas[i].n;
                try {
                    if (!x.hv) x.hv = await huellaVisual(b);
                    var kA = x.hv.aspecto.toFixed(2);
                    if (!cache[kA]) cache[kA] = await huellasPosiciones(f, x.hv.aspecto);
                    if (cache[kA].some(function (bits) { return distanciaVisual(x.hv.bits, bits) <= 55; })) return todas[i].n;
                } catch (e) { }
            }
            return '';
        }
        function nRep() { return activas.concat(desact).filter(function (x) { return x.rep; }).length; }
        function etiquetaFoto(x) {
            var i = activas.indexOf(x);
            if (i >= 0) return '0' + (i + 1) + (i ? ' · galería' : ' · principal');
            return 'desactivada ' + (desact.indexOf(x) + 1);
        }
        // Repetidas dentro del plato: misma imagen (huella visual) que otra anterior (activas primero).
        async function buscarRepetidas(btn) {
            var todas = activas.concat(desact);
            btn.disabled = true; btn.textContent = '🔍 Buscando…';
            for (var w = 0; w < 30 && todas.some(function (x) { return !(x.blob || x.fuente); }); w++) await new Promise(function (ok) { setTimeout(ok, 500); });
            for (var i = 0; i < todas.length; i++) {
                var x = todas[i]; x.rep = null;
                if (!x.hv && (x.blob || x.fuente)) { try { x.hv = await huellaVisual(x.blob || x.fuente); } catch (e) { } }
            }
            var n = 0;
            for (var j = 1; j < todas.length; j++) {
                var b = todas[j]; if (!b.hv) continue;
                for (var k = 0; k < j; k++) {
                    var a = todas[k];
                    if (!a.hv || a.rep || Math.abs(a.hv.aspecto - b.hv.aspecto) > 0.03) continue;
                    if (distanciaVisual(a.hv.bits, b.hv.bits) <= 40) { b.rep = etiquetaFoto(a).replace(' · galería', '').replace(' · principal', ''); n++; break; }
                }
            }
            pintar();
            avisar(n ? n + ' foto(s) repetida(s), marcadas en rojo. "🗑 Quitar repetidas" las quita (y Guardar las borra).' : 'No hay fotos repetidas en este plato.', n ? '#b45309' : '#15803d');
        }
        // Visor a pantalla completa: todas las fotos del plato (activas y desactivadas).
        function verFotos(ix) {
            var v = document.createElement('div'); v.id = 'sf-ver'; document.body.appendChild(v);
            var conf = false;
            var lista = function () { return activas.concat(desact); };
            var cerrarV = function () { document.removeEventListener('keydown', tecla, true); v.remove(); };
            var mover = function (d) { var l = lista(); if (!l.length) return cerrarV(); ix = (ix + d + l.length) % l.length; pintarV(); };
            var borrar = function () {
                var x = lista()[ix]; if (!x) return;
                var l = activas.indexOf(x) >= 0 ? activas : desact; l.splice(l.indexOf(x), 1);
                conf = false; pintar();
                if (!lista().length) return cerrarV();
                if (ix >= lista().length) ix = lista().length - 1;
                pintarV(); avisar('Foto eliminada. Pulsa Guardar para borrarla de GitHub.', '#15803d');
            };
            function pintarV() {
                var l = lista(), x = l[ix];
                if (!x) return cerrarV();
                v.innerHTML = '<div class="v-cab"><b>' + esc(etiquetaFoto(x)) + '</b><small>' + (ix + 1) + ' / ' + l.length + (x.rep ? ' · ⚠ repetida de ' + esc(x.rep) : '') + (x.info ? ' · ' + esc(x.info) : '') + '</small>' +
                    '<small>← → pasar · Supr eliminar · Esc cerrar</small><button type="button" class="v-del">🗑 Eliminar</button><button type="button" class="v-x">✕ Cerrar</button></div>' +
                    '<div class="v-zona">' + (x.url ? '<img src="' + x.url + '" alt="">' : '<span>Cargando…</span>') +
                    (l.length > 1 ? '<div class="v-izq">‹</div><div class="v-der">›</div>' : '') +
                    (conf ? '<div class="v-conf"><div><b>¿Eliminar esta foto?</b><span><button type="button" class="si">Sí (Intro)</button> <button type="button" class="no">No (Esc)</button></span></div></div>' : '') + '</div>';
                v.querySelector('.v-x').onclick = cerrarV;
                v.querySelector('.v-del').onclick = function () { conf = true; pintarV(); };
                var iz = v.querySelector('.v-izq'), de = v.querySelector('.v-der');
                if (iz) iz.onclick = function () { mover(-1); }; if (de) de.onclick = function () { mover(1); };
                if (conf) { v.querySelector('.v-conf .si').onclick = borrar; v.querySelector('.v-conf .no').onclick = function () { conf = false; pintarV(); }; }
            }
            function tecla(e) {
                var k = e.key, hecho = true;
                if (conf) { if (k === 'Enter') borrar(); else if (k === 'Escape') { conf = false; pintarV(); } else hecho = false; }
                else if (k === 'ArrowLeft') mover(-1);
                else if (k === 'ArrowRight' || k === ' ') mover(1);
                else if (k === 'Delete' || k === 'Supr') { conf = true; pintarV(); }
                else if (k === 'Escape') cerrarV();
                else hecho = false;
                if (hecho) { e.preventDefault(); e.stopPropagation(); }
            }
            document.addEventListener('keydown', tecla, true);
            pintarV();
        }
        async function añadir(files, gal) {
            for (var k = 0; k < files.length; k++) {
                avisar('Preparando ' + files[k].name + '…', '#555');
                try {
                    var hashOrig = await huellaArchivo(files[k]), igual = await yaEnPlato(files[k], hashOrig);
                    if (igual) {
                        var seguir = window.confirmarEditor
                            ? await window.confirmarEditor('Esta foto ya está en el plato: ' + igual + '. ¿Añadirla igualmente?', { si: 'Añadir igualmente', no: 'No' })
                            : confirm('Esta foto ya está en el plato: ' + igual + '. ¿Añadirla igualmente?');
                        if (!seguir) { avisar('No se ha añadido (ya estaba: ' + igual + ').', '#b45309'); continue; }
                    }
                    var r = await recortar(files[k], files[k].name + ' (' + kb(files[k].size) + ')');
                    if (!r) { avisar(''); continue; }
                    var u = URL.createObjectURL(r.blob); urls.push(u);
                    var nueva = { blob: r.blob, fuente: files[k], url: u, info: r.info, gal: gal || null, recorte: r.datos, hashOrig: hashOrig };
                    if (activas.length < MAX_FOTOS) activas.push(nueva); else desact.push(nueva);
                    pintar();
                    if (desact.indexOf(nueva) >= 0) avisar('Ya hay ' + MAX_FOTOS + ' activas: la nueva queda de repuesto (Desactivadas). Actívala cuando quieras.', '#b45309');
                } catch (e) { avisar(e.message || String(e)); return; }
            }
        }

        async function guardar() {
            var btn = caja.querySelector('.sf-ok'), msg = caja.querySelector('#sf-msg');
            base = slug(caja.querySelector('#sf-base').value) || base;
            guardando = true; btn.disabled = true; msg.style.color = '#555'; msg.textContent = 'Guardando…';
            try {
                for (var k = 0; k < activas.concat(desact).length; k++) {
                    var x = activas.concat(desact)[k];
                    if (x.blob && !x.sha) { msg.textContent = 'Subiendo foto nueva…'; x.sha = await subirBlob(x.blob); }
                }
                var finales = {};
                activas.forEach(function (x, i) { finales[dirAct + base + '0' + (i + 1) + '.webp'] = x.sha; });
                desact.forEach(function (x, i) { finales[dirDes + base + num2(i + 1) + '.webp'] = x.sha; });
                var cambios = [];
                originales.forEach(function (o) { if (!(o.path in finales)) cambios.push({ path: o.path, sha: null }); });
                Object.keys(finales).forEach(function (path) {
                    var o = originales.find(function (q) { return q.path === path; });
                    if (!o || o.sha !== finales[path]) cambios.push({ path: path, sha: finales[path] });
                });
                if (cambios.length) { msg.textContent = 'Guardando en GitHub…'; await commit(cambios, 'Fotos ' + base + ' (plato ' + p.id + ')'); }
                var np0 = nombrePlato();
                activas.concat(desact).forEach(function (x) { if (x.blob && x.hashOrig && !x.gal) { descPend.asignadas[x.hashOrig] = p.id + ' ' + np0; programarDescartes(); } });
                var conGal = activas.concat(desact).filter(function (x) { return x.gal; });
                if (conGal.length) {
                    var g = leerGaleria(), np = nombrePlato();
                    g.forEach(function (it) {
                        if (!conGal.some(function (x) { return x.gal === claveFoto(it.u); })) return;
                        it.usada = np;
                        if (it.hash) { descPend.asignadas[it.hash] = p.id + ' ' + np; programarDescartes(); }
                    });
                    guardarGaleria(g);
                }
                var nuevoCampo = activas.length ? base + '01.webp' : '';
                var cambiaCampo = campo && campo.value !== nuevoCampo;
                if (campo) campo.value = nuevoCampo;
                msg.style.color = '#15803d';
                msg.textContent = '✔ ' + (cambios.length ? 'Fotos guardadas.' : 'Sin cambios en las fotos.') +
                    (cambiaCampo ? ' "Nombre Imagen" ahora es "' + (nuevoCampo || 'vacío') + '": pulsa Aplicar Cambios y Guardar cambios en web.' : '') +
                    (cambios.length ? ' En la web, en 1-2 min.' : '');
                caja.querySelector('.sf-bot').innerHTML = '<button class="sf-ok">Cerrar</button>';
                caja.querySelector('.sf-ok').onclick = cerrar;
            } catch (e) {
                msg.style.color = '#b42318'; msg.textContent = 'No se pudo guardar: ' + (e.message || e);
                btn.disabled = false;
            }
            guardando = false;
        }
        pintar();
        alRecibir = function () { if (!guardando && !document.getElementById('sf-rec')) pintar(); };
        if (op) añadirUrl(op.url, op.gal);
    }

    // Al eliminar un plato (editor-web.js, tras guardar): sus fotos se borran (borrar = true) o
    // pasan a desactivadas/ detrás de las que ya hubiera. Un commit. Devuelve cuántas fotos.
    async function retirar(p, borrar) {
        var carpeta = String((p && p.carpeta) || '').trim();
        var mm = String((p && p.imagen) || '').match(/^(.*)0\d\.webp$/i);
        if (!carpeta || !mm) return 0;
        var base = mm[1];
        var dirAct = dirWeb + 'imagenes/' + carpeta + '/', dirDes = dirAct + DESACT + '/';
        var patron = new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '0(\\d)\\.webp$', 'i');
        var coger = function (lista) {
            var r = [];
            lista.forEach(function (f) { var m = f.name.match(patron); if (m) r.push({ n: +m[1], path: f.path, sha: f.sha }); });
            return r.sort(function (x, y) { return x.n - y.n; });
        };
        var activas = coger(await listar(dirAct.slice(0, -1))), patD = patronDes(base), desact = [];
        (await listar(dirDes.slice(0, -1))).forEach(function (f) { var m = f.name.match(patD); if (m) desact.push({ n: +m[1], path: f.path, sha: f.sha }); });
        desact.sort(function (x, y) { return x.n - y.n; });
        if (!activas.length && !(borrar && desact.length)) return 0;
        var originales = activas.concat(desact), finales = {};
        if (!borrar) desact.concat(activas).forEach(function (x, i) { finales[dirDes + base + num2(i + 1) + '.webp'] = x.sha; });
        var cambios = [];
        originales.forEach(function (o) { if (!(o.path in finales)) cambios.push({ path: o.path, sha: null }); });
        Object.keys(finales).forEach(function (path) {
            var o = originales.find(function (q) { return q.path === path; });
            if (!o || o.sha !== finales[path]) cambios.push({ path: path, sha: finales[path] });
        });
        if (cambios.length) await commit(cambios, (borrar ? 'Borrar fotos ' : 'Desactivar fotos ') + base + ' (plato ' + p.id + ' eliminado)');
        return borrar ? originales.length : activas.length;
    }
    // Para marca.js (logos y QR de la plantilla neutra): elegir imagen -> recortar -> WebP ->
    // subir a <web>/<rutaWeb> en un commit. Devuelve la ruta (relativa a la web) o null si se cancela.
    function ponerEstilos() {
        if (document.getElementById('sf-estilos')) return;
        var st = document.createElement('style'); st.id = 'sf-estilos'; st.textContent = CSS; document.head.appendChild(st);
    }
    async function subirImagen(file, rutaWeb, titulo, op) {
        ponerEstilos();
        var r = await recortar(file, titulo, Object.assign({ libre: true }, op || {}));
        if (!r) return null;
        var sha = await subirBlob(r.blob);
        await commit([{ path: dirWeb + rutaWeb, sha: sha }], 'Subir ' + rutaWeb);
        return rutaWeb;
    }
    // ---------- 🖼️ Fotos de internet (botón de la cabecera): todas las fotos traídas, para asignarlas a platos ----------
    function listaPlatos() {
        var l = (typeof datosLocales !== 'undefined' && Array.isArray(datosLocales)) ? datosLocales : (window.datosLocales || []);   // eslint-disable-line no-undef
        return l.filter(function (x) { return x && +x.id >= 1000 && String(x.es || '').trim(); })
            .map(function (x) { return { id: x.id, n: String(x.es).split(/\n|\|/)[0].trim() }; })
            .sort(function (a, b) { return a.id - b.id; });
    }
    // Pone una foto (blob WebP ya reducido) en varios platos: detrás de las fotos que ya tengan, en UN commit.
    // Si un plato no tenía "Nombre Imagen", se le pone <base>01.webp (queda pendiente "GUARDAR CAMBIOS EN WEB").
    async function asignarVarios(blob, ids) {
        var r = await asignarLote([{ blob: blob, ids: ids }]);
        return { res: r.res[0], cambiaCampo: r.cambiaCampo };
    }
    // Varias fotos [{ blob, ids }] en UN commit, en ese orden: llenan los huecos de activas (máx. 4) y el resto va de repuesto.
    // res[i] = resultados de la foto i (uno por plato).
    async function asignarLote(lote, alSubir) {
        var lista = (typeof datosLocales !== 'undefined' && Array.isArray(datosLocales)) ? datosLocales : (window.datosLocales || []);   // eslint-disable-line no-undef
        var cambios = [], todos = [], cacheDir = {}, planeadas = {}, cambiaCampo = false;
        for (var li = 0; li < lote.length; li++) {
        if (alSubir) alSubir(li + 1, lote.length);
        var sha = await subirBlob(lote[li].blob), ids = lote[li].ids, res = [];
        todos.push(res);
        for (var k = 0; k < ids.length; k++) {
            var p = lista.find(function (x) { return String(x.id) === String(ids[k]); });
            if (!p) continue;
            var nombre = String(p.es || '').split(/\n|\||\/\//)[0].trim() || ('plato ' + p.id);
            var carpeta = String(p.carpeta || '').trim();
            if (!carpeta) { res.push({ p: p, n: nombre, err: 'no tiene carpeta de fotos' }); continue; }
            var mm = String(p.imagen || '').match(/^(.*)0\d\.webp$/i);
            var base = mm ? mm[1] : (slug(nombre) || ('plato_' + p.id));
            var dir = dirWeb + 'imagenes/' + carpeta;
            if (!cacheDir[dir]) cacheDir[dir] = await listar(dir);
            var patron = new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '0(\\d)\\.webp$', 'i'), usados = {};
            cacheDir[dir].forEach(function (f) { var m = f.name.match(patron); if (m) usados[+m[1]] = 1; });
            (planeadas[dir + '/' + base] || []).forEach(function (n) { usados[n] = 1; });
            var n = 1; while (usados[n]) n++;
            if (n > MAX_FOTOS) {
                // 4 activas: de repuesto, detrás de las desactivadas que tenga (sin límite)
                var dirD = dir + '/' + DESACT;
                if (!cacheDir[dirD]) cacheDir[dirD] = await listar(dirD);
                var pd = patronDes(base), usD = {};
                cacheDir[dirD].forEach(function (f) { var m = f.name.match(pd); if (m) usD[+m[1]] = 1; });
                (planeadas[dirD + '/' + base] || []).forEach(function (q) { usD[q] = 1; });
                var nd = 1; while (usD[nd]) nd++;
                (planeadas[dirD + '/' + base] = planeadas[dirD + '/' + base] || []).push(nd);
                cambios.push({ path: dirD + '/' + base + num2(nd) + '.webp', sha: sha });
                res.push({ p: p, n: nombre, num: nd, repuesto: true });
                continue;
            }
            (planeadas[dir + '/' + base] = planeadas[dir + '/' + base] || []).push(n);
            cambios.push({ path: dir + '/' + base + '0' + n + '.webp', sha: sha });
            if (!mm) {
                p.imagen = base + '01.webp'; cambiaCampo = true;
                if (String(window.platoEditandoId || (typeof platoEditandoId !== 'undefined' ? platoEditandoId : '')) === String(p.id)) {   // eslint-disable-line no-undef
                    var ci = document.getElementById('edit-imagen'); if (ci) ci.value = p.imagen;
                }
            }
            res.push({ p: p, n: nombre, num: n });
        }
        }
        var idsOk = {};
        todos.forEach(function (rs) { rs.forEach(function (r) { if (!r.err) idsOk[r.p.id] = 1; }); });
        if (cambios.length) await commit(cambios, 'Fotos de internet -> ' + (lote.length > 1 ? lote.length + ' fotos a ' : '') + 'platos ' + Object.keys(idsOk).join(', '));
        if (cambiaCampo) { window.hayCambiosSinGuardar = true; try { if (typeof renderizar === 'function') renderizar(); } catch (e) { } }   // eslint-disable-line no-undef
        return { res: todos, cambiaCampo: cambiaCampo };
    }
    async function abrirCon(id, u, gal) {
        if (typeof window.abrirEditor !== 'function') { alert('Este editor no puede abrir el plato desde aquí: ábrelo a mano y usa 📷 Fotos del plato.'); return; }
        window.abrirEditor(id);
        for (var i = 0; i < 60; i++) {
            var p = platoActual();
            if (p && String(p.id) === String(id) && document.getElementById('edit-imagen')) break;
            await new Promise(function (r) { setTimeout(r, 100); });
        }
        gestor({ url: u, gal: gal });
    }
    var CLAVE_L = 'sf-enlaces-' + (S.restaurante || S.modo || '');
    function leerEnlaces() { try { return JSON.parse(localStorage.getItem(CLAVE_L) || '{}') || {}; } catch (e) { return {}; } }
    function guardarEnlace(k, v) { var o = leerEnlaces(); if (v) o[k] = v; else delete o[k]; try { localStorage.setItem(CLAVE_L, JSON.stringify(o)); } catch (e) { } }
    // Direcciones a probar para la foto a su tamaño ORIGINAL (máxima calidad).
    function urlsMaxima(u) {
        var id = idGoogle(u), c = [];
        if (id) c.push('https://lh3.googleusercontent.com/' + id + '=s0', 'https://lh3.googleusercontent.com/' + id + '=s4000', 'https://lh3.googleusercontent.com/' + id + '=s2000');
        else if (/tripadvisor\.com\/media\/photo-[a-z]\//.test(u)) c.push(u.replace(/\?.*$/, '').replace(/\/photo-[a-z]\//, '/photo-o/'), u.replace(/\?.*$/, '').replace(/\/photo-[a-z]\//, '/photo-w/'), u);
        else c.push(u);
        return c.filter(function (x, i) { return c.indexOf(x) === i; });
    }
    async function bajarMaxima(u) {
        var l = urlsMaxima(u);
        for (var i = 0; i < l.length; i++) {
            try { var r = await fetch(l[i], { mode: 'cors', referrerPolicy: 'no-referrer' }); if (!r.ok) continue; var b = await r.blob(); if (/^image\//.test(b.type)) return b; } catch (e) { }
        }
        return null;
    }
    function nombreArchivo(x, n, tipo) {
        var t = String(x.usada || x.t || 'foto').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 _.-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'foto';
        var ext = (String(tipo || '').split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace(/[^a-z0-9]/g, '');
        return ('00' + n).slice(-3) + ' - ' + t + (/tripadvisor/.test(x.u) ? ' (tripadvisor)' : '') + '.' + ext;
    }
    // Guarda todas las fotos de la lista, sueltas: en una carpeta elegida (Chrome/Opera) o, si no, una a una en Descargas.
    // ---------- medidas reales (original) y mínimo de resolución ----------
    var CLAVE_MIN = 'sf-minlado';
    function minLado() { try { var v = parseInt(localStorage.getItem(CLAVE_MIN), 10); return isNaN(v) ? 800 : v; } catch (e) { return 800; } }
    function esPequena(x) { return !!(x && x.w && Math.max(x.w, x.h) < minLado()); }
    async function medir(b) {
        var r = { kb: Math.round(b.size / 1024), tipo: (String(b.type).split('/')[1] || '').toUpperCase().replace('JPEG', 'JPG') };
        try { var bm = await createImageBitmap(b); r.w = bm.width; r.h = bm.height; if (bm.close) bm.close(); } catch (e) { }
        // Huella del contenido (SHA-256 de la original): misma foto aunque venga de otra dirección = repetida.
        try { var dg = await crypto.subtle.digest('SHA-256', await b.arrayBuffer()); r.hash = Array.prototype.map.call(new Uint8Array(dg).slice(0, 16), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); } catch (e) { }
        return r;
    }
    function guardarInfo(k, info) {
        var g = leerGaleria(), ix = indiceDe(g, k);
        if (ix < 0) return null;
        Object.keys(info).forEach(function (c) { g[ix][c] = info[c]; });
        guardarGaleria(g);
        return g[ix];
    }
    function infoTxt(x) {
        var f = esLocal(x.u) ? '📂 PC' : /tripadvisor/.test(x.u) ? 'TripAdvisor' : 'Google';
        if (esLocal(x.u) && !x.w && !archivosLocales[String(x.u).slice(6)]) return '📂 ' + String(x.u).slice(6) + ' · abre la carpeta para verla';
        if (x.err) return '⚠ no se deja descargar · ' + f;
        if (!x.w) return 'midiendo… · ' + f;
        return x.w + '×' + x.h + ' px · ' + (x.kb > 1024 ? (x.kb / 1024).toFixed(1) + ' MB' : x.kb + ' KB') + (x.tipo ? ' · ' + x.tipo : '') + ' · ' + f;
    }
    var colaInfo = [], enCurso = 0, pedidas = {};
    function pedirInfo(k, alListo) {
        if (pedidas[k]) return;
        pedidas[k] = 1; colaInfo.push({ k: k, f: alListo }); siguienteInfo();
    }
    async function siguienteInfo() {
        if (enCurso >= 3 || !colaInfo.length) return;
        var t = colaInfo.shift(); enCurso++;
        try {
            var g = leerGaleria(), x = g[indiceDe(g, t.k)];
            if (x && esLocal(x.u) && !archivosLocales[String(x.u).slice(6)]) delete pedidas[t.k];   // se medirá al abrir la carpeta
            else if (x) {
                var b = esLocal(x.u) ? await archivoLocal(x.u) : await bajarMaxima(x.u);
                var nx = guardarInfo(t.k, b ? await medir(b) : { err: 1 });
                if (nx && hashDescartado(nx.hash)) {   // la misma foto ya se quitó (con otra dirección): fuera y recordar también esta
                    var gq = leerGaleria(), iq = indiceDe(gq, t.k); if (iq >= 0) { gq.splice(iq, 1); guardarGaleria(gq); }
                    descartar(t.k, nx.hash); nx._descartada = true; contarBoton();
                }
                if (nx && t.f) t.f(nx);
            }
        } catch (e) { }
        enCurso--; siguienteInfo();
    }
    async function guardarTodas(lista, avisar, boton) {
        lista = lista.filter(function (x) { return !esLocal(x.u); });   // las de la carpeta del PC ya están en el PC
        var dupI = repetidas(lista), huellas = {};
        lista = lista.filter(function (x) { return !esPequena(x) && !dupI[claveFoto(x.u)]; });
        if (!lista.length) { avisar('No hay fotos en la lista.'); return; }
        var carpeta = null, nomRest = String((window.MARCA && window.MARCA.nombre) || S.titulo || S.restaurante || 'Restaurante').replace(/\s+(menu|carta)$/i, '')
            .replace(/[<>:"\/\\|?*]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Restaurante';
        if (window.showDirectoryPicker) {
            try { carpeta = await window.showDirectoryPicker({ id: 'fotos-internet', mode: 'readwrite' }); }
            catch (e) { if (e && e.name === 'AbortError') return; carpeta = null; }
            if (carpeta) { try { carpeta = await carpeta.getDirectoryHandle(nomRest, { create: true }); } catch (e) { avisar('No se pudo crear la carpeta "' + nomRest + '": ' + (e.message || e)); return; } }
        }
        var parar = false, hechas = 0, fallos = 0, peq = 0, sig = 0, texto0 = boton.textContent;
        boton.textContent = '■ Parar'; boton.onclick = function () { parar = true; };
        async function trabajador() {
            while (!parar && sig < lista.length) {
                var n = sig++, x = lista[n];
                var b = await bajarMaxima(x.u);
                if (!b) { fallos++; guardarInfo(claveFoto(x.u), { err: 1 }); }
                else if (esPequena(x = guardarInfo(claveFoto(x.u), await medir(b)) || x)) { peq++; }
                else if (x.w && huellas[x.w + 'x' + x.h + '-' + x.kb]) { peq++; }
                else {
                    if (x.w) huellas[x.w + 'x' + x.h + '-' + x.kb] = 1;
                    var nom = nombreArchivo(x, n + 1, b.type);
                    try {
                        if (carpeta) { var fh = await carpeta.getFileHandle(nom, { create: true }); var w = await fh.createWritable(); await w.write(b); await w.close(); }
                        else {
                            var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nomRest + ' - ' + nom;
                            document.body.appendChild(a); a.click(); a.remove();
                            (function (h) { setTimeout(function () { URL.revokeObjectURL(h); }, 30000); })(a.href);
                            await new Promise(function (r) { setTimeout(r, 350); });
                        }
                        hechas++;
                    } catch (e) { fallos++; }
                }
                avisar('💾 ' + (hechas + fallos + peq) + ' / ' + lista.length + ' · guardadas ' + hechas + (peq ? ' · pequeñas o repetidas (no se guardan) ' + peq : '') + (fallos ? ' · fallidas ' + fallos : ''), '#555');
            }
        }
        await Promise.all(carpeta ? [trabajador(), trabajador(), trabajador(), trabajador()] : [trabajador()]);
        boton.textContent = texto0; boton.onclick = null;
        avisar((parar ? 'Parado. ' : '✔ ') + hechas + ' fotos guardadas a máxima calidad' + (carpeta ? ' en la carpeta "' + nomRest + '"' : ' en Descargas') +
            (peq ? '. ' + peq + ' descartadas por pequeñas (menos de ' + minLado() + ' px) o repetidas' : '') + (fallos ? '. ' + fallos + ' no se pudieron descargar (esa web no lo permite o ya no existen).' : '.'), fallos && !hechas ? '#b42318' : '#15803d');
        return true;
    }
    // ---------- extensión "Escáner de fotos": estado e instalación guiada ----------
    function extInstalada() { return document.documentElement.dataset.escanerFotos === '1'; }
    function extVersion() { return document.documentElement.dataset.escanerFotosVersion || ''; }   // la pone puente-editor.js (desde 1.1.1)
    function verMenor(a, b) {
        var x = String(a || '0').split('.').map(Number), y = String(b || '0').split('.').map(Number);
        for (var i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0); }
        return false;
    }
    function extAntigua() { return !!(S.extension && extInstalada() && verMenor(extVersion() || '1.1.0', S.extension)); }
    function navegador() {
        var ua = navigator.userAgent;
        if (/OPR\/|Opera/.test(ua)) return { id: 'opera', nombre: 'Opera', url: 'opera://extensions', dev: 'Modo de desarrollador (arriba a la derecha)', cargar: 'Cargar extensión desempaquetada', recargar: 'el botón de recargar ↻ de la extensión' };
        if (/Edg\//.test(ua)) return { id: 'edge', nombre: 'Edge', url: 'edge://extensions', dev: 'Modo de desarrollador (abajo a la izquierda)', cargar: 'Cargar desempaquetada', recargar: 'el botón Recargar de la extensión' };
        return { id: 'chrome', nombre: 'Chrome', url: 'chrome://extensions', dev: 'Modo de desarrollador (arriba a la derecha)', cargar: 'Cargar descomprimida', recargar: 'el botón de recargar ↻ de la extensión' };
    }
    function instalarExtension() {
        ponerEstilos();
        if (document.getElementById('sfg-inst')) return;
        var nv = navegador(), hay = !!S.extension, inst = extInstalada(), vieja = extAntigua();
        var estado = !inst ? '<span style="color:#b42318">✖ No está instalada en este navegador.</span>'
            : vieja ? '<span style="color:#b45309">⚠ Instalada, pero es una versión antigua (' + esc(extVersion() || 'anterior a 1.1.1') + '). Hay una nueva: ' + esc(S.extension) + '. Mira "Actualizar" abajo.</span>'
                : '<span style="color:#15803d">✔ Instalada' + (extVersion() ? ' (versión ' + esc(extVersion()) + ')' : '') + '. No hace falta hacer nada más.</span>';
        var paso = function (n, titulo, cuerpo) { return '<li><div class="sfg-in-n">' + n + '</div><div><b>' + titulo + '</b><div>' + cuerpo + '</div></div></li>'; };
        var copiar = '<button type="button" class="sfg-b sfg-in-copiar">📋 Copiar ' + esc(nv.url) + '</button>';
        var pop = document.createElement('div');
        pop.id = 'sfg-inst';
        pop.innerHTML = '<div class="sfg-in-caja">' +
            '<h3 style="margin:0">🧩 Extensión "Escáner de fotos" para ' + esc(nv.nombre) + '</h3>' +
            '<p style="margin:4px 0 0;color:#555">Recoge las fotos de Google Maps y TripAdvisor y las pasa a 🖼️ Fotos de internet. Se instala <b>una vez en cada ordenador</b> (en el móvil no se puede). Unos 2 minutos.</p>' +
            '<p class="sfg-in-estado">' + estado + '</p>' +
            '<ol class="sfg-in-pasos">' +
            paso(1, 'Descarga la extensión', hay
                ? '<a class="sfg-b" href="escaner-fotos.zip?v=' + encodeURIComponent(S.extension) + '" download="escaner-fotos.zip">⬇ Descargar escaner-fotos.zip (versión ' + esc(S.extension) + ')</a>'
                : '<span style="color:#b42318">Esta web aún no tiene el archivo: hay que volver a CONSTRUIR y publicar.</span>') +
            paso(2, 'Descomprímela en una carpeta fija', 'En <b>Descargas</b>, clic derecho en <code>escaner-fotos.zip</code> → <b>Extraer todo…</b> → elige una carpeta que no vayas a borrar, por ejemplo <b>Documentos</b> → <b>Extraer</b>. Queda una carpeta <code>extension-fotos</code>.<br><small>⚠ No la borres ni la muevas después: ' + esc(nv.nombre) + ' la usa desde ahí.</small>') +
            paso(3, 'Abre la página de extensiones', copiar + ' y pégalo en una pestaña nueva: <b>Ctrl+T</b>, <b>Ctrl+V</b> y <b>Enter</b>.<br><small>(Una web no puede abrir esa página por ti: hay que pegar la dirección.)</small>') +
            paso(4, 'Activa el ' + esc(nv.dev), 'Es un interruptor. Al activarlo salen unos botones nuevos.') +
            paso(5, 'Pulsa "' + esc(nv.cargar) + '"', 'Elige la carpeta <code>extension-fotos</code> del paso 2 (la que tiene dentro <code>manifest.json</code>) → <b>Seleccionar carpeta</b>. Aparece "Cartas · Escáner de fotos".') +
            paso(6, 'Vuelve aquí y recarga (F5)', 'En 🖼️ Fotos de internet saldrá <b>"extensión instalada ✔"</b>. Si ' + esc(nv.nombre) + ' avisa al abrirse de "extensiones en modo desarrollador", es normal: pulsa cerrar / mantener.') +
            (nv.id === 'opera'
                ? paso(7, 'En Opera: marca "Permitir el acceso a los resultados de la página de búsqueda"', 'Debajo de la extensión salen dos casillas (como en la imagen):' +
                    '<ul style="margin:4px 0;padding-left:18px"><li><b>Permitir el acceso a los resultados de la página de búsqueda</b>: <b>márcala</b>. Opera trata Google Maps como página de búsqueda y, sin ella, la extensión no funciona ahí (no sale el panel negro). Después recarga Maps (F5).</li>' +
                    '<li><b>Permitir en ventanas privadas</b>: no hace falta.</li></ul>' +
                    '<img src="extension-doc/opera-extension-opciones.png" alt="Opciones de la extensión en Opera" style="max-width:100%;border:1px solid #e3e0d8;border-radius:8px" onerror="this.remove()">')
                : '') +
            '</ol>' +
            '<p class="sfg-in-estado" style="font-size:.85rem">ℹ️ Es la <b>misma extensión</b> para Chrome, Opera y Edge, pero <b>se instala en cada navegador</b> (la misma carpeta vale para todos) y <b>cada navegador guarda sus fotos</b>: lo que escaneas en uno llega al editor abierto en ese mismo navegador. Escanea y asigna en el mismo.</p>' +
            '<details class="sfg-pasos"' + (vieja ? ' open' : '') + '><summary><b>Actualizar</b> (cuando aquí avise de una versión nueva)</summary><ol>' +
            '<li>Descarga el .zip nuevo (paso 1) y extráelo <b>en la misma carpeta de antes</b>, aceptando <b>reemplazar</b> los archivos.</li>' +
            '<li>En <code>' + esc(nv.url) + '</code> pulsa ' + esc(nv.recargar) + ' "Cartas · Escáner de fotos" (si la tienes en varios navegadores, en cada uno).</li>' +
            '<li>Recarga esta página (F5).</li></ol></details>' +
            '<p id="sfg-in-msg" style="min-height:1.2em;margin:6px 0 0"></p>' +
            '<div class="sf-bot"><button type="button" class="sf-no">Cerrar</button></div></div>';
        document.body.appendChild(pop);
        var msg = pop.querySelector('#sfg-in-msg');
        pop.querySelector('.sfg-in-copiar').onclick = function () {
            var ok = function () { msg.style.color = '#15803d'; msg.textContent = '✔ Copiado: ' + nv.url + ' — ahora Ctrl+T, Ctrl+V y Enter.'; };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(nv.url).then(ok, function () { msg.style.color = '#b42318'; msg.textContent = 'No se pudo copiar: escribe ' + nv.url + ' en una pestaña nueva.'; });
            else { msg.textContent = 'Escribe ' + nv.url + ' en una pestaña nueva.'; }
        };
        var fin = function () { document.removeEventListener('keydown', esc3); pop.remove(); };
        var esc3 = function (e) { if (e.key === 'Escape') fin(); };
        document.addEventListener('keydown', esc3);
        pop.querySelector('.sf-no').onclick = fin;
        pop.onclick = function (e) { if (e.target === pop) fin(); };
    }
    function contarBoton() {
        var b = document.getElementById('sfg-btn');
        if (!b) return;
        var n = leerGaleria().filter(function (x) { return !x.usada; }).length;
        b.textContent = '🖼️ Fotos de internet' + (n ? ' (' + n + ')' : '') + (Object.keys(pendientes).length ? ' · ⚠ nuevas' : '');
    }
    function fotosInternet() {
        ponerEstilos();
        if (document.getElementById('sf-fondo')) return;
        var fondo = document.createElement('div');
        fondo.id = 'sf-fondo';
        fondo.style.padding = '0';
        fondo.innerHTML = '<div id="sf-caja" style="max-width:none;width:100vw;height:100vh;max-height:100vh;border-radius:0;box-sizing:border-box"></div>';
        document.body.appendChild(fondo);
        var caja = fondo.querySelector('#sf-caja'), verUsadas = false, filtro = '', verPeq = false, obs = null, seccion = '';   // seccion: '' todas · '__sin' sin asignar · nombre de categoría (de los platos asignados)
        var elegidos = {}, editadas = {}, hayCarpeta = null;
        var modoSel = null, verGrupo = null, toastReloj = null;   // modoSel: { ids: platos destino (puede estar vacío), orden: claves elegidas en orden } · verGrupo: nombre del grupo abierto
        idbGet(CLAVE_CARPETA).then(function (h) { if (h && !carpetaLocal) { hayCarpeta = h; pintarG(); } });   // por clave de foto: ids de plato elegidos · recorte hecho aquí { blob, url, fuente, info }
        var conExt = extInstalada();
        var q = busquedaLocal(), l = enlacesExternos(q, ''), en = leerEnlaces();
        var avisar = function (t, color) {
            var m = caja.querySelector('#sf-msg'); if (m) { m.style.color = color || '#b42318'; m.textContent = t; }
            var ts = fondo.querySelector('#sfg-toast');
            if (!ts) { ts = document.createElement('div'); ts.id = 'sfg-toast'; ts.onclick = function () { ts.style.display = 'none'; }; fondo.appendChild(ts); }
            ts.style.color = color || '#b42318'; ts.textContent = t; ts.style.display = t ? 'block' : 'none';
            clearTimeout(toastReloj);
            if (color !== '#555') toastReloj = setTimeout(function () { ts.style.display = 'none'; }, /✔/.test(t) ? 9000 : 15000);
        };
        var cerrar = function () { fondo.remove(); document.removeEventListener('paste', alPegar); alRecibir = null; if (obs) obs.disconnect(); colaInfo.length = 0; pedidas = {}; Object.keys(editadas).forEach(function (k) { URL.revokeObjectURL(editadas[k].url); }); contarBoton(); };
        function meter(lista, origen) {
            var n = sumarEscaneo(lista);
            pintarG();
            avisar(n ? '✔ ' + n + ' fotos nuevas' + (origen ? ' ' + origen : '') + '.' : 'No había fotos nuevas (ya estaban o no son de Google Maps / TripAdvisor).', n ? '#15803d' : '#b45309');
            contarBoton();
        }
        function deTexto(t) {
            t = String(t || '').trim();
            if (t.indexOf('FOTOS-CARTA:') === 0) { try { return JSON.parse(t.slice(12)); } catch (e) { return []; } }
            return t.split(/\s+/).filter(function (x) { return /^https:\/\//.test(x); });
        }
        function alPegar(e) {
            if (!document.body.contains(fondo)) return;
            if (e.target && e.target.id === 'sfg-url') return;
            var t = e.clipboardData && e.clipboardData.getData('text/plain');
            var lista = deTexto(t);
            if (lista.length) { e.preventDefault(); meter(lista, 'pegadas'); }
        }
        document.addEventListener('paste', alPegar);
        // Ventana grande para elegir los platos de una foto: casillas, buscador, parecidos arriba (sin marcar).
        function elegirPlatos(x, kf, platos, o) {
            o = o || {};
            return new Promise(function (resolver) {
                var cat = function (id) {
                    try { var c = window.Categorias && window.Categorias.categoriaDe && window.Categorias.categoriaDe(id); var n = c && (c.nombre || c.es || c.id); return typeof n === 'string' ? n : (n && typeof n.es === 'string' ? n.es : ''); } catch (e) { return ''; }
                };
                var tx = (x && x.t) || '';
                var lista = platos.map(function (pl) { return { id: pl.id, n: pl.n, p: tx ? parecido(pl.n, tx) : 0, c: cat(pl.id) }; });
                var sug = lista.filter(function (q) { return q.p > 0; }).sort(function (a, b) { return b.p - a.p || a.id - b.id; });
                var marcados = {}, ed = kf ? editadas[kf] : null;
                var fila = function (q, estrella, enSug) {
                    return '<label class="sfg-pf' + (enSug ? ' sug' : '') + '" data-id="' + q.id + '" data-txt="' + esc(normBusca(q.id + ' ' + q.n + ' ' + q.c)) + '"><input type="checkbox" value="' + q.id + '"> <b>' + q.id + '</b> ' + (estrella ? '★ ' : '') + esc(q.n) + '</label>';
                };
                var html = '', ultima = null;
                lista.forEach(function (q) {
                    if (q.c !== ultima) { html += '<div class="sfg-pc">' + esc(q.c || 'Sin categoría') + '</div>'; ultima = q.c; }
                    html += fila(q, q.p > 0);
                });
                var pop = document.createElement('div');
                pop.id = 'sfg-pop';
                pop.innerHTML = '<div class="sfg-pop-caja">' +
                    '<div class="sfg-pop-cab">' + (x && x.u ? '<img src="' + esc(ed ? ed.url : esLocal(x.u) ? (urlsMini[String(x.u).slice(6)] || urlsLocales[String(x.u).slice(6)] || '') : miniatura(x.u)) + '" referrerpolicy="no-referrer" alt="">' : '') + '<div><b>' + esc(o.titulo || '¿En qué platos va esta foto?') + '</b>' + (o.nombre === '' ? '' : '<br><small>' + esc(o.nombre || tx || 'sin nombre') + (ed ? ' · ✂ editada' : '') + '</small>') + '<br><small style="color:#6b6f76">' + esc(o.sub || 'Marca uno o varios. Se sube una vez (WebP 1080 px) y se pone en todos.') + '</small></div></div>' +
                    '<input type="text" class="sfg-pop-q" placeholder="Buscar por nombre, ID o categoría…">' +
                    '<div class="sfg-pop-lista">' +
                    (sug.length ? '<div class="sfg-pc">★ ' + esc(o.sugTxt || 'Parecen esta foto (por el nombre)') + '</div>' + sug.map(function (q) { return fila(q, true, true); }).join('') : '') +
                    html + '</div>' +
                    '<div class="sf-bot"><span class="sfg-pop-sel" style="margin-right:auto;align-self:center;color:#6b6f76"></span><button type="button" class="sf-no">Cancelar</button><button type="button" class="sf-ok" disabled>Asignar</button></div></div>';
                document.body.appendChild(pop);
                var q = pop.querySelector('.sfg-pop-q'), ok = pop.querySelector('.sf-ok'), sel = pop.querySelector('.sfg-pop-sel');
                var nombres = function () { return lista.filter(function (z) { return marcados[z.id]; }); };
                var actualizar = function () {
                    var n = nombres();
                    ok.disabled = !n.length;
                    ok.textContent = n.length ? (o.boton || 'Asignar a') + ' ' + n.length + ' plato' + (n.length > 1 ? 's' : '') : (o.boton0 || 'Asignar');
                    sel.textContent = n.map(function (z) { return z.id + ' ' + z.n; }).join(' · ');
                };
                pop.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
                    cb.onchange = function () {
                        marcados[cb.value] = cb.checked;
                        pop.querySelectorAll('input[type=checkbox][value="' + cb.value + '"]').forEach(function (o) { o.checked = cb.checked; o.closest('.sfg-pf').classList.toggle('on', cb.checked); });
                        actualizar();
                    };
                });
                q.oninput = function () {
                    var t = normBusca(q.value), ps = t.split(' ').filter(Boolean);
                    // Todas las palabras, en cualquier orden ("arroz vaca"). Buscando, el bloque "★ Parecen" se oculta (sus platos ya salen en su categoría): sin repetidos.
                    pop.querySelectorAll('.sfg-pf').forEach(function (f) { f.style.display = !t ? '' : (!f.classList.contains('sug') && ps.every(function (w) { return f.dataset.txt.indexOf(w) >= 0; }) ? '' : 'none'); });
                    pop.querySelectorAll('.sfg-pc').forEach(function (h) { h.style.display = t ? 'none' : ''; });
                };
                q.onkeydown = function (e) {
                    if (e.key !== 'Enter') return;
                    var vis = Array.prototype.filter.call(pop.querySelectorAll('.sfg-pf'), function (f) { return f.style.display !== 'none'; });
                    if (vis.length === 1 || (vis.length && /^\d+$/.test(q.value.trim()))) { var cb = vis[0].querySelector('input'); cb.checked = !cb.checked; cb.onchange(); q.select(); }
                };
                var fin = function (v) { document.removeEventListener('keydown', esc2); pop.remove(); resolver(v); };
                var esc2 = function (e) { if (e.key === 'Escape') fin(null); };
                document.addEventListener('keydown', esc2);
                pop.querySelector('.sf-no').onclick = function () { fin(null); };
                pop.onclick = function (e) { if (e.target === pop) fin(null); };
                ok.onclick = function () { fin(nombres().map(function (z) { return z.id; })); };
                (o.marcados || []).forEach(function (id) { var cb = pop.querySelector('input[type=checkbox][value="' + id + '"]'); if (cb) { cb.checked = true; cb.onchange(); } });
                actualizar();
                q.focus();
            });
        }
        // Ventanita para poner nombre a un grupo (con los que ya existen para elegir).
        function pedirNombre(titulo, def, existentes, nota) {
            return new Promise(function (resolver) {
                var pop = document.createElement('div');
                pop.id = 'sfg-pop';
                pop.innerHTML = '<div class="sfg-pop-caja" style="height:auto;max-width:520px"><b>' + esc(titulo) + '</b>' +
                    '<input type="text" class="sfg-pop-q" list="sfg-dl-grupos" value="' + esc(def || '') + '" placeholder="Nombre del plato o del grupo">' +
                    '<datalist id="sfg-dl-grupos">' + existentes.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
                    '<small style="color:#6b6f76">' + esc(nota || 'Si ya hay un grupo con ese nombre, se añaden a él.') + (existentes.length ? ' Grupos: ' + existentes.map(esc).join(' · ') : '') + '</small>' +
                    '<div class="sf-bot"><button type="button" class="sf-no">Cancelar</button><button type="button" class="sf-ok">Aceptar</button></div></div>';
                document.body.appendChild(pop);
                var inp = pop.querySelector('input');
                var fin = function (v) { document.removeEventListener('keydown', tecla); pop.remove(); resolver(v); };
                var aceptar = function () { var v = inp.value.trim().replace(/\s+/g, ' ').slice(0, 80); if (v) fin(v); else inp.focus(); };
                var tecla = function (e) { if (e.key === 'Escape') fin(null); };
                document.addEventListener('keydown', tecla);
                inp.onkeydown = function (e) { if (e.key === 'Enter') aceptar(); };
                pop.querySelector('.sf-no').onclick = function () { fin(null); };
                pop.querySelector('.sf-ok').onclick = aceptar;
                pop.onclick = function (e) { if (e.target === pop) fin(null); };
                inp.focus(); inp.select();
            });
        }
        var nombrePlatos = function (ids) {
            var pl = listaPlatos();
            return ids.map(function (id) { var q = pl.find(function (z) { return String(z.id) === String(id); }); return id + (q ? ' ' + q.n : ''); });
        };
        // Sube varias fotos de la lista (en ese orden) a los platos ids en UN commit y las marca como asignadas.
        async function asignarFotos(claves, ids) {
            var lote = [], fallos = [], gg = leerGaleria();
            for (var i = 0; i < claves.length; i++) {
                var k = claves[i], x = gg[indiceDe(gg, k)];
                if (!x) continue;
                avisar('Preparando foto ' + (i + 1) + ' de ' + claves.length + '…', '#555');
                try {
                    var ed = editadas[k], blob = ed && ed.blob, orig = null;
                    if (!blob) {
                        orig = await obtenerOriginal(x);
                        if (!orig) throw new Error('no se pudo descargar');
                        blob = (await aWebp(orig)).blob;
                    }
                    if (!x.hash) { var src = (ed && ed.fuente) || orig; if (src) guardarInfo(k, await medir(src)); }
                    lote.push({ k: k, blob: blob, ids: ids });
                } catch (e) { fallos.push((x.t || 'foto ' + (i + 1)) + ' (' + (e.message || e) + ')'); }
            }
            if (!lote.length) throw new Error('No se pudo preparar ninguna foto: ' + fallos.join(' · '));
            var r = await asignarLote(lote, function (n, t) { avisar('Subiendo foto ' + n + ' de ' + t + '…', '#555'); });
            var g3 = leerGaleria(), porPlato = {}, mal = {}, nOk = 0, okClaves = [];
            r.res.forEach(function (rs, i) {
                var ok = rs.filter(function (q) { return !q.err; });
                rs.filter(function (q) { return q.err; }).forEach(function (q) { mal[q.p.id + ' ' + q.n + ' (' + q.err + ')'] = 1; });
                if (!ok.length) return;
                nOk++; okClaves.push(lote[i].k);
                ok.forEach(function (q) { var c = q.p.id + ' ' + q.n, z = porPlato[c] = porPlato[c] || { a: 0, r: 0 }; if (q.repuesto) z.r++; else z.a++; });
                var i3 = indiceDe(g3, lote[i].k); if (i3 < 0) return;
                var antes = g3[i3].usada ? descRemoto.asignadas[g3[i3].hash] || g3[i3].usada : '';
                g3[i3].usada = (antes ? antes + ' + ' : '') + ok.map(function (q) { return q.p.id + ' ' + q.n; }).join(' + ');
                if (g3[i3].hash) descPend.asignadas[g3[i3].hash] = g3[i3].usada;
            });
            guardarGaleria(g3); programarDescartes();
            return { nOk: nOk, okClaves: okClaves, porPlato: porPlato, mal: Object.keys(mal), fallos: fallos, cambiaCampo: r.cambiaCampo };
        }
        function textoLote(r) {
            return (r.nOk ? '✔ ' + r.nOk + ' foto' + (r.nOk > 1 ? 's' : '') + ' puesta' + (r.nOk > 1 ? 's' : '') + ': ' + Object.keys(r.porPlato).map(function (c) {
                var z = r.porPlato[c]; return c + ' (' + [z.a ? z.a + ' activa' + (z.a > 1 ? 's' : '') : '', z.r ? z.r + ' de repuesto' : ''].filter(Boolean).join(', ') + ')';
            }).join(', ') + '. En la web en 1-2 min.' : '') +
                (r.mal.length ? ' ⚠ No: ' + r.mal.join(', ') + '.' : '') +
                (r.fallos.length ? ' ⚠ Sin descargar: ' + r.fallos.join(' · ') + '.' : '') +
                (r.cambiaCampo ? ' Algún plato no tenía foto: pulsa "GUARDAR CAMBIOS EN WEB" para que la enseñe.' : '');
        }
        // Marca en pantalla las elegidas (borde verde + número de orden) y repinta la barra.
        function marcarSel() {
            if (!modoSel) return;
            caja.querySelectorAll('.sfg-card[data-k]').forEach(function (c) {
                var i = modoSel.orden.indexOf(c.dataset.k), b = c.querySelector('.sfg-nsel');
                c.classList.toggle('sel', i >= 0); if (b) b.textContent = i >= 0 ? i + 1 : '';
            });
            caja.querySelectorAll('.sfg-grupo').forEach(function (c) {
                var m = (c.dataset.m || '').split('\n').filter(Boolean), n = m.filter(function (k) { return modoSel.orden.indexOf(k) >= 0; }).length, b = c.querySelector('.sfg-nsel');
                c.classList.toggle('sel', !!m.length && n === m.length); if (b) b.textContent = n ? n + '/' + m.length : '';
            });
            pintarBarra();
        }
        function pintarBarra() {
            var b = fondo.querySelector('#sfg-barra');
            if (!modoSel) { if (b) b.remove(); return; }
            if (!b) { b = document.createElement('div'); b.id = 'sfg-barra'; fondo.appendChild(b); }
            var n = modoSel.orden.length, ids = modoSel.ids, hay = ids.length;
            b.innerHTML = '<div class="sfg-barra-t"><b>' + n + ' foto' + (n === 1 ? '' : 's') + ' elegida' + (n === 1 ? '' : 's') + '</b>' +
                (hay ? ' → ' + esc(nombrePlatos(ids).join(' + ')) : '') + (verGrupo ? ' <small>(grupo «' + esc(verGrupo) + '»)</small>' : '') +
                '<br><small>' + (hay ? 'Pulsa las fotos en orden: las primeras llenan los huecos de activas (máx. 4 por plato) y el resto va de repuesto. Todo en un solo guardado.' : 'Pulsa las fotos para elegirlas; luego agrúpalas o asígnalas a platos.') + '</small></div>' +
                '<button type="button" data-bt="todas">Todas las visibles</button><button type="button" data-bt="ninguna"' + (n ? '' : ' disabled') + '>Ninguna</button>' +
                '<button type="button" data-bt="agrupar"' + (n ? '' : ' disabled') + '>👥 Agrupar como…</button>' +
                (hay ? '<button type="button" data-bt="platos">🍽 Cambiar platos</button><button type="button" data-bt="asignar" class="ok"' + (n ? '' : ' disabled') + '>Asignar ' + n + ' foto' + (n === 1 ? '' : 's') + '</button>'
                    : '<button type="button" data-bt="platos" class="ok"' + (n ? '' : ' disabled') + '>Asignar a platos…</button>') +
                '<button type="button" data-bt="cancelar">Cancelar</button>';
            b.querySelectorAll('[data-bt]').forEach(function (bt) { bt.onclick = function () { accionBarra(bt.dataset.bt, bt); }; });
        }
        async function accionBarra(a, bt) {
            if (a === 'cancelar') { modoSel = null; pintarG(); return; }
            if (a === 'ninguna') { modoSel.orden = []; marcarSel(); return; }
            if (a === 'todas') {
                caja.querySelectorAll('.sfg-card[data-k]').forEach(function (c) { if (modoSel.orden.indexOf(c.dataset.k) < 0) modoSel.orden.push(c.dataset.k); });
                marcarSel(); return;
            }
            if (a === 'agrupar') {
                var gr = leerGrupos(), def = verGrupo || (modoSel.ids.length ? nombrePlatos([modoSel.ids[0]])[0].replace(/^\d+\s*/, '') : '');
                var nom = await pedirNombre('👥 Agrupar ' + modoSel.orden.length + ' fotos como…', def, Object.keys(gr).sort(), 'Para juntar las fotos de un plato (aunque todavía no esté en la carta) y asignarlas luego de una vez. Si ya hay un grupo con ese nombre, se añaden a él.');
                if (!nom) return;
                var total = agrupar(nom, modoSel.orden.slice()), n0 = modoSel.orden.length;
                modoSel = null; if (verGrupo && verGrupo !== nom && !leerGrupos()[verGrupo]) verGrupo = null;
                pintarG();
                avisar('👥 ' + n0 + ' foto' + (n0 > 1 ? 's' : '') + ' en el grupo «' + nom + '» (' + total + ' en total). Se guarda en GitHub en unos segundos.', '#15803d');
                return;
            }
            if (a === 'platos') {
                var antes = modoSel.ids.length;
                var ids = await elegirPlatos(null, null, listaPlatos(), { titulo: '¿Para qué plato o platos son las fotos elegidas?', nombre: '', sub: 'Marca uno o varios (p. ej. el mismo plato en varias secciones). Cada foto se sube una vez y se pone en todos.', boton: antes ? 'Usar' : 'Asignar a', boton0: antes ? 'Usar' : 'Asignar', marcados: modoSel.ids });
                if (!ids || !ids.length) return;
                modoSel.ids = ids;
                if (antes || !modoSel.orden.length) { pintarBarra(); return; }
                a = 'asignar';
            }
            if (a === 'asignar') {
                if (!modoSel.orden.length || !modoSel.ids.length) return;
                fondo.querySelectorAll('#sfg-barra button').forEach(function (x) { x.disabled = true; });
                try {
                    var r = await asignarFotos(modoSel.orden.slice(), modoSel.ids);
                    modoSel = null; pintarG(); contarBoton();
                    avisar(textoLote(r), r.nOk ? '#15803d' : '#b42318');
                } catch (e) { avisar('No se pudo asignar: ' + (e.message || e)); pintarBarra(); }
            }
        }
        function pintarG() {
            var g = leerGaleria(), platos = listaPlatos(), usadas = g.filter(function (x) { return x.usada; }).length;
            var nPeq = g.filter(esPequena).length, dup = repetidas(g);
            var grupos = leerGrupos(), enGrupo = {};
            Object.keys(grupos).forEach(function (n) { grupos[n].forEach(function (c) { enGrupo[c] = n; }); });
            if (verGrupo && !grupos[verGrupo]) verGrupo = null;
            // Secciones (categoría de los platos a los que está asignada cada foto)
            var catDe = function (id) {
                try { var c = window.Categorias && window.Categorias.categoriaDe && window.Categorias.categoriaDe(id); var n = c && (c.nombre || c.es || c.id); return typeof n === 'string' ? n : (n && typeof n.es === 'string' ? n.es : ''); } catch (e) { return ''; }
            };
            var secsDe = function (x) { return x.usada ? String(x.usada).split(' + ').map(function (t) { return catDe(t.trim().split(' ')[0]); }).filter(Boolean) : []; };
            var cuentaSec = {};
            g.forEach(function (x) { secsDe(x).filter(function (c, i, a) { return a.indexOf(c) === i; }).forEach(function (c) { cuentaSec[c] = (cuentaSec[c] || 0) + 1; }); });
            if (seccion && seccion !== '__sin' && !cuentaSec[seccion]) seccion = '';
            var vis = g.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) {
                var kc = claveFoto(o.x.u);
                if (seccion === '__sin' && o.x.usada) return false;
                if (seccion && seccion !== '__sin') { if (secsDe(o.x).indexOf(seccion) < 0) return false; }
                else if (o.x.usada && !verUsadas) return false;
                if (verGrupo) { if (enGrupo[kc] !== verGrupo) return false; } else if (enGrupo[kc]) return false;
                if (!verPeq && esPequena(o.x)) return false;
                if (hashDescartado(o.x.hash)) return false;
                if (dup[claveFoto(o.x.u)]) return false;
                return !filtro || palabras(o.x.t).join(' ').indexOf(palabras(filtro).join(' ')) >= 0 || String(o.x.t || '').toLowerCase().indexOf(filtro.toLowerCase()) >= 0;
            });
            // Asignando por plato: arriba las que se parecen (por el nombre) a los platos elegidos
            var nomDest = modoSel && modoSel.ids.length ? nombrePlatos(modoSel.ids).join(' ') : '';
            if (nomDest) {
                vis.forEach(function (o) { o.p = o.x.t ? parecido(nomDest, o.x.t) : 0; });
                vis.sort(function (a, b) { return b.p - a.p || a.i - b.i; });
            }
            var gruposVis = verGrupo ? [] : Object.keys(grupos).sort(function (a, b) { return a.localeCompare(b, 'es'); }).map(function (n) {
                var m = grupos[n].map(function (c) { var ix = indiceDe(g, c); return ix >= 0 ? g[ix] : null; }).filter(function (x) { return x && !esDescartada(x); });
                return { n: n, m: m, total: grupos[n].length };
            }).filter(function (o) { return !filtro || o.n.toLowerCase().indexOf(filtro.toLowerCase()) >= 0; });
            var sugerido = function (t) {
                if (!t) return '';
                var mejor = null, pm = 0;
                platos.forEach(function (pl) { var v = parecido(pl.n, t); if (v > pm) { pm = v; mejor = pl; } });
                return mejor ? mejor.id + ' · ' + mejor.n : '';
            };
            var stC = caja.scrollTop;
            setTimeout(function () { caja.scrollTop = stC; }, 0);
            caja.innerHTML = '<h3>🖼️ Fotos de internet</h3>' +
                '<p class="sf-sub">Fotos de Google Maps y TripAdvisor para repartirlas entre los platos. Usa solo fotos del propio restaurante o con permiso de quien la hizo.</p>' +
                '<details class="sfg-pasos"' + (g.length && conExt ? '' : ' open') + '><summary><b>Cómo traerlas</b>' + (conExt ? (extAntigua() ? ' <small style="color:#b45309">· ⚠ hay una versión nueva de la extensión</small>' : ' <small style="color:#15803d">· extensión instalada ✔</small>') : ' <small style="color:#b42318">· falta instalar la extensión</small>') + '</summary><ol>' +
                (conExt ? '' : '<li><b>Una sola vez, en este ordenador:</b> instala la extensión <b>Escáner de fotos</b>: <button type="button" class="sfg-b sfg-inst-btn">🧩 Instalar la extensión (paso a paso)</button></li>') +
                '<li>Abre el restaurante en <a href="' + esc(l.maps) + '" target="_blank" rel="noopener">Google Maps</a> (pestañas <b>Carta</b> y <b>Fotos</b>) o en <a href="' + esc(l.trip) + '" target="_blank" rel="noopener">TripAdvisor</a> (sus fotos). Arriba a la derecha sale un panel negro con el contador: pulsa <b>Bajar solo</b> en cada sección para que carguen todas.</li>' +
                '<li>Vuelve a esta pestaña: las fotos aparecen solas aquí. En cada una elige el plato y pulsa <b>Asignar</b>: se abre el plato con la foto lista para recortar; luego <b>Guardar</b>.</li></ol>' +
                '<p style="margin:4px 0 0;font-size:.82rem;color:#6b6f76"><a href="#" class="sfg-ext-link">🧩 Instalar o actualizar la extensión</a> · Sin extensión: pega abajo el enlace de una foto (la dirección de la barra de Maps con la foto abierta en grande, o la de la imagen) y pulsa Añadir.</p></details>' +
                Object.keys(pendientes).map(function (d) {
                    return '<div class="sfg-org" data-d="' + esc(d) + '">📍 <b>' + esc(d) + '</b>: ' + pendientes[d].length + ' fotos. ¿Son de esta web (' + esc(String(S.titulo || S.restaurante || '')) + ')? ' +
                        '<button type="button" data-si="1" class="sfg-b">Sí, añadirlas</button> <button type="button" data-si="0">No, son de otra web</button></div>';
                }).join('') +
                (function () {
                    var o = leerOrigenes(), mios = Object.keys(o).filter(function (d) { return o[d] === 'si'; }), no = Object.keys(o).filter(function (d) { return o[d] === 'no'; });
                    return (mios.length || no.length) ? '<div class="sfg-orgs">' + (mios.length ? 'Restaurantes de esta web: ' + mios.map(function (d) { return '<span>' + esc(d) + ' <a href="#" data-olv="' + esc(d) + '" title="Olvidar: volverá a preguntar">✕</a></span>'; }).join(' · ') : '') +
                        (no.length ? (mios.length ? ' &nbsp;|&nbsp; ' : '') + 'Ignorados: ' + no.map(function (d) { return '<span>' + esc(d) + ' <a href="#" data-olv="' + esc(d) + '" title="Olvidar: volverá a preguntar">✕</a></span>'; }).join(' · ') : '') + '</div>' : '';
                })() +
                (extAntigua() ? '<div class="sfg-org">🧩 Hay una versión nueva de la extensión Escáner de fotos (' + esc(S.extension) + '; tienes ' + esc(extVersion() || 'una anterior') + '). <button type="button" class="sfg-b sfg-inst-btn">Actualizar (paso a paso)</button></div>' : '') +
                '<div class="sfg-buscar"><label>Buscar como <input type="text" id="sfg-q" value="' + esc(q) + '" placeholder="Nombre del restaurante y pueblo"></label>' +
                '<small>Lo que buscan los botones si no hay enlace exacto. Si no encuentran el restaurante, pon su nombre completo (p. ej. "Roland Garros Manacor") o pega al lado el enlace exacto de su ficha (lo más fiable).</small></div>' +
                '<div class="sfg-ir">' +
                '<div><a class="sfg-b sfg-gmaps" href="' + esc(en.maps || l.maps) + '" target="_blank" rel="noopener">🗺️ Abrir en Google Maps</a>' +
                '<input type="text" data-en="maps" value="' + esc(en.maps || '') + '" placeholder="Enlace del restaurante en Google Maps (opcional, se recuerda)"></div>' +
                '<div><a class="sfg-b sfg-trip" href="' + esc(en.trip || l.trip) + '" target="_blank" rel="noopener">🦉 Abrir en TripAdvisor</a>' +
                '<input type="text" data-en="trip" value="' + esc(en.trip || '') + '" placeholder="Enlace del restaurante en TripAdvisor (opcional, se recuerda)"></div></div>' +
                '<div class="sf-ext-fila" style="margin-top:10px"><input type="text" id="sfg-url" placeholder="Pega aquí enlaces de fotos (uno o varios)…"><button type="button" id="sfg-add" class="sfg-b">＋ Añadir</button>' +
                '<button type="button" id="sfg-carpeta" class="sfg-b" title="Fotos que ya tienes en el PC (p. ej. las de Guardar todas): entran en esta lista para editarlas y asignarlas">📂 Cargar fotos de una carpeta del PC</button>' +
                (hayCarpeta && !carpetaLocal ? '<button type="button" id="sfg-reabrir" class="sfg-b" style="background:#2563eb">📂 Volver a abrir la carpeta' + (hayCarpeta.name ? ' «' + esc(hayCarpeta.name) + '»' : '') + '</button>' : '') +
                (carpetaLocal ? '<small style="color:#15803d">📂 ' + esc(carpetaLocal) + ': ' + Object.keys(archivosLocales).length + ' fotos</small>' : '') + '</div>' +
                '<div class="sf-gal-cab" style="margin-top:12px"><b>' + (g.length - usadas) + ' sin asignar' + (usadas ? ' · ' + usadas + ' asignadas' : '') + '</b>' +
                (usadas ? '<label><input type="checkbox" id="sfg-usadas"' + (verUsadas ? ' checked' : '') + '> ver asignadas</label>' : '') +
                '<label title="Lado largo mínimo para que una foto sirva: las más pequeñas se ocultan y no se guardan">Mínimo <input type="number" id="sfg-min" min="0" step="100" value="' + minLado() + '" style="width:72px"> px</label>' +
                '<label><input type="checkbox" id="sfg-peq"' + (verPeq ? ' checked' : '') + '> ver pequeñas' + (nPeq ? ' (<span id="sfg-npeq">' + nPeq + '</span>)' : ' (<span id="sfg-npeq">0</span>)') + '</label>' +
                '<input type="text" id="sfg-filtro" placeholder="Buscar por nombre…" value="' + esc(filtro) + '" style="width:170px">' +
                (Object.keys(cuentaSec).length ? '<select id="sfg-sec" title="Sección: la categoría del plato al que está asignada la foto"><option value="">Todas las secciones</option><option value="__sin"' + (seccion === '__sin' ? ' selected' : '') + '>Sin asignar</option>' +
                    Object.keys(cuentaSec).sort(function (a, b) { return a.localeCompare(b, 'es'); }).map(function (c) { return '<option value="' + esc(c) + '"' + (seccion === c ? ' selected' : '') + '>' + esc(c) + ' (' + cuentaSec[c] + ')</option>'; }).join('') + '</select>' : '') +
                (g.length ? '<button type="button" id="sfg-guardar" title="Descarga todas las fotos de la lista a su tamaño original">💾 Guardar todas en el PC</button><button type="button" id="sfg-vaciar" title="Quita todas de la lista (las descartadas siguen descartadas)">Vaciar lista</button>' : '') +
                (function () { var nd = Object.keys(leerDesc()).length; return nd ? '<button type="button" id="sfg-restaurar" title="Las fotos quitadas con ✕ no vuelven a esta web. Esto deshace TODOS los descartes de esta web (en todos los navegadores).">♻ Restaurar descartadas (' + nd + ')</button>' : ''; })() + '</div>' +
                (g.length && !modoSel ? '<div class="sfg-ops"><button type="button" id="sfg-porplato" class="sfg-b" title="Eliges primero el plato (o el mismo plato en varias secciones) y luego marcas todas sus fotos">🍽 Asignar por plato</button>' +
                    '<button type="button" id="sfg-selvarias" class="sfg-b" style="background:#2563eb" title="Marcar varias fotos para juntarlas en un grupo con nombre o asignarlas de una vez">☑ Seleccionar varias</button></div>' : '') +
                (verGrupo ? '<div class="sfg-org" style="background:#eef6ff;border-color:#93c5fd;margin-top:10px">👥 Grupo <b>' + esc(verGrupo) + '</b>: ' + vis.length + ' foto' + (vis.length === 1 ? '' : 's') + (grupos[verGrupo].length > vis.length ? ' (' + (grupos[verGrupo].length - vis.length) + ' ocultas: asignadas, pequeñas o no están en este navegador)' : '') + '. ' +
                    '<button type="button" id="sfg-gvolver">← Volver a todas</button> <button type="button" id="sfg-gasig" class="sfg-b">Asignar grupo a platos…</button> <button type="button" id="sfg-gren">✎ Renombrar</button></div>' : '') +
                (vis.length || gruposVis.length ? '<div class="sfg-rejilla' + (modoSel ? ' sfg-selmodo' : '') + '">' + gruposVis.map(function (o) {
                    var x0 = o.m[0];
                    return '<div class="sfg-card sfg-grupo" data-g="' + esc(o.n) + '" data-m="' + esc(o.m.map(function (x) { return claveFoto(x.u); }).join('\n')) + '">' + (modoSel ? '<span class="sfg-nsel"></span>' : '') +
                        (x0 ? imgPrevia(x0.u, "this.style.visibility='hidden'") : '<div style="aspect-ratio:4/3;background:#e5e7eb;border-radius:7px"></div>') +
                        '<div class="sfg-t" title="' + esc(o.n) + '">👥 ' + esc(o.n) + '</div>' +
                        '<div class="sfg-i">' + o.m.length + ' foto' + (o.m.length === 1 ? '' : 's') + (o.total > o.m.length ? ' · ' + (o.total - o.m.length) + ' no están en este navegador' : '') + '</div>' +
                        (modoSel ? '<div class="sfg-hint">Pulsa para elegir todas sus fotos</div>' : '<div class="sfg-a"><button type="button" data-ga="1" class="sfg-b" style="flex:1"' + (o.m.length ? '' : ' disabled') + '>Asignar grupo a platos…</button></div>') +
                        '<div class="sfg-a2"><button type="button" data-gv="1">👁 Abrir</button><button type="button" data-gx="1" title="Deshace el grupo: sus fotos vuelven sueltas a la lista">✕ Deshacer grupo</button></div></div>';
                }).join('') + vis.map(function (o) {
                    var x = o.x, kf = claveFoto(x.u), sug = x.usada ? '' : sugerido(x.t);
                    var ed = editadas[kf];
                    return '<div class="sfg-card' + (x.usada ? ' usada' : '') + '" data-k="' + esc(kf) + '">' + (modoSel ? '<span class="sfg-nsel"></span>' : '') +
                        '<a href="' + esc(ed ? ed.url : esLocal(x.u) ? (urlsLocales[String(x.u).slice(6)] || '#') : urlsMaxima(x.u)[0]) + '" target="_blank" rel="noopener noreferrer" title="Ver en grande">' +
                        (ed ? '<img src="' + esc(ed.url) + '" alt="">' : imgPrevia(x.u, "this.closest('.sfg-card').style.display='none'")) + '</a>' +
                        '<div class="sfg-t" title="' + esc(x.t || '') + '">' + (o.p ? '★ ' : '') + (x.t ? esc(x.t) : '<i>sin nombre</i>') + '</div>' +
                        '<div class="sfg-i' + (esPequena(x) ? ' peq' : '') + '">' + esc(infoTxt(x)) + (esPequena(x) ? ' · pequeña' : '') + '</div>' +
                        (ed ? '<div class="sfg-i" style="color:#2563eb">✂ editada: ' + esc(ed.info) + '</div>' : '') +
                        (x.usada ? '<div class="sfg-u">✔ ' + esc(x.usada) + '</div>' : '') +
                        (modoSel ? '<div class="sfg-hint">Pulsa la foto para elegirla</div>' : '<div class="sfg-a"><button type="button" data-a="1" class="sfg-b" style="flex:1">Asignar a platos…</button></div>') +
                        '<div class="sfg-a2"><button type="button" data-ed="1" title="Recortar o girar antes de asignar">✂ Editar</button>' + (verGrupo ? '<button type="button" data-gs="1" title="Sacar del grupo: vuelve suelta a la lista">⤴ Sacar</button>' : '') + (x.usada ? '<button type="button" data-des="1" title="Quita la marca de asignada: vuelve a la lista para asignarla otra vez. No borra la foto de los platos.">↩ Desasignar</button>' : '') + '<button type="button" data-x="1" title="Quitar de la lista">✕ Quitar</button></div></div>';
                }).join('') + '</div>' : '<div class="sf-vacio">' + (g.length ? 'Ninguna con ese filtro.' : 'Todavía no hay fotos: sigue los pasos de arriba.') + '</div>') +
                '<p id="sf-msg"></p><div class="sf-bot"><button type="button" class="sf-no">Cerrar</button></div>' + (modoSel ? '<div style="height:110px"></div>' : '');
            caja.querySelector('.sf-no').onclick = cerrar;
            var url = caja.querySelector('#sfg-url');
            caja.querySelector('#sfg-add').onclick = function () { var lista = deTexto(url.value); if (!lista.length) { avisar('Pega primero un enlace (empieza por https://).'); return; } meter(lista, 'añadidas'); };
            url.onkeydown = function (e) { if (e.key === 'Enter') caja.querySelector('#sfg-add').click(); };
            var fl = caja.querySelector('#sfg-filtro');
            fl.oninput = function () { filtro = fl.value; var pos = fl.selectionStart; pintarG(); var n = caja.querySelector('#sfg-filtro'); n.focus(); n.setSelectionRange(pos, pos); };
            var vu = caja.querySelector('#sfg-usadas'); if (vu) vu.onchange = function () { verUsadas = vu.checked; pintarG(); };
            var sc = caja.querySelector('#sfg-sec'); if (sc) sc.onchange = function () { seccion = sc.value; pintarG(); };
            caja.querySelectorAll('.sfg-inst-btn').forEach(function (bt) { bt.onclick = function (e) { e.preventDefault(); instalarExtension(); }; });
            var ie = caja.querySelector('.sfg-ext-link'); if (ie) ie.onclick = function (e) { e.preventDefault(); instalarExtension(); };
            caja.querySelectorAll('.sfg-org[data-d] button').forEach(function (bt) {
                bt.onclick = function () {
                    var d = bt.closest('.sfg-org').dataset.d, si = bt.dataset.si === '1';
                    var n = decidirOrigen(d, si);
                    pintarG(); contarBoton();
                    avisar(si ? '✔ ' + n + ' fotos de "' + d + '" añadidas.' : 'Las fotos de "' + d + '" no saldrán en esta web.', '#15803d');
                };
            });
            caja.querySelectorAll('[data-olv]').forEach(function (a) {
                a.onclick = function (e) { e.preventDefault(); ponerOrigen(a.dataset.olv, null); pintarG(); avisar('Olvidado: la próxima vez que lleguen fotos de "' + a.dataset.olv + '" volverá a preguntar (recarga el editor).', '#15803d'); };
            });
            var qb = caja.querySelector('#sfg-q');
            qb.onchange = function () {
                q = qb.value.trim() || busquedaLocal(); l = enlacesExternos(q, '');
                try { if (qb.value.trim()) localStorage.setItem(CLAVE_Q, qb.value.trim()); else localStorage.removeItem(CLAVE_Q); } catch (e) { }
                var e2 = leerEnlaces();
                if (!e2.maps) caja.querySelector('.sfg-gmaps').href = l.maps;
                if (!e2.trip) caja.querySelector('.sfg-trip').href = l.trip;
                avisar('✔ Búsqueda guardada: "' + q + '".' + (e2.maps || e2.trip ? ' (Los botones con enlace exacto siguen yendo a ese enlace.)' : ''), '#15803d');
            };
            caja.querySelectorAll('[data-en]').forEach(function (inp) {
                inp.onchange = function () {
                    var v = inp.value.trim();
                    if (v && !/^https:\/\//.test(v)) { avisar('El enlace debe empezar por https://'); return; }
                    guardarEnlace(inp.dataset.en, v);
                    var a = caja.querySelector(inp.dataset.en === 'maps' ? '.sfg-gmaps' : '.sfg-trip');
                    a.href = v || (inp.dataset.en === 'maps' ? l.maps : l.trip);
                    avisar(v ? '✔ Enlace guardado.' : 'Enlace quitado: el botón vuelve a buscar el restaurante.', '#15803d');
                };
            });
            pintarLocales(caja);
            var trasCarpeta = function (r) {
                hayCarpeta = null; pintarG(); contarBoton();
                avisar('📂 ' + carpetaLocal + ': ' + r.leidas + ' fotos' + (r.nuevas ? ', ' + r.nuevas + ' nuevas en la lista.' : ' (ya estaban todas en la lista).') + ' Las repetidas con las de internet salen una sola vez.', '#15803d');
            };
            var errCarpeta = function (e) { if (e && e.name === 'AbortError') return; avisar(e.message || String(e)); };
            caja.querySelector('#sfg-carpeta').onclick = function () { abrirCarpeta(true).then(trasCarpeta, errCarpeta); };
            var rb = caja.querySelector('#sfg-reabrir'); if (rb) rb.onclick = function () { abrirCarpeta(false).then(trasCarpeta, errCarpeta); };
            var gt = caja.querySelector('#sfg-guardar');
            if (gt) gt.onclick = function () { guardarTodas(leerGaleria(), avisar, gt); };
            var mn = caja.querySelector('#sfg-min');
            mn.onchange = function () { var v = Math.max(0, parseInt(mn.value, 10) || 0); try { localStorage.setItem(CLAVE_MIN, String(v)); } catch (e) { } pintarG(); };
            caja.querySelector('#sfg-peq').onchange = function () { verPeq = this.checked; pintarG(); };
            // Medir las fotos que se ven (solo las que aún no tienen medidas)
            if (obs) obs.disconnect();
            obs = new IntersectionObserver(function (ents) {
                ents.forEach(function (en) {
                    if (!en.isIntersecting) return;
                    var el = en.target; obs.unobserve(el);
                    pedirInfo(el.dataset.k, function (x) {
                        var c = caja.querySelector('.sfg-card[data-k="' + (window.CSS && CSS.escape ? CSS.escape(el.dataset.k) : el.dataset.k) + '"]');
                        if (!c) return;
                        var pq = esPequena(x), inf = c.querySelector('.sfg-i');
                        inf.textContent = infoTxt(x) + (pq ? ' · pequeña' : '');
                        inf.classList.toggle('peq', pq);
                        if (x._descartada || repetidas(leerGaleria())[el.dataset.k]) { c.remove(); return; }
                        if (pq) {
                            var np = caja.querySelector('#sfg-npeq'); if (np) np.textContent = leerGaleria().filter(esPequena).length;
                            if (!verPeq) c.remove();
                        }
                    });
                });
            }, { root: caja, rootMargin: '200px' });
            caja.querySelectorAll('.sfg-card[data-k]').forEach(function (el) {
                var gg = leerGaleria(), x = gg[indiceDe(gg, el.dataset.k)];
                if (x && (!x.w || !x.hash) && !x.err) obs.observe(el);   // sin medidas o sin huella (fotos medidas antes de 1.14)
            });
            var rs = caja.querySelector('#sfg-restaurar');
            if (rs) rs.onclick = function () {
                (window.confirmarEditor ? window.confirmarEditor('¿Restaurar TODAS las fotos descartadas de esta web? Volverán a la lista la próxima vez que llegue el escaneo (recarga el editor).') : Promise.resolve(confirm('¿Restaurar todas las descartadas?')))
                    .then(function (ok) { if (ok) { restaurarDescartes(); pintarG(); avisar('♻ Descartes borrados. Recarga el editor para que vuelvan las fotos del escaneo.', '#15803d'); } });
            };
            var va = caja.querySelector('#sfg-vaciar');
            if (va) va.onclick = function () {
                (window.confirmarEditor ? window.confirmarEditor('¿Vaciar la lista de fotos de internet? (no toca las fotos ya puestas en platos)') : Promise.resolve(confirm('¿Vaciar la lista?')))
                    .then(function (ok) { if (ok) { vaciarTodo(); pintarG(); contarBoton(); } });
            };
            // Botones nuevos: asignar por plato, seleccionar varias, grupos
            var bpp = caja.querySelector('#sfg-porplato');
            if (bpp) bpp.onclick = async function () {
                var ids = await elegirPlatos(null, null, platos, { titulo: '¿Para qué plato o platos vas a elegir fotos?', nombre: '', sub: 'Marca uno o varios (p. ej. el mismo plato en varias secciones: 8001 + 12901 + 16000). Luego marcas sus fotos en la lista y pulsas Asignar.', boton: 'Elegir fotos para', boton0: 'Elegir fotos' });
                if (!ids || !ids.length) return;
                modoSel = { ids: ids, orden: [] }; pintarG();
            };
            var bsv = caja.querySelector('#sfg-selvarias');
            if (bsv) bsv.onclick = function () { modoSel = { ids: [], orden: [] }; pintarG(); };
            var asignarGrupo = async function (nom) {
                var gr = leerGrupos(), gg = leerGaleria();
                var m = (gr[nom] || []).filter(function (c) { var ix = indiceDe(gg, c); return ix >= 0 && !esDescartada(gg[ix]); });
                if (!m.length) { avisar('Ese grupo no tiene fotos en este navegador.'); return; }
                var x0 = gg[indiceDe(gg, m[0])];
                var ids = await elegirPlatos({ t: nom, u: x0.u }, null, platos, { titulo: '¿A qué platos va el grupo «' + nom + '»?', nombre: m.length + ' foto' + (m.length > 1 ? 's' : ''), sub: 'Todas en un solo guardado: las primeras llenan los huecos de activas (máx. 4) y el resto va de repuesto. Si sale bien, el grupo se deshace y las fotos quedan como asignadas.', sugTxt: 'Parecen este grupo (por el nombre)' });
                if (!ids || !ids.length) return;
                try {
                    var r = await asignarFotos(m, ids);
                    if (r.okClaves.length === m.length && !r.mal.length) { ponerGrupo(nom, null); if (verGrupo === nom) verGrupo = null; }
                    else if (r.okClaves.length) ponerGrupo(nom, (leerGrupos()[nom] || []).filter(function (c) { return r.okClaves.indexOf(c) < 0; }));
                    pintarG(); contarBoton();
                    avisar(textoLote(r), r.nOk ? '#15803d' : '#b42318');
                } catch (e) { avisar('No se pudo asignar: ' + (e.message || e)); }
            };
            var renombrar = async function (nom) {
                var gr = leerGrupos();
                var nuevo = await pedirNombre('✎ Nuevo nombre para el grupo «' + nom + '»', nom, Object.keys(gr).filter(function (n) { return n !== nom; }).sort(), 'Si pones el de otro grupo, se juntan.');
                if (!nuevo || nuevo === nom) return;
                var m = gr[nom] || []; ponerGrupo(nom, null); agrupar(nuevo, m);
                if (verGrupo === nom) verGrupo = nuevo;
                pintarG(); avisar('✔ Grupo renombrado a «' + nuevo + '».', '#15803d');
            };
            var bgv = caja.querySelector('#sfg-gvolver'); if (bgv) bgv.onclick = function () { verGrupo = null; modoSel = null; pintarG(); };
            var bga = caja.querySelector('#sfg-gasig'); if (bga) bga.onclick = function () { asignarGrupo(verGrupo); };
            var bgr = caja.querySelector('#sfg-gren'); if (bgr) bgr.onclick = function () { renombrar(verGrupo); };
            caja.querySelectorAll('.sfg-grupo').forEach(function (el) {
                var nom = el.dataset.g;
                var ga = el.querySelector('[data-ga]'); if (ga) ga.onclick = function () { asignarGrupo(nom); };
                el.querySelector('[data-gv]').onclick = function () { verGrupo = nom; caja.scrollTop = 0; pintarG(); };
                el.querySelector('[data-gx]').onclick = function () {
                    (window.confirmarEditor ? window.confirmarEditor('¿Deshacer el grupo «' + nom + '»? Sus fotos vuelven sueltas a la lista (no se borra ninguna).') : Promise.resolve(confirm('¿Deshacer el grupo?')))
                        .then(function (ok) { if (ok) { ponerGrupo(nom, null); pintarG(); avisar('Grupo «' + nom + '» deshecho: sus fotos vuelven a la lista.', '#15803d'); } });
                };
                el.addEventListener('click', function (e) {
                    if (!modoSel || e.target.closest('button')) return;
                    e.preventDefault(); e.stopPropagation();
                    var m = (el.dataset.m || '').split('\n').filter(Boolean);
                    var todas = m.length && m.every(function (k) { return modoSel.orden.indexOf(k) >= 0; });
                    if (todas) modoSel.orden = modoSel.orden.filter(function (k) { return m.indexOf(k) < 0; });
                    else m.forEach(function (k) { if (modoSel.orden.indexOf(k) < 0) modoSel.orden.push(k); });
                    marcarSel();
                }, true);
            });
            caja.querySelectorAll('.sfg-card[data-k]').forEach(function (el) {
                var g2 = function () { return leerGaleria(); };
                el.addEventListener('click', function (e) {
                    if (!modoSel || e.target.closest('button')) return;
                    e.preventDefault(); e.stopPropagation();
                    var k = el.dataset.k, i = modoSel.orden.indexOf(k);
                    if (i >= 0) modoSel.orden.splice(i, 1); else modoSel.orden.push(k);
                    marcarSel();
                }, true);
                var bdes = el.querySelector('[data-des]');
                if (bdes) bdes.onclick = function () {
                    var g = g2(), ix = indiceDe(g, el.dataset.k); if (ix < 0) return;
                    var x = g[ix], antes = x.usada;
                    (window.confirmarEditor ? window.confirmarEditor('¿Desasignar esta foto (estaba en: ' + antes + ')? Vuelve a la lista sin asignar. La foto NO se borra de esos platos: si sobra, quítala en su 📷 Fotos del plato (🔍 Buscar repetidas o Eliminar).', { si: 'Desasignar', no: 'Cancelar' }) : Promise.resolve(confirm('¿Desasignar?')))
                        .then(function (ok) {
                            if (!ok) return;
                            var g4 = leerGaleria(), i4 = indiceDe(g4, el.dataset.k); if (i4 < 0) return;
                            delete g4[i4].usada; guardarGaleria(g4);
                            if (x.hash) { delete descRemoto.asignadas[x.hash]; descPend.asignadas[x.hash] = null; programarDescartes(); }
                            pintarG(); contarBoton();
                            avisar('↩ Desasignada (estaba en ' + antes + '). Ya sale en la lista para asignarla de nuevo.', '#15803d');
                        });
                };
                var gs = el.querySelector('[data-gs]');
                if (gs) gs.onclick = function () { sacarDeGrupo(el.dataset.k); if (modoSel) { var j = modoSel.orden.indexOf(el.dataset.k); if (j >= 0) modoSel.orden.splice(j, 1); } pintarG(); };
                el.querySelector('[data-x]').onclick = function () {
                    var g = g2(), ix = indiceDe(g, el.dataset.k); if (ix < 0) return;
                    sacarDeGrupo(el.dataset.k);
                    if (modoSel) { var j = modoSel.orden.indexOf(el.dataset.k); if (j >= 0) { modoSel.orden.splice(j, 1); pintarBarra(); } }
                    descartar(el.dataset.k, g[ix].hash); g.splice(ix, 1); guardarGaleria(g); el.remove(); contarBoton();
                    var cb = caja.querySelector('.sf-gal-cab b'), us = g.filter(function (q) { return q.usada; }).length;
                    if (cb) cb.textContent = (g.length - us) + ' sin asignar' + (us ? ' · ' + us + ' asignadas' : '');
                };
                var kf = el.dataset.k;
                el.querySelector('[data-ed]').onclick = async function () {
                    var bt = this, gg = g2(), x = gg[indiceDe(gg, kf)]; if (!x) return;
                    bt.disabled = true; bt.textContent = '⏳ Bajando…';
                    try {
                        var fuente = (editadas[kf] && editadas[kf].fuente) || await obtenerOriginal(x);
                        if (!fuente) throw new Error('No se pudo descargar la foto original.');
                        var r = await recortar(fuente, x.t || 'foto', { datos: editadas[kf] && editadas[kf].datos });
                        if (r) {
                            if (editadas[kf]) URL.revokeObjectURL(editadas[kf].url);
                            editadas[kf] = { blob: r.blob, url: URL.createObjectURL(r.blob), fuente: fuente, info: r.info, datos: r.datos };
                            pintarG();
                            return;
                        }
                    } catch (e) { avisar(e.message || String(e)); }
                    bt.disabled = false; bt.textContent = '✂ Editar';
                };
                var ba = el.querySelector('[data-a]');
                if (ba) ba.onclick = async function () {
                    var bt = this, gg = g2(), x = gg[indiceDe(gg, kf)]; if (!x) return;
                    var ids = await elegirPlatos(x, kf, platos);
                    if (!ids || !ids.length) return;
                    bt.disabled = true; bt.textContent = '⏳';
                    try {
                        var blob = editadas[kf] && editadas[kf].blob;
                        if (!blob) {
                            avisar('Descargando la foto original…', '#555');
                            var orig = await obtenerOriginal(x);
                            if (!orig) throw new Error('No se pudo descargar la foto (esa web no lo permite). Ábrela en grande, clic derecho → "Copiar imagen", y pégala con Ctrl+V en 📷 Fotos del plato.');
                            blob = (await aWebp(orig)).blob;
                        }
                        // Huella de la ORIGINAL (aunque se suba recortada), para saber en cualquier navegador que ya está asignada
                        if (!x.hash) { var src = (editadas[kf] && editadas[kf].fuente) || orig; if (src) guardarInfo(kf, await medir(src)); }
                        avisar('Subiendo a ' + ids.length + ' plato' + (ids.length > 1 ? 's' : '') + '…', '#555');
                        var r = await asignarVarios(blob, ids);
                        var ok = r.res.filter(function (q2) { return !q2.err; }), mal = r.res.filter(function (q2) { return q2.err; });
                        if (ok.length) {
                            var g3 = leerGaleria(), i3 = indiceDe(g3, kf);
                            if (i3 >= 0) {
                                var antes = g3[i3].usada ? descRemoto.asignadas[g3[i3].hash] || g3[i3].usada : '';
                                g3[i3].usada = (antes ? antes + ' + ' : '') + ok.map(function (q2) { return q2.p.id + ' ' + q2.n; }).join(' + ');
                                guardarGaleria(g3);
                                if (g3[i3].hash) { descPend.asignadas[g3[i3].hash] = g3[i3].usada; programarDescartes(); }
                            }
                        }
                        pintarG(); contarBoton();
                        avisar((ok.length ? '✔ Puesta en ' + ok.map(function (q2) { return q2.p.id + ' ' + q2.n + (q2.repuesto ? ' (de repuesto nº ' + q2.num + ': ya tenía 4 activas)' : ' (foto 0' + q2.num + ')'); }).join(', ') + '. En la web en 1-2 min.' : '') +
                            (mal.length ? ' ⚠ No: ' + mal.map(function (q2) { return q2.p.id + ' ' + q2.n + ' (' + q2.err + ')'; }).join(', ') + '.' : '') +
                            (r.cambiaCampo ? ' Algún plato no tenía foto: pulsa "GUARDAR CAMBIOS EN WEB" para que la enseñe.' : ''), ok.length ? '#15803d' : '#b42318');
                    } catch (e) {
                        avisar('No se pudo asignar: ' + (e.message || e)); bt.disabled = false; bt.textContent = 'Asignar';
                    }
                };
            });
            marcarSel();
            pintarBarra();
        }
        alRecibir = pintarG;
        pintarG();
        cargarDescartes().then(function () { if (alRecibir === pintarG) pintarG(); });
    }
    function botonCabecera() {
        setTimeout(function () { cargarDescartes(); }, 500);
        if (document.getElementById('sfg-btn')) return;
        var ref = document.getElementById('contacto-btn') || document.getElementById('marca-btn') || document.getElementById('ew-btn-idiomas') || document.getElementById('tabs-visibility-wrapper');
        if (!ref) return;
        var b = document.createElement('button');
        b.id = 'sfg-btn'; b.type = 'button';
        b.title = 'Fotos de los platos traídas de Google Maps y TripAdvisor: repartirlas entre los platos.';
        b.style.cssText = 'font-size:0.7rem; display:flex; align-items:center; gap:4px; white-space:nowrap; background:#f8f9fa; padding:4px 8px; border-radius:4px; border:1px solid #ddd; cursor:pointer;';
        b.onclick = fotosInternet;
        ref.parentNode.insertBefore(b, ref.nextSibling);
        contarBoton();
    }
    // Fotos que manda la extensión "Escáner de fotos" (puente-editor.js).
    window.addEventListener('message', function (e) {
        if (e.source !== window || !e.data || e.data.tipo !== 'FOTOS-CARTA') return;
        var antes = Object.keys(pendientes).length;
        var n = recibirFotos(e.data.fotos);
        contarBoton();
        if ((n || Object.keys(pendientes).length !== antes) && alRecibir) alRecibir();
    });
    window.addEventListener('load', function () { setTimeout(botonCabecera, 1200); });

    window.SubirFoto = { retirar: retirar, subirImagen: subirImagen, fotosInternet: fotosInternet, escaner: escaner };

    document.addEventListener('DOMContentLoaded', function () {
        var campo = document.getElementById('edit-imagen');
        if (!campo) return;
        ponerEstilos();
        var btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'sf-btn'; btn.textContent = '📷 Fotos del plato';
        btn.onclick = gestor;
        campo.insertAdjacentElement('afterend', btn);
    });
})();
