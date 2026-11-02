// =========================================
// REPOSITORIO: Web_Editor_Pro_v3 (PRINCIPAL)
// ARCHIVO: ui-batch-auditoria.js
// FASE 5 (NUEVA): Auditoría de alérgenos ES/EN. A diferencia de
// ui-batch-revision.js (que solo detecta CAMBIOS futuros, comparando contra
// una huella guardada la última vez que se generó contenido), esta fase
// comprueba el estado REAL actual: para cada plato, lee la lista oficial de
// alérgenos (ALERGENOS_COD) y el texto de la respuesta r3 ("¿Contiene este
// plato algún alérgeno?") dentro de INFO_ES e INFO_EN, y avisa si no
// coinciden — sin depender de si hay o no una huella previa. Así también
// detecta desajustes que ya existieran ANTES de instalar el sistema de
// huellas (ui-batch-revision.js), algo que ese otro sistema no puede ver por
// no tener memoria de cómo estaban los datos en el pasado.
//
// Es una comprobación por palabras clave (sin IA, gratuita e instantánea):
// no es infalible al 100% (una redacción muy inusual podría no detectarse,
// o un texto ambiguo dar un falso aviso), pero cubre el caso real que
// importa: un alérgeno añadido/quitado en ALERGENOS_COD cuyo texto NO se
// actualizó. Se limita a ES/EN porque son los dos idiomas que la IA redacta
// de forma independiente (el resto son traducciones de ES) — si ES/EN están
// bien, el resto de idiomas hereda esa misma corrección en cuanto se
// (re)traducen.
// Botón: "Auditar Alérgenos Ahora (ES/EN)".
// =========================================

import { stateContainer, procesoState, asegurarColumnasEstructura } from './ui-state.js';

// Palabras/raíces reconocibles por alérgeno, en ES y EN, para buscar dentro del texto
// natural de r3 (ver REGLA ESTRICTA DE ALÉRGENOS en prompts.js: la IA debe usar el
// "nombre común" del alérgeno, nunca el código en bruto — por eso se buscan palabras,
// no el código literal).
const PALABRAS_CLAVE_ALERGENOS = {
    GLUTEN: { es: ['gluten'], en: ['gluten'] },
    CRUSTACEO: { es: ['crustace'], en: ['crustacean', 'shellfish'] },
    HUEVO: { es: ['huevo'], en: ['egg'] },
    PESCADO: { es: ['pescado', 'pez'], en: ['fish'] },
    CACAHUETE: { es: ['cacahuete', 'mani', 'maní'], en: ['peanut'] },
    SOJA: { es: ['soja', 'soya'], en: ['soy'] },
    LACTOSA: { es: ['lactosa', 'lacteo', 'lácteo', 'leche'], en: ['lactose', 'dairy', 'milk'] },
    FRUTOSCASCARA: { es: ['frutos secos', 'frutos de cascara', 'frutos de cáscara', 'cascara'], en: ['tree nut', 'nuts'] },
    APIO: { es: ['apio'], en: ['celery'] },
    MOSTAZA: { es: ['mostaza'], en: ['mustard'] },
    SESAMO: { es: ['sesamo', 'sésamo', 'ajonjoli', 'ajonjolí'], en: ['sesame'] },
    SULFITOS: { es: ['sulfito'], en: ['sulphite', 'sulfite', 'sulphur dioxide', 'sulfur dioxide'] },
    ALTRAMUCES: { es: ['altramu', 'lupino'], en: ['lupin'] },
    MOLUSCO: { es: ['molusco'], en: ['mollusc', 'mollusk'] },
    VEGETARIANO: { es: ['vegetarian'], en: ['vegetarian'] },
    VEGANO: { es: ['vegan'], en: ['vegan'] }
};

