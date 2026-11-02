// --- config.js ---
// NUEVO: Registro de versión del archivo
window.APP_VERSIONS = window.APP_VERSIONS || {};
window.APP_VERSIONS.config = '2.8.0'; // NUEVO (30 oct): bloque HOJA IMPRIMIBLE DE POSTRES (rango 16000-16299). Anterior 2.7.0: // ACTUALIZADO (22 sept): WEB_APP_URL_RESTAURANTE001 vuelve a apuntar a OTRA implementación nueva de Codigo_RG.gs -- la anterior (AKfycbyNg...) enviaba "GUARDAR CAMBIOS EN WEB" sin error visible (alert de "Petición enviada") pero la hoja NUNCA se actualizaba (sospecha: "Quién tiene acceso" de esa implementación no estaba en "Cualquier usuario", así que Google bloqueaba en silencio las peticiones anónimas -- con no-cors el navegador no puede detectarlo). WEB_APP_URL_RESTAURANTE002 (US Open) no cambia en este commit.

// =====================================================================
// NUEVO: SISTEMA DE ENABLE/DISABLE DE RESTAURANTES (Desacoplamiento Visual)
// Activo: { enabled: true } - Desactivado: { enabled: false }
// =====================================================================
const RESTAURANTES_CONFIG = {
    restaurante001: { enabled: true },
    restaurante002: { enabled: true }
};

// NUEVO: Exposición global para que index.html pueda ocultar las pestañas
window.RESTAURANTES_CONFIG = RESTAURANTES_CONFIG;

// NUEVO: Función para comprobar si un restaurante está habilitado en la web antes de cargarlo
function isRestauranteA(modoInterno) {
    if (!modoInterno) return false;
    const config = RESTAURANTES_CONFIG[modoInterno];
    return config ? config.enabled : false;
}

// =====================================================================
// NUEVO: SISTEMA DE ALIAS DE MARCA (Desacoplamiento Visual)
// =====================================================================
const MODOS_ALIAS = {
    restaurante001: 'Roland Garros',
    restaurante002: 'US Open'
};

// NUEVO: Función helper para obtener el nombre visual seguro
function getModoAlias(modoInterno) {
    if (typeof modoInterno === 'undefined' || modoInterno === null) return '';
    return MODOS_ALIAS[modoInterno] || modoInterno;
}


// =====================================================================
// CONFIGURACIÓN DE REDES (Google Sheets & Web Apps)
// =====================================================================

// CONFIGURACION ROLAND GARROS (restaurante001)
const CSV_URL_RESTAURANTE001 = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT9rPlxpax2lE0rN97c6Hoy_OxUwREqRb48juEBr9C91ZFY2UvaKgC8JdiRcwDrtBErXFVmFRh0Zr5e/pub?gid=0&single=true&output=csv';
const WEB_APP_URL_RESTAURANTE001 = 'https://script.google.com/macros/s/AKfycbz6mX3oj9_-Kd-BiREXq318PPx3MeI8rdg4d8bFWuE6W7QhTih3rcgYOqExcFGgpD3YaA/exec';

// CONFIGURACION US OPEN (restaurante002)
const CSV_URL_RESTAURANTE002 = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSOWewZgqWZEFYiIMh8DTUX5tr6EEXBwvUJGr7hrpkCG91UhE5xU8fDJ12qcRVrT69xfZ5NGGGyhNCE/pub?output=csv';
const WEB_APP_URL_RESTAURANTE002 = 'https://script.google.com/macros/s/AKfycbweTq3o4NCOeBpZw-s65RgN9N311N5BLd1m9pA6_W9r6M_JdcxBsOrbyR8JLXAG9WbL/exec';

// MODIFICADO: Función auxiliar pura. Recibe el modo explícitamente.
function getWebAppUrl(modo) {
    if (modo === 'restaurante002') {
        return WEB_APP_URL_RESTAURANTE002;
    }
    return WEB_APP_URL_RESTAURANTE001;
}

// MODIFICADO: Función auxiliar pura. Recibe el modo explícitamente.
function getCsvUrl(modo) {
    if (modo === 'restaurante002') {
        return CSV_URL_RESTAURANTE002;
    }
    return CSV_URL_RESTAURANTE001;
}


