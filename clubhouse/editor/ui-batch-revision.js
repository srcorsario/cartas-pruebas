// =========================================
// REPOSITORIO: Web_Editor_Pro_v3 (PRINCIPAL)
// ARCHIVO: ui-batch-revision.js
// FASE 4 (NUEVA): Revisión de consistencia. Detecta platos cuyo NOMBRE_ES y/o
// ALERGENOS_COD han cambiado desde la última vez que se generaron sus
// traducciones (NOMBRE_<idioma>) o su ficha (INFO_<idioma>: descripción +
// preguntas/respuestas) — típicamente porque alguien ha editado un ingrediente
// del nombre o ha marcado/desmarcado un alérgeno en el editor manual, DESPUÉS
// de que ya existieran esas traducciones.
//
// Cómo lo sabe: las Fases 1-3 (ui-batch-info.js / ui-batch-nombres.js /
// ui-batch-info-otros.js) anotan, cada vez que generan contenido para una
// fila, una "huella" (hash) de los datos de origen usados en ese momento, en
// dos columnas nuevas (INFO_HASH_NOMBRE, INFO_HASH_FICHA — ver
// asegurarColumnasEstructura en ui-state.js). Esta fase recalcula esa misma
// huella con los datos ACTUALES y, si no coincide con la guardada, entiende
// que el contenido ya generado ha quedado desactualizado.
//
// Qué hace al detectar un desajuste: vacía las traducciones afectadas (para
// que las Fases 1-3 las traten como "pendientes", igual que si nunca se
// hubieran generado) y, automáticamente, vuelve a lanzar esas fases para
// regenerarlas en TODOS los idiomas configurados. No inventa nada nuevo: solo
// reutiliza el mismo pipeline de IA ya existente, apuntándolo a lo que ha
// quedado obsoleto.
// Botón: "Revisar y Corregir Consistencia".
// =========================================

import { stateContainer, procesoState, asegurarColumnasEstructura } from './ui-state.js';

