// =========================================================================================
// revisar.js — "🔎 Revisar carta" (cabecera del editor, junto a 🗺️ Mapa de ID). SOLO CONSULTA.
// Común a todos los editores (lo copia e inserta construir.ps1).
//   - Buscar: cualquier plato por ID o por nombre en cualquier idioma (palabras sueltas, sin tildes).
//   - Sin foto · Sin traducir (por idioma de la web) · Sin alérgenos · Sin precio: solo platos ACTIVOS.
//   Clic en un plato = lo abre en el editor (abrirEditor). Lee window.datosLocales (incluye lo no guardado).
// =========================================================================================
(function () {
    'use strict';
    window.APP_VERSIONS = window.APP_VERSIONS || {};
    window.APP_VERSIONS.revisar = '1.0.0'; // 9 nov: botón 🔎 Revisar carta: buscador de platos (ID o nombre en cualquier idioma) y listas de platos activos sin foto, sin traducir, sin alérgenos y sin precio; clic = abrir el plato

    var $ = function (id) { return document.getElementById(id); };
    var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var norm = function (t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };

    function platos() {
        var l = (typeof datosLocales !== 'undefined' && Array.isArray(datosLocales)) ? datosLocales : (window.datosLocales || []);   // eslint-disable-line no-undef
        return l.filter(function (p) { return p && +p.id >= 1000; }).sort(function (a, b) { return a.id - b.id; });
    }
    function campo(p, l) { var v = p[l]; if (v == null) v = p[l.toLowerCase()]; if (v == null) v = p[l.toUpperCase()]; return String(v == null ? '' : v); }
    function nombre(p, l) {
        var t = campo(p, l || 'es');
        try { if (typeof window.desglosarNombre === 'function') t = window.desglosarNombre(t).nombre || t; } catch (e) { }
        return t.split(/\n|\|/)[0].replace(/\/\/.*$/, '').trim();
    }
    function categoria(id) {
        try {
            var c = window.Categorias && window.Categorias.categoriaDe && window.Categorias.categoriaDe(id);
            var n = c && (c.nombre || c.es || c.id);
            return typeof n === 'string' ? n : (n && typeof n.es === 'string' ? n.es : '') || '';
        } catch (e) { return ''; }
    }
    function idiomas() {
        var e = window.IDIOMAS_WEB_ELEGIDOS;
        var l = (e && e.length) ? e : (window.IDIOMAS_ORDEN || ['es', 'en']);
        return l.map(function (x) { return String(x).toUpperCase(); }).filter(function (x) { return x !== 'ES'; });
    }
    function sinPrecio(p) { var v = parseFloat(String(p.precio || '').replace(',', '.')); return !String(p.precio || '').trim() || !(v > 0); }

    function analizar() {
        var ps = platos(), act = ps.filter(function (p) { return p.activa && nombre(p); });
        var r = { todos: ps, foto: [], alerg: [], precio: [], trad: {} };
        var ls = idiomas();
        ls.forEach(function (l) { r.trad[l] = []; });
        act.forEach(function (p) {
            if (!String(p.imagen || '').trim()) r.foto.push(p);
            if (!String(p.alergenos || '').trim()) r.alerg.push(p);
            if (sinPrecio(p)) r.precio.push(p);
            ls.forEach(function (l) { if (!nombre(p, l)) r.trad[l].push(p); });
        });
        return r;
    }

    function fila(p, extra) {
        return '<div class="rv-f" data-id="' + p.id + '"><b>' + p.id + '</b> ' + esc(nombre(p) || '(sin nombre)') +
            (p.activa ? '' : ' <i class="rv-in">inactivo</i>') + (extra ? ' <small>' + extra + '</small>' : '') + '</div>';
    }
    function porCategoria(lista) {
        if (!lista.length) return '<div class="rv-ok">✔ Ninguno.</div>';
        var g = {}, orden = [];
        lista.forEach(function (p) { var c = categoria(p.id) || 'Sin categoría'; if (!g[c]) { g[c] = []; orden.push(c); } g[c].push(p); });
        return orden.map(function (c) {
            return '<details class="rv-cat"' + (orden.length <= 3 ? ' open' : '') + '><summary>' + esc(c) + ' <span class="rv-n">' + g[c].length + '</span></summary>' +
                g[c].map(function (p) { return fila(p); }).join('') + '</details>';
        }).join('');
    }

    function abrir() {
        if ($('rv-fondo')) return;
        var a = analizar(), pest = 'buscar';
        var nTrad = Object.keys(a.trad).reduce(function (s, l) { return s + (a.trad[l].length ? 1 : 0); }, 0);
        var fondo = document.createElement('div');
        fondo.id = 'rv-fondo';
        fondo.innerHTML = '<style>' +
            '#rv-fondo{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit}' +
            '#rv-caja{background:#fff;border-radius:12px;width:min(980px,100%);height:min(88vh,900px);display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(0,0,0,.3)}' +
            '#rv-cab{padding:14px 18px 0;border-bottom:1px solid #e5e7eb}#rv-cab h3{margin:0 0 8px;font-size:1.15rem}' +
            '.rv-tabs{display:flex;gap:4px;flex-wrap:wrap}.rv-tabs button{border:1px solid #e5e7eb;border-bottom:none;background:#f8fafc;padding:7px 12px;border-radius:8px 8px 0 0;cursor:pointer;font-size:.85rem}' +
            '.rv-tabs button.on{background:#fff;color:#e67e22;font-weight:700;position:relative;top:1px}' +
            '.rv-n{display:inline-block;min-width:18px;padding:0 6px;border-radius:9px;background:#fde68a;color:#7c2d12;font-size:.75rem;text-align:center}' +
            '#rv-cuerpo{flex:1;overflow:auto;padding:14px 18px}' +
            '.rv-f{padding:6px 8px;border-radius:6px;cursor:pointer;font-size:.88rem}.rv-f:hover{background:#fff7ed}.rv-f small{color:#64748b}.rv-in{color:#94a3b8;font-size:.78rem}' +
            '.rv-cat{border:1px solid #e5e7eb;border-radius:8px;margin:0 0 8px;padding:4px 8px}.rv-cat summary{cursor:pointer;font-weight:600;padding:4px 0}' +
            '.rv-ok{color:#15803d;padding:8px}.rv-nota{color:#64748b;font-size:.82rem;margin:0 0 10px}' +
            '#rv-q{width:100%;padding:10px 12px;border:2px solid #e67e22;border-radius:8px;font-size:1rem;box-sizing:border-box;margin-bottom:10px}' +
            '#rv-pie{padding:10px 18px;border-top:1px solid #e5e7eb;text-align:right}#rv-pie button{padding:8px 18px;border-radius:8px;border:1px solid #ddd;background:#f8f9fa;cursor:pointer}' +
            '</style><div id="rv-caja"><div id="rv-cab"><h3>🔎 Revisar carta</h3><div class="rv-tabs">' +
            '<button data-p="buscar">Buscar</button>' +
            '<button data-p="foto">Sin foto <span class="rv-n">' + a.foto.length + '</span></button>' +
            '<button data-p="trad">Sin traducir <span class="rv-n">' + nTrad + ' idioma' + (nTrad === 1 ? '' : 's') + '</span></button>' +
            '<button data-p="alerg">Sin alérgenos <span class="rv-n">' + a.alerg.length + '</span></button>' +
            '<button data-p="precio">Sin precio <span class="rv-n">' + a.precio.length + '</span></button>' +
            '</div></div><div id="rv-cuerpo"></div><div id="rv-pie"><button id="rv-cerrar">Cerrar</button></div></div>';
        document.body.appendChild(fondo);
        var cuerpo = $('rv-cuerpo');
        var q = '';
        function pintarBusqueda() {
            var w = norm(q).split(/\s+/).filter(Boolean), ls = ['ES'].concat(idiomas());
            var res = !w.length ? [] : a.todos.filter(function (p) {
                var txt = norm(p.id + ' ' + ls.map(function (l) { return nombre(p, l); }).join(' '));
                return w.every(function (x) { return txt.indexOf(x) >= 0; });
            });
            $('rv-res').innerHTML = !w.length ? '<p class="rv-nota">Escribe un ID o parte del nombre en cualquier idioma (palabras en cualquier orden, sin tildes). Intro = abre el primero.</p>' :
                (res.length ? res.slice(0, 200).map(function (p) {
                    var c = categoria(p.id), otro = '';
                    if (w.length && norm(nombre(p)).indexOf(w[0]) < 0) {   // coincide en otro idioma: enseñarlo
                        ls.some(function (l) { var n = nombre(p, l); if (n && norm(n).indexOf(w[0]) >= 0) { otro = l + ': ' + esc(n); return true; } });
                    }
                    return fila(p, [c ? esc(c) : '', otro].filter(Boolean).join(' · '));
                }).join('') + (res.length > 200 ? '<p class="rv-nota">… y ' + (res.length - 200) + ' más: afina la búsqueda.</p>' : '') : '<div class="rv-nota">Nada encontrado.</div>');
        }
        function pintar() {
            fondo.querySelectorAll('.rv-tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.p === pest); });
            if (pest === 'buscar') {
                cuerpo.innerHTML = '<input type="text" id="rv-q" placeholder="ID o nombre del plato…" value="' + esc(q) + '"><div id="rv-res"></div>';
                var i = $('rv-q'); i.focus();
                i.oninput = function () { q = i.value; pintarBusqueda(); };
                i.onkeydown = function (e) { if (e.key === 'Enter') { var f = cuerpo.querySelector('.rv-f'); if (f) f.click(); } };
                pintarBusqueda();
            } else if (pest === 'foto') {
                cuerpo.innerHTML = '<p class="rv-nota">Platos activos sin "Nombre Imagen" (la web no enseña 📸). Ábrelo y usa 📷 Fotos del plato, o 🖼️ Fotos de internet.</p>' + porCategoria(a.foto);
            } else if (pest === 'alerg') {
                cuerpo.innerHTML = '<p class="rv-nota">Platos activos sin ningún alérgeno marcado. Puede ser correcto (agua, refrescos…), pero conviene revisarlo: la Info se genera con los alérgenos y los valida el restaurante (Reglamento UE 1169/2011). Ojo: el vino lleva sulfitos.</p>' + porCategoria(a.alerg);
            } else if (pest === 'precio') {
                cuerpo.innerHTML = '<p class="rv-nota">Platos activos sin precio o a 0 (correcto si es un aviso o va incluido, p. ej. guarniciones).</p>' + porCategoria(a.precio);
            } else if (pest === 'trad') {
                var ls = Object.keys(a.trad);
                cuerpo.innerHTML = '<p class="rv-nota">Platos activos sin nombre en cada idioma de la web (🌐 Idiomas). Ábrelo y traduce desde el plato.</p>' +
                    (ls.length ? ls.map(function (l) {
                        var n = a.trad[l].length;
                        return '<details class="rv-cat"><summary>' + esc((window.IDIOMAS_CONFIG && window.IDIOMAS_CONFIG[l]) || l) + ' (' + l + ') ' +
                            (n ? '<span class="rv-n">' + n + '</span>' : '<span style="color:#15803d">✔</span>') + '</summary>' +
                            (n ? a.trad[l].map(function (p) { return fila(p, esc(categoria(p.id))); }).join('') : '<div class="rv-ok">✔ Todos traducidos.</div>') + '</details>';
                    }).join('') : '<div class="rv-ok">La web solo está en español.</div>');
            }
        }
        var cerrar = function () { fondo.remove(); document.removeEventListener('keydown', tecla); };
        var tecla = function (e) { if (e.key === 'Escape') cerrar(); };
        document.addEventListener('keydown', tecla);
        $('rv-cerrar').onclick = cerrar;
        fondo.addEventListener('click', function (e) {
            if (e.target === fondo) { cerrar(); return; }
            var t = e.target.closest && e.target.closest('.rv-tabs button');
            if (t) { pest = t.dataset.p; pintar(); return; }
            var f = e.target.closest && e.target.closest('.rv-f');
            if (f && typeof window.abrirEditor === 'function') { cerrar(); window.abrirEditor(+f.dataset.id); }
        });
        pintar();
    }

    function crearBoton() {
        if ($('ew-btn-revisar')) return;
        var ref = $('ew-btn-mapa') || $('ew-btn-idiomas') || $('tabs-visibility-wrapper');
        if (!ref) return;
        var b = document.createElement('button');
        b.id = 'ew-btn-revisar'; b.type = 'button';
        b.textContent = '🔎 Revisar carta';
        b.title = 'Buscar cualquier plato (ID o nombre en cualquier idioma) y ver los activos sin foto, sin traducir, sin alérgenos o sin precio. Solo consulta.';
        b.style.cssText = 'font-size:0.7rem; display:flex; align-items:center; gap:4px; white-space:nowrap; background:#f8f9fa; padding:4px 8px; border-radius:4px; border:1px solid #ddd; cursor:pointer;';
        b.onclick = abrir;
        ref.parentNode.insertBefore(b, ref.nextSibling);
    }
    window.RevisarCarta = { abrir: abrir, analizar: analizar };
    // Ctrl+K = buscar plato desde cualquier sitio del editor
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K') && !$('rv-fondo') && !document.getElementById('sf-fondo')) { e.preventDefault(); abrir(); }
    });
    window.addEventListener('load', function () {
        // Después de 🗺️ Mapa de ID (mapa-ids.js lo crea a los 600 ms).
        setTimeout(crearBoton, 800);
        setTimeout(crearBoton, 2200);
    });
})();
