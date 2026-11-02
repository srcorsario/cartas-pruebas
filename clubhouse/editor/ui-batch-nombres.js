// =========================================
// REPOSITORIO: Web_Editor_Pro_v3 (PRINCIPAL)
// ARCHIVO: ui-batch-nombres.js
// FASE 2: Traducción por lotes de NOMBRE_ES al resto de idiomas (incluido el
// inglés si también falta), vía Gemini.
// Botón: "Traducir Platos en ES a Todos los Idiomas Faltantes".
// =========================================

import { stateContainer, procesoState, asegurarColumnasEstructura } from './ui-state.js';

export const UIBatchNombres = {
    // ==========================================
    // FASE 2 - TRADUCCIÓN AUTOMÁTICA DE NOMBRES AL RESTO DE IDIOMAS
    // Reutiliza el mismo prompt (window.PROMPTS.autoTraduccionResto) y la misma
    // lógica que ya usaba el botón manual de un solo plato (ejecutarTraduccionAutomatica
    // en app.js), pero recorriendo TODOS los platos pendientes en bloques
    // (tamaño configurable vía TRADUCCION_TAMANO_LOTE en config.js).
    // NUEVO: el inglés (NOMBRE_EN) ya no está excluido — "Todos los Idiomas
    // Faltantes" incluye el inglés si también está vacío. Si NOMBRE_EN ya tiene
    // valor, se sigue usando como referencia para el resto de idiomas (igual que
    // antes); si está vacío, se traduce en la misma llamada que el resto.
    // ==========================================
    iniciarTraduccionNombresPorLotes: async (stateContainerParam) => {
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
        // NUEVO: solo se excluye ES (el idioma origen); EN ya se traduce como uno más si falta.
        const idiomasObjetivo = idiomasBase.filter(l => l !== 'es');

        const indiceCastellanoBase = activeStateContainer.headers.findIndex(h => h && h.toUpperCase() === 'NOMBRE_ES');
        const indiceInglesBase = activeStateContainer.headers.findIndex(h => h && h.toUpperCase() === 'NOMBRE_EN');
        const indiceId = activeStateContainer.headers.findIndex(h => h && h.toUpperCase() === 'ID');
        const indiceCarpeta = activeStateContainer.headers.findIndex(h => h && h.toUpperCase() === 'CARPETA');
        // NUEVO: huella de NOMBRE_ES en el momento de traducir — usada por revisarConsistencia()
        // (ui-batch-revision.js) para saber si el nombre ha cambiado desde entonces.
        const indiceHashNombre = activeStateContainer.headers.findIndex(h => h && h.toUpperCase() === 'INFO_HASH_NOMBRE');

        if (indiceCastellanoBase === -1 || indiceInglesBase === -1) {
            return window.UI.log("[Error Crítico] Faltan columnas base obligatorias (NOMBRE_ES o NOMBRE_EN).");
        }

        // Índice de la columna NOMBRE_<idioma> de cada idioma objetivo.
        const indicesObjetivo = {};
        idiomasObjetivo.forEach(l => {
            indicesObjetivo[l] = activeStateContainer.headers.findIndex(h => h && h.toUpperCase() === `NOMBRE_${l.toUpperCase()}`);
        });

        const techoLimiteEvaluacion = Math.min(rangoFin, activeStateContainer.csvData.length);
        const CARPETAS_SIN_IA = ['cafe', 'refrescos', 'cerveza'];
        const TAMANO_LOTE = (typeof window.TRADUCCION_TAMANO_LOTE === 'number' && window.TRADUCCION_TAMANO_LOTE > 0) ? window.TRADUCCION_TAMANO_LOTE : 3;

        // Construir la lista de filas a las que les falta la traducción de al menos un idioma objetivo.
        const filasPendientes = [];
        for (let i = Math.max(0, rangoInicio); i < techoLimiteEvaluacion; i++) {
            const row = activeStateContainer.csvData[i];
            while (row.length < activeStateContainer.headers.length) row.push("");

            const idValor = indiceId !== -1 ? parseInt(row[indiceId]) : NaN;
            const carpetaValor = indiceCarpeta !== -1 ? (row[indiceCarpeta] || "").trim().toLowerCase() : "";
            const esCabeceraCategoria = !isNaN(idValor) && idValor >= 1 && idValor <= 12;
            const esBebidaSimple = CARPETAS_SIN_IA.includes(carpetaValor);
            if (esCabeceraCategoria || esBebidaSimple) continue;

            const nombreEs = row[indiceCastellanoBase] || "";
            if (!nombreEs) continue;

            const faltaAlgunIdioma = idiomasObjetivo.some(l => indicesObjetivo[l] !== -1 && !(row[indicesObjetivo[l]] || "").trim());
            if (faltaAlgunIdioma) filasPendientes.push(i);
        }

        // NUEVO: paralelización (misma técnica aplicada ya al Paso 3 el 26 de agosto): varios
        // "trabajadores" en vuelo a la vez, cada uno con su propia API key, en vez de una petición
        // secuencial rotando de key solo al chocar un 429.
        const CONCURRENCIA = Math.max(1, Math.min(
            listaClavesAPI.length,
            (typeof window.TRADUCCION_CONCURRENCIA === 'number' && window.TRADUCCION_CONCURRENCIA > 0) ? window.TRADUCCION_CONCURRENCIA : listaClavesAPI.length
        ));
        window.UI.log(`[Paso 2] Traduciendo nombres al resto de idiomas (${idiomasObjetivo.length} idiomas) en bloques de ${TAMANO_LOTE}, con ${CONCURRENCIA} petición(es) en paralelo. Platos pendientes: ${filasPendientes.length}.`);

        let platosCompletados = 0, cuotaAgotada = false, lotesCompletados = 0;
        const duracionesLote = []; // duración (s) de cada lote completado en ESTA tanda, para estimar lo que falta
        // clavesEnCooldown = keys que dieron 429 en SU ÚLTIMO uso (se limpia sola en su siguiente
        // éxito); si en un momento dado TODAS están en cooldown a la vez, se asume cuota agotada.
        const clavesEnCooldown = new Set();

        const loteChunks = [];
        for (let lote = 0; lote < filasPendientes.length; lote += TAMANO_LOTE) {
            loteChunks.push(filasPendientes.slice(lote, lote + TAMANO_LOTE));
        }
        const totalLotes = loteChunks.length;
        let siguienteIndiceLote = 0; // "puntero" a la cola; ++ es atómico en JS (sin await de por medio)

        const trabajador = async (idTrabajador) => {
            let miKeyIndex = idTrabajador % listaClavesAPI.length; // key inicial propia de este trabajador
            while (true) {
                if (procesoState.detenido || cuotaAgotada) return;
                while (procesoState.pausado) await new Promise(resolve => setTimeout(resolve, 500));
                if (procesoState.detenido || cuotaAgotada) return;

                const miIndiceLote = siguienteIndiceLote++;
                if (miIndiceLote >= loteChunks.length) return; // cola vacía: este trabajador termina

                const inicioLote = Date.now();
                const numeroLote = miIndiceLote + 1;
                const indicesLote = loteChunks[miIndiceLote];
                window.UI.log(`[Lote ${numeroLote}/${totalLotes}] Procesando filas ${indicesLote.map(i => i + 2).join(', ')}...`);

            // Preparar los datos de cada plato del lote (sin llamar aún a la IA)
            const itemsLote = indicesLote.map(i => {
                const row = activeStateContainer.csvData[i];
                const nombreEs = row[indiceCastellanoBase] || "";
                const nombreEn = row[indiceInglesBase] || "";
                const carpetaValor = indiceCarpeta !== -1 ? (row[indiceCarpeta] || "").trim().toLowerCase() : "";
                const esVino = carpetaValor === 'vinos';

                // CORREGIDO (bug real en producción): platos con VARIAS opciones entre
                // "//.../ /" (p.ej. "Mix de Gyozas //Pato// , //Langostino// , //Pollo//")
                // nunca se traducían bien porque aquí se reconstruía el texto a mano con
                // "desglosadoEs.uvas" — que es SOLO la primera opción (ver desglosarNombre en
                // utils.js) — así que el texto que llegaba a la IA ya venía truncado a "Mix de
                // Gyozas // Pato" ANTES de que el prompt pudiera hacer nada: por mucho que la
                // instrucción le pida "contar los //", si el original recibido ya solo tiene
                // uno, no hay nada que contar. Se usa reconstruirNombreConOpciones() (misma
                // utils.js), que sí conserva TODAS las opciones con el formato
                // "//opcion// , //opcion//" que espera desglosarNombre() al releerlo.
                const desglosadoEs = (typeof window.desglosarNombre === 'function') ? window.desglosarNombre(nombreEs) : { nombre: nombreEs, uvas: "", opciones: [] };
                const desglosadoEn = (typeof window.desglosarNombre === 'function') ? window.desglosarNombre(nombreEn) : { nombre: nombreEn, uvas: "", opciones: [] };
                const reconstruir = (typeof window.reconstruirNombreConOpciones === 'function') ? window.reconstruirNombreConOpciones : (d => d.opciones.length > 0 ? `${d.nombre} //${d.opciones.join('// , //')}//` : d.nombre);
                const textoCompletoEs = reconstruir(desglosadoEs).replace(/"/g, "'");
                const textoCompletoEn = reconstruir(desglosadoEn).replace(/"/g, "'");

                return { fila: i, row, esVino, textoCompletoEs, textoCompletoEn };
            }).filter(it => it.textoCompletoEs);

            if (itemsLote.length === 0) { lotesCompletados++; continue; }

            // CORREGIDO: una única llamada a Gemini para TODO el lote (antes se hacía una llamada
            // por plato en paralelo, lo que multiplicaba el consumo de cuota/tokens por 3 en vez de
            // amortizar las instrucciones del prompt entre los 3 platos, como se hacía originalmente).
            const promptTraduccion = window.PROMPTS.autoTraduccionRestoLote(itemsLote, idiomasObjetivo.map(l => l.toUpperCase()));

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
                    // NUEVO: visibilidad de qué key se usa en CADA petición, no solo cuando hay que
                    // rotar por error — antes solo se veía "Rotando Key" en el log, así que si todo
                    // iba bien no había forma de saber si se estaban llegando a usar las keys nuevas.
                    window.UI.log(`[Info] Usando Key ${miKeyIndex + 1}/${listaClavesAPI.length} (fila(s) ${itemsLote.map(it => it.fila + 2).join(', ')})...`);
                    const callResponse = await fetch(`${window.GEMINI_ENDPOINT_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent'}?key=${listaClavesAPI[miKeyIndex]}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: promptTraduccion }] }], generationConfig: { maxOutputTokens: window.GEMINI_MAX_OUTPUT_TOKENS || 65536, thinkingConfig: { thinkingLevel: window.GEMINI_THINKING_LEVEL || "medium" } } }) });

                    const textResponse = await callResponse.text();
                    let respuestaJsonData;
                    try {
                        respuestaJsonData = JSON.parse(textResponse);
                    } catch (e) {
                        throw new Error("La API devolvió HTML o texto plano (Posible 403 o error de cuota).");
                    }

                    if (respuestaJsonData.error?.code === 429) {
                        clavesEnCooldown.add(miKeyIndex);
                        const keyAnterior = miKeyIndex;
                        miKeyIndex = (miKeyIndex + 1) % listaClavesAPI.length;
                        window.UI.log(`[Aviso] Límite superado en el lote (filas ${itemsLote.map(it => it.fila + 2).join(', ')}, Key ${keyAnterior + 1}). Rotando Key (${clavesEnCooldown.size}/${listaClavesAPI.length} en cooldown)...`);
                        await new Promise(r => setTimeout(r, 4000));
                        intentosLote++;
                        continue;
                    }

                    // NUEVO: cualquier otro error explícito de la API (400/403/404/500...) se muestra
                    // tal cual en vez de caer en el genérico "La API no devolvió contenido" — antes
                    // solo se comprobaba el código 429 y cualquier otro error quedaba enmascarado
                    // (mismo ajuste que ya tenía ui-batch-info-otros.js, ver Fase 3).
                    if (respuestaJsonData.error) {
                        throw new Error(`Error de la API (código ${respuestaJsonData.error.code || '?'}): ${respuestaJsonData.error.message || 'sin mensaje'}`);
                    }

                    // NUEVO: si Gemini bloqueó la respuesta por su filtro de seguridad, viene en
                    // promptFeedback (candidates puede venir vacío o ausente) — se detecta explícitamente
                    // en vez de caer en el genérico "sin contenido", igual que en ui-batch-info-otros.js.
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

                    const traduccionesLote = (typeof window.extraerJSON === 'function')
                        ? window.extraerJSON(textoLimpioIA)
                        : JSON.parse(textoLimpioIA.replace(/```json/g, '').replace(/```/g, '').trim());

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
                            // CORREGIDO: mismo bug que al construir el texto de entrada (ver
                            // arriba) pero en sentido inverso — aunque la IA devolviera las 3
                            // opciones bien traducidas, aquí se guardaba solo
                            // "desglosadoTraduccion.uvas" (la primera), perdiendo las demás al
                            // escribir la fila. Se reconstruye con TODAS las opciones que haya
                            // devuelto la IA para este idioma.
                            const desglosadoTraduccion = (typeof window.desglosarNombre === 'function') ? window.desglosarNombre(valorTraducido) : { nombre: valorTraducido, uvas: "", opciones: [] };
                            let nombreFinal = desglosadoTraduccion.nombre;
                            if (it.esVino && typeof window.formatWineName === 'function') nombreFinal = window.formatWineName(nombreFinal);
                            const reconstruirDestino = (typeof window.reconstruirNombreConOpciones === 'function') ? window.reconstruirNombreConOpciones : (d => d.opciones.length > 0 ? `${d.nombre} //${d.opciones.join('// , //')}//` : d.nombre);
                            it.row[indicesObjetivo[l]] = reconstruirDestino({ nombre: nombreFinal, opciones: desglosadoTraduccion.opciones });
                            algunoAplicado = true;
                        });
                        // NUEVO: al completar (o confirmar) los nombres de esta fila, se anota la
                        // huella del NOMBRE_ES usado, para poder detectar más adelante si vuelve a
                        // cambiar y haría falta re-traducirlo a todos los idiomas.
                        if (algunoAplicado && indiceHashNombre !== -1 && typeof window.calcularHashContenido === 'function') {
                            it.row[indiceHashNombre] = window.calcularHashContenido(it.row[indiceCastellanoBase] || "");
                        }
                        if (algunoAplicado) platosCompletados++;
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
                    window.UI.log(`[Error Traducción Nombres] Lote (filas ${itemsLote.map(it => it.fila + 2).join(', ')}): ${err.message}`);
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

        const totalPendiente = filasPendientes.length - platosCompletados;
        if (cuotaAgotada) {
            window.UI.log(`[FIN - CUOTA AGOTADA] Se detuvo el proceso por falta de cuota en la API. Completados: ${platosCompletados} platos. Pendientes: ${totalPendiente}. Vuelve a pulsar "Traducir Platos en ES a Todos los Idiomas Faltantes" más tarde para continuar solo con lo que falta.`);
        } else if (totalPendiente > 0) {
            window.UI.log(`[FIN - INCOMPLETO] Completados: ${platosCompletados} platos. Pendientes: ${totalPendiente} (revisa los errores anteriores). Puedes volver a pulsar "Traducir Platos en ES a Todos los Idiomas Faltantes" para reintentar solo lo pendiente.`);
        } else {
            window.UI.log(`[FIN] Traducción de nombres finalizada con éxito. Completados: ${platosCompletados} platos.`);
        }
    }
};
