// =========================================================================================
// mapa-ids.js — ORGANIZADOR, FASE 2: mapa de categorías y rangos de ID (SOLO LECTURA).
// Común a todos los editores (lo copia e inserta construir.ps1). No cambia nada de la carta.
//
// Botón "🗺️ Mapa de ID" en la cabecera (junto a 🌐 Idiomas). Abre una ventana con:
//   - Por categoría (orden del acordeón): rango, capacidad, ocupados (activos / inactivos),
//     libres y una barra con cada ID: verde = activo, gris = inactivo, blanco = libre,
//     rayado = zona del rango que no es de ninguna subcategoría. Subcategorías debajo.
//     Ratón encima = ID y nombre del plato; clic en un plato = lo abre en el editor.
//   - Avisos: platos fuera de toda categoría, platos en zona sin subcategoría, rangos que
//     se pisan (categorías o subcategorías), subcategorías que se salen de su categoría.
//   - Huecos: tramos de ID sin categoría entre una categoría y la siguiente (para la Fase 3).
// Lee la estructura de window.Categorias (datos.json -> "estructura") y los platos de
// window.datosLocales (lo que el editor tiene ahora, incluidos cambios sin guardar).
// =========================================================================================
(function () {
    'use strict';
    window.APP_VERSIONS = window.APP_VERSIONS || {};
    window.APP_VERSIONS.mapaIds = '1.0.0'; // 3 nov: Fase 2 del organizador — mapa de solo lectura

    var $ = function (id) { return document.getElementById(id); };
    var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var COL = { activo: '#27ae60', inactivo: '#b0b8c4', libre: '#ffffff', sinSub: '#fde68a', borde: '#cbd5e1', solape: '#e74c3c' };

    function platos() {
        var lista = (typeof datosLocales !== 'undefined' && Array.isArray(datosLocales)) ? datosLocales : (window.datosLocales || []);   // eslint-disable-line no-undef
        return lista.filter(function (p) { return p && !isNaN(parseInt(p.id, 10)); }); }
    function nombrePlato(p) {
        var t = String(p.es || p.ES || (p.nombre && p.nombre.ES) || '');
        try { if (typeof window.desglosarNombre === 'function') t = window.desglosarNombre(t).nombre || t; } catch (e) { }
        return t.split(/\n|\|/)[0].trim() || '(sin nombre)';
    }

    // ---------- cálculo ----------
    function analizar() {
        var est = window.Categorias && window.Categorias.estructura();
        if (!est) return null;
        // Las filas 1–999 (1–12 hoy) son los nombres de las pestañas de la hoja, no platos.
        var mapa = {};
        platos().forEach(function (p) { var n = parseInt(p.id, 10); if (n >= 1000) mapa[n] = p; });
        var ids = Object.keys(mapa).map(Number).sort(function (a, b) { return a - b; });
        var enRango = function (d, h) { return ids.filter(function (i) { return i >= d && i <= h; }); };
        var cuenta = function (lista) {
            var a = 0; lista.forEach(function (i) { if (mapa[i].activa) a++; });
            return { ocupados: lista.length, activos: a, inactivos: lista.length - a };
        };
        var avisos = [];
        var cats = est.categorias.map(function (c, n) {
            var lista = enRango(c.desde, c.hasta);
            var subs = (c.sub || []).map(function (s) {
                var l = enRango(s.desde, s.hasta);
                if (s.desde < c.desde || s.hasta > c.hasta) avisos.push({ t: 'mal', txt: 'La subcategoría "' + s.nombre + '" (' + s.desde + '–' + s.hasta + ') se sale de "' + c.nombre + '" (' + c.desde + '–' + c.hasta + ').' });
                return { nombre: s.nombre, desde: s.desde, hasta: s.hasta, tipo: s.tipo || '', cap: s.hasta - s.desde + 1, c: cuenta(l) };
            });
            subs.forEach(function (a, i) {
                subs.slice(i + 1).forEach(function (b) {
                    if (a.desde <= b.hasta && b.desde <= a.hasta) avisos.push({ t: 'mal', txt: 'En "' + c.nombre + '" se pisan "' + a.nombre + '" y "' + b.nombre + '" (' + Math.max(a.desde, b.desde) + '–' + Math.min(a.hasta, b.hasta) + ').' });
                });
            });
            var sinSub = subs.length ? lista.filter(function (i) { return !subs.some(function (s) { return i >= s.desde && i <= s.hasta; }); }) : [];
            if (sinSub.length) avisos.push({ t: 'ojo', txt: sinSub.length + ' plato(s) de "' + c.nombre + '" no caen en ninguna subcategoría: ' + sinSub.slice(0, 12).join(', ') + (sinSub.length > 12 ? '…' : '') + '.', ids: sinSub });
            // Tramos del rango que no son de ninguna subcategoría.
            var zonasSinSub = [];
            if (subs.length) {
                var orden = subs.slice().sort(function (a, b) { return a.desde - b.desde; }), cur = c.desde;
                orden.forEach(function (s) { if (s.desde > cur) zonasSinSub.push([cur, Math.min(s.desde - 1, c.hasta)]); cur = Math.max(cur, s.hasta + 1); });
                if (cur <= c.hasta) zonasSinSub.push([cur, c.hasta]);
            }
            var libreSub = zonasSinSub.reduce(function (t, z) { return t + z[1] - z[0] + 1; }, 0);
            return { n: n, nombre: c.nombre, desde: c.desde, hasta: c.hasta, tipo: c.tipo || '', vino: c.vino || '', pestana: c.pestana,
                sinPlatos: !!c.sinPlatos, cap: c.hasta - c.desde + 1, c: cuenta(lista), subs: subs, zonasSinSub: zonasSinSub, libreSub: libreSub, sinSub: sinSub };
        });
        // Solapes entre categorías.
        cats.forEach(function (a, i) {
            cats.slice(i + 1).forEach(function (b) {
                if (a.desde <= b.hasta && b.desde <= a.hasta) avisos.push({ t: 'mal', txt: 'Se pisan "' + a.nombre + '" y "' + b.nombre + '" (' + Math.max(a.desde, b.desde) + '–' + Math.min(a.hasta, b.hasta) + ').' });
            });
        });
        // Platos fuera de toda categoría.
        var fuera = ids.filter(function (i) { return !cats.some(function (c) { return i >= c.desde && i <= c.hasta; }); });
        if (fuera.length) avisos.unshift({ t: 'mal', txt: fuera.length + ' plato(s) con ID fuera de toda categoría (no salen en el acordeón): ' + fuera.slice(0, 15).join(', ') + (fuera.length > 15 ? '…' : '') + '.', ids: fuera });
        // Huecos entre categorías (por número).
        var porNum = cats.slice().sort(function (a, b) { return a.desde - b.desde; }), huecos = [], fin = null;
        porNum.forEach(function (c) {
            if (fin !== null && c.desde > fin + 1) huecos.push([fin + 1, c.desde - 1]);
            fin = fin === null ? c.hasta : Math.max(fin, c.hasta);
        });
        var tot = cats.reduce(function (t, c) { t.cap += c.cap; t.oc += c.c.ocupados; return t; }, { cap: 0, oc: 0 });
        return { cats: cats, avisos: avisos, huecos: huecos, mapa: mapa, total: ids.length, fuera: fuera, tot: tot };
    }

    // ---------- dibujo ----------
    // Barra de un rango: una celda por ID (canvas). Fondo de subcategorías alterno.
    function dibujarBarra(cv, d, h, a, subs, zonas) {
        var cap = h - d + 1, w = cv.clientWidth || 600, hgt = 22, dpr = window.devicePixelRatio || 1;
        cv.width = w * dpr; cv.height = hgt * dpr;
        var g = cv.getContext('2d'); g.scale(dpr, dpr);
        var px = w / cap, x = function (i) { return (i - d) * px; };
        g.fillStyle = COL.libre; g.fillRect(0, 0, w, hgt);
        // Zonas sin subcategoría: rayado.
        (zonas || []).forEach(function (z) {
            g.fillStyle = '#fff7d6'; g.fillRect(x(z[0]), 0, (z[1] - z[0] + 1) * px, hgt);
            g.strokeStyle = COL.sinSub; g.lineWidth = 1;
            g.save(); g.beginPath(); g.rect(x(z[0]), 0, (z[1] - z[0] + 1) * px, hgt); g.clip();
            for (var k = x(z[0]) - hgt; k < x(z[1] + 1); k += 6) { g.beginPath(); g.moveTo(k, hgt); g.lineTo(k + hgt, 0); g.stroke(); }
            g.restore();
        });
        // Límites de subcategorías.
        (subs || []).forEach(function (s, i) {
            if (i % 2) { g.fillStyle = 'rgba(52,152,219,.07)'; g.fillRect(x(Math.max(s.desde, d)), 0, (Math.min(s.hasta, h) - Math.max(s.desde, d) + 1) * px, hgt); }
            g.fillStyle = '#94a3b8'; g.fillRect(Math.round(x(Math.max(s.desde, d))), 0, 1, hgt);
        });
        // Platos.
        var mw = Math.max(px, 2);
        for (var i = d; i <= h; i++) {
            var p = a.mapa[i]; if (!p) continue;
            g.fillStyle = p.activa ? COL.activo : COL.inactivo;
            g.fillRect(x(i) + (px > 3 ? 0.5 : 0), 3, mw - (px > 3 ? 1 : 0), hgt - 6);
        }
        g.strokeStyle = COL.borde; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, hgt - 1);
        cv.__rango = { d: d, h: h, px: px };
    }

    function barraPct(oc, cap) {
        var pc = cap ? Math.round(oc * 100 / cap) : 0, col = pc >= 90 ? '#e74c3c' : pc >= 70 ? '#f39c12' : '#27ae60';
        return '<span style="display:inline-block; width:60px; height:8px; background:#eef2f7; border-radius:4px; vertical-align:middle; overflow:hidden;"><span style="display:block; height:100%; width:' + Math.min(pc, 100) + '%; background:' + col + ';"></span></span> <small style="color:#64748b;">' + pc + '%</small>';
    }
    function etiquetaTipo(c) {
        var t = { sugerencias: 'Sugerencias', vino: 'Vino' + (c.vino ? ' (' + c.vino + ')' : ''), bebida: 'Bebida', alergenos: 'Alérgenos', 'hoja-postres': 'Hoja postres',
            croquetas: 'Croquetas', 'croquetas-veg': 'Croquetas veg.', copas: 'Copas', postres: 'Postres', helados: 'Helados', bebidas: 'Bebidas' }[c.tipo];
        return t ? ' <span style="font-size:.7rem; background:#eef2ff; color:#4338ca; border-radius:10px; padding:1px 7px;">' + t + '</span>' : '';
    }
    function numeros(c) {
        return '<span style="color:#334155;">' + c.c.ocupados + ' / ' + c.cap + '</span> · <span style="color:#27ae60;">' + c.c.activos + ' activos</span>' +
            (c.c.inactivos ? ' · <span style="color:#7b8794;">' + c.c.inactivos + ' inactivos</span>' : '') +
            ' · <b>' + (c.cap - c.c.ocupados) + ' libres</b> ' + barraPct(c.c.ocupados, c.cap);
    }

    function html(a, filtro) {
        var f = (filtro || '').trim().toLowerCase();
        var av = a.avisos.length ? a.avisos.map(function (x) {
            return '<li style="margin:3px 0; color:' + (x.t === 'mal' ? '#b91c1c' : '#92400e') + ';">' + (x.t === 'mal' ? '⛔ ' : '⚠️ ') + esc(x.txt) + '</li>';
        }).join('') : '<li style="color:#15803d;">✔ Sin problemas: ningún plato fuera de su categoría y ningún rango se pisa.</li>';
        var huecos = a.huecos.length ? a.huecos.map(function (h) { return '<span style="display:inline-block; margin:2px 4px 2px 0; padding:2px 8px; border:1px dashed #94a3b8; border-radius:6px; font-size:.78rem;">' + h[0] + '–' + h[1] + ' <small style="color:#64748b;">(' + (h[1] - h[0] + 1) + ')</small></span>'; }).join('') : '<small style="color:#64748b;">ninguno</small>';
        var filas = a.cats.filter(function (c) {
            if (!f) return true;
            return (c.nombre + ' ' + c.subs.map(function (s) { return s.nombre; }).join(' ') + ' ' + c.desde + ' ' + c.hasta).toLowerCase().indexOf(f) >= 0;
        }).map(function (c) {
            var subs = c.subs.map(function (s) {
                return '<div style="display:flex; flex-wrap:wrap; gap:4px 10px; align-items:center; font-size:.78rem; padding:2px 0 2px 14px; border-left:2px solid #e2e8f0;">' +
                    '<span style="min-width:150px;"><b>' + esc(s.nombre) + '</b>' + etiquetaTipo(s) + '</span>' +
                    '<span style="font-family:monospace; color:#475569;">' + s.desde + '–' + s.hasta + '</span>' + numeros(s) + '</div>';
            }).join('');
            if (c.libreSub) subs += '<div style="font-size:.75rem; color:#92400e; padding:2px 0 2px 14px; border-left:2px solid #fde68a;">▨ Sin subcategoría: ' +
                c.zonasSinSub.map(function (z) { return z[0] + '–' + z[1]; }).join(', ') + ' (' + c.libreSub + ' ID)' + (c.sinSub.length ? ' — con ' + c.sinSub.length + ' plato(s) dentro' : '') + '</div>';
            return '<div class="mi-cat" style="border:1px solid #e2e8f0; border-radius:8px; padding:8px 10px; margin-bottom:8px;">' +
                '<div style="display:flex; flex-wrap:wrap; gap:4px 12px; align-items:baseline; margin-bottom:5px;">' +
                '<b style="font-size:.95rem;">' + esc(c.nombre) + '</b>' + etiquetaTipo(c) +
                '<span style="font-family:monospace; color:#475569;">' + c.desde + '–' + c.hasta + '</span>' +
                (c.pestana == null ? '<small style="color:#94a3b8;">sin pestaña en la web</small>' : '') +
                (c.sinPlatos ? '<small style="color:#94a3b8;">(sin platos)</small>' : '') +
                '<span style="font-size:.8rem;">' + numeros(c) + '</span></div>' +
                '<canvas data-cat="' + c.n + '" style="display:block; width:100%; height:22px; cursor:crosshair;"></canvas>' +
                (subs ? '<div style="margin-top:6px;">' + subs + '</div>' : '') + '</div>';
        }).join('');
        return '<div style="display:flex; flex-wrap:wrap; gap:6px 16px; font-size:.8rem; color:#475569; margin-bottom:10px;">' +
            '<span><b>' + a.total + '</b> platos · <b>' + a.cats.length + '</b> categorías · ' + a.tot.oc + ' de ' + a.tot.cap + ' ID usados</span>' +
            '<span><i style="display:inline-block;width:10px;height:10px;background:' + COL.activo + ';"></i> activo</span>' +
            '<span><i style="display:inline-block;width:10px;height:10px;background:' + COL.inactivo + ';"></i> inactivo</span>' +
            '<span><i style="display:inline-block;width:10px;height:10px;border:1px solid #cbd5e1;"></i> libre</span>' +
            '<span><i style="display:inline-block;width:10px;height:10px;background:#fff7d6;border:1px solid ' + COL.sinSub + ';"></i> sin subcategoría</span>' +
            '<span>| línea gris = empieza subcategoría</span></div>' +
            '<details open style="margin-bottom:10px;"><summary style="cursor:pointer; font-weight:600;">Avisos (' + a.avisos.length + ')</summary><ul style="margin:6px 0 0; padding-left:18px; font-size:.82rem;">' + av + '</ul></details>' +
            '<details style="margin-bottom:12px;"><summary style="cursor:pointer; font-weight:600;">Huecos sin categoría entre categorías (' + a.huecos.length + ')</summary><div style="margin-top:6px;">' + huecos + '</div></details>' +
            (filas || '<p style="color:#64748b;">Ninguna categoría coincide.</p>');
    }

    // ---------- ventana ----------
    var tip = null;
    function tooltip(txt, ev) {
        if (!tip) { tip = document.createElement('div'); tip.style.cssText = 'position:fixed; z-index:10002; background:#0f172a; color:#fff; font-size:.75rem; padding:4px 8px; border-radius:5px; pointer-events:none; max-width:320px;'; document.body.appendChild(tip); }
        if (!txt) { tip.style.display = 'none'; return; }
        tip.innerHTML = txt; tip.style.display = 'block';
        tip.style.left = Math.min(ev.clientX + 12, window.innerWidth - 330) + 'px'; tip.style.top = (ev.clientY + 14) + 'px';
    }

    function abrir() {
        var a = analizar();
        if (!a) { alert('Este editor aún no tiene la estructura de la carta (datos.json → "estructura"). Pulsa CONSTRUIR y vuelve a abrir el editor.'); return; }
        var viejo = $('ew-mapa'); if (viejo) viejo.remove();
        var fondo = document.createElement('div');
        fondo.id = 'ew-mapa';
        fondo.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,.45); z-index:10000; display:flex; align-items:center; justify-content:center; padding:12px;';
        fondo.innerHTML = '<div style="background:#fff; border-radius:12px; width:100%; max-width:980px; max-height:94vh; display:flex; flex-direction:column; box-shadow:0 20px 40px rgba(0,0,0,.25);">' +
            '<div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; padding:14px 18px 10px; border-bottom:1px solid #eef2f7;">' +
            '<h3 style="margin:0; font-size:1.1rem; flex:1 1 auto;">🗺️ Mapa de categorías y rangos de ID <small style="font-weight:400; color:#94a3b8;">(solo consulta)</small></h3>' +
            '<input id="ew-mapa-filtro" type="search" placeholder="Buscar categoría o número…" style="padding:5px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:.85rem; width:220px; max-width:100%;">' +
            '<button type="button" id="ew-mapa-cerrar" style="padding:6px 12px; border-radius:6px; border:1px solid #cbd5e1; background:#f1f5f9; cursor:pointer;">Cerrar</button></div>' +
            '<div id="ew-mapa-cuerpo" style="overflow:auto; padding:12px 18px 16px;"></div></div>';
        document.body.appendChild(fondo);
        var cuerpo = $('ew-mapa-cuerpo');
        function pintar() {
            cuerpo.innerHTML = html(a, $('ew-mapa-filtro').value);
            Array.prototype.forEach.call(cuerpo.querySelectorAll('canvas[data-cat]'), function (cv) {
                var c = a.cats[+cv.getAttribute('data-cat')];
                dibujarBarra(cv, c.desde, c.hasta, a, c.subs, c.zonasSinSub);
                var idEn = function (ev) { var r = cv.getBoundingClientRect(), q = cv.__rango; return Math.min(q.h, q.d + Math.floor((ev.clientX - r.left) / q.px)); };
                cv.onmousemove = function (ev) {
                    var id = idEn(ev), p = a.mapa[id];
                    var sub = c.subs.filter(function (s) { return id >= s.desde && id <= s.hasta; })[0];
                    tooltip('<b>' + id + '</b>' + (sub ? ' · ' + esc(sub.nombre) : (c.subs.length ? ' · <i>sin subcategoría</i>' : '')) + '<br>' +
                        (p ? esc(nombrePlato(p)) + (p.activa ? '' : ' <i>(inactivo)</i>') + '<br><small>clic: abrir plato</small>' : '<span style="color:#94a3b8;">libre</span>'), ev);
                    cv.style.cursor = p ? 'pointer' : 'crosshair';
                };
                cv.onmouseleave = function () { tooltip(''); };
                cv.onclick = function (ev) {
                    var id = idEn(ev);
                    if (!a.mapa[id] || typeof window.abrirEditor !== 'function') return;
                    tooltip(''); fondo.remove();
                    window.abrirEditor(a.mapa[id].id);
                };
            });
        }
        pintar();
        $('ew-mapa-filtro').oninput = pintar;
        var cerrar = function () { tooltip(''); fondo.remove(); window.removeEventListener('resize', alCambiar); document.removeEventListener('keydown', alTecla); };
        var alCambiar = function () { if (document.body.contains(fondo)) pintar(); };
        var alTecla = function (ev) { if (ev.key === 'Escape') cerrar(); };
        $('ew-mapa-cerrar').onclick = cerrar;
        fondo.addEventListener('click', function (ev) { if (ev.target === fondo) cerrar(); });
        window.addEventListener('resize', alCambiar);
        document.addEventListener('keydown', alTecla);
    }

    function crearBoton() {
        if ($('ew-btn-mapa')) return;
        var ref = $('ew-btn-idiomas') || $('tabs-visibility-wrapper');
        if (!ref) return;
        var b = document.createElement('button');
        b.id = 'ew-btn-mapa'; b.type = 'button';
        b.textContent = '🗺️ Mapa de ID';
        b.title = 'Ver las categorías con sus rangos de ID: ocupados, libres, huecos y avisos (solo consulta, no cambia nada).';
        b.style.cssText = 'font-size:0.7rem; display:flex; align-items:center; gap:4px; white-space:nowrap; background:#f8f9fa; padding:4px 8px; border-radius:4px; border:1px solid #ddd; cursor:pointer;';
        b.onclick = abrir;
        ref.parentNode.insertBefore(b, ref.nextSibling);
    }

    window.MapaIds = { abrir: abrir, analizar: analizar };
    window.addEventListener('load', function () {
        // Después del botón 🌐 Idiomas (editor-web.js lo crea a los 400 ms).
        setTimeout(crearBoton, 600);
        setTimeout(crearBoton, 2000);
    });
})();
