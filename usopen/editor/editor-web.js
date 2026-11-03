// =========================================================================================
// editor-web.js — ajustes del editor cuando va DENTRO de la web (<web>/editor/), comunes a
// todos los editores (v3 y clubhouse). Lo inserta construir.ps1. No toca el editor oficial.
//   1) Traductor Pro (pestaña 3): la carta viene de la web (datos.json en GitHub) o de un
//      archivo local (datos.json o CSV); se guarda en la web; se descarga datos.json o CSV.
//   2) Eliminar plato: sin contraseña fija (ya hay login); se confirma escribiendo BORRAR.
//      Si el plato tiene fotos, casilla "Borrar también sus fotos": desmarcada = se mueven a
//      imagenes/<carpeta>/desactivadas/. Las fotos se tocan DESPUÉS de "Guardar cambios en web".
// =========================================================================================
(function () {
    'use strict';
    var S = window.EDITOR_SITIO;
    if (!S) return;
    window.APP_VERSIONS = window.APP_VERSIONS || {};
    window.APP_VERSIONS.editorWeb = '1.0.0';

    var $ = function (id) { return document.getElementById(id); };
    var log = function (t) { try { if (window.UI && window.UI.log) window.UI.log(t); } catch (e) { } console.log(t); };

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
            var a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([texto], { type: 'application/json;charset=utf-8' }));
            a.download = 'datos-' + S.restaurante + '-' + new Date().toISOString().slice(0, 10) + '.json';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
            log('[OK] datos.json descargado (no se ha guardado nada en la web).');
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

    window.addEventListener('load', function () {
        enganchar();
        // La UI (módulos) se inicializa ~150 ms después de DOMContentLoaded.
        setTimeout(adaptarTraductor, 400);
        setTimeout(adaptarTraductor, 2000);
    });
})();