export const UIBatchRevision = {
    revisarConsistencia: async (stateContainerParam) => {
        procesoState.detenido = false; procesoState.pausado = false;
        const activeStateContainer = stateContainerParam || stateContainer;
        if (!activeStateContainer || !activeStateContainer.headers || !activeStateContainer.csvData) return window.UI.log("[Error] Estructura de datos vacía.");
        if (typeof window.calcularHashContenido !== 'function') return window.UI.log("[Error Crítico] Falta calcularHashContenido() (utils.js) — no se puede revisar consistencia.");

        window.UI.log("[Info] Asegurando estructura de columnas en memoria...");
        asegurarColumnasEstructura(activeStateContainer);

        const selectorInicio = document.getElementById('rangoInicio');
        const selectorFin = document.getElementById('rangoFin');
        const rangoInicio = selectorInicio ? (parseInt(selectorInicio.value) - 2 || 0) : 0;
        const rangoFin = selectorFin ? (parseInt(selectorFin.value) - 1 || activeStateContainer.csvData.length) : activeStateContainer.csvData.length;

        const idiomasBase = (window.IDIOMAS_ORDEN && window.IDIOMAS_ORDEN.length) ? window.IDIOMAS_ORDEN : Object.keys(window.IDIOMAS_CONFIG || {}).map(l => l.toLowerCase());
        const idiomasNombres = idiomasBase.filter(l => l !== 'es'); // igual que Fase 2 (incluye EN)
        const idiomasInfo = idiomasBase.filter(l => l !== 'es' && l !== 'en'); // igual que Fase 3

        const h = activeStateContainer.headers;
        const indiceCastellanoBase = h.findIndex(x => x && x.toUpperCase() === 'NOMBRE_ES');
        const indiceAlergenos = h.findIndex(x => x && x.toUpperCase().replace(/[^A-Z]/g, '') === 'ALERGENOSCOD');
        const indiceId = h.findIndex(x => x && x.toUpperCase() === 'ID');
        const indiceCarpeta = h.findIndex(x => x && x.toUpperCase() === 'CARPETA');
        const indiceInfoEs = h.findIndex(x => x && x.toUpperCase() === 'INFO_ES');
        const indiceInfoEn = h.findIndex(x => x && x.toUpperCase() === 'INFO_EN');
        const indiceHashNombre = h.findIndex(x => x && x.toUpperCase() === 'INFO_HASH_NOMBRE');
        const indiceHashFicha = h.findIndex(x => x && x.toUpperCase() === 'INFO_HASH_FICHA');

        if (indiceCastellanoBase === -1 || indiceHashNombre === -1 || indiceHashFicha === -1) {
            return window.UI.log("[Error Crítico] Faltan columnas base obligatorias para revisar consistencia.");
        }

        const indicesNombreObjetivo = {};
        idiomasNombres.forEach(l => { indicesNombreObjetivo[l] = h.findIndex(x => x && x.toUpperCase() === `NOMBRE_${l.toUpperCase()}`); });
        const indicesInfoObjetivo = {};
        idiomasInfo.forEach(l => { indicesInfoObjetivo[l] = h.findIndex(x => x && x.toUpperCase() === `INFO_${l.toUpperCase()}`); });

        const techoLimiteEvaluacion = Math.min(rangoFin, activeStateContainer.csvData.length);
        const CARPETAS_SIN_IA = ['cafe', 'refrescos', 'cerveza'];

        window.UI.log("[Paso 4] Revisando consistencia: ¿ha cambiado el nombre/ingredientes o los alérgenos de algún plato desde que se generaron sus traducciones?...");

        const filasNombreDesincronizado = [];
        const filasFichaDesincronizada = [];
        let bautizosNuevos = 0; // filas sin huella previa (nunca revisadas): se les asigna la huella actual sin tocar nada más

        for (let i = Math.max(0, rangoInicio); i < techoLimiteEvaluacion; i++) {
            const row = activeStateContainer.csvData[i];
            while (row.length < h.length) row.push("");

            const idValor = indiceId !== -1 ? parseInt(row[indiceId]) : NaN;
            const carpetaValor = indiceCarpeta !== -1 ? (row[indiceCarpeta] || "").trim().toLowerCase() : "";
            const esCabeceraCategoria = !isNaN(idValor) && idValor >= 1 && idValor <= 12;
            const esBebidaSimple = CARPETAS_SIN_IA.includes(carpetaValor);
            if (esCabeceraCategoria || esBebidaSimple) continue;

            const nombreEsActual = row[indiceCastellanoBase] || "";
            if (!nombreEsActual) continue; // fila vacía, nada que revisar

            const alergenosActual = indiceAlergenos !== -1 ? (row[indiceAlergenos] || "") : "";
            const hashNombreActual = window.calcularHashContenido(nombreEsActual);
            const hashFichaActual = window.calcularHashContenido(`${nombreEsActual}|${alergenosActual}`);
            const hashNombreGuardado = (row[indiceHashNombre] || "").trim();
            const hashFichaGuardado = (row[indiceHashFicha] || "").trim();

            // --- Consistencia de NOMBRE_<idioma> ---
            if (!hashNombreGuardado) {
                row[indiceHashNombre] = hashNombreActual; // primera vez: se toma como línea base, sin tocar traducciones
                bautizosNuevos++;
            } else if (hashNombreGuardado !== hashNombreActual) {
                idiomasNombres.forEach(l => { if (indicesNombreObjetivo[l] !== -1) row[indicesNombreObjetivo[l]] = ""; });
                row[indiceHashNombre] = "";
                filasNombreDesincronizado.push(i + 2);
            }

            // --- Consistencia de la ficha (INFO_ES/EN/otros idiomas) ---
            const infoEsActual = indiceInfoEs !== -1 ? (row[indiceInfoEs] || "").trim() : "";
            if (infoEsActual) {
                if (!hashFichaGuardado) {
                    row[indiceHashFicha] = hashFichaActual; // primera vez: línea base, sin tocar la ficha
                    bautizosNuevos++;
                } else if (hashFichaGuardado !== hashFichaActual) {
                    if (indiceInfoEs !== -1) row[indiceInfoEs] = "";
                    if (indiceInfoEn !== -1) row[indiceInfoEn] = "";
                    idiomasInfo.forEach(l => { if (indicesInfoObjetivo[l] !== -1) row[indicesInfoObjetivo[l]] = ""; });
                    row[indiceHashFicha] = "";
                    filasFichaDesincronizada.push(i + 2);
                }
            }
        }

        if (typeof window.UI.renderTable === 'function') window.UI.renderTable();

        if (filasNombreDesincronizado.length === 0 && filasFichaDesincronizada.length === 0) {
            return window.UI.log(`[FIN Revisión] Todo consistente. No se ha detectado ningún plato con el nombre/alérgenos cambiados desde su última generación.${bautizosNuevos > 0 ? ` (${bautizosNuevos} huella(s) inicial(es) registrada(s) por primera vez).` : ''}`);
        }

        if (filasNombreDesincronizado.length > 0) {
            window.UI.log(`[Revisión] Nombre/ingredientes cambiados en ${filasNombreDesincronizado.length} plato(s) (filas ${filasNombreDesincronizado.join(', ')}). Traducciones de nombre vaciadas para regenerarlas en todos los idiomas.`);
        }
        if (filasFichaDesincronizada.length > 0) {
            window.UI.log(`[Revisión] Nombre/alérgenos cambiados en ${filasFichaDesincronizada.length} plato(s) (filas ${filasFichaDesincronizada.join(', ')}) — la ficha (descripción + preguntas/respuestas) había quedado desactualizada. Ficha vaciada en todos los idiomas para regenerarla.`);
        }

        const listaClavesAPI = (typeof getKeys === 'function') ? getKeys() : [];
        if (listaClavesAPI.length === 0) {
            return window.UI.log("[Info] Se han detectado y limpiado los desajustes de arriba, pero falta al menos una API Key para regenerarlos automáticamente. Introduce una Key y pulsa \"Traducir Platos...\" / \"Generar Info Platos ES/EN\" / \"Generar Info Platos Otros Idiomas\" para completarlo.");
        }

        window.UI.log("[Revisión] Regenerando automáticamente lo detectado...");

        if (filasNombreDesincronizado.length > 0 && !procesoState.detenido) {
            await window.UI.iniciarTraduccionNombresPorLotes(activeStateContainer);
        }
        if (filasFichaDesincronizada.length > 0 && !procesoState.detenido) {
            await window.UI.iniciarTraduccionPorLotes(activeStateContainer);
            if (!procesoState.detenido) await window.UI.iniciarInfoOtrosIdiomasPorLotes(activeStateContainer);
        }

        // NUEVO: igual que en ui-batch-auditoria.js — no dar por "completada" la corrección sin
        // comprobar si el usuario canceló/pausó o se agotó la cuota a mitad de la regeneración.
        if (procesoState.detenido) {
            window.UI.log("[FIN Revisión] Regeneración detenida antes de terminar (revisa los mensajes [FIN - INCOMPLETO] de arriba: puede quedar ficha o nombre pendiente en algún idioma). Vuelve a pulsar los botones de generación correspondientes para completar lo que falte, y luego \"☁️ Sincronizar con Google Sheet\".");
        } else {
            window.UI.log("[FIN Revisión] Corrección automática completada. Revisa el resto de mensajes de arriba y, cuando quieras guardar los cambios de verdad, pulsa \"☁️ Sincronizar con Google Sheet\".");
        }
    }
};
