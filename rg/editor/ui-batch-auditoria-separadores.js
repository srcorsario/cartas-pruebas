// =========================================
// REPOSITORIO: Web_Editor_Pro_v3 (PRINCIPAL)
// ARCHIVO: ui-batch-auditoria-separadores.js
// FASE 6 (NUEVA): Auditoría de separadores "//" en los nombres traducidos.
// Igual de espíritu que ui-batch-auditoria.js (auditoría de alérgenos): comprueba
// el estado REAL actual, sin depender de huellas/hash ni de si algo ha cambiado
// desde la última generación — por eso también detecta fallos ya existentes de
// ANTES de este sistema (p.ej. traducciones donde la IA sustituyó "//" por un
// guion u otro signo, algo que revisarConsistencia() (Fase 4) NUNCA detecta
// porque el NOMBRE_ES de origen no ha cambiado, solo la traducción salió mal).
//
// Qué comprueba: para cada fila cuyo NOMBRE_ES contiene "//" (plato con segunda
// línea de ingredientes/opciones, o vino con variedad de uva), revisa cada
// NOMBRE_<idioma> ya traducido (no vacío) y avisa si el NÚMERO de opciones
// "//...//" de esa traducción no coincide con el del español — típicamente
// porque el modelo sustituyó "//" por otro signo de puntuación (0 opciones en
// vez de las esperadas), o porque en un elemento con VARIAS opciones (p.ej.
// "Mix de Gyozas //Pato// , //Langostino// , //Pollo//") solo tradujo la
// primera y omitió el resto (menos opciones de las esperadas).
//
// Qué hace al detectar un desajuste: vacía SOLO la(s) celda(s) de idioma
// afectada(s) de esa fila (no toda la fila, no el resto de idiomas que sí están
// bien) para que la Fase 2 (iniciarTraduccionNombresPorLotes) las trate como
// pendientes y las regenere con el prompt ya reforzado. No inventa nada nuevo:
// reutiliza el mismo pipeline de IA ya existente.
// Botón: "Auditar Separadores // Ahora".
// =========================================

import { stateContainer, procesoState, asegurarColumnasEstructura } from './ui-state.js';

