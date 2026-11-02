// --- utils.js ---
// Funciones puras de procesamiento de texto y datos.
// No leen del DOM, no escriben en el DOM, no modifican variables globales.
// Se cargan antes que app.js y sugerencias-print.js para estar disponibles globalmente.

/**
 * Separa el nombre principal de los detalles/uvas usando el separador '//'
 * MODIFICADO: además de nombre/uvas (compatibilidad con el campo dedicado de uva de los
 * vinos, que sigue leyendo solo la primera pareja "//.../ /"), ahora también devuelve
 * "opciones": el array COMPLETO de palabras entre "//.../ /" en orden (sabores, ingredientes
 * intercambiables...), usado por la rueda de "Opciones del plato" en abrirEditor(). Los
 * índices IMPARES del split (1, 3, 5...) son siempre opciones; los PARES son el nombre y el
 * texto de relleno entre opciones (", ", " - "...), que se descarta — a propósito no se
 * filtran los trozos vacíos ANTES de separar, para no desplazar esa paridad.
 * @param {String} texto
 * @returns {Object} { nombre: String, uvas: String, opciones: String[] }
 */
/**
 * NUEVO (30 oct): ¿es este ID un vino de la carta (13000-14999)? Antes se usaba "id >= 13000",
 * que ahora también atraparía la Hoja de Postres (16000-16299) y la trataría como vino.
 */
function esIdVino(id) {
    const n = parseInt(id, 10);
    return n >= 13000 && n < 15000;
}

function desglosarNombre(texto) {
    if (!texto) return { nombre: "", uvas: "", opciones: [] };
    const partes = texto.split('//');
    const nombre = partes[0] ? partes[0].trim() : "";
    const opciones = [];
    for (let i = 1; i < partes.length; i += 2) {
        const tok = partes[i] ? partes[i].trim() : "";
        if (tok !== "") opciones.push(tok);
    }
    return { nombre, uvas: opciones[0] || "", opciones };
}

/**
 * NUEVO: inversa de desglosarNombre() — reconstruye "Nombre //opcion// , //opcion//..." a
 * partir de { nombre, opciones }, en el mismo formato que ya esperan desglosarNombre() al
 * releerlo, la web pública (processName/generateItemHtml) y el editor.
 *
 * IMPORTANTE — bug real que motivó esta función: en varios sitios del proyecto se
 * reconstruía el texto a mano como `nombre + ' // ' + desglosado.uvas`. Pero ".uvas" es
 * SOLO la PRIMERA opción (ver desglosarNombre arriba) — para un plato con varias opciones
 * (p.ej. "Mix de Gyozas //Pato// , //Langostino// , //Pollo//") esa reconstrucción a mano
 * descartaba silenciosamente todo menos "Pato" ANTES de que ese texto llegara a ningún
 * sitio (incluida la IA al traducir — por mucho que el prompt cuente los "//", si el texto
 * que recibe ya viene truncado a una sola opción no hay nada que contar). Usa SIEMPRE esta
 * función en vez de reconstruir con ".uvas" a mano.
 * @param {{nombre: String, opciones: String[]}} desglosado
 * @returns {String}
 */
function reconstruirNombreConOpciones(desglosado) {
    const nombre = (desglosado && desglosado.nombre) || "";
    const opciones = (desglosado && desglosado.opciones) || [];
    if (opciones.length === 0) return nombre;
    return `${nombre} //${opciones.join('// , //')}//`;
}

/**
 * Limpia comillas dobles redundantes típicas de exportaciones CSV
 * @param {String} texto 
 * @returns {String}
 */
function superLimpiar(texto) {
    if (!texto) return "";
    let t = texto.toString().trim();
    if (t.startsWith('"') && t.endsWith('"')) t = t.substring(1, t.length - 1);
    t = t.replace(/""/g, '"');
    return t.trim();
}

/**
 * Formatea el nombre de un vino poniendo el nombre en mayúsculas 
 * pero respetando el contenido entre paréntesis (ej. la D.O.).
 * @param {String} texto 
 * @returns {String}
 */
function formatWineName(texto) {
    if (!texto) return "";
    const partes = texto.split('(');
    let nombrePrincipal = partes[0].toUpperCase();
    if (partes.length > 1) {
        return nombrePrincipal + '(' + partes.slice(1).join('(');
    }
    return nombrePrincipal;
}

/**
 * Busca y extrae el primer objeto JSON válido dentro de un string (incluso si tiene texto basura alrededor).
 * Ideal para respuestas de la IA que incluyen bloques de código markdown.
 * NUEVO: el conteo de llaves es consciente de las cadenas de texto — ignora cualquier '{' o '}' que
 * aparezca DENTRO de una cadena JSON (p.ej. si una traducción incluye una llave suelta en el texto),
 * y respeta comillas escapadas (\"). Antes contaba las llaves de todo el texto sin distinción, lo que
 * podía descuadrar el conteo y fallar con "No se encontró un JSON válido" aunque la respuesta de la
 * IA estuviera completa y bien formada.
 * @param {String} texto 
 * @returns {Object} El JSON parseado.
 * @throws {Error} Si no encuentra un JSON válido.
 */
/**
 * Hash determinista y corto (FNV-1a de 32 bits, en hexadecimal) de un texto.
 * NO es criptográfico: solo sirve como "huella" barata para detectar si un
 * texto ha cambiado respecto a la última vez que se generó/tradujo contenido
 * a partir de él (ver revisarConsistencia() en ui-batch-revision.js).
 * @param {String} texto
 * @returns {String} Hash en hexadecimal, p.ej. "a1b2c3d4"
 */
