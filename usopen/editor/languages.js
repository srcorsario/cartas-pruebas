// languages.js
// NUEVO: Registro de versión del archivo
window.APP_VERSIONS = window.APP_VERSIONS || {};
window.APP_VERSIONS.lang = '1.1.0'; // Incrementado por extracción de datos a data.js

// MODIFICADO: Archivo puramente declarativo de configuración de idiomas.
// (Los datos pesados del menú como ESTRUCTURA, categoriesList y subCatsLang 
// se han movido al archivo data.js para mayor limpieza)

var IDIOMAS_CONFIG = {
    ES: "🇪🇸 Español", EN: "🇬🇧 English", DE: "🇩🇪 Deutsch", FR: "🇫🇷 Français", IT: "🇮🇹 Italiano",
    RU: "🇷🇺 Русский", NL: "🇳🇱 Nederlands", PL: "🇵🇱 Polski", SV: "🇸🇪 Svenska", NO: "🇳🇴 Norsk",
    DA: "🇩🇰 Dansk", FI: "🇫🇮 Suomi", PT: "🇵🇹 Português", RO: "🇷🇴 Română", HU: "🇭🇺 Magyar",
    CS: "🇨🇿 Čeština", EL: "🇬🇷 Ελληνικά", TR: "🇹🇷 Türkçe", AR: "🇦🇪 العربية", ZH: "🇨🇳 中文", JA: "🇯🇵 日本語",
    CA: "català", EU: "Euskara", GL: "Galego", VA: "Valencià",
    KO: "🇰🇷 한국어"
};

var IDIOMAS_ORDEN = ['es', 'en', 'de', 'fr', 'it', 'ru', 'nl', 'pl', 'sv', 'no', 'da', 'fi', 'pt', 'ro', 'hu', 'cs', 'el', 'tr', 'ar', 'zh', 'ja', 'ca', 'eu', 'gl', 'va', 'ko'];

var IDIOMAS_CSV_INDICES = {
    es: 3, en: 7, de: 8, fr: 9, it: 10,
    ru: 11, nl: 12, pl: 13, sv: 14, no: 15,
    da: 16, fi: 17, pt: 18, ro: 19, hu: 20,
    cs: 21, el: 22, tr: 23, ar: 24, zh: 25,
    ja: 26, ca: 27, eu: 28, gl: 29, va: 30,
    ko: 31
};

// NUEVO: posición fija (índice 0-based en el CSV) de la columna "Opciones_Inactivas" —
// columna 33 en Código.gs, justo después de Nombre_KO. Guarda, por plato, las posiciones
// (1, 2, 3...) de las palabras entre "//.../ /" del Nombre_ES que están desactivadas
// (p.ej. "2,5"); es la misma para todos los idiomas. Usada por cargar() (app.js) para leerla
// del CSV y por abrirEditor()/aplicarCambiosPlato() para pintar y guardar la rueda de
// "Opciones del plato".
var IDX_OPCIONES_INACTIVAS = 32;