// =====================================================================
// NUEVO: CONFIGURACIÓN DE INTELIGENCIA ARTIFICIAL (Gemini)
// =====================================================================
// MODIFICADO: pasado a v1beta + thinkingConfig:{thinkingBudget:0} en TODAS las llamadas (antes solo
// "Generar Info Platos Otros Idiomas" lo tenía). Motivo: con muchos idiomas configurados (25 en
// Roland Garros), Fase 1 (piloto/vino ES/EN) y sobre todo Fase 2 (traducir 1 nombre a los 25 idiomas
// de golpe) podían agotar los 65536 tokens de salida en "pensamiento" invisible de Gemini 2.5 antes
// de escribir la respuesta, devolviendo candidates[0].content.parts vacío ("La API no devolvió
// contenido") en TODAS las keys por igual — no era un problema de cuota, sino de esta petición
// concreta, así que rotar keys nunca lo arreglaba. Fase 3 ya usaba este mismo ajuste desde hace
// tiempo por el mismo motivo (24 idiomas de golpe) y funciona con fiabilidad, así que se iguala el
// resto de llamadas a ese comportamiento ya probado.
// MODIFICADO: modelo actualizado de gemini-2.5-flash a gemini-3.6-flash. Google ha empezado a
// devolver error 404 "This model models/gemini-2.5-flash is no longer available to new users"
// en las keys de los proyectos de Google Cloud más recientes (las keys de proyectos antiguos
// seguían funcionando con 2.5-flash con normalidad, solo daban 429 de cuota) — así que con
// varias keys de proyectos de distintas antigüedades convivía un modelo que unas keys ya no
// podían usar. gemini-3.6-flash es la versión estable/GA vigente a fecha de este cambio.
// MODIFICADO (2): se ha QUITADO thinkingConfig:{thinkingBudget:0} de generationConfig en TODAS
// las llamadas. Ese campo era válido para gemini-2.5-flash pero gemini-3.6-flash lo rechaza con
// error 400 "Request contains an invalid argument" — Gemini 3.x parece usar un mecanismo distinto
// para controlar el "pensamiento" (algo tipo thinkingLevel en vez de thinkingBudget numérico), pero
// no hay confirmación 100% fiable de su nombre/forma exactos en la documentación pública a fecha de
// este cambio, y adivinarlo mal repetiría el mismo error 400 en TODAS las peticiones. Se prefiere
// quitarlo sin más: Google anuncia gemini-3.6-flash como más eficiente en tokens de salida por
// defecto que 2.5, así que no debería reproducir el problema original de "pensamiento invisible"
// que motivó añadir este parámetro (ver comentario de arriba). Si vuelve a aparecer el síntoma
// original ("La API no devolvió contenido" con finishReason MAX_TOKENS en los logs — ya visibles
// gracias al diagnóstico ampliado de ui-batch-nombres.js/ui-batch-info.js/ui-batch-info-otros.js),
// entonces sí merece la pena investigar el parámetro correcto de Gemini 3.x en vez de quitarlo.
// MODIFICADO (3): confirmado el parámetro correcto de Gemini 3.x en la documentación oficial
// (ai.google.dev/gemini-api/docs/generate-content/thinking, 26 agosto): es
// generationConfig.thinkingConfig.thinkingLevel (string: "minimal"|"low"|"medium"|"high"), NO
// thinkingBudget. Si se omite, el valor por defecto en Gemini 3 Flash es "high" — el máximo
// razonamiento posible en CADA petición, lo cual explicaba los ~1-2 min por plato observados en
// "Generar Info Platos Otros Idiomas" (ese tiempo es "pensamiento" invisible antes de escribir el
// JSON, no la escritura en sí). Se añade explícitamente en GEMINI_THINKING_LEVEL y se pasa en las
// 5 llamadas a Gemini del proyecto (app.js x2, ui-batch-nombres.js, ui-batch-info.js,
// ui-batch-info-otros.js). Puesto a "medium" (no "low"/"minimal") a petición del usuario: quiere
// conservar más margen de razonamiento que el mínimo, dado que son tareas de traducción con reglas
// de fidelidad terminológica (ternera=beef, etc.) que sí se benefician de algo de razonamiento.
const GEMINI_THINKING_LEVEL = "medium";
const GEMINI_ENDPOINT_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";
const GEMINI_ENDPOINT_URL_INFO_OTROS = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

