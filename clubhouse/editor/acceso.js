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
            if (!n) { aLogin(''); return; }
            window.confirmarEditor('Hay ' + n + ' cambio(s) guardándose todavía. ¿Salir igualmente?').then(function (ok) { if (ok) aLogin(''); });
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

    // ---------- Avisos propios (3 nov) ----------
    // Los alert()/confirm() del navegador enseñan "srcorsario.github.io dice" en la cabecera. En el
    // editor se cambian por un cuadro propio, solo con el texto. alert() ya no bloquea (los avisos
    // se encolan); confirmarEditor(texto) devuelve una promesa true/false.
    var cola = [], abierto = false;
    function estilos() {
        if (document.getElementById('aviso-ed-css')) return;
        var st = document.createElement('style');
        st.id = 'aviso-ed-css';
        st.textContent = '#aviso-ed{position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:16px;}' +
            '#aviso-ed .caja{background:#fff;border-radius:14px;max-width:440px;width:100%;padding:22px 22px 18px;box-shadow:0 20px 50px rgba(0,0,0,.3);font-family:Montserrat,system-ui,sans-serif;}' +
            '#aviso-ed .txt{white-space:pre-line;color:#1e293b;font-size:.95rem;line-height:1.5;max-height:60vh;overflow:auto;}' +
            '#aviso-ed .bts{display:flex;gap:8px;justify-content:flex-end;margin-top:18px;}' +
            '#aviso-ed button{border-radius:8px;padding:8px 18px;font-weight:600;font-size:.9rem;cursor:pointer;border:1px solid #cbd5e1;background:#f1f5f9;color:#334155;}' +
            '#aviso-ed button.ok{background:#27ae60;border-color:#27ae60;color:#fff;}';
        document.head.appendChild(st);
    }
    function siguiente() {
        if (abierto || !cola.length || !document.body) return;
        var a = cola.shift();
        abierto = true;
        estilos();
        var f = document.createElement('div');
        f.id = 'aviso-ed';
        f.innerHTML = '<div class="caja" role="dialog" aria-modal="true"><div class="txt"></div><div class="bts">' +
            (a.confirmar ? '<button type="button" class="no">Cancelar</button>' : '') + '<button type="button" class="ok">Aceptar</button></div></div>';
        f.querySelector('.txt').textContent = String(a.texto == null ? '' : a.texto);
        var cerrar = function (v) { document.removeEventListener('keydown', tecla, true); f.remove(); abierto = false; a.fin(v); setTimeout(siguiente, 0); };
        var tecla = function (e) {
            if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); cerrar(true); }
            else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(!a.confirmar); }
        };
        f.querySelector('.ok').onclick = function () { cerrar(true); };
        var no = f.querySelector('.no'); if (no) no.onclick = function () { cerrar(false); };
        document.addEventListener('keydown', tecla, true);
        document.body.appendChild(f);
        f.querySelector('.ok').focus();
    }
    function encolar(texto, confirmar) {
        return new Promise(function (fin) {
            cola.push({ texto: texto, confirmar: confirmar, fin: fin });
            if (document.body) siguiente(); else document.addEventListener('DOMContentLoaded', siguiente);
        });
    }
    window.alert = function (texto) { encolar(texto, false); };
    window.confirmarEditor = function (texto) { return encolar(texto, true); };
})();
