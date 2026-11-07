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
    window.APP_VERSIONS.subirFoto = '1.11.0'; // 7 nov: "Asignar a platos…" = ventana grande con casillas (nada marcado de serie; parecidos arriba con ★). 1.10.0: en 🖼️ Fotos de internet: ✂ Editar (recortar) y Asignar a VARIOS platos a la vez (sube 1 vez, WebP 1080, un commit). 1.9.0: cada foto lleva su restaurante de origen; cada web solo acepta los suyos (pregunta Sí/No la 1ª vez). 1.8.1: TripAdvisor: una foto en varios tamaños = una sola (clave por ruta y por medidas+peso), vista previa más nítida. 1.8.0: medidas/peso/formato bajo cada foto (se miden al verlas) + mínimo de resolución (oculta y no guarda las pequeñas). 1.7.0: botones Maps/TripAdvisor con enlace guardado + 💾 guardar todas en el PC a máxima calidad (sueltas, sin zip). 1.6.1: ✕ sin repintar (no vuelve arriba), se conserva la posición al repintar, 🖼️ Fotos de internet a pantalla completa. 1.6.0: sección "🖼️ Fotos de internet" en la cabecera (galería + asignar a plato) y extensión Escáner de fotos (herramientas\\extension-fotos): Google bloquea los marcadores. 1.5.1: escáner: <picture><source>, data-src, alt, galería por encima (TripAdvisor). 1.5.0: escáner sin innerHTML (Google lo bloquea: Trusted Types) + nombre del plato de cada foto + sugerencias por nombre. 1.4.0: escáner a fondo (escucha fetch/XHR, datos internos, bajar solo). 1.3.0: escáner de fotos (marcador) + galería para asignar a cada plato. 1.2.0: traer fotos de Google Maps / TripAdvisor (enlaces + pegar Ctrl+V, arrastrar o URL). 1.1.0: subirImagen() para logos y QR (marca.js)

    var MAX_LADO = 1080, CALIDAD = 0.8, MAX_FOTOS = 4;   // 1080 px: nítida en móvil, ~100-200 KB
    var JSQUASH = 'https://cdn.jsdelivr.net/npm/@jsquash/webp@1.5.0/encode.js';
    var CROPPER = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/';
    var REPO = 'https://api.github.com/repos/' + S.repo;
    var dirWeb = S.ruta.replace(/[^/]*$/, '');   // carpeta de datos.json en el repo = la web
    var DESACT = 'desactivadas';

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
    function leerGaleria() {
        var g; try { g = JSON.parse(localStorage.getItem(CLAVE_G) || '[]') || []; } catch (e) { return []; }
        // Juntar entradas que ahora son la misma foto (p. ej. TripAdvisor en varios tamaños): se conserva lo útil de cada una.
        var v = {}, out = [];
        g.forEach(function (x) {
            var c = claveFoto(x.u), y = v[c];
            if (!y) { v[c] = x; out.push(x); return; }
            ['t', 'usada', 'w', 'h', 'kb', 'tipo'].forEach(function (k) { if (!y[k] && x[k]) y[k] = x[k]; });
        });
        if (out.length !== g.length) guardarGaleria(out);
        return out;
    }
    function guardarGaleria(g) { try { localStorage.setItem(CLAVE_G, JSON.stringify(g.slice(-400))); } catch (e) { } }
    var CLAVE_D = 'sf-descartadas-' + (S.restaurante || S.modo || '');
    function leerDesc() { try { return JSON.parse(localStorage.getItem(CLAVE_D) || '{}') || {}; } catch (e) { return {}; } }
    function descartar(c) { var d = leerDesc(); d[c] = 1; try { localStorage.setItem(CLAVE_D, JSON.stringify(d)); } catch (e) { } }
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
    function vaciarTodo() { guardarGaleria([]); try { localStorage.removeItem(CLAVE_D); } catch (e) { }
        var o = leerOrigenes(), mios = Object.keys(o).filter(function (d) { return o[d] === 'si'; });
        try { window.postMessage({ tipo: 'FOTOS-CARTA-QUITAR', de: mios, sinOrigen: mios.indexOf(SIN_ORIGEN) >= 0 }, location.origin); } catch (e) { } }
    function miniatura(u) {
        var id = idGoogle(u);
        if (id) return 'https://lh3.googleusercontent.com/' + id + '=w400';
        if (/dynamic-media-cdn\.tripadvisor\.com\//.test(u)) return u.replace(/\?.*$/, '') + '?w=500&h=-1&s=1';
        var m = String(u).match(/^(https:\/\/[^\/]+\/media\/)photo-[a-z](?:\/\d{3,})?\/([^?#]+)/);
        return m ? m[1] + 'photo-s/' + m[2] : u;
    }
    // Si la vista previa grande no existe, se usa la dirección escaneada; si tampoco, se oculta la tarjeta.
    function imgPrevia(u, ocultar) {
        return '<img loading="lazy" referrerpolicy="no-referrer" src="' + esc(miniatura(u)) + '" data-o="' + esc(u) + '" alt="" ' +
            'onerror="if(!this.dataset.r&&this.src!==this.dataset.o){this.dataset.r=1;this.src=this.dataset.o}else{' + ocultar + '}">';
    }
    // Misma foto con distinta dirección (TripAdvisor): mismas medidas y peso de la original = repetida. Se queda la asignada o con nombre.
    function repetidas(g) {
        var vistos = {}, dup = {};
        g.slice().sort(function (a, b) { return (b.usada ? 2 : b.t ? 1 : 0) - (a.usada ? 2 : a.t ? 1 : 0); }).forEach(function (x) {
            if (!x.w || !x.kb) return;
            var f = x.w + 'x' + x.h + '-' + x.kb;
            if (vistos[f]) dup[claveFoto(x.u)] = 1; else vistos[f] = 1;
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
    var formatoRec = NaN;   // se recuerda entre fotos (NaN = libre)
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
            var formatos = [['Libre', NaN], ['4:3', 4 / 3], ['1:1', 1], ['3:4', 3 / 4], ['16:9', 16 / 9]];
            capa.innerHTML = '<div class="sf-rec-caja"><div class="sf-rec-cab"><b>✂ Recortar</b> <small>' + esc(titulo || '') + '</small></div>' +
                '<div class="sf-rec-zona"><img alt=""></div>' +
                '<div class="sf-rec-barra">' + formatos.map(function (f, i) { return '<button data-f="' + i + '">' + f[0] + '</button>'; }).join('') +
                '<span class="sf-sep"></span><button data-g="-90" title="Girar a la izquierda">⟲</button><button data-g="90" title="Girar a la derecha">⟳</button>' +
                '<button data-r="1" title="Volver a la foto entera">Restablecer</button></div>' +
                '<div class="sf-rec-info"></div>' +
                '<div class="sf-bot"><button class="sf-no">Cancelar</button><button class="sf-ok">Usar foto</button></div></div>';
            document.body.appendChild(capa);
            var img = capa.querySelector('img'), info = capa.querySelector('.sf-rec-info');
            img.src = url;
            var cr = new window.Cropper(img, {
                viewMode: 1, autoCropArea: 1, aspectRatio: formatoRec, background: false, responsive: true,
                checkOrientation: true, movable: true, zoomable: true, toggleDragModeOnDblclick: false,
                crop: function (e) {
                    var w = Math.round(e.detail.width), h = Math.round(e.detail.height), f = Math.min(1, lado / Math.max(w, h));
                    info.textContent = w + '×' + h + ' → se guarda a ' + Math.round(w * f) + '×' + Math.round(h * f) + ' px';
                }
            });
            var marcar = function () {
                capa.querySelectorAll('[data-f]').forEach(function (b) {
                    var v = formatos[+b.dataset.f][1];
                    b.classList.toggle('activo', (isNaN(v) && isNaN(formatoRec)) || v === formatoRec);
                });
            };
            marcar();
            capa.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { formatoRec = formatos[+b.dataset.f][1]; cr.setAspectRatio(formatoRec); marcar(); }; });
            capa.querySelectorAll('[data-g]').forEach(function (b) { b.onclick = function () { cr.rotate(+b.dataset.g); }; });
            capa.querySelector('[data-r]').onclick = function () { cr.reset(); };
            var fin = function (v) { cr.destroy(); capa.remove(); URL.revokeObjectURL(url); resolver(v); };
            capa.querySelector('.sf-no').onclick = function () { fin(null); };
            capa.querySelector('.sf-ok').onclick = async function () {
                this.disabled = true; this.textContent = 'Preparando…';
                var d = cr.getData(true);
                var f = Math.min(1, lado / Math.max(d.width, d.height));
                var c = cr.getCroppedCanvas({ width: Math.round(d.width * f), height: Math.round(d.height * f), imageSmoothingEnabled: true, imageSmoothingQuality: 'high', fillColor: op.transparente ? 'transparent' : '#fff' });
                var blob = await canvasAWebp(c, op.calidad);
                fin({ blob: blob, info: d.width + '×' + d.height + ' → ' + c.width + '×' + c.height + ', ' + kb(blob.size) });
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
        '.sfg-ir{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.sfg-ir>div{display:flex;gap:6px;align-items:center}.sfg-ir a{text-decoration:none;padding:9px 12px;font-size:.88rem}.sfg-ir input{flex:1;min-width:0;padding:7px 9px;border:1px solid #ccc;border-radius:7px;font-size:.8rem}' +
        '@media(max-width:700px){.sfg-ir{grid-template-columns:1fr}}' +
        '.sfg-b{padding:6px 10px;border-radius:7px;border:0;background:#1f2328;color:#fff;cursor:pointer;font-size:.8rem;white-space:nowrap}' +
        '.sfg-rejilla{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px;margin-top:10px}' +
        '.sfg-card{border:1px solid #e3e0d8;border-radius:10px;padding:6px;background:#faf9f6;display:flex;flex-direction:column;gap:5px}.sfg-card.usada{opacity:.55}' +
        '.sfg-card img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:7px;display:block;background:#e5e7eb}' +
        '.sfg-i{font-size:.72rem;color:#6b6f76}.sfg-i.peq{color:#b42318;font-weight:600}' +
        '.sfg-t{font-size:.8rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sfg-u{font-size:.74rem;color:#15803d}' +
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
        '.sfg-a{display:flex;gap:4px}.sfg-a input{flex:1;min-width:0;padding:5px 6px;border:1px solid #ccc;border-radius:6px;font-size:.78rem}.sfg-a button[data-x]{border:1px solid #d6d2c6;background:#fff;border-radius:6px;cursor:pointer;padding:0 7px}' +
        '.sf-gal-cab{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:.82rem}.sf-gal-cab button{padding:3px 8px;border:1px solid #d6d2c6;border-radius:6px;background:#fff;cursor:pointer;font-size:.75rem}' +
        '.sf-gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;max-height:62vh;overflow:auto}' +
        '.sf-g{position:relative;aspect-ratio:1;border-radius:7px;overflow:hidden;cursor:pointer;background:#e5e7eb}.sf-g img{width:100%;height:100%;object-fit:cover;display:block}' +
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
        fondo.innerHTML = '<div id="sf-caja" style="max-width:1150px"><h3>📷 Fotos del plato</h3><p class="sf-sub">Cargando…</p></div>';
        document.body.appendChild(fondo);
        var caja = fondo.querySelector('#sf-caja');
        var urls = [];
        var cerrar = function () { urls.forEach(URL.revokeObjectURL); fondo.remove(); document.removeEventListener('paste', alPegar); alRecibir = null; };
        var busq = busquedaLocal(), verUsadas = false;
        var nombrePlato = function () { return String((document.getElementById('edit-es') || {}).value || p.es || ('plato ' + p.id)).trim(); };

        // Estado: listas de { path (original o null), sha, blob?, info? }
        var activas = [], desact = [], originales = [];
        try {
            var patron = baseOriginal ? new RegExp('^' + baseOriginal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '0(\\d)\\.webp$', 'i') : null;
            if (patron) {
                var a = await listar(dirAct.slice(0, -1)), d = await listar(dirDes.slice(0, -1));
                a.forEach(function (f) { var m = f.name.match(patron); if (m) activas.push({ n: +m[1], path: f.path, sha: f.sha }); });
                d.forEach(function (f) { var m = f.name.match(patron); if (m) desact.push({ n: +m[1], path: f.path, sha: f.sha }); });
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
                ? '<button data-a="izq" ' + (i === 0 ? 'disabled' : '') + ' title="Antes">◀</button>' +
                  '<button data-a="der" ' + (i === activas.length - 1 ? 'disabled' : '') + ' title="Después">▶</button>' +
                  (i > 0 ? '<button data-a="pri" title="Poner como principal (01)">★ 01</button>' : '') +
                  '<button data-a="rec" title="Recortar o girar" ' + (x.fuente || x.blob ? '' : 'disabled') + '>✂ Recortar</button>' +
                  '<button data-a="off" title="La web deja de mostrarla (se guarda aparte)">Desactivar</button>' +
                  '<button data-a="del" class="peligro">Eliminar</button>'
                : '<button data-a="on" ' + (activas.length >= MAX_FOTOS ? 'disabled title="Ya hay 4 activas"' : '') + '>Activar</button>' +
                  '<button data-a="del" class="peligro">Eliminar</button>';
            return '<div class="sf-foto' + (x.blob ? ' nueva' : '') + '" data-l="' + (esActiva ? 'a' : 'd') + '" data-i="' + i + '">' +
                '<div class="sf-img" style="background-image:url(' + (x.url || '') + ')"></div>' +
                '<div class="sf-num">' + nombre + (x.blob ? ' <small>· nueva</small>' : '') + '</div>' +
                (x.info ? '<div class="sf-num"><small>' + esc(x.info) + '</small></div>' : '') +
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
                .filter(function (o) { return (verUsadas || !o.x.usada || enEstePlato(o.x.u)) && !esPequena(o.x) && !dupG[claveFoto(o.x.u)]; })
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
                        descartar(el.dataset.k); g.splice(ix, 1); guardarGaleria(g); el.remove();
                        var cb = caja.querySelector('.sf-gal-cab b'); if (cb) cb.textContent = 'Fotos escaneadas: ' + g.filter(function (q) { return !q.usada; }).length + ' sin usar';
                        return;
                    }
                    if (enEstePlato(x.u)) { avisar('Esa foto ya está en este plato.', '#b45309'); return; }
                    await añadirUrl(x.u, claveFoto(x.u));
                };
            });
        }
        function pintar() {
            var sg0 = caja.querySelector('.sf-gal'), stG = sg0 ? sg0.scrollTop : 0, stC = caja.scrollTop;
            setTimeout(function () { var sg = caja.querySelector('.sf-gal'); if (sg) sg.scrollTop = stG; caja.scrollTop = stC; }, 0);
            caja.innerHTML = '<h3>📷 Fotos del plato</h3>' +
                '<p class="sf-sub">imagenes/' + esc(carpeta) + '/ · la web enseña la 01 y luego 02, 03, 04 seguidas. Al guardar se renumeran sin huecos.' +
                (huecosAviso ? ' <b style="color:#b45309">Había huecos en la numeración: se corrigen al guardar.</b>' : '') + '</p>' +
                '<label style="font-size:.82rem;color:#555">Nombre de las fotos: </label><input type="text" id="sf-base" value="' + esc(base) + '"> <small style="color:#6b6f76">→ ' + esc(base) + '01.webp…</small>' +
                '<h4>En la web (' + activas.length + '/' + MAX_FOTOS + ')</h4>' +
                (activas.length ? '<div class="sf-rejilla">' + activas.map(function (x, i) { return tarjeta(x, i, true); }).join('') + '</div>' : '<div class="sf-vacio">Ninguna: el plato sale sin 📸 en la web.</div>') +
                (desact.length ? '<h4>Desactivadas</h4><div class="sf-rejilla">' + desact.map(function (x, i) { return tarjeta(x, i, false); }).join('') + '</div>' : '') +
                '<h4>Traer de Google Maps / TripAdvisor</h4><div class="sf-ext">' +
                '<div class="sf-ext-fila"><input type="text" id="sf-q" value="' + esc(busq) + '" title="Qué buscar (se recuerda en este dispositivo)">' +
                '<a id="sf-l-maps" target="_blank" rel="noopener">🗺️ Google Maps</a><a id="sf-l-trip" target="_blank" rel="noopener">🦉 TripAdvisor</a>' +
                '<a id="sf-l-img" target="_blank" rel="noopener" title="Google Imágenes: nombre del plato + restaurante">🔍 Este plato</a></div>' +
                '<div class="sf-drop' + (activas.length >= MAX_FOTOS ? ' lleno' : '') + '" tabindex="0">' +
                (activas.length >= MAX_FOTOS ? 'Ya hay ' + MAX_FOTOS + ' fotos activas: desactiva o elimina alguna.'
                    : 'En la foto: clic derecho → <b>Copiar imagen</b>, y aquí <b>Ctrl+V</b><br>· o arrastra la foto aquí · o pega su dirección') + '</div>' +
                '<small>Las fotos que trae la extensión Escáner de fotos salen aquí abajo. Para verlas todas y repartirlas entre platos: botón <b>🖼️ Fotos de internet</b> de arriba.</small>' +
                galeriaHtml() +
                '<small>En Maps: ficha del restaurante → Fotos → "Menú" / "Comida". Usa solo fotos del propio restaurante o con permiso de quien la hizo.</small></div>' +
                '<p id="sf-msg"></p>' +
                '<div class="sf-bot"><button class="sf-add" ' + (activas.length >= MAX_FOTOS ? 'disabled' : '') + '>＋ Añadir fotos</button>' +
                '<button class="sf-no">Cancelar</button><button class="sf-ok">Guardar</button></div>';
            caja.querySelector('#sf-base').oninput = function () { base = slug(this.value) || base; };
            caja.querySelector('#sf-base').onchange = function () { pintar(); };
            caja.querySelector('.sf-no').onclick = function () { if (!guardando) cerrar(); };
            caja.querySelector('.sf-add').onclick = function () { entrada.click(); };
            caja.querySelector('.sf-ok').onclick = guardar;
            var q = caja.querySelector('#sf-q');
            var ponerEnlaces = function () {
                var l = enlacesExternos(q.value.trim(), (document.getElementById('edit-es') || {}).value || p.es || '');
                caja.querySelector('#sf-l-maps').href = l.maps; caja.querySelector('#sf-l-trip').href = l.trip; caja.querySelector('#sf-l-img').href = l.img;
            };
            ponerEnlaces();
            q.oninput = function () { busq = q.value; ponerEnlaces(); try { localStorage.setItem(CLAVE_Q, q.value.trim()); } catch (e) { } };
            activarGaleria();
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
                            recortar(x.fuente || x.blob, 'foto 0' + (i + 1)).then(function (r) {
                                if (!r) return;
                                var u = URL.createObjectURL(r.blob); urls.push(u);
                                x.blob = r.blob;   // x.fuente sigue siendo la original: se puede volver a recortar desde ella
                                x.url = u; x.info = r.info; x.sha = null;
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
            if (activas.length >= MAX_FOTOS) { avisar('Máximo ' + MAX_FOTOS + ' fotos activas: desactiva o elimina alguna.', '#b45309'); return; }
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
        async function añadir(files, gal) {
            for (var k = 0; k < files.length; k++) {
                if (activas.length >= MAX_FOTOS) { avisar('Máximo ' + MAX_FOTOS + ' fotos activas: desactiva o elimina alguna.', '#b45309'); break; }
                avisar('Preparando ' + files[k].name + '…', '#555');
                try {
                    var r = await recortar(files[k], files[k].name + ' (' + kb(files[k].size) + ')');
                    if (!r) { avisar(''); continue; }
                    var u = URL.createObjectURL(r.blob); urls.push(u);
                    activas.push({ blob: r.blob, fuente: files[k], url: u, info: r.info, gal: gal || null });
                    pintar();
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
                desact.forEach(function (x, i) { finales[dirDes + base + '0' + (i + 1) + '.webp'] = x.sha; });
                var cambios = [];
                originales.forEach(function (o) { if (!(o.path in finales)) cambios.push({ path: o.path, sha: null }); });
                Object.keys(finales).forEach(function (path) {
                    var o = originales.find(function (q) { return q.path === path; });
                    if (!o || o.sha !== finales[path]) cambios.push({ path: path, sha: finales[path] });
                });
                if (cambios.length) { msg.textContent = 'Guardando en GitHub…'; await commit(cambios, 'Fotos ' + base + ' (plato ' + p.id + ')'); }
                var conGal = activas.concat(desact).filter(function (x) { return x.gal; });
                if (conGal.length) {
                    var g = leerGaleria(), np = nombrePlato();
                    g.forEach(function (it) { if (conGal.some(function (x) { return x.gal === claveFoto(it.u); })) it.usada = np; });
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
        var activas = coger(await listar(dirAct.slice(0, -1))), desact = coger(await listar(dirDes.slice(0, -1)));
        if (!activas.length && !(borrar && desact.length)) return 0;
        var originales = activas.concat(desact), finales = {};
        if (!borrar) desact.concat(activas).slice(0, 9).forEach(function (x, i) { finales[dirDes + base + '0' + (i + 1) + '.webp'] = x.sha; });
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
        var r = await recortar(file, titulo, op);
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
        var lista = (typeof datosLocales !== 'undefined' && Array.isArray(datosLocales)) ? datosLocales : (window.datosLocales || []);   // eslint-disable-line no-undef
        var sha = await subirBlob(blob), cambios = [], res = [], cacheDir = {}, planeadas = {}, cambiaCampo = false;
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
            if (n > MAX_FOTOS) { res.push({ p: p, n: nombre, err: 'ya tiene ' + MAX_FOTOS + ' fotos' }); continue; }
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
        if (cambios.length) await commit(cambios, 'Fotos de internet -> platos ' + res.filter(function (r) { return !r.err; }).map(function (r) { return r.p.id; }).join(', '));
        if (cambiaCampo) { window.hayCambiosSinGuardar = true; try { if (typeof renderizar === 'function') renderizar(); } catch (e) { } }   // eslint-disable-line no-undef
        return { res: res, cambiaCampo: cambiaCampo };
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
        var f = /tripadvisor/.test(x.u) ? 'TripAdvisor' : 'Google';
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
            if (x) {
                var b = await bajarMaxima(x.u);
                var nx = guardarInfo(t.k, b ? await medir(b) : { err: 1 });
                if (nx && t.f) t.f(nx);
            }
        } catch (e) { }
        enCurso--; siguienteInfo();
    }
    async function guardarTodas(lista, avisar, boton) {
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
        var caja = fondo.querySelector('#sf-caja'), verUsadas = false, filtro = '', verPeq = false, obs = null;
        var elegidos = {}, editadas = {};   // por clave de foto: ids de plato elegidos · recorte hecho aquí { blob, url, fuente, info }
        var conExt = document.documentElement.dataset.escanerFotos === '1';
        var q = busquedaLocal(), l = enlacesExternos(q, ''), en = leerEnlaces();
        var avisar = function (t, color) { var m = caja.querySelector('#sf-msg'); if (m) { m.style.color = color || '#b42318'; m.textContent = t; } };
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
        function elegirPlatos(x, kf, platos) {
            return new Promise(function (resolver) {
                var cat = function (id) {
                    try { var c = window.Categorias && window.Categorias.categoriaDe && window.Categorias.categoriaDe(id); var n = c && (c.nombre || c.es || c.id); return typeof n === 'string' ? n : (n && typeof n.es === 'string' ? n.es : ''); } catch (e) { return ''; }
                };
                var lista = platos.map(function (pl) { return { id: pl.id, n: pl.n, p: x.t ? parecido(pl.n, x.t) : 0, c: cat(pl.id) }; });
                var sug = lista.filter(function (q) { return q.p > 0; }).sort(function (a, b) { return b.p - a.p || a.id - b.id; });
                var marcados = {}, ed = editadas[kf];
                var fila = function (q, estrella) {
                    return '<label class="sfg-pf" data-id="' + q.id + '" data-txt="' + esc((q.id + ' ' + q.n + ' ' + q.c).toLowerCase()) + '"><input type="checkbox" value="' + q.id + '"> <b>' + q.id + '</b> ' + (estrella ? '★ ' : '') + esc(q.n) + '</label>';
                };
                var html = '', ultima = null;
                lista.forEach(function (q) {
                    if (q.c !== ultima) { html += '<div class="sfg-pc">' + esc(q.c || 'Sin categoría') + '</div>'; ultima = q.c; }
                    html += fila(q, q.p > 0);
                });
                var pop = document.createElement('div');
                pop.id = 'sfg-pop';
                pop.innerHTML = '<div class="sfg-pop-caja">' +
                    '<div class="sfg-pop-cab"><img src="' + esc(ed ? ed.url : miniatura(x.u)) + '" referrerpolicy="no-referrer" alt=""><div><b>¿En qué platos va esta foto?</b><br><small>' + esc(x.t || 'sin nombre') + (ed ? ' · ✂ editada' : '') + '</small><br><small style="color:#6b6f76">Marca uno o varios. Se sube una vez (WebP 1080 px) y se pone en todos.</small></div></div>' +
                    '<input type="text" class="sfg-pop-q" placeholder="Buscar por nombre, ID o categoría…">' +
                    '<div class="sfg-pop-lista">' +
                    (sug.length ? '<div class="sfg-pc">★ Parecen esta foto (por el nombre)</div>' + sug.map(function (q) { return fila(q, true); }).join('') : '') +
                    html + '</div>' +
                    '<div class="sf-bot"><span class="sfg-pop-sel" style="margin-right:auto;align-self:center;color:#6b6f76"></span><button type="button" class="sf-no">Cancelar</button><button type="button" class="sf-ok" disabled>Asignar</button></div></div>';
                document.body.appendChild(pop);
                var q = pop.querySelector('.sfg-pop-q'), ok = pop.querySelector('.sf-ok'), sel = pop.querySelector('.sfg-pop-sel');
                var nombres = function () { return lista.filter(function (z) { return marcados[z.id]; }); };
                var actualizar = function () {
                    var n = nombres();
                    ok.disabled = !n.length;
                    ok.textContent = n.length ? 'Asignar a ' + n.length + ' plato' + (n.length > 1 ? 's' : '') : 'Asignar';
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
                    var t = q.value.trim().toLowerCase();
                    pop.querySelectorAll('.sfg-pf').forEach(function (f) { f.style.display = !t || f.dataset.txt.indexOf(t) >= 0 ? '' : 'none'; });
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
                actualizar();
                q.focus();
            });
        }
        function pintarG() {
            var g = leerGaleria(), platos = listaPlatos(), usadas = g.filter(function (x) { return x.usada; }).length;
            var nPeq = g.filter(esPequena).length, dup = repetidas(g);
            var vis = g.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) {
                if (o.x.usada && !verUsadas) return false;
                if (!verPeq && esPequena(o.x)) return false;
                if (dup[claveFoto(o.x.u)]) return false;
                return !filtro || palabras(o.x.t).join(' ').indexOf(palabras(filtro).join(' ')) >= 0 || String(o.x.t || '').toLowerCase().indexOf(filtro.toLowerCase()) >= 0;
            });
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
                '<details class="sfg-pasos"' + (g.length && conExt ? '' : ' open') + '><summary><b>Cómo traerlas</b>' + (conExt ? ' <small style="color:#15803d">· extensión instalada ✔</small>' : '') + '</summary><ol>' +
                (conExt ? '' : '<li><b>Una sola vez, en este ordenador:</b> instala la extensión <b>Escáner de fotos</b>. En Chrome abre <code>chrome://extensions</code> (en Opera, <code>opera://extensions</code>), activa <b>Modo de desarrollador</b>, pulsa <b>Cargar descomprimida</b> y elige la carpeta <code>C:\\Taller\\taller\\cartas\\herramientas\\extension-fotos</code>. Luego recarga esta página.</li>') +
                '<li>Abre el restaurante en <a href="' + esc(l.maps) + '" target="_blank" rel="noopener">Google Maps</a> (pestañas <b>Carta</b> y <b>Fotos</b>) o en <a href="' + esc(l.trip) + '" target="_blank" rel="noopener">TripAdvisor</a> (sus fotos). Arriba a la derecha sale un panel negro con el contador: pulsa <b>Bajar solo</b> en cada sección para que carguen todas.</li>' +
                '<li>Vuelve a esta pestaña: las fotos aparecen solas aquí. En cada una elige el plato y pulsa <b>Asignar</b>: se abre el plato con la foto lista para recortar; luego <b>Guardar</b>.</li></ol>' +
                '<p style="margin:4px 0 0;font-size:.82rem;color:#6b6f76">Sin extensión: pega abajo el enlace de una foto (la dirección de la barra de Maps con la foto abierta en grande, o la de la imagen) y pulsa Añadir.</p></details>' +
                Object.keys(pendientes).map(function (d) {
                    return '<div class="sfg-org" data-d="' + esc(d) + '">📍 <b>' + esc(d) + '</b>: ' + pendientes[d].length + ' fotos. ¿Son de esta web (' + esc(String(S.titulo || S.restaurante || '')) + ')? ' +
                        '<button type="button" data-si="1" class="sfg-b">Sí, añadirlas</button> <button type="button" data-si="0">No, son de otra web</button></div>';
                }).join('') +
                (function () {
                    var o = leerOrigenes(), mios = Object.keys(o).filter(function (d) { return o[d] === 'si'; }), no = Object.keys(o).filter(function (d) { return o[d] === 'no'; });
                    return (mios.length || no.length) ? '<div class="sfg-orgs">' + (mios.length ? 'Restaurantes de esta web: ' + mios.map(function (d) { return '<span>' + esc(d) + ' <a href="#" data-olv="' + esc(d) + '" title="Olvidar: volverá a preguntar">✕</a></span>'; }).join(' · ') : '') +
                        (no.length ? (mios.length ? ' &nbsp;|&nbsp; ' : '') + 'Ignorados: ' + no.map(function (d) { return '<span>' + esc(d) + ' <a href="#" data-olv="' + esc(d) + '" title="Olvidar: volverá a preguntar">✕</a></span>'; }).join(' · ') : '') + '</div>' : '';
                })() +
                '<div class="sfg-ir">' +
                '<div><a class="sfg-b sfg-gmaps" href="' + esc(en.maps || l.maps) + '" target="_blank" rel="noopener">🗺️ Abrir en Google Maps</a>' +
                '<input type="text" data-en="maps" value="' + esc(en.maps || '') + '" placeholder="Enlace del restaurante en Google Maps (opcional, se recuerda)"></div>' +
                '<div><a class="sfg-b sfg-trip" href="' + esc(en.trip || l.trip) + '" target="_blank" rel="noopener">🦉 Abrir en TripAdvisor</a>' +
                '<input type="text" data-en="trip" value="' + esc(en.trip || '') + '" placeholder="Enlace del restaurante en TripAdvisor (opcional, se recuerda)"></div></div>' +
                '<div class="sf-ext-fila" style="margin-top:10px"><input type="text" id="sfg-url" placeholder="Pega aquí enlaces de fotos (uno o varios)…"><button type="button" id="sfg-add" class="sfg-b">＋ Añadir</button></div>' +
                '<div class="sf-gal-cab" style="margin-top:12px"><b>' + (g.length - usadas) + ' sin asignar' + (usadas ? ' · ' + usadas + ' asignadas' : '') + '</b>' +
                (usadas ? '<label><input type="checkbox" id="sfg-usadas"' + (verUsadas ? ' checked' : '') + '> ver asignadas</label>' : '') +
                '<label title="Lado largo mínimo para que una foto sirva: las más pequeñas se ocultan y no se guardan">Mínimo <input type="number" id="sfg-min" min="0" step="100" value="' + minLado() + '" style="width:72px"> px</label>' +
                '<label><input type="checkbox" id="sfg-peq"' + (verPeq ? ' checked' : '') + '> ver pequeñas' + (nPeq ? ' (<span id="sfg-npeq">' + nPeq + '</span>)' : ' (<span id="sfg-npeq">0</span>)') + '</label>' +
                '<input type="text" id="sfg-filtro" placeholder="Buscar por nombre…" value="' + esc(filtro) + '" style="width:170px">' +
                (g.length ? '<button type="button" id="sfg-guardar" title="Descarga todas las fotos de la lista a su tamaño original">💾 Guardar todas en el PC</button><button type="button" id="sfg-vaciar">Vaciar lista</button>' : '') + '</div>' +
                (vis.length ? '<div class="sfg-rejilla">' + vis.map(function (o) {
                    var x = o.x, kf = claveFoto(x.u), sug = x.usada ? '' : sugerido(x.t);
                    var ed = editadas[kf];
                    return '<div class="sfg-card' + (x.usada ? ' usada' : '') + '" data-k="' + esc(kf) + '">' +
                        '<a href="' + esc(ed ? ed.url : urlsMaxima(x.u)[0]) + '" target="_blank" rel="noopener noreferrer" title="Ver en grande">' +
                        (ed ? '<img src="' + esc(ed.url) + '" alt="">' : imgPrevia(x.u, "this.closest('.sfg-card').style.display='none'")) + '</a>' +
                        '<div class="sfg-t" title="' + esc(x.t || '') + '">' + (x.t ? esc(x.t) : '<i>sin nombre</i>') + '</div>' +
                        '<div class="sfg-i' + (esPequena(x) ? ' peq' : '') + '">' + esc(infoTxt(x)) + (esPequena(x) ? ' · pequeña' : '') + '</div>' +
                        (ed ? '<div class="sfg-i" style="color:#2563eb">✂ editada: ' + esc(ed.info) + '</div>' : '') +
                        (x.usada ? '<div class="sfg-u">✔ ' + esc(x.usada) + '</div>' : '') +
                        '<div class="sfg-a"><button type="button" data-a="1" class="sfg-b" style="flex:1">Asignar a platos…</button></div>' +
                        '<div class="sfg-a2"><button type="button" data-ed="1" title="Recortar o girar antes de asignar">✂ Editar</button><button type="button" data-x="1" title="Quitar de la lista">✕ Quitar</button></div></div>';
                }).join('') + '</div>' : '<div class="sf-vacio">' + (g.length ? 'Ninguna con ese filtro.' : 'Todavía no hay fotos: sigue los pasos de arriba.') + '</div>') +
                '<p id="sf-msg"></p><div class="sf-bot"><button type="button" class="sf-no">Cerrar</button></div>';
            caja.querySelector('.sf-no').onclick = cerrar;
            var url = caja.querySelector('#sfg-url');
            caja.querySelector('#sfg-add').onclick = function () { var lista = deTexto(url.value); if (!lista.length) { avisar('Pega primero un enlace (empieza por https://).'); return; } meter(lista, 'añadidas'); };
            url.onkeydown = function (e) { if (e.key === 'Enter') caja.querySelector('#sfg-add').click(); };
            var fl = caja.querySelector('#sfg-filtro');
            fl.oninput = function () { filtro = fl.value; var pos = fl.selectionStart; pintarG(); var n = caja.querySelector('#sfg-filtro'); n.focus(); n.setSelectionRange(pos, pos); };
            var vu = caja.querySelector('#sfg-usadas'); if (vu) vu.onchange = function () { verUsadas = vu.checked; pintarG(); };
            caja.querySelectorAll('.sfg-org button').forEach(function (bt) {
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
                        if (repetidas(leerGaleria())[el.dataset.k]) { c.remove(); return; }
                        if (pq) {
                            var np = caja.querySelector('#sfg-npeq'); if (np) np.textContent = leerGaleria().filter(esPequena).length;
                            if (!verPeq) c.remove();
                        }
                    });
                });
            }, { root: caja, rootMargin: '200px' });
            caja.querySelectorAll('.sfg-card').forEach(function (el) {
                var gg = leerGaleria(), x = gg[indiceDe(gg, el.dataset.k)];
                if (x && !x.w && !x.err) obs.observe(el);
            });
            var va = caja.querySelector('#sfg-vaciar');
            if (va) va.onclick = function () {
                (window.confirmarEditor ? window.confirmarEditor('¿Vaciar la lista de fotos de internet? (no toca las fotos ya puestas en platos)') : Promise.resolve(confirm('¿Vaciar la lista?')))
                    .then(function (ok) { if (ok) { vaciarTodo(); pintarG(); contarBoton(); } });
            };
            caja.querySelectorAll('.sfg-card').forEach(function (el) {
                var g2 = function () { return leerGaleria(); };
                el.querySelector('[data-x]').onclick = function () {
                    var g = g2(), ix = indiceDe(g, el.dataset.k); if (ix < 0) return;
                    descartar(el.dataset.k); g.splice(ix, 1); guardarGaleria(g); el.remove(); contarBoton();
                    var cb = caja.querySelector('.sf-gal-cab b'), us = g.filter(function (q) { return q.usada; }).length;
                    if (cb) cb.textContent = (g.length - us) + ' sin asignar' + (us ? ' · ' + us + ' asignadas' : '');
                };
                var kf = el.dataset.k;
                el.querySelector('[data-ed]').onclick = async function () {
                    var bt = this, gg = g2(), x = gg[indiceDe(gg, kf)]; if (!x) return;
                    bt.disabled = true; bt.textContent = '⏳ Bajando…';
                    try {
                        var fuente = (editadas[kf] && editadas[kf].fuente) || await bajarMaxima(x.u);
                        if (!fuente) throw new Error('No se pudo descargar la foto original.');
                        var r = await recortar(fuente, x.t || 'foto');
                        if (r) {
                            if (editadas[kf]) URL.revokeObjectURL(editadas[kf].url);
                            editadas[kf] = { blob: r.blob, url: URL.createObjectURL(r.blob), fuente: fuente, info: r.info };
                            pintarG();
                            return;
                        }
                    } catch (e) { avisar(e.message || String(e)); }
                    bt.disabled = false; bt.textContent = '✂ Editar';
                };
                el.querySelector('[data-a]').onclick = async function () {
                    var bt = this, gg = g2(), x = gg[indiceDe(gg, kf)]; if (!x) return;
                    var ids = await elegirPlatos(x, kf, platos);
                    if (!ids || !ids.length) return;
                    bt.disabled = true; bt.textContent = '⏳';
                    try {
                        var blob = editadas[kf] && editadas[kf].blob;
                        if (!blob) {
                            avisar('Descargando la foto original…', '#555');
                            var orig = await bajarMaxima(x.u);
                            if (!orig) throw new Error('No se pudo descargar la foto (esa web no lo permite). Ábrela en grande, clic derecho → "Copiar imagen", y pégala con Ctrl+V en 📷 Fotos del plato.');
                            blob = (await aWebp(orig)).blob;
                        }
                        avisar('Subiendo a ' + ids.length + ' plato' + (ids.length > 1 ? 's' : '') + '…', '#555');
                        var r = await asignarVarios(blob, ids);
                        var ok = r.res.filter(function (q2) { return !q2.err; }), mal = r.res.filter(function (q2) { return q2.err; });
                        if (ok.length) {
                            var g3 = leerGaleria(), i3 = indiceDe(g3, kf);
                            if (i3 >= 0) { g3[i3].usada = ok.map(function (q2) { return q2.n; }).join(' + '); guardarGaleria(g3); }
                        }
                        pintarG(); contarBoton();
                        avisar((ok.length ? '✔ Puesta en ' + ok.map(function (q2) { return q2.p.id + ' ' + q2.n + ' (foto 0' + q2.num + ')'; }).join(', ') + '. En la web en 1-2 min.' : '') +
                            (mal.length ? ' ⚠ No: ' + mal.map(function (q2) { return q2.p.id + ' ' + q2.n + ' (' + q2.err + ')'; }).join(', ') + '.' : '') +
                            (r.cambiaCampo ? ' Algún plato no tenía foto: pulsa "GUARDAR CAMBIOS EN WEB" para que la enseñe.' : ''), ok.length ? '#15803d' : '#b42318');
                    } catch (e) {
                        avisar('No se pudo asignar: ' + (e.message || e)); bt.disabled = false; bt.textContent = 'Asignar';
                    }
                };
            });
        }
        alRecibir = pintarG;
        pintarG();
    }
    function botonCabecera() {
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