// CONTROL DE LOTES INDEPENDIENTES PARA LA ARQUITECTURA DE DOS FASES
const TRADUCCION_TAMANO_LOTE = 3;       // Lote para traducción masiva de nombres
const INFO_EXTENDIDA_TAMANO_LOTE = 2; // Lote ultra reducido para descripciones y Q&A JSON en ES/EN (2 idiomas)
// NUEVO: lote propio para "Generar Info Platos Otros Idiomas" — NO reutiliza INFO_EXTENDIDA_TAMANO_LOTE
// porque ahí cada plato genera 24 idiomas de golpe (no 2), así que con el mismo tamaño de lote la
// respuesta de Gemini es mucho más larga y puede cortarse antes de completar el JSON. 1 plato por
// llamada ya implica traducir su ficha a 24 idiomas, así que no hace falta agrupar más de uno.
const INFO_OTROS_IDIOMAS_TAMANO_LOTE = 1;
// NUEVO: límite explícito de tokens de salida para las llamadas a Gemini que generan/traducen
// fichas largas (antes no se fijaba y se usaba el valor por defecto de la API, insuficiente para
// lotes con muchos idiomas — causaba respuestas truncadas y errores de "JSON inválido/no encontrado").
// Esto SÍ es compatible con v1 y v1beta por igual, así que se mantiene en todas las llamadas.
const GEMINI_MAX_OUTPUT_TOKENS = 65536;
// NUEVO: nº de peticiones a Gemini en paralelo (una key distinta cada una) para "Generar Info
// Platos Otros Idiomas" — antes se procesaba un plato a la vez aunque hubiera varias keys
// cargadas, y solo se rotaba de key al chocar con un 429. Por defecto usa TODAS las keys
// disponibles en paralelo; se puede forzar un número menor cambiando este valor si al probarlo
// se ve que Google empieza a dar más 429 por ir "todas las keys a la vez".
const INFO_OTROS_IDIOMAS_CONCURRENCIA = null; // null = usar el nº de keys cargadas
// NUEVO: mismo mecanismo de concurrencia que arriba, aplicado también al Paso 1 ("Generar Info
// Platos ES/EN", fases piloto+vino) y al Paso 2 ("Traducir nombres a todos los idiomas"). Antes
// solo el Paso 3 estaba paralelizado; se añade aquí para cuando alguna vez haga falta regenerar
// muchos platos desde cero en estos dos pasos también (con pocos pendientes, como en las pruebas
// de esta sesión, la diferencia apenas se nota).
const INFO_EXTENDIDA_CONCURRENCIA = null; // Paso 1 (ES/EN) — null = usar el nº de keys cargadas
const TRADUCCION_CONCURRENCIA = null;     // Paso 2 (nombres) — null = usar el nº de keys cargadas

// =====================================================================
// NUEVO: MENÚS ESPECIALES (plantillas de menú de evento — pestaña "6. Menú Especial")
// =====================================================================
// URL del Apps Script INDEPENDIENTE (ni RG ni US Open) que guarda/lee las plantillas de menú
// especial en su propia Google Sheet — ver Codigo_MenusEspeciales.gs (repo aparte). Común a los
// dos restaurantes: un menú especial puede mezclar platos de ambas cartas, así que no tiene
// sentido que "pertenezca" a WEB_APP_URL_RESTAURANTE001 ni a WEB_APP_URL_RESTAURANTE002.
const WEBAPP_URL_MENUS_ESPECIALES = 'https://script.google.com/macros/s/AKfycby8566r5531M-iAvqYs7QRjmW5VVnBPbbQqbzRbsRHenRIOzsaVbDjj7GuVfnSGh7n1/exec';
window.WEBAPP_URL_MENUS_ESPECIALES = WEBAPP_URL_MENUS_ESPECIALES;

