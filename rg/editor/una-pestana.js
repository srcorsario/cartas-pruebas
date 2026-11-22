// =========================================================================================
// una-pestana.js — UNA sola pestaña del editor por web (22 nov).
// El panel abre el editor con Start-Process <url>: el navegador SIEMPRE abre una pestaña nueva (desde fuera no se
// puede reutilizar otra). Así que lo arregla la página:
//   - Al cargar, la pestaña nueva avisa (BroadcastChannel, una por web: misma dirección del editor) y se queda.
//   - Las pestañas viejas de esa web SIN cambios pendientes se cierran solas. Si el navegador no las deja cerrarse,
//     se quedan en gris con «El editor está abierto en otra pestaña» y un botón «Usar esta pestaña».
//   - Si una vieja tiene cambios sin guardar (o guardándose), NO se cierra: la nueva avisa de que ya hay una abierta
//     con cambios, con «Cerrar esta pestaña» o «Seguir aquí igualmente».
// Lo copia e inserta construir.ps1 ($MODULOS_ACCESO, detrás de acceso.js: sin sesión no llega a ejecutarse).
// =========================================================================================
(function () {
    window.APP_VERSIONS = window.APP_VERSIONS || {};
    window.APP_VERSIONS.unaPestana = '1.0.0'; // 22 nov: una sola pestaña del editor por web: al abrir otra (p. ej. desde el panel) se cierran las viejas sin cambios pendientes; si alguna tiene cambios, la nueva avisa.
    if (typeof BroadcastChannel !== 'function') return;

    var yo = Math.random().toString(36).slice(2) + Date.now().toString(36);
    var canal = new BroadcastChannel('cartas-una-pestana:' + location.pathname.replace(/[^/]*$/, ''));
    var cedida = false;

    // ¿Hay algo que se perdería al cerrar esta pestaña?
    function hayCambios() {
        try {
            if (window.hayCambiosSinGuardar) return true;
            var m = window.EDITOR_SITIO && window.EDITOR_SITIO.modo;
            if (window.SugerenciasEdicion && m && window.SugerenciasEdicion.pendientes(m)) return true;
            if (window.SugHistorial && window.SugHistorial.hayEdiciones && window.SugHistorial.hayEdiciones()) return true;
            var p = window.AlmacenJSON && window.AlmacenJSON.pendientes ? window.AlmacenJSON.pendientes() : {};
            if (Object.keys(p).some(function (k) { return p[k]; })) return true;
        } catch (e) { }
        return false;
    }

    function capa(id, html) {
        var viejo = document.getElementById(id); if (viejo) viejo.remove();
        var d = document.createElement('div');
        d.id = id; d.setAttribute('aria-modal', 'true');
        d.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;font-family:Montserrat,system-ui,sans-serif';
        d.innerHTML = '<div style="background:#fff;border-radius:14px;max-width:620px;width:92vw;padding:24px 28px;box-shadow:0 20px 50px rgba(0,0,0,.35);color:#0f172a;font-size:16px;line-height:1.5">' + html + '</div>';
        (document.body || document.documentElement).appendChild(d);
        return d;
    }
    var BOTON = 'padding:10px 18px;border-radius:9px;font-weight:700;font-size:15px;cursor:pointer;';

    // Esta pestaña es vieja y no tiene cambios: se cierra (o queda en gris si el navegador no deja).
    function ceder() {
        cedida = true;
        try { window.close(); } catch (e) { }
        setTimeout(function () {
            if (window.closed) return;
            var d = capa('una-pestana-cedida',
                '<div style="font-size:20px;font-weight:700;color:#0d5c63;margin-bottom:8px">📑 El editor está abierto en otra pestaña</div>' +
                '<div style="color:#475569">Esta ya no se usa (para no tener dos editores a la vez). Puedes cerrarla.</div>' +
                '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px"><button type="button" class="usar" style="' + BOTON + 'border:1px solid #0d5c63;background:#0d5c63;color:#fff">Usar esta pestaña</button></div>');
            d.querySelector('.usar').onclick = function () { location.reload(); };   // al recargar avisa y la otra cede
        }, 400);
    }

    // Esta pestaña es la nueva y otra tiene cambios sin guardar.
    function avisarOcupada() {
        if (document.getElementById('una-pestana-ocupada')) return;
        var d = capa('una-pestana-ocupada',
            '<div style="font-size:20px;font-weight:700;color:#c2410c;margin-bottom:8px">⚠ Ya tienes el editor abierto en otra pestaña</div>' +
            '<div style="color:#334155">Esa pestaña tiene <b>cambios sin guardar</b>, así que no se ha cerrado. Lo mejor es seguir en ella y guardar allí: ' +
            'con dos editores abiertos, lo que se guarde en uno puede pisar lo del otro.</div>' +
            '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap">' +
            '<button type="button" class="seguir" style="' + BOTON + 'border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a">Seguir aquí igualmente</button>' +
            '<button type="button" class="cerrar" style="' + BOTON + 'border:1px solid #0d5c63;background:#0d5c63;color:#fff">Cerrar esta pestaña</button></div>' +
            '<div class="nota" style="display:none;margin-top:12px;color:#64748b;font-size:14px">El navegador no deja que la página se cierre sola: ciérrala con Ctrl+W.</div>');
        d.querySelector('.seguir').onclick = function () { d.remove(); };
        d.querySelector('.cerrar').onclick = function () {
            try { window.close(); } catch (e) { }
            setTimeout(function () { if (!window.closed) d.querySelector('.nota').style.display = ''; }, 300);
        };
    }

    canal.onmessage = function (e) {
        var m = e.data || {};
        if (m.de === yo) return;
        if (m.t === 'hola') {
            if (cedida) return;
            if (hayCambios()) canal.postMessage({ t: 'ocupado', de: yo, a: m.de });
            else { canal.postMessage({ t: 'cedo', de: yo, a: m.de }); ceder(); }
        } else if (m.t === 'ocupado' && m.a === yo) avisarOcupada();
    };

    function saludar() { canal.postMessage({ t: 'hola', de: yo }); }
    if (document.readyState === 'complete') saludar(); else window.addEventListener('load', saludar);
    window.UnaPestana = { _yo: yo, _hayCambios: hayCambios };
})();
