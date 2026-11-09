// =========================================================================================
// menu-precios.js — "💶 Precio por persona" del Menú Especial (SOLO en el editor; no se imprime).
// Común a todos los editores (lo copia e inserta construir.ps1). menu-especial.js lo llama desde
// renderFormulario: MenuPrecios.contenedor() (hueco) + MenuPrecios.activar(cont, menu).
//   Precio de cada plato = el de la carta (datos.json); coste = costes.js (cifrado). Los dos se pueden
//   cambiar a mano en cada menú (se guardan en el menú: menu.calculo.ajustes).
//   Por persona:
//     - Sección normal: cada plato entero.  - "A elegir": la MEDIA de las opciones.
//     - Entrantes "A compartir": cada plato ÷ 4 (1 ración cada 4 personas; editable).
//     - Bebidas (precio de la carta por nombre; editable): agua 1 cada 2, cerveza 1 cada 3, refresco 1 cada 4,
//       café/infusión 1 cada 2. Vinos (botella), automático: blanco y tinto 1 cada 4 (1 cada 5 si hay varios
//       vinos), rosado 1 cada 6 (1 cada 8 con más vinos: se toma poco), cava 1 cada 7. Todo editable por menú.
//   Total por persona (PVP y coste), % de coste y, si se pone el precio del menú, beneficio por persona;
//   con nº de comensales, totales del grupo y botellas/aguas necesarias.
// =========================================================================================
(function () {
    'use strict';
    window.APP_VERSIONS = window.APP_VERSIONS || {};
    window.APP_VERSIONS.menuPrecios = '1.1.1'; // 9 nov: secciones "A elegir": cada plato sale como "opción" y debajo una fila con el PRECIO MEDIO de las opciones (antes se veía cada precio ÷ 2 y confundía; el total ya era el mismo). 1.1.0, 9 nov: reparto por bebida (cerveza 1/3, refresco 1/4, café 1/2) y por vino (blanco/tinto 1/4 o 1/5 si hay varios, rosado 1/6 o 1/8, cava 1/7); columnas "Según carta" y "Coste estimado" juntas. 1.0.0, 9 nov: Menú Especial: precio y coste por persona (carta + costes cifrados; compartir ÷4, a elegir = media, agua 1 cada 2, vino 1 botella cada 4), solo en el editor

    var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var num = function (v) { if (v == null || v === '') return NaN; var t = String(v).replace(/[€\s]/g, ''); if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); else t = t.replace(/,/g, ''); return t === '' ? NaN : parseFloat(t); };
    var eur = function (v) { return isFinite(v) ? v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' : '—'; };
    var dec = function (v) { return isFinite(v) ? String(Math.round(v * 100) / 100).replace('.', ',') : ''; };
    var norm = function (t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); };

    var SECCIONES = [['entrantes', 'Entrantes'], ['primero', 'Primero'], ['principal', 'Principal'], ['postre', 'Postre']];
    var VINOS = [['vinoBlanco', '🥂 Vino blanco'], ['vinoRosado', '🌸 Vino rosado'], ['vinoTinto', '🍷 Vino tinto'], ['cava', '🍾 Cava']];
    var DEF = { compartirCada: 4, aguaCada: 2, cervezaCada: 3, refrescoCada: 4, cafeCada: 2, vinoBlancoCada: '', vinoTintoCada: '', vinoRosadoCada: '', cavaCada: '', comensales: '', precioMenu: '', extraPvp: '', extraCoste: '', ajustes: {} };

    function carta() {
        var l = (typeof datosLocales !== 'undefined' && Array.isArray(datosLocales)) ? datosLocales : (window.datosLocales || []);   // eslint-disable-line no-undef
        return l;
    }
    function platoCarta(id) { if (id == null) return null; return carta().find(function (p) { return String(p.id) === String(id); }) || null; }
    function aguaCarta() {
        var l = carta().filter(function (p) { return +p.id >= 1000 && /^agua\b/.test(norm(p.es)) && num(p.precio) > 0; });
        l.sort(function (a, b) { return (b.activa ? 1 : 0) - (a.activa ? 1 : 0) || (/gas/.test(norm(a.es)) ? 1 : 0) - (/gas/.test(norm(b.es)) ? 1 : 0) || a.id - b.id; });
        return l[0] || null;
    }
    function buscarCarta(re) {
        var l = carta().filter(function (p) { return +p.id >= 1000 && re.test(norm(p.es)) && num(p.precio) > 0; });
        l.sort(function (a, b) { return (b.activa ? 1 : 0) - (a.activa ? 1 : 0) || (/\bsin\b|0[.,]0/.test(norm(a.es)) ? 1 : 0) - (/\bsin\b|0[.,]0/.test(norm(b.es)) ? 1 : 0) || a.id - b.id; });
        return l[0] || null;
    }
    var BEBIDAS = [
        ['agua', 'Agua', 2, function () { return aguaCarta(); }],
        ['cerveza', 'Cerveza', 3, function () { return buscarCarta(/^(cerveza|cana|tercio|botellin|jarra)\b/); }],
        ['refresco', 'Refresco', 4, function () { return buscarCarta(/^(refresco|coca|fanta|sprite|nestea|aquarius|tonica|schweppes|pepsi|7 ?up|zumo)/); }],
        ['cafe', 'Café o infusión', 2, function () { return buscarCarta(/^(cafe|espresso|expreso|infusion)/); }]
    ];
    // Reparto automático de cada vino (botella cada N pax). "Varios vinos" = más de uno de blanco/tinto/rosado.
    function repartoVinoAuto(b) {
        var n = ['vinoBlanco', 'vinoTinto', 'vinoRosado'].filter(function (k) { var s = b[k]; return s && s.activo && s.platos && s.platos.length; }).length;
        var varios = n > 1;
        return { vinoBlanco: varios ? 5 : 4, vinoTinto: varios ? 5 : 4, vinoRosado: varios ? 8 : 6, cava: 7, varios: varios };
    }
    function cfg(menu) {
        if (menu.calculo && menu.calculo.__propio) return menu.calculo;
        // Copia propia (el menú cargado comparte objetos con la lista de guardados: no tocarla hasta Guardar)
        var c = JSON.parse(JSON.stringify(Object.assign({}, DEF, menu.calculo || {})));
        if (!c.ajustes || typeof c.ajustes !== 'object') c.ajustes = {};
        delete c.vinoCada;   // 1.0.0: un solo reparto para todos los vinos
        Object.defineProperty(c, '__propio', { value: true, enumerable: false });
        menu.calculo = c;
        return c;
    }
    function clave(p) { return p.id != null && !p.manual && p.modo !== 'manual' ? 'id:' + p.id : 'm:' + norm(p.es); }
    function costes() { return window.Costes; }

    // Líneas del cálculo: { sec, clave, nombre, pvp, coste, origenPvp, factor, reparto }
    function lineas(menu) {
        var c = cfg(menu), out = [];
        var valor = function (k, pc, idCoste) {
            var a = c.ajustes[k] || {};
            var pvp = isFinite(num(a.pvp)) ? num(a.pvp) : num(pc && pc.precio);
            var co = isFinite(num(a.coste)) ? num(a.coste) : (costes() && idCoste != null ? costes().get(idCoste) : NaN);
            return { pvp: pvp, coste: co, aPvp: isFinite(num(a.pvp)), aCoste: isFinite(num(a.coste)) };
        };
        SECCIONES.forEach(function (s) {
            var sec = menu.secciones && menu.secciones[s[0]];
            if (!sec || !sec.activo || !sec.platos || !sec.platos.length) return;
            var n = sec.platos.length, comp = s[0] === 'entrantes' && sec.compartir, eleg = !comp && sec.aElegir;
            var cc = Math.max(1, num(c.compartirCada) || 4);
            sec.platos.forEach(function (p) {
                var k = clave(p), pc = p.manual || p.modo === 'manual' ? null : platoCarta(p.id), v = valor(k, pc, pc ? pc.id : null);
                out.push({ sec: s[1], clave: k, nombre: p.es, pvp: v.pvp, coste: v.coste, aPvp: v.aPvp, aCoste: v.aCoste, sinCarta: !pc,
                    factor: comp ? 1 / cc : eleg ? 1 / n : 1, reparto: comp ? '1 cada ' + cc + ' pax' : eleg ? 'opción a elegir' : 'entero', opcion: eleg, grupo: s[0], n: n });
            });
        });
        var b = menu.bebida || {};
        var cadaDe = function (k, def) { var v = num(c[k + 'Cada']); return v >= 1 ? v : def; };
        BEBIDAS.forEach(function (d) {
            if (!b[d[0]]) return;
            var it = d[3](), v = valor(d[0], it, it ? it.id : null), ca = cadaDe(d[0], d[2]);
            var nc = it ? String(it.es).split('//')[0].trim() : '';
            out.push({ sec: 'Bebida', clave: d[0], etiqueta: d[1], nombre: it ? (norm(nc).indexOf(norm(d[1]).split(' ')[0]) === 0 ? nc : d[1] + ': ' + nc) : d[1] + ' (no está en la carta: pon el precio)',
                pvp: v.pvp, coste: v.coste, aPvp: v.aPvp, aCoste: v.aCoste, sinCarta: !it, factor: 1 / ca, reparto: '1 cada ' + ca + ' pax', cada: ca });
        });
        var auto = repartoVinoAuto(b);
        VINOS.forEach(function (w) {
            var slot = b[w[0]];
            if (!slot || !slot.activo || !slot.platos || !slot.platos.length) return;
            var cv = cadaDe(w[0], auto[w[0]]), aMano = num(c[w[0] + 'Cada']) >= 1;
            // Solo hay uno por hueco; si hubiera varios, el más caro.
            var mejor = null;
            slot.platos.forEach(function (p) {
                var k = clave(p), pc = p.manual ? null : platoCarta(p.id), v = valor(k, pc, pc ? pc.id : null);
                var x = { sec: 'Bebida', clave: k, etiqueta: w[1].replace(/^\S+\s/, ''), nombre: w[1].replace(/^\S+\s/, '') + ': ' + p.es, pvp: v.pvp, coste: v.coste, aPvp: v.aPvp, aCoste: v.aCoste, sinCarta: !pc, factor: 1 / cv,
                    reparto: '1 botella cada ' + cv + ' pax' + (aMano ? '' : w[0] === 'cava' ? ' (brindis)' : auto.varios ? ' (hay varios vinos)' : ''), cada: cv };
                if (!mejor || (x.pvp || 0) > (mejor.pvp || 0)) mejor = x;
            });
            out.push(mejor);
        });
        if (isFinite(num(c.extraPvp)) || isFinite(num(c.extraCoste))) {
            out.push({ sec: 'Extra', clave: '', nombre: 'Extra por persona', pvp: num(c.extraPvp), coste: num(c.extraCoste), factor: 1, reparto: 'por persona', extra: true });
        }
        return out;
    }
    function totales(menu) {
        var ls = lineas(menu), t = { pvp: 0, coste: 0, faltaPvp: 0, faltaCoste: 0, lineas: ls };
        ls.forEach(function (l) {
            if (isFinite(l.pvp)) t.pvp += l.pvp * l.factor; else t.faltaPvp++;
            if (isFinite(l.coste)) t.coste += l.coste * l.factor; else t.faltaCoste++;
        });
        return t;
    }

    function contenedor() { return '<div class="me-card" id="mp-panel"></div>'; }

    function pintar(cont) {
        var est = cont.__mp, menu = est && est.menu, panel = cont.querySelector('#mp-panel');
        if (!panel || !menu) return;
        var c = cfg(menu), t = totales(menu), C = costes(), abierto = C && C.abierto();
        var pax = num(c.comensales), pm = num(c.precioMenu), b0 = menu.bebida || {}, auto0 = repartoVinoAuto(b0);
        var inp = function (campo, v, ancho, ph) { return '<input type="text" inputmode="decimal" data-c="' + campo + '" value="' + esc(v === '' || v == null ? '' : String(v).replace('.', ',')) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + ' style="width:' + (ancho || 52) + 'px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:5px;text-align:right">'; };
        var ult = '', FC = '#fffaf2', FK = '#f4f7fb';
        // "A elegir": cada plato es una opción; por persona cuenta la MEDIA de los precios de las opciones.
        var filaMedia = function (g) {
            var sp = 0, sc = 0, okC = true;
            g.forEach(function (q) { sp += isFinite(q.pvp) ? q.pvp : 0; if (isFinite(q.coste)) sc += q.coste; else okC = false; });
            var mp = sp / g.length, mc = sc / g.length;
            return '<tr style="border-top:1px dashed #e5c9a8"><td style="padding:4px 6px;font-style:italic;color:#9a3412">→ Precio medio de las ' + g.length + ' opciones</td>' +
                '<td style="color:#64748b;font-size:.78rem;padding:0 8px;white-space:nowrap">media (' + g.map(function (q) { return dec(q.pvp) || '?'; }).join(' + ') + ') ÷ ' + g.length + '</td>' +
                '<td style="background:' + FC + '"></td><td style="text-align:right;white-space:nowrap;padding:0 8px;background:' + FC + ';font-weight:700">' + eur(mp) + '</td>' +
                '<td style="background:' + FK + '"></td><td style="text-align:right;white-space:nowrap;padding:0 8px;background:' + FK + ';color:#475569;font-weight:600">' + (abierto ? (okC ? eur(mc) : '—') : '') + '</td></tr>';
        };
        var filas = t.lineas.map(function (l, i, todas) {
            var cab = l.sec !== ult ? '<tr><td colspan="6" style="background:#fff7ed;font-weight:700;color:#9a3412;padding:6px">' + esc(l.sec) + '</td></tr>' : '';
            ult = l.sec;
            var celdaPvp = l.extra ? inp('extraPvp', c.extraPvp, 64) : '<input type="text" inputmode="decimal" data-k="' + esc(l.clave) + '" data-t="pvp" value="' + (l.aPvp ? dec(l.pvp) : '') + '" placeholder="' + (isFinite(l.pvp) && !l.aPvp ? dec(l.pvp) : '¿precio?') + '" title="' + (l.aPvp ? 'Precio puesto a mano en este menú (vacío = el de la carta)' : 'Precio de la carta (escribe otro para este menú)') + '" style="width:64px;padding:4px 6px;border:1px solid ' + (l.aPvp ? '#2563eb' : '#cbd5e1') + ';border-radius:5px;text-align:right">';
            var celdaCo = !abierto && !l.extra ? '<span title="Costes bloqueados">🔒</span>' : l.extra ? inp('extraCoste', c.extraCoste, 64) :
                '<input type="text" inputmode="decimal" data-k="' + esc(l.clave) + '" data-t="coste" value="' + (l.aCoste ? dec(l.coste) : '') + '" placeholder="' + (isFinite(l.coste) && !l.aCoste ? dec(l.coste) : '¿coste?') + '" title="' + (l.aCoste ? 'Coste puesto a mano en este menú (vacío = el de 💰 Precios de coste)' : 'Coste de 💰 Precios de coste (escribe otro para este menú)') + '" style="width:64px;padding:4px 6px;border:1px solid ' + (l.aCoste ? '#2563eb' : '#cbd5e1') + ';border-radius:5px;text-align:right">';
            return cab + '<tr><td style="padding:4px 6px">' + esc(l.nombre) + (l.sinCarta && !l.extra ? ' <small style="color:#b45309">(no está en la carta)</small>' : '') + '</td>' +
                '<td style="color:#64748b;font-size:.78rem;padding:0 8px;white-space:nowrap">' + esc(l.reparto) + '</td>' +
                '<td style="text-align:right;background:' + FC + '">' + celdaPvp + '</td>' +
                '<td style="text-align:right;white-space:nowrap;padding:0 8px;background:' + FC + ';font-weight:600">' + (l.opcion ? '<span style="color:#94a3b8;font-weight:400">opción</span>' : eur(l.pvp * l.factor)) + '</td>' +
                '<td style="text-align:right;background:' + FK + '">' + celdaCo + '</td>' +
                '<td style="text-align:right;white-space:nowrap;padding:0 8px;background:' + FK + ';color:#475569">' + (l.opcion ? '' : (abierto || l.extra ? eur(l.coste * l.factor) : '')) + '</td></tr>' +
                (l.opcion && (!todas[i + 1] || todas[i + 1].grupo !== l.grupo) ? filaMedia(todas.filter(function (q) { return q.grupo === l.grupo; })) : '');
        }).join('');
        var pcCoste = t.pvp > 0 && abierto ? t.coste / t.pvp * 100 : NaN;
        var pcMenu = pm > 0 && abierto ? t.coste / pm * 100 : NaN;
        var grupo = '';
        if (pax > 0) {
            var bot = t.lineas.filter(function (l) { return l.cada; }).map(function (l) { return Math.ceil(pax / l.cada) + ' × ' + (l.etiqueta || l.nombre.replace(/:.*$/, '')); });
            grupo = '<div style="margin-top:6px;font-size:.85rem">👥 <b>' + pax + ' comensales</b>: carta ' + eur(t.pvp * pax) + (abierto ? ' · coste ' + eur(t.coste * pax) : '') + (pm > 0 ? ' · menú ' + eur(pm * pax) + (abierto ? ' · beneficio ' + eur((pm - t.coste) * pax) : '') : '') +
                (bot.length ? '<br><small style="color:#64748b">Hacen falta: ' + esc(bot.join(' · ')) + '</small>' : '') + '</div>';
        }
        panel.innerHTML = '<label class="label-seccion">💶 Precio por persona <span style="font-weight:500;text-transform:none;color:#999">(solo en el editor, no se imprime)</span></label>' +
            '<div class="me-fila" style="gap:12px;font-size:.82rem;margin-bottom:6px;align-items:center"><b style="color:#475569">Reparto (1 cada … personas):</b>' +
            '<span>Entrantes a compartir ' + inp('compartirCada', c.compartirCada, 40) + '</span>' +
            BEBIDAS.filter(function (d) { return b0[d[0]]; }).map(function (d) { return '<span>' + d[1] + ' ' + inp(d[0] + 'Cada', c[d[0] + 'Cada'], 40, String(d[2])) + '</span>'; }).join('') +
            VINOS.filter(function (w) { var s0 = b0[w[0]]; return s0 && s0.activo; }).map(function (w) {
                return '<span title="Botellas. Vacío = automático (' + auto0[w[0]] + (w[0] === 'cava' ? '' : auto0.varios ? ', porque hay varios vinos' : '') + ')">' + w[1].replace(/^\S+\s/, '') + ' ' + inp(w[0] + 'Cada', c[w[0] + 'Cada'], 40, 'auto ' + auto0[w[0]]) + '</span>';
            }).join('') + '</div>' +
            '<div class="me-fila" style="gap:14px;font-size:.82rem;margin-bottom:8px">' +
            '<span>Comensales ' + inp('comensales', c.comensales, 50, '—') + '</span>' +
            '<span>Precio del menú ' + inp('precioMenu', c.precioMenu, 64, '—') + ' €/pax</span>' +
            (C ? '<button type="button" class="btn btn-secondary" data-b="costes" style="font-size:.78rem;padding:5px 10px">💰 Precios de coste…</button>' + (abierto ? '' : '<button type="button" class="btn btn-secondary" data-b="abrir" style="font-size:.78rem;padding:5px 10px">🔓 Ver costes</button>') : '') +
            (isFinite(num(c.extraPvp)) || isFinite(num(c.extraCoste)) ? '' : '<button type="button" class="btn btn-secondary" data-b="extra" style="font-size:.78rem;padding:5px 10px" title="Pan, aperitivo, chupito… un importe fijo por persona">＋ Extra por persona</button>') +
            '</div>' +
            (t.lineas.length ? '<table style="width:100%;border-collapse:collapse;font-size:.85rem">' +
                '<tr style="color:#475569;font-size:.78rem"><th rowspan="2" style="text-align:left;vertical-align:bottom">Plato / bebida</th><th rowspan="2" style="text-align:left;vertical-align:bottom;padding:0 8px">Reparto</th>' +
                '<th colspan="2" style="background:#fde7c8;color:#9a3412;padding:4px;border-radius:6px 6px 0 0">💶 Según la carta (PVP)</th><th colspan="2" style="background:#dfe7f2;color:#1e3a5f;padding:4px;border-radius:6px 6px 0 0">💰 Coste estimado</th></tr>' +
                '<tr style="color:#64748b;font-size:.72rem"><th style="text-align:right;background:' + FC + ';padding:2px 6px">Precio unidad</th><th style="text-align:right;background:' + FC + ';padding:2px 8px">Por persona</th>' +
                '<th style="text-align:right;background:' + FK + ';padding:2px 6px">Coste unidad</th><th style="text-align:right;background:' + FK + ';padding:2px 8px">Por persona</th></tr>' + filas + '</table>' : '<p style="color:#999;font-size:.85rem">Añade platos al menú para ver el precio.</p>') +
            '<div style="margin-top:10px;padding:10px 12px;background:#f8fafc;border-radius:8px;display:flex;gap:22px;flex-wrap:wrap;align-items:baseline">' +
            '<span>Total carta <b style="font-size:1.15rem">' + eur(t.pvp) + '</b>/pax</span>' +
            (abierto ? '<span>Coste <b style="font-size:1.15rem">' + eur(t.coste) + '</b>/pax' + (isFinite(pcCoste) ? ' <small>(' + pcCoste.toFixed(0) + ' % de la carta)</small>' : '') + '</span>' : '<span style="color:#94a3b8">Coste: 🔒</span>') +
            (pm > 0 ? '<span>Menú a <b>' + eur(pm) + '</b>: ' + (pm < t.pvp ? 'descuento ' + eur(t.pvp - pm) + ' (' + ((1 - pm / t.pvp) * 100).toFixed(0) + ' %)' : 'por encima de carta') + (abierto ? ' · beneficio <b>' + eur(pm - t.coste) + '</b>/pax · coste ' + (isFinite(pcMenu) ? pcMenu.toFixed(0) + ' %' : '—') : '') + '</span>' : '') +
            '</div>' +
            (t.faltaPvp || (abierto && t.faltaCoste) ? '<div style="color:#b45309;font-size:.8rem;margin-top:6px">⚠ ' + [t.faltaPvp ? t.faltaPvp + ' sin precio' : '', abierto && t.faltaCoste ? t.faltaCoste + ' sin coste' : ''].filter(Boolean).join(' · ') + ' (no suman: ponlos en la tabla o en 💰 Precios de coste).</div>' : '') +
            '<div style="color:#94a3b8;font-size:.75rem;margin-top:4px">Vinos vacíos = automático: blanco y tinto 1 cada 4 (1 cada 5 si hay varios vinos), rosado 1 cada 6 (1 cada 8), cava 1 cada 7. Bebidas: solo las marcadas en 🥤 Bebida. Casilla con borde azul = puesto a mano para este menú. Los cambios de esta tabla se guardan con el menú (💾 Guardar menú).</div>' +
            grupo;
    }

    function activar(cont, menu) {
        if (!cont) return;
        var nuevo = !cont.__mp;
        cont.__mp = cont.__mp || {};
        cont.__mp.menu = menu;
        if (nuevo) {
            var reloj = null;
            var luego = function () { clearTimeout(reloj); reloj = setTimeout(function () { pintar(cont); }, 120); };
            // Cambios en el resto del formulario (añadir/quitar platos, compartir, a elegir, vinos…)
            new MutationObserver(function (ms) {
                if (ms.some(function (m) { var p = cont.querySelector('#mp-panel'); return !(p && p.contains(m.target)) && m.target !== p; })) luego();
            }).observe(cont, { childList: true, subtree: true });
            cont.addEventListener('change', function (e) {
                var panel = cont.querySelector('#mp-panel');
                if (!(panel && panel.contains(e.target))) { luego(); return; }
                var m = cont.__mp.menu, c = cfg(m), el = e.target;
                if (el.dataset.c) { c[el.dataset.c] = el.value.trim() === '' ? '' : (isFinite(num(el.value)) ? num(el.value) : ''); }
                else if (el.dataset.k !== undefined) {
                    var a = c.ajustes[el.dataset.k] = c.ajustes[el.dataset.k] || {};
                    var v = num(el.value);
                    if (isFinite(v)) a[el.dataset.t] = v; else delete a[el.dataset.t];
                    if (!Object.keys(a).length) delete c.ajustes[el.dataset.k];
                }
                pintar(cont);
            });
            cont.addEventListener('click', function (e) {
                var b = e.target.closest && e.target.closest('#mp-panel [data-b]');
                if (!b) return;
                var C = costes();
                if (b.dataset.b === 'costes' && C) C.abrir();
                if (b.dataset.b === 'abrir' && C) C.desbloquear().then(function () { pintar(cont); });
                if (b.dataset.b === 'extra') { var c = cfg(cont.__mp.menu); c.extraPvp = 0; c.extraCoste = 0; pintar(cont); }
            });
            if (costes()) { costes().alCambiar(function () { pintar(cont); }); costes().cargarSilencioso(); }
        }
        pintar(cont);
    }

    window.MenuPrecios = { contenedor: contenedor, activar: activar, totales: totales };
})();