// NUEVO: Exposición explícita en window para que ui.js (script type="module", con su propio
// scope) pueda leer esta constante de forma fiable, igual que ya se hace con RESTAURANTES_CONFIG.
window.GEMINI_ENDPOINT_URL = GEMINI_ENDPOINT_URL;
window.GEMINI_ENDPOINT_URL_INFO_OTROS = GEMINI_ENDPOINT_URL_INFO_OTROS;
window.GEMINI_THINKING_LEVEL = GEMINI_THINKING_LEVEL;
window.TRADUCCION_TAMANO_LOTE = TRADUCCION_TAMANO_LOTE;
window.INFO_EXTENDIDA_TAMANO_LOTE = INFO_EXTENDIDA_TAMANO_LOTE;
window.INFO_OTROS_IDIOMAS_TAMANO_LOTE = INFO_OTROS_IDIOMAS_TAMANO_LOTE;
window.INFO_OTROS_IDIOMAS_CONCURRENCIA = INFO_OTROS_IDIOMAS_CONCURRENCIA;
window.INFO_EXTENDIDA_CONCURRENCIA = INFO_EXTENDIDA_CONCURRENCIA;
window.TRADUCCION_CONCURRENCIA = TRADUCCION_CONCURRENCIA;
window.GEMINI_MAX_OUTPUT_TOKENS = GEMINI_MAX_OUTPUT_TOKENS;


// =====================================================================
// NUEVO: CONFIGURACIÓN CENTRALIZADA DE ASSETS (Rutas e Imágenes)
// =====================================================================
const PATH_IMAGENES = 'imagenes/imagenes/';
const PATH_ALERGENOS = 'imagenes/alergenos/';

// Logos Principales (Header del Editor)
const LOGO_RESTAURANTE001 = PATH_IMAGENES + 'logo_web01.png';
const LOGO_RESTAURANTE002 = PATH_IMAGENES + 'logo_web02.png';

// Códigos QR Roland Garros
const QR_RESTAURANTE001_DEFAULT = PATH_IMAGENES + 'qr-web01-02.png'; 
const QR_RESTAURANTE001_MOD = PATH_IMAGENES + 'qr-web01-01.png';            

// Códigos QR US Open
const QR_RESTAURANTE002_DEFAULT = PATH_IMAGENES + 'qr-web02-01.png'; 
const QR_RESTAURANTE002_MOD = PATH_IMAGENES + 'qr-web02-02.png';   

// =====================================================================
// NUEVO: IMAGEN DEL VINO "EL TENISTA" (ID 12990) EN LA HOJA DE SUGERENCIAS
// =====================================================================
const VINO_IMAGEN_TENISTA = 'imagenes/vinos/tenista_pegado.webp';
// NUEVO: imagen del aperitivo Canonita ("Usopen Splitz", ID 12993), que se muestra junto a la
// del vino El Tenista en "Vinos y aperitivos recomendados" de la hoja de Sugerencias.
const APERITIVO_IMAGEN_CANONITA = 'imagenes/vinos/canonita.webp';
const APERITIVO_CANONITA_ID = 12993;
const VINO_IMAGEN_DEFAULT_RESTAURANTE001 = true;  // true = "Con imagen Vino" marcado por defecto
const VINO_IMAGEN_DEFAULT_RESTAURANTE002 = true;

// NUEVO: tamaño por defecto de la imagen del vino y del QR en la hoja de Sugerencias (comparten
// escala). Valores permitidos: 1, 1.2, 1.4, 1.6 — deben coincidir con uno de los botones que
// ofrece la propia hoja (1x/1.2x/1.4x/1.6x), o si no, ninguno saldrá marcado como activo.
const VINO_IMAGEN_ESCALA_DEFAULT = 1;

// NUEVO: tipo de QR marcado por defecto en la hoja de Sugerencias, por restaurante. Valores
// permitidos: 'none' (Sin QR), 'default' (Oficial), 'mod' (Alternativo).
const QR_TIPO_DEFAULT_RESTAURANTE001 = 'none';
const QR_TIPO_DEFAULT_RESTAURANTE002 = 'none';