function calcularHashContenido(texto) {
    const normalizado = (texto || "").toString().trim().toUpperCase();
    let hash = 0x811c9dc5; // offset básico FNV-1a
    for (let i = 0; i < normalizado.length; i++) {
        hash ^= normalizado.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193); // primo FNV
    }
    return (hash >>> 0).toString(16);
}

/**
 * Concatena el texto de TODAS las "parts" de la respuesta de Gemini, no solo la primera.
 * MOTIVO: en respuestas largas (p.ej. traducir un plato a 24-25 idiomas en una sola llamada),
 * la API a veces reparte el texto generado en varias entradas dentro de content.parts[] en vez
 * de devolverlo entero en parts[0]. Leer solo parts[0].text corta la respuesta a la mitad y
 * provoca "JSON inválido" o "sin contenido" aunque finishReason sea "STOP" (la respuesta SÍ
 * estaba completa, solo repartida en varias partes).
 * @param {Object} candidato - candidates[0] de la respuesta de la API de Gemini (puede ser undefined)
 * @returns {String|undefined} el texto completo concatenado, o undefined si no hay partes con texto
 */
function extraerTextoCompletoRespuesta(candidato) {
    const partes = candidato && candidato.content && candidato.content.parts;
    if (!Array.isArray(partes) || partes.length === 0) return undefined;
    const texto = partes.map(p => (p && typeof p.text === 'string') ? p.text : '').join('');
    return texto || undefined;
}

/**
 * Formatea una duración en segundos a un texto legible tipo "1m 23s" o "45s".
 * Usado por las Fases 1/2/3 para mostrar cuánto tarda cada lote de la IA y estimar,
 * a partir de la media de los lotes ya completados en la tanda actual, cuánto falta.
 * @param {Number} segundos
 * @returns {String}
 */
function formatearDuracion(segundos) {
    const s = Math.max(0, Math.round(segundos || 0));
    const min = Math.floor(s / 60);
    const seg = s % 60;
    if (min <= 0) return `${seg}s`;
    return `${min}m ${seg}s`;
}

function extraerJSON(texto) {
    let limpio = texto.replace(/```json/g, '').replace(/```/g, '').trim();
    let braceCount = 0;
    let startIndex = -1;
    let dentroDeString = false;
    let escapado = false;

    for (let i = 0; i < limpio.length; i++) {
        const ch = limpio[i];

        if (dentroDeString) {
            if (escapado) {
                escapado = false;
            } else if (ch === '\\') {
                escapado = true;
            } else if (ch === '"') {
                dentroDeString = false;
            }
            continue; // dentro de una cadena: ignorar '{'/'}' hasta que cierre
        }

        if (ch === '"') {
            dentroDeString = true;
            continue;
        }

        if (ch === '{') {
            if (braceCount === 0) startIndex = i;
            braceCount++;
        } else if (ch === '}') {
            braceCount--;
            if (braceCount === 0 && startIndex !== -1) {
                const jsonString = limpio.substring(startIndex, i + 1);
                try {
                    return JSON.parse(jsonString);
                } catch (e) {
                    console.error("JSON aislado pero inválido:", jsonString);
                    throw new Error("JSON inválido: " + e.message);
                }
            }
        }
    }
    throw new Error("No se encontró un JSON válido en la respuesta de la IA.");
}

// =================================================================================
// 25 sept -- fetchConTimeout: wrapper de fetch() con límite de tiempo (AbortController).
// DIAGNÓSTICO (HAR "pedido_v1.har" que envió el usuario): la carga inicial de la web tardaba
// más de 1 minuto y medio en total porque varias peticiones a Apps Script (RG/US Open ?accion=
// csv/categorias, Menús Especiales ?accion=listarMenus/listarPlatosManuales) se quedaban
// colgadas entre 2 y 35 SEGUNDOS cada una antes de responder (a veces con un 404 al final, en
// vez de los datos) -- Apps Script, en el plan gratuito, sirve estas peticiones con mucha cola/
// latencia quando varias llegan seguidas o el proyecto llevaba un rato sin usarse ("cold
// start"). Sin límite de tiempo, el navegador espera lo que Apps Script tarde, por lento que
// sea, antes de poder caer al respaldo (CSV publicado) o reintentar -- por eso una sola
// petición podía comerse 30+ segundos de la carga.
// Uso: fetchConTimeout(url, opciones, milisegundos) -- misma firma que fetch(), con un 3er
// parámetro opcional (por defecto 9000ms). Si no responde a tiempo, aborta esa petición
// concreta y lanza un error (mensaje "Tiempo de espera agotado...") en vez de dejarla colgada,
// para que el código que llama pueda caer a un respaldo o reintentar cuanto antes.
// -----------------------------------------------------------------------------------------
window.fetchConTimeout = function fetchConTimeout(url, opciones, msTimeout) {
    const timeout = msTimeout || 9000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const opcionesFinal = Object.assign({}, opciones || {}, { signal: controller.signal });
    return fetch(url, opcionesFinal)
        .catch(err => {
            if (err && err.name === 'AbortError') {
                throw new Error('Tiempo de espera agotado (' + Math.round(timeout / 1000) + 's) esperando respuesta del servidor.');
            }
            throw err;
        })
        .finally(() => clearTimeout(timer));
};
