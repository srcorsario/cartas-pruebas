// =========================================================================================
// historial.js — "↶ Historial" (cabecera del editor, tras 🔎 Revisar carta). DESHACER datos.json.
// Común a todos los editores (lo copia e inserta construir.ps1).
//   - Lista las últimas versiones de datos.json en GitHub (cada guardado del editor es una).
//   - Al elegir una: qué platos se han BORRADO, CAMBIADO o son NUEVOS desde entonces.
//   - "↶ Recuperar marcados": vuelve a poner esos platos como estaban (los borrados vuelven, los
//     cambiados recuperan lo de entonces, los nuevos marcados se quitan). Solo esos: el resto, igual.
//   - "Volver entera a esta versión": datos.json completo de entonces (platos, pestañas, logos, contacto…).
//   Guarda con POST ?accion=restaurar (almacen-json 1.16.0) = un commit NUEVO: no se pierde nada, la
//   versión de ahora sigue en el historial (se puede deshacer el deshacer).
// =========================================================================================
(function () {
    'use strict';
    var S = window.EDITOR_SITIO;
    if (!S) return;
    window.APP_VERSIONS = window.APP_VERSIONS || {};
    window.APP_VERSIONS.historial = '1.0.0'; // 11 nov: botón ↶ Historial: versiones de datos.json (cada guardado), qué platos se borraron / cambiaron / son nuevos desde una versión, recuperar los marcados o volver entera a esa versión (commit nuevo, se puede deshacer)

    var REPO = 'https://api.github.com/repos/' + S.repo;
    var $ = function (id) { return document.getElementById(id); };
    var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    function token() { try { return sessionStorage.getItem(S.claveToken) || localStorage.getItem(S.claveToken) || ''; } catch (e) { return ''; } }
    async function api(ruta, crudo) {
        var r = await fetch(REPO + ruta, { cache: 'no-store', headers: { Authorization: 'Bearer ' + token(), Accept: crudo ? 'application/vnd.github.raw' : 'application/vnd.github+json' } });
        if (r.status === 401 && window.AccesoEditor) window.AccesoEditor.caducado();
        if (!r.ok) throw new Error('GitHub HTTP ' + r.status);
        return crudo ? r.text() : r.json();
    }
    async function versiones(pagina) {
        var l = await api('/commits?path=' + encodeURIComponent(S.ruta) + '&per_page=30&page=' + (pagina || 1));
        return l.map(function (c) { return { sha: c.sha, fecha: new Date((c.commit.committer || c.commit.author).date), mensaje: c.commit.message.split('\n')[0] }; });
    }
    var cacheDatos = {};
    async function datosDe(sha) {
        if (!cacheDatos[sha]) cacheDatos[sha] = api('/contents/' + S.ruta.split('/').map(encodeURIComponent).join('/') + '?ref=' + sha, true).then(JSON.parse);
        return cacheDatos[sha];
    }

    // ---------- comparar dos datos.json ----------
    function nombre(p) { return String((p.nombre || {}).ES || '').replace(/\/\/.*$/, '').trim() || '(sin nombre)'; }
    function categoria(id) {
        try { var c = window.Categorias && window.Categorias.categoriaDe && window.Categorias.categoriaDe(id); var n = c && (c.nombre || c.id); return typeof n === 'string' ? n : ''; } catch (e) { return ''; }
    }
    function difPlato(a, b) {   // a = entonces, b = ahora -> lista de textos
        var d = [], J = JSON.stringify;
        if (nombre(a) !== nombre(b)) d.push('nombre: «' + nombre(a) + '» → «' + nombre(b) + '»');
        if (String(a.precio || '') !== String(b.precio || '')) d.push('precio: ' + (a.precio || '—') + ' → ' + (b.precio || '—'));
        if (String(a.precioMedia || '') !== String(b.precioMedia || '')) d.push('½: ' + (a.precioMedia || '—') + ' → ' + (b.precioMedia || '—'));
        if (String(a.activa || '') !== String(b.activa || '')) d.push(String(b.activa).toLowerCase() === 'si' ? 'activado' : 'desactivado');
        if (J(a.alergenos || []) !== J(b.alergenos || [])) d.push('alérgenos: ' + ((a.alergenos || []).join(', ') || '—') + ' → ' + ((b.alergenos || []).join(', ') || '—'));
        if (String(a.archivo || '') + a.carpeta !== String(b.archivo || '') + b.carpeta) d.push('foto: ' + (a.archivo || '—') + ' → ' + (b.archivo || '—'));
        if (J(a.opcionesInactivas || []) !== J(b.opcionesInactivas || [])) d.push('opciones');
        var tr = 0, inf = 0;
        Object.keys(Object.assign({}, a.nombre, b.nombre)).forEach(function (l) { if (l !== 'ES' && String((a.nombre || {})[l] || '') !== String((b.nombre || {})[l] || '')) tr++; });
        Object.keys(Object.assign({}, a.info, b.info)).forEach(function (l) { if (String((a.info || {})[l] || '') !== String((b.info || {})[l] || '')) inf++; });
        if (tr) d.push('traducción en ' + tr + ' idioma' + (tr > 1 ? 's' : ''));
        if (inf) d.push('Info en ' + inf + ' idioma' + (inf > 1 ? 's' : ''));
        if (!d.length && J(a) !== J(b)) d.push('otros datos');
        return d;
    }
    function comparar(entonces, ahora) {
        var mA = {}, mB = {}, r = { borrados: [], cambiados: [], nuevos: [], otros: [] };
        (entonces.platos || []).forEach(function (p) { mA[String(+p.id)] = p; });
        (ahora.platos || []).forEach(function (p) { mB[String(+p.id)] = p; });
        Object.keys(mA).forEach(function (id) {
            if (!mB[id]) r.borrados.push(mA[id]);
            else { var d = difPlato(mA[id], mB[id]); if (d.length) r.cambiados.push({ p: mA[id], d: d }); }
        });
        Object.keys(mB).forEach(function (id) { if (!mA[id]) r.nuevos.push(mB[id]); });
        var J = JSON.stringify, nombres = { estructura: 'categorías / pestañas', marca: 'logos y QR', contacto: 'contacto y horario', idiomas: 'idiomas de la web', ocultas: 'pestañas ocultas' };
        Object.keys(nombres).forEach(function (k) { if (J(entonces[k] || null) !== J(ahora[k] || null)) r.otros.push(nombres[k]); });
        var orden = function (a, b) { return (+(a.p || a).id) - (+(b.p || b).id); };
        r.borrados.sort(orden); r.cambiados.sort(orden); r.nuevos.sort(orden);
        return r;
    }

    // ---------- ventana ----------
    function fechaTxt(d) {
        return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    function abrir() {
        if ($('hi-fondo')) return;
        var fondo = document.createElement('div');
        fondo.id = 'hi-fondo';
        fondo.innerHTML = '<style>' +
            '#hi-fondo{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit}' +
            '#hi-caja{background:#fff;border-radius:12px;width:min(1100px,100%);height:min(90vh,900px);display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(0,0,0,.3)}' +
            '#hi-cab{padding:14px 18px 10px;border-bottom:1px solid #e5e7eb}#hi-cab h3{margin:0 0 4px;font-size:1.15rem}#hi-cab p{margin:0;color:#64748b;font-size:.82rem}' +
            '#hi-cuerpo{flex:1;display:flex;min-height:0}#hi-lista{width:300px;border-right:1px solid #e5e7eb;overflow:auto;padding:8px}' +
            '#hi-det{flex:1;overflow:auto;padding:12px 18px}' +
            '.hi-v{padding:7px 9px;border-radius:7px;cursor:pointer;font-size:.84rem;margin-bottom:2px}.hi-v:hover{background:#fff7ed}.hi-v.on{background:#ffedd5;outline:2px solid #e67e22}' +
            '.hi-v b{display:block;font-size:.8rem;color:#334155}.hi-v small{color:#64748b;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
            '.hi-sec{border:1px solid #e5e7eb;border-radius:8px;margin:0 0 10px;padding:6px 10px}.hi-sec h4{margin:4px 0 6px;font-size:.92rem}' +
            '.hi-f{display:flex;gap:8px;align-items:flex-start;padding:4px 2px;font-size:.86rem}.hi-f small{color:#64748b;display:block}.hi-f input{margin-top:3px}' +
            '.hi-nota{color:#64748b;font-size:.82rem}.hi-todos{font-size:.78rem;margin-left:8px;cursor:pointer;color:#2563eb;text-decoration:underline}' +
            '#hi-pie{padding:10px 18px;border-top:1px solid #e5e7eb;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}' +
            '#hi-pie button{padding:8px 16px;border-radius:8px;border:1px solid #ddd;background:#f8f9fa;cursor:pointer}#hi-pie button:disabled{opacity:.5;cursor:default}' +
            '#hi-rec{background:#e67e22!important;color:#fff;border-color:#e67e22!important;font-weight:600}' +
            '@media(max-width:700px){#hi-cuerpo{flex-direction:column}#hi-lista{width:auto;max-height:35%;border-right:none;border-bottom:1px solid #e5e7eb}}' +
            '</style><div id="hi-caja"><div id="hi-cab"><h3>↶ Historial de la carta</h3>' +
            '<p>Cada guardado es una versión. Elige una para ver qué ha cambiado DESDE entonces y recuperar lo que quieras. Recuperar hace un guardado nuevo: lo de ahora no se pierde (sale arriba en la lista).</p></div>' +
            '<div id="hi-cuerpo"><div id="hi-lista">Cargando versiones…</div><div id="hi-det"><p class="hi-nota">← Elige una versión.</p></div></div>' +
            '<div id="hi-pie"><button id="hi-entera" disabled>Volver entera a esta versión</button><button id="hi-rec" disabled>↶ Recuperar marcados</button><button id="hi-cerrar">Cerrar</button></div></div>';
        document.body.appendChild(fondo);
        var lista = [], pagina = 1, elegida = null, comp = null, ahora = null, ocupado = false;
        var cerrar = function () { fondo.remove(); document.removeEventListener('keydown', tecla); };
        var tecla = function (e) { if (e.key === 'Escape' && !ocupado) cerrar(); };
        document.addEventListener('keydown', tecla);
        $('hi-cerrar').onclick = function () { if (!ocupado) cerrar(); };
        fondo.addEventListener('click', function (e) { if (e.target === fondo && !ocupado) cerrar(); });

        function pintarLista(mas) {
            $('hi-lista').innerHTML = lista.map(function (v, i) {
                return '<div class="hi-v' + (elegida === v ? ' on' : '') + '" data-i="' + i + '"><b>' + esc(fechaTxt(v.fecha)) + (i === 0 ? ' · AHORA' : '') + '</b><small title="' + esc(v.mensaje) + '">' + esc(v.mensaje) + '</small></div>';
            }).join('') + (mas ? '<div class="hi-v" data-mas="1" style="text-align:center;color:#2563eb">Ver más antiguas…</div>' : '');
        }
        function marcados() { return Array.prototype.slice.call(fondo.querySelectorAll('#hi-det input[type=checkbox]:checked')); }
        function botones() {
            var n = marcados().length;
            $('hi-rec').disabled = !n || ocupado; $('hi-rec').textContent = '↶ Recuperar marcados' + (n ? ' (' + n + ')' : '');
            $('hi-entera').disabled = !elegida || elegida === lista[0] || ocupado;
        }
        function seccion(titulo, clave, items, nota, marcar) {
            if (!items.length) return '';
            return '<div class="hi-sec"><h4>' + titulo + ' (' + items.length + ')<span class="hi-todos" data-todos="' + clave + '">marcar todos</span></h4>' + (nota ? '<div class="hi-nota">' + nota + '</div>' : '') +
                items.map(function (x) {
                    var p = x.p || x;
                    return '<label class="hi-f"><input type="checkbox" data-t="' + clave + '" data-id="' + esc(p.id) + '"' + (marcar ? ' checked' : '') + '><span><b>' + esc(p.id) + '</b> ' + esc(nombre(p)) +
                        (categoria(+p.id) ? ' <small style="display:inline">· ' + esc(categoria(+p.id)) + '</small>' : '') + (x.d ? '<small>' + esc(x.d.join(' · ')) + '</small>' : '') + '</span></label>';
                }).join('') + '</div>';
        }
        async function elegir(v) {
            elegida = v; pintarLista(lista.length === pagina * 30); botones();
            var det = $('hi-det');
            if (v === lista[0]) { det.innerHTML = '<p class="hi-nota">Esta es la versión de ahora. Elige una anterior.</p>'; return; }
            det.innerHTML = '<p class="hi-nota">Comparando con la de ahora…</p>';
            try {
                var res = await Promise.all([datosDe(v.sha), datosDe(lista[0].sha)]);
                if (elegida !== v) return;
                ahora = res[1]; comp = comparar(res[0], res[1]);
                var nada = !comp.borrados.length && !comp.cambiados.length && !comp.nuevos.length;
                det.innerHTML = '<p class="hi-nota">Versión del <b>' + esc(fechaTxt(v.fecha)) + '</b> («' + esc(v.mensaje) + '») comparada con la de ahora:</p>' +
                    (nada ? '<p>✔ Los platos están igual que ahora.</p>' : '') +
                    seccion('🗑 Borrados desde entonces', 'b', comp.borrados, 'Marcados = vuelven a la carta como estaban.', true) +
                    seccion('✏️ Cambiados desde entonces', 'c', comp.cambiados, 'Entonces → ahora. Marcados = vuelven a como estaban entonces (todo el plato: nombre, precio, traducciones, Info…).', false) +
                    seccion('➕ Nuevos desde entonces', 'n', comp.nuevos, 'Marcados = se QUITAN de la carta (no existían entonces).', false) +
                    (comp.otros.length ? '<div class="hi-sec"><h4>Otros cambios</h4><div class="hi-nota">También cambió: ' + esc(comp.otros.join(', ')) + '. Solo se recupera con "Volver entera a esta versión".</div></div>' : '');
                botones();
            } catch (err) { det.innerHTML = '<p style="color:#b91c1c">No se pudo leer esa versión: ' + esc(err.message) + '</p>'; }
        }
        fondo.addEventListener('click', function (e) {
            var t = e.target.closest && e.target.closest('[data-todos]');
            if (t) { var cs = fondo.querySelectorAll('#hi-det input[data-t="' + t.dataset.todos + '"]'), todos = Array.prototype.every.call(cs, function (c) { return c.checked; }); cs.forEach(function (c) { c.checked = !todos; }); botones(); return; }
            var v = e.target.closest && e.target.closest('.hi-v');
            if (!v || ocupado) return;
            if (v.dataset.mas) { pagina++; versiones(pagina).then(function (l) { lista = lista.concat(l); pintarLista(l.length === 30); }); return; }
            elegir(lista[+v.dataset.i]);
        });
        fondo.addEventListener('change', botones);

        async function guardar(cuerpo, texto) {
            if (window.hayCambiosSinGuardar) { alert('Hay cambios sin guardar en el editor. Guárdalos (o descártalos) antes de recuperar una versión.'); return; }
            var ok = await (window.confirmarEditor ? window.confirmarEditor(texto, { si: 'Sí, recuperar', no: 'Cancelar' }) : Promise.resolve(confirm(texto)));
            if (!ok) return;
            ocupado = true; botones();
            $('hi-det').insertAdjacentHTML('afterbegin', '<p id="hi-guardando" style="color:#c2410c;font-weight:600">⏳ Guardando en GitHub…</p>');
            try {
                var url = typeof window.getWebAppUrl === 'function' ? window.getWebAppUrl(S.modo) : '';
                if (!url) throw new Error('el editor no tiene dirección de guardado');
                cuerpo.desde = fechaTxt(elegida.fecha);
                var r = await fetch(url + '?accion=restaurar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
                var t = await r.text();
                if (!r.ok || !/^OK/.test(t)) throw new Error(t || ('HTTP ' + r.status));
                ocupado = false;
                alert('✔ Recuperado y guardado. El editor se recarga para enseñar la carta al día.');
                location.reload();
            } catch (err) {
                ocupado = false; botones();
                var g = $('hi-guardando'); if (g) g.remove();
                alert('❌ No se pudo recuperar: ' + err.message);
            }
        }
        $('hi-rec').onclick = async function () {
            var cs = marcados(); if (!cs.length || !comp) return;
            var porId = {}; (comp.borrados.concat(comp.cambiados.map(function (x) { return x.p; }))).forEach(function (p) { porId[String(p.id)] = p; });
            var cuerpo = { platos: [], quitar: [] }, nb = 0, nc = 0, nn = 0;
            cs.forEach(function (c) {
                if (c.dataset.t === 'n') { cuerpo.quitar.push(c.dataset.id); nn++; }
                else { cuerpo.platos.push(porId[c.dataset.id]); if (c.dataset.t === 'b') nb++; else nc++; }
            });
            await guardar(cuerpo, 'Recuperar de la versión del ' + fechaTxt(elegida.fecha) + ':\n' + [nb ? '• ' + nb + ' plato(s) borrado(s) vuelven' : '', nc ? '• ' + nc + ' plato(s) vuelven a como estaban' : '', nn ? '• ' + nn + ' plato(s) nuevo(s) se quitan' : ''].filter(Boolean).join('\n') + '\n\nEl resto de la carta no cambia. ¿Seguir?');
        };
        $('hi-entera').onclick = async function () {
            if (!elegida || elegida === lista[0]) return;
            var d = await datosDe(elegida.sha);
            await guardar({ todo: d }, 'Volver ENTERA a la versión del ' + fechaTxt(elegida.fecha) + ' (' + (d.platos || []).length + ' platos).\nSe pierde todo lo hecho después (platos, categorías, logos, contacto…), aunque la versión de ahora queda en el historial. ¿Seguir?');
        };
        versiones(1).then(function (l) { lista = l; pintarLista(l.length === 30); if (!l.length) $('hi-lista').innerHTML = '<p class="hi-nota">Sin versiones.</p>'; })
            .catch(function (err) { $('hi-lista').innerHTML = '<p style="color:#b91c1c">No se pudo leer el historial: ' + esc(err.message) + '</p>'; });
    }

    function crearBoton() {
        if ($('ew-btn-historial')) return;
        var ref = $('ew-btn-revisar') || $('ew-btn-mapa') || $('ew-btn-idiomas');
        if (!ref) return;
        var b = document.createElement('button');
        b.id = 'ew-btn-historial'; b.type = 'button';
        b.textContent = '↶ Historial';
        b.title = 'Versiones anteriores de la carta (cada guardado): ver qué se borró o cambió y recuperarlo.';
        b.style.cssText = 'font-size:0.7rem; display:flex; align-items:center; gap:4px; white-space:nowrap; background:#f8f9fa; padding:4px 8px; border-radius:4px; border:1px solid #ddd; cursor:pointer;';
        b.onclick = abrir;
        ref.parentNode.insertBefore(b, ref.nextSibling);
    }
    window.HistorialCarta = { abrir: abrir, comparar: comparar };
    window.addEventListener('load', function () { setTimeout(crearBoton, 1000); setTimeout(crearBoton, 2600); });
})();