// =====================================================================
// NUEVO (30 oct): HOJA IMPRIMIBLE DE POSTRES (pestañas "2.1 Postres" / "5.1 Postres")
// =====================================================================
// Rango propio que NO sale en la web pública (no hay categoría "16" allí). Mismo rango en RG y
// en US Open: cada restaurante tiene su propia Google Sheet, así que cada uno pone sus postres.
const POSTRES_HOJA_RANGOS = {
    postres: [16000, 16099],  // postres con precio propio
    helados: [16100, 16199],  // un sabor por fila; en la hoja salen juntos en UN bloque
    bebidas: [16200, 16299]   // bebidas sugeridas para acompañar el postre
};
// Bloque de helados: título fijo + foto del tarro (deja '' para no usar imagen).
const POSTRES_HELADOS_TITULO_ES = 'Helados artesanos RNA';
const POSTRES_HELADOS_TITULO_EN = 'RNA artisan ice cream';
const POSTRES_HELADOS_SUBTITULO_ES = 'Seleccione el sabor que prefiera';
const POSTRES_HELADOS_SUBTITULO_EN = 'Choose your favourite flavour';
const POSTRES_HELADO_IMAGEN = 'imagenes/postres/helado_tarro.webp';
const POSTRES_HELADO_IMAGEN_DEFAULT = true;   // true = "Con imagen" marcado por defecto
const POSTRES_HELADO_ALTURA = 64;             // px de alto de la foto del helado (a tamaño 1x)
// Imagen de botella por ID de bebida (opcional: una bebida sin entrada aquí sale sin imagen).
// Para añadir una nueva: sube el .webp a imagenes/vinos/ y añade aquí su ID.
// "escala" = tamaño relativo entre botellas (1 = altura normal, 0.75 = 3/4 de alto).
// Una bebida puede llevar VARIAS imágenes poniendo una lista [ {...}, {...} ].
const POSTRES_BEBIDAS_IMAGENES = {
    16200: [                                                                // botella + copa de licor
        { src: 'imagenes/vinos/can_axartell_dolc.webp', escala: 0.75 },
        { src: 'imagenes/vinos/copa_vino_dulce.webp', escala: 0.5 }
    ],
    16201: [                                                                // botella + vaso de vermut
        { src: 'imagenes/vinos/dimoni_gros_vermut.webp', escala: 1 },
        { src: 'imagenes/vinos/vermut_vaso.webp', escala: 0.375 }
    ],
    16202: { src: 'imagenes/vinos/copa_cava.webp', escala: 0.7 },              // copa de cava
    16203: { src: 'imagenes/vinos/cafe_con_leche.webp', escala: 0.45 }        // café con leche (taza + plato)
};
const POSTRES_BEBIDAS_IMAGEN_DEFAULT = true;
const POSTRES_BEBIDAS_ALTURA = 110;           // px de alto de la botella más alta (a tamaño 1x)
// Tipo de QR por defecto en la hoja de Postres: 'none' | 'default' | 'mod'
const POSTRES_QR_TIPO_DEFAULT_RESTAURANTE001 = 'none';
const POSTRES_QR_TIPO_DEFAULT_RESTAURANTE002 = 'none';


// =====================================================================
// NUEVO: CONFIGURACIÓN DE TIEMPOS DEL SISTEMA
// =====================================================================
const CONSISTENCY_WINDOW_MS = 180000; // 3 minutos seguro que no te dejas nada?

// =====================================================================
// NUEVO: CONTRASEÑA PARA ELIMINAR UN PLATO
// =====================================================================
// El editor pide esta contraseña cada vez que se confirma el borrado de un plato (ver
// abrirModalEliminarPlato()/confirmarEliminarPlato() en app.js) — nunca se recuerda de un
// borrado al siguiente, hay que volver a escribirla cada vez. Es una barrera pensada para
// evitar que alguien sin autorización borre un plato sin querer o sin permiso, NO una medida
// de seguridad real: al ser un archivo de texto que carga el navegador, cualquiera con acceso
// al código fuente puede llegar a leerla. Para cambiarla basta con editar el texto de abajo.
const PASSWORD_ELIMINAR_PLATO = 'RG2026';
