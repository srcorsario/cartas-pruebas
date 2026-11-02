// =========================================================================================
// subir-foto.js — "📷 Subir foto" en la ficha del plato (editor dentro de la web).
//   Elige una imagen (jpg, png, webp, gif, avif, bmp... lo que abra el navegador), la reduce
//   para que no pese (lado largo máx. MAX_LADO px) y la pasa a WebP en el propio navegador.
//   La sube a GitHub junto a datos.json:  <web>/imagenes/<carpeta>/<nombre>0N.webp
//   (N = 1..4; la web enseña la 01 como principal y 02-04 en la galería del plato).
//   Si el navegador no sabe crear WebP (Safari antiguo) usa el codificador libwebp de jSquash.
// Lo inserta construir.ps1 en <web>/editor/. Usa el token de la sesión (login.html).
// =========================================================================================
(function () {
    'use strict';
    var S = window.EDITOR_SITIO;
    if (!S) return;

    var MAX_LADO = 1600, CALIDAD = 0.82, MAX_FOTOS = 4;
    var JSQUASH = 'https://cdn.jsdelivr.net/npm/@jsquash/webp@1.5.0/encode.js';
    var API = 'https://api.github.com/repos/' + S.repo + '/contents/';
    var dirWeb = S.ruta.replace(/[^/]*$/, '');   // carpeta de datos.json en el repo = la web

    function token() {
        try { return sessionStorage.getItem(S.claveToken) || localStorage.getItem(S.claveToken) || ''; } catch (e) { return ''; }
    }
    function gh(ruta, opciones) {
        opciones = opciones || {};
        opciones.cache = 'no-store';
        opciones.headers = { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github+json' };
        return fetch(API + ruta.split('/').map(encodeURIComponent).join('/'), opciones).then(function (r) {
            if (r.status === 401 && window.AccesoEditor) window.AccesoEditor.caducado();
            return r;
        });
    }
    function slug(t) {
        return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
            .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
    }
    function kb(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB'; }
    function blobAB64(blob) {
        return new Promise(function (ok, ko) {
            var fr = new FileReader();
            fr.onload = function () { ok(String(fr.result).split(',')[1]); };
            fr.onerror = ko;
            fr.readAsDataURL(blob);
        });
    }

    // ---------- plato abierto en la ficha (variables de app.js) ----------
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
            img.onerror = function () { URL.revokeObjectURL(url); ko(new Error('El navegador no reconoce ese archivo como imagen' + (/hei[cf]/i.test(file.name) ? ' (HEIC del iPhone: en Ajustes > Cámara > Formatos elige "Más compatible", o hazle una captura)' : '') + '.')); };
            img.src = url;
        });
    }
    async function aWebp(file) {
        var img = await abrirImagen(file);
        var w = img.width, h = img.height, f = Math.min(1, MAX_LADO / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * f)), ch = Math.max(1, Math.round(h * f));
        var c = document.createElement('canvas');
        c.width = cw; c.height = ch;
        var cx = c.getContext('2d');
        cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
        cx.drawImage(img, 0, 0, cw, ch);
        var blob = await new Promise(function (ok) { c.toBlob(ok, 'image/webp', CALIDAD); });
        if (!blob || blob.type !== 'image/webp') {
            var mod = await import(JSQUASH);
            var buf = await mod.default(cx.getImageData(0, 0, cw, ch), { quality: Math.round(CALIDAD * 100) });
            blob = new Blob([buf], { type: 'image/webp' });
        }
        return { blob: blob, ancho: cw, alto: ch, anchoOrig: w, altoOrig: h };
    }

    // ---------- ventana ----------
    var css = '#sf-fondo{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px}' +
        '#sf-caja{background:#fff;color:#1f2328;border-radius:12px;max-width:440px;width:100%;padding:20px;font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;max-height:92vh;overflow:auto}' +
        '#sf-caja h3{margin:0 0 12px;font-size:1.1rem}#sf-caja img{display:block;max-width:100%;max-height:260px;margin:0 auto 10px;border-radius:8px}' +
        '#sf-caja label{display:block;font-size:.8rem;color:#555;margin:10px 0 4px}#sf-caja input[type=text],#sf-caja select{width:100%;padding:8px;border:1px solid #ccc;border-radius:7px;font:inherit}' +
        '#sf-caja .sf-info{font-size:.82rem;color:#555}#sf-caja .sf-msg{min-height:1.2em;margin-top:10px;font-size:.85rem}' +
        '#sf-caja .sf-bot{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}#sf-caja button{padding:9px 14px;border-radius:8px;border:0;cursor:pointer;font:600 14px system-ui,sans-serif}' +
        '#sf-caja .sf-ok{background:#16a34a;color:#fff}#sf-caja .sf-no{background:#e5e7eb}#sf-caja button:disabled{opacity:.5;cursor:progress}' +
        '.sf-btn{margin-top:6px;padding:5px 9px;border-radius:7px;border:1px solid #cbd5e1;background:#f8fafc;cursor:pointer;font-size:.78rem;white-space:nowrap}';

    async function huecos(carpeta, base) {
        var ocupados = {};
        try {
            var r = await gh(dirWeb + 'imagenes/' + carpeta);
            if (r.ok) (await r.json()).forEach(function (f) {
                var m = f.name.match(/^(.*)0(\d)\.webp$/i);
                if (m && m[1] === base) ocupados[m[2]] = f.sha;
            });
        } catch (e) { }
        return ocupados;
    }

    async function dialogo(file) {
        var p = platoActual();
        if (!p) { alert('Abre primero la ficha de un plato.'); return; }
        var carpeta = String(p.carpeta || '').trim();
        if (!carpeta) { alert('Este plato no tiene carpeta de fotos (columna Carpeta).'); return; }
        var actual = (document.getElementById('edit-imagen') || {}).value || p.imagen || '';
        var m = String(actual).match(/^(.*)0\d\.webp$/i);
        var base = m ? m[1] : slug((document.getElementById('edit-es') || {}).value || p.es || ('plato_' + p.id));

        var fondo = document.createElement('div');
        fondo.id = 'sf-fondo';
        fondo.innerHTML = '<div id="sf-caja"><h3>📷 Subir foto</h3><div class="sf-info">Preparando la imagen…</div></div>';
        document.body.appendChild(fondo);
        var caja = fondo.querySelector('#sf-caja');
        var cerrar = function () { fondo.remove(); };

        var res;
        try { res = await aWebp(file); }
        catch (e) { caja.innerHTML = '<h3>📷 Subir foto</h3><p class="sf-msg" style="color:#b42318">' + (e.message || e) + '</p><div class="sf-bot"><button class="sf-no">Cerrar</button></div>'; caja.querySelector('.sf-no').onclick = cerrar; return; }
        var urlPrev = URL.createObjectURL(res.blob);
        var ocupados = await huecos(carpeta, base);
        var libre = 1; while (ocupados[libre] && libre < MAX_FOTOS) libre++;
        if (!actual) libre = 1;
        var opciones = '';
        for (var i = 1; i <= MAX_FOTOS; i++) opciones += '<option value="' + i + '"' + (i === libre ? ' selected' : '') + '>' + i + (i === 1 ? ' — principal' : ' — galería') + (ocupados[i] ? ' (sustituye la que hay)' : '') + '</option>';

        caja.innerHTML = '<h3>📷 Subir foto</h3><img alt="" src="' + urlPrev + '">' +
            '<div class="sf-info">' + res.anchoOrig + '×' + res.altoOrig + ' (' + kb(file.size) + ') → <b>' + res.ancho + '×' + res.alto + ' WebP, ' + kb(res.blob.size) + '</b></div>' +
            '<label>Nombre del archivo</label><input type="text" id="sf-base" value="' + base + '">' +
            '<label>Foto nº</label><select id="sf-num">' + opciones + '</select>' +
            '<div class="sf-info" style="margin-top:6px">Se guarda en imagenes/' + carpeta + '/</div>' +
            '<p class="sf-msg" id="sf-msg"></p>' +
            '<div class="sf-bot"><button class="sf-no">Cancelar</button><button class="sf-ok">Subir</button></div>';
        caja.querySelector('.sf-no').onclick = function () { URL.revokeObjectURL(urlPrev); cerrar(); };
        caja.querySelector('#sf-base').oninput = async function () {
            this.value = slug(this.value);
        };
        caja.querySelector('.sf-ok').onclick = async function () {
            var btn = this, msg = caja.querySelector('#sf-msg');
            var b = slug(caja.querySelector('#sf-base').value), n = +caja.querySelector('#sf-num').value;
            if (!b) { msg.textContent = 'Falta el nombre.'; return; }
            btn.disabled = true; msg.style.color = '#555'; msg.textContent = 'Subiendo…';
            try {
                var ruta = dirWeb + 'imagenes/' + carpeta + '/' + b + '0' + n + '.webp';
                var previo = await gh(ruta);
                var cuerpo = { message: 'Foto ' + b + '0' + n + '.webp (plato ' + p.id + ')', content: await blobAB64(res.blob) };
                if (previo.ok) cuerpo.sha = (await previo.json()).sha;
                var r = await gh(ruta, { method: 'PUT', body: JSON.stringify(cuerpo) });
                if (!r.ok) throw new Error('GitHub HTTP ' + r.status);
                var campo = document.getElementById('edit-imagen');
                if (campo && (n === 1 || !campo.value)) campo.value = b + '01.webp';
                msg.style.color = '#15803d';
                msg.textContent = '✔ Subida. ' + (n === 1 ? 'Pulsa "Aplicar Cambios" y "Guardar cambios en web".' : 'Ya sale en la galería del plato.') + ' Puede tardar 1-2 min en verse.';
                btn.textContent = 'Hecho'; btn.disabled = false;
                btn.onclick = function () { URL.revokeObjectURL(urlPrev); cerrar(); };
            } catch (e) {
                msg.style.color = '#b42318'; msg.textContent = 'No se pudo subir: ' + (e.message || e);
                btn.disabled = false;
            }
        };
    }

    document.addEventListener('DOMContentLoaded', function () {
        var campo = document.getElementById('edit-imagen');
        if (!campo) return;
        var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
        var entrada = document.createElement('input');
        entrada.type = 'file'; entrada.accept = 'image/*'; entrada.style.display = 'none';
        entrada.onchange = function () { var f = entrada.files[0]; entrada.value = ''; if (f) dialogo(f); };
        var btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'sf-btn'; btn.textContent = '📷 Subir foto';
        btn.onclick = function () { entrada.click(); };
        campo.insertAdjacentElement('afterend', btn);
        campo.parentNode.appendChild(entrada);
    });
})();