export const UIBatchAuditoriaSeparadores = {
    auditarSeparadores: async (stateContainerParam) => {
        const activeStateContainer = stateContainerParam || stateContainer;
        if (!activeStateContainer || !activeStateContainer.headers || !activeStateContainer.csvData) return window.UI.log("[Error] Estructura de datos vacía.");
        if (typeof window.desglosarNombre !== 'function') return window.UI.log("[Error Crítico] Falta desglosarNombre() (utils.js) — no se puede auditar separadores.");

        window.UI.log("[Info] Asegurando estructura de columnas en memoria...");
        asegurarColumnasEstructura(activeStateContainer);

        const selectorInicio = document.getElementById('rangoInicio');
        const selectorFin = document.getElementById('rangoFin');
        const rangoInicio = selectorInicio ? (parseInt(selectorInicio.value) - 2 || 0) : 0;
        const rangoFin = selectorFin ? (parseInt(selectorFin.value) - 1 || activeStateContainer.csvData.length) : activeStateContainer.csvData.length;

        const h = activeStateContainer.headers;
        const indiceCastellanoBase = h.findIndex(x => x && x.toUpperCase() === 'NOMBRE_ES');
        const indiceId = h.findIndex(x => x && x.toUpperCase() === 'ID');
        const indiceCarpeta = h.findIndex(x => x && x.toUpperCase() === 'CARPETA');
        const indiceHashNombre = h.findIndex(x => x && x.toUpperCase() === 'INFO_HASH_NOMBRE');

        if (indiceCastellanoBase === -1) {
            return window.UI.log("[Error Crítico] Falta la columna base obligatoria NOMBRE_ES.");
        }

        // Igual que Fase 2/4: todos los idiomas configurados excepto ES (EN incluido, porque
        // también se traduce por IA y puede sufrir el mismo problema).
        const idiomasBase = (window.IDIOMAS_ORDEN && window.IDIOMAS_ORDEN.length) ? window.IDIOMAS_ORDEN : Object.keys(window.IDIOMAS_CONFIG || {}).map(l => l.toLowerCase());
        const idiomasObjetivo = idiomasBase.filter(l => l !== 'es');
        const indicesObjetivo = {};
        idiomasObjetivo.forEach(l => { indicesObjetivo[l] = h.findIndex(x => x && x.toUpperCase() === `NOMBRE_${l.toUpperCase()}`); });

        const techoLimiteEvaluacion = Math.min(rangoFin, activeStateContainer.csvData.length);
        const CARPETAS_SIN_IA = ['cafe', 'refrescos', 'cerveza'];

        window.UI.log("[Paso 6] Auditando separadores \"//\": comprobando, plato a plato, si cada NOMBRE_ES con \"//\" tiene también el \"//\" en las traducciones que ya existen (sin depender de si algo ha cambiado)...");

        const filasConDesajuste = [];
        let revisados = 0, conSeparadorEnEs = 0;

        for (let i = Math.max(0, rangoInicio); i < techoLimiteEvaluacion; i++) {
            const row = activeStateContainer.csvData[i];
            while (row.length < h.length) row.push("");

            const idValor = indiceId !== -1 ? parseInt(row[indiceId]) : NaN;
            const carpetaValor = indiceCarpeta !== -1 ? (row[indiceCarpeta] || "").trim().toLowerCase() : "";
            const esCabeceraCategoria = !isNaN(idValor) && idValor >= 1 && idValor <= 12;
            const esBebidaSimple = CARPETAS_SIN_IA.includes(carpetaValor);
            if (esCabeceraCategoria || esBebidaSimple) continue;

            const nombreEsActual = row[indiceCastellanoBase] || "";
            if (!nombreEsActual) continue;

            revisados++;
            const desglosadoEs = window.desglosarNombre(nombreEsActual);
            if (desglosadoEs.opciones.length === 0) continue; // este plato/vino no usa "//": nada que auditar
            conSeparadorEnEs++;

            const idiomasAfectados = [];
            const detalleAfectados = [];
            idiomasObjetivo.forEach(l => {
                const idx = indicesObjetivo[l];
                if (idx === -1) return;
                const valor = (row[idx] || "").trim();
                if (!valor) return; // aún no traducido: no es un fallo, es simplemente pendiente (lo cubre la Fase 2)
                const desglosadoTraduccion = window.desglosarNombre(valor);
                // NUEVO: no basta con comprobar que haya AL MENOS una opción — en elementos con
                // varias opciones (p.ej. una lista de sabores/rellenos, cada uno en su propio
                // "//...//"), el modelo puede quedarse solo con la primera y omitir el resto sin
                // que el separador "//" llegue a desaparecer del todo (opciones.length seguiría
                // siendo > 0, solo que menor de lo esperado). Se compara el NÚMERO exacto de
                // opciones contra el español para detectar también esa pérdida parcial.
                if (desglosadoTraduccion.opciones.length !== desglosadoEs.opciones.length) {
                    idiomasAfectados.push(l.toUpperCase());
                    detalleAfectados.push(`${l.toUpperCase()} (${desglosadoTraduccion.opciones.length}/${desglosadoEs.opciones.length} opciones)`);
                }
            });

            if (idiomasAfectados.length > 0) {
                filasConDesajuste.push({ fila: i + 2, nombre: nombreEsActual, idiomasAfectados, detalleAfectados, indiceRow: i });
            }
        }

        window.UI.log(`[Auditoría //] Revisados ${revisados} platos/vinos (${conSeparadorEnEs} con "//" en NOMBRE_ES). Desajustes encontrados: ${filasConDesajuste.length}.`);

        if (filasConDesajuste.length === 0) {
            return window.UI.log("[FIN Auditoría //] Ningún desajuste detectado: todas las traducciones ya generadas de platos/vinos con \"//\" mantienen el separador. ⚠️ Recuerda que esto es una comprobación de formato (¿aparece \"//\"?), no revisa que el contenido en sí de cada idioma sea correcto.");
        }

        filasConDesajuste.forEach(item => {
            window.UI.log(`[Auditoría //] Fila ${item.fila} ("${item.nombre}"): número de opciones "//" incorrecto en → ${item.detalleAfectados.join(', ')}.`);
        });

        // Vaciar SOLO las celdas de idioma afectadas (no toda la fila) para que la Fase 2 las
        // trate como pendientes y las regenere con el prompt ya reforzado contra este fallo.
        // No se toca INFO_HASH_NOMBRE: el NOMBRE_ES no ha cambiado, así que la huella sigue
        // siendo válida y la Fase 2 la recalculará igualmente al completar la fila.
        filasConDesajuste.forEach(item => {
            const row = activeStateContainer.csvData[item.indiceRow];
            item.idiomasAfectados.forEach(lUpper => {
                const idx = indicesObjetivo[lUpper.toLowerCase()];
                if (idx !== -1) row[idx] = "";
            });
        });

        if (typeof window.UI.renderTable === 'function') window.UI.renderTable();
        window.UI.log(`[Auditoría //] Celda(s) de traducción vaciada(s) en ${filasConDesajuste.length} plato(s)/vino(s), solo en los idiomas afectados, para poder regenerarlas.`);

        const listaClavesAPI = (typeof getKeys === 'function') ? getKeys() : [];
        if (listaClavesAPI.length === 0) {
            return window.UI.log("[Info] Se han detectado y limpiado los desajustes de arriba, pero falta al menos una API Key para regenerarlos automáticamente. Introduce una Key y pulsa \"Traducir Platos en ES a Todos los Idiomas Faltantes\" para completarlo.");
        }

        window.UI.log("[Auditoría //] Regenerando automáticamente las celdas vaciadas...");
        procesoState.detenido = false; procesoState.pausado = false;
        await window.UI.iniciarTraduccionNombresPorLotes(activeStateContainer);

        if (procesoState.detenido) {
            window.UI.log("[FIN Auditoría //] Regeneración detenida antes de terminar (revisa el mensaje [FIN - INCOMPLETO] de arriba: puede quedar algún idioma pendiente). Vuelve a pulsar \"Traducir Platos en ES a Todos los Idiomas Faltantes\" para completar lo que falte, y luego \"☁️ Sincronizar con Google Sheet\".");
        } else {
            window.UI.log("[FIN Auditoría //] Corrección automática completada. Revisa el resto de mensajes de arriba y, cuando quieras guardar los cambios de verdad, pulsa \"☁️ Sincronizar con Google Sheet\".");
        }
    }
};
