// =========================================================================================
// categorias.js — estructura de la carta (categorías, rangos de ID, pestañas de la web) leída
// de datos.json -> "estructura". Común a todos los editores (lo copia construir.ps1).
//
// Hasta que llega datos.json usa la semilla de sitio-editor.js (EDITOR_SITIO.estructuraInicial,
// la pone construir desde restaurantes\<id>\estructura.json). almacen-json.js llama a
// Categorias.cargar() cada vez que lee datos.json y escribe "estructura" al guardar.
//
// Sin estructura (editor fuera de la web) todas las funciones devuelven null y el código de
// siempre usa sus números fijos.
//
// datos.json -> "estructura": {
//   "version": 1,
//   "categorias": [            el acordeón del editor, en su orden
//     { "nombre", "desde", "hasta", "pestana" (id en la web o null), "carpeta" (si no hay sub),
//       "subAcordeon", "sinPlatos",
//       "hojaPostres": true  (categoría normal que también es la hoja de Postres imprimible; sin
//                         helados ni bebidas. Si hay una "hoja-postres" con sub, manda esa.)
//       "tipo": "sugerencias" | "vino" | "bebida" | "alergenos" | "hoja-postres",
//       "vino": "blanco" | "rosado" | "tinto" | "cava",
//       "sub": [ { "nombre", "desde", "hasta", "carpeta",
//                  "tipo": "croquetas" | "croquetas-veg" | "vino" | "copas" | "postres" | "helados" | "bebidas",
//                  "imagen": foto por defecto al crear un plato } ] } ],
//   "pestanas": [ ... ]        las pestañas de la web pública (antes en restaurante.js)
// }
// =========================================================================================
(function () {
    'use strict';
    window.APP_VERSIONS = window.APP_VERSIONS || {};
    window.APP_VERSIONS.categorias = '1.1.0'; // 3 nov: "hojaPostres": true en una categoría normal (Club House: la hoja sale de sus Postres). 1.0.0: Fase 1 del organizador — estructura en datos.json

    let est = null;
    const num = (x) => parseInt(x, 10);
    const valida = (e) => !!e && Array.isArray(e.categorias) && e.categorias.length > 0;

    function cargar(e) {
        if (!valida(e)) return false;
        const cambia = JSON.stringify(e) !== JSON.stringify(est);
        est = JSON.parse(JSON.stringify(e));
        if (cambia) { try { window.dispatchEvent(new CustomEvent('estructura-cargada')); } catch (x) { } }
        return true;
    }
    cargar(window.EDITOR_SITIO && window.EDITOR_SITIO.estructuraInicial);

    const activa = () => !!est;
    const estructura = () => est ? JSON.parse(JSON.stringify(est)) : null;

    function categoriaDe(id) {
        if (!est) return null;
        const n = num(id);
        return est.categorias.find(c => n >= c.desde && n <= c.hasta) || null;
    }
    function subDe(id) {
        const c = categoriaDe(id);
        if (!c || !c.sub) return null;
        const n = num(id);
        return c.sub.find(s => n >= s.desde && n <= s.hasta) || null;
    }
    const conTipo = (t) => est ? est.categorias.filter(c => c.tipo === t) : [];

    // Mismo formato que ESTRUCTURA_RESTAURANTE00x de estructuras.js (lo que usa app.js).
    function estructuraEditor() {
        if (!est) return null;
        return est.categorias.map(c => {
            const x = { id: c.desde, name: c.nombre, rango: c.hasta - c.desde, pestanaId: c.pestana == null ? null : String(c.pestana) };
            if (c.carpeta) x.folder = c.carpeta;
            if (c.subAcordeon) x.subAcordeon = true;
            if (c.sinPlatos) x.sinPlatos = true;
            if (c.sub) x.sub = c.sub.map(s => ({ id: s.desde, name: s.nombre, folder: s.carpeta, max: s.hasta }));
            return x;
        });
    }

    // ---- tipos especiales (sustituyen a los números fijos del código) ----
    function esVino(id) { if (!est) return null; const c = categoriaDe(id); return !!c && c.tipo === 'vino'; }
    function tipoVino(id) { const c = categoriaDe(id); return c && c.tipo === 'vino' ? (c.vino || '') : null; }
    function esCopa(id) { if (!est) return null; const s = subDe(id); return !!s && s.tipo === 'copas'; }
    function esCroqueta(id) { if (!est) return null; const s = subDe(id); return !!s && (s.tipo === 'croquetas' || s.tipo === 'croquetas-veg'); }
    function esCroquetaVeg(id) { if (!est) return null; const s = subDe(id); return !!s && s.tipo === 'croquetas-veg'; }
    function imagenInicial(id) { if (!est) return null; const s = subDe(id); return (s && s.imagen) || ''; }

    function rangosHojaPostres() {
        const c = conTipo('hoja-postres')[0];
        if (!c || !c.sub) return hojaPostresSimple();
        const r = {};
        c.sub.forEach(s => { if (s.tipo && !r[s.tipo]) r[s.tipo] = [s.desde, s.hasta]; });
        if (r.postres && r.helados && r.bebidas) return r;
        return hojaPostresSimple();
    }
    // Hoja de Postres hecha con una categoría normal de la carta ("hojaPostres": true).
    function hojaPostresSimple() {
        const c = est && est.categorias.find(x => x.hojaPostres);
        return c ? { postres: [c.desde, c.hasta], helados: null, bebidas: null } : null;
    }
    function pestanaDeSugerencias() {
        const c = conTipo('sugerencias')[0];
        if (!c || c.pestana == null || !Array.isArray(est.pestanas)) return null;
        return est.pestanas.find(p => String(p.id) === String(c.pestana)) || null;
    }
    // [desde, hasta] de Sugerencias en la web (hoja imprimible).
    function rangoSugerencias() {
        const p = pestanaDeSugerencias();
        if (p && p.rangos && p.rangos.length) return [Math.min(...p.rangos.map(r => r[0])), Math.max(...p.rangos.map(r => r[1]))];
        const c = conTipo('sugerencias')[0];
        return c ? [c.desde, c.hasta] : null;
    }
    // [desde, hasta] de los vinos de Sugerencias (grupo "tipo":"vino" de su pestaña).
    function rangoVinosSugerencias() {
        const p = pestanaDeSugerencias();
        const g = p && (p.grupos || []).find(x => x.tipo === 'vino');
        return g && g.rangos && g.rangos.length ? g.rangos[0].slice() : null;
    }

    window.Categorias = {
        cargar, activa, estructura, categoriaDe, subDe, estructuraEditor,
        esVino, tipoVino, esCopa, esCroqueta, esCroquetaVeg, imagenInicial,
        rangosHojaPostres, rangoSugerencias, rangoVinosSugerencias
    };
})();
