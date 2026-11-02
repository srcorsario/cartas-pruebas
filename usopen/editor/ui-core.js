// =========================================
// REPOSITORIO: Web_Editor_Pro_v3 (PRINCIPAL)
// ARCHIVO: ui-core.js
// Infraestructura básica: log, carga/exportación de CSV y Google Sheets,
// importación de archivos locales, y el cableado de todos los botones
// (inicializarAjustesExpertos). Es la parte que menos suele cambiar de
// toda la interfaz.
// =========================================

import { stateContainer, procesoState, asegurarColumnasEstructura } from './ui-state.js';

// NUEVO: formatea un nº de bytes como "12.3 KB" / "1.4 MB" para los mensajes de progreso.
function formatearBytes(bytes) {
    if (!bytes || bytes <= 0) return "0 B";
    const unidades = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(unidades.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${unidades[i]}`;
}

export const UICore = {
    // NUEVO: 2º parámetro opcional { idProgreso } — si se indica y ya existe una línea previa
    // en la consola con ese mismo id, se ACTUALIZA esa línea en lugar de añadir una nueva. Así
    // una descarga que informa de su progreso muchas veces no llena la consola de líneas repetidas.
    log: (mensaje, opciones = {}) => {
        console.log(`[Editor Pro] ${mensaje}`);
        const statusCarga = document.getElementById('status-carga');
        if (statusCarga) statusCarga.innerText = mensaje;
        const consolaVisual = document.getElementById('consola');
        if (consolaVisual) {
            let div = opciones.idProgreso ? consolaVisual.querySelector(`[data-progreso-id="${opciones.idProgreso}"]`) : null;
            if (!div) {
                div = document.createElement('div');
                if (opciones.idProgreso) div.dataset.progresoId = opciones.idProgreso;
                consolaVisual.appendChild(div);
            }
            div.textContent = mensaje;
            consolaVisual.scrollTop = consolaVisual.scrollHeight;
        }
    },

    // NUEVO: copia todo el texto acumulado en la consola visual (#consola) al portapapeles,
    // línea por línea, tal cual se ve — útil para pegar el log completo al pedir ayuda con un error.
    copiarConsola: async (btnOrigen) => {
        const consolaVisual = document.getElementById('consola');
        if (!consolaVisual) return;
        const lineas = Array.from(consolaVisual.children).map(div => div.textContent);
        const texto = lineas.join('\n');
        if (!texto.trim()) {
            window.UI.log("[Info] La consola está vacía, no hay nada que copiar.");
            return;
        }

        const restaurarTextoBoton = (msg, delayMs) => {
            if (!btnOrigen) return;
            const original = btnOrigen.dataset.textoOriginal || btnOrigen.innerText;
            btnOrigen.dataset.textoOriginal = original;
            btnOrigen.innerText = msg;
            setTimeout(() => { btnOrigen.innerText = original; }, delayMs);
        };

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(texto);
            } else {
                // Fallback para contextos sin API de portapapeles disponible (p.ej. sin HTTPS).
                const textarea = document.createElement('textarea');
                textarea.value = texto;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            restaurarTextoBoton('✅ Copiado', 1500);
        } catch (e) {
            console.error('[Editor Pro] Error al copiar la consola:', e);
            restaurarTextoBoton('❌ Error al copiar', 2000);
        }
    },

    setLoadingState: (buttonId, isLoading, text = "Guardando...") => {
        const btn = document.getElementById(buttonId);
        if (!btn) return;
        btn.disabled = isLoading;
        btn.innerText = isLoading ? text : "Guardar";
    },

    actualizarListaKeys: (selectorElemento = '.select-keys') => {
        const selectEl = document.querySelector(selectorElemento) || document.getElementById('selectKeys');
        if (!selectEl) return;
        const keys = (typeof getKeys === 'function') ? getKeys() : [];
        if (keys.length === 0) { selectEl.innerHTML = '<option value="">No hay API Keys cargadas</option>'; selectEl.disabled = true; return; }
        selectEl.disabled = false;
        selectEl.innerHTML = keys.map((k, i) => {
            const resumida = k.length > 10 ? `${k.substring(0, 6)}...${k.substring(k.length - 4)}` : k;
            return `<option value="${k}">Key ${i + 1}: ${resumida}</option>`;
        }).join('');
    },

    cargarGoogleSheets: async (targetUrl, retryCount = 0) => {
        const DANGER_WINDOW_MS = 15000;
        const MAX_RETRIES = 5;
        if (!targetUrl) return window.UI.log("[Error] No se proporcionó una URL válida.");
        const timeSinceSave = Date.now() - (window.lastSaveAttempt || 0);
        if (timeSinceSave < DANGER_WINDOW_MS && retryCount < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 300));
            return window.UI.cargarGoogleSheets(targetUrl, retryCount + 1);
        }
        const ID_PROGRESO = 'descarga-csv';
        window.UI.log(`[Info] Descargando CSV...`, { idProgreso: ID_PROGRESO });
        try {
            // OJO: no añadir cabeceras manuales aquí (Cache-Control/Pragma). No son cabeceras
            // "simples" para CORS, así que el navegador lanza antes una petición OPTIONS
            // (preflight); ni el Web App de Apps Script ni el CSV publicado de Google Sheets
            // la responden correctamente, y el navegador bloquea la petición real por CORS.
            // El "no-store" de abajo ya evita la caché del navegador, y "&zx=" ya rompe
            // cualquier caché intermedia — no hace falta nada más para forzar datos frescos.
            const resp = await fetch(targetUrl + '&zx=' + Date.now(), { cache: "no-store" });
            if (!resp.ok) throw new Error("Error HTTP " + resp.status);

            // NUEVO: en vez de esperar a resp.text() (que no informa de nada hasta tenerlo
            // todo), se lee el cuerpo por partes con un stream para poder mostrar el % ya
            // descargado. El nº total de bytes (Content-Length) solo es fiable si el servidor
            // NO comprimió la respuesta (gzip/br) — con compresión, esa cabecera es el tamaño
            // comprimido y no cuadra con los bytes ya descomprimidos que vamos recibiendo, así
            // que en ese caso (o si el navegador no soporta streaming) se muestra el nº de bytes
            // recibidos sin porcentaje, en vez de un % que podría ser incorrecto.
            const contentEncoding = resp.headers.get('content-encoding');
            const contentLengthHeader = resp.headers.get('content-length');
            const totalBytes = (!contentEncoding && contentLengthHeader) ? parseInt(contentLengthHeader, 10) : 0;

            let text;
            if (resp.body && typeof resp.body.getReader === 'function' && typeof TextDecoder !== 'undefined') {
                const lector = resp.body.getReader();
                const decodificador = new TextDecoder('utf-8');
                let recibidos = 0;
                let trozos = '';
                let ultimaActualizacion = 0;
                while (true) {
                    const { done, value } = await lector.read();
                    if (done) break;
                    recibidos += value.length;
                    trozos += decodificador.decode(value, { stream: true });
                    const ahora = Date.now();
                    if (ahora - ultimaActualizacion > 150) { // limita la frecuencia de refresco del log
                        ultimaActualizacion = ahora;
                        const mensajeProgreso = totalBytes > 0
                            ? `[Info] Descargando CSV... ${Math.min(100, Math.round((recibidos / totalBytes) * 100))}% (${formatearBytes(recibidos)} / ${formatearBytes(totalBytes)})`
                            : `[Info] Descargando CSV... ${formatearBytes(recibidos)} recibidos (tamaño total no disponible)`;
                        window.UI.log(mensajeProgreso, { idProgreso: ID_PROGRESO });
                    }
                }
                trozos += decodificador.decode(); // vacía cualquier resto pendiente del decodificador
                text = trozos;
                window.UI.log(`[Info] Descarga completada (${formatearBytes(recibidos)}). Procesando CSV...`, { idProgreso: ID_PROGRESO });
            } else {
                // Fallback para navegadores sin soporte de streaming: sin progreso, pero sigue funcionando.
                text = await resp.text();
            }

            if (window.Papa) {
                window.Papa.parse(text, { skipEmptyLines: true, complete: (resultado) => {
                    if (resultado.data && resultado.data.length > 0) {
                        stateContainer.headers = resultado.data[0];
                        stateContainer.csvData = resultado.data.slice(1);
                        asegurarColumnasEstructura(stateContainer);
                        window.UI.log(`[OK] CSV cargado y columnas aseguradas. Filas: ${stateContainer.csvData.length}`);
                        window.UI.actualizarTextoBotonSync();
                        window.UI.actualizarRangoFinAuto();
                        window.UI.renderTable();
                    }
                } });
            } else {
                const lineas = text.split(/\r?\n/).filter(line => line.trim() !== "");
                if (lineas.length > 0) {
                    stateContainer.headers = lineas[0].split(",").map(h => h.replace(/^"|"$/g, '').trim());
                    stateContainer.csvData = lineas.slice(1).map(f => f.split(",").map(v => v.replace(/^"|"$/g, '').trim()));
                    asegurarColumnasEstructura(stateContainer);
                    window.UI.log(`[OK] CSV cargado (Fallback) y columnas aseguradas.`);
                    window.UI.actualizarTextoBotonSync();
                    window.UI.actualizarRangoFinAuto();
                    window.UI.renderTable();
                }
            }
        } catch (e) { window.UI.log("[Error] Fallo al descargar CSV: " + e.message); }
    },

    // NUEVO: el campo "Hasta" del rango de filas ya no se queda fijo en el
    // valor de partida (9999) — tras cada carga real de datos (Google Sheet,
    // CSV local, o importación) se actualiza a la última fila que realmente
    // tiene datos, para que el rango mostrado refleje el documento cargado.
    actualizarRangoFinAuto: () => {
        const selectorFin = document.getElementById('rangoFin');
        if (!selectorFin || !stateContainer.csvData) return;
        selectorFin.value = stateContainer.csvData.length + 1; // fila 1 = cabecera, datos empiezan en la fila 2
    },

    actualizarTextoBotonSync: () => {
        const btn = document.getElementById('btnSyncSheets');
        if (!btn) return;
        const contexto = stateContainer.currentProMode || 'restaurante001';
        const alias = (typeof getModoAlias === 'function') ? getModoAlias(contexto) : contexto;
        btn.innerText = `☁️ Sincronizar con Google Sheet ${alias}`;
    },

    sincronizarConGoogleSheets: async () => {
        if (stateContainer.headers.length === 0 || stateContainer.csvData.length === 0) return window.UI.log("[Error] No hay datos en memoria.");
        const modo = stateContainer.currentProMode;
        const contextoNombre = (typeof getModoAlias === 'function') ? getModoAlias(modo) : modo;
        window.UI.log(`[Sincro] Preparando envío a: ${contextoNombre}...`);

        const findExactIdx = (name) => stateContainer.headers.findIndex(h => h && h.toUpperCase() === name.toUpperCase());

        const idxId = findExactIdx('ID');
        const idxPrecio = findExactIdx('PRECIO');
        const idxActiva = findExactIdx('ACTIVA');
        const idxCarpeta = findExactIdx('CARPETA');
        const idxImagen = findExactIdx('ARCHIVO_FOTO');
        const idxAlergenos = findExactIdx('ALERGENOS_COD');
        const idxOpcionesInactivas = findExactIdx('OPCIONES_INACTIVAS');

        if (idxId === -1) return window.UI.log("[Error Crítico] No se encuentra la columna 'ID'.");

        const totalColumnasEsperadas = stateContainer.headers.length;
        const payload = stateContainer.csvData.map(row => {
            while (row.length < totalColumnasEsperadas) row.push("");

            let valActiva = "si";
            if (idxActiva !== -1 && row[idxActiva] !== undefined && row[idxActiva] !== null) {
                let rawVal = String(row[idxActiva]).trim().toLowerCase();
                if (rawVal === "no" || rawVal === "false" || rawVal === "0") {
                    valActiva = "no";
                } else if (rawVal === "si" || rawVal === "sí" || rawVal === "true" || rawVal === "1") {
                    valActiva = "si";
                } else if (rawVal !== "") {
                    valActiva = rawVal;
                } else {
                    valActiva = "no";
                }
            }

            let obj = {
                id: parseInt(row[idxId]),
                precio: idxPrecio !== -1 ? (row[idxPrecio] || "0.00") : "0.00",
                activa: valActiva,
                carpeta: idxCarpeta !== -1 ? (row[idxCarpeta] || "") : "",
                archivo_foto: idxImagen !== -1 ? (row[idxImagen] || "") : "",
                alergenos_cod: idxAlergenos !== -1 ? (row[idxAlergenos] || "") : "",
                opciones_inactivas: idxOpcionesInactivas !== -1 ? (row[idxOpcionesInactivas] || "") : ""
            };

            stateContainer.headers.forEach((h, i) => {
                if (!h) return;
                const hUpper = h.trim().toUpperCase();
                if (hUpper.startsWith("NOMBRE_")) {
                    let langKey = hUpper.replace("NOMBRE_", "").toLowerCase();
                    obj[`nombre_${langKey}`] = row[i] || "";
                } else if (hUpper.startsWith("INFO_")) {
                    let langKey = hUpper.replace("INFO_", "").toLowerCase();
                    obj[`info_${langKey}`] = row[i] || "";
                }
            });
            return obj;
        }).filter(x => !isNaN(x.id) && x.id > 0);

        if (payload.length === 0) return window.UI.log("[Error] La compilación no generó filas válidas.");
        window.UI.log(`[Sincro] Enviando ${payload.length} filas a ${contextoNombre}...`);
        try {
            let urlDestino = window.getWebAppUrl ? window.getWebAppUrl(modo) : '';
            if (!urlDestino) return window.UI.log(`[Error Crítico] getWebAppUrl() no devolvió URL para '${modo}'.`);
            window.lastSaveAttempt = Date.now();
            const response = await fetch(urlDestino, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (response.type === 'opaque') window.UI.log(`⚠️ [Sincro] Modo 'no-cors'. Petición enviada a ${contextoNombre}.`);
            else window.UI.log(`✅ [Sincro] ¡Éxito hacia ${contextoNombre}!`);
        } catch (e) { window.UI.log(`❌ [Sincro] Error de red en ${contextoNombre}: ` + e.message); }
    },

    inicializarAjustesExpertos: () => {
        window.APP_VERSIONS.css = window.APP_VERSIONS.css || '1.0.6';
        const btnExportar = document.getElementById('saveCsvBtn');
        if (btnExportar) btnExportar.onclick = () => { if (stateContainer.headers && stateContainer.csvData) window.UI.exportarCSV(stateContainer.headers, stateContainer.csvData); else window.UI.log("[Error] Sin datos para exportar."); };

        const btnSyncSheets = document.getElementById('btnSyncSheets');
        if (btnSyncSheets) btnSyncSheets.onclick = () => window.UI.sincronizarConGoogleSheets();

        const loadSheetsBtnRG = document.getElementById('loadSheetsBtnRG');
        const inputRG = document.getElementById('sheetsUrlRG');
        if (loadSheetsBtnRG && inputRG) {
            loadSheetsBtnRG.onclick = () => {
                const url = inputRG.value.trim();
                if (url) { stateContainer.currentProMode = 'restaurante001'; window.currentMode = 'restaurante001'; window.UI.cargarGoogleSheets(url); }
                else window.UI.log("[Error] La URL para RG está vacía.");
            };
        }

        const loadSheetsBtnUSOpen = document.getElementById('loadSheetsBtnUSOpen');
        const inputUSOpen = document.getElementById('sheetsUrlUSOpen');
        if (loadSheetsBtnUSOpen && inputUSOpen) {
            loadSheetsBtnUSOpen.onclick = () => {
                const url = inputUSOpen.value.trim();
                if (url) { stateContainer.currentProMode = 'restaurante002'; window.currentMode = 'restaurante002'; window.UI.cargarGoogleSheets(url); }
                else window.UI.log("[Error] La URL para USOPEN está vacía.");
            };
        }

        const inputImportar = document.getElementById('archivoLocal');
        if (inputImportar) {
            inputImportar.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    window.UI.tempImportFile = file;
                    const modal = document.getElementById('modal-seleccionar-destino');
                    if (modal) modal.style.display = 'block';
                }
            };
        }

        const btnIniciar = document.getElementById('btnIniciar');
        if (btnIniciar) btnIniciar.onclick = () => window.UI.iniciarTraduccionPorLotes(stateContainer);
        const btnIniciarNombres = document.getElementById('btnIniciarNombres');
        if (btnIniciarNombres) btnIniciarNombres.onclick = () => window.UI.iniciarTraduccionNombresPorLotes(stateContainer);
        const btnIniciarInfoOtros = document.getElementById('btnIniciarInfoOtros');
        if (btnIniciarInfoOtros) btnIniciarInfoOtros.onclick = () => window.UI.iniciarInfoOtrosIdiomasPorLotes(stateContainer);
        const btnRevisarConsistencia = document.getElementById('btnRevisarConsistencia');
        if (btnRevisarConsistencia) btnRevisarConsistencia.onclick = () => window.UI.revisarConsistencia(stateContainer);
        const btnAuditarAlergenos = document.getElementById('btnAuditarAlergenos');
        if (btnAuditarAlergenos) btnAuditarAlergenos.onclick = () => window.UI.auditarAlergenos(stateContainer);
        const btnAuditarSeparadores = document.getElementById('btnAuditarSeparadores');
        if (btnAuditarSeparadores) btnAuditarSeparadores.onclick = () => window.UI.auditarSeparadores(stateContainer);
        const btnPausa = document.getElementById('btnPausa');
        if (btnPausa) btnPausa.onclick = () => { procesoState.pausado = !procesoState.pausado; btnPausa.innerText = procesoState.pausado ? "REANUDAR" : "PAUSAR"; window.UI.log(procesoState.pausado ? "[Info] Pausado." : "[Info] Reanudando..."); };
        const btnCancelar = document.getElementById('btnCancelar');
        if (btnCancelar) btnCancelar.onclick = () => { procesoState.detenido = true; window.UI.log("[Info] Deteniendo bucle..."); };

        const btnCopiarConsola = document.getElementById('btnCopiarConsola');
        if (btnCopiarConsola) btnCopiarConsola.onclick = () => window.UI.copiarConsola(btnCopiarConsola);

        const btnQaRefrescar = document.getElementById('qa-refrescar');
        if (btnQaRefrescar) btnQaRefrescar.onclick = () => window.UI.renderQA();
        const inputQaFiltro = document.getElementById('qa-filtro');
        if (inputQaFiltro) inputQaFiltro.oninput = () => window.UI.renderQA();
        const checkQaSoloConDatos = document.getElementById('qa-solo-con-datos');
        if (checkQaSoloConDatos) checkQaSoloConDatos.onchange = () => window.UI.renderQA();
    },

    confirmarImportacion: (mode) => {
        const file = window.UI.tempImportFile;
        if (!file) return window.UI.log("[Error] No se encontró el archivo temporal.");
        const modoDefinitivo = (mode === 'RG') ? 'restaurante001' : (mode === 'USOPEN') ? 'restaurante002' : mode;
        stateContainer.currentProMode = modoDefinitivo;
        window.currentMode = modoDefinitivo;
        const alias = (typeof getModoAlias === 'function') ? getModoAlias(modoDefinitivo) : modoDefinitivo;
        window.UI.log(`[Import] Destino asignado: ${alias}`);
        window.UI.importarCSV(file, (headers, data) => {
            stateContainer.headers = headers; stateContainer.csvData = data;
            asegurarColumnasEstructura(stateContainer);
            window.UI.log(`[OK] Archivo cargado y columnas aseguradas. Filas: ${data.length}`);
            window.UI.actualizarTextoBotonSync();
            window.UI.actualizarRangoFinAuto();
            window.UI.renderTable();
        });
        window.UI.cancelarImportacion();
    },

    cancelarImportacion: () => {
        const modal = document.getElementById('modal-seleccionar-destino');
        if (modal) modal.style.display = 'none';
        const input = document.getElementById('archivoLocal');
        if (input) input.value = '';
        if (window.UI) window.UI.tempImportFile = null;
    },

    exportarCSV: (headers, csvData) => {
        try {
            let resultadoTexto = "";
            if (window.Papa) resultadoTexto = window.Papa.unparse([headers, ...csvData]);
            else resultadoTexto = [headers, ...csvData].map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
            const blob = new Blob([resultadoTexto], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = 'exportacion_expertos_final.csv'; link.click();
            window.UI.log("[OK] CSV descargado.");
        } catch (err) { window.UI.log(`[Error Exportar] ${err.message}`); }
    },

    importarCSV: (file, callback) => {
        const lector = new FileReader();
        lector.onload = (e) => {
            const contenidoCrudo = e.target.result;
            try {
                if (window.Papa) { window.Papa.parse(contenidoCrudo, { skipEmptyLines: true, complete: (resultado) => { if (resultado.data && resultado.data.length > 0) callback(resultado.data[0], resultado.data.slice(1)); } }); }
                else { const lineas = contenidoCrudo.split(/\r?\n/).filter(line => line.trim() !== ""); if (lineas.length > 0) callback(lineas[0].split(",").map(h => h.replace(/^"|"$/g, '').trim()), lineas.slice(1).map(f => f.split(",").map(v => v.replace(/^"|"$/g, '').trim()))); }
            } catch (err) { window.UI.log(`[Error Importar] ${err.message}`); }
        };
        lector.readAsText(file);
    }
};
