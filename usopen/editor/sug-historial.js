// =========================================================================================
// sug-historial.js — historial de la hoja de Sugerencias (pestaña "2. Sugerencias" del editor).
// Común a todos los editores (lo copia e inserta construir.ps1).
//   - almacen-json (1.18.0) apunta en <web>/sugerencias-historial.json cada guardado en que cambian las
//     sugerencias activas (fecha y hora; varios por día: mediodía, noche…).
//   - Encima de la hoja: ◀ fecha ▶ para ver la hoja tal como estaba en cada momento, y
//     "✔ Aplicar esta configuración y guardar en la web": quedan activas SOLO esas sugerencias (las demás
//     se desactivan, no se borran) en un commit nuevo (POST ?accion=sugerencias).
//   - Cada plato se compara con la carta de ahora por ID y nombre ES:
//       ✔ igual · ✏️ cambiado (precio, EN, alérgenos: se deja lo de hoy) · ↪ está en otro ID (se usa ese) ·
//       ⚠ el ID es ahora otro plato (se vuelve a crear en un ID libre de su sección; casilla "es el mismo") ·
//       ✖ ya no existe (se vuelve a crear en su ID).
//     Los que se vuelven a crear salen COMPLETOS (26 idiomas, Info, foto) del datos.json de aquel guardado.
// =========================================================================================
(function () {
    'use strict';
    var S = window.EDITOR_SITIO;
    if (!S) return;
    window.APP_VERSIONS = window.APP_VERSIONS || {};
    window.APP_VERSIONS.sugHistorial = '1.3.1'; // 22 nov (3): SugHistorial.hayEdiciones() para una-pestana.js (no cerrar una pestaña con hojas guardadas editadas sin guardar). 1.3.0: 22 nov (2): ✕ / ➕ también en las hojas GUARDADAS: los cambios quedan en la barra («↶ Deshacer») y se guardan con «💾 Guardar cambios en esta guardada» (reescribe ese momento) o con «✔ Aplicar esta configuración…» (la editada pasa a ser la de hoy). 1.2.0: 22 nov: «🗑 Eliminar esta guardada» (borra ese momento de sugerencias-historial.json; la carta no cambia) y aviso en los momentos guardados de que ✕ / ➕ solo van en «Ahora». 1.1.0: 20 nov (2): al entrar en la pestaña siempre empieza en «Ahora»; barra más ancha y fina (una línea); flechas ← → del teclado para cambiar de momento (Inicio = el 1º, Fin = Ahora). 1.0.0: 20 nov: hoja de Sugerencias con ◀ fecha ▶ (cada guardado en que cambian las sugerencias) y "Aplicar esta configuración y guardar en la web" (solo quedan activas esas; las que ya no existen se vuelven a crear con sus idiomas e Info)

    var REPO = 'https://api.github.com/repos/' + S.repo;
    var DIR = S.ruta.indexOf('/') >= 0 ? S.ruta.slice(0, S.ruta.lastIndexOf('/') + 1) : '';
    var ARCHIVO = DIR + 'sugerencias-historial.json';
    var CONT = { restaurante001: 'sugerencias-contenido', restaurante002: 'sugerencias-contenido-usopen' }[S.modo] || 'sugerencias-contenido';
    var $ = function (id) { return document.getElementById(id); };
    var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var num = function (x) { return parseInt(x, 10); };
    var norm = function (t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); };
    var corto = function (t) { return String(t || '').replace(/\s*\/\/.*$/, '').trim() || '(sin nombre)'; };
    function token() { try { return sessionStorage.getItem(S.claveToken) || localStorage.getItem(S.claveToken) || ''; } catch (e) { return ''; } }
    async function api(ruta, crudo) {
        var r = await fetch(REPO + ruta, { cache: 'no-store', headers: { Authorization: 'Bearer ' + token(), Accept: crudo ? 'application/vnd.github.raw' : 'application/vnd.github+json' } });
        if (r.status === 401 && window.AccesoEditor) window.AccesoEditor.caducado();
        if (r.status === 404) return null;
        if (!r.ok) throw new Error('GitHub HTTP ' + r.status);
        return crudo ? r.text() : r.json();
    }
    var rangoSug = function () { return (window.Categorias && window.Categorias.rangoSugerencias && window.Categorias.rangoSugerencias()) || [12000, 12999]; };
    var enSug = function (id) { var r = rangoSug(), n = num(id); return n >= r[0] && n <= r[1]; };
    function fechaTxt(iso) {
        var d = new Date(iso);
        try {
            return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' +
                d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        } catch (e) { return d.toISOString().slice(0, 16).replace('T', ' '); }
    }

    // ---------- estado ----------
    var hist = null, leido = 0, pos = -1;   // pos = índice en hist.cambios; -1 = ahora (la carta de hoy)
    var mismos = {};                         // "pos:id" -> true (casilla "es el mismo plato")
    var vista = null;                        // { cambio, lista, analisis, fuente }
    var ediciones = {};                      // "t|c" del momento -> { quitar: {id: true}, anadir: [ {id, es, en, p, m, a} ] } (✕ / ➕ sin guardar)
    var claveEd = function (c) { return c.t + '|' + c.c; };
    function edicionDe(c) { return ediciones[claveEd(c)] || null; }
    function hayEdicion(c) { var e = c && edicionDe(c); return !!(e && (Object.keys(e.quitar).length || e.anadir.length)); }
    // Lista del momento CON los cambios de ✕ / ➕ que aún no se han guardado.
    function listaDe(c) {
        var e = edicionDe(c), base = hist.conjuntos[c.c] || [];
        if (!e) return base;
        return base.filter(function (s) { return !e.quitar[num(s.id)]; }).concat(e.anadir).sort(function (a, b) { return num(a.id) - num(b.id); });
    }

    async function cargar(forzar) {
        if (hist && !forzar && Date.now() - leido < 30000) return;
        var t = await api('/contents/' + ARCHIVO.split('/').map(encodeURIComponent).join('/'), true);
        hist = t ? JSON.parse(t) : { formato: 1, conjuntos: {}, cambios: [] };
        hist.conjuntos = hist.conjuntos || {}; hist.cambios = hist.cambios || [];
        leido = Date.now();
        if (pos >= hist.cambios.length) pos = -1;
    }

    // ---------- comparar un momento con la carta de ahora (window.datosLocales) ----------
    function actuales() { return (window.datosLocales || []).filter(function (p) { return p && p.id != null; }); }
    function libre(id, usados) {
        var n = num(id), r = null;
        try { var s = window.Categorias && window.Categorias.subDe && window.Categorias.subDe(n); if (s) r = [s.desde, s.hasta]; } catch (e) { }
        if (!r) {
            var g = (window.Categorias && window.Categorias.gruposSugerencias && window.Categorias.gruposSugerencias()) || [];
            g.some(function (x) { return (x.rangos || []).some(function (q) { if (n >= q[0] && n <= q[1]) { r = q; return true; } }); });
        }
        var tramos = [r || rangoSug(), rangoSug()];
        for (var t = 0; t < tramos.length; t++) {
            var a = tramos[t];
            for (var i = n + 1; i <= a[1]; i++) if (!usados.has(i)) return i;
            for (var j = a[0]; j < n; j++) if (!usados.has(j)) return j;
        }
        return null;
    }
    function analizar(cambio) {
        var lista = listaDe(cambio);
        var act = actuales(), porId = {}, usados = new Set();
        act.forEach(function (p) { porId[num(p.id)] = p; usados.add(num(p.id)); });
        var res = lista.map(function (s) {
            var n = num(s.id), c = porId[n], x = { s: s, id: n, dest: n, estado: '', difs: [] };
            var compara = function (c) {
                if (String(c.precio || '') !== String(s.p || '') && parseFloat(c.precio || 0) !== parseFloat(s.p || 0)) x.difs.push('precio ' + (s.p || '—') + ' → ' + (c.precio || '—'));
                if (String(c.precioMedia || '') !== String(s.m || '')) x.difs.push('½ ' + (s.m || '—') + ' → ' + (c.precioMedia || '—'));
                if (norm(c.en) !== norm(s.en)) x.difs.push('inglés');
                var al = String(c.alergenos || '').split(',').map(function (a) { return a.trim(); }).filter(Boolean).sort().join(',');
                if (al !== (s.a || []).slice().sort().join(',')) x.difs.push('alérgenos');
            };
            if (c && norm(c.es) === norm(s.es)) { compara(c); x.estado = x.difs.length ? 'cambiado' : 'igual'; x.actual = c; return x; }
            var otro = act.filter(function (p) { return norm(p.es) === norm(s.es); }).sort(function (a, b) { return (enSug(b.id) - enSug(a.id)) || (num(a.id) - num(b.id)); })[0];
            if (otro) { x.estado = 'movido'; x.dest = num(otro.id); x.actual = otro; compara(otro); return x; }
            if (c) {
                x.actual = c;
                if (mismos[pos + ':' + n]) { x.estado = 'mismo'; compara(c); return x; }
                x.estado = 'otro'; return x;
            }
            x.estado = 'falta'; return x;
        });
        // IDs libres para los que hay que crear en otro sitio (sin pisar ni los de ahora ni los nuevos)
        res.forEach(function (x) { if (x.estado === 'falta') usados.add(x.dest); });
        res.forEach(function (x) { if (x.estado === 'otro') { x.dest = libre(x.id, usados); if (x.dest != null) usados.add(x.dest); } });
        var destinos = new Set(res.map(function (x) { return x.dest; }));
        var apagar = act.filter(function (p) { return p.activa && enSug(p.id) && !destinos.has(num(p.id)); });
        return { lista: res, apagar: apagar };
    }
    function fuenteDe(cambio, an) {
        var f = an.lista.map(function (x) {
            var base = (x.estado === 'otro' || x.estado === 'falta') ? {} : (x.actual || {});
            return Object.assign({}, base, { id: x.id, activa: true, es: x.s.es, en: x.s.en, precio: x.s.p, precioMedia: x.s.m, alergenos: (x.s.a || []).join(',') });
        });
        f.__historial = true;
        return f;
    }

    // ---------- barra encima de la hoja ----------
    var CSS = '#sh-barra{background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:3px 12px;margin:0 auto 10px;max-width:1300px;font-size:13px;color:#334155}' +
        '#sh-barra .sh-fila{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-height:28px}' +
        '#sh-barra button{border:1px solid #94a3b8;background:#fff;border-radius:5px;padding:1px 9px;cursor:pointer;font-size:13px;line-height:20px}' +
        '#sh-barra button:disabled{opacity:.4;cursor:default}' +
        '#sh-fecha{font-weight:700;min-width:190px;text-align:center}' +
        '#sh-aplicar{background:#0d5c63!important;color:#fff;border-color:#0d5c63!important;font-weight:600}' +
        '#sh-borrar{color:#b91c1c!important;border-color:#fca5a5!important;background:#fef2f2!important}' +
        '#sh-estado .sh-nota{color:#64748b;font-style:italic}' +
        '#sh-estado .sh-ed{background:#fff;border:1px solid #fdba74;border-radius:6px;padding:4px 8px;margin:3px 0;color:#7c2d12;display:flex;gap:8px;align-items:center;flex-wrap:wrap}' +
        '#sh-estado .sh-ed button{font-size:12.5px}#sh-estado .sh-ed .sh-guardar-ed{background:#0d5c63;color:#fff;border-color:#0d5c63;font-weight:600}' +
        '#sh-barra.sh-pasado{background:#fff7ed;border-color:#fdba74}' +
        '#sh-tecla{color:#94a3b8;font-size:12px}' +
        '#sh-estado{line-height:1.4;font-size:12.5px}#sh-estado:not(:empty){padding:2px 0 4px;border-top:1px dashed #fdba74;margin-top:2px}' +
        '#sh-estado ul{margin:0}#sh-estado li{margin-left:18px}#sh-estado .sh-aviso{color:#9a3412}';
    function asegurarBarra() {
        var cont = $(CONT);
        if (!cont || $('sh-barra')) return !!cont;
        if (!$('sh-css')) { var st = document.createElement('style'); st.id = 'sh-css'; st.textContent = CSS; document.head.appendChild(st); }
        var b = document.createElement('div');
        b.id = 'sh-barra';
        b.innerHTML = '<div class="sh-fila">🕘 <b>Sugerencias guardadas:</b>' +
            '<button id="sh-ant" title="Momento anterior">◀</button><span id="sh-fecha">Ahora</span><button id="sh-sig" title="Momento siguiente">▶</button>' +
            '<button id="sh-ahora" title="Volver a la carta de ahora (tecla Fin)">⏭ Ahora</button><span id="sh-cuenta" style="color:#64748b"></span>' +
            '<span id="sh-tecla">· teclas ← →</span><span style="flex:1"></span><button id="sh-borrar" hidden title="Borra esta hoja guardada del historial (la carta no cambia)">🗑 Eliminar esta guardada</button><button id="sh-aplicar" hidden>✔ Aplicar esta configuración y guardar en la web</button></div><div id="sh-estado"></div>';
        cont.parentNode.insertBefore(b, cont);
        $('sh-ant').onclick = function () { mover(pos === -1 ? hist.cambios.length - 1 : pos - 1); };
        $('sh-sig').onclick = function () { mover(pos >= hist.cambios.length - 1 ? -1 : pos + 1); };
        $('sh-ahora').onclick = function () { mover(-1); };
        $('sh-aplicar').onclick = aplicar;
        $('sh-borrar').onclick = borrarGuardada;
        $('sh-estado').addEventListener('click', function (e) {
            var b = e.target.closest && e.target.closest('button[data-ed]');
            if (!b) return;
            if (b.dataset.ed === 'deshacer') { delete ediciones[claveEd(hist.cambios[pos])]; mover(pos); }
            else if (b.dataset.ed === 'guardar') guardarEdicion();
        });
        $('sh-estado').addEventListener('change', function (e) {
            var c = e.target.closest && e.target.closest('input[data-mismo]');
            if (!c) return;
            mismos[pos + ':' + c.dataset.mismo] = c.checked;
            mover(pos);
        });
        return true;
    }
    function pintarBarra() {
        if (!$('sh-barra') || !hist) return;
        var n = hist.cambios.length;
        $('sh-ant').disabled = !n || pos === 0;
        $('sh-sig').disabled = pos === -1;
        $('sh-ahora').disabled = pos === -1;
        $('sh-barra').classList.toggle('sh-pasado', pos !== -1);
        $('sh-aplicar').hidden = pos === -1;
        $('sh-borrar').hidden = pos === -1;
        if (pos === -1) {
            $('sh-fecha').textContent = 'Ahora (la carta de hoy)';
            $('sh-cuenta').textContent = n ? n + ' guardada' + (n > 1 ? 's' : '') : 'aún no hay ninguna: se apuntan al guardar en la web';
            $('sh-estado').innerHTML = '';
            return;
        }
        var c = hist.cambios[pos], an = vista.analisis;
        $('sh-fecha').textContent = fechaTxt(c.t);
        $('sh-cuenta').textContent = (pos + 1) + ' de ' + n + ' · ' + an.lista.length + ' sugerencia' + (an.lista.length === 1 ? '' : 's');
        var iguales = an.lista.filter(function (x) { return x.estado === 'igual'; }).length, li = [];
        an.lista.forEach(function (x) {
            var nom = '<b>' + x.id + '</b> ' + esc(corto(x.s.es));
            if (x.estado === 'cambiado' || x.estado === 'mismo') li.push('✏️ ' + nom + ': ' + esc(x.difs.join(', ') || 'mismo plato') + ' <i>(se deja lo de hoy)</i>' +
                (x.estado === 'mismo' ? ' <label><input type="checkbox" data-mismo="' + x.id + '" checked> es el mismo plato</label>' : ''));
            else if (x.estado === 'movido') li.push('↪ ' + nom + ': ahora está en el ID <b>' + x.dest + '</b> (se activa ese)' + (x.difs.length ? '; ' + esc(x.difs.join(', ')) + ' <i>(se deja lo de hoy)</i>' : ''));
            else if (x.estado === 'otro') li.push('<span class="sh-aviso">⚠ ' + nom + ': ese ID es ahora «' + esc(corto(x.actual.es)) + '» → ' +
                (x.dest != null ? 'se volverá a crear en el ID <b>' + x.dest + '</b>' : '<b>no hay ID libre en su sección</b>') + ' (con sus idiomas e Info de entonces)</span>' +
                ' <label><input type="checkbox" data-mismo="' + x.id + '"> es el mismo plato</label>');
            else if (x.estado === 'falta') li.push('<span class="sh-aviso">✖ ' + nom + ': ya no existe → se volverá a crear (con sus idiomas, Info y foto de entonces)</span>');
        });
        var ed = edicionDe(c), h = '';
        if (hayEdicion(c)) {
            var base = hist.conjuntos[c.c] || [], cambiosEd = [];
            base.forEach(function (s) { if (ed.quitar[num(s.id)]) cambiosEd.push('− ' + esc(corto(s.es))); });
            ed.anadir.forEach(function (s) { cambiosEd.push('+ ' + esc(corto(s.es))); });
            h += '<div class="sh-ed"><b>✏️ ' + cambiosEd.length + ' cambio' + (cambiosEd.length > 1 ? 's' : '') + ' sin guardar en esta hoja guardada:</b> <span>' + cambiosEd.join(' · ') + '</span>' +
                '<span style="flex:1"></span><button data-ed="deshacer">↶ Deshacer</button><button data-ed="guardar" class="sh-guardar-ed" id="sh-guardar-ed">💾 Guardar cambios en esta guardada</button></div>';
        } else h += '<div class="sh-nota">Hoja guardada: ✕ quita un plato y ➕ añade uno; luego «💾 Guardar cambios en esta guardada» o «✔ Aplicar esta configuración…».</div>';
        h += '<div>✔ ' + iguales + ' igual' + (iguales === 1 ? '' : 'es') + ' que ahora' + (an.apagar.length ? ' · se desactivarán ' + an.apagar.length + ': ' + an.apagar.map(function (p) { return esc(corto(p.es)); }).join(', ') : '') + '</div>';
        if (li.length) h += '<ul>' + li.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>';
        if (!an.lista.length) h += '<div class="sh-aviso">En ese momento no había ninguna sugerencia activa.</div>';
        $('sh-estado').innerHTML = h;
    }
    function repintarHoja() {
        if (typeof window.renderCarta === 'function') { pintando = true; try { window.renderCarta(S.modo); } finally { pintando = false; } }
    }
    function mover(p) {
        pos = p;
        if (pos === -1) vista = null;
        else { var c = hist.cambios[pos], an = analizar(c); vista = { cambio: c, analisis: an, fuente: fuenteDe(c, an) }; }
        pintarBarra();
        repintarHoja();
    }

    // ---------- aplicar ----------
    var ocupado = false;
    async function aplicar() {
        if (!vista || ocupado) return;
        if (window.hayCambiosSinGuardar) { alert('Hay cambios sin guardar en el editor. Guárdalos (o descártalos) antes de aplicar unas sugerencias guardadas.'); return; }
        var an = vista.analisis, c = vista.cambio;
        var crear = an.lista.filter(function (x) { return x.estado === 'otro' || x.estado === 'falta'; });
        if (crear.some(function (x) { return x.dest == null; })) { alert('No hay ID libre en la sección de algún plato que hay que volver a crear. Haz sitio (🗺️ Mapa de ID) y vuelve a probar.'); return; }
        var texto = 'Dejar activas SOLO las ' + an.lista.length + ' sugerencias del ' + fechaTxt(c.t) + '?' +
            (an.apagar.length ? '\n\nSe desactivan (no se borran): ' + an.apagar.map(function (p) { return corto(p.es); }).join(', ') + '.' : '') +
            (crear.length ? '\n\nSe vuelven a crear ' + crear.length + ': ' + crear.map(function (x) { return corto(x.s.es) + ' (ID ' + x.dest + ')'; }).join(', ') + '.' : '') +
            '\n\nSe guarda en la web (la hoja y la carta).';
        var ok = await (window.confirmarEditor ? window.confirmarEditor(texto, { si: 'Sí, aplicar y guardar', no: 'Cancelar' }) : Promise.resolve(confirm(texto)));
        if (!ok) return;
        ocupado = true; $('sh-aplicar').disabled = true;
        $('sh-estado').insertAdjacentHTML('afterbegin', '<p id="sh-guardando" style="color:#c2410c;font-weight:600">⏳ Guardando en GitHub…</p>');
        try {
            var nuevos = [], avisos = [];
            if (crear.length) {
                var antiguo = null;
                try { var t = c.b ? await api('/git/blobs/' + c.b, true) : null; antiguo = t ? JSON.parse(t) : null; } catch (e) { antiguo = null; }
                crear.forEach(function (x) {
                    var p = antiguo && (antiguo.platos || []).find(function (q) { return num(q.id) === x.id; });
                    if (p && norm((p.nombre || {}).ES) === norm(x.s.es)) p = JSON.parse(JSON.stringify(p));
                    else {
                        avisos.push(corto(x.s.es));
                        p = { id: '', activa: 'si', precio: x.s.p, precioMedia: x.s.m, carpeta: '', archivo: '', alergenos: (x.s.a || []).slice(), opcionesInactivas: [], nombre: { ES: x.s.es, EN: x.s.en }, info: {} };
                    }
                    p.id = String(x.dest); p.activa = 'si';
                    nuevos.push(p);
                });
            }
            var url = typeof window.getWebAppUrl === 'function' ? window.getWebAppUrl(S.modo) : '';
            if (!url) throw new Error('el editor no tiene dirección de guardado');
            var cuerpo = { rango: rangoSug(), activos: an.lista.map(function (x) { return x.dest; }), nuevos: nuevos, desde: fechaTxt(c.t) };
            var r = await fetch(url + '?accion=sugerencias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
            var tx = await r.text();
            if (!r.ok || !/^OK/.test(tx)) throw new Error(tx || ('HTTP ' + r.status));
            ediciones = {};   // ya aplicadas: que el aviso de «cambios sin guardar» no salte al recargar
            try { sessionStorage.setItem('sh-volver', '1'); } catch (e) { }
            alert('✔ Sugerencias aplicadas y guardadas.' + (avisos.length ? '\n\n⚠ De ' + avisos.join(', ') + ' solo se tenía el nombre ES/EN: revisa sus traducciones e Info.' : '') + '\n\nEl editor se recarga para enseñar la carta al día.');
            location.reload();
        } catch (err) {
            ocupado = false; $('sh-aplicar').disabled = false;
            var g = $('sh-guardando'); if (g) g.remove();
            alert('❌ No se pudieron aplicar: ' + err.message);
        }
    }

    // ---------- editar un momento guardado con ✕ / ➕ (22 nov, 1.3.0) ----------
    function quitarDeGuardada(id) {
        if (pos === -1) return;
        var c = hist.cambios[pos], k = claveEd(c), e = ediciones[k] = ediciones[k] || { quitar: {}, anadir: [] };
        id = num(id);
        var i = e.anadir.findIndex(function (s) { return num(s.id) === id; });
        if (i >= 0) e.anadir.splice(i, 1); else e.quitar[id] = true;
        mover(pos);
    }
    function anadirAGuardada(ids) {
        if (pos === -1) return;
        var c = hist.cambios[pos], k = claveEd(c), e = ediciones[k] = ediciones[k] || { quitar: {}, anadir: [] };
        var S = function (v) { return (v === null || v === undefined) ? '' : String(v); };
        ids.map(num).forEach(function (id) {
            if (e.quitar[id]) { delete e.quitar[id]; return; }   // se había quitado: vuelve tal cual estaba guardado
            if (listaDe(c).some(function (s) { return num(s.id) === id; })) return;
            var p = actuales().find(function (x) { return num(x.id) === id; });
            if (!p) return;
            e.anadir.push({ id: S(p.id), es: S(p.es), en: S(p.en), p: S(p.precio), m: S(p.precioMedia),
                a: String(p.alergenos || '').split(',').map(function (a) { return a.trim(); }).filter(Boolean) });
        });
        mover(pos);
    }
    async function huella(lista) {
        var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(lista)));
        return Array.from(new Uint8Array(buf)).slice(0, 6).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }
    // Reescribe ese momento con la lista editada (misma fecha). La carta no cambia.
    async function guardarEdicion() {
        if (pos === -1 || ocupado || !hayEdicion(hist.cambios[pos])) return;
        var c = hist.cambios[pos], lista = listaDe(c).map(function (s) { return { id: String(s.id), es: s.es, en: s.en, p: s.p, m: s.m, a: (s.a || []).slice() }; });
        var clave = await huella(lista);
        ocupado = true;
        var b = $('sh-guardar-ed'); if (b) { b.disabled = true; b.textContent = '⏳ Guardando…'; }
        try {
            await escribirHist('Editor: cambios en las sugerencias guardadas del ' + fechaTxt(c.t), function (h) {
                var x = h.cambios.find(function (y) { return y.t === c.t && y.c === c.c; });
                if (!x) throw new Error('esa hoja guardada ya no está (¿borrada desde otro sitio?)');
                if (!h.conjuntos[clave]) h.conjuntos[clave] = lista;
                x.c = clave; x.n = lista.length;
            });
            delete ediciones[claveEd(c)];
            mover(hist.cambios.findIndex(function (y) { return y.t === c.t; }));
        } catch (err) {
            alert('❌ No se pudieron guardar los cambios de esta hoja guardada: ' + err.message + '\n\nSiguen sin guardar: puedes volver a intentarlo.');
            mover(pos);
        } finally { ocupado = false; }
    }
    window.addEventListener('beforeunload', function (e) {
        if (hist && hist.cambios.some(hayEdicion)) { e.preventDefault(); e.returnValue = ''; }
    });

    // ---------- borrar un momento guardado (22 nov) ----------
    // Solo toca sugerencias-historial.json: quita ese cambio (y su conjunto si nadie más lo usa). La carta no cambia.
    function serializar(h) {
        var J = JSON.stringify, cs = Object.keys(h.conjuntos || {});
        return '{\n  "formato": 1,\n  "conjuntos": {\n' + cs.map(function (k) { return '    ' + J(k) + ': ' + J(h.conjuntos[k]); }).join(',\n') + '\n  },\n' +
            '  "cambios": [\n' + (h.cambios || []).map(function (c) { return '    ' + J(c); }).join(',\n') + '\n  ]\n}\n';
    }
    var b64a = function (t) { return btoa(unescape(encodeURIComponent(t))); };
    var deB64 = function (t) { return decodeURIComponent(escape(atob(String(t || '').replace(/\s/g, '')))); };
    // Lee sugerencias-historial.json de GitHub, aplica cambiar(h) (false = nada que hacer), quita conjuntos sin uso y lo sube
    // (PUT, solo ese archivo). Si otro guardado lo cambió a la vez (409/422), relee y repite.
    async function escribirHist(mensaje, cambiar) {
        var ruta = '/contents/' + ARCHIVO.split('/').map(encodeURIComponent).join('/');
        for (var intento = 0; intento < 3; intento++) {
            var j = await api(ruta);
            if (!j) throw new Error('no hay historial en GitHub');
            var h = JSON.parse(deB64(j.content));
            h.conjuntos = h.conjuntos || {}; h.cambios = h.cambios || [];
            if (cambiar(h) === false) { hist = h; leido = Date.now(); return; }
            var usados = {}; h.cambios.forEach(function (x) { usados[x.c] = 1; });
            Object.keys(h.conjuntos).forEach(function (k) { if (!usados[k]) delete h.conjuntos[k]; });
            var r = await fetch(REPO + ruta, { method: 'PUT', headers: { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: mensaje, content: b64a(serializar(h)), sha: j.sha }) });
            if (r.status === 401 && window.AccesoEditor) window.AccesoEditor.caducado();
            if (r.status === 409 || r.status === 422) continue;
            if (!r.ok) throw new Error('GitHub HTTP ' + r.status);
            hist = h; leido = Date.now(); return;
        }
        throw new Error('GitHub está ocupado: vuelve a probar');
    }
    async function borrarGuardada() {
        if (pos === -1 || ocupado || !hist) return;
        var c = hist.cambios[pos], n = (hist.conjuntos[c.c] || []).length;
        var texto = '¿Eliminar la hoja de Sugerencias guardada del ' + fechaTxt(c.t) + ' (' + n + ' sugerencia' + (n === 1 ? '' : 's') + ')?\n\n' +
            'Solo se borra de «Sugerencias guardadas»: la carta, los platos y la hoja de ahora NO cambian.\nNo se puede deshacer.';
        var ok = await (window.confirmarEditor ? window.confirmarEditor(texto, { si: 'Sí, eliminar esta guardada', no: 'Cancelar' }) : Promise.resolve(confirm(texto)));
        if (!ok) return;
        ocupado = true; $('sh-borrar').disabled = true; $('sh-borrar').textContent = '⏳ Eliminando…';
        try {
            await escribirHist('Editor: eliminar sugerencias guardadas del ' + fechaTxt(c.t), function (h) {
                var i = h.cambios.findIndex(function (x) { return x.t === c.t && x.c === c.c; });
                if (i < 0) return false;   // ya no estaba (borrado desde otro sitio)
                h.cambios.splice(i, 1);
            });
            delete ediciones[claveEd(c)];
            mover(pos >= hist.cambios.length ? hist.cambios.length - 1 : pos);   // se queda en la siguiente (o la anterior si era la última)
        } catch (err) {
            alert('❌ No se pudo eliminar: ' + err.message);
        } finally {
            ocupado = false; $('sh-borrar').disabled = false; $('sh-borrar').textContent = '🗑 Eliminar esta guardada';
        }
    }

    // ---------- enganche con la hoja (sugerencias-print.js) ----------
    var pintando = false;
    window.SugHistorial = {
        fuente: function (modo) { return (modo === S.modo && vista) ? vista.fuente : null; },
        recargar: function () { return cargar(true).then(function () { pintarBarra(); }); },
        quitar: quitarDeGuardada, anadir: anadirAGuardada,
        hayEdiciones: function () { return !!(hist && hist.cambios.some(hayEdicion)); },
        enGuardada: function (modo) { return modo === S.modo && pos !== -1 && !!vista; },
        _estado: function () { return { pos: pos, hist: hist, vista: vista }; }
    };
    function enganchar() {
        var orig = window.renderCarta;
        if (typeof orig !== 'function' || orig.__sh) return typeof orig === 'function';
        var envuelta = function (modo) {
            // Al entrar en la pestaña (o repintar desde el editor) se empieza siempre en «Ahora».
            if (modo === S.modo && !pintando) { pos = -1; vista = null; }
            var res = orig.apply(this, arguments);
            if (modo === S.modo && !pintando && asegurarBarra()) {
                cargar().then(function () { pintarBarra(); }).catch(function (e) { $('sh-cuenta').textContent = '⚠ no se pudo leer el historial (' + e.message + ')'; });
            }
            return res;
        };
        envuelta.__sh = true;
        window.renderCarta = envuelta;
        return true;
    }
    // Flechas del teclado (solo con la hoja de Sugerencias a la vista y sin estar escribiendo en un campo).
    document.addEventListener('keydown', function (e) {
        var b = $('sh-barra');
        if (!b || !hist || !b.offsetParent || e.ctrlKey || e.altKey || e.metaKey || ocupado) return;
        var t = e.target, tag = t && t.tagName;
        if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tag))) return;
        if (document.querySelector('#aviso-ed, [aria-modal="true"]')) return;
        var n = hist.cambios.length;
        if (!n) return;
        var nuevo = null;
        if (e.key === 'ArrowLeft') nuevo = pos === -1 ? n - 1 : Math.max(0, pos - 1);
        else if (e.key === 'ArrowRight') nuevo = pos === -1 ? -1 : (pos >= n - 1 ? -1 : pos + 1);
        else if (e.key === 'Home') nuevo = 0;
        else if (e.key === 'End') nuevo = -1;
        if (nuevo === null) return;
        e.preventDefault();
        if (nuevo !== pos) mover(nuevo);
    });
    function alCargar() {
        if (!enganchar()) window.addEventListener('load', enganchar);
        var volver = false;
        try { volver = sessionStorage.getItem('sh-volver') === '1'; sessionStorage.removeItem('sh-volver'); } catch (e) { }
        if (volver) {
            var tab = { 'sugerencias-contenido': 'sugerencias', 'sugerencias-contenido-usopen': 'sugerencias-usopen' }[CONT];
            setTimeout(function () { var b = document.querySelector('[onclick*="switchTab(\'' + tab + '\'"]'); if (b) b.click(); }, 800);
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', alCargar); else alCargar();
})();
