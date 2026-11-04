// =========================================================================================
// contacto.js — "📍 Contacto" (cabecera del editor, junto a 🌐 Idiomas). TODAS las webs.
//   Dirección (+ Google Maps), teléfono, correo y horario de cada día. Se guarda en datos.json ->
//   "contacto" (POST ?accion=contacto, almacen-json.js) y va a datos/base.json: la web pública
//   enseña la pestaña "Contacto y horario" (la última) solo si hay algún dato.
//   Horario: texto libre por día (p. ej. "13:00–16:00 · 20:00–23:30"); vacío = cerrado. Los
//   nombres de los días los traduce la web sola.
// Lo inserta construir.ps1 en <web>/editor/.
// =========================================================================================
(function () {
    'use strict';
    var S = window.EDITOR_SITIO;
    if (!S) return;
    window.APP_VERSIONS = window.APP_VERSIONS || {};
    window.APP_VERSIONS.contacto = '1.0.0';

    var DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    var $ = function (id) { return document.getElementById(id); };
    var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var IN = 'padding:7px 9px; border:1px solid #cbd5e1; border-radius:7px; font:inherit; width:100%; box-sizing:border-box;';

    function crearBoton() {
        if ($('contacto-btn')) return;
        var ref = $('marca-btn') || $('ew-btn-idiomas') || $('tabs-visibility-wrapper');
        if (!ref) return;
        var b = document.createElement('button');
        b.id = 'contacto-btn'; b.type = 'button'; b.textContent = '📍 Contacto';
        b.title = 'Dirección, Google Maps, teléfono y horario: pestaña "Contacto y horario" de la web.';
        b.style.cssText = 'font-size:0.7rem; display:flex; align-items:center; gap:4px; white-space:nowrap; background:#f8f9fa; padding:4px 8px; border-radius:4px; border:1px solid #ddd; cursor:pointer;';
        b.onclick = abrir;
        ref.parentNode.insertBefore(b, ref.nextSibling);
    }

    function mapaUrl(q) { return q ? 'https://maps.google.com/maps?q=' + encodeURIComponent(q) + '&z=16&output=embed' : ''; }

    function abrir() {
        if ($('contacto-fondo')) return;
        var c = window.CONTACTO_WEB || {};
        var h = Array.isArray(c.horario) ? c.horario : [];
        var fondo = document.createElement('div');
        fondo.id = 'contacto-fondo';
        fondo.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:99990; display:flex; align-items:center; justify-content:center; padding:16px;';
        fondo.innerHTML = '<div style="background:#fff; color:#1f2328; border-radius:12px; max-width:720px; width:100%; padding:20px; max-height:92vh; overflow:auto; font:14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;">' +
            '<h3 style="margin:0 0 4px; font-size:1.1rem;">📍 Contacto y horario</h3>' +
            '<p style="margin:0 0 14px; color:#64748b; font-size:.85rem;">Sale en la web como la última pestaña, "Contacto y horario", en todos los idiomas. Si lo dejas todo vacío, la pestaña no sale.</p>' +
            '<div style="display:grid; gap:10px;">' +
            '<label><b>Dirección</b><textarea id="ct-dir" rows="2" style="' + IN + '" placeholder="Calle, número, código postal, población">' + esc(c.direccion) + '</textarea></label>' +
            '<label><b>Buscar en Google Maps</b> <small style="color:#64748b;">(opcional: nombre del sitio o coordenadas si la dirección sola no lo encuentra bien)</small>' +
            '<input id="ct-mapa" style="' + IN + '" placeholder="p. ej. Restaurante X, Manacor" value="' + esc(c.mapa) + '"></label>' +
            '<div id="ct-vista" style="border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; height:200px; background:#f8fafc;"></div>' +
            '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">' +
            '<label><b>Teléfono</b><input id="ct-tel" style="' + IN + '" placeholder="+34 971 00 00 00" value="' + esc(c.telefono) + '"></label>' +
            '<label><b>Correo</b> <small style="color:#64748b;">(opcional)</small><input id="ct-mail" style="' + IN + '" value="' + esc(c.email) + '"></label></div>' +
            '<fieldset style="border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px;"><legend><b>Horario</b> <small style="color:#64748b;">(vacío = cerrado)</small></legend>' +
            DIAS.map(function (d, i) {
                return '<div style="display:flex; gap:8px; align-items:center; margin:4px 0;"><span style="width:90px; flex:0 0 auto;">' + d + '</span>' +
                    '<input data-dia="' + i + '" style="' + IN + '" placeholder="Cerrado  ·  p. ej. 13:00–16:00 · 20:00–23:30" value="' + esc(h[i]) + '"></div>';
            }).join('') +
            '<button type="button" id="ct-copiar" style="margin-top:6px; padding:5px 10px; border-radius:6px; border:1px solid #cbd5e1; background:#f8fafc; cursor:pointer; font-size:.8rem;">Copiar el lunes a los días vacíos</button></fieldset>' +
            '<label><b>Nota</b> <small style="color:#64748b;">(opcional, p. ej. "Imprescindible reservar")</small><input id="ct-nota" style="' + IN + '" value="' + esc(c.nota) + '"></label>' +
            '</div>' +
            '<div id="ct-msg" style="min-height:1.2em; margin-top:10px; font-size:.85rem;"></div>' +
            '<div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">' +
            '<button type="button" id="ct-cancelar" style="padding:8px 14px; border-radius:6px; border:1px solid #cbd5e1; background:#f1f5f9; cursor:pointer;">Cancelar</button>' +
            '<button type="button" id="ct-guardar" style="padding:8px 14px; border-radius:6px; border:0; background:#27ae60; color:#fff; font-weight:600; cursor:pointer;">Guardar en la web</button></div></div>';
        document.body.appendChild(fondo);

        var vista = function () {
            var q = $('ct-mapa').value.trim() || $('ct-dir').value.trim();
            var u = mapaUrl(q), cont = $('ct-vista');
            if (!u) { cont.innerHTML = '<div style="padding:80px 0; text-align:center; color:#94a3b8;">Escribe la dirección para ver el mapa</div>'; return; }
            var f = cont.querySelector('iframe');
            if (f && f.getAttribute('src') === u) return;
            cont.innerHTML = '<iframe src="' + esc(u) + '" style="width:100%; height:100%; border:0;" loading="lazy"></iframe>';
        };
        var t = null, retrasar = function () { clearTimeout(t); t = setTimeout(vista, 700); };
        $('ct-dir').oninput = retrasar; $('ct-mapa').oninput = retrasar;
        vista();
        var dias = function () { return Array.prototype.slice.call(fondo.querySelectorAll('[data-dia]')); };
        $('ct-copiar').onclick = function () {
            var l = dias()[0].value.trim();
            if (!l) { alert('Escribe primero el horario del lunes.'); return; }
            dias().forEach(function (x) { if (!x.value.trim()) x.value = l; });
        };
        $('ct-cancelar').onclick = function () { fondo.remove(); };
        $('ct-guardar').onclick = async function () {
            var btn = this;
            var contacto = {
                direccion: $('ct-dir').value.trim(), mapa: $('ct-mapa').value.trim(), telefono: $('ct-tel').value.trim(),
                email: $('ct-mail').value.trim(), nota: $('ct-nota').value.trim(), horario: dias().map(function (x) { return x.value.trim(); })
            };
            btn.disabled = true; btn.textContent = '⏳ Guardando...';
            try {
                var url = typeof window.getWebAppUrl === 'function' ? window.getWebAppUrl(S.modo) : '';
                var r = await fetch(url + '?accion=contacto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contacto: contacto }) });
                var txt = await r.text();
                if (!r.ok || /^Error/.test(txt)) throw new Error(txt);
                $('ct-msg').style.color = '#15803d';
                $('ct-msg').textContent = '✔ Guardado. En la web se ve en 1-2 minutos.';
                setTimeout(function () { fondo.remove(); }, 1200);
            } catch (err) {
                $('ct-msg').style.color = '#b42318';
                $('ct-msg').textContent = 'No se pudo guardar: ' + (err.message || err);
                btn.disabled = false; btn.textContent = 'Guardar en la web';
            }
        };
    }

    window.addEventListener('load', function () { setTimeout(crearBoton, 800); });
})();
