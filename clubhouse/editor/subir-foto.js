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
    window.APP_VERSIONS.subirFoto = '1.5.1'; // 7 nov: escáner: <picture><source>, data-src, alt, galería por encima (TripAdvisor). 1.5.0: escáner sin innerHTML (Google lo bloquea: Trusted Types) + nombre del plato de cada foto + sugerencias por nombre. 1.4.0: escáner a fondo (escucha fetch/XHR, datos internos, bajar solo). 1.3.0: escáner de fotos (marcador) + galería para asignar a cada plato. 1.2.0: traer fotos de Google Maps / TripAdvisor (enlaces + pegar Ctrl+V, arrastrar o URL). 1.1.0: subirImagen() para logos y QR (marca.js)

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
    function claveFoto(u) { var id = idGoogle(u); if (id) return 'g:' + id; return String(u).replace(/[?#].*$/, '').replace(/=[^\/=]*$/, '').replace(/\/photo-[a-z]\//, '/photo-?/'); }
    function leerGaleria() { try { return JSON.parse(localStorage.getItem(CLAVE_G) || '[]') || []; } catch (e) { return []; } }
    function guardarGaleria(g) { try { localStorage.setItem(CLAVE_G, JSON.stringify(g.slice(-400))); } catch (e) { } }
    function sumarEscaneo(lista) {
        var g = leerGaleria(), v = {}, n = 0;
        g.forEach(function (x) { v[claveFoto(x.u)] = 1; });
        var porClave = {};
        g.forEach(function (x) { porClave[claveFoto(x.u)] = x; });
        (Array.isArray(lista) ? lista : []).forEach(function (o) {
            var u = typeof o === 'string' ? o : o && o.u, t = o && typeof o === 'object' ? String(o.t || '').slice(0, 80) : '';
            if (typeof u !== 'string' || !/^https:\/\//.test(u)) return;
            var c = claveFoto(u);
            if (v[c]) { if (t && porClave[c] && !porClave[c].t) porClave[c].t = t; return; }
            v[c] = 1; var x = { u: u }; if (t) x.t = t; g.push(x); porClave[c] = x; n++;
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
    function escaner() {
        if (window.__fotosCarta) { window.__fotosCarta.mostrar(); return; }
        var L = [], V = {}, ui = {};
        var RX = /https:\/\/[a-z0-9.-]*(?:googleusercontent|ggpht)\.com\/[^"'\s\\)<>,\]}|!]+|https:\/\/(?:dynamic-media-cdn|media-cdn)\.tripadvisor\.com\/media\/[^"'\s\\)<>,\]}|!]+/g;
        function idG(u) { var m = u.match(/googleusercontent\.com\/([^=!?&#\s"')]+)/); return m ? m[1] : ''; }
        function k(u) { var id = idG(u); if (id) return 'g:' + id; return u.replace(/[?#].*$/, '').replace(/=[^\/=]*$/, '').replace(/\/photo-[a-z]\//, '/photo-?/'); }
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
            if (V[c]) { if (tit && !V[c].t) V[c].t = tit; return; }
            V[c] = { u: u }; if (tit) V[c].t = tit;
            L.push(V[c]); pintar();
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
        texto(document.documentElement.innerHTML);
        document.querySelectorAll('script').forEach(function (sc) { texto(sc.textContent); });
        barrer();
        var reloj = setInterval(barrer, 1500);

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
            : 'Sigue escuchando: en Maps abre la pestaña Carta (o Fotos), cambia de sección y usa "Bajar solo". Todo lo que cargue se suma.', d);
        var fila = el('div', 'display:flex;gap:6px', '', d);
        ui.b = el('button', 'flex:1;padding:6px;border:0;border-radius:6px;cursor:pointer;background:#fff;color:#1f2328', '\u21E3 Bajar solo', fila);
        var bk = el('button', 'flex:1;padding:6px;border:0;border-radius:6px;background:#16a34a;color:#fff;font-weight:700;cursor:pointer', 'Copiar', fila);
        ui.msg = el('div', 'font-size:11px;margin-top:6px;min-height:14px', '', d);
        ui.b.onclick = bajar;
        bk.onclick = copiar;
        cerrarX.onclick = function () { d.remove(); };
        function pintar() { if (!ui.n) return; ui.n.textContent = L.length + ' fotos'; ui.b.textContent = bajando ? '■ Parar' : '⇣ Bajar solo'; }
        document.body.appendChild(d);
        pintar();
        window.__fotosCarta = { mostrar: function () { if (!document.body.contains(d)) document.body.appendChild(d); barrer(); pintar(); } };
    }
    var MARCADOR = 'javascript:' + encodeURIComponent('(' + escaner.toString() + ')();void 0');

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
        '.sf-ext-fila a.sf-marcador{background:#1f2328;color:#fff;border-color:#1f2328;cursor:grab}' +
        '.sf-gal-cab{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:.82rem}.sf-gal-cab button{padding:3px 8px;border:1px solid #d6d2c6;border-radius:6px;background:#fff;cursor:pointer;font-size:.75rem}' +
        '.sf-gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:6px;max-height:330px;overflow:auto}' +
        '.sf-g{position:relative;aspect-ratio:1;border-radius:7px;overflow:hidden;cursor:pointer;background:#e5e7eb}.sf-g img{width:100%;height:100%;object-fit:cover;display:block}' +
        '.sf-g.parece{outline:3px solid #f59e0b;outline-offset:-3px}.sf-g:hover{outline:3px solid #16a34a;outline-offset:-3px}.sf-g.usada{opacity:.45}.sf-g.aqui{outline:3px solid #2563eb;outline-offset:-3px}' +
        '.sf-g span{position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,.65);color:#fff;font-size:.68rem;padding:2px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
        '.sf-g button{position:absolute;top:3px;right:3px;border:0;border-radius:50%;width:20px;height:20px;background:rgba(0,0,0,.6);color:#fff;cursor:pointer;font-size:.7rem;line-height:20px;padding:0}' +
        '.sf-btn{margin-top:6px;padding:5px 9px;border-radius:7px;border:1px solid #cbd5e1;background:#f8fafc;cursor:pointer;font-size:.78rem;white-space:nowrap}';

    async function gestor() {
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
        fondo.innerHTML = '<div id="sf-caja"><h3>📷 Fotos del plato</h3><p class="sf-sub">Cargando…</p></div>';
        document.body.appendChild(fondo);
        var caja = fondo.querySelector('#sf-caja');
        var urls = [];
        var cerrar = function () { urls.forEach(URL.revokeObjectURL); fondo.remove(); document.removeEventListener('paste', alPegar); };
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
            var np = nombrePlato() + ' ' + String((document.getElementById('edit-en') || {}).value || p.en || '');
            var vis = g.map(function (x, i) { return { x: x, i: i, p: x.t ? parecido(np, x.t) : 0 }; })
                .filter(function (o) { return verUsadas || !o.x.usada || enEstePlato(o.x.u); })
                .sort(function (a, b) { return (b.p - a.p) || (a.i - b.i); });
            var nPar = vis.filter(function (o) { return o.p > 0; }).length;
            return '<div class="sf-gal-cab"><b>Fotos escaneadas: ' + (g.length - usadas) + ' sin usar' + (usadas ? ' · ' + usadas + ' usadas' : '') + '</b>' +
                (usadas ? '<label><input type="checkbox" id="sf-ver-usadas"' + (verUsadas ? ' checked' : '') + '> ver usadas</label>' : '') +
                '<button type="button" id="sf-gal-vaciar">Vaciar lista</button><small>' + (nPar ? '★ ' + nPar + ' parecen este plato (salen primero). ' : '') + 'Pulsa una para ponerla en este plato.</small></div>' +
                (vis.length ? '<div class="sf-gal">' + vis.map(function (o) {
                    var aqui = enEstePlato(o.x.u);
                    return '<div class="sf-g' + (aqui ? ' aqui' : o.x.usada ? ' usada' : o.p ? ' parece' : '') + '" data-g="' + o.i + '" title="' + esc((o.x.t ? o.x.t + ' · ' : '') + (o.x.usada ? 'Usada en: ' + o.x.usada : 'Poner en este plato')) + '">' +
                        '<img loading="lazy" referrerpolicy="no-referrer" src="' + esc(o.x.u) + '" alt="" onerror="this.parentNode.style.display=\'none\'">' +
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
                    .then(function (ok) { if (ok) { guardarGaleria([]); pintar(); } });
            };
            caja.querySelectorAll('.sf-g').forEach(function (el) {
                el.onclick = async function (e) {
                    var g = leerGaleria(), x = g[+el.dataset.g];
                    if (!x) return;
                    if (e.target.dataset.x) { g.splice(+el.dataset.g, 1); guardarGaleria(g); pintar(); return; }
                    if (enEstePlato(x.u)) { avisar('Esa foto ya está en este plato.', '#b45309'); return; }
                    await añadirUrl(x.u, claveFoto(x.u));
                };
            });
        }
        function pintar() {
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
                '<div class="sf-ext-fila"><a class="sf-marcador" href="' + esc(MARCADOR) + '" title="Arrástralo a la barra de marcadores (Ctrl+Mayús+B la muestra)">📥 Escanear fotos</a>' +
                '<small>← arrástralo una vez a la barra de marcadores. En Maps/TripAdvisor: pulsa el marcador, abre las Fotos del restaurante, usa "Bajar solo" y cambia de pestaña (Comida, Menú…); al terminar, Copiar y aquí Ctrl+V.</small></div>' +
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
    window.SubirFoto = { retirar: retirar, subirImagen: subirImagen };

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
