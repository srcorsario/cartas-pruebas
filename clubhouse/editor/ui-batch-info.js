// =========================================
// REPOSITORIO: Web_Editor_Pro_v3 (PRINCIPAL)
// ARCHIVO: ui-batch-info.js
// FASE 1: Generación por lotes de INFO_ES / INFO_EN (descripción +
// preguntas/respuestas) y del nombre en inglés, vía Gemini.
// Botón: "Generar Info Platos ES/EN".
// =========================================

import { stateContainer, procesoState, asegurarColumnasEstructura } from './ui-state.js';

export const UIBatchInfo = {
    // ==========================================
    // FLUJO PILOTO (ES Y EN - CONTROL ESTRICTO Y BLINDADO DE ALÉRGENOS SIN MARIDAJE)
    // ==========================================
    iniciarTraduccionPorLotes: async (stateContainerParam) => {
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

        const indiceCastellanoBase = activeStateContainer.headers.findIndex(h => h && h.toUpperCase() === 'NOMBRE_ES');
        const indiceInglesBase = activeStateContainer.headers.findIndex(h => h && h.toUpperCase() === 'NOMBRE_EN');
        const indiceInfoEs = activeStateContainer.headers.findIndex(h => h && h.toUpperCase() === 'INFO_ES');
        const indiceInfoIngles = activeStateContainer.headers.findIndex(h => h && h.toUpperCase() === 'INFO_EN');
        const indiceAlergenos = activeStateContainer.headers.findIndex(h => h && h.toUpperCase().replace(/[^A-Z]/g, '') === 'ALERGENOSCOD');
        const indiceId = activeStateContainer.headers.findIndex(h => h && h.toUpperCase() === 'ID');
        const indiceCarpeta = activeStateContainer.headers.findIndex(h => h && h.toUpperCase() === 'CARPETA');
        // NUEVO: huella de (NOMBRE_ES + ALERGENOS_COD) en el momento de generar la ficha —
        // usada por revisarConsistencia() (ui-batch-revision.js) para saber si el nombre o los
        // alérgenos han cambiado desde entonces y haría falta regenerar la ficha en todos los idiomas.
        const indiceHashFicha = activeStateContainer.headers.findIndex(h => h && h.toUpperCase() === 'INFO_HASH_FICHA');

        if (indiceCastellanoBase === -1 || indiceInglesBase === -1 || indiceInfoEs === -1 || indiceInfoIngles === -1) {
            return window.UI.log("[Error Crítico] Faltan columnas base obligatorias (NOMBRE_ES, NOMBRE_EN, INFO_ES o INFO_EN).");
        }

        const techoLimiteEvaluacion = Math.min(rangoFin, activeStateContainer.csvData.length);

        // Carpetas de bebidas simples que no necesitan descripción ni preguntas generadas por IA.
        const CARPETAS_SIN_IA = ['cafe', 'refrescos', 'cerveza'];
        const TAMANO_LOTE_INFO = (typeof window.INFO_EXTENDIDA_TAMANO_LOTE === 'number' && window.INFO_EXTENDIDA_TAMANO_LOTE > 0) ? window.INFO_EXTENDIDA_TAMANO_LOTE : 2;

        window.UI.log("[Paso 1] Generando contenido en Castellano e Inglés (ES / EN) sin maridajes y con alérgenos blindados. Vinos: solo descripción. Bebidas simples (café/refrescos/cerveza) y cabeceras de categoría: omitidas...");

        // CORREGIDO: se agrupan varios platos (y, por separado, varios vinos) en una sola
        // llamada a la IA en vez de una llamada por fila, para ahorrar tokens de instrucciones
        // repetidas y no agotar la cuota tan rápido. Se separan platos y vinos porque usan
        // prompts distintos (los vinos no llevan preguntas/respuestas).
        const pendientesPlatos = [];
        const pendientesVinos = [];
        for (let i = Math.max(0, rangoInicio); i < techoLimiteEvaluacion; i++) {
            const row = activeStateContainer.csvData[i];
            while (row.length < activeStateContainer.headers.length) row.push("");

            const nombreEs = row[indiceCastellanoBase] || "";
            const nombreEnActual = row[indiceInglesBase] || "";
            const infoEsActual = row[indiceInfoEs] || "";
            const infoEnActual = row[indiceInfoIngles] || "";
            const idValor = indiceId !== -1 ? parseInt(row[indiceId]) : NaN;
            const carpetaValor = indiceCarpeta !== -1 ? (row[indiceCarpeta] || "").trim().toLowerCase() : "";

            const esCabeceraCategoria = !isNaN(idValor) && idValor >= 1 && idValor <= 12;
            const esBebidaSimple = CARPETAS_SIN_IA.includes(carpetaValor);
            if (esCabeceraCategoria || esBebidaSimple) continue;
            if (!nombreEs) continue;

            const esVino = carpetaValor === 'vinos';
            if (nombreEnActual && infoEsActual && infoEnActual) continue; // ya está completo

            if (esVino) pendientesVinos.push(i); else pendientesPlatos.push(i);
        }

        let platosCompletados = 0, vinosCompletados = 0, cuotaAgotada = false;

        // NUEVO: paralelización (misma técnica que ya se aplicó al Paso 3 en ui-batch-info-otros.js
        // el 26 de agosto): varios "trabajadores" en vuelo a la vez, cada uno con su propia API key,
        // en vez de una petición secuencial rotando de key solo al chocar un 429.
        // clavesEnCooldown = keys que dieron 429 en SU ÚLTIMO uso (se limpia sola en su siguiente
        // éxito); si en un momento dado TODAS están en cooldown a la vez, se asume cuota agotada de
        // verdad y se para todo. Se comparte entre las dos fases (platos y vinos).
        const clavesEnCooldown = new Set();
        const CONCURRENCIA = Math.max(1, Math.min(
            listaClavesAPI.length,
            (typeof window.INFO_EXTENDIDA_CONCURRENCIA === 'number' && window.INFO_EXTENDIDA_CONCURRENCIA > 0) ? window.INFO_EXTENDIDA_CONCURRENCIA : listaClavesAPI.length
        ));

        window.UI.log(`[Info] Pendientes: ${pendientesPlatos.length} platos, ${pendientesVinos.length} vinos. Lotes de ${TAMANO_LOTE_INFO}, con ${CONCURRENCIA} petición(es) en paralelo.`);

        // NUEVO: cronometraje de lotes para poder mostrar cuánto tarda cada uno y una
        // estimación aproximada del tiempo restante (Fase 1 completa: platos + vinos).
        // Se comparte un único array de duraciones entre ambos sub-pasos (1a y 1b) porque
        // usan el mismo prompt/lote de tamaño TAMANO_LOTE_INFO, así la media es más fiable
        // cuantos más lotes lleve completados (no se reinicia al pasar de platos a vinos).
        const duracionesLote = [];
        const totalLotesPlatos = Math.ceil(pendientesPlatos.length / TAMANO_LOTE_INFO);
        const totalLotesVinos = Math.ceil(pendientesVinos.length / TAMANO_LOTE_INFO);
        const fmtDuracion = (typeof window.formatearDuracion === 'function') ? window.formatearDuracion : (s => `${Math.round(s)}s`);

        // ---------- Función interna reutilizada para procesar un lote (platos o vinos) ----------
        // keyState = { index } es la key PROPIA del trabajador que llama a esta función (ya no se
        // usa procesoState.currentKeyIndex, compartido, para evitar que dos trabajadores en paralelo
        // se pisen la misma key a la vez).
        // Devuelve 'ok', 'cuota_agotada' (todas las keys están en cooldown a la vez -> seguir
        // insistiendo es inútil, hay que parar el proceso entero en vez de machacar el resto de
        // lotes contra la misma pared) o 'error'.
        const procesarLoteInfo = async (indicesLote, esVino, keyState) => {
            const items = indicesLote.map(i => {
                const row = activeStateContainer.csvData[i];
                const nombreEs = row[indiceCastellanoBase] || "";
                const alergenosValor = indiceAlergenos !== -1 ? (row[indiceAlergenos] || "").trim() : "";
                const tieneAlergenos = alergenosValor && alergenosValor.toUpperCase() !== 'NINGUNO' && alergenosValor !== '0' && alergenosValor !== '';
                return esVino ? { fila: i, row, nombreVino: nombreEs } : { fila: i, row, nombreEs, tieneAlergenos, alergenosValor };
            });

            const promptLote = esVino ? window.PROMPTS.vinoLote(items) : window.PROMPTS.pilotoLote(items);

            let satisfecho = false;
            let intentosLote = 0;
            const maxIntentosLote = Math.max(3, listaClavesAPI.length * 2);

            while (!satisfecho && !procesoState.detenido && intentosLote < maxIntentosLote) {
                // Si mi key actual está en cooldown, busco la siguiente que no lo esté.
                let vueltas = 0;
                while (clavesEnCooldown.has(keyState.index) && vueltas < listaClavesAPI.length) {
                    keyState.index = (keyState.index + 1) % listaClavesAPI.length;
                    vueltas++;
                }
                if (clavesEnCooldown.size >= listaClavesAPI.length) {
                    window.UI.log(`[Error Crítico] Cuota de Gemini agotada en TODAS las keys disponibles (${listaClavesAPI.length}). Deteniendo el proceso para no malgastar más peticiones.`);
                    return 'cuota_agotada';
                }
                try {
                    // NUEVO: visibilidad de qué key se usa en CADA petición, no solo al rotar por error.
                    window.UI.log(`[Info] Usando Key ${keyState.index + 1}/${listaClavesAPI.length} (fila(s) ${items.map(it => it.fila + 2).join(', ')})...`);
                    const callResponse = await fetch(`${window.GEMINI_ENDPOINT_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent'}?key=${listaClavesAPI[keyState.index]}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: promptLote }] }], generationConfig: { maxOutputTokens: window.GEMINI_MAX_OUTPUT_TOKENS || 65536, thinkingConfig: { thinkingLevel: window.GEMINI_THINKING_LEVEL || "medium" } } }) });

                    const textResponse = await callResponse.text();
                    let respuestaJsonData;
                    try {
                        respuestaJsonData = JSON.parse(textResponse);
                    } catch (e) {
                        throw new Error("La API devolvió HTML o texto plano (Posible 403 o error de cuota).");
                    }

                    if (respuestaJsonData.error?.code === 429) {
                        clavesEnCooldown.add(keyState.index);
                        const keyAnterior = keyState.index;
                        keyState.index = (keyState.index + 1) % listaClavesAPI.length;
                        window.UI.log(`[Aviso] Límite superado en el lote (filas ${items.map(it => it.fila + 2).join(', ')}, Key ${keyAnterior + 1}). Rotando Key (${clavesEnCooldown.size}/${listaClavesAPI.length} en cooldown)...`);
                        await new Promise(r => setTimeout(r, 4000));
                        intentosLote++;
                        continue;
                    }

                    // NUEVO: cualquier otro error explícito de la API (400/403/404/500...) se muestra
                    // tal cual en vez de caer en el genérico "La API no devolvió contenido" (mismo
                    // ajuste que ya tenía ui-batch-info-otros.js, ver Fase 3).
                    if (respuestaJsonData.error) {
                        throw new Error(`Error de la API (código ${respuestaJsonData.error.code || '?'}): ${respuestaJsonData.error.message || 'sin mensaje'}`);
                    }

                    // NUEVO: si Gemini bloqueó la respuesta por su filtro de seguridad, viene en
                    // promptFeedback — se detecta explícitamente en vez de caer en el genérico
                    // "sin contenido", igual que en ui-batch-info-otros.js.
                    const blockReason = respuestaJsonData.promptFeedback?.blockReason;
                    if (blockReason) {
                        throw new Error(`Gemini bloqueó la respuesta por su filtro de seguridad (blockReason: ${blockReason}). Puede haber un término en algún plato de este lote que lo dispare — revísalo o repórtalo si parece un falso positivo.`);
                    }

                    const finishReason = respuestaJsonData.candidates?.[0]?.finishReason;
                    const safetyRatings = respuestaJsonData.candidates?.[0]?.safetyRatings;
                    const textoLimpioIA = (typeof window.extraerTextoCompletoRespuesta === 'function') ? window.extraerTextoCompletoRespuesta(respuestaJsonData.candidates?.[0]) : respuestaJsonData.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (!textoLimpioIA) {
                        const detalleSeguridad = (safetyRatings && safetyRatings.length) ? ` | safetyRatings: ${JSON.stringify(safetyRatings)}` : '';
                        const numCandidatos = Array.isArray(respuestaJsonData.candidates) ? respuestaJsonData.candidates.length : 0;
                        throw new Error(`La API no devolvió contenido (finishReason: ${finishReason || 'desconocido'}, nº candidatos: ${numCandidatos})${detalleSeguridad}.`);
                    }

                    const jsonSanitizado = textoLimpioIA.replace(/```json/g, '').replace(/```/g, '').trim();
                    const resultadoLote = JSON.parse(jsonSanitizado);

                    let algunoAplicado = false;
                    items.forEach((it, idx) => {
                        const parsed = resultadoLote[String(idx)] || resultadoLote[idx];
                        if (!parsed || !parsed.es || !parsed.en) return;

                        const row = it.row;
                        const nombreEnActual = row[indiceInglesBase] || "";
                        const infoEsActual = row[indiceInfoEs] || "";
                        const infoEnActual = row[indiceInfoIngles] || "";

                        if (!esVino && it.tieneAlergenos) {
                            if (!parsed.es.q3 || !parsed.es.r3 || !parsed.es.r3.trim()) {
                                parsed.es.q3 = parsed.es.q3 || "¿Contiene este plato algún alérgeno?";
                                parsed.es.r3 = `Este plato contiene: ${it.alergenosValor}.`;
                            }
                            if (!parsed.en.q3 || !parsed.en.r3 || !parsed.en.r3.trim()) {
                                parsed.en.q3 = parsed.en.q3 || "Does this dish contain any allergens?";
                                parsed.en.r3 = `This dish contains: ${it.alergenosValor}.`;
                            }
                        }

                        if (!nombreEnActual && parsed.nombre_en) row[indiceInglesBase] = parsed.nombre_en;
                        if (!infoEsActual) row[indiceInfoEs] = JSON.stringify(parsed.es);
                        if (!infoEnActual) row[indiceInfoIngles] = JSON.stringify(parsed.en);

                        // NUEVO: si se ha (re)generado la ficha ES/EN de esta fila, se anota la
                        // huella de NOMBRE_ES + ALERGENOS_COD usados, para poder detectar más
                        // adelante si vuelven a cambiar y haría falta regenerarla en todos los idiomas.
                        if ((!infoEsActual || !infoEnActual) && indiceHashFicha !== -1 && typeof window.calcularHashContenido === 'function') {
                            const nombreEsRow = row[indiceCastellanoBase] || "";
                            const alergenosRow = indiceAlergenos !== -1 ? (row[indiceAlergenos] || "") : "";
                            row[indiceHashFicha] = window.calcularHashContenido(`${nombreEsRow}|${alergenosRow}`);
                        }
                        algunoAplicado = true;
                        if (esVino) vinosCompletados++; else platosCompletados++;
                    });
                    satisfecho = true;
                    return algunoAplicado ? 'ok' : 'error';
                } catch (err) {
                    window.UI.log(`[Error ${esVino ? 'Vino' : 'Piloto'} Lote] Filas ${items.map(it => it.fila + 2).join(', ')}: ${err.message}`);
                    await new Promise(r => setTimeout(r, 3000));
                    keyState.index = (keyState.index + 1) % listaClavesAPI.length;
                    intentosLote++;
                }
            }
            return satisfecho ? 'ok' : 'error';
        };

        // ---------- Ejecuta una fase (platos o vinos) con varios trabajadores en paralelo,
        // cada uno con su propia key, tirando de una cola compartida de lotes hasta vaciarla. ----------
        const ejecutarFaseParalela = async (indicesPendientes, esVino, etiquetaFase, totalLotesFase, totalLotesOtraFase) => {
            if (cuotaAgotada || procesoState.detenido) return;
            const loteChunks = [];
            for (let lote = 0; lote < indicesPendientes.length; lote += TAMANO_LOTE_INFO) {
                loteChunks.push(indicesPendientes.slice(lote, lote + TAMANO_LOTE_INFO));
            }
            let siguienteIndiceLote = 0; // "puntero" a la cola; ++ es atómico en JS (sin await de por medio)
            let lotesCompletadosFase = 0;

            const trabajador = async (idTrabajador) => {
                const keyState = { index: idTrabajador % listaClavesAPI.length }; // key inicial propia de este trabajador
                while (true) {
                    if (procesoState.detenido || cuotaAgotada) return;
                    while (procesoState.pausado) await new Promise(resolve => setTimeout(resolve, 500));
                    if (procesoState.detenido || cuotaAgotada) return;

                    const miIndiceLote = siguienteIndiceLote++;
                    if (miIndiceLote >= loteChunks.length) return; // cola vacía: este trabajador termina

                    const indicesLote = loteChunks[miIndiceLote];
                    const numeroLote = miIndiceLote + 1;
                    window.UI.log(`[${etiquetaFase} - Lote ${numeroLote}/${totalLotesFase}] Procesando filas ${indicesLote.map(i => i + 2).join(', ')}...`);
                    const inicioLote = Date.now();
                    const resultado = await procesarLoteInfo(indicesLote, esVino, keyState);
                    if (resultado === 'cuota_agotada') { cuotaAgotada = true; return; }

                    const duracionLoteSeg = (Date.now() - inicioLote) / 1000;
                    duracionesLote.push(duracionLoteSeg);
                    const mediaSeg = duracionesLote.reduce((a, b) => a + b, 0) / duracionesLote.length;
                    lotesCompletadosFase++;
                    const lotesRestantes = (totalLotesFase - lotesCompletadosFase) + totalLotesOtraFase;
                    window.UI.log(`[Tiempo] Lote ${etiquetaFase} completado en ${fmtDuracion(duracionLoteSeg)} (media: ${fmtDuracion(mediaSeg)}/lote, ${lotesCompletadosFase}/${totalLotesFase} de esta fase). Estimado restante (Paso 1 completo): ~${fmtDuracion((mediaSeg * lotesRestantes) / CONCURRENCIA)} (${lotesRestantes} lote(s), ${CONCURRENCIA} en paralelo).`);

                    if (typeof window.UI.renderTable === 'function') window.UI.renderTable();
                    await new Promise(r => setTimeout(r, 300)); // pequeño respiro por trabajador, más corto que antes porque ya hay varios en paralelo
                }
            };

            await Promise.all(Array.from({ length: Math.min(CONCURRENCIA, Math.max(1, loteChunks.length)) }, (_, idTrabajador) => trabajador(idTrabajador)));
        };

        // ---------- Fase 1a: platos, luego Fase 1b: vinos (cada una totalmente paralelizada por dentro) ----------
        await ejecutarFaseParalela(pendientesPlatos, false, 'Piloto ES/EN', totalLotesPlatos, totalLotesVinos);
        await ejecutarFaseParalela(pendientesVinos, true, 'Vino', totalLotesVinos, 0);

        const totalPendiente = (pendientesPlatos.length - platosCompletados) + (pendientesVinos.length - vinosCompletados);
        if (cuotaAgotada) {
            window.UI.log(`[FIN - CUOTA AGOTADA] Se detuvo el proceso por falta de cuota en la API. Completados: ${platosCompletados} platos y ${vinosCompletados} vinos. Pendientes: ${totalPendiente}. Vuelve a pulsar "Generar Info Platos ES/EN" más tarde para continuar solo con lo que falta.`);
        } else if (totalPendiente > 0) {
            window.UI.log(`[FIN - INCOMPLETO] Completados: ${platosCompletados} platos y ${vinosCompletados} vinos. Pendientes: ${totalPendiente} (revisa los errores anteriores). Puedes volver a pulsar "Generar Info Platos ES/EN" para reintentar solo lo pendiente.`);
        } else {
            window.UI.log(`[FIN] Proceso finalizado con éxito. Completados: ${platosCompletados} platos y ${vinosCompletados} vinos.`);
        }
    }
};
