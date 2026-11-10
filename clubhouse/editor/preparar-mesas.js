// =========================================================================================
// preparar-mesas.js — pestaña "🪑 Preparar mesas" del Menú Especial (SOLO en el editor).
// Común a todos los editores (lo copia e inserta construir.ps1). menu-especial.js lo llama desde
// renderFormulario: PrepararMesas.contenedor() (hueco) + PrepararMesas.activar(cont, menu).
//   - SALAS (plantillas): <web>/salas.json en GitHub (SubirFoto.leerTexto/guardarTexto). Cada sala: nombre,
//     ancho y largo en metros y elementos (columna, barra/mueble, puerta, ventana, zona no usable, texto).
//     Se dibuja con "✏️ Editar sala" y se guarda con "💾 Guardar plantilla". Sin GitHub: localStorage.
//   - MESAS del menú (menu.mesas, se guardan con 💾 Guardar menú): rectangulares, por MÓDULOS de 4 plazas
//     (2 personas en cada lado largo). Las cabeceras (+1 / +2) son la excepción. "🪄 Repartir y colocar"
//     reparte los comensales en mesas múltiplo de 4 y las coloca sin pisar obstáculos; luego se arrastran.
//   - MATERIAL: cubiertos según el pase (mesa = tenedor + cuchillo; pescado = tenedor + pala de pescado;
//     postre = cuchara + tenedor, cuchillo opcional; cuchara sopera), plato guía, plato de mesa, plato de pan,
//     copa de agua / vino / cava, servilleta, y aceite + sal + pimienta: 1 juego cada 4 pax de cada mesa.
// =========================================================================================
(function () {
    'use strict';
    window.APP_VERSIONS = window.APP_VERSIONS || {};
    window.APP_VERSIONS.prepararMesas = '1.6.0'; // 10 nov: al quitar una mesa, sus sillas movidas y ocupadas se quedan como SILLAS SUELTAS (también ➕ Silla suelta); color de cada mesa y asiento silla/butaca; DISPOSICIÓN HABITUAL de cada sala (📌 guardar las mesas colocadas en la plantilla y 📥 colocarlas en cualquier menú). 1.5.0, 10 nov: LISTA DE MESAS a mano: se pone el nº de mesas (p. ej. 8) y los comensales de cada una; cada mesa toma sola su tamaño (múltiplo de 4, o cabeceras si está marcado) y se coloca en la sala. 1.4.0, 10 nov: mesas CUADRADAS individuales (selector 60/65/70/80 cm, de serie 70; dos juntas = 4 plazas; el material cuenta mesas sueltas) y SILLAS movibles una a una (arrastrar o flechas: sofá, otra cabecera…; Supr = vuelve a su sitio). 1.3.0, 10 nov: ↶ Deshacer / ↷ Rehacer (botones y Ctrl+Z / Ctrl+Y) de todo lo hecho en la pestaña: sala, objetos, mesas, reparto y opciones de material (hasta 100 pasos por menú abierto). 1.2.0, 10 nov: medidas del objeto elegido ENCIMA del plano y en cm exactos (ancho, alto y posición desde la pared izquierda/superior), y rotuladas sobre el objeto. 1.1.0, 10 nov: flechas del teclado mueven el objeto o la mesa elegidos (10 cm; con Mayús 1 cm) y Supr lo quita; elementos nuevos Planta y Sofá; botón 🪑 Mesa también mientras se edita la sala. 1.0.0, 10 nov: Menú Especial: pestaña 🪑 Preparar mesas (plantillas de sala dibujables en salas.json, mesas rectangulares por módulos de 4 plazas con cabeceras opcionales, reparto automático, lista de cubiertos/platos/copas y hoja de montaje imprimible)

    var ARCH = 'salas.json', LS = 'pm-salas-local';
    var SILLA = 45, HUECO = 4;                       // cm: fondo de la silla y separación con la mesa
    var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var num = function (v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : NaN; };
    var norm = function (t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); };
    var metros = function (cm) { return String(Math.round(cm) / 100).replace('.', ','); };
    var red = function (v) { return Math.round(v / 10) * 10; };
    var avisar = function (t) { window.alert(t); };
    var confirmar = function (t) { return window.confirmarEditor ? window.confirmarEditor(t, { si: 'Sí', no: 'No' }) : Promise.resolve(window.confirm(t)); };

    var TIPOS = {
        columna: { n: 'Columna', c: '#64748b', w: 50, h: 50, bloquea: true },
        barra: { n: 'Barra / mueble', c: '#c9a37a', w: 300, h: 70, bloquea: true },
        sofa: { n: 'Sofá', c: '#c4b5fd', w: 200, h: 90, bloquea: true, rx: 16 },
        planta: { n: 'Planta', c: '#5fb37c', w: 60, h: 60, bloquea: true, rx: 999 },
        puerta: { n: 'Puerta (dejar libre)', c: '#86efac', w: 120, h: 100, bloquea: true },
        ventana: { n: 'Ventana', c: '#7dd3fc', w: 200, h: 15, bloquea: false },
        zona: { n: 'Zona no usable', c: '#cbd5e1', w: 200, h: 200, bloquea: true },
        texto: { n: 'Texto', c: 'none', w: 200, h: 50, bloquea: false }
    };
    var SECC = [['entrantes', 'Entrantes'], ['primero', 'Primero'], ['principal', 'Principal'], ['postre', 'Postre']];
    var CUB = {
        mesa: ['Entrante / carne: tenedor + cuchillo', { 'Tenedor de mesa': 1, 'Cuchillo de mesa': 1 }],
        pescado: ['Pescado: tenedor + pala de pescado', { 'Tenedor de pescado': 1, 'Pala de pescado': 1 }],
        ambos: ['Carne o pescado (a elegir): los dos juegos', { 'Tenedor de mesa': 1, 'Cuchillo de mesa': 1, 'Tenedor de pescado': 1, 'Pala de pescado': 1 }],
        cuchara: ['Sopa / crema: cuchara sopera', { 'Cuchara sopera': 1 }],
        postre: ['Postre: cuchara + tenedor de postre', { 'Cuchara de postre': 1, 'Tenedor de postre': 1 }],
        no: ['Sin cubierto', {}]
    };
    var COL = { clara: ['Madera clara', '#fde7c8', '#7c2d12'], oscura: ['Madera oscura', '#a9774a', '#fff'], blanca: ['Blanca', '#ffffff', '#334155'], negra: ['Negra', '#3f3f46', '#fff'], gris: ['Gris', '#cbd5e1', '#1e293b'] };
    var ASIENTO = { silla: '#334155', butaca: '#8a5a2b' };
    var RE_PESCADO = /\b(pescado|lubina|dorada|merluza|bacalao|salmon|atun|rape|rodaballo|lenguado|corvina|mero|besugo|emperador|gallo|raya|serviola|cap roig|dentol|san pedro|trucha|boqueron|sardina|caballa)/;
    var RE_CUCHARA = /^(crema|sopa|gazpacho|salmorejo|consome|caldo|vichyssoise|ajoblanco)\b/;

    var datos = null;          // { mesa: {largo, ancho}, salas: [...] }
    var cargando = null, sucias = false, guardando = false;
    var ui = { modo: 'mesas', sel: null, salaId: null };
    var CONT = null;
    var hist = [], rehecho = [], ultimo = null, histMenu = null, restaurando = false, guardado = '';   // deshacer / rehacer

    // ---------- Salas (plantillas) ----------
    function vacio() { return { version: 1, mesa: { lado: 70 }, salas: [] }; }
    function MA() { return datos.mesa.lado; }        // mesa cuadrada individual (2 plazas); dos juntas = módulo de 4
    function ML() { return datos.mesa.lado * 2; }
    function sanear(d) {
        d = d && typeof d === 'object' ? d : vacio();
        if (!d.mesa || !(d.mesa.lado > 0)) d.mesa = { lado: 70 };
        if (!Array.isArray(d.salas)) d.salas = [];
        d.salas.forEach(function (s) { if (!Array.isArray(s.el)) s.el = []; });
        return d;
    }
    function conGitHub() { return !!(window.SubirFoto && window.SubirFoto.leerTexto); }
    function cargar() {
        if (datos) return Promise.resolve(datos);
        if (cargando) return cargando;
        cargando = (conGitHub() ? window.SubirFoto.leerTexto(ARCH) : Promise.resolve(localStorage.getItem(LS)))
            .then(function (t) { datos = sanear(t ? JSON.parse(t) : null); guardado = JSON.stringify(datos); })
            .catch(function (e) { datos = sanear(null); ui.error = 'No se han podido leer las salas guardadas: ' + e.message; })
            .then(function () { cargando = null; return datos; });
        return cargando;
    }
    function guardarSalas() {
        if (guardando) return;
        guardando = true; pintar();
        var txt = JSON.stringify(datos, null, 1);
        var p = conGitHub() ? window.SubirFoto.guardarTexto(ARCH, txt, 'Salas para preparar mesas (' + datos.salas.length + ')') : Promise.resolve(localStorage.setItem(LS, txt));
        p.then(function () { sucias = false; guardado = JSON.stringify(datos); }, function (e) { avisar('No se ha podido guardar la plantilla: ' + e.message); })
            .then(function () { guardando = false; pintar(); });
    }
    function sala() {
        if (!datos || !datos.salas.length) return null;
        return datos.salas.filter(function (s) { return s.id === ui.salaId; })[0] || datos.salas[0];
    }
    function nuevaSala(copia) {
        var n = datos.salas.length + 1;
        var s = copia ? JSON.parse(JSON.stringify(copia)) : { nombre: 'Sala ' + n, w: 1200, h: 800, el: [] };
        s.id = 's' + Date.now().toString(36);
        if (copia) s.nombre = copia.nombre + ' (copia)';
        datos.salas.push(s); ui.salaId = s.id; sucias = true;
        return s;
    }

    // ---------- Mesas del menú ----------
    function cfg(menu) {
        if (menu.mesas && menu.mesas.__propio) return menu.mesas;
        var c = JSON.parse(JSON.stringify(Object.assign({ pax: '', tam: 8, cab: false, pasillo: 100, lista: [], sueltas: [], cub: {}, op: {} }, menu.mesas || {})));
        if (!Array.isArray(c.lista)) c.lista = [];
        if (!Array.isArray(c.sueltas)) c.sueltas = [];
        c.cub = c.cub || {}; c.op = c.op || {};
        Object.defineProperty(c, '__propio', { value: true, enumerable: false });
        menu.mesas = c;
        return c;
    }
    function paxMenu(menu) {
        var c = cfg(menu), p = num(c.pax);
        if (p > 0) return Math.round(p);
        p = num(menu.calculo && menu.calculo.comensales);   // el de 💶 Precio por persona
        return p > 0 ? Math.round(p) : 0;
    }
    function plazas(m) { return m.mod * 4 + (m.cab || 0); }
    function cuerpo(m) {   // rectángulo de la mesa (sin sillas)
        var L = ML() * m.mod, A = MA();
        return m.rot ? { x: m.x, y: m.y, w: A, h: L } : { x: m.x, y: m.y, w: L, h: A };
    }
    function huella(m, margen) {   // mesa + sillas (+ margen)
        var c = cuerpo(m), s = SILLA + HUECO, g = margen || 0, lado = s + g, cabA = (m.cab >= 1 ? s : 0) + g, cabB = (m.cab >= 2 ? s : 0) + g;
        return m.rot ? { x: c.x - lado, y: c.y - cabA, w: c.w + 2 * lado, h: c.h + cabA + cabB } : { x: c.x - cabA, y: c.y - lado, w: c.w + cabA + cabB, h: c.h + 2 * lado };
    }
    function pisa(a, b) { return a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5; }
    function mesasDe(menu, s) {
        var ids = datos.salas.map(function (x) { return x.id; });
        return cfg(menu).lista.filter(function (m) { return m.s === s.id || (ids.indexOf(m.s) < 0 && s === datos.salas[0]); });
    }
    function sueltasDe(menu, s) {
        var ids = datos.salas.map(function (x) { return x.id; });
        return cfg(menu).sueltas.filter(function (m) { return m.s === s.id || (ids.indexOf(m.s) < 0 && s === datos.salas[0]); });
    }
    // Quitar una mesa: sus sillas movidas a mano y ocupadas (sofá, otra cabecera…) se quedan como sillas sueltas
    function quitarMesa(c, i) {
        var m = c.lista[i];
        if (!m) return;
        asientos(m).forEach(function (r, k) {
            var o = m.sil && m.sil[k];
            if (o && k < (m.pax || 0)) c.sueltas.push({ s: m.s, x: Math.round(m.x + r.x + o[0]), y: Math.round(m.y + r.y + o[1]), as: m.as || '' });
        });
        c.lista.splice(i, 1);
    }
    function mal(m, s, otras, margen) {
        var h = huella(m, margen);
        if (h.x < 0 || h.y < 0 || h.x + h.w > s.w || h.y + h.h > s.h) return true;
        if (s.el.some(function (e) { return TIPOS[e.t] && TIPOS[e.t].bloquea && pisa(huella(m), e); })) return true;
        return otras.some(function (o) { return o !== m && pisa(h, huella(o)); });
    }
    // Reparto: mesas de "tam" plazas (múltiplo de 4; 0 = una sola mesa). El resto, en una mesa múltiplo de 4
    // (con plazas libres) o, si se permite, 1-2 sueltos en cabeceras.
    function repartir(pax, tam, conCab) {
        var out = [], r = pax, T = tam > 0 ? tam : Math.ceil(pax / 4) * 4;
        if (tam <= 0 && conCab && pax > 4 && pax % 4 > 0 && pax % 4 <= 2) return [{ mod: Math.floor(pax / 4), cab: pax % 4, pax: pax }];
        while (r > 0) {
            var p = Math.min(r, T); r -= p;
            if (conCab && r > 0 && r <= 2) { out.push({ mod: p / 4, cab: r, pax: p + r }); r = 0; }
            else if (conCab && p > 4 && p % 4 > 0 && p % 4 <= 2) out.push({ mod: Math.floor(p / 4), cab: p % 4, pax: p });
            else out.push({ mod: Math.ceil(p / 4), cab: 0, pax: p });
        }
        return out;
    }
    // Tamaño de una mesa para "pax" comensales: múltiplo de 4, o 1-2 en cabeceras si se permite
    function talla(m, pax, conCab) {
        pax = Math.max(1, Math.round(pax) || 1);
        if (!(m.mod >= 1 && pax <= plazas(m) && pax > plazas(m) - 4 - (m.cab || 0))) {
            delete m.sil;
            if (conCab && pax > 4 && pax % 4 > 0 && pax % 4 <= 2) { m.mod = Math.floor(pax / 4); m.cab = pax % 4; }
            else { m.mod = Math.ceil(pax / 4); m.cab = 0; }
        }
        m.pax = pax;
    }
    function colocar(m, s, puestas, pasillo) {
        var rots = [0, 1];
        for (var r = 0; r < 2; r++) {
            m.rot = rots[r];
            for (var y = 0; y < s.h; y += 20) for (var x = 0; x < s.w; x += 20) {
                m.x = x; m.y = y;
                var h = huella(m);
                if (h.x < 30 || h.y < 30 || h.x + h.w > s.w - 30 || h.y + h.h > s.h - 30) continue;
                if (!mal(m, s, puestas, pasillo)) return true;
            }
        }
        m.rot = 0; m.x = 60; m.y = 60;
        return false;
    }
    function repartirYColocar(menu) {
        var c = cfg(menu), s = sala(), pax = paxMenu(menu);
        if (!s) { avisar('Primero crea una sala (➕ Nueva sala).'); return; }
        if (!pax) { avisar('Pon el número de comensales.'); return; }
        var resto = c.lista.filter(function (m) { return mesasDe(menu, s).indexOf(m) < 0; });
        var nuevas = repartir(pax, num(c.tam) || 0, !!c.cab), fuera = 0;
        nuevas.sort(function (a, b) { return b.mod - a.mod; });
        var puestas = [];
        nuevas.forEach(function (m) { m.s = s.id; if (!colocar(m, s, puestas, Math.max(0, num(c.pasillo) || 0))) fuera++; puestas.push(m); });
        c.lista = resto.concat(nuevas);
        ui.sel = null;
        if (fuera) avisar(fuera + ' mesa(s) no caben en "' + s.nombre + '" con ese pasillo: están en rojo arriba a la izquierda. Muévelas, reduce el pasillo o usa otra sala.');
    }

    // ---------- Material ----------
    function tipoAuto(menu, k) {
        if (k === 'postre') return 'postre';
        var sec = menu.secciones[k], ns = sec.platos.map(function (p) { return norm(p.es); });
        if (ns.every(function (n) { return RE_CUCHARA.test(n); })) return 'cuchara';
        if (k === 'entrantes') return 'mesa';
        var np = ns.filter(function (n) { return RE_PESCADO.test(n); }).length;
        if (np === ns.length) return 'pescado';
        if (np && sec.aElegir) return 'ambos';
        return 'mesa';
    }
    function pases(menu) {
        var c = cfg(menu);
        return SECC.filter(function (s) { var x = menu.secciones && menu.secciones[s[0]]; return x && x.activo && x.platos && x.platos.length; })
            .map(function (s) { var a = tipoAuto(menu, s[0]), t = CUB[c.cub[s[0]]] ? c.cub[s[0]] : a; return { k: s[0], n: s[1], tipo: t, auto: a, aMano: t !== a }; });
    }
    function material(menu) {
        var c = cfg(menu), op = c.op, b = menu.bebida || {}, l = [], cub = {};
        var lista = c.lista, sentados = lista.reduce(function (t, m) { return t + (m.pax || 0); }, 0);
        var nsu = c.sueltas.length, hayM = lista.length || nsu;
        var pax = hayM ? sentados + nsu : paxMenu(menu);
        pases(menu).forEach(function (p) {
            var it = CUB[p.tipo][1];
            Object.keys(it).forEach(function (n) { cub[n] = (cub[n] || 0) + it[n]; });
            if (p.tipo === 'postre' && op.cuchilloPostre) cub['Cuchillo de postre'] = (cub['Cuchillo de postre'] || 0) + 1;
        });
        ['Tenedor de mesa', 'Cuchillo de mesa', 'Tenedor de pescado', 'Pala de pescado', 'Cuchara sopera', 'Cuchara de postre', 'Tenedor de postre', 'Cuchillo de postre']
            .forEach(function (n) { if (cub[n]) l.push({ g: 'Cubiertos', n: n, pp: cub[n] }); });
        if (op.guia !== false) l.push({ g: 'Platos', n: 'Plato guía (bajoplato)', pp: 1 });
        l.push({ g: 'Platos', n: 'Plato de mesa', pp: 1 });
        if (op.pan !== false) l.push({ g: 'Platos', n: 'Plato de pan', pp: 1 });
        var nv = ['vinoBlanco', 'vinoRosado', 'vinoTinto'].filter(function (k) { return b[k] && b[k].activo; }).length;
        var cv = num(op.copasVino) >= 0 ? num(op.copasVino) : Math.max(1, nv);
        l.push({ g: 'Cristalería', n: 'Vaso / copa de agua', pp: 1 });
        if (cv) l.push({ g: 'Cristalería', n: 'Copa de vino', pp: cv });
        if (op.cava === true || (op.cava !== false && b.cava && b.cava.activo)) l.push({ g: 'Cristalería', n: 'Copa de cava', pp: 1 });
        l.push({ g: 'Otros', n: 'Servilleta', pp: 1 });
        var res = Math.max(0, num(op.reserva) || 0);
        l.forEach(function (x) { x.total = x.pp * pax; x.conRes = Math.ceil(x.total * (1 + res / 100)); });
        var juegos = lista.length ? lista.reduce(function (t, m) { return t + Math.ceil((m.pax || 0) / 4); }, 0) : Math.ceil(pax / 4);
        l.push({ g: 'Otros', n: 'Aceite + sal + pimienta (1 juego cada 4 pax de cada mesa)', pp: '', total: juegos, conRes: juegos });
        var but = lista.reduce(function (t, m) { return t + (m.as === 'butaca' ? (m.pax || 0) : 0); }, 0) + c.sueltas.filter(function (x) { return x.as === 'butaca'; }).length;
        if (pax - but > 0 || !but) l.push({ g: 'Mobiliario', n: 'Sillas', pp: '', total: pax - but, conRes: pax - but });
        if (but) l.push({ g: 'Mobiliario', n: 'Butacas', pp: '', total: but, conRes: but });
        if (lista.length) l.push({ g: 'Mobiliario', n: 'Mesas cuadradas de ' + MA() + ' × ' + MA() + ' cm (2 juntas = 4 plazas)', pp: '', total: lista.reduce(function (t, m) { return t + m.mod * 2; }, 0), conRes: '' });
        return { lineas: l, pax: pax, plazas: lista.reduce(function (t, m) { return t + plazas(m); }, 0), reserva: res, nv: nv };
    }

    // ---------- Dibujo (SVG, unidades = cm) ----------
    function asientos(m) {
        var L = ML(), A = MA(), w = m.as === 'butaca' ? Math.min(58, L / 2 - 4) : Math.min(46, L / 2 - 8), out = [];
        for (var k = 0; k < m.mod * 2; k++) {
            var x = (k + 0.5) * L / 2 - w / 2;
            out.push({ x: x, y: -SILLA - HUECO, w: w, h: SILLA }, { x: x, y: A + HUECO, w: w, h: SILLA });
        }
        if (m.cab >= 1) out.push({ x: -SILLA - HUECO, y: A / 2 - w / 2, w: SILLA, h: w });
        if (m.cab >= 2) out.push({ x: L * m.mod + HUECO, y: A / 2 - w / 2, w: SILLA, h: w });
        return m.rot ? out.map(function (r) { return { x: r.y, y: r.x, w: r.h, h: r.w }; }) : out;
    }
    function svgMesa(m, i, n, sel, rojo) {
        var c = cuerpo(m), L = ML(), t = '';
        var ks = sel && ui.sel ? ui.sel.silla : null;
        asientos(m).forEach(function (r, k) {
            var o = m.sil && m.sil[k], sx = '#334155', sw = 3;
            if (o) { r = { x: r.x + o[0], y: r.y + o[1], w: r.w, h: r.h, bx: r.x, by: r.y }; sx = '#2563eb'; }
            if (ks === k) { sx = '#2563eb'; sw = 7; }
            t += '<rect data-silla="' + k + '" data-bx="' + (o ? r.bx : r.x) + '" data-by="' + (o ? r.by : r.y) + '" style="cursor:move" x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="' + (m.as === 'butaca' ? 4 : 10) + '" fill="' + (k < (m.pax || 0) ? ASIENTO[m.as] || ASIENTO.silla : '#fff') + '" stroke="' + sx + '" stroke-width="' + sw + '"' + (k < (m.pax || 0) ? '' : ' stroke-dasharray="8 6"') + '/>';
        });
        t += '<rect width="' + c.w + '" height="' + c.h + '" rx="6" fill="' + (rojo ? '#fecaca' : (COL[m.col] || COL.clara)[1]) + '" stroke="' + (sel ? '#2563eb' : rojo ? '#dc2626' : '#9a3412') + '" stroke-width="' + (sel ? 8 : 4) + '"/>';
        for (var k = 1; k < m.mod * 2; k++) t += m.rot ? '<line x1="0" y1="' + k * L / 2 + '" x2="' + c.w + '" y2="' + k * L / 2 + '" stroke="#9a3412" stroke-width="2" stroke-dasharray="6 6"/>' : '<line x1="' + k * L / 2 + '" y1="0" x2="' + k * L / 2 + '" y2="' + c.h + '" stroke="#9a3412" stroke-width="2" stroke-dasharray="6 6"/>';
        var txt = 'M' + n + ' · ' + (m.pax || 0) + (m.pax !== plazas(m) ? '/' + plazas(m) : '');
        t += '<text x="' + c.w / 2 + '" y="' + c.h / 2 + '" text-anchor="middle" dominant-baseline="central" font-size="30" font-weight="700" fill="' + (rojo ? '#7c2d12' : (COL[m.col] || COL.clara)[2]) + '"' + (m.rot ? ' transform="rotate(-90 ' + c.w / 2 + ' ' + c.h / 2 + ')"' : '') + '>' + txt + '</text>';
        return '<g data-mesa="' + i + '" transform="translate(' + m.x + ',' + m.y + ')" style="cursor:grab">' + t + '</g>';
    }
    function svgSala(menu, s, imprimir) {
        var c = cfg(menu), t = '', editSala = ui.modo === 'sala' && !imprimir;
        t += '<defs><pattern id="pm-raya" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="24" height="24" fill="#e2e8f0"/><line x1="0" y1="0" x2="0" y2="24" stroke="#94a3b8" stroke-width="6"/></pattern></defs>';
        t += '<rect x="0" y="0" width="' + s.w + '" height="' + s.h + '" fill="#fff" stroke="#1e293b" stroke-width="12"/>';
        for (var x = 100; x < s.w; x += 100) t += '<line x1="' + x + '" y1="0" x2="' + x + '" y2="' + s.h + '" stroke="#e2e8f0" stroke-width="' + (x % 500 ? 1.5 : 4) + '"/>';
        for (var y = 100; y < s.h; y += 100) t += '<line x1="0" y1="' + y + '" x2="' + s.w + '" y2="' + y + '" stroke="#e2e8f0" stroke-width="' + (y % 500 ? 1.5 : 4) + '"/>';
        t += '<text x="' + s.w / 2 + '" y="-16" text-anchor="middle" font-size="30" fill="#475569">' + esc(s.nombre) + ' · ' + metros(s.w) + ' × ' + metros(s.h) + ' m (cuadrícula 1 m)</text>';
        s.el.forEach(function (e, i) {
            var T = TIPOS[e.t] || TIPOS.zona, sel = editSala && ui.sel && ui.sel.el === i;
            t += '<g data-el="' + i + '" transform="translate(' + e.x + ',' + e.y + ')"' + (editSala ? ' style="cursor:grab"' : '') + '>' +
                '<rect width="' + e.w + '" height="' + e.h + '"' + (T.rx ? ' rx="' + Math.min(T.rx, e.w / 2, e.h / 2) + '"' : '') + ' fill="' + (e.t === 'zona' ? 'url(#pm-raya)' : e.t === 'texto' ? (editSala ? 'rgba(148,163,184,.15)' : 'none') : T.c) + '" stroke="' + (sel ? '#2563eb' : e.t === 'texto' ? 'none' : '#475569') + '" stroke-width="' + (sel ? 8 : 3) + '"/>' +
                (e.txt ? '<text x="' + e.w / 2 + '" y="' + e.h / 2 + '" text-anchor="middle" dominant-baseline="central" font-size="' + (e.t === 'texto' ? 40 : 26) + '" fill="#1e293b"' + (e.h > e.w * 1.5 ? ' transform="rotate(-90 ' + e.w / 2 + ' ' + e.h / 2 + ')"' : '') + '>' + esc(e.txt) + '</text>' : '') +
                (sel ? '<text x="' + e.w / 2 + '" y="-10" text-anchor="middle" font-size="24" font-weight="700" fill="#2563eb">' + e.w + ' × ' + e.h + ' cm</text>' : '') +
                (sel ? '<rect data-asa="' + i + '" x="' + (e.w - 22) + '" y="' + (e.h - 22) + '" width="44" height="44" fill="#2563eb" style="cursor:nwse-resize"/>' : '') + '</g>';
        });
        var ms = mesasDe(menu, s), n0 = 0;
        c.lista.forEach(function (m, i) {
            n0++;
            if (ms.indexOf(m) < 0) return;
            t += svgMesa(m, i, n0, !imprimir && ui.modo === 'mesas' && ui.sel && ui.sel.mesa === i, !imprimir && mal(m, s, ms, 0));
        });
        sueltasDe(menu, s).forEach(function (x) {
            var i = c.sueltas.indexOf(x), sel = !imprimir && ui.modo === 'mesas' && ui.sel && ui.sel.suelta === i, b = x.as === 'butaca';
            t += '<g data-suelta="' + i + '" transform="translate(' + x.x + ',' + x.y + ')" style="cursor:move"><rect width="' + (b ? 56 : 46) + '" height="' + (b ? 56 : 46) + '" rx="' + (b ? 4 : 10) + '" fill="' + (b ? ASIENTO.butaca : ASIENTO.silla) + '" stroke="' + (sel ? '#2563eb' : '#0f172a') + '" stroke-width="' + (sel ? 8 : 3) + '"/></g>';
        });
        return '<svg id="pm-svg" xmlns="http://www.w3.org/2000/svg" viewBox="-40 -60 ' + (s.w + 80) + ' ' + (s.h + 100) + '" style="width:100%;max-height:' + (imprimir ? '150mm' : '72vh') + ';background:#f1f5f9;border-radius:8px;touch-action:none;user-select:none;' + (editSala ? 'outline:3px dashed #2563eb;' : '') + '">' + t + '</svg>';
    }

    // ---------- Panel ----------
    function contenedor() { return '<div id="pm-panel"></div>'; }
    function B(a, txt, extra, tit) { return '<button type="button" class="btn btn-secondary" data-a="' + a + '" style="font-size:.78rem;padding:5px 10px;' + (extra || '') + '"' + (tit ? ' title="' + esc(tit) + '"' : '') + '>' + txt + '</button>'; }
    function I(f, v, ancho, ph, tipo) { return '<input type="text" ' + (tipo === 'txt' ? '' : 'inputmode="decimal" ') + 'data-f="' + f + '" value="' + esc(v == null ? '' : v) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + ' style="width:' + (ancho || 52) + 'px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:5px;' + (tipo === 'txt' ? '' : 'text-align:right') + '">'; }

    function htmlMaterial(menu, imprimir) {
        var c = cfg(menu), M = material(menu), ult = '';
        var th = 'style="text-align:right;padding:3px 8px"', td = 'style="text-align:right;padding:3px 8px;white-space:nowrap"';
        var filas = M.lineas.map(function (x) {
            var cab = x.g !== ult ? '<tr><td colspan="4" style="background:#fff7ed;font-weight:700;color:#9a3412;padding:5px 6px">' + x.g + '</td></tr>' : '';
            ult = x.g;
            return cab + '<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:3px 6px">' + esc(x.n) + '</td><td ' + td + '>' + (x.pp === '' ? '' : x.pp) + '</td><td ' + td + '><b>' + x.total + '</b></td>' + (M.reserva ? '<td ' + td + '>' + x.conRes + '</td>' : '') + '</tr>';
        }).join('');
        var ps = pases(menu);
        var cub = imprimir ? ps.map(function (p) { return '<b>' + p.n + '</b>: ' + CUB[p.tipo][0].toLowerCase() + (p.tipo === 'postre' && c.op.cuchilloPostre ? ' + cuchillo de postre' : ''); }).join(' · ') :
            ps.map(function (p) {
                return '<span>' + p.n + ' <select data-cub="' + p.k + '" style="padding:4px;border:1px solid ' + (p.aMano ? '#2563eb' : '#cbd5e1') + ';border-radius:5px;font-size:.8rem">' +
                    Object.keys(CUB).map(function (k) { return '<option value="' + k + '"' + (k === p.tipo ? ' selected' : '') + '>' + CUB[k][0] + (k === p.auto ? ' (auto)' : '') + '</option>'; }).join('') + '</select></span>';
            }).join('');
        return (ps.length ? '<div class="me-fila" style="gap:12px;font-size:.82rem;margin-bottom:8px">' + cub + '</div>' : '<p style="color:#b45309;font-size:.82rem">El menú no tiene platos todavía: no se cuentan cubiertos.</p>') +
            (imprimir ? '' : '<div class="me-fila" style="gap:14px;font-size:.82rem;margin-bottom:8px">' +
                '<label><input type="checkbox" data-op="cuchilloPostre"' + (c.op.cuchilloPostre ? ' checked' : '') + '> Cuchillo de postre</label>' +
                '<label><input type="checkbox" data-op="guia"' + (c.op.guia !== false ? ' checked' : '') + '> Plato guía</label>' +
                '<label><input type="checkbox" data-op="pan"' + (c.op.pan !== false ? ' checked' : '') + '> Plato de pan</label>' +
                '<label><input type="checkbox" data-op="cava"' + (c.op.cava === true || (c.op.cava !== false && menu.bebida && menu.bebida.cava && menu.bebida.cava.activo) ? ' checked' : '') + '> Copa de cava</label>' +
                '<span title="Vacío = una por cada vino del menú (mínimo 1)">Copas de vino por persona ' + I('op.copasVino', c.op.copasVino, 40, 'auto ' + Math.max(1, M.nv)) + '</span>' +
                '<span title="Material de más para reponer">Reserva ' + I('op.reserva', c.op.reserva, 40, '0') + ' %</span></div>') +
            '<table style="width:100%;max-width:640px;border-collapse:collapse;font-size:.85rem"><tr style="color:#64748b;font-size:.75rem"><th style="text-align:left">Material</th><th ' + th + '>Por persona</th><th ' + th + '>Total (' + M.pax + ' pax)</th>' + (M.reserva ? '<th ' + th + '>Con reserva ' + M.reserva + ' %</th>' : '') + '</tr>' + filas + '</table>';
    }
    function htmlMesas(menu) {
        var c = cfg(menu), n = 0;
        if (!c.lista.length) return '';
        return '<table style="border-collapse:collapse;font-size:.82rem;margin-top:10px"><tr style="color:#64748b;font-size:.75rem"><th style="text-align:left;padding:2px 8px">Mesa</th><th style="padding:2px 8px">Sala</th><th style="padding:2px 8px">Medida</th><th style="padding:2px 8px">Plazas</th><th style="padding:2px 8px">Comensales</th><th style="padding:2px 8px">Aceite/sal/pim.</th></tr>' +
            c.lista.map(function (m) {
                n++;
                var s = datos.salas.filter(function (x) { return x.id === m.s; })[0] || datos.salas[0];
                return '<tr style="border-top:1px solid #f1f5f9;text-align:center"><td style="text-align:left;padding:2px 8px"><b>M' + n + '</b></td><td style="padding:2px 8px">' + esc(s ? s.nombre : '') + '</td><td style="padding:2px 8px">' + m.mod * 2 + ' mesas · ' + metros(ML() * m.mod) + ' × ' + metros(MA()) + ' m</td><td>' + plazas(m) + (m.cab ? ' (' + m.cab + ' cabecera' + (m.cab > 1 ? 's' : '') + ')' : '') + '</td><td><b>' + (m.pax || 0) + '</b></td><td>' + Math.ceil((m.pax || 0) / 4) + '</td></tr>';
            }).join('') + (c.sueltas.length ? '<tr style="border-top:1px solid #f1f5f9;text-align:center"><td style="text-align:left;padding:2px 8px" colspan="4"><b>Sillas sueltas</b> (sofá, otra cabecera…)</td><td><b>' + c.sueltas.length + '</b></td><td></td></tr>' : '') + '</table>';
    }

    function pintar() {
        var cont = CONT, panel = cont && cont.querySelector('#pm-panel'), menu = cont && cont.__pm && cont.__pm.menu;
        if (!panel || !menu || !panel.offsetParent) return;   // pestaña oculta: se pinta al abrirla
        if (!datos) { panel.innerHTML = '<div class="me-card">⏳ Cargando las salas…</div>'; cargar().then(pintar); return; }
        var c = cfg(menu), s = sala(), M = material(menu), pax = paxMenu(menu);
        if (s) ui.salaId = s.id;
        // Historial: cada repintado con el estado distinto al anterior es un paso que se puede deshacer
        var foto = JSON.stringify({ d: datos, m: c });
        if (histMenu !== menu) { hist = []; rehecho = []; histMenu = menu; }
        else if (ultimo && foto !== ultimo && !restaurando) { hist.push(ultimo); if (hist.length > 100) hist.shift(); rehecho = []; }
        ultimo = foto; restaurando = false;
        var enSala = ui.modo === 'sala' && s;
        var h = '';
        // 1. Reparto
        h += '<div class="me-card"><label class="label-seccion">🪑 Preparar mesas <span style="font-weight:500;text-transform:none;color:#999">(solo en el editor; se guarda con 💾 Guardar menú)</span></label>' +
            (ui.error ? '<div style="color:#b91c1c;font-size:.82rem;margin-bottom:6px">⚠ ' + esc(ui.error) + '</div>' : '') +
            '<div class="me-fila" style="gap:14px;font-size:.85rem">' +
            '<span>Comensales ' + I('pax', c.pax, 54, pax ? String(pax) : '—') + '</span>' +
            '<span>Mesas de <select data-f="tam" style="padding:4px;border:1px solid #cbd5e1;border-radius:5px">' + [4, 8, 12, 16, 20, 24, 0].map(function (t) { return '<option value="' + t + '"' + (+c.tam === t ? ' selected' : '') + '>' + (t ? t + ' pax' : 'una sola mesa') + '</option>'; }).join('') + '</select></span>' +
            '<label title="Excepcional: si sobran 1 o 2 comensales se sientan en las cabeceras en vez de abrir otra mesa de 4"><input type="checkbox" data-f="cab"' + (c.cab ? ' checked' : '') + '> Usar cabeceras para 1-2 sueltos</label>' +
            '<span title="Separación mínima entre sillas de mesas vecinas al colocar">Pasillo ' + I('pasillo', c.pasillo, 46) + ' cm</span>' +
            '<button type="button" class="btn btn-primary" data-a="repartir" style="font-size:.82rem;padding:6px 12px">🪄 Repartir y colocar' + (s ? ' en ' + esc(s.nombre) : '') + '</button>' +
            '</div>' +
            '<div class="me-fila" style="gap:8px;font-size:.85rem;margin-top:10px;padding-top:10px;border-top:1px solid #f1f5f9"><b title="Reparto a mano: pon cuántas mesas quieres y los comensales de cada una">📋 Lista de mesas</b>' +
            '<span>Nº de mesas ' + I('nMesas', c.lista.length || '', 44, '—') + '</span>' +
            c.lista.map(function (m, i) { return '<span style="background:#fff7ed;padding:3px 6px;border-radius:6px;' + (ui.sel && ui.sel.mesa === i ? 'outline:2px solid #2563eb;' : '') + '">M' + (i + 1) + ' <input type="text" inputmode="numeric" data-lp="' + i + '" value="' + (m.pax || 0) + '" title="Comensales de la mesa M' + (i + 1) + ' (ahora ' + plazas(m) + ' plazas)" style="width:36px;padding:3px 4px;border:1px solid #cbd5e1;border-radius:5px;text-align:right"></span>'; }).join('') +
            (c.lista.length ? '' : '<span style="color:#94a3b8">p. ej. 8 mesas y luego los comensales de cada una</span>') + '</div>' +
            (c.lista.length || c.sueltas.length ? '<div style="margin-top:8px;font-size:.85rem">' + c.lista.length + ' mesa(s) · <b>' + M.plazas + ' plazas</b> · ' + M.pax + ' sentados' + (c.sueltas.length ? ' (' + c.sueltas.length + ' en sillas sueltas)' : '') +
                (pax && M.pax !== pax ? ' <span style="color:#b91c1c">⚠ el menú es para ' + pax + ' comensales</span>' : '') + (M.plazas > M.pax ? ' · ' + (M.plazas - M.pax) + ' libres' : '') + '</div>' : '') + '</div>';
        // 2. Sala
        h += '<div class="me-card"><div class="me-fila" style="gap:8px;margin-bottom:8px;font-size:.85rem">' +
            '<button type="button" class="btn btn-secondary" data-a="deshacer" style="font-size:.78rem;padding:5px 10px"' + (hist.length ? '' : ' disabled') + ' title="Deshacer el último cambio (Ctrl+Z)">↶ Deshacer' + (hist.length ? ' (' + hist.length + ')' : '') + '</button>' +
            '<button type="button" class="btn btn-secondary" data-a="rehacer" style="font-size:.78rem;padding:5px 10px"' + (rehecho.length ? '' : ' disabled') + ' title="Rehacer (Ctrl+Y)">↷ Rehacer</button>';
        if (!datos.salas.length) h += '<span style="color:#64748b">Todavía no hay ninguna sala dibujada.</span>' + B('nueva', '➕ Nueva sala');
        else {
            h += '<b>Sala</b> <select data-f="sala" style="padding:5px;border:1px solid #cbd5e1;border-radius:5px">' + datos.salas.map(function (x) { return '<option value="' + x.id + '"' + (x === s ? ' selected' : '') + '>' + esc(x.nombre) + '</option>'; }).join('') + '</select>' +
                (enSala ? B('fin', '✔ Terminar de editar', 'background:#2563eb;color:#fff') : B('editar', '✏️ Editar sala', '', 'Cambiar medidas y dibujar columnas, barra, puertas…')) +
                B('nueva', '➕ Nueva sala') + B('duplicar', '📄 Duplicar') + B('borrarSala', '🗑 Borrar sala', 'color:#b91c1c') +
                (sucias || guardando ? '<button type="button" class="btn btn-success" data-a="guardar" style="font-size:.78rem;padding:5px 10px"' + (guardando ? ' disabled' : '') + '>' + (guardando ? '⏳ Guardando…' : '💾 Guardar plantilla') + '</button><span style="color:#b45309;font-size:.78rem">● plantilla sin guardar</span>' : '<span style="color:#16a34a;font-size:.78rem">✔ plantilla guardada</span>');
        }
        h += '</div>';
        if (enSala) {
            h += '<div class="me-fila" style="gap:12px;font-size:.82rem;margin-bottom:8px;background:#eff6ff;padding:8px;border-radius:8px">' +
                '<span>Nombre ' + I('s.nombre', s.nombre, 130, '', 'txt') + '</span><span>Ancho ' + I('s.w', metros(s.w), 50) + ' m</span><span>Largo ' + I('s.h', metros(s.h), 50) + ' m</span>' +
                '<span title="Mesas cuadradas individuales: dos juntas hacen 4 plazas (2 personas en cada lado largo). Vale para todas las salas.">Mesas cuadradas de <select data-f="mesa.lado" style="padding:4px;border:1px solid #cbd5e1;border-radius:5px">' + [60, 65, 70, 80].concat([60, 65, 70, 80].indexOf(MA()) < 0 ? [MA()] : []).map(function (l) { return '<option value="' + l + '"' + (l === MA() ? ' selected' : '') + '>' + l + ' × ' + l + ' cm</option>'; }).join('') + '</select></span>' +
                '<span><b>Añadir:</b> ' + Object.keys(TIPOS).map(function (k) { return B('el:' + k, TIPOS[k].n); }).join(' ') + ' ' + B('masMesa', '🪑 Mesa', 'background:#fde7c8', 'Sale de la edición de la sala y añade una mesa') + '</span></div>';
        }
        var corte = h.length;
        if (s) h += svgSala(menu, s, false);
        // Barra del elemento elegido
        if (s && enSala && ui.sel && s.el[ui.sel.el]) {
            var e = s.el[ui.sel.el];
            h = h.slice(0, corte) + '<div class="me-fila" style="gap:10px;font-size:.82rem;margin-bottom:8px;background:#dbeafe;padding:8px;border-radius:8px"><b>' + TIPOS[e.t].n + '</b><span>Texto ' + I('e.txt', e.txt, 120, '', 'txt') + '</span>' +
                '<span>Ancho ' + I('e.w', e.w, 50) + ' cm</span><span>Alto ' + I('e.h', e.h, 50) + ' cm</span>' +
                '<span title="Distancia desde la pared izquierda y desde la pared de arriba">Posición: izq. ' + I('e.x', e.x, 50) + ' · arriba ' + I('e.y', e.y, 50) + ' cm</span>' +
                B('girarEl', '⟳ Girar') + B('borrarEl', '🗑 Quitar', 'color:#b91c1c') + '<span style="color:#64748b">Flechas = mover (Mayús = 1 cm) · cuadro azul = tamaño · Supr = quitar</span></div>' + h.slice(corte);
        } else if (s && enSala) h += '<div style="color:#64748b;font-size:.8rem;margin-top:6px">Estás dibujando la sala: añade columnas, barra, puertas… y arrástralos (o flechas del teclado). Las mesas se colocan fuera de la edición. Al acabar, 💾 Guardar plantilla y ✔ Terminar de editar.</div>';
        else if (s && ui.sel && c.sueltas[ui.sel.suelta]) {
            h += '<div class="me-fila" style="gap:10px;font-size:.82rem;margin-top:8px"><b>Silla suelta</b><span>Tipo <select data-f="su.as" style="padding:4px;border:1px solid #cbd5e1;border-radius:5px"><option value="">Silla</option><option value="butaca"' + (c.sueltas[ui.sel.suelta].as === 'butaca' ? ' selected' : '') + '>Butaca</option></select></span>' + B('borrarSuelta', '🗑 Quitar', 'color:#b91c1c') + '<span style="color:#94a3b8">Cuenta como 1 comensal. Arrastra o flechas (Mayús = 1 cm).</span></div>';
        }
        else if (s && ui.sel && c.lista[ui.sel.mesa]) {
            var m = c.lista[ui.sel.mesa];
            h += '<div class="me-fila" style="gap:10px;font-size:.82rem;margin-top:8px"><b>Mesa M' + (ui.sel.mesa + 1) + '</b>' +
                '<span>' + B('menos', '−') + ' <b>' + m.mod * 4 + '</b> plazas ' + B('mas', '+') + '</span>' +
                '<span title="Excepcional">Cabeceras <select data-f="m.cab" style="padding:4px;border:1px solid #cbd5e1;border-radius:5px"><option value="0">ninguna</option><option value="1"' + (m.cab === 1 ? ' selected' : '') + '>1</option><option value="2"' + (m.cab === 2 ? ' selected' : '') + '>2</option></select></span>' +
                '<span>Comensales ' + I('m.pax', m.pax, 44) + ' de ' + plazas(m) + '</span>' + '<span>Color <select data-f="m.col" style="padding:4px;border:1px solid #cbd5e1;border-radius:5px">' + Object.keys(COL).map(function (k) { return '<option value="' + k + '"' + ((m.col || 'clara') === k ? ' selected' : '') + '>' + COL[k][0] + '</option>'; }).join('') + '</select></span>' +
                '<span>Asientos <select data-f="m.as" style="padding:4px;border:1px solid #cbd5e1;border-radius:5px"><option value="">Sillas</option><option value="butaca"' + (m.as === 'butaca' ? ' selected' : '') + '>Butacas</option></select></span>' +
                B('girar', '⟳ Girar') + B('borrarMesa', '🗑 Quitar mesa', 'color:#b91c1c', 'Sus sillas movidas a mano se quedan como sillas sueltas') +
                (ui.sel.silla != null ? '<span style="background:#dbeafe;padding:3px 8px;border-radius:6px">Silla elegida: arrástrala o usa las flechas' + (m.sil && m.sil[ui.sel.silla] ? ' ' + B('sillaSitio', '↩ A su sitio') : '') + '</span>' : '') +
                (m.sil && Object.keys(m.sil).length ? B('sillasSitio', '↩ Recolocar todas las sillas') : '') +
                '<span style="color:#94a3b8">Flechas = mover (Mayús = 1 cm). Las sillas se mueven sueltas arrastrándolas (sofá, otra cabecera…).</span></div>';
        } else if (s) h += '<div class="me-fila" style="gap:10px;font-size:.8rem;margin-top:6px;color:#64748b">' + B('masMesa', '➕ Añadir mesa') + B('masSuelta', '➕ Silla suelta', '', 'Un comensal sin mesa propia: en el sofá, en la cabecera de otra mesa…') + (c.lista.length ? B('quitarTodas', '🗑 Quitar todas', 'color:#b91c1c') : '') +
            (s.hab && s.hab.length ? B('cargarHab', '📥 Colocar las mesas habituales (' + s.hab.length + ')', 'background:#dcfce7', 'Pone en este menú las mesas tal como están normalmente en esta sala') : '') +
            (mesasDe(menu, s).length ? B('guardarHab', '📌 Guardar como disposición habitual', '', 'Guarda en la plantilla de la sala las mesas tal como están ahora (sitio, tamaño, color y asientos)') : '') + '<span>Arrastra las mesas para colocarlas; pulsa una para cambiarla. En rojo = pisa algo o se sale. Silla oscura = ocupada, punteada = libre.</span></div>';
        h += '</div>';
        // 3. Material
        h += '<div class="me-card"><div class="me-fila" style="justify-content:space-between"><label class="label-seccion">🍴 Cubiertos, platos y copas</label><button type="button" class="btn btn-primary" data-a="imprimir" style="font-size:.82rem;padding:6px 12px">🖨️ Imprimir hoja de montaje</button></div>' + htmlMaterial(menu, false) + htmlMesas(menu) + '</div>';
        panel.innerHTML = h;
    }

    function imprimir(menu) {
        var c = cfg(menu), M = material(menu);
        var salas = datos.salas.filter(function (s) { return mesasDe(menu, s).length; });
        var v = window.open('', '_blank');
        if (!v) { avisar('El navegador ha bloqueado la ventana de impresión.'); return; }
        v.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Montaje — ' + esc(menu.nombre || 'Menú') + '</title><style>body{font-family:Arial,sans-serif;margin:10mm;color:#111}h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:14px 0 6px}.me-fila{margin-bottom:6px;font-size:12px}table{font-size:12px!important}.hoja{page-break-after:always}@page{size:A4;margin:8mm}</style></head><body>' +
            salas.map(function (s) { return '<div class="hoja"><h1>🪑 ' + esc(menu.nombre || 'Menú') + ' — ' + esc(s.nombre) + '</h1><div style="font-size:12px;margin-bottom:6px">' + M.pax + ' comensales · ' + c.lista.length + ' mesa(s) · ' + M.plazas + ' plazas</div>' + svgSala(menu, s, true) + '</div>'; }).join('') +
            '<h1>🍴 Material — ' + esc(menu.nombre || 'Menú') + ' (' + M.pax + ' pax)</h1>' + htmlMaterial(menu, true) + '<h2>Mesas</h2>' + htmlMesas(menu) +
            '</body></html>');
        v.document.close();
        setTimeout(function () { v.focus(); v.print(); }, 350);
    }

    // ---------- Eventos ----------
    function punto(svg, e) { var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
    function alPulsar(e) {
        var svg = e.target.closest && e.target.closest('#pm-svg');
        if (!svg || !datos) return;
        var menu = CONT.__pm.menu, c = cfg(menu), s = sala(), p0 = punto(svg, e), obj = null, asa = false, g;
        if (ui.modo === 'sala') {
            var a = e.target.closest('[data-asa]'); g = e.target.closest('[data-el]');
            if (a) { obj = s.el[+a.dataset.asa]; asa = true; g = a.closest('[data-el]'); }
            else if (g) { obj = s.el[+g.dataset.el]; ui.sel = { el: +g.dataset.el }; }
            else { if (ui.sel) { ui.sel = null; pintar(); } return; }
        } else {
            var gs = e.target.closest('[data-suelta]');
            g = gs || e.target.closest('[data-mesa]');
            if (!g) { if (ui.sel) { ui.sel = null; pintar(); } return; }
            if (gs) { obj = c.sueltas[+gs.dataset.suelta]; ui.sel = { suelta: +gs.dataset.suelta }; }
            else { obj = c.lista[+g.dataset.mesa]; ui.sel = { mesa: +g.dataset.mesa }; }
            var sr = gs ? null : e.target.closest('[data-silla]');
            if (sr) {   // silla suelta: se mueve ella sola (sofá, otra cabecera…)
                var ks = +sr.dataset.silla, o0 = (obj.sil && obj.sil[ks]) || [0, 0], hubo = false;
                ui.sel.silla = ks;
                e.preventDefault();
                var mueveS = function (ev) {
                    var q = punto(svg, ev), dx = q.x - p0.x, dy = q.y - p0.y;
                    if (!hubo && Math.abs(dx) + Math.abs(dy) < 6) return;
                    hubo = true;
                    obj.sil = obj.sil || {};
                    obj.sil[ks] = [Math.round((o0[0] + dx) / 5) * 5, Math.round((o0[1] + dy) / 5) * 5];
                    sr.setAttribute('x', +sr.dataset.bx + obj.sil[ks][0]); sr.setAttribute('y', +sr.dataset.by + obj.sil[ks][1]);
                };
                var sueltaS = function () {
                    window.removeEventListener('pointermove', mueveS); window.removeEventListener('pointerup', sueltaS); window.removeEventListener('pointercancel', sueltaS);
                    pintar();
                };
                window.addEventListener('pointermove', mueveS); window.addEventListener('pointerup', sueltaS); window.addEventListener('pointercancel', sueltaS);
                return;
            }
        }
        e.preventDefault();
        var ini = { x: obj.x, y: obj.y, w: obj.w, h: obj.h }, movido = false;
        var mover = function (ev) {
            var p = punto(svg, ev), dx = p.x - p0.x, dy = p.y - p0.y;
            if (!movido && Math.abs(dx) + Math.abs(dy) < 6) return;
            movido = true;
            if (asa) {
                obj.w = Math.max(10, red(ini.w + dx)); obj.h = Math.max(10, red(ini.h + dy));
                var r = g.querySelector('rect'); r.setAttribute('width', obj.w); r.setAttribute('height', obj.h);
            } else {
                obj.x = red(ini.x + dx); obj.y = red(ini.y + dy);
                g.setAttribute('transform', 'translate(' + obj.x + ',' + obj.y + ')');
            }
        };
        var soltar = function () {
            window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar); window.removeEventListener('pointercancel', soltar);
            if (movido && ui.modo === 'sala') sucias = true;
            pintar();
        };
        window.addEventListener('pointermove', mover); window.addEventListener('pointerup', soltar); window.addEventListener('pointercancel', soltar);
    }
    function alClic(e) {
        var b = e.target.closest && e.target.closest('#pm-panel [data-a]');
        if (!b || !datos) return;
        var menu = CONT.__pm.menu, c = cfg(menu), s = sala(), a = b.dataset.a, m = ui.sel && c.lista[ui.sel.mesa], el = ui.sel && s && s.el[ui.sel.el];
        if (a === 'deshacer') { deshacer(); return; }
        if (a === 'rehacer') { rehacer(); return; }
        if (a === 'repartir') {
            var hay = s && mesasDe(menu, s).length;
            (hay ? confirmar('Se quitan las ' + hay + ' mesa(s) de "' + s.nombre + '" y se colocan de nuevo. ¿Seguir?') : Promise.resolve(true)).then(function (ok) { if (ok) { repartirYColocar(menu); pintar(); } });
            return;
        }
        if (a === 'nueva') { nuevaSala(); ui.modo = 'sala'; ui.sel = null; }
        else if (a === 'duplicar' && s) { nuevaSala(s); ui.modo = 'sala'; ui.sel = null; }
        else if (a === 'editar') { ui.modo = 'sala'; ui.sel = null; }
        else if (a === 'fin') { ui.modo = 'mesas'; ui.sel = null; }
        else if (a === 'guardar') { guardarSalas(); return; }
        else if (a === 'borrarSala' && s) {
            confirmar('¿Borrar la sala "' + s.nombre + '"? (La plantilla se borra al pulsar 💾 Guardar plantilla.)').then(function (ok) {
                if (!ok) return;
                datos.salas.splice(datos.salas.indexOf(s), 1); c.lista = c.lista.filter(function (x) { return x.s !== s.id; });
                ui.salaId = null; ui.sel = null; ui.modo = 'mesas'; sucias = true; pintar();
            });
            return;
        }
        else if (a.indexOf('el:') === 0 && s) {
            var t = a.slice(3), T = TIPOS[t];
            s.el.push({ t: t, x: red(s.w / 2 - T.w / 2), y: red(s.h / 2 - T.h / 2), w: T.w, h: T.h, txt: t === 'texto' ? 'Texto' : t === 'zona' ? '' : T.n.replace(/ \(.*/, '').replace(/ \/.*/, '') });
            ui.sel = { el: s.el.length - 1 }; sucias = true;
        }
        else if (a === 'borrarEl' && el) { s.el.splice(ui.sel.el, 1); ui.sel = null; sucias = true; }
        else if (a === 'girarEl' && el) { var w = el.w; el.w = el.h; el.h = w; sucias = true; }
        else if (a === 'masMesa' && s) { ui.modo = 'mesas'; var n = { s: s.id, mod: 1, cab: 0, pax: 4, rot: 0, x: 0, y: 0 }; colocar(n, s, mesasDe(menu, s), Math.max(0, num(c.pasillo) || 0)); c.lista.push(n); ui.sel = { mesa: c.lista.length - 1 }; }
        else if (a === 'quitarTodas' && s) { var ms = mesasDe(menu, s); c.lista = c.lista.filter(function (x) { return ms.indexOf(x) < 0; }); ui.sel = null; }
        else if (a === 'sillaSitio' && m) { if (m.sil) delete m.sil[ui.sel.silla]; }
        else if (a === 'sillasSitio' && m) { delete m.sil; }
        else if (a === 'mas' && m) { delete m.sil; var lleno = m.pax === plazas(m); m.mod++; if (lleno) m.pax = plazas(m); }
        else if (a === 'menos' && m && m.mod > 1) { delete m.sil; m.mod--; m.pax = Math.min(m.pax || 0, plazas(m)); }
        else if (a === 'girar' && m) { delete m.sil; var k = cuerpo(m); m.rot = m.rot ? 0 : 1; var k2 = cuerpo(m); m.x = red(k.x + k.w / 2 - k2.w / 2); m.y = red(k.y + k.h / 2 - k2.h / 2); }
        else if (a === 'borrarMesa' && m) { quitarMesa(c, ui.sel.mesa); ui.sel = null; }
        else if (a === 'masSuelta' && s) { c.sueltas.push({ s: s.id, x: red(s.w / 2), y: red(s.h / 2), as: '' }); ui.sel = { suelta: c.sueltas.length - 1 }; }
        else if (a === 'borrarSuelta' && ui.sel && c.sueltas[ui.sel.suelta]) { c.sueltas.splice(ui.sel.suelta, 1); ui.sel = null; }
        else if (a === 'guardarHab' && s) {
            s.hab = mesasDe(menu, s).map(function (x) { return { x: x.x, y: x.y, mod: x.mod, rot: x.rot ? 1 : 0, cab: x.cab || 0, col: x.col || '', as: x.as || '' }; });
            sucias = true; guardarSalas(); return;
        }
        else if (a === 'cargarHab' && s && s.hab) {
            var hayH = mesasDe(menu, s).length;
            (hayH ? confirmar('Se quitan las ' + hayH + ' mesa(s) de "' + s.nombre + '" y se ponen las ' + s.hab.length + ' habituales. ¿Seguir?') : Promise.resolve(true)).then(function (ok) {
                if (!ok) return;
                var fuera = mesasDe(menu, s);
                c.lista = c.lista.filter(function (x) { return fuera.indexOf(x) < 0; }).concat(s.hab.map(function (x) { var q = JSON.parse(JSON.stringify(x)); q.s = s.id; q.pax = plazas(q); return q; }));
                ui.sel = null; pintar();
            });
            return;
        }
        else if (a === 'imprimir') { imprimir(menu); return; }
        pintar();
    }
    function restaurar(foto) {
        var o = JSON.parse(foto), menu = CONT.__pm.menu;
        datos = sanear(o.d);
        Object.defineProperty(o.m, '__propio', { value: true, enumerable: false });
        menu.mesas = o.m;
        sucias = JSON.stringify(datos) !== guardado;
        ui.sel = null; restaurando = true;
        pintar();
    }
    function deshacer() { if (!hist.length || !ultimo) return; rehecho.push(ultimo); restaurar(hist.pop()); }
    function rehacer() { if (!rehecho.length || !ultimo) return; hist.push(ultimo); restaurar(rehecho.pop()); }
    function alTeclear(e) {
        var enCampo = /^(INPUT|SELECT|TEXTAREA)$/.test((e.target && e.target.tagName) || '') || (e.target && e.target.isContentEditable);
        if ((e.ctrlKey || e.metaKey) && !e.altKey && !enCampo && datos && CONT && /^[zy]$/i.test(e.key)) {
            var pp = CONT.querySelector('#pm-panel');
            if (!pp || !pp.offsetParent) return;
            e.preventDefault();
            if (/y/i.test(e.key) || e.shiftKey) rehacer(); else deshacer();
            return;
        }
        var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key], supr = e.key === 'Delete';
        if ((!d && !supr) || !datos || !ui.sel || !CONT || e.ctrlKey || e.altKey || e.metaKey) return;
        if (/^(INPUT|SELECT|TEXTAREA)$/.test((e.target && e.target.tagName) || '') || (e.target && e.target.isContentEditable)) return;
        var panel = CONT.querySelector('#pm-panel');
        if (!panel || !panel.offsetParent || !panel.querySelector('#pm-svg')) return;
        var c = cfg(CONT.__pm.menu), s = sala(), enSala = ui.modo === 'sala';
        var esSu = !enSala && ui.sel.suelta != null;
        var lista = enSala ? (s && s.el) : esSu ? c.sueltas : c.lista, i = enSala ? ui.sel.el : esSu ? ui.sel.suelta : ui.sel.mesa, obj = lista && lista[i];
        if (!obj) return;
        e.preventDefault();
        if (!enSala && ui.sel.silla != null) {   // silla suelta elegida: flechas la mueven, Supr la devuelve a su sitio
            obj.sil = obj.sil || {};
            if (supr) delete obj.sil[ui.sel.silla];
            else { var o = obj.sil[ui.sel.silla] || [0, 0], ps = e.shiftKey ? 1 : 10; obj.sil[ui.sel.silla] = [o[0] + d[0] * ps, o[1] + d[1] * ps]; }
            pintar(); return;
        }
        if (supr) { if (enSala || esSu) lista.splice(i, 1); else quitarMesa(c, i); ui.sel = null; }
        else { var paso = e.shiftKey ? 1 : 10; obj.x += d[0] * paso; obj.y += d[1] * paso; }
        if (enSala) sucias = true;
        pintar();
    }
    function alCambiar(e) {
        var x = e.target, panel = CONT.querySelector('#pm-panel');
        if (!panel || !panel.contains(x) || !datos) return;
        var menu = CONT.__pm.menu, c = cfg(menu), s = sala(), f = x.dataset.f, v = num(x.value);
        if (x.dataset.lp !== undefined) { var ml = c.lista[+x.dataset.lp]; if (ml && v >= 1) talla(ml, v, !!c.cab); }
        else if (f === 'nMesas') {
            var n = Math.max(0, Math.min(60, Math.round(v) || 0)), hay = c.lista.length;
            if (n > hay && !s) { avisar('Primero crea una sala (➕ Nueva sala).'); pintar(); return; }
            if (n < hay) c.lista.length = n;
            else {
                var tot = paxMenu(menu), pas = Math.max(0, num(c.pasillo) || 0);
                for (var k = 0; k < n - hay; k++) {
                    var nm = { s: s.id, rot: 0, x: 0, y: 0 };
                    talla(nm, !hay && tot >= n ? Math.floor(tot / n) + (k < tot % n ? 1 : 0) : 4, !!c.cab);
                    colocar(nm, s, mesasDe(menu, s), pas);
                    c.lista.push(nm);
                }
            }
            ui.sel = null;
        }
        else if (x.dataset.cub) { c.cub[x.dataset.cub] = x.value === tipoAuto(menu, x.dataset.cub) ? '' : x.value; }
        else if (x.dataset.op) { c.op[x.dataset.op] = x.checked; }
        else if (f === 'pax') c.pax = v > 0 ? Math.round(v) : '';
        else if (f === 'tam') c.tam = +x.value;
        else if (f === 'cab') c.cab = x.checked;
        else if (f === 'pasillo') c.pasillo = v >= 0 ? v : 100;
        else if (f === 'sala') { ui.salaId = x.value; ui.sel = null; }
        else if (f === 'op.copasVino' || f === 'op.reserva') c.op[f.slice(3)] = v >= 0 ? v : '';
        else if (f === 's.nombre' && s) { s.nombre = x.value.trim() || s.nombre; sucias = true; }
        else if ((f === 's.w' || f === 's.h') && s) { if (v >= 2 && v <= 100) { s[f.slice(2)] = Math.round(v * 100); sucias = true; } }
        else if (f === 'mesa.lado') { datos.mesa.lado = +x.value || 70; sucias = true; }
        else if (f && f.indexOf('e.') === 0 && s && ui.sel && s.el[ui.sel.el]) {
            var el = s.el[ui.sel.el];
            if (f === 'e.txt') el.txt = x.value.trim(); else if (f === 'e.x' || f === 'e.y') { if (isFinite(v)) el[f.slice(2)] = Math.round(v); } else if (v > 0) el[f.slice(2)] = Math.max(5, Math.round(v));
            sucias = true;
        }
        else if (f === 'su.as' && ui.sel && c.sueltas[ui.sel.suelta]) c.sueltas[ui.sel.suelta].as = x.value;
        else if (f && f.indexOf('m.') === 0 && ui.sel && c.lista[ui.sel.mesa]) {
            var m = c.lista[ui.sel.mesa];
            if (f === 'm.cab') { delete m.sil; var lleno = m.pax === plazas(m); m.cab = +x.value; m.pax = lleno ? plazas(m) : Math.min(m.pax, plazas(m)); }
            else if (f === 'm.col') m.col = x.value;
            else if (f === 'm.as') { m.as = x.value; delete m.sil; }
            else if (f === 'm.pax') m.pax = Math.max(0, Math.min(plazas(m), Math.round(v) || 0));
        }
        pintar();
    }

    function activar(cont, menu) {
        if (!cont) return;
        CONT = cont;
        if (!cont.__pm) {
            cont.__pm = {};
            cont.addEventListener('pointerdown', alPulsar);
            cont.addEventListener('click', alClic);
            cont.addEventListener('change', alCambiar);
            document.addEventListener('keydown', alTeclear);
            window.addEventListener('beforeunload', function (e) { if (sucias) { e.preventDefault(); e.returnValue = ''; } });
        }
        if (cont.__pm.menu !== menu) ui.sel = null;
        cont.__pm.menu = menu;
        cfg(menu);
        pintar();
    }

    window.PrepararMesas = { contenedor: contenedor, activar: activar, mostrar: pintar, repartir: repartir, material: material };
})();