function normalizarTexto(texto) {
    return (texto || "").toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Devuelve el conjunto (Set) de códigos de alérgeno detectados dentro de un texto libre.
function detectarAlergenosEnTexto(texto, idioma) {
    const normalizado = normalizarTexto(texto);
    const encontrados = new Set();
    Object.keys(PALABRAS_CLAVE_ALERGENOS).forEach(codigo => {
        const palabras = PALABRAS_CLAVE_ALERGENOS[codigo][idioma] || [];
        if (palabras.some(p => normalizado.indexOf(normalizarTexto(p)) !== -1)) encontrados.add(codigo);
    });
    return encontrados;
}

export const UIBatchAuditoria = {
    auditarAlergenos: async (stateContainerParam) => {
        const activeStateContainer = stateContainerParam || stateContainer;
        if (!activeStateContainer || !activeStateContainer.headers || !activeStateContainer.csvData) return window.UI.log("[Error] Estructura de datos vacía.");

        window.UI.log("[Info] Asegurando estructura de columnas en memoria...");
        asegurarColumnasEstructura(activeStateContainer);

        const selectorInicio = document.getElementById('rangoInicio');
        const selectorFin = document.getElementById('rangoFin');
        const rangoInicio = selectorInicio ? (parseInt(selectorInicio.value) - 2 || 0) : 0;
        const rangoFin = selectorFin ? (parseInt(selectorFin.value) - 1 || activeStateContainer.csvData.length) : activeStateContainer.csvData.length;

        const h = activeStateContainer.headers;
        const indiceCastellanoBase = h.findIndex(x => x && x.toUpperCase() === 'NOMBRE_ES');
        const indiceAlergenos = h.findIndex(x => x && x.toUpperCase().replace(/[^A-Z]/g, '') === 'ALERGENOSCOD');
        const indiceId = h.findIndex(x => x && x.toUpperCase() === 'ID');
        const indiceCarpeta = h.findIndex(x => x && x.toUpperCase() === 'CARPETA');
        const indiceInfoEs = h.findIndex(x => x && x.toUpperCase() === 'INFO_ES');
        const indiceInfoEn = h.findIndex(x => x && x.toUpperCase() === 'INFO_EN');
        const indiceHashFicha = h.findIndex(x => x && x.toUpperCase() === 'INFO_HASH_FICHA');

        if (indiceCastellanoBase === -1 || indiceAlergenos === -1 || indiceInfoEs === -1) {
            return window.UI.log("[Error Crítico] Faltan columnas base obligatorias (NOMBRE_ES, ALERGENOS_COD o INFO_ES).");
        }

        const techoLimiteEvaluacion = Math.min(rangoFin, activeStateContainer.csvData.length);
        const CARPETAS_SIN_IA = ['cafe', 'refrescos', 'cerveza'];

        window.UI.log("[Paso 5] Auditando alérgenos: comparando ALERGENOS_COD actual contra lo que dicen realmente INFO_ES / INFO_EN ahora mismo (sin depender de huellas ni de si cambió algo)...");

        const filasConDesajuste = [];
        let revisadas = 0, sinInfoAun = 0, huboSobrantes = false;

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

            const infoEsActual = (row[indiceInfoEs] || "").trim();
            if (!infoEsActual) { sinInfoAun++; continue; } // aún no generado: nada que auditar todavía

            revisadas++;

            const alergenosOficiales = new Set(
                (indiceAlergenos !== -1 ? (row[indiceAlergenos] || "") : "")
                    .split(',').map(s => s.trim().toUpperCase()).filter(s => s && s !== 'NINGUNO' && s !== '0')
            );

            const problemasFila = [];

            [{ lang: 'es', idx: indiceInfoEs }, { lang: 'en', idx: indiceInfoEn }].forEach(({ lang, idx }) => {
                if (idx === -1) return;
                let ficha = null;
                try { ficha = JSON.parse(row[idx] || ""); } catch (e) { ficha = null; }
                if (!ficha) return;
                const textoR3 = `${ficha.r3 || ''} ${ficha.q3 || ''}`;
                if (!textoR3.trim()) {
                    // Sin q3/r3: solo es un problema si SÍ hay alérgenos oficiales que deberían constar.
                    if (alergenosOficiales.size > 0) problemasFila.push(`${lang.toUpperCase()}: no tiene pregunta de alérgenos (q3/r3) pese a tener alérgenos registrados (${Array.from(alergenosOficiales).join(', ')})`);
                    return;
                }
                const mencionados = detectarAlergenosEnTexto(textoR3, lang);
                const faltan = Array.from(alergenosOficiales).filter(c => !mencionados.has(c));
                const sobran = Array.from(mencionados).filter(c => !alergenosOficiales.has(c));
                if (faltan.length > 0) problemasFila.push(`${lang.toUpperCase()}: registrado(s) pero no mencionado(s) en el texto → ${faltan.join(', ')}`);
                if (sobran.length > 0) { problemasFila.push(`${lang.toUpperCase()}: mencionado(s) en el texto pero NO registrado(s) en ALERGENOS_COD → ${sobran.join(', ')}`); huboSobrantes = true; }
            });

            if (problemasFila.length > 0) {
                filasConDesajuste.push({ fila: i + 2, nombre: nombreEsActual, problemas: problemasFila, indiceRow: i });
            }
        }

        window.UI.log(`[Auditoría] Revisados ${revisadas} platos con ficha generada (${sinInfoAun} aún sin ficha, omitidos). Desajustes encontrados: ${filasConDesajuste.length}.`);
        if (huboSobrantes) {
            window.UI.log(`⚠️ [Auditoría] IMPORTANTE: en al menos un plato el texto menciona un alérgeno que NO está marcado en ALERGENOS_COD. Esta auditoría siempre trata ALERGENOS_COD como la fuente de verdad — al "corregir", REESCRIBE el texto para que deje de mencionarlo, no añade el código. Si ese alérgeno es real, márcalo tú a mano en el editor de alérgenos de ese plato ANTES (o después) de fiarte de la ficha regenerada; si no, ignora este aviso.`);
        }

        if (filasConDesajuste.length === 0) {
            return window.UI.log("[FIN Auditoría] Ningún desajuste detectado entre ALERGENOS_COD y lo que dice el texto de ES/EN ahora mismo. ⚠️ Recuerda que esto es una comprobación por palabras clave, no 100% infalible — ante una duda puntual, revisa esa ficha a mano.");
        }

        filasConDesajuste.forEach(item => {
            window.UI.log(`[Auditoría] Fila ${item.fila} ("${item.nombre}"): ${item.problemas.join(' | ')}`);
        });

        // Vaciar la ficha (ES/EN/otros idiomas) + su huella de las filas con desajuste, para que
        // queden como "pendientes" y se puedan regenerar con el resto del pipeline ya existente
        // (igual que hace revisarConsistencia() al detectar un cambio).
        filasConDesajuste.forEach(item => {
            const row = activeStateContainer.csvData[item.indiceRow];
            if (indiceInfoEs !== -1) row[indiceInfoEs] = "";
            if (indiceInfoEn !== -1) row[indiceInfoEn] = "";
            if (indiceHashFicha !== -1) row[indiceHashFicha] = "";
            const idiomasBase = (window.IDIOMAS_ORDEN && window.IDIOMAS_ORDEN.length) ? window.IDIOMAS_ORDEN : Object.keys(window.IDIOMAS_CONFIG || {}).map(l => l.toLowerCase());
            idiomasBase.filter(l => l !== 'es' && l !== 'en').forEach(l => {
                const idx = h.findIndex(x => x && x.toUpperCase() === `INFO_${l.toUpperCase()}`);
                if (idx !== -1) row[idx] = "";
            });
        });

        if (typeof window.UI.renderTable === 'function') window.UI.renderTable();
        window.UI.log(`[Auditoría] Ficha vaciada en ${filasConDesajuste.length} plato(s) con desajuste, en todos los idiomas, para poder regenerarla.`);

        const listaClavesAPI = (typeof getKeys === 'function') ? getKeys() : [];
        if (listaClavesAPI.length === 0) {
            return window.UI.log("[Info] Falta al menos una API Key para regenerar automáticamente. Introduce una Key y pulsa \"Generar Info Platos ES/EN\" y después \"Generar Info Platos Otros Idiomas\" para completarlo.");
        }

        window.UI.log("[Auditoría] Regenerando automáticamente las fichas vaciadas...");
        procesoState.detenido = false; procesoState.pausado = false;
        await window.UI.iniciarTraduccionPorLotes(activeStateContainer);
        if (!procesoState.detenido) await window.UI.iniciarInfoOtrosIdiomasPorLotes(activeStateContainer);

        // NUEVO: el mensaje final ya no da por completado el trabajo sin comprobarlo — si el
        // usuario pulsó "Cancelar"/"Pausar" o se agotó la cuota a mitad de la regeneración
        // automática, aquí se avisa de que puede haber quedado contenido a medias en vez de
        // decir "completada" sin más (revisa el mensaje [FIN]/[FIN - INCOMPLETO] de cada fase
        // justo arriba para ver exactamente qué quedó pendiente).
        if (procesoState.detenido) {
            window.UI.log("[FIN Auditoría] Regeneración detenida antes de terminar (revisa los mensajes [FIN - INCOMPLETO] de arriba: puede quedar ficha pendiente en algún idioma). Vuelve a pulsar \"Generar Info Platos ES/EN\" y \"Generar Info Platos Otros Idiomas\" para completar lo que falte, y luego \"☁️ Sincronizar con Google Sheet\".");
        } else {
            window.UI.log("[FIN Auditoría] Corrección automática completada. Cuando quieras guardar los cambios de verdad, pulsa \"☁️ Sincronizar con Google Sheet\".");
        }
    }
};
