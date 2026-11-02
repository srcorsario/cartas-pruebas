// =========================================
// REPOSITORIO: Web_Editor_Pro_v3 (PRINCIPAL)
// ARCHIVO: ui-state.js
// Estado compartido entre los demás módulos de ui.js y el helper de
// estructura de columnas. Es la parte que menos cambia: solo se toca al
// añadir un idioma nuevo o un campo de estado global nuevo.
// =========================================

export const stateContainer = {
    headers: [],
    csvData: [],
    currentProMode: 'restaurante001'
};

// Estado del proceso de lotes (generación de info / traducción de nombres),
// compartido entre inicializarAjustesExpertos (botones Pausar/Cancelar, en
// ui-core.js) y los dos flujos de lotes (ui-batch-info.js / ui-batch-nombres.js).
export const procesoState = {
    currentKeyIndex: 0,
    detenido: false,
    pausado: false
};

// Idioma actualmente seleccionado en la vista de tabla (pestaña "3. Editor Pro").
export const langState = {
    activeLang: 'EN'
};

export function asegurarColumnasEstructura(container) {
    if (!container || !container.headers || !container.csvData) {
        console.error("[CRÍTICO] Contenedor de datos inválido en asegurarColumnasEstructura");
        return;
    }

    console.log("-----------------------------------------");
    console.log("[DIAGNÓSTICO] 1. Columnas originales leídas del CSV:");
    console.log(JSON.stringify(container.headers));
    console.log("-----------------------------------------");

    const idiomasConfigurados = Object.keys(window.IDIOMAS_CONFIG || {
        "ES": 1, "EN": 1, "DE": 1, "FR": 1, "IT": 1, "RU": 1, "NL": 1, "PL": 1,
        "SV": 1, "NO": 1, "DA": 1, "FI": 1, "PT": 1, "RO": 1, "HU": 1, "CS": 1,
        "EL": 1, "TR": 1, "AR": 1, "ZH": 1, "JA": 1, "CA": 1, "EU": 1, "GL": 1,
        "VA": 1, "KO": 1
    });

    container.headers = container.headers.map(h => h ? String(h).trim() : "");

    let columnasCreadasNuevas = [];

    idiomasConfigurados.forEach(lang => {
        const nombreHeader = `NOMBRE_${lang}`;
        if (!container.headers.some(h => h.toUpperCase() === nombreHeader.toUpperCase())) {
            container.headers.push(nombreHeader);
            columnasCreadasNuevas.push(nombreHeader);
        }

        const infoHeader = `INFO_${lang}`;
        if (!container.headers.some(h => h.toUpperCase() === infoHeader.toUpperCase())) {
            container.headers.push(infoHeader);
            columnasCreadasNuevas.push(infoHeader);
        }
    });

    // NUEVO: columnas de "huella" (hash) usadas por revisarConsistencia() (ui-batch-revision.js)
    // para detectar si NOMBRE_ES o ALERGENOS_COD han cambiado desde la última vez que se
    // generaron/tradujeron los nombres o la ficha (INFO_*) de un plato. Empiezan por "INFO_"
    // a propósito: así Código.gs las conserva automáticamente al guardar (ver doPost), sin
    // necesidad de tocar la lista de cabeceras fijas del backend.
    ['INFO_HASH_NOMBRE', 'INFO_HASH_FICHA'].forEach(nombreHeader => {
        if (!container.headers.some(h => h.toUpperCase() === nombreHeader)) {
            container.headers.push(nombreHeader);
            columnasCreadasNuevas.push(nombreHeader);
        }
    });

    console.log("[DIAGNÓSTICO] 2. Columnas nuevas creadas/añadidas en memoria:");
    console.log(columnasCreadasNuevas.length > 0 ? JSON.stringify(columnasCreadasNuevas) : "Ninguna (todas ya existían)");
    console.log("-----------------------------------------");

    const totalColumnas = container.headers.length;
    container.csvData.forEach((row) => {
        while (row.length < totalColumnas) {
            row.push("");
        }
    });

    console.log(`[DIAGNÓSTICO] 3. Listado total definitivo de columnas en memoria (${totalColumnas} columnas):`);
    container.headers.forEach((h, index) => {
        console.log(`  [Columna índice ${index}] -> ${h}`);
    });
    console.log("=========================================");
}
