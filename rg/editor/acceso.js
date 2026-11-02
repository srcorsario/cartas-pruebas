// =========================================================================================
// acceso.js — guardia del editor dentro de la web (<web>/editor/). Va lo primero del <head>
// (lo inserta construir.ps1, justo después de sitio-editor.js).
//   - Sin sesión: manda a login.html y corta la carga del editor (no se ejecuta nada más).
//   - Con sesión: barra pequeña abajo a la izquierda con usuario, "Ver carta" y "Salir".
// La sesión es el token de GitHub descifrado en login.html (sessionStorage, o localStorage
// si se marcó "Recordar en este dispositivo"), con clave propia de cada web y entorno.
// =========================================================================================
(function () {
    'use strict';
    var S = window.EDITOR_SITIO;
    if (!S) return;
    var K = S.claveToken, KU = K + '.usuario';

    function leer(k) {
        try { return sessionStorage.getItem(k) || localStorage.getItem(k) || ''; } catch (e) { return ''; }
    }
    function borrar() {
        [K, KU].forEach(function (k) {
            try { sessionStorage.removeItem(k); } catch (e) { }
            try { localStorage.removeItem(k); } catch (e) { }
        });
    }
    function aLogin(motivo) {
        borrar();
        location.replace('login.html' + (motivo ? '?motivo=' + encodeURIComponent(motivo) : ''));
    }

    window.AccesoEditor = {
        usuario: leer(KU),
        salir: function () {
            var p = window.AlmacenJSON && window.AlmacenJSON.pendientes ? window.AlmacenJSON.pendientes() : {};
            var n = Object.keys(p).reduce(function (a, k) { return a + (p[k] || 0); }, 0);
            if (n && !window.confirm('Hay ' + n + ' cambio(s) guardándose todavía. ¿Salir igualmente?')) return;
            aLogin('');
        },
        caducado: function (motivo) { aLogin(motivo || 'La sesión ha caducado. Vuelve a entrar.'); }
    };

    if (!leer(K)) {
        // El resto de la página pasa a ser texto oculto: no se ejecuta ningún script más.
        document.write('<plaintext style="display:none">');
        location.replace('login.html');
        return;
    }

    document.addEventListener('DOMContentLoaded', function () {
        var css = document.createElement('style');
        css.textContent =
            '#acceso-barra{position:fixed;left:10px;bottom:10px;z-index:99999;display:flex;gap:10px;align-items:center;' +
            'font:500 12px/1 system-ui,-apple-system,"Segoe UI",sans-serif;background:rgba(15,23,42,.92);color:#e2e8f0;' +
            'padding:7px 10px;border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,.25)}' +
            '#acceso-barra a,#acceso-barra button{color:#93c5fd;background:none;border:0;padding:0;font:inherit;cursor:pointer;text-decoration:none}' +
            '#acceso-barra a:hover,#acceso-barra button:hover{text-decoration:underline}' +
            '#acceso-barra .ent{background:#f59e0b;color:#111;border-radius:999px;padding:2px 7px;font-weight:700;letter-spacing:.04em}' +
            '@media print{#acceso-barra{display:none}}';
        document.head.appendChild(css);
        var b = document.createElement('div');
        b.id = 'acceso-barra';
        var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
        b.innerHTML = (S.entorno === 'pruebas' ? '<span class="ent">PRUEBAS</span>' : '') +
            '<span>👤 ' + esc(window.AccesoEditor.usuario || '?') + '</span>' +
            '<a href="../" target="_blank" rel="noopener">Ver carta</a>' +
            '<button type="button">Salir</button>';
        b.querySelector('button').addEventListener('click', window.AccesoEditor.salir);
        document.body.appendChild(b);
    });
})();
