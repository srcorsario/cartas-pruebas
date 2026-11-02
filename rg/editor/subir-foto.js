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
    async function canvasAWebp(c) {
        var blob = await new Promise(function (ok) { c.toBlob(ok, 'image/webp', CALIDAD); });
        if (!blob || blob.type !== 'image/webp') {
            var mod = await import(JSQUASH);
            var buf = await mod.default(c.getContext('2d').getImageData(0, 0, c.width, c.height), { quality: Math.round(CALIDAD * 100) });
            blob = new Blob([buf], { type: 'image/webp' });
        }
        return blob;
    }
    // Sin recorte (si no carga Cropper.js): solo reducir.
    async function aWebp(file) {
        var img = await abrirImagen(file);
        var w = img.width, h = img.height, f = Math.min(1, MAX_LADO / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * f)), ch = Math.max(1, Math.round(h * f));
        var c = document.createElement('canvas');
        c.width = cw; c.height = ch;
        var cx = c.getContext('2d');
        cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
        cx.drawImage(img, 0, 0, cw, ch);
        var blob = await canvasAWebp(c);
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
    async function recortar(fuente, titulo) {
        try { await cargarCropper(); } catch (e) { return await aWebp(fuente); }
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
                    var w = Math.round(e.detail.width), h = Math.round(e.detail.height), f = Math.min(1, MAX_LADO / Math.max(w, h));
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
                var f = Math.min(1, MAX_LADO / Math.max(d.width, d.height));
                var c = cr.getCroppedCanvas({ width: Math.round(d.width * f), height: Math.round(d.height * f), imageSmoothingEnabled: true, imageSmoothingQuality: 'high', fillColor: '#fff' });
                var blob = await canvasAWebp(c);
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
        var cerrar = function () { urls.forEach(URL.revokeObjectURL); fondo.remove(); };

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
        function pintar() {
            caja.innerHTML = '<h3>📷 Fotos del plato</h3>' +
                '<p class="sf-sub">imagenes/' + esc(carpeta) + '/ · la web enseña la 01 y luego 02, 03, 04 seguidas. Al guardar se renumeran sin huecos.' +
                (huecosAviso ? ' <b style="color:#b45309">Había huecos en la numeración: se corrigen al guardar.</b>' : '') + '</p>' +
                '<label style="font-size:.82rem;color:#555">Nombre de las fotos: </label><input type="text" id="sf-base" value="' + esc(base) + '"> <small style="color:#6b6f76">→ ' + esc(base) + '01.webp…</small>' +
                '<h4>En la web (' + activas.length + '/' + MAX_FOTOS + ')</h4>' +
                (activas.length ? '<div class="sf-rejilla">' + activas.map(function (x, i) { return tarjeta(x, i, true); }).join('') + '</div>' : '<div class="sf-vacio">Ninguna: el plato sale sin 📸 en la web.</div>') +
                (desact.length ? '<h4>Desactivadas</h4><div class="sf-rejilla">' + desact.map(function (x, i) { return tarjeta(x, i, false); }).join('') + '</div>' : '') +
                '<p id="sf-msg"></p>' +
                '<div class="sf-bot"><button class="sf-add" ' + (activas.length >= MAX_FOTOS ? 'disabled' : '') + '>＋ Añadir fotos</button>' +
                '<button class="sf-no">Cancelar</button><button class="sf-ok">Guardar</button></div>';
            caja.querySelector('#sf-base').oninput = function () { base = slug(this.value) || base; };
            caja.querySelector('#sf-base').onchange = function () { pintar(); };
            caja.querySelector('.sf-no').onclick = function () { if (!guardando) cerrar(); };
            caja.querySelector('.sf-add').onclick = function () { entrada.click(); };
            caja.querySelector('.sf-ok').onclick = guardar;
            caja.querySelectorAll('.sf-foto button').forEach(function (b) {
                b.onclick = function () {
                    var t = b.closest('.sf-foto'), lista = t.dataset.l === 'a' ? activas : desact, i = +t.dataset.i, x = lista[i];
                    switch (b.dataset.a) {
                        case 'izq': lista.splice(i, 1); lista.splice(i - 1, 0, x); break;
                        case 'der': lista.splice(i, 1); lista.splice(i + 1, 0, x); break;
                        case 'pri': lista.splice(i, 1); lista.unshift(x); break;
                        case 'off': activas.splice(i, 1); desact.push(x); break;
                        case 'on': desact.splice(i, 1); activas.push(x); break;
                        case 'del': if (!confirm('¿Eliminar esta foto del todo?')) return; lista.splice(i, 1); break;
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
        entrada.onchange = async function () {
            var files = Array.prototype.slice.call(entrada.files); entrada.value = '';
            var msg = caja.querySelector('#sf-msg');
            for (var k = 0; k < files.length; k++) {
                if (activas.length >= MAX_FOTOS) { msg.style.color = '#b45309'; msg.textContent = 'Máximo ' + MAX_FOTOS + ' fotos activas: desactiva o elimina alguna.'; break; }
                msg.style.color = '#555'; msg.textContent = 'Preparando ' + files[k].name + '…';
                try {
                    var r = await recortar(files[k], files[k].name + ' (' + kb(files[k].size) + ')');
                    if (!r) continue;
                    var u = URL.createObjectURL(r.blob); urls.push(u);
                    activas.push({ blob: r.blob, fuente: files[k], url: u, info: r.info });
                    pintar();
                } catch (e) { msg = caja.querySelector('#sf-msg'); msg.style.color = '#b42318'; msg.textContent = e.message || String(e); return; }
            }
        };

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

    document.addEventListener('DOMContentLoaded', function () {
        var campo = document.getElementById('edit-imagen');
        if (!campo) return;
        var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
        var btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'sf-btn'; btn.textContent = '📷 Fotos del plato';
        btn.onclick = gestor;
        campo.insertAdjacentElement('afterend', btn);
    });
})();
