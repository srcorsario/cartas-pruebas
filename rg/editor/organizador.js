// =========================================================================================
// organizador.js — ORGANIZADOR, FASE 3: crear, renombrar, ampliar/reducir, unir, borrar y ordenar
// categorías y subcategorías desde el editor.
// Común a todos los editores (lo copia e inserta construir.ps1).
//
// Botón "➕ Nueva categoría" en el 🗺️ Mapa de ID. Pide nombre, tipo, carpeta de fotos, rango
// de ID (propone uno libre), dónde sale en la web (pestaña nueva / dentro de otra pestaña como
// grupo con título / no sale) y su sitio en el acordeón del editor. Traduce el nombre con IA a
// los 26 idiomas (se pueden revisar antes de crear) y lo guarda en datos.json -> "estructura"
// (POST ?accion=estructura, lo aplica almacen-json.js con Organizador.aplicar sobre lo último
// de GitHub). Una pestaña nueva empieza OCULTA en la web (va a "ocultas") hasta que tenga platos
// y se active con su interruptor.
//
// Parte pura (la usa también almacen-json.js): ocupados, libres, conflictos, proponer, aplicar.
// =========================================================================================
(function () {
    'use strict';
    window.APP_VERSIONS = window.APP_VERSIONS || {};
    window.APP_VERSIONS.organizador = '1.2.0'; // 3 nov: paso 3 — ✏️ renombrar (y en la web), visible, ampliar/reducir rango (quitando tramo vacío a la vecina), unir (renumera platos), borrar vacía; ↕️ ordenar. 1.1.0: 3 nov: crear subcategoría (también en Sugerencias; sección propia en la web y en la hoja). 1.0.0: Fase 3 — crear categoría

    var IDIOMAS = ['ES', 'EN', 'DE', 'FR', 'IT', 'RU', 'NL', 'PL', 'SV', 'NO', 'DA', 'FI', 'PT', 'RO', 'HU', 'CS', 'EL', 'TR', 'AR', 'ZH', 'JA', 'KO', 'CA', 'EU', 'GL', 'VA'];
    var MIN_ID = 1000, MAX_ID = 99999;
    var clonar = function (o) { return JSON.parse(JSON.stringify(o)); };
    var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var $ = function (id) { return document.getElementById(id); };

    // ---------- parte pura ----------
    // Tramos ya usados: categorías, subcategorías, rangos de pestañas (y sus grupos / anexos).
    function ocupados(est) {
        var r = [];
        (est.categorias || []).forEach(function (c) {
            r.push({ d: c.desde, h: c.hasta, que: 'categoría "' + c.nombre + '"' });
            (c.sub || []).forEach(function (s) { r.push({ d: s.desde, h: s.hasta, que: 'subcategoría "' + s.nombre + '"' }); });
        });
        (est.pestanas || []).forEach(function (p) {
            var nom = (p.nombre && p.nombre.ES) || p.id;
            (p.rangos || []).forEach(function (x) { r.push({ d: x[0], h: x[1], que: 'pestaña "' + nom + '" de la web' }); });
            (p.grupos || []).concat(p.anexos || []).forEach(function (g) {
                (g.rangos || []).forEach(function (x) { r.push({ d: x[0], h: x[1], que: 'pestaña "' + nom + '" de la web' }); });
            });
        });
        return r;
    }

    // Problemas de usar [d, h] para una categoría nueva (lista vacía = libre).
    function conflictos(est, d, h, ids) {
        var m = [];
        if (!(d >= MIN_ID) || !(h >= d) || h > MAX_ID) { m.push('Rango no válido (de ' + MIN_ID + ' a ' + MAX_ID + ', "desde" ≤ "hasta").'); return m; }
        var vistos = {};
        ocupados(est).forEach(function (o) {
            if (d <= o.h && o.d <= h && !vistos[o.que]) { vistos[o.que] = 1; m.push('Pisa ' + o.que + ' (' + o.d + '–' + o.h + ').'); }
        });
        var dentro = (ids || []).filter(function (i) { return i >= d && i <= h; });
        if (dentro.length) m.push('Ya hay ' + dentro.length + ' plato(s) con ID en ese rango: ' + dentro.slice(0, 8).join(', ') + (dentro.length > 8 ? '…' : '') + '.');
        return m;
    }

    // Tramos libres (sin categoría, pestaña ni plato) entre MIN_ID y el último usado + 10000.
    function libres(est, ids) {
        var marcas = ocupados(est).map(function (o) { return [o.d, o.h]; });
        (ids || []).forEach(function (i) { if (i >= MIN_ID) marcas.push([i, i]); });
        marcas.sort(function (a, b) { return a[0] - b[0]; });
        var res = [], cur = MIN_ID, tope = MIN_ID;
        marcas.forEach(function (x) { tope = Math.max(tope, x[1]); });
        tope = Math.min(MAX_ID, Math.ceil((tope + 10000) / 1000) * 1000 - 1);
        marcas.forEach(function (x) {
            if (x[0] > cur) res.push([cur, Math.min(x[0] - 1, tope)]);
            cur = Math.max(cur, x[1] + 1);
        });
        if (cur <= tope) res.push([cur, tope]);
        return res.filter(function (x) { return x[1] >= x[0]; });
    }

    // Primer rango libre "redondo" de tam ID: x01–x99 (centenas) o x001–x999 (millares), a partir
    // de "desde" (p. ej. justo detrás de la categoría elegida); si no hay, desde el principio.
    function proponer(est, ids, tam, desde) {
        tam = Math.max(1, parseInt(tam, 10) || 99);
        var paso = tam <= 99 ? 100 : (tam <= 999 ? 1000 : 10000);
        var buscar = function (min) {
            for (var s = Math.ceil((min - 1) / paso) * paso + 1; s + tam - 1 <= MAX_ID; s += paso) {
                if (s >= min && !conflictos(est, s, s + tam - 1, ids).length) return [s, s + tam - 1];
            }
            return null;
        };
        return (desde > MIN_ID && buscar(desde)) || buscar(MIN_ID);
    }

    function slug(t) {
        return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'categoria';
    }

    // Aplica un cambio a una COPIA de la estructura. Lanza Error si no se puede.
    // Devuelve { estructura, ocultar: [ids de pestaña que deben empezar ocultas] }.
    // cambio = { tipo: 'crearCategoria', categoria: { nombre, desde, hasta, carpeta, tipo?, vino? },
    //            nombres: { ES, EN, ... }, web: { modo: 'nueva'|'dentro'|'no', despuesDe?, padre? },
    //            despuesDeCategoria: desde de la categoría tras la que va (null = al final) }
    function aplicar(estOriginal, cambio, ids) {
        if (!estOriginal || !Array.isArray(estOriginal.categorias)) throw new Error('No hay estructura de la carta.');
        var est = clonar(estOriginal);
        est.pestanas = est.pestanas || [];
        if (cambio && cambio.tipo === 'crearSubcategoria') return aplicarSub(est, cambio, ids);
        if (cambio && ['renombrar', 'rango', 'unir', 'borrar', 'ordenar'].indexOf(cambio.tipo) >= 0) return aplicarPaso3(est, cambio, ids);
        if (!cambio || cambio.tipo !== 'crearCategoria') throw new Error('Cambio de estructura desconocido.');
        var c = cambio.categoria || {}, d = parseInt(c.desde, 10), h = parseInt(c.hasta, 10);
        var nombre = String(c.nombre || '').trim();
        if (!nombre) throw new Error('Falta el nombre de la categoría.');
        if (est.categorias.some(function (x) { return String(x.nombre).trim().toLowerCase() === nombre.toLowerCase(); })) throw new Error('Ya hay una categoría "' + nombre + '".');
        var mal = conflictos(est, d, h, ids);
        if (mal.length) throw new Error('El rango ' + d + '–' + h + ' no está libre: ' + mal.join(' '));

        var nueva = { nombre: nombre, desde: d, hasta: h, pestana: null, carpeta: slug(c.carpeta || nombre) };
        if (c.tipo === 'bebida') nueva.tipo = 'bebida';
        if (c.tipo === 'vino') { nueva.tipo = 'vino'; if (c.vino) nueva.vino = c.vino; }

        var nombres = {};
        IDIOMAS.forEach(function (l) { var v = cambio.nombres && cambio.nombres[l]; if (v && String(v).trim()) nombres[l] = String(v).trim(); });
        nombres.ES = nombres.ES || nombre;

        var web = cambio.web || { modo: 'no' }, ocultar = [];
        if (web.modo === 'nueva') {
            var id = slug(nombre), base = id, n = 2;
            while (est.pestanas.some(function (p) { return String(p.id) === id; })) id = base + '_' + (n++);
            var pes = { id: id, rangos: [[d, h]], nombre: nombres };
            if (c.tipo === 'vino') pes.precargaFotos = 1;
            var pos = est.pestanas.length;
            if (web.despuesDe) {
                var i = est.pestanas.findIndex(function (p) { return String(p.id) === String(web.despuesDe); });
                if (i >= 0) pos = i + 1;
            } else {
                // Al final, pero antes de Alérgenos (página fija).
                var a = est.pestanas.findIndex(function (p) { return p.especial === 'alergenos'; });
                if (a >= 0) pos = a;
            }
            est.pestanas.splice(pos, 0, pes);
            nueva.pestana = id;
            ocultar.push(id);
        } else if (web.modo === 'dentro') {
            var padre = est.pestanas.find(function (p) { return String(p.id) === String(web.padre); });
            if (!padre || padre.especial) throw new Error('No existe la pestaña "' + web.padre + '" de la web.');
            padre.rangos = (padre.rangos || []).concat([[d, h]]);
            padre.grupos = (padre.grupos || []).concat([{ rangos: [[d, h]], nombre: nombres }]);
        }

        var tras = cambio.despuesDeCategoria;
        var j = tras == null || tras === '' ? -1 : est.categorias.findIndex(function (x) { return x.desde === parseInt(tras, 10); });
        if (j >= 0) est.categorias.splice(j + 1, 0, nueva); else est.categorias.push(nueva);
        return { estructura: est, ocultar: ocultar };
    }

    // ---------- subcategorías ----------
    var nombresDe = function (cambio, porDefecto) {
        var n = {};
        IDIOMAS.forEach(function (l) { var v = cambio.nombres && cambio.nombres[l]; if (v && String(v).trim()) n[l] = String(v).trim(); });
        n.ES = n.ES || porDefecto;
        return n;
    };
    var cubre = function (rangos, d, h) { return (rangos || []).some(function (x) { return x[0] <= d && h <= x[1]; }); };
    var toca = function (rangos, d, h) { return (rangos || []).some(function (x) { return d <= x[1] && x[0] <= h; }); };
    // Quita [d, h] de una lista de rangos (partiendo los que lo contengan).
    function recortar(rangos, d, h) {
        var res = [];
        (rangos || []).forEach(function (x) {
            if (h < x[0] || d > x[1]) { res.push(x); return; }
            if (x[0] < d) res.push([x[0], d - 1]);
            if (x[1] > h) res.push([h + 1, x[1]]);
        });
        return res;
    }
    function pestanaDe(est, cat) { return cat && cat.pestana != null ? (est.pestanas || []).find(function (p) { return String(p.id) === String(cat.pestana); }) || null : null; }

    // Rangos de los vinos de la hoja de Sugerencias: su grupo "vino" en la web o 12990-12999 de siempre.
    function zonaVinoSug(est, cat) {
        if (!cat || cat.tipo !== 'sugerencias') return [];
        var p = pestanaDe(est, cat), gv = p && (p.grupos || []).find(function (g) { return g.tipo === 'vino'; });
        return gv ? gv.rangos : [[12990, 12999]];
    }

    // Problemas de usar [d, h] para una subcategoría nueva de "cat".
    function conflictosSub(est, cat, d, h, ids) {
        var m = [];
        if (!cat) return ['No existe esa categoría.'];
        if (!(d >= cat.desde) || !(h >= d) || h > cat.hasta) { m.push('Tiene que estar dentro de "' + cat.nombre + '" (' + cat.desde + '–' + cat.hasta + ').'); return m; }
        (cat.sub || []).forEach(function (x) { if (d <= x.hasta && x.desde <= h) m.push('Pisa la subcategoría "' + x.nombre + '" (' + x.desde + '–' + x.hasta + ').'); });
        var enCat = (ids || []).filter(function (i) { return i >= cat.desde && i <= cat.hasta; });
        var dentro = enCat.filter(function (i) { return i >= d && i <= h; });
        if (dentro.length) m.push('Ya hay ' + dentro.length + ' plato(s) en ese rango: ' + dentro.slice(0, 8).join(', ') + (dentro.length > 8 ? '…' : '') + '.');
        if (!(cat.sub && cat.sub.length)) {
            // Sin subcategorías: lo que ya hay pasa a una primera subcategoría (desde el principio
            // hasta d-1), así que la nueva tiene que ir DETRÁS de todos los platos.
            if (d <= cat.desde) m.push('Esta categoría aún no tiene subcategorías: la nueva no puede empezar en ' + cat.desde + ' (ahí quedan los platos que ya tiene).');
            var zv = zonaVinoSug(est, cat);
            var detras = enCat.filter(function (i) { return i > h && !toca(zv, i, i); });
            if (detras.length) m.push('Hay platos detrás del rango (' + detras.slice(0, 5).join(', ') + '): la primera subcategoría tiene que ir al final de la categoría.');
        }
        var propia = pestanaDe(est, cat);
        if (cat.tipo === 'sugerencias') {
            var rv = zonaVinoSug(est, cat);
            if (toca(rv, d, h) && !(cat.sub || []).some(function (x) { return x.tipo === 'vino' && toca([[x.desde, x.hasta]], d, h); }))
                m.push('Pisa los vinos de la hoja de Sugerencias (' + rv.map(function (r) { return r[0] + '–' + r[1]; }).join(', ') + ').');
        }
        (est.pestanas || []).forEach(function (p) {
            if (p === propia) return;
            var rs = (p.grupos || []).concat(p.anexos || []).reduce(function (t, g) { return t.concat(g.rangos || []); }, (p.rangos || []).slice());
            if (toca(rs, d, h)) m.push('Pisa la pestaña "' + ((p.nombre && p.nombre.ES) || p.id) + '" de la web.');
        });
        return m;
    }

    function libresSub(est, cat, ids) {
        var marcas = (cat.sub || []).map(function (x) { return [x.desde, x.hasta]; });
        var enCat = (ids || []).filter(function (i) { return i >= cat.desde && i <= cat.hasta; });
        if (!(cat.sub && cat.sub.length)) marcas.push([cat.desde, Math.max(cat.desde, enCat.length ? Math.max.apply(null, enCat) : cat.desde)]);
        enCat.forEach(function (i) { marcas.push([i, i]); });
        marcas.sort(function (a, b) { return a[0] - b[0]; });
        var res = [], cur = cat.desde;
        marcas.forEach(function (x) { if (x[0] > cur) res.push([cur, x[0] - 1]); cur = Math.max(cur, x[1] + 1); });
        if (cur <= cat.hasta) res.push([cur, cat.hasta]);
        return res.filter(function (x) { return !conflictosSub(est, cat, x[0], x[0], ids).length; });
    }

    // Primer hueco "redondo" (x00, x50, x10…) de tam ID dentro de la categoría.
    function proponerSub(est, cat, ids, tam) {
        tam = Math.max(1, parseInt(tam, 10) || 100);
        var paso = tam <= 10 ? 10 : (tam <= 50 ? 50 : 100), res = null;
        if (!(cat.sub && cat.sub.length)) {
            // Sin subcategorías: al FINAL de la categoría, para dejar sitio a lo que ya tiene.
            for (var f = Math.floor((cat.hasta + 1 - tam) / paso) * paso; f > cat.desde; f -= paso) {
                if (!conflictosSub(est, cat, f, f + tam - 1, ids).length) return [f, f + tam - 1];
            }
            return null;
        }
        libresSub(est, cat, ids).some(function (z) {
            for (var s = Math.ceil(z[0] / paso) * paso; s + tam - 1 <= z[1]; s += paso) {
                if (!conflictosSub(est, cat, s, s + tam - 1, ids).length) { res = [s, s + tam - 1]; return true; }
            }
            if (z[1] - z[0] + 1 >= tam && !conflictosSub(est, cat, z[0], z[0] + tam - 1, ids).length) { res = [z[0], z[0] + tam - 1]; return true; }
            return false;
        });
        return res;
    }

    // cambio = { tipo: 'crearSubcategoria', categoria: desde de la categoría, sub: { nombre, desde, hasta, carpeta },
    //            nombres: { ES, EN, ... }, web: { modo: 'nuevo' | 'grupo' | 'nada', grupo: índice } }
    function aplicarSub(est, cambio, ids) {
        var cat = est.categorias.find(function (x) { return x.desde === parseInt(cambio.categoria, 10); });
        if (!cat) throw new Error('No existe la categoría ' + cambio.categoria + '.');
        var sb = cambio.sub || {}, d = parseInt(sb.desde, 10), h = parseInt(sb.hasta, 10), nombre = String(sb.nombre || '').trim();
        if (!nombre) throw new Error('Falta el nombre de la subcategoría.');
        if ((cat.sub || []).some(function (x) { return String(x.nombre).trim().toLowerCase() === nombre.toLowerCase(); })) throw new Error('"' + cat.nombre + '" ya tiene una subcategoría "' + nombre + '".');
        var mal = conflictosSub(est, cat, d, h, ids);
        if (mal.length) throw new Error('El rango ' + d + '–' + h + ' no vale: ' + mal.join(' '));
        if (!(cat.sub && cat.sub.length)) {
            // Lo que ya tenía pasa a una primera subcategoría; en Sugerencias, sus vinos a otra.
            cat.sub = [{ nombre: cat.nombre, desde: cat.desde, hasta: d - 1, carpeta: cat.carpeta || slug(cat.nombre) }];
            zonaVinoSug(est, cat).forEach(function (z) {
                if (z[0] > h && z[1] <= cat.hasta) cat.sub.push({ nombre: 'Vinos', desde: z[0], hasta: z[1], carpeta: 'vinos', tipo: 'vino' });
            });
        }
        var nueva = { nombre: nombre, desde: d, hasta: h, carpeta: slug(sb.carpeta || nombre) };
        cat.sub.push(nueva);
        cat.sub.sort(function (a, b) { return a.desde - b.desde; });

        var p = pestanaDe(est, cat), web = cambio.web || { modo: 'nada' };
        if (p) {
            if (!cubre(p.rangos, d, h)) p.rangos = (p.rangos || []).concat([[d, h]]);
            p.grupos = p.grupos || [];
            // El tramo pasa a ser SOLO de su sección: se recorta de las demás (la web pone cada
            // plato en el primer grupo que lo contenga).
            var contenia = p.grupos.findIndex(function (x) { return toca(x.rangos, d, h); });
            var destino = web.modo === 'grupo' ? p.grupos[parseInt(web.grupo, 10)] : null;
            if (web.modo === 'grupo' && !destino) throw new Error('No existe esa sección de la pestaña.');
            if (web.modo === 'nuevo' || destino) {
                p.grupos.forEach(function (x) { if (x !== destino) x.rangos = recortar(x.rangos, d, h); });
            }
            if (web.modo === 'nuevo') {
                var g = { rangos: [[d, h]], nombre: nombresDe(cambio, nombre) };
                var tras = web.despuesDe === '' || web.despuesDe == null ? contenia : parseInt(web.despuesDe, 10);
                if (tras < 0 || isNaN(tras)) {
                    // Por número: delante del primer grupo que empiece detrás.
                    tras = -1;
                    p.grupos.forEach(function (x, i) { if ((x.rangos || []).length && Math.min.apply(null, x.rangos.map(function (r) { return r[0]; })) < d) tras = i; });
                }
                // Nunca detrás del bloque de vinos si es el último (Sugerencias).
                var v = p.grupos.findIndex(function (x) { return x.tipo === 'vino'; });
                if (v >= 0 && tras >= v && web.despuesDe !== String(v)) tras = v - 1;
                p.grupos.splice(tras + 1, 0, g);
                p.grupos = p.grupos.filter(function (x) { return x === g || (x.rangos || []).length; });
            } else if (destino && !cubre(destino.rangos, d, h)) {
                destino.rangos = (destino.rangos || []).concat([[d, h]]);
            }
            if (!p.grupos.length) delete p.grupos;
        }
        return { estructura: est, ocultar: [] };
    }

    // ---------- Fase 3, paso 3: renombrar, ampliar/reducir rango, unir, borrar, ordenar ----------
    var ESPECIAL = { sugerencias: 'Sugerencias', alergenos: 'Alérgenos', 'hoja-postres': 'Hoja de Postres' };
    var especialDe = function (c) { return c && (ESPECIAL[c.tipo] || (c.hojaPostres ? 'Hoja de Postres' : '')); };
    var esUnico = function (rs, d, h) { return (rs || []).length === 1 && rs[0][0] === d && rs[0][1] === h; };

    // obj = { cat: desde de la categoría, sub: desde de la subcategoría o null }
    function buscar(est, obj) {
        var cat = (est.categorias || []).find(function (c) { return c.desde === parseInt(obj && obj.cat, 10); });
        if (!cat) throw new Error('No existe la categoría ' + (obj && obj.cat) + ' (¿la ha cambiado otro dispositivo? Cierra y vuelve a abrir el Mapa).');
        var sub = null;
        if (obj.sub != null && obj.sub !== '') {
            sub = (cat.sub || []).find(function (s) { return s.desde === parseInt(obj.sub, 10); });
            if (!sub) throw new Error('No existe la subcategoría ' + obj.sub + ' en "' + cat.nombre + '".');
        }
        return { cat: cat, sub: sub, d: sub ? sub.desde : cat.desde, h: sub ? sub.hasta : cat.hasta, nombre: sub ? sub.nombre : cat.nombre };
    }

    // Une rangos que se tocan o se pisan.
    function unirRangos(rs) {
        var o = (rs || []).map(function (x) { return [x[0], x[1]]; }).sort(function (a, b) { return a[0] - b[0]; }), res = [];
        o.forEach(function (x) { var u = res[res.length - 1]; if (u && x[0] <= u[1] + 1) u[1] = Math.max(u[1], x[1]); else res.push(x); });
        return res;
    }
    // fn(dueño) para la pestaña y cada grupo / anexo (todos tienen .rangos).
    function cadaLista(p, fn) { fn(p); (p.grupos || []).forEach(fn); (p.anexos || []).forEach(fn); }
    function limpiarPestana(p) {
        if (p.grupos) { p.grupos = p.grupos.filter(function (g) { return (g.rangos || []).length; }); if (!p.grupos.length) delete p.grupos; }
        if (p.anexos) { p.anexos = p.anexos.filter(function (g) { return (g.rangos || []).length; }); if (!p.anexos.length) delete p.anexos; }
    }
    function reemplazarExacto(est, od, oh, nd, nh) {
        (est.pestanas || []).forEach(function (p) {
            cadaLista(p, function (x) { if (x.rangos) x.rangos = x.rangos.map(function (r) { return r[0] === od && r[1] === oh ? [nd, nh] : r; }); });
        });
    }
    function quitarExacto(est, d, h) {
        (est.pestanas || []).forEach(function (p) {
            cadaLista(p, function (x) { if (x.rangos) x.rangos = x.rangos.filter(function (r) { return !(r[0] === d && r[1] === h); }); });
            limpiarPestana(p);
        });
    }

    // Dónde tiene nombre propio en la web: su pestaña, o una sección (grupo) con su mismo rango.
    function destinoWeb(est, cat, sub) {
        var p = pestanaDe(est, cat), g;
        if (!sub) {
            if (p && !p.especial) return { tipo: 'pestana', p: p, x: p };
            var r = null;
            (est.pestanas || []).some(function (q) {
                return (q.grupos || []).concat(q.anexos || []).some(function (x) { if (esUnico(x.rangos, cat.desde, cat.hasta)) { r = { tipo: 'grupo', p: q, x: x }; return true; } return false; });
            });
            return r;
        }
        g = p && (p.grupos || []).find(function (x) { return esUnico(x.rangos, sub.desde, sub.hasta); });
        return g ? { tipo: 'grupo', p: p, x: g } : null;
    }
    function textoWeb(w) {
        if (!w) return '';
        var np = (w.p.nombre && w.p.nombre.ES) || w.p.id;
        return w.tipo === 'pestana' ? 'pestaña "' + np + '"' : 'sección "' + ((w.x.nombre && w.x.nombre.ES) || '') + '" de la pestaña "' + np + '"';
    }

    // Problemas de cambiar el rango de una categoría / subcategoría a [nd, nh].
    // Devuelve { errores: [...], vecinas: [{ obj, cat, sub, desde, hasta }] } — vecinas = las que
    // pierden un tramo vacío de su borde (solo se aplica con recortarVecina).
    function conflictosRango(est, objetivo, nd, nh, ids, recortarVecina) {
        var o = buscar(est, objetivo), err = [], vec = [];
        ids = ids || [];
        if (!(nd >= MIN_ID) || !(nh >= nd) || nh > MAX_ID) return { errores: ['Rango no válido (de ' + MIN_ID + ' a ' + MAX_ID + ', "desde" ≤ "hasta").'], vecinas: [] };
        if (o.sub && (nd < o.cat.desde || nh > o.cat.hasta)) return { errores: ['Tiene que quedar dentro de "' + o.cat.nombre + '" (' + o.cat.desde + '–' + o.cat.hasta + '): amplía antes la categoría.'], vecinas: [] };
        var fuera = ids.filter(function (i) { return i >= o.d && i <= o.h && (i < nd || i > nh); });
        if (o.sub) fuera = fuera.filter(function (i) { return i >= o.cat.desde && i <= o.cat.hasta; });
        if (fuera.length) err.push('Dejaría fuera ' + fuera.length + ' plato(s) (' + fuera.slice(0, 6).join(', ') + (fuera.length > 6 ? '…' : '') + '): muévelos antes ("Unir") o elige un rango que los incluya.');
        if (!o.sub) (o.cat.sub || []).forEach(function (s) {
            if (s.desde < nd || s.hasta > nh) err.push('La subcategoría "' + s.nombre + '" (' + s.desde + '–' + s.hasta + ') quedaría fuera: redúcela o bórrala antes.');
        });
        var anadidos = recortar([[nd, nh]], o.d, o.h);
        var hermanos = o.sub ? (o.cat.sub || []).filter(function (s) { return s !== o.sub; }) : est.categorias.filter(function (c) { return c !== o.cat; });
        hermanos.forEach(function (x) {
            if (!toca(anadidos, x.desde, x.hasta)) return;
            var qd = Math.max(nd, x.desde), qh = Math.min(nh, x.hasta);
            var resto = recortar([[x.desde, x.hasta]], qd, qh);
            var platos = ids.filter(function (i) { return i >= qd && i <= qh; });
            var subs = (x.sub || []).filter(function (s) { return s.desde <= qh && qd <= s.hasta; });
            var txt = 'Pisa ' + (o.sub ? 'la subcategoría' : 'la categoría') + ' "' + x.nombre + '" (' + x.desde + '–' + x.hasta + ')';
            if (platos.length) err.push(txt + ': tiene ' + platos.length + ' plato(s) en ' + qd + '–' + qh + '.');
            else if (subs.length) err.push(txt + ': su subcategoría "' + subs[0].nombre + '" está en ' + qd + '–' + qh + '.');
            else if (resto.length !== 1) err.push(txt + ': quedaría vacía o partida en dos.');
            else if (!o.sub && especialDe(x)) err.push(txt + ' (es especial: ' + especialDe(x) + ').');
            else {
                vec.push({ obj: x, cat: o.sub ? o.cat : x, sub: o.sub ? x : null, desde: resto[0][0], hasta: resto[0][1], qd: qd, qh: qh });
                if (!recortarVecina) err.push(txt + ': se le puede quitar ese tramo vacío (' + qd + '–' + qh + ') marcando la casilla.');
            }
        });
        if (o.sub && o.sub.tipo !== 'vino') {
            var zv = zonaVinoSug(est, o.cat);
            if (anadidos.some(function (a) { return toca(zv, a[0], a[1]); })) err.push('Pisa los vinos de la hoja de Sugerencias (' + zv.map(function (r) { return r[0] + '–' + r[1]; }).join(', ') + ').');
        }
        // Pestañas de la web de otras categorías.
        var propias = [pestanaDe(est, o.cat)];
        var w = destinoWeb(est, o.cat, null); if (w) propias.push(w.p);
        vec.forEach(function (v) { if (!v.sub) { propias.push(pestanaDe(est, v.cat)); var w2 = destinoWeb(est, v.cat, null); if (w2) propias.push(w2.p); } });
        (est.pestanas || []).forEach(function (p) {
            if (p.especial || propias.indexOf(p) >= 0) return;
            var rs = []; cadaLista(p, function (x) { rs = rs.concat(x.rangos || []); });
            var t = anadidos.filter(function (a) { return toca(rs, a[0], a[1]); });
            if (t.length) err.push('Pisa la pestaña "' + ((p.nombre && p.nombre.ES) || p.id) + '" de la web.');
        });
        return { errores: err, vecinas: vec };
    }

    // Ajusta la web tras pasar (cat | sub) de [od, oh] a [nd, nh].
    function ajustarWeb(est, cat, sub, od, oh, nd, nh) {
        var quitados = recortar([[od, oh]], nd, nh), anadidos = recortar([[nd, nh]], od, oh);
        reemplazarExacto(est, od, oh, nd, nh);
        var p = pestanaDe(est, cat);
        if (!p || p.especial) return;
        if (!sub) {
            quitados.forEach(function (q) { cadaLista(p, function (x) { if (x.rangos) x.rangos = recortar(x.rangos, q[0], q[1]); }); });
            anadidos.forEach(function (a) {
                if (!cubre(p.rangos, a[0], a[1])) p.rangos = unirRangos((p.rangos || []).concat([a]));
                if (p.grupos && p.grupos.length && !p.grupos.some(function (g) { return toca(g.rangos, a[0], a[1]); })) {
                    var borde = a[1] < od ? od : oh;
                    var g = p.grupos.find(function (x) { return x.tipo !== 'vino' && toca(x.rangos, borde, borde); });
                    if (g) g.rangos = unirRangos(g.rangos.concat([a]));
                }
            });
        } else {
            var g = (p.grupos || []).find(function (x) { return esUnico(x.rangos, nd, nh); });
            if (g) anadidos.forEach(function (a) { p.grupos.forEach(function (x) { if (x !== g) x.rangos = recortar(x.rangos, a[0], a[1]); }); });
            anadidos.forEach(function (a) { if (!cubre(p.rangos, a[0], a[1])) p.rangos = unirRangos((p.rangos || []).concat([a])); });
        }
        limpiarPestana(p);
    }

    // Quita (cat | sub) de la estructura. Devuelve los id de pestaña que desaparecen.
    function quitar(est, o) {
        if (!o.sub) {
            est.categorias.splice(est.categorias.indexOf(o.cat), 1);
            var p = pestanaDe(est, o.cat), fuera = [];
            if (p && !p.especial && !est.categorias.some(function (c) { return String(c.pestana) === String(p.id); })) {
                est.pestanas.splice(est.pestanas.indexOf(p), 1); fuera.push(String(p.id));
            }
            quitarExacto(est, o.d, o.h);
            return fuera;
        }
        o.cat.sub = o.cat.sub.filter(function (s) { return s !== o.sub; });
        var q = pestanaDe(est, o.cat);
        if (q && q.grupos) { q.grupos = q.grupos.filter(function (g) { return !esUnico(g.rangos, o.d, o.h); }); limpiarPestana(q); }
        if (!o.cat.sub.length) { delete o.cat.sub; if (!o.cat.carpeta) o.cat.carpeta = o.sub.carpeta || slug(o.cat.nombre); }
        return [];
    }

    // Destino de "Unir": ID libres del destino, empezando detrás de su último plato.
    function huecosDestino(dst, ids) {
        var ocup = {}, ult = dst.d - 1, l = [];
        (ids || []).forEach(function (i) { ocup[i] = 1; if (i >= dst.d && i <= dst.h) ult = Math.max(ult, i); });
        for (var i = dst.d; i <= dst.h; i++) if (!ocup[i]) l.push(i);
        return l.filter(function (i) { return i > ult; }).concat(l.filter(function (i) { return i < ult; }));
    }

    function aplicarPaso3(est, cambio, ids) {
        ids = ids || [];
        var o, r = { estructura: est, ocultar: [], quitarOcultas: [], renumerar: null };
        if (cambio.tipo === 'ordenar') {
            var pos = function (lista, k) { var i = (lista || []).map(String).indexOf(String(k)); return i < 0 ? 1e9 : i; };
            if (cambio.categorias) est.categorias = est.categorias.map(function (c, i) { return [c, i]; })
                .sort(function (a, b) { return (pos(cambio.categorias, a[0].desde) - pos(cambio.categorias, b[0].desde)) || (a[1] - b[1]); }).map(function (x) { return x[0]; });
            if (cambio.pestanas) est.pestanas = est.pestanas.map(function (p, i) { return [p, i]; })
                .sort(function (a, b) { return (pos(cambio.pestanas, a[0].id) - pos(cambio.pestanas, b[0].id)) || (a[1] - b[1]); }).map(function (x) { return x[0]; });
            return r;
        }
        o = buscar(est, cambio.objetivo || cambio.origen);
        if (cambio.tipo === 'renombrar') {
            var nombre = String(cambio.nombre || '').trim();
            if (!nombre) throw new Error('Falta el nombre.');
            var hermanos = o.sub ? o.cat.sub.filter(function (s) { return s !== o.sub; }) : est.categorias.filter(function (c) { return c !== o.cat; });
            if (hermanos.some(function (x) { return String(x.nombre).trim().toLowerCase() === nombre.toLowerCase(); })) throw new Error('Ya hay ' + (o.sub ? 'una subcategoría' : 'una categoría') + ' "' + nombre + '".');
            (o.sub || o.cat).nombre = nombre;
            if (cambio.nombresWeb) {
                var w = destinoWeb(est, o.cat, o.sub);
                if (!w) throw new Error('"' + o.nombre + '" no tiene nombre propio en la web.');
                w.x.nombre = Object.assign({}, w.x.nombre || {}, nombresDe({ nombres: cambio.nombresWeb }, nombre));
            }
            return r;
        }
        if (cambio.tipo === 'rango') {
            var nd = parseInt(cambio.desde, 10), nh = parseInt(cambio.hasta, 10);
            if (nd === o.d && nh === o.h) throw new Error('El rango no ha cambiado.');
            var c = conflictosRango(est, cambio.objetivo, nd, nh, ids, !!cambio.recortarVecina);
            if (c.errores.length) throw new Error(c.errores.join(' '));
            (o.sub || o.cat).desde = nd; (o.sub || o.cat).hasta = nh;
            c.vecinas.forEach(function (v) {
                var vd = v.obj.desde, vh = v.obj.hasta;
                v.obj.desde = v.desde; v.obj.hasta = v.hasta;
                ajustarWeb(est, v.cat, v.sub, vd, vh, v.desde, v.hasta);
            });
            ajustarWeb(est, o.cat, o.sub, o.d, o.h, nd, nh);
            return r;
        }
        if (cambio.tipo === 'borrar' || cambio.tipo === 'unir') {
            if (!o.sub && especialDe(o.cat)) throw new Error('"' + o.cat.nombre + '" es especial (' + especialDe(o.cat) + '): no se puede ' + (cambio.tipo === 'unir' ? 'unir' : 'borrar') + '.');
            var dentro = ids.filter(function (i) { return i >= o.d && i <= o.h; }).sort(function (a, b) { return a - b; });
            if (cambio.tipo === 'borrar') {
                if (dentro.length) throw new Error('"' + o.nombre + '" tiene ' + dentro.length + ' plato(s) (activos o no): muévelos antes con "Unir" o bórralos en el editor.');
                r.quitarOcultas = quitar(est, o);
                return r;
            }
            var dst = buscar(est, cambio.destino);
            if (dst.cat === o.cat && (!o.sub || !dst.sub || dst.sub === o.sub)) throw new Error('Elige otro destino.');
            if (dst.cat.sub && dst.cat.sub.length && !dst.sub) throw new Error('"' + dst.cat.nombre + '" tiene subcategorías: elige en cuál van los platos.');
            if (!dentro.length) throw new Error('"' + o.nombre + '" no tiene platos: usa "Borrar".');
            var libresD = huecosDestino(dst, ids);
            if (libresD.length < dentro.length) throw new Error('No caben: son ' + dentro.length + ' plato(s) y "' + dst.nombre + '" solo tiene ' + libresD.length + ' ID libres. Amplía antes su rango.');
            r.renumerar = {};
            dentro.forEach(function (id, k) { r.renumerar[id] = libresD[k]; });
            r.quitarOcultas = quitar(est, o);
            return r;
        }
        throw new Error('Cambio de estructura desconocido.');
    }

    // Guarda un cambio (POST ?accion=estructura). Devuelve true si se guardó.
    async function guardarCambio(cambio) {
        try {
            var url = typeof window.getWebAppUrl === 'function' ? window.getWebAppUrl(modo()) : '';
            var r = await fetch(url + '?accion=estructura', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cambio) });
            var t = await r.text();
            if (!r.ok || /^Error/.test(t)) throw new Error(t.replace(/^Error:\s*/, ''));
            return true;
        } catch (err) { alert('No se pudo guardar:\n' + (err.message || err)); return false; }
    }

    // Paso de revisar los 26 nombres (editables) en "caja". onCrear(nombres) / onVolver().
    function revisarNombres(caja, cabecera, nombres, sinIA, onVolver, onCrear) {
        caja.innerHTML = '<p style="margin:0 0 8px;">' + cabecera + '</p>' +
            (sinIA ? '<p style="color:#b45309; margin:0 0 8px;">⚠️ Sin traducción con IA: rellena los que quieras (los vacíos salen en español).</p>' : '<p style="color:#64748b; margin:0 0 8px;">Revisa los nombres; puedes cambiarlos.</p>') +
            '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:6px 12px;">' +
            IDIOMAS.map(function (l) {
                return '<label style="display:flex; gap:6px; align-items:center;"><b style="width:28px;">' + l + '</b><input data-l="' + l + '" value="' + esc(nombres[l] || '') + '" style="' + ESTILO_IN + ' flex:1; min-width:0;"' + (l === 'AR' ? ' dir="rtl"' : '') + '></label>';
            }).join('') + '</div>' +
            '<div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px;"><button type="button" data-b="volver" style="' + ESTILO_BTN + '">← Volver</button>' +
            '<button type="button" data-b="crear" style="' + ESTILO_OK + '">Crear</button></div>';
        caja.querySelector('[data-b="volver"]').onclick = onVolver;
        var b = caja.querySelector('[data-b="crear"]');
        b.onclick = async function () {
            var n = {};
            Array.prototype.forEach.call(caja.querySelectorAll('input[data-l]'), function (i) { if (i.value.trim()) n[i.getAttribute('data-l')] = i.value.trim(); });
            b.disabled = true; b.textContent = '⏳ Guardando…';
            if (!(await onCrear(n))) { b.disabled = false; b.textContent = 'Crear'; }
        };
    }

    function nuevaSubcategoria(catDesde) {
        var est = window.Categorias && window.Categorias.estructura();
        if (!est) { alert('Este editor aún no tiene la estructura de la carta (datos.json → "estructura"). Pulsa CONSTRUIR y vuelve a abrir el editor.'); return; }
        var ids = idsPlatos();
        var cats = est.categorias.filter(function (c) { return !c.sinPlatos && c.tipo !== 'alergenos'; });
        var viejo = $('ew-org'); if (viejo) viejo.remove();
        var fondo = document.createElement('div');
        fondo.id = 'ew-org';
        fondo.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,.5); z-index:10001; display:flex; align-items:center; justify-content:center; padding:2vh 2vw;';
        fondo.innerHTML = '<div style="background:#fff; border-radius:12px; width:760px; max-width:96vw; max-height:94vh; overflow:auto; font-size:16px; line-height:1.4; box-shadow:0 20px 40px rgba(0,0,0,.3);">' +
            '<div style="padding:14px 18px 10px; border-bottom:1px solid #eef2f7; display:flex; align-items:center; gap:8px;"><h3 style="margin:0; flex:1;">➕ Nueva subcategoría</h3>' +
            '<button type="button" id="ew-org-x" style="' + ESTILO_BTN + '">Cerrar</button></div>' +
            '<div id="ew-org-paso1" style="padding:14px 18px; display:grid; gap:12px;">' +
            '<label><b>Categoría</b><br><select id="ew-sub-cat" style="' + ESTILO_IN + ' max-width:100%;">' + cats.map(function (c) {
                return '<option value="' + c.desde + '">' + esc(c.nombre) + ' (' + c.desde + '–' + c.hasta + ')' + (c.sub && c.sub.length ? ' · ' + c.sub.length + ' sub' : '') + '</option>'; }).join('') + '</select></label>' +
            '<div id="ew-sub-aviso" style="font-size:.88em; color:#92400e;"></div>' +
            '<div style="display:flex; flex-wrap:wrap; gap:12px;">' +
            '<label style="flex:1 1 260px;"><b>Nombre</b> (en español)<br><input id="ew-sub-nombre" style="' + ESTILO_IN + ' width:100%;" placeholder="p. ej. Cocktails sugeridos"></label>' +
            '<label><b>Carpeta de fotos</b><br><input id="ew-sub-carpeta" style="' + ESTILO_IN + '" placeholder="se pone sola"></label></div>' +
            '<fieldset style="border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px;"><legend><b>Rango de ID</b> (dentro de la categoría)</legend>' +
            '<div style="display:flex; flex-wrap:wrap; gap:10px; align-items:end;">' +
            '<label>Tamaño<br><select id="ew-sub-tam" style="' + ESTILO_IN + '"><option value="10">10 platos</option><option value="20">20</option><option value="50">50</option><option value="100" selected>100</option></select></label>' +
            '<label>Desde<br><input id="ew-sub-desde" type="number" style="' + ESTILO_IN + ' width:110px;"></label>' +
            '<label>Hasta<br><input id="ew-sub-hasta" type="number" style="' + ESTILO_IN + ' width:110px;"></label>' +
            '<button type="button" id="ew-sub-proponer" style="' + ESTILO_BTN + '">Proponer uno libre</button></div>' +
            '<div id="ew-sub-estado" style="margin-top:6px; font-size:.9em;"></div>' +
            '<div style="margin-top:6px; font-size:.82em; color:#64748b;">Tramos libres de la categoría (clic para usar): <span id="ew-sub-libres"></span></div></fieldset>' +
            '<fieldset id="ew-sub-web" style="border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px;"></fieldset>' +
            '<div style="display:flex; gap:8px; justify-content:flex-end;"><button type="button" id="ew-org-cancelar" style="' + ESTILO_BTN + '">Cancelar</button>' +
            '<button type="button" id="ew-sub-seguir" style="' + ESTILO_OK + '">Crear subcategoría</button></div></div>' +
            '<div id="ew-org-paso2" style="display:none; padding:14px 18px;"></div></div>';
        document.body.appendChild(fondo);
        var cerrar = function () { fondo.remove(); document.removeEventListener('keydown', tecla); };
        var tecla = function (ev) { if (ev.key === 'Escape') cerrar(); };
        document.addEventListener('keydown', tecla);
        $('ew-org-x').onclick = cerrar; $('ew-org-cancelar').onclick = cerrar;
        if (catDesde != null) $('ew-sub-cat').value = String(catDesde);

        var cat = function () { return est.categorias.find(function (c) { return c.desde === parseInt($('ew-sub-cat').value, 10); }); };
        var carpetaTocada = false;
        $('ew-sub-carpeta').oninput = function () { carpetaTocada = true; };
        $('ew-sub-nombre').oninput = function () { if (!carpetaTocada) $('ew-sub-carpeta').value = slug(this.value); };
        var webModo = function () { var r = fondo.querySelector('input[name="ew-sub-webm"]:checked'); return r ? r.value : 'nada'; };
        var botonSeguir = function () { $('ew-sub-seguir').textContent = webModo() === 'nuevo' ? 'Traducir con IA y revisar' : 'Crear subcategoría'; };

        function pintarWeb() {
            var c = cat(), p = pestanaDe(est, c), caja = $('ew-sub-web');
            if (!p) { caja.innerHTML = '<legend><b>En la web</b></legend><small style="color:#64748b;">Esta categoría no tiene pestaña propia en la web: la subcategoría es solo para el editor.</small>'; botonSeguir(); return; }
            var d = parseInt($('ew-sub-desde').value, 10);
            var grupos = p.grupos || [];
            var actual = grupos.findIndex(function (g) { return (g.rangos || []).some(function (r) { return d >= r[0] && d <= r[1]; }); });
            var esSug = c.tipo === 'sugerencias';
            caja.innerHTML = '<legend><b>En la web' + (esSug ? ' y en la hoja de Sugerencias' : '') + '</b> (pestaña "' + esc((p.nombre && p.nombre.ES) || p.id) + '")</legend>' +
                '<label style="display:block; margin:3px 0;"><input type="radio" name="ew-sub-webm" value="nuevo"> Sección nueva con su título' +
                (grupos.length ? ', después de <select id="ew-sub-tras" style="' + ESTILO_IN + '"><option value="">(automático)</option>' +
                    grupos.map(function (g, i) { return '<option value="' + i + '">' + esc((g.nombre && g.nombre.ES) || ('Sección ' + (i + 1))) + '</option>'; }).join('') + '</select>' : '') + '</label>' +
                (grupos.length ? '<label style="display:block; margin:3px 0;"><input type="radio" name="ew-sub-webm" value="grupo"' + (actual >= 0 ? ' checked' : '') + '> Dentro de la sección <select id="ew-sub-grupo" style="' + ESTILO_IN + '">' +
                    grupos.map(function (g, i) { return '<option value="' + i + '"' + (i === actual ? ' selected' : '') + '>' + esc((g.nombre && g.nombre.ES) || ('Sección ' + (i + 1))) + (g.tipo === 'vino' ? ' (vinos)' : '') + '</option>'; }).join('') + '</select></label>' : '') +
                '<label style="display:block; margin:3px 0;"><input type="radio" name="ew-sub-webm" value="nada"' + (actual < 0 ? ' checked' : '') + '> Sin título propio, junto al resto de la pestaña</label>' +
                (esSug ? '<small style="color:#64748b;">Las secciones de la pestaña son también las de la hoja imprimible de Sugerencias.</small>' : '');
            Array.prototype.forEach.call(caja.querySelectorAll('input[name="ew-sub-webm"]'), function (r) { r.onchange = botonSeguir; });
            botonSeguir();
        }
        function comprobar() {
            var d = parseInt($('ew-sub-desde').value, 10), h = parseInt($('ew-sub-hasta').value, 10);
            var m = conflictosSub(est, cat(), d, h, ids);
            $('ew-sub-estado').innerHTML = m.length ? '<span style="color:#b91c1c;">⛔ ' + esc(m.join(' ')) + '</span>'
                : '<span style="color:#15803d;">✔ Libre: ' + d + '–' + h + ' (' + (h - d + 1) + ' ID).</span>';
            return !m.length;
        }
        var tam = function () { return parseInt($('ew-sub-tam').value, 10); };
        function proponerAhora() {
            var p = proponerSub(est, cat(), ids, tam());
            if (p) { $('ew-sub-desde').value = p[0]; $('ew-sub-hasta').value = p[1]; comprobar(); }
            else { $('ew-sub-desde').value = ''; $('ew-sub-hasta').value = ''; $('ew-sub-estado').innerHTML = '<span style="color:#b91c1c;">⛔ No caben ' + tam() + ' ID libres en esta categoría: elige menos o amplía antes su rango.</span>'; }
            pintarWeb();
        }
        function alCambiarCat() {
            var c = cat();
            $('ew-sub-aviso').textContent = (c.sub && c.sub.length) ? '' : 'Aún no tiene subcategorías: lo que ya tiene pasará a una primera subcategoría "' + c.nombre + '"' +
                (c.tipo === 'sugerencias' ? ' (y sus vinos a "Vinos")' : '') + ' y la nueva irá detrás.';
            $('ew-sub-libres').innerHTML = libresSub(est, c, ids).map(function (x) {
                return '<a href="#" data-d="' + x[0] + '" data-h="' + x[1] + '" style="display:inline-block; margin:2px 4px 2px 0; padding:1px 7px; border:1px dashed #94a3b8; border-radius:6px; color:#334155; text-decoration:none;">' + x[0] + '–' + x[1] + '</a>';
            }).join('') || 'ninguno';
            Array.prototype.forEach.call($('ew-sub-libres').querySelectorAll('a'), function (a) {
                a.onclick = function (ev) {
                    ev.preventDefault();
                    var d = +a.getAttribute('data-d'), h = +a.getAttribute('data-h');
                    $('ew-sub-desde').value = d; $('ew-sub-hasta').value = Math.min(h, d + tam() - 1);
                    comprobar(); pintarWeb();
                };
            });
            proponerAhora();
        }
        $('ew-sub-cat').onchange = alCambiarCat;
        $('ew-sub-tam').onchange = proponerAhora;
        $('ew-sub-proponer').onclick = proponerAhora;
        $('ew-sub-desde').oninput = function () { var d = parseInt(this.value, 10); if (!isNaN(d)) $('ew-sub-hasta').value = d + tam() - 1; comprobar(); pintarWeb(); };
        $('ew-sub-hasta').oninput = comprobar;
        alCambiarCat();
        setTimeout(function () { $('ew-sub-nombre').focus(); }, 50);

        async function terminar(cambio) {
            var nomCat = cat().nombre;
            if (!(await guardarCambio(cambio))) return false;
            cerrar();
            await refrescarEditor();
            if (window.MapaIds && $('ew-mapa')) window.MapaIds.abrir();
            alert('✔ Subcategoría "' + cambio.sub.nombre + '" creada en "' + nomCat + '" (' + cambio.sub.desde + '–' + cambio.sub.hasta + ').\n\nPara añadir platos: botón de nuevo plato → "' + cambio.sub.nombre + '".');
            return true;
        }
        $('ew-sub-seguir').onclick = async function () {
            var cambio = { tipo: 'crearSubcategoria', categoria: cat().desde,
                sub: { nombre: $('ew-sub-nombre').value.trim(), desde: parseInt($('ew-sub-desde').value, 10), hasta: parseInt($('ew-sub-hasta').value, 10), carpeta: $('ew-sub-carpeta').value.trim() },
                web: { modo: webModo(), grupo: $('ew-sub-grupo') ? $('ew-sub-grupo').value : null, despuesDe: $('ew-sub-tras') ? $('ew-sub-tras').value : '' }, nombres: {} };
            if (!cambio.sub.nombre) { alert('Escribe el nombre de la subcategoría.'); $('ew-sub-nombre').focus(); return; }
            if (!comprobar()) { alert('El rango de ID no vale. Pulsa "Proponer uno libre" o elige un tramo libre.'); return; }
            try { aplicar(est, cambio, ids); } catch (err) { alert(err.message); return; }
            cambio.nombres = { ES: cambio.sub.nombre };
            if (cambio.web.modo !== 'nuevo') { this.disabled = true; if (!(await terminar(cambio))) this.disabled = false; return; }
            fondo.style.display = 'none';
            var trad = await traducir(cambio.sub.nombre);
            fondo.style.display = 'flex';
            if (trad) cambio.nombres = trad;
            var p1 = $('ew-org-paso1'), p2 = $('ew-org-paso2');
            p1.style.display = 'none'; p2.style.display = 'block';
            revisarNombres(p2, '<b>' + esc(cambio.sub.nombre) + '</b> · ' + cambio.sub.desde + '–' + cambio.sub.hasta + ' · sección nueva en "' + esc(cat().nombre) + '"', cambio.nombres, !trad,
                function () { p2.style.display = 'none'; p1.style.display = 'grid'; },
                function (n) { n.ES = n.ES || cambio.sub.nombre; cambio.nombres = n; return terminar(cambio); });
        };
    }

    // ---------- interfaz ----------
    function idsPlatos() {
        var lista = (typeof datosLocales !== 'undefined' && Array.isArray(datosLocales)) ? datosLocales : (window.datosLocales || []); // eslint-disable-line no-undef
        return lista.map(function (p) { return parseInt(p && p.id, 10); }).filter(function (n) { return !isNaN(n); });
    }
    function modo() { return (window.EDITOR_SITIO && window.EDITOR_SITIO.modo) || window.currentMode || 'restaurante001'; }
    var ESTILO_BTN = 'padding:7px 14px; border-radius:6px; border:1px solid #cbd5e1; background:#f1f5f9; cursor:pointer; font-size:.95em;';
    var ESTILO_OK = 'padding:7px 16px; border-radius:6px; border:1px solid #15803d; background:#16a34a; color:#fff; cursor:pointer; font-weight:600; font-size:.95em;';
    var ESTILO_IN = 'padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:.95em;';

    function nuevaCategoria() {
        var est = window.Categorias && window.Categorias.estructura();
        if (!est) { alert('Este editor aún no tiene la estructura de la carta (datos.json → "estructura"). Pulsa CONSTRUIR y vuelve a abrir el editor.'); return; }
        var ids = idsPlatos();
        var viejo = $('ew-org'); if (viejo) viejo.remove();
        var pestanas = (est.pestanas || []).filter(function (p) { return !p.especial; });
        var nomP = function (p) { return (p.nombre && p.nombre.ES) || p.id; };
        var opPes = pestanas.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(nomP(p)) + '</option>'; }).join('');
        var opCat = est.categorias.map(function (c) { return '<option value="' + c.desde + '">' + esc(c.nombre) + ' (' + c.desde + '–' + c.hasta + ')</option>'; }).join('');

        var fondo = document.createElement('div');
        fondo.id = 'ew-org';
        fondo.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,.5); z-index:10001; display:flex; align-items:center; justify-content:center; padding:2vh 2vw;';
        fondo.innerHTML = '<div style="background:#fff; border-radius:12px; width:760px; max-width:96vw; max-height:94vh; overflow:auto; font-size:16px; line-height:1.4; box-shadow:0 20px 40px rgba(0,0,0,.3);">' +
            '<div style="padding:14px 18px 10px; border-bottom:1px solid #eef2f7; display:flex; align-items:center; gap:8px;"><h3 style="margin:0; flex:1;">➕ Nueva categoría</h3>' +
            '<button type="button" id="ew-org-x" style="' + ESTILO_BTN + '">Cerrar</button></div>' +
            '<div id="ew-org-paso1" style="padding:14px 18px; display:grid; gap:12px;">' +
            '<label><b>Nombre</b> (en español)<br><input id="ew-org-nombre" style="' + ESTILO_IN + ' width:100%;" placeholder="p. ej. Cocktails"></label>' +
            '<div style="display:flex; flex-wrap:wrap; gap:12px;">' +
            '<label><b>Tipo</b><br><select id="ew-org-tipo" style="' + ESTILO_IN + '"><option value="">Normal (comida)</option><option value="bebida">Bebida</option>' +
            '<option value="vino:blanco">Vino blanco</option><option value="vino:rosado">Vino rosado</option><option value="vino:tinto">Vino tinto</option><option value="vino:cava">Cava / Champagne</option></select></label>' +
            '<label><b>Carpeta de fotos</b><br><input id="ew-org-carpeta" style="' + ESTILO_IN + '" placeholder="se pone sola"></label></div>' +
            '<fieldset style="border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px;"><legend><b>Rango de ID</b></legend>' +
            '<div style="display:flex; flex-wrap:wrap; gap:10px; align-items:end;">' +
            '<label>Tamaño<br><select id="ew-org-tam" style="' + ESTILO_IN + '"><option value="99">99 platos</option><option value="199">199</option><option value="499">499</option><option value="999">999</option></select></label>' +
            '<label>Desde<br><input id="ew-org-desde" type="number" style="' + ESTILO_IN + ' width:110px;"></label>' +
            '<label>Hasta<br><input id="ew-org-hasta" type="number" style="' + ESTILO_IN + ' width:110px;"></label>' +
            '<button type="button" id="ew-org-proponer" style="' + ESTILO_BTN + '">Proponer uno libre</button></div>' +
            '<div id="ew-org-estado" style="margin-top:6px; font-size:.9em;"></div>' +
            '<div style="margin-top:6px; font-size:.82em; color:#64748b;">Tramos libres (clic para usar): <span id="ew-org-libres"></span></div></fieldset>' +
            '<fieldset style="border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px;"><legend><b>En la web pública</b></legend>' +
            '<label style="display:block; margin:3px 0;"><input type="radio" name="ew-org-web" value="nueva" checked> Pestaña nueva, después de <select id="ew-org-tras-pes" style="' + ESTILO_IN + '"><option value="">(al final)</option>' + opPes + '</select></label>' +
            '<label style="display:block; margin:3px 0;"><input type="radio" name="ew-org-web" value="dentro"> Dentro de la pestaña <select id="ew-org-padre" style="' + ESTILO_IN + '">' + opPes + '</select> (al final, con su título)</label>' +
            '<label style="display:block; margin:3px 0;"><input type="radio" name="ew-org-web" value="no"> No sale en la web</label>' +
            '<small style="color:#64748b;">La pestaña nueva empieza oculta: actívala con su interruptor en el editor cuando tenga platos.</small></fieldset>' +
            '<label><b>En el editor</b>, después de <small style="color:#64748b;">(propone un rango libre detrás de esa)</small><br><select id="ew-org-tras-cat" style="' + ESTILO_IN + ' max-width:100%;"><option value="">(al final)</option>' + opCat + '</select></label>' +
            '<div style="display:flex; gap:8px; justify-content:flex-end;"><button type="button" id="ew-org-cancelar" style="' + ESTILO_BTN + '">Cancelar</button>' +
            '<button type="button" id="ew-org-seguir" style="' + ESTILO_OK + '">Traducir con IA y revisar</button></div></div>' +
            '<div id="ew-org-paso2" style="display:none; padding:14px 18px;"></div></div>';
        document.body.appendChild(fondo);

        var cerrar = function () { fondo.remove(); document.removeEventListener('keydown', tecla); };
        var tecla = function (ev) { if (ev.key === 'Escape') cerrar(); };
        document.addEventListener('keydown', tecla);
        $('ew-org-x').onclick = cerrar; $('ew-org-cancelar').onclick = cerrar;

        var carpetaTocada = false;
        $('ew-org-carpeta').oninput = function () { carpetaTocada = true; };
        $('ew-org-nombre').oninput = function () { if (!carpetaTocada) $('ew-org-carpeta').value = slug(this.value); };
        var webModo = function () { var r = fondo.querySelector('input[name="ew-org-web"]:checked'); return r ? r.value : 'no'; };
        Array.prototype.forEach.call(fondo.querySelectorAll('input[name="ew-org-web"]'), function (r) {
            r.onchange = function () { $('ew-org-seguir').textContent = webModo() === 'no' ? 'Crear categoría' : 'Traducir con IA y revisar'; };
        });

        function comprobar() {
            var d = parseInt($('ew-org-desde').value, 10), h = parseInt($('ew-org-hasta').value, 10);
            var m = conflictos(est, d, h, ids);
            $('ew-org-estado').innerHTML = m.length ? '<span style="color:#b91c1c;">⛔ ' + esc(m.join(' ')) + '</span>'
                : '<span style="color:#15803d;">✔ Libre: ' + d + '–' + h + ' (' + (h - d + 1) + ' ID).</span>';
            return !m.length;
        }
        function proponerAhora() {
            var tras = parseInt($('ew-org-tras-cat').value, 10);
            var c = est.categorias.filter(function (x) { return x.desde === tras; })[0];
            var p = proponer(est, ids, $('ew-org-tam').value, c ? c.hasta + 1 : 0);
            if (p) { $('ew-org-desde').value = p[0]; $('ew-org-hasta').value = p[1]; }
            comprobar();
        }
        var tam = function () { return parseInt($('ew-org-tam').value, 10); };
        $('ew-org-libres').innerHTML = libres(est, ids).map(function (x) {
            return '<a href="#" data-d="' + x[0] + '" data-h="' + x[1] + '" style="display:inline-block; margin:2px 4px 2px 0; padding:1px 7px; border:1px dashed #94a3b8; border-radius:6px; color:#334155; text-decoration:none;">' + x[0] + '–' + x[1] + '</a>';
        }).join('') || 'ninguno';
        Array.prototype.forEach.call($('ew-org-libres').querySelectorAll('a'), function (a) {
            a.onclick = function (ev) {
                ev.preventDefault();
                var d = +a.getAttribute('data-d'), h = +a.getAttribute('data-h');
                // Empieza en el primer x01 / x001 del tramo si cabe; si no, al principio.
                var paso = tam() <= 99 ? 100 : 1000, r = Math.ceil((d - 1) / paso) * paso + 1;
                var ini = (r + tam() - 1 <= h) ? r : d;
                $('ew-org-desde').value = ini; $('ew-org-hasta').value = Math.min(h, ini + tam() - 1);
                comprobar();
            };
        });
        $('ew-org-proponer').onclick = proponerAhora;
        $('ew-org-tam').onchange = proponerAhora;
        $('ew-org-tras-cat').onchange = proponerAhora;
        $('ew-org-desde').oninput = function () { var d = parseInt(this.value, 10); if (!isNaN(d)) $('ew-org-hasta').value = d + tam() - 1; comprobar(); };
        $('ew-org-hasta').oninput = comprobar;
        proponerAhora();
        setTimeout(function () { $('ew-org-nombre').focus(); }, 50);

        function cambioBase() {
            var t = $('ew-org-tipo').value.split(':');
            return {
                tipo: 'crearCategoria',
                categoria: { nombre: $('ew-org-nombre').value.trim(), desde: parseInt($('ew-org-desde').value, 10), hasta: parseInt($('ew-org-hasta').value, 10),
                    carpeta: $('ew-org-carpeta').value.trim(), tipo: t[0] || '', vino: t[1] || '' },
                web: { modo: webModo(), despuesDe: $('ew-org-tras-pes').value, padre: $('ew-org-padre').value },
                despuesDeCategoria: $('ew-org-tras-cat').value || null,
                nombres: {}
            };
        }

        $('ew-org-seguir').onclick = async function () {
            var cambio = cambioBase();
            if (!cambio.categoria.nombre) { alert('Escribe el nombre de la categoría.'); $('ew-org-nombre').focus(); return; }
            if (!comprobar()) { alert('El rango de ID no está libre. Pulsa "Proponer uno libre" o elige un tramo libre.'); return; }
            try { aplicar(est, cambio, ids); } catch (err) { alert(err.message); return; }
            cambio.nombres = { ES: cambio.categoria.nombre };
            if (cambio.web.modo === 'no') { guardar(cambio); return; }
            fondo.style.display = 'none';
            var trad = await traducir(cambio.categoria.nombre);
            fondo.style.display = 'flex';
            if (trad) cambio.nombres = trad;
            revisar(cambio, !trad);
        };

        // Paso 2: los 26 nombres, editables.
        function revisar(cambio, sinIA) {
            $('ew-org-paso1').style.display = 'none';
            var p2 = $('ew-org-paso2'); p2.style.display = 'block';
            p2.innerHTML = '<p style="margin:0 0 8px;"><b>' + esc(cambio.categoria.nombre) + '</b> · ' + cambio.categoria.desde + '–' + cambio.categoria.hasta +
                ' · ' + (cambio.web.modo === 'nueva' ? 'pestaña nueva (oculta al principio)' : 'dentro de "' + esc($('ew-org-padre').selectedOptions[0].textContent) + '"') + '</p>' +
                (sinIA ? '<p style="color:#b45309; margin:0 0 8px;">⚠️ Sin traducción con IA: rellena los que quieras (los vacíos salen en español).</p>' : '<p style="color:#64748b; margin:0 0 8px;">Revisa los nombres; puedes cambiarlos.</p>') +
                '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:6px 12px;">' +
                IDIOMAS.map(function (l) {
                    return '<label style="display:flex; gap:6px; align-items:center;"><b style="width:28px;">' + l + '</b><input data-l="' + l + '" value="' + esc(cambio.nombres[l] || '') + '" style="' + ESTILO_IN + ' flex:1; min-width:0;"' + (l === 'AR' ? ' dir="rtl"' : '') + '></label>';
                }).join('') + '</div>' +
                '<div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px;"><button type="button" id="ew-org-volver" style="' + ESTILO_BTN + '">← Volver</button>' +
                '<button type="button" id="ew-org-crear" style="' + ESTILO_OK + '">Crear categoría</button></div>';
            $('ew-org-volver').onclick = function () { p2.style.display = 'none'; $('ew-org-paso1').style.display = 'grid'; };
            $('ew-org-crear').onclick = function () {
                var n = {};
                Array.prototype.forEach.call(p2.querySelectorAll('input[data-l]'), function (i) { if (i.value.trim()) n[i.getAttribute('data-l')] = i.value.trim(); });
                n.ES = n.ES || cambio.categoria.nombre;
                cambio.nombres = n;
                guardar(cambio);
            };
        }

        async function guardar(cambio) {
            var btn = $('ew-org-crear') || $('ew-org-seguir');
            if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando…'; }
            try {
                var url = typeof window.getWebAppUrl === 'function' ? window.getWebAppUrl(modo()) : '';
                var r = await fetch(url + '?accion=estructura', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cambio) });
                var t = await r.text();
                if (!r.ok || /^Error/.test(t)) throw new Error(t.replace(/^Error:\s*/, ''));
            } catch (err) {
                alert('No se pudo crear la categoría:\n' + (err.message || err));
                if (btn) { btn.disabled = false; btn.textContent = 'Crear categoría'; }
                return;
            }
            cerrar();
            await refrescarEditor();
            if (window.MapaIds && $('ew-mapa')) window.MapaIds.abrir();
            alert('✔ Categoría "' + cambio.categoria.nombre + '" creada (' + cambio.categoria.desde + '–' + cambio.categoria.hasta + ').\n\n' +
                'Para añadir platos: botón de nuevo plato → "' + cambio.categoria.nombre + '".' +
                (cambio.web.modo === 'nueva' ? '\nLa pestaña está oculta en la web: actívala con su interruptor cuando tenga platos.' : ''));
        }
    }

    // ---------- interfaz del paso 3 ----------
    function hayPendiente() {
        if (window.hayCambiosSinGuardar) return true;
        try { var p = window.AlmacenJSON && window.AlmacenJSON.pendientes(); return !!p && Object.keys(p).some(function (k) { return p[k] > 0; }); } catch (e) { return false; }
    }
    function ventana(titulo, ancho) {
        var viejo = $('ew-org'); if (viejo) viejo.remove();
        var fondo = document.createElement('div');
        fondo.id = 'ew-org';
        fondo.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,.5); z-index:10001; display:flex; align-items:center; justify-content:center; padding:2vh 2vw;';
        fondo.innerHTML = '<div style="background:#fff; border-radius:12px; width:' + (ancho || 760) + 'px; max-width:96vw; max-height:94vh; overflow:auto; font-size:16px; line-height:1.4; box-shadow:0 20px 40px rgba(0,0,0,.3);">' +
            '<div style="padding:14px 18px 10px; border-bottom:1px solid #eef2f7; display:flex; align-items:center; gap:8px;"><h3 style="margin:0; flex:1;">' + titulo + '</h3>' +
            '<button type="button" data-b="x" style="' + ESTILO_BTN + '">Cerrar</button></div><div data-b="cuerpo" style="padding:14px 18px;"></div></div>';
        document.body.appendChild(fondo);
        var tecla = function (ev) { if (ev.key === 'Escape') cerrar(); };
        var cerrar = function () { fondo.remove(); document.removeEventListener('keydown', tecla); };
        document.addEventListener('keydown', tecla);
        fondo.querySelector('[data-b="x"]').onclick = cerrar;
        return { fondo: fondo, cuerpo: fondo.querySelector('[data-b="cuerpo"]'), cerrar: cerrar };
    }
    async function trasGuardar(v, texto, recargarPlatos) {
        v.cerrar();
        if (recargarPlatos && typeof cargar === 'function') { try { await cargar(0, true); } catch (e) { } } // eslint-disable-line no-undef
        await refrescarEditor();
        if (window.MapaIds && $('ew-mapa')) window.MapaIds.abrir();
        if (texto) alert(texto);
    }
    var CAJA = 'border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px; margin:0 0 12px;';

    // ✏️ Gestionar una categoría (subDesde = null) o una subcategoría.
    function gestionar(catDesde, subDesde) {
        var est = window.Categorias && window.Categorias.estructura();
        if (!est) { alert('Este editor aún no tiene la estructura de la carta. Pulsa CONSTRUIR y vuelve a abrir el editor.'); return; }
        var ids = idsPlatos(), objetivo = { cat: catDesde, sub: subDesde == null ? null : subDesde }, o;
        try { o = buscar(est, objetivo); } catch (err) { alert(err.message); return; }
        var dentro = ids.filter(function (i) { return i >= o.d && i <= o.h; }).sort(function (a, b) { return a - b; });
        var esp = !o.sub && especialDe(o.cat);
        var w = destinoWeb(est, o.cat, o.sub);
        var pes = !o.sub ? pestanaDe(est, o.cat) : null;
        var v = ventana('✏️ ' + esc(o.sub ? o.cat.nombre + ' › ' + o.sub.nombre : o.cat.nombre) + ' <small style="font-weight:400; color:#64748b;">' + o.d + '–' + o.h + '</small>');
        // Destinos de "Unir": categorías sin sub y cada subcategoría.
        var destinos = [];
        est.categorias.forEach(function (c) {
            if (c.sinPlatos || c.tipo === 'alergenos') return;
            if (c.sub && c.sub.length) c.sub.forEach(function (s) { if (s !== o.sub) destinos.push({ v: c.desde + ':' + s.desde, t: c.nombre + ' › ' + s.nombre + ' (' + s.desde + '–' + s.hasta + ')', cat: c.desde, sub: s.desde }); });
            else if (c !== o.cat) destinos.push({ v: c.desde + ':', t: c.nombre + ' (' + c.desde + '–' + c.hasta + ')', cat: c.desde, sub: null });
        });
        if (!o.sub) destinos = destinos.filter(function (d) { return d.cat !== o.cat.desde; });
        var deshab = (typeof categoriasDeshabilitadas !== 'undefined' && categoriasDeshabilitadas[modo()]) || null; // eslint-disable-line no-undef
        var visible = pes && deshab ? !deshab.has(String(pes.id)) : true;

        v.cuerpo.innerHTML =
            '<div style="font-size:.9em; color:#475569; margin:0 0 12px;">' + dentro.length + ' plato(s)' + (dentro.length ? ' (de ' + dentro[0] + ' a ' + dentro[dentro.length - 1] + ')' : '') +
            (w ? ' · en la web: ' + esc(textoWeb(w)) : ' · sin nombre propio en la web') + (esp ? ' · <b>especial: ' + esc(esp) + '</b>' : '') + '</div>' +
            // Nombre
            '<fieldset style="' + CAJA + '"><legend><b>Nombre</b></legend><div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">' +
            '<input id="ew-g-nombre" value="' + esc(o.nombre) + '" style="' + ESTILO_IN + ' flex:1 1 260px;">' +
            '<button type="button" id="ew-g-renombrar" style="' + ESTILO_OK + '">Renombrar</button></div>' +
            (w ? '<label style="display:block; margin-top:6px; font-size:.92em;"><input type="checkbox" id="ew-g-web"> Cambiar también el nombre en la web (' + esc(textoWeb(w)) + ', con IA a los 26 idiomas)</label>' : '') + '</fieldset>' +
            // Visible
            (pes && !pes.especial ? '<fieldset style="' + CAJA + '"><legend><b>En la web</b></legend><label><input type="checkbox" id="ew-g-visible"' + (visible ? ' checked' : '') + '> Pestaña "' + esc((pes.nombre && pes.nombre.ES) || pes.id) + '" visible en la web</label> <small style="color:#64748b;">(igual que su interruptor en el editor)</small></fieldset>' : '') +
            // Rango
            '<fieldset style="' + CAJA + '"><legend><b>Rango de ID</b> (ampliar / reducir)</legend><div style="display:flex; flex-wrap:wrap; gap:10px; align-items:end;">' +
            '<label>Desde<br><input id="ew-g-desde" type="number" value="' + o.d + '" style="' + ESTILO_IN + ' width:110px;"></label>' +
            '<label>Hasta<br><input id="ew-g-hasta" type="number" value="' + o.h + '" style="' + ESTILO_IN + ' width:110px;"></label>' +
            '<button type="button" id="ew-g-rango" style="' + ESTILO_OK + '">Guardar rango</button></div>' +
            '<label id="ew-g-vecina-l" style="display:none; margin-top:6px; font-size:.92em;"><input type="checkbox" id="ew-g-vecina"> <span id="ew-g-vecina-t"></span></label>' +
            '<div id="ew-g-rango-estado" style="margin-top:6px; font-size:.9em;"></div></fieldset>' +
            // Unir
            (!esp ? '<fieldset style="' + CAJA + '"><legend><b>Unir</b> (mover sus platos a otra y borrar esta)</legend>' +
                (dentro.length ? '<div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">Mover los ' + dentro.length + ' plato(s) a <select id="ew-g-destino" style="' + ESTILO_IN + ' max-width:100%;"><option value="">— elige destino —</option>' +
                    destinos.map(function (d) { return '<option value="' + d.v + '">' + esc(d.t) + '</option>'; }).join('') + '</select>' +
                    '<button type="button" id="ew-g-unir" style="' + ESTILO_BTN + ' border-color:#b45309; color:#92400e;">Unir</button></div>' +
                    '<div id="ew-g-unir-estado" style="margin-top:6px; font-size:.9em;"></div>' +
                    '<small style="color:#64748b;">Los platos cambian de ID (en orden, detrás del último del destino). Fotos, Info y traducciones se quedan; los Menús Especiales se actualizan.</small>'
                    : '<small style="color:#64748b;">No tiene platos: usa "Borrar".</small>') + '</fieldset>' : '') +
            // Borrar
            (!esp ? '<fieldset style="' + CAJA + '"><legend><b>Borrar</b></legend>' + (dentro.length
                ? '<small style="color:#64748b;">Solo se puede borrar vacía: tiene ' + dentro.length + ' plato(s) (activos o no). Muévelos con "Unir" o bórralos en el editor.</small>'
                : '<button type="button" id="ew-g-borrar" style="' + ESTILO_BTN + ' border-color:#b91c1c; color:#b91c1c;">🗑️ Borrar ' + (o.sub ? 'subcategoría' : 'categoría') + '</button>' +
                    (!o.sub && pes && !pes.especial ? ' <small style="color:#64748b;">(también su pestaña de la web)</small>' : '')) + '</fieldset>' : '<small style="color:#64748b;">Categoría especial: se puede renombrar y cambiar su rango, pero no unir ni borrar.</small>');

        // --- renombrar ---
        $('ew-g-renombrar').onclick = async function () {
            var b = this, nombre = $('ew-g-nombre').value.trim(), web = $('ew-g-web') && $('ew-g-web').checked;
            if (!nombre) { alert('Escribe el nombre.'); return; }
            var cambio = { tipo: 'renombrar', objetivo: objetivo, nombre: nombre, mensaje: 'renombrar ' + o.nombre + ' → ' + nombre };
            if (nombre === o.nombre && !web) { alert('El nombre no ha cambiado.'); return; }
            try { aplicar(est, cambio, ids); } catch (err) { alert(err.message); return; }
            var fin = async function () {
                if (!(await guardarCambio(cambio))) return false;
                await trasGuardar(v, '✔ "' + o.nombre + '" ahora se llama "' + nombre + '".' + (web ? '\nNombre de la web cambiado.' : ''));
                return true;
            };
            if (!web) { b.disabled = true; if (!(await fin())) b.disabled = false; return; }
            v.fondo.style.display = 'none';
            var trad = await traducir(nombre);
            v.fondo.style.display = 'flex';
            var caja = v.cuerpo;
            var antes = Array.prototype.slice.call(caja.childNodes);
            var p2 = document.createElement('div'); antes.forEach(function (n) { n.style && (n.style.display = 'none'); });
            caja.appendChild(p2);
            revisarNombres(p2, 'Nombre en la web de <b>' + esc(nombre) + '</b> (' + esc(textoWeb(w)) + ')', trad || Object.assign({}, w.x.nombre || {}, { ES: nombre }), !trad,
                function () { p2.remove(); antes.forEach(function (n) { n.style && (n.style.display = ''); }); },
                function (n) { n.ES = n.ES || nombre; cambio.nombresWeb = n; return fin(); });
        };
        // --- visible ---
        if ($('ew-g-visible')) $('ew-g-visible').onchange = async function () {
            if (typeof window.toggleCategoriaPestana !== 'function') { alert('Usa el interruptor de la pestaña en el editor.'); return; }
            await window.toggleCategoriaPestana(String(pes.id), this.checked, this);
            try { if (typeof renderizar === 'function') renderizar(); } catch (e) { } // eslint-disable-line no-undef
        };
        // --- rango ---
        function comprobarRango() {
            var d = parseInt($('ew-g-desde').value, 10), h = parseInt($('ew-g-hasta').value, 10), rec = $('ew-g-vecina').checked;
            var c;
            try { c = conflictosRango(est, objetivo, d, h, ids, rec); } catch (err) { c = { errores: [err.message], vecinas: [] }; }
            $('ew-g-vecina-l').style.display = c.vecinas.length ? 'block' : 'none';
            $('ew-g-vecina-t').textContent = c.vecinas.map(function (x) { return 'Quitar ' + x.qd + '–' + x.qh + ' (vacío) a "' + x.obj.nombre + '": quedaría ' + x.desde + '–' + x.hasta; }).join(' · ');
            var igual = d === o.d && h === o.h;
            $('ew-g-rango-estado').innerHTML = igual ? '<span style="color:#64748b;">Rango actual (' + (o.h - o.d + 1) + ' ID).</span>' : c.errores.length
                ? '<span style="color:#b91c1c;">⛔ ' + esc(c.errores.join(' ')) + '</span>'
                : '<span style="color:#15803d;">✔ Vale: ' + d + '–' + h + ' (' + (h - d + 1) + ' ID, ' + (h - d + 1 - dentro.length) + ' libres).</span>';
            return !igual && !c.errores.length;
        }
        $('ew-g-desde').oninput = comprobarRango; $('ew-g-hasta').oninput = comprobarRango; $('ew-g-vecina').onchange = comprobarRango;
        comprobarRango();
        $('ew-g-rango').onclick = async function () {
            if (!comprobarRango()) { alert('Ese rango no vale (mira el aviso en rojo).'); return; }
            var d = parseInt($('ew-g-desde').value, 10), h = parseInt($('ew-g-hasta').value, 10);
            var cambio = { tipo: 'rango', objetivo: objetivo, desde: d, hasta: h, recortarVecina: $('ew-g-vecina').checked, mensaje: 'rango ' + o.nombre + ' ' + d + '-' + h };
            try { aplicar(est, cambio, ids); } catch (err) { alert(err.message); return; }
            this.disabled = true;
            if (!(await guardarCambio(cambio))) { this.disabled = false; return; }
            await trasGuardar(v, '✔ "' + o.nombre + '": ' + o.d + '–' + o.h + ' → ' + d + '–' + h + '.');
        };
        // --- unir ---
        function destinoElegido() {
            var x = $('ew-g-destino') && $('ew-g-destino').value; if (!x) return null;
            var t = x.split(':'); return { cat: parseInt(t[0], 10), sub: t[1] === '' ? null : parseInt(t[1], 10) };
        }
        function comprobarUnir() {
            var dst = destinoElegido(); if (!dst) { $('ew-g-unir-estado').innerHTML = ''; return false; }
            try {
                var dd = buscar(est, dst), l = huecosDestino(dd, ids);
                $('ew-g-unir-estado').innerHTML = l.length >= dentro.length
                    ? '<span style="color:#15803d;">✔ Caben: irán de ' + Math.min.apply(null, l.slice(0, dentro.length)) + ' a ' + Math.max.apply(null, l.slice(0, dentro.length)) + ' (' + l.length + ' libres en el destino).</span>'
                    : '<span style="color:#b91c1c;">⛔ No caben: ' + dentro.length + ' plato(s) y solo hay ' + l.length + ' ID libres. Amplía antes el rango del destino.</span>';
                return l.length >= dentro.length;
            } catch (err) { $('ew-g-unir-estado').innerHTML = '<span style="color:#b91c1c;">⛔ ' + esc(err.message) + '</span>'; return false; }
        }
        if ($('ew-g-destino')) { $('ew-g-destino').onchange = comprobarUnir; comprobarUnir(); }
        if ($('ew-g-unir')) $('ew-g-unir').onclick = async function () {
            if (hayPendiente()) { alert('Antes guarda los cambios del editor ("Guardar cambios en web") y espera a que termine: al unir, los platos cambian de ID.'); return; }
            if (!comprobarUnir()) { if (!destinoElegido()) alert('Elige a dónde van los platos.'); return; }
            var dst = destinoElegido(), dd = buscar(est, dst);
            var cambio = { tipo: 'unir', origen: objetivo, destino: dst, mensaje: 'unir ' + o.nombre + ' → ' + dd.nombre };
            try { aplicar(est, cambio, ids); } catch (err) { alert(err.message); return; }
            var ok = typeof window.confirmarEditor === 'function'
                ? await window.confirmarEditor('¿Mover los ' + dentro.length + ' plato(s) de "' + o.nombre + '" a "' + dd.nombre + '" y borrar "' + o.nombre + '"' + (!o.sub && pes && !pes.especial ? ' (y su pestaña de la web)' : '') + '?', { si: 'Sí, unir', no: 'Cancelar' })
                : confirm('¿Unir "' + o.nombre + '" con "' + dd.nombre + '"?');
            if (!ok) return;
            this.disabled = true; this.textContent = '⏳ Uniendo…';
            if (!(await guardarCambio(cambio))) { this.disabled = false; this.textContent = 'Unir'; return; }
            await trasGuardar(v, '✔ ' + dentro.length + ' plato(s) movidos a "' + dd.nombre + '" y "' + o.nombre + '" borrada.', true);
        };
        // --- borrar ---
        if ($('ew-g-borrar')) $('ew-g-borrar').onclick = async function () {
            var b = this;
            if (b.dataset.seguro !== '1') { b.dataset.seguro = '1'; b.textContent = '¿Seguro? Pulsa otra vez'; return; }
            var cambio = { tipo: 'borrar', objetivo: objetivo, mensaje: 'borrar ' + o.nombre };
            try { aplicar(est, cambio, ids); } catch (err) { alert(err.message); return; }
            b.disabled = true;
            if (!(await guardarCambio(cambio))) { b.disabled = false; return; }
            await trasGuardar(v, '✔ "' + o.nombre + '" borrada.');
        };
    }

    // ↕️ Orden del acordeón del editor y de las pestañas de la web.
    function ordenar() {
        var est = window.Categorias && window.Categorias.estructura();
        if (!est) { alert('Este editor aún no tiene la estructura de la carta. Pulsa CONSTRUIR y vuelve a abrir el editor.'); return; }
        var cats = est.categorias.map(function (c) { return { k: c.desde, t: c.nombre + ' (' + c.desde + '–' + c.hasta + ')' }; });
        var pes = (est.pestanas || []).map(function (p) { return { k: p.id, t: (p.especial === 'alergenos' ? 'Alérgenos' : ((p.nombre && p.nombre.ES) || p.id)) }; });
        var v = ventana('↕️ Ordenar', 900);
        function lista(arr, id) {
            return '<ol id="' + id + '" style="margin:0; padding-left:26px;">' + arr.map(function (x, i) {
                return '<li style="margin:2px 0;"><span style="display:inline-flex; gap:6px; align-items:center;">' +
                    '<button type="button" data-m="-1" data-i="' + i + '" style="' + ESTILO_BTN + ' padding:1px 7px;"' + (i ? '' : ' disabled') + '>↑</button>' +
                    '<button type="button" data-m="1" data-i="' + i + '" style="' + ESTILO_BTN + ' padding:1px 7px;"' + (i < arr.length - 1 ? '' : ' disabled') + '>↓</button>' + esc(x.t) + '</span></li>';
            }).join('') + '</ol>';
        }
        function pintar() {
            v.cuerpo.innerHTML = '<div style="display:flex; flex-wrap:wrap; gap:18px;">' +
                '<div style="flex:1 1 360px;"><h4 style="margin:0 0 6px;">Acordeón del editor</h4>' + lista(cats, 'ew-o-cats') + '</div>' +
                '<div style="flex:1 1 300px;"><h4 style="margin:0 0 6px;">Pestañas de la web</h4>' + lista(pes, 'ew-o-pes') + '</div></div>' +
                '<p style="font-size:.85em; color:#64748b;">Las subcategorías van siempre por número de ID.</p>' +
                '<div style="display:flex; gap:8px; justify-content:flex-end;"><button type="button" id="ew-o-guardar" style="' + ESTILO_OK + '">Guardar orden</button></div>';
            [['ew-o-cats', cats], ['ew-o-pes', pes]].forEach(function (z) {
                Array.prototype.forEach.call($(z[0]).querySelectorAll('button[data-m]'), function (b) {
                    b.onclick = function () {
                        var i = +b.getAttribute('data-i'), j = i + (+b.getAttribute('data-m')), a = z[1], t = a[i];
                        a[i] = a[j]; a[j] = t; pintar();
                    };
                });
            });
            $('ew-o-guardar').onclick = async function () {
                var cambio = { tipo: 'ordenar', categorias: cats.map(function (x) { return x.k; }), pestanas: pes.map(function (x) { return x.k; }), mensaje: 'ordenar' };
                this.disabled = true;
                if (!(await guardarCambio(cambio))) { this.disabled = false; return; }
                await trasGuardar(v, '✔ Orden guardado.');
            };
        }
        pintar();
    }

    // Repinta el acordeón, el menú de "nuevo plato" y los interruptores de pestaña.
    async function refrescarEditor() {
        try { if (typeof cargarEstadoCategorias === 'function') await cargarEstadoCategorias(modo()); } catch (e) { } // eslint-disable-line no-undef
        try { if (typeof generarMenuAgrupado === 'function') generarMenuAgrupado(); } catch (e) { } // eslint-disable-line no-undef
        try { if (typeof renderizar === 'function') renderizar(); } catch (e) { } // eslint-disable-line no-undef
    }

    async function traducir(nombre) {
        var keys = (typeof getKeys === 'function') ? getKeys() : []; // eslint-disable-line no-undef
        if (!keys || !keys.length || typeof pedirGeminiJSON !== 'function') return null; // eslint-disable-line no-undef
        var tarea = typeof iniciarTareaIA === 'function' ? iniciarTareaIA('Traduciendo el nombre de la categoría…', '26 idiomas') : null; // eslint-disable-line no-undef
        var instr = 'Eres traductor de cartas de restaurante. Traduce este nombre de categoría (título de una pestaña de la carta): "' + nombre + '".\n' +
            'Devuelve SOLO un objeto JSON con exactamente estas claves: ' + IDIOMAS.join(', ') + '.\n' +
            'Cada valor: el nombre en ese idioma, corto, en estilo título, como saldría en una carta. ES = el original (corrige solo mayúsculas/acentos). ' +
            'CA = catalán, VA = valenciano, EU = euskera, GL = gallego, NO = noruego bokmål, ZH = chino simplificado. ' +
            'Si es un nombre propio o una palabra internacional (p. ej. "Cocktails"), adáptalo a lo habitual en cada idioma.';
        try {
            return await pedirGeminiJSON(instr, keys, tarea, function (o) { // eslint-disable-line no-undef
                return o && IDIOMAS.every(function (l) { return typeof o[l] === 'string' && o[l].trim(); });
            });
        } catch (err) {
            if (!err.cancelado) alert('No se pudo traducir con IA (' + (err.message || err) + ').\nPuedes escribir los nombres a mano.');
            return null;
        } finally { if (tarea) tarea.fin(); }
    }

    window.Organizador = {
        ocupados: ocupados, conflictos: conflictos, libres: libres, proponer: proponer, aplicar: aplicar, slug: slug,
        conflictosSub: conflictosSub, libresSub: libresSub, proponerSub: proponerSub,
        nuevaCategoria: nuevaCategoria, nuevaSubcategoria: nuevaSubcategoria,
        conflictosRango: conflictosRango, destinoWeb: destinoWeb, huecosDestino: huecosDestino,
        gestionar: gestionar, ordenar: ordenar
    };
})();
