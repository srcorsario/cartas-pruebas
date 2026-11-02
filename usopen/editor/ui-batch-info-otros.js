// =========================================
// REPOSITORIO: Web_Editor_Pro_v3 (PRINCIPAL)
// ARCHIVO: ui-batch-info-otros.js
// FASE 3: Traducción por lotes de INFO_ES (descripción + preguntas/
// respuestas ya generadas) al resto de idiomas configurados (todos menos
// ES y EN, que ya se generan en la Fase 1), vía Gemini.
// Botón: "Generar Info Platos Otros Idiomas".
// A diferencia de la Fase 1 (ui-batch-info.js), esto NO redacta contenido
// nuevo: traduce fielmente el JSON de INFO_ES que ya exista en cada fila.
// =========================================

import { stateContainer, procesoState, asegurarColumnasEstructura } from './ui-state.js';

export const UIBatchInfoOtros = {
    iniciarInfoOtrosIdiomasPorLotes: async (stateContainerParam) => {
        procesoState.detenido = false; procesoState.pausado = false;
        const listaClavesAPI = (typeof getKeys === 'function') ? getKeys() : [];
        if (listaClavesAPI.length === 0) return window.UI.log("[Error] Introduzca al menos una API Key.");
        const activeStateContainer = stateContainerParam || stateContainer;
        if (!activeStateContainer || !activeStateContainer.headers || !activeStateContainer.csvData) return window.UI.log("[Error] Estructura de datos vacía.");

        window.UI.log("[Info] Asegurando estructura de columnas en memoria...");
        asegurarColumnasEstructura(activeStateContainer);

        const selectorInicio = document.getElementById('rangoInicio');
        const selectorFin = document.getElementById('rangoFin');
        const rangoInicio = selectorInicio ? (parseInt(selectorInicio.value) - 2 || 0) : 0;
        const rangoFin = selectorFin ? (parseInt(selectorFin.value) - 1 || activeStateContainer.csvData.length) : activeStateContainer.csvData.length;

        const idiomasBase = (window.IDIOMAS_ORDEN && window.IDIOMAS_ORDEN.length) ? window.IDIOMAS_ORDEN : Object.keys(window.IDIOMAS_CONFIG || {}).map(l => l.toLowerCase());
        // Fase 3: todos los idiomas configurados EXCEPTO es/en (esos ya salen de la Fase 1, "Generar Info Platos ES/EN").
        const idiomasObjetivo = idiomasBase.filter(l => l !== 'es' && l !== 'en');

        const indiceCastellanoBase = activeStateContainer.headers.findIndex(h => h && h.toUpperCase() === 'NOMBRE_ES');
        const indiceInfoEs = activeStateContainer.headers.findIndex(h => h && h.toUpperCase() === 'INFO_ES');
        // NUEVO: se necesita también INFO_EN como referencia, para que la terminología ambigua
        // (ej. "ternera" -> veal/beef) se resuelva con el MISMO criterio en todos los idiomas,
        // en vez de que cada idioma la traduzca de forma independiente solo desde el español.
        const indiceInfoEn = activeStateContainer.headers.findIndex(h => h && h.toUpperCase() === 'INFO_EN');
        const indiceId = activeStateContainer.headers.findIndex(h => h && h.toUpperCase() === 'ID');
        const indiceCarpeta = activeStateContainer.headers.findIndex(h => h && h.toUpperCase() === 'CARPETA');

        if (indiceCastellanoBase === -1 || indiceInfoEs === -1) {
            return window.UI.log("[Error Crítico] Faltan columnas base obligatorias (NOMBRE_ES o INFO_ES). Genera antes la Info ES/EN con el botón correspondiente.");
        }

        if (idiomasObjetivo.length === 0) {
            return window.UI.log("[Info] No hay idiomas adicionales configurados aparte de ES/EN. Nada que hacer.");
        }

        // Índice de la columna INFO_<idioma> de cada idioma objetivo.
        const indicesObjetivo = {};
        idiomasObjetivo.forEach(l => {
            indicesObjetivo[l] = activeStateContainer.headers.findIndex(h => h && h.toUpperCase() === `INFO_${l.toUpperCase()}`);
        });

        const techoLimiteEvaluacion = Math.min(rangoFin, activeStateContainer.csvData.length);
        const CARPETAS_SIN_IA = ['cafe', 'refrescos', 'cerveza'];
        // NUEVO: lote propio (por defecto 1), NO el mismo que Fase 1 — aquí cada plato ya implica
        // traducir su ficha a 24 idiomas de golpe, así que agrupar varios platos dispara el tamaño
        // de la respuesta y puede truncarla antes de completar el JSON.
        const TAMANO_LOTE = (typeof window.INFO_OTROS_IDIOMAS_TAMANO_LOTE === 'number' && window.INFO_OTROS_IDIOMAS_TAMANO_LOTE > 0) ? window.INFO_OTROS_IDIOMAS_TAMANO_LOTE : 1;

        // Construir la lista de filas a las que les falta INFO_<idioma> de al menos un idioma objetivo,
        // siempre que ya tengan INFO_ES generado (de donde se traduce).
        const filasPendientes = [];
        for (let i = Math.max(0, rangoInicio); i < techoLimiteEvaluacion; i++) {
            const row = activeStateContainer.csvData[i];
            while (row.length < activeStateContainer.headers.length) row.push("");

            const idValor = indiceId !== -1 ? parseInt(row[indiceId]) : NaN;
            const carpetaValor = indiceCarpeta !== -1 ? (row[indiceCarpeta] || "").trim().toLowerCase() : "";
            const esCabeceraCategoria = !isNaN(idValor) && idValor >= 1 && idValor <= 12;
            const esBebidaSimple = CARPETAS_SIN_IA.includes(carpetaValor);
            if (esCabeceraCategoria || esBebidaSimple) continue;

            const infoEsActual = (row[indiceInfoEs] || "").trim();
            if (!infoEsActual) continue; // sin INFO_ES generado todavía, no hay nada que traducir

            const faltaAlgunIdioma = idiomasObjetivo.some(l => indicesObjetivo[l] !== -1 && !(row[indicesObjetivo[l]] || "").trim());
            if (faltaAlgunIdioma) filasPendientes.push(i);
        }

        // NUEVO: nº de peticiones en paralelo (una key por petición) en vez de una petición a la
        // vez con las demás keys de reserva solo para el 429. Cada "trabajador" es dueño de una
        // key propia; si esa key concreta da 429, el trabajador rota a la siguiente key libre.
        // clavesEnCooldown = keys que acaban de dar 429 en SU ÚLTIMO uso (se limpia una key en
        // cuanto vuelve a tener éxito). Si en un momento dado TODAS las keys están en cooldown a
        // la vez, se asume cuota agotada de verdad y se para todo (igual que antes, pero evaluado
        // de forma global entre trabajadores en vez de "dentro de un único lote").
        const CONCURRENCIA = Math.max(1, Math.min(
            listaClavesAPI.length,
            (typeof window.INFO_OTROS_IDIOMAS_CONCURRENCIA === 'number' && window.INFO_OTROS_IDIOMAS_CONCURRENCIA > 0) ? window.INFO_OTROS_IDIOMAS_CONCURRENCIA : listaClavesAPI.length
        ));
        window.UI.log(`[Paso 3] Traduciendo Info (descripción + preguntas/respuestas) al resto de idiomas (${idiomasObjetivo.length} idiomas) en bloques de ${TAMANO_LOTE}, con ${CONCURRENCIA} petición(es) en paralelo. Platos/vinos pendientes: ${filasPendientes.length}.`);

        let completados = 0, cuotaAgotada = false, lotesCompletados = 0;
        const duracionesLote = []; // duración (s) de cada lote completado en ESTA tanda, para estimar lo que falta
        const clavesEnCooldown = new Set(); // índices de keys que dieron 429 la última vez que se usaron

        // Trocear filasPendientes en lotes de TAMANO_LOTE (igual que antes), pero ahora como una
        // cola compartida de la que van tirando los trabajadores en paralelo.
        const loteChunks = [];
        for (let lote = 0; lote < filasPendientes.length; lote += TAMANO_LOTE) {
            loteChunks.push(filasPendientes.slice(lote, lote + TAMANO_LOTE));
        }
        const totalLotes = loteChunks.length;
        let siguienteIndiceLote = 0; // "puntero" a la cola; siguienteIndiceLote++ es atómico en JS (sin await de por medio)

        const trabajador = async (idTrabajador) => {
            let miKeyIndex = idTrabajador % listaClavesAPI.length; // key inicial propia de este trabajador
            while (true) {
                if (procesoState.detenido || cuotaAgotada) return;
                while (procesoState.pausado) await new Promise(resolve => setTimeout(resolve, 500));
                if (procesoState.detenido || cuotaAgotada) return;

                const miIndiceLote = siguienteIndiceLote++; // reserva el siguiente lote de la cola
                if (miIndiceLote >= loteChunks.length) return; // cola vacía: este trabajador termina

                const inicioLote = Date.now();
                const numeroLote = miIndiceLote + 1;
                const indicesLote = loteChunks[miIndiceLote];
                window.UI.log(`[Lote ${numeroLote}/${totalLotes}] Procesando filas ${indicesLote.map(i => i + 2).join(', ')}...`);

                // Preparar los datos de cada elemento del lote (sin llamar aún a la IA)
                const itemsLote = indicesLote.map(i => {
                    const row = activeStateContainer.csvData[i];
                    const carpetaValor = indiceCarpeta !== -1 ? (row[indiceCarpeta] || "").trim().toLowerCase() : "";
                    const esVino = carpetaValor === 'vinos';
                    let infoEs = null;
                    try { infoEs = JSON.parse(row[indiceInfoEs]); } catch (e) { infoEs = null; }
                    let infoEn = null;
                    if (indiceInfoEn !== -1) {
                        try { infoEn = JSON.parse(row[indiceInfoEn]); } catch (e) { infoEn = null; }
                    }
                    return { fila: i, row, esVino, infoEs, infoEn };
                }).filter(it => it.infoEs);

                if (itemsLote.length === 0) { lotesCompletados++; continue; }

                const promptTraduccion = window.PROMPTS.infoOtrosIdiomasLote(itemsLote, idiomasObjetivo.map(l => l.toUpperCase()));

                let satisfecho = false;
                let intentosLote = 0;
                const maxIntentosLote = Math.max(3, listaClavesAPI.length * 2);

                while (!satisfecho && !procesoState.detenido && intentosLote < maxIntentosLote) {
                    // Si mi key actual está en cooldown, busco la siguiente que no lo esté.
                    let vueltas = 0;
                    while (clavesEnCooldown.has(miKeyIndex) && vueltas < listaClavesAPI.length) {
                        miKeyIndex = (miKeyIndex + 1) % listaClavesAPI.length;
                        vueltas++;
                    }
                    if (clavesEnCooldown.size >= listaClavesAPI.length) {
                        window.UI.log(`[Error Crítico] Cuota de Gemini agotada en TODAS las keys disponibles (${listaClavesAPI.length}). Deteniendo el proceso para no malgastar más peticiones.`);
                        cuotaAgotada = true;
                        return;
                    }

                    try {
                        // NUEVO: visibilidad de qué key se usa en CADA petición, no solo al rotar por error.
                        window.UI.log(`[Info] Usando Key ${miKeyIndex + 1}/${listaClavesAPI.length} (fila(s) ${itemsLote.map(it => it.fila + 2).join(', ')})...`);
                        const callResponse = await fetch(`${window.GEMINI_ENDPOINT_URL_INFO_OTROS || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent'}?key=${listaClavesAPI[miKeyIndex]}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: promptTraduccion }] }], generationConfig: { maxOutputTokens: window.GEMINI_MAX_OUTPUT_TOKENS || 65536, thinkingConfig: { thinkingLevel: window.GEMINI_THINKING_LEVEL || "medium" } } }) });

                        const textResponse = await callResponse.text();
                        let respuestaJsonData;
                        try {
                            respuestaJsonData = JSON.parse(textResponse);
                        } catch (e) {
                            throw new Error("La API devolvió HTML o texto plano (Posible 403 o error de cuota).");
                        }

                        if (respuestaJsonData.error) {
                            if (respuestaJsonData.error.code === 429) {
                                clavesEnCooldown.add(miKeyIndex);
                                const keyAnterior = miKeyIndex;
                                miKeyIndex = (miKeyIndex + 1) % listaClavesAPI.length;
                                window.UI.log(`[Aviso] Límite superado en el lote (filas ${itemsLote.map(it => it.fila + 2).join(', ')}, Key ${keyAnterior + 1}). Rotando Key (${clavesEnCooldown.size}/${listaClavesAPI.length} en cooldown)...`);
                                await new Promise(r => setTimeout(r, 4000));
                                intentosLote++;
                                continue;
                            }
                            // NUEVO: cualquier otro error explícito de la API (400/403/500...) se muestra
                            // tal cual en vez de caer en el genérico "La API no devolvió contenido" — el
                            // mensaje de error de Gemini suele decir exactamente qué está mal (payload
                            // demasiado grande, clave inválida, modelo no encontrado, etc.).
                            throw new Error(`Error de la API (código ${respuestaJsonData.error.code || '?'}): ${respuestaJsonData.error.message || 'sin mensaje'}`);
                        }

                        // NUEVO: si Gemini bloqueó la respuesta por su filtro de seguridad, esto viene en
                        // promptFeedback (candidates puede venir vacío o ausente del todo en ese caso) —
                        // lo detectamos explícitamente en vez de que caiga en el genérico "sin contenido".
                        const blockReason = respuestaJsonData.promptFeedback?.blockReason;
                        if (blockReason) {
                            throw new Error(`Gemini bloqueó la respuesta por su filtro de seguridad (blockReason: ${blockReason}). Puede haber un término en este plato que lo dispare — revísalo o repórtalo si parece un falso positivo.`);
                        }

                        const finishReason = respuestaJsonData.candidates?.[0]?.finishReason;
                        const safetyRatings = respuestaJsonData.candidates?.[0]?.safetyRatings;
                        const textoLimpioIA = (typeof window.extraerTextoCompletoRespuesta === 'function') ? window.extraerTextoCompletoRespuesta(respuestaJsonData.candidates?.[0]) : respuestaJsonData.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (!textoLimpioIA) {
                            const detalleSeguridad = (safetyRatings && safetyRatings.length) ? ` | safetyRatings: ${JSON.stringify(safetyRatings)}` : '';
                            const numCandidatos = Array.isArray(respuestaJsonData.candidates) ? respuestaJsonData.candidates.length : 0;
                            throw new Error(`La API no devolvió contenido (finishReason: ${finishReason || 'desconocido'}, nº candidatos: ${numCandidatos})${detalleSeguridad}.`);
                        }

                        let traduccionesLote;
                        try {
                            traduccionesLote = (typeof window.extraerJSON === 'function')
                                ? window.extraerJSON(textoLimpioIA)
                                : JSON.parse(textoLimpioIA.replace(/```json/g, '').replace(/```/g, '').trim());
                        } catch (parseErr) {
                            // NUEVO: si el JSON no se puede extraer, mostramos un fragmento real de lo que
                            // devolvió Gemini (inicio y final) y el finishReason, para poder diagnosticar
                            // a la primera si vuelve a pasar (truncado, bloqueado por seguridad, etc.)
                            // en vez de solo saber que "no se encontró JSON válido".
                            const inicio = textoLimpioIA.slice(0, 200);
                            const final = textoLimpioIA.slice(-200);
                            throw new Error(`${parseErr.message} | finishReason: ${finishReason || 'desconocido'} | longitud respuesta: ${textoLimpioIA.length} caracteres | inicio: "${inicio}" | final: "${final}"`);
                        }

                        itemsLote.forEach((it, idx) => {
                            const traducciones = traduccionesLote[String(idx)] || traduccionesLote[idx];
                            if (!traducciones) return;
                            let algunoAplicado = false;
                            idiomasObjetivo.forEach(l => {
                                if (indicesObjetivo[l] === -1) return;
                                if ((it.row[indicesObjetivo[l]] || "").trim()) return; // ya tenía valor: no lo tocamos
                                const lUpper = l.toUpperCase();
                                const valorTraducido = traducciones[lUpper] || traducciones[l];
                                if (!valorTraducido) return;
                                it.row[indicesObjetivo[l]] = JSON.stringify(valorTraducido);
                                algunoAplicado = true;
                            });
                            if (algunoAplicado) completados++;
                        });
                        satisfecho = true;
                        clavesEnCooldown.delete(miKeyIndex); // esta key acaba de responder bien
                        // NUEVO: cuánto ha tardado este lote + estimación de lo que queda (dividida entre
                        // la concurrencia, porque ahora varios lotes avanzan reloj-en-mano a la vez).
                        const duracionLoteSeg = (Date.now() - inicioLote) / 1000;
                        duracionesLote.push(duracionLoteSeg);
                        const mediaSeg = duracionesLote.reduce((a, b) => a + b, 0) / duracionesLote.length;
                        lotesCompletados++;
                        const lotesRestantes = totalLotes - lotesCompletados;
                        const fmt = (typeof window.formatearDuracion === 'function') ? window.formatearDuracion : (s => `${Math.round(s)}s`);
                        window.UI.log(`[Tiempo] Lote ${numeroLote}/${totalLotes} completado en ${fmt(duracionLoteSeg)} (media: ${fmt(mediaSeg)}/lote, ${lotesCompletados}/${totalLotes} hechos). Estimado restante: ~${fmt((mediaSeg * lotesRestantes) / CONCURRENCIA)} (${lotesRestantes} lote(s), ${CONCURRENCIA} en paralelo).`);
                    } catch (err) {
                        window.UI.log(`[Error Info Otros Idiomas] Lote (filas ${itemsLote.map(it => it.fila + 2).join(', ')}): ${err.message}`);
                        await new Promise(r => setTimeout(r, 3000));
                        miKeyIndex = (miKeyIndex + 1) % listaClavesAPI.length;
                        intentosLote++;
                    }
                }

                if (cuotaAgotada) return;
                if (!satisfecho) lotesCompletados++; // se agotaron los intentos: contamos el hueco para que el ETA no se quede colgado
                if (typeof window.UI.renderTable === 'function') window.UI.renderTable();
                await new Promise(r => setTimeout(r, 300)); // pequeño respiro por trabajador, más corto que antes porque ya hay varios en paralelo
            }
        };

        await Promise.all(Array.from({ length: Math.min(CONCURRENCIA, Math.max(1, loteChunks.length)) }, (_, idTrabajador) => trabajador(idTrabajador)));

        const totalPendiente = filasPendientes.length - completados;
        if (cuotaAgotada) {
            window.UI.log(`[FIN - CUOTA AGOTADA] Se detuvo el proceso por falta de cuota en la API. Completados: ${completados}. Pendientes: ${totalPendiente}. Vuelve a pulsar "Generar Info Platos Otros Idiomas" más tarde para continuar solo con lo que falta.`);
        } else if (totalPendiente > 0) {
            window.UI.log(`[FIN - INCOMPLETO] Completados: ${completados}. Pendientes: ${totalPendiente} (revisa los errores anteriores). Puedes volver a pulsar "Generar Info Platos Otros Idiomas" para reintentar solo lo pendiente.`);
        } else {
            window.UI.log(`[FIN] Traducción de Info a otros idiomas finalizada con éxito. Completados: ${completados}.`);
        }
    }
};
