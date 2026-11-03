// =========================================================================================
// editor-web.js — ajustes del editor cuando va DENTRO de la web (<web>/editor/), comunes a
// todos los editores (v3 y clubhouse). Lo inserta construir.ps1. No toca el editor oficial.
//   1) Traductor Pro (pestaña 3): la carta viene de la web (datos.json en GitHub) o de un
//      archivo local (datos.json o CSV); se guarda en la web; se descarga datos.json o CSV.
//   2) Eliminar plato: sin contraseña fija (ya hay login); se confirma escribiendo BORRAR.
//      Si el plato tiene fotos, casilla "Borrar también sus fotos": desmarcada = se mueven a
//      imagenes/<carpeta>/desactivadas/. Las fotos se tocan DESPUÉS de "Guardar cambios en web".
//   3) Tras cada guardado en GitHub, recuadro abajo a la derecha con cada plato cambiado:
//      ⏳ hasta que la web publicada (../datos/base.json) ya lo tiene, luego ✔. Consulta cada
//      10 s durante 5 min como máximo (~5 KB por consulta); si no aparece, avisa.
// =========================================================================================
(function () {
    'use strict';
    var S = window.EDITOR_SITIO;
    if (!S) return;
    window.APP_VERSIONS = window.APP_VERSIONS || {};
    window.APP_VERSIONS.editorWeb = '1.2.0';

    var $ = function (id) { return document.getElementById(id); };
    var log = function (t) { try { if (window.UI && window.UI.log) window.UI.log(t); } catch (e) { } console.log(t); };

    // ---------- Guardar como (pregunta dónde; si el navegador no sabe, descarga normal) ----------
    function fechaHoy() {
        var d = new Date(), dos = function (n) { return (n < 10 ? '0' : '') + n; };
        return dos(d.getDate()) + '-' + dos(d.getMonth() + 1) + '-' + d.getFullYear();
    }
    function nombreArchivo(ext) { return 'datos-' + S.restaurante + '-' + fechaHoy() + '.' + ext; }
    // Hay que pedir el sitio NADA MÁS pulsar (el navegador solo lo permite justo tras el clic).
    async function pedirDestino(nombre, ext) {
        if (!window.showSaveFilePicker) return null;
        var tipos = ext === 'json'
            ? [{ description: 'Carta (datos.json)', accept: { 'application/json': ['.json'] } }]
            : [{ description: 'CSV', accept: { 'text/csv': ['.csv'] } }];
        return window.showSaveFilePicker({ suggestedName: nombre, types: tipos, id: 'cartas-' + S.restaurante });
    }
    async function escribir(destino, texto, nombre, tipo) {
        if (destino) { var w = await destino.createWritable(); await w.write(new Blob([texto], { type: tipo })); await w.close(); return; }
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([texto], { type: tipo }));
        a.download = nombre;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    }
    var cancelado = function (err) { return err && err.name === 'AbortError'; };

    async function exportarCSV(headers, csvData) {
        var nombre = nombreArchivo('csv'), destino;
        try { destino = await pedirDestino(nombre, 'csv'); } catch (err) { if (cancelado(err)) return; destino = null; }
        try {
            var texto = window.Papa ? window.Papa.unparse([headers].concat(csvData))
                : [headers].concat(csvData).map(function (row) { return row.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
            await escribir(destino, texto, nombre, 'text/csv;charset=utf-8');
            log('[OK] CSV guardado' + (destino ? ' como ' + destino.name : '') + '.');
        } catch (err) { alert('No se pudo guardar el CSV: ' + (err.message || err)); }
    }

    // ---------- 1) Traductor Pro ----------
    function adaptarTraductor() {
        var otro = S.modo === 'restaurante002';
        var input = $(otro ? 'sheetsUrlUSOpen' : 'sheetsUrlRG');
        var btn = $(otro ? 'loadSheetsBtnUSOpen' : 'loadSheetsBtnRG');
        var etq = $(otro ? 'label-web-usopen' : 'label-web-rg');
        if (input) input.style.display = 'none';          // la URL sigue ahí: almacen-json la convierte en datos.json
        if (btn) { btn.innerText = '⬇ Cargar carta desde la web'; btn.style.flex = '1'; }
        if (etq) etq.innerText = 'CARTA EN LA WEB (datos.json):';

        var archivo = $('archivoLocal');
        if (archivo) {
            archivo.accept = '.json,.csv';
            var lab = archivo.parentNode && archivo.parentNode.querySelector('label');
            if (lab) lab.innerText = 'Archivo local (datos.json o CSV):';
        }
        textoBotonGuardar();

        var csv = $('saveCsvBtn');
        if (csv && !$('saveJsonBtn')) {
            var b = document.createElement('button');
            b.id = 'saveJsonBtn'; b.type = 'button'; b.className = csv.className; b.innerText = 'Descargar datos.json';
            b.onclick = descargarDatosJson;
            csv.insertAdjacentElement('afterend', b);
        }
        if (window.UI && !window.UI.__ewSync) {
            window.UI.__ewSync = true;
            window.UI.actualizarTextoBotonSync = textoBotonGuardar;
            window.UI.exportarCSV = exportarCSV;
        }
    }
    function textoBotonGuardar() {
        var b = $('btnSyncSheets');
        if (b) b.innerText = '☁️ Guardar en la web';
    }

    // Archivo local .json -> se pasa a CSV y sigue el camino de siempre (modal de destino).
    document.addEventListener('change', function (e) {
        var t = e.target;
        if (!t || t.id !== 'archivoLocal') return;
        var f = t.files && t.files[0];
        if (!f || !/\.json$/i.test(f.name)) return;
        f.text().then(function (txt) {
            var csv = window.AlmacenJSON.csvDeJson(txt);
            if (window.UI) window.UI.tempImportFile = new File([csv], f.name.replace(/\.json$/i, '.csv'), { type: 'text/csv' });
        }).catch(function (err) {
            alert('Ese archivo no es un datos.json válido: ' + (err.message || err));
            if (window.UI && window.UI.cancelarImportacion) window.UI.cancelarImportacion();
        });
    }, true);

    // Lo que hay en memoria en el Traductor -> datos.json (sin guardar nada en la web).
    async function descargarDatosJson() {
        if (!window.UI || !window.UI.sincronizarConGoogleSheets || !window.AlmacenJSON || !window.AlmacenJSON.datosJsonDe) return;
        var nombre = nombreArchivo('json'), destino;
        try { destino = await pedirDestino(nombre, 'json'); } catch (err) { if (cancelado(err)) return; destino = null; }
        var cuerpo = null, f = window.fetch, l = window.UI.log;
        window.fetch = function (input, init) {
            if (cuerpo === null && init && String(init.method || '').toUpperCase() === 'POST') { cuerpo = init.body; return Promise.resolve(new Response('', { status: 200 })); }
            return f.apply(this, arguments);
        };
        window.UI.log = function () { };
        try { await window.UI.sincronizarConGoogleSheets(); } finally { window.fetch = f; window.UI.log = l; }
        if (!cuerpo) { alert('Carga primero la carta (desde la web o un archivo).'); return; }
        try {
            var texto = await window.AlmacenJSON.datosJsonDe(JSON.parse(cuerpo), S.modo);
            await escribir(destino, texto, nombre, 'application/json;charset=utf-8');
            log('[OK] datos.json guardado' + (destino ? ' como ' + destino.name : '') + ' (en la web no se ha cambiado nada).');
        } catch (err) { alert('No se pudo preparar datos.json: ' + (err.message || err)); }
    }

    // ---------- 2) Eliminar plato ----------
    var fotosPendientes = [];   // [{ id, carpeta, imagen, borrar }] -> tras guardar

    function tieneFotos(p) { return !!(p && String(p.carpeta || '').trim() && /0\d\.webp$/i.test(String(p.imagen || '')) && window.SubirFoto); }

    function adaptarModalEliminar() {
        var modal = $('modal-eliminar-plato'), input = $('password-eliminar-plato'), error = $('error-password-eliminar');
        if (!modal || !input || $('ew-borrar-fotos')) return;
        Array.prototype.forEach.call(modal.querySelectorAll('p'), function (p) {
            if (/contraseña/i.test(p.textContent) && p !== error) p.textContent = 'Escribe BORRAR para confirmar. Esta acción no se puede deshacer.';
        });
        input.type = 'text'; input.placeholder = 'BORRAR'; input.setAttribute('autocapitalize', 'characters'); input.setAttribute('spellcheck', 'false');
        if (error) error.textContent = '❌ Escribe BORRAR para confirmar.';
        var lab = document.createElement('label');
        lab.id = 'ew-fila-fotos';
        lab.style.cssText = 'display:none; margin-top:14px; font-size:0.85rem; color:#444; text-align:left; cursor:pointer;';
        lab.innerHTML = '<input type="checkbox" id="ew-borrar-fotos" style="margin-right:6px;">Borrar también sus fotos' +
            '<br><small style="color:#888;">Si no lo marcas, las fotos se guardan en <i>desactivadas/</i> por si las necesitas.</small>';
        (error || input).insertAdjacentElement('afterend', lab);
    }

    function abrirModalEliminarPlato() {
        adaptarModalEliminar();
        var p = datosLocales.find(function (x) { return x.id === platoEditandoId; });   // eslint-disable-line no-undef
        __abrirOriginal();
        var fila = $('ew-fila-fotos'), chk = $('ew-borrar-fotos');
        if (chk) chk.checked = false;
        if (fila) fila.style.display = tieneFotos(p) ? 'block' : 'none';
    }
    var __abrirOriginal = function () { };

    function confirmarEliminarPlato() {
        var input = $('password-eliminar-plato'), error = $('error-password-eliminar');
        if (!input || input.value.trim().toUpperCase() !== 'BORRAR') {
            if (error) error.style.display = 'block';
            if (input) { input.value = ''; input.focus(); }
            return;
        }
        /* global datosLocales, platoEditandoId, renderizar */
        var idx = datosLocales.findIndex(function (x) { return x.id === platoEditandoId; });
        if (idx === -1) { window.cerrarModalEliminarPlato(); return; }
        var p = datosLocales[idx], chk = $('ew-borrar-fotos'), conFotos = tieneFotos(p), borrar = !!(chk && chk.checked);
        if (conFotos) fotosPendientes.push({ id: p.id, carpeta: p.carpeta, imagen: p.imagen, borrar: borrar });
        datosLocales.splice(idx, 1);
        window.hayCambiosSinGuardar = true;
        window.cerrarModalEliminarPlato();
        renderizar();
        alert('🗑️ Plato eliminado. Pulsa "GUARDAR CAMBIOS EN WEB" para que se borre también en la web.' +
            (conFotos ? '\nAl guardar, sus fotos se ' + (borrar ? 'borrarán.' : 'moverán a desactivadas/.') : ''));
    }

    async function retirarFotosPendientes() {
        if (!fotosPendientes.length || window.hayCambiosSinGuardar) return;
        var lote = fotosPendientes.splice(0);
        for (var i = 0; i < lote.length; i++) {
            var f = lote[i];
            // Si otro plato usa las mismas fotos, no se tocan.
            if (datosLocales.some(function (x) { return x.carpeta === f.carpeta && x.imagen === f.imagen; })) continue;
            try {
                var n = await window.SubirFoto.retirar(f, f.borrar);
                log('[Fotos] Plato ' + f.id + ': ' + n + ' foto(s) ' + (f.borrar ? 'borradas.' : 'movidas a desactivadas/.'));
            } catch (err) {
                alert('El plato ' + f.id + ' se ha borrado, pero sus fotos no se pudieron ' + (f.borrar ? 'borrar' : 'mover') + ': ' + (err.message || err));
            }
        }
    }

    function enganchar() {
        if (typeof window.abrirModalEliminarPlato === 'function' && !window.abrirModalEliminarPlato.__ew) {
            __abrirOriginal = window.abrirModalEliminarPlato;
            abrirModalEliminarPlato.__ew = true;
            window.abrirModalEliminarPlato = abrirModalEliminarPlato;
            window.confirmarEliminarPlato = confirmarEliminarPlato;
        }
        if (typeof window.enviarAlExcel === 'function' && !window.enviarAlExcel.__ew) {
            var guardar = window.enviarAlExcel;
            var envuelto = async function () {
                var r = await guardar.apply(this, arguments);
                retirarFotosPendientes();
                return r;
            };
            envuelto.__ew = true;
            window.enviarAlExcel = envuelto;
        }
        adaptarModalEliminar();
    }

    // ---------- 3) ¿Ya se ve en la web? ----------
    var URL_BASE_WEB = '../datos/base.json';
    var CADA = 10000, MAXIMO = 5 * 60000;
    var vigilados = {};          // id -> { h (null = borrado), nombre, ok }
    var ocultasEsperadas = null; // texto ordenado o null
    var temporizador = null, inicio = 0, publicadoConocido = null;

    function leerBase(texto) {
        var d = typeof texto === 'string' ? JSON.parse(texto) : texto, m = {};
        (d.platos || []).forEach(function (p) { m[String(p.id)] = p.h; });
        return { platos: m, ocultas: (d.ocultas || []).map(String).sort().join(',') };
    }
    async function baseWeb() {
        var r = await fetch(URL_BASE_WEB + '?zx=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return leerBase(await r.json());
    }
    function nombreDe(id) {
        try {
            var p = (window.datosLocales || datosLocales || []).find(function (x) { return String(x.id) === id; });
            var n = p ? ((window.desglosarNombre && window.desglosarNombre(p.es || '').nombre) || p.es) : '';
            return n || ('ID ' + id);
        } catch (e) { return 'ID ' + id; }
    }
    var escH = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

    function caja() {
        var c = $('ew-publicando');
        if (c) return c;
        c = document.createElement('div');
        c.id = 'ew-publicando';
        c.style.cssText = 'position:fixed; right:16px; bottom:16px; z-index:99999; max-width:340px; max-height:45vh; overflow:auto;' +
            'background:#fff; color:#1e293b; border:1px solid #cbd5e1; border-radius:10px; box-shadow:0 6px 24px rgba(0,0,0,.18);' +
            'font:13px/1.45 system-ui,sans-serif; padding:10px 12px;';
        document.body.appendChild(c);
        return c;
    }
    function pintar(estado) {
        var ids = Object.keys(vigilados), c = caja();
        var filas = ids.map(function (id) {
            var v = vigilados[id];
            return '<div>' + (v.ok ? '✔' : '⏳') + ' ' + escH(v.nombre) + (v.h === null ? ' <small>(borrado)</small>' : '') + '</div>';
        });
        if (ocultasEsperadas !== null) filas.push('<div>' + (ocultasEsperadas.ok ? '✔' : '⏳') + ' Pestañas / interruptores</div>');
        var titulo = estado === 'ok' ? '✔ Ya visible en la web' : estado === 'tarde'
            ? '⚠ Aún no se ve en la web. Espera un poco o pulsa otra vez "Guardar cambios en web".'
            : '⏳ Publicando en la web…';
        c.innerHTML = '<div style="display:flex; gap:8px; align-items:flex-start; margin-bottom:6px;"><b style="flex:1; color:' +
            (estado === 'ok' ? '#15803d' : estado === 'tarde' ? '#b45309' : '#334155') + ';">' + titulo + '</b>' +
            '<button type="button" id="ew-pub-cerrar" style="border:0; background:none; cursor:pointer; font-size:16px; line-height:1;">×</button></div>' + filas.join('');
        $('ew-pub-cerrar').onclick = function () { parar(); c.remove(); };
    }
    function parar() { clearTimeout(temporizador); temporizador = null; }
    function limpiar() { vigilados = {}; ocultasEsperadas = null; }

    async function comprobar() {
        temporizador = null;
        var web;
        try { web = await baseWeb(); } catch (e) { web = null; }
        if (web) {
            publicadoConocido = web;
            Object.keys(vigilados).forEach(function (id) {
                var v = vigilados[id];
                v.ok = v.h === null ? !(id in web.platos) : web.platos[id] === v.h;
            });
            if (ocultasEsperadas !== null) ocultasEsperadas.ok = web.ocultas === ocultasEsperadas.texto;
        }
        var todo = Object.keys(vigilados).every(function (id) { return vigilados[id].ok; }) && (ocultasEsperadas === null || ocultasEsperadas.ok);
        if (todo) {
            pintar('ok'); limpiar();
            setTimeout(function () { var c = $('ew-publicando'); if (c && !temporizador) c.remove(); }, 20000);
            return;
        }
        if (Date.now() - inicio > MAXIMO) { pintar('tarde'); limpiar(); return; }
        pintar('');
        temporizador = setTimeout(comprobar, CADA);
    }

    window.addEventListener('almacen-guardado', async function (ev) {
        var nuevo, antes;
        try { nuevo = leerBase(ev.detail.base); } catch (e) { return; }
        try { antes = ev.detail.antes ? leerBase(ev.detail.antes) : (publicadoConocido || await baseWeb()); } catch (e) { antes = null; }
        if (!antes) return;
        var hay = false;
        Object.keys(nuevo.platos).forEach(function (id) {
            if (antes.platos[id] !== nuevo.platos[id]) { vigilados[id] = { h: nuevo.platos[id], nombre: nombreDe(id), ok: false }; hay = true; }
        });
        Object.keys(antes.platos).forEach(function (id) {
            if (!(id in nuevo.platos)) { vigilados[id] = { h: null, nombre: (vigilados[id] && vigilados[id].nombre) || ('ID ' + id), ok: false }; hay = true; }
        });
        if (antes.ocultas !== nuevo.ocultas) { ocultasEsperadas = { texto: nuevo.ocultas, ok: false }; hay = true; }
        if (!hay) return;
        inicio = Date.now();
        pintar('');
        parar();
        temporizador = setTimeout(comprobar, CADA);
    });

    window.addEventListener('load', function () {
        enganchar();
        // La UI (módulos) se inicializa ~150 ms después de DOMContentLoaded.
        setTimeout(adaptarTraductor, 400);
        setTimeout(adaptarTraductor, 2000);
    });
})();
