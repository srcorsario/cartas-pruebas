// =========================================================================================
// marca.js — PLANTILLA NEUTRA: nombre, logos y QR propios del restaurante (editor en la web).
//   Solo actúa si sitio.json trae "marca" (webs nuevas). RG / US Open / Club House no lo llevan
//   y siguen exactamente igual (window.MARCA = null).
//   window.MARCA = { nombre, logo, logoMenu, qr, qrAlt, src(clave) }
//     logo     = cabecera de la web pública y del editor (y de las hojas imprimibles)
//     logoMenu = cabecera del Menú Especial (si está vacío, usa logo)
//     favicon  = icono de la pestaña del navegador (web y editor); vacío = el logo
//     qr/qrAlt = QR "Oficial" / "Alternativo" de las hojas de Sugerencias y Postres
//   Rutas relativas a la web (imagenes/marca/...). Se guardan en datos.json -> "marca"
//   (POST ?accion=marca, almacen-json.js) y van a datos/base.json (la web pública lo lee).
//   Botón "🏷️ Logos y QR" junto a 🌐 Idiomas, y ✏️ en el logo de la cabecera: subir / cambiar
//   (recorte + WebP con subir-foto.js) / quitar.
// Lo inserta construir.ps1 justo después de sitio-editor.js.
// =========================================================================================
(function () {
    'use strict';
    var S = window.EDITOR_SITIO;
    window.MARCA = null;
    if (!S || !S.marca) return;
    window.APP_VERSIONS = window.APP_VERSIONS || {};
    window.APP_VERSIONS.marca = '1.1.2'; // 9 nov: la imagen de ajustes (derecha de la cabecera del editor) ya no se oculta. 1.1.1, 4 nov: al subir/quitar, se repintan las hojas de Sugerencias/Postres abiertas. 1.1.0: 4 nov: favicon (icono de la pestaña)

    var CLAVES = [
        { k: 'logo', t: 'Logo del restaurante', d: 'Cabecera de la web, del editor y de las hojas de Sugerencias y Postres.', lado: 800, transparente: true },
        { k: 'logoMenu', t: 'Logo del Menú Especial', d: 'Cabecera del Menú Especial impreso. Vacío = el logo del restaurante.', lado: 800, transparente: true },
        { k: 'favicon', t: 'Icono de la pestaña (favicon)', d: 'El dibujito de la pestaña del navegador y del acceso directo del móvil. Mejor cuadrado (recorta en 1:1). Vacío = el logo.', lado: 512, transparente: true },
        { k: 'qr', t: 'QR oficial', d: 'Hojas de Sugerencias y Postres (opción "Oficial").', lado: 1000, calidad: 1 },
        { k: 'qrAlt', t: 'QR alternativo', d: 'Hojas de Sugerencias y Postres (opción "Alternativo").', lado: 1000, calidad: 1 }
    ];
    var M = window.MARCA = { nombre: S.marca.nombre || S.titulo || S.restaurante };
    CLAVES.forEach(function (c) { M[c.k] = S.marca[c.k] || ''; });
    // Ruta para usar en el editor (está en <web>/editor/, las imágenes en <web>/imagenes/).
    M.src = function (k) {
        var v = (k === 'logoMenu') ? (M.logoMenu || M.logo) : M[k];
        return v ? '../' + v : '';
    };
    M.aplicar = function (d) {
        if (!d || typeof d !== 'object') return;
        CLAVES.forEach(function (c) { if (c.k in d) M[c.k] = d[c.k] || ''; });
        if (d.nombre) M.nombre = d.nombre;
        pintar();
        try { window.dispatchEvent(new CustomEvent('marca-cambiada')); } catch (e) { }
    };

    var $ = function (id) { return document.getElementById(id); };
    var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

    // ---------- cabecera del editor ----------
    function pintar() {
        var izq = $('header-logo-rg'), der = $('header-logo-usopen');
        // 9 nov: la imagen de la derecha (ajustes.svg) se queda también en las webs neutras.
        if (izq) {
            izq.alt = M.nombre;
            izq.title = '✏️ Logos y QR';
            izq.style.cursor = 'pointer';
            izq.onclick = abrir;
            if (M.logo) { izq.src = M.src('logo'); izq.style.display = ''; } else izq.style.display = 'none';
        }
        var hueco = $('marca-logo-vacio');
        if (!hueco && izq) {
            hueco = document.createElement('button');
            hueco.id = 'marca-logo-vacio'; hueco.type = 'button';
            hueco.textContent = '✏️ Logo';
            hueco.title = 'Subir el logo del restaurante';
            hueco.style.cssText = 'width:120px; height:70px; border:2px dashed #cbd5e1; border-radius:10px; background:#f8fafc; color:#64748b; font-weight:600; cursor:pointer; flex:0 0 auto;';
            hueco.onclick = abrir;
            izq.parentNode.insertBefore(hueco, izq);
        }
        if (hueco) hueco.style.display = M.logo ? 'none' : '';
        var b = $('marca-btn');
        if (b) b.textContent = '🏷️ Logos y QR';
        document.title = 'Editor · ' + M.nombre;
        var ico = M.src('favicon') || M.src('logo');
        if (ico) {
            var l = document.querySelector('link[rel="icon"]');
            if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); }
            l.href = ico;
        }
    }
    function crearBoton() {
        if ($('marca-btn')) return;
        var ref = $('ew-btn-idiomas') || $('tabs-visibility-wrapper');
        if (!ref) return;
        var b = document.createElement('button');
        b.id = 'marca-btn'; b.type = 'button';
        b.title = 'Logo del restaurante, logo del Menú Especial y códigos QR de las hojas imprimibles.';
        b.style.cssText = 'font-size:0.7rem; display:flex; align-items:center; gap:4px; white-space:nowrap; background:#f8f9fa; padding:4px 8px; border-radius:4px; border:1px solid #ddd; cursor:pointer;';
        b.onclick = abrir;
        ref.parentNode.insertBefore(b, ref.nextSibling);
        pintar();
    }

    // ---------- guardar en datos.json (almacen-json.js) ----------
    async function guardar(cambios) {
        var url = typeof window.getWebAppUrl === 'function' ? window.getWebAppUrl(S.modo) : '';
        var r = await fetch(url + '?accion=marca', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ marca: cambios }) });
        var t = await r.text();
        if (!r.ok || /^Error/.test(t)) throw new Error(t);
        M.aplicar(cambios);
        refrescarHojas();
    }
    // Hojas imprimibles abiertas: repintar con el logo/QR nuevo.
    function refrescarHojas() {
        var vis = function (id) { var e = $(id); return e && e.offsetParent !== null; };
        try { if (vis('tab-sugerencias') && window.renderCarta) window.renderCarta(S.modo); } catch (e) { }
        try { if (vis('tab-postres') && window.renderHojaPostres) window.renderHojaPostres(S.modo); } catch (e) { }
    }

    // ---------- ventana ----------
    function abrir() {
        if ($('marca-fondo')) return;
        var fondo = document.createElement('div');
        fondo.id = 'marca-fondo';
        fondo.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:99990; display:flex; align-items:center; justify-content:center; padding:16px;';
        fondo.innerHTML = '<div style="background:#fff; color:#1f2328; border-radius:12px; max-width:640px; width:100%; padding:20px; max-height:92vh; overflow:auto; font:14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;">' +
            '<h3 style="margin:0 0 4px; font-size:1.1rem;">🏷️ Logos y QR de ' + esc(M.nombre) + '</h3>' +
            '<p style="margin:0 0 14px; color:#64748b; font-size:.85rem;">Cualquier imagen (PNG, JPG…): se recorta, se pasa a WebP y se sube a la web. Los cambios se ven en la web pública en 1-2 minutos.</p>' +
            '<div id="marca-filas"></div>' +
            '<div id="marca-msg" style="min-height:1.2em; margin-top:10px; font-size:.85rem;"></div>' +
            '<div style="display:flex; justify-content:flex-end; margin-top:12px;"><button type="button" id="marca-cerrar" style="padding:8px 14px; border-radius:6px; border:1px solid #cbd5e1; background:#f1f5f9; cursor:pointer;">Cerrar</button></div></div>';
        document.body.appendChild(fondo);
        $('marca-cerrar').onclick = function () { fondo.remove(); };
        fondo.addEventListener('click', function (e) { if (e.target === fondo) fondo.remove(); });
        filas();
    }
    function mensaje(t, color) { var m = $('marca-msg'); if (m) { m.textContent = t; m.style.color = color || '#334155'; } }
    function filas() {
        var cont = $('marca-filas');
        if (!cont) return;
        cont.innerHTML = CLAVES.map(function (c) {
            var src = M[c.k] ? '../' + M[c.k] : '';
            var vista = src
                ? '<img src="' + esc(src) + '" alt="" style="max-width:100%; max-height:100%; object-fit:contain;">'
                : '<span style="color:#94a3b8; font-size:.75rem;">' + ((c.k === 'logoMenu' || c.k === 'favicon') && M.logo ? '(usa el logo)' : 'vacío') + '</span>';
            return '<div style="display:flex; gap:12px; align-items:center; border:1px solid #e2e8f0; border-radius:10px; padding:10px; margin-bottom:8px;">' +
                '<div style="width:110px; height:70px; flex:0 0 auto; background:repeating-conic-gradient(#f1f5f9 0 25%, #fff 0 50%) 0 0/16px 16px; border-radius:6px; display:flex; align-items:center; justify-content:center; overflow:hidden;">' + vista + '</div>' +
                '<div style="flex:1; min-width:0;"><b>' + c.t + '</b><div style="font-size:.78rem; color:#64748b;">' + c.d + '</div></div>' +
                '<div style="display:flex; flex-direction:column; gap:4px;">' +
                '<button type="button" data-subir="' + c.k + '" style="padding:5px 10px; border-radius:6px; border:0; background:#1f2328; color:#fff; cursor:pointer; font-size:.8rem;">✏️ ' + (src ? 'Cambiar' : 'Subir') + '</button>' +
                (src ? '<button type="button" data-quitar="' + c.k + '" style="padding:5px 10px; border-radius:6px; border:1px solid #fecaca; background:#fff; color:#b42318; cursor:pointer; font-size:.8rem;">🗑 Quitar</button>' : '') +
                '</div></div>';
        }).join('');
        cont.querySelectorAll('[data-subir]').forEach(function (b) { b.onclick = function () { subir(b.dataset.subir); }; });
        cont.querySelectorAll('[data-quitar]').forEach(function (b) { b.onclick = function () { quitar(b.dataset.quitar); }; });
    }
    var ocupado = false;
    function subir(k) {
        if (ocupado) return;
        if (!window.SubirFoto || !window.SubirFoto.subirImagen) { alert('Falta subir-foto.js en el editor (CONSTRUIR).'); return; }
        var c = CLAVES.find(function (x) { return x.k === k; });
        var inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = async function () {
            var f = inp.files && inp.files[0];
            if (!f) return;
            ocupado = true;
            try {
                mensaje('⏳ Subiendo ' + c.t.toLowerCase() + '…');
                var ruta = 'imagenes/marca/' + k.toLowerCase() + '.webp';
                var r = await window.SubirFoto.subirImagen(f, ruta, c.t, { maxLado: c.lado, calidad: c.calidad || 0.9, transparente: !!c.transparente });
                if (!r) { mensaje(''); return; }
                var cambio = {}; cambio[k] = r + '?v=' + Date.now().toString(36);
                await guardar(cambio);
                mensaje('✔ ' + c.t + ' guardado.', '#15803d');
                filas();
            } catch (err) {
                mensaje('No se pudo subir: ' + (err.message || err), '#b42318');
            } finally { ocupado = false; }
        };
        inp.click();
    }
    async function quitar(k) {
        if (ocupado) return;
        var c = CLAVES.find(function (x) { return x.k === k; });
        var ok = window.confirmarEditor ? await window.confirmarEditor('¿Quitar ' + c.t.toLowerCase() + '?', { si: 'Quitar', no: 'Cancelar' }) : true;
        if (!ok) return;
        ocupado = true;
        try {
            mensaje('⏳ Guardando…');
            var cambio = {}; cambio[k] = '';
            await guardar(cambio);
            mensaje('✔ Quitado.', '#15803d');
            filas();
        } catch (err) {
            mensaje('No se pudo guardar: ' + (err.message || err), '#b42318');
        } finally { ocupado = false; }
    }

    // ---------- sin tenis: carga genérica ----------
    var css = document.createElement('style');
    css.textContent = '.loading-tenis > *{display:none !important}' +
        '.loading-tenis{display:flex;align-items:center;justify-content:center;min-height:90px}' +
        '.loading-tenis::after{content:"";width:46px;height:46px;border-radius:50%;border:5px solid rgba(255,255,255,.35);border-top-color:var(--primario,#e67e22);animation:marcaGira .9s linear infinite}' +
        '@keyframes marcaGira{to{transform:rotate(360deg)}}';
    document.head.appendChild(css);

    document.addEventListener('DOMContentLoaded', function () { setTimeout(pintar, 0); });
    window.addEventListener('load', function () { pintar(); setTimeout(crearBoton, 600); });
})();
