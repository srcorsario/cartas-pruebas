// --- estructuras.js ---
window.APP_VERSIONS = window.APP_VERSIONS || {};
window.APP_VERSIONS.estructuras = '4.0.0-clubhouse'; // REESCRITO para Club House: rangos de ID reales de esta carta (ver conversación con el usuario), ya no son los de RG

// =================================================================================
// CARTA 01 - CLUB HOUSE (restaurante001)
// =================================================================================
// REESCRITO para Club House: cada categoría de nivel superior lleva "pestanaId", el id que usa
// esa MISMA sección en categoriesList/CATEGORY_RANGES del script.js de la web pública (repo
// "clubhouse"). Es la clave que se guarda en la hoja "Categorias" al activar/desactivar el
// interruptor de la cabecera del acordeón. Las categorías "extra" que no tienen pestaña propia
// en la web pública (se fusionan dentro de otra, a petición del usuario) llevan pestanaId: null
// y no muestran interruptor propio — desactivar la pestaña "madre" ya las oculta también.
const ESTRUCTURA_RESTAURANTE001 = [
    // --- RANGO 12001-12999: SUGERENCIAS (12991-12999 son los vinos dentro de Sugerencias;
    // pendiente de subcategorías propias, el usuario avisó que las añadirá más adelante) ---
    { id: 12001, name: "Sugerencias", rango: 998, pestanaId: 'sugerencias', subAcordeon: true, folder: "sugerencias" },
    // --- RANGO 1001-1099: TOSTADAS ---
    { id: 1001, name: "Tostadas", rango: 98, pestanaId: 'tostadas', folder: "tostadas" },
    // --- RANGO 1101-1199: INGREDIENTES EXTRA TOSTADAS --- (pestanaId null: se fusiona dentro
    // de la pestaña "Tostadas" en la web pública, no tiene interruptor propio)
    { id: 1101, name: "Ingredientes extra tostadas", rango: 98, pestanaId: null, folder: "tostadas" },
    // --- RANGO 1201-1299: CREPS ---
    { id: 1201, name: "Creps", rango: 98, pestanaId: 'creps', folder: "creps" },
    // --- RANGO 1301-1399: BOCADILLOS ---
    { id: 1301, name: "Bocadillos", rango: 98, pestanaId: 'bocadillos', folder: "bocadillos" },
    // --- RANGO 1401-1499: INGREDIENTES EXTRA BOCADILLOS --- (se fusiona en "Bocadillos")
    { id: 1401, name: "Ingredientes extra bocadillos", rango: 98, pestanaId: null, folder: "bocadillos" },
    // --- RANGO 1501-1599: SANDWICH ---
    { id: 1501, name: "Sandwich", rango: 98, pestanaId: 'sandwich', folder: "sandwich" },
    // --- RANGO 1601-1699: ENTRANTES (renombrada "Para Picar" en la web pública, 8 sept.) ---
    { id: 1601, name: "Para Picar", rango: 98, pestanaId: 'entrantes', folder: "entrantes" },
    // --- RANGO 1701-1799: PIZZAS ---
    { id: 1701, name: "Pizzas", rango: 98, pestanaId: 'pizzas', folder: "pizzas" },
    // --- RANGO 2001-2099: ENSALADAS ---
    { id: 2001, name: "Ensaladas", rango: 98, pestanaId: 'ensaladas', folder: "ensaladas" },
    // --- RANGO 2101-2199: INGREDIENTE EXTRA ENSALADAS --- (se fusiona en "Ensaladas")
    { id: 2101, name: "Ingrediente extra ensaladas", rango: 98, pestanaId: null, folder: "ensaladas" },
    // --- RANGO 3901-3999: HAMBURGUESAS ---
    { id: 3901, name: "Hamburguesas", rango: 98, pestanaId: 'hamburguesas', folder: "hamburguesas" },
    // --- RANGO 4001-5099: PLATOS PRINCIPALES (Carne + Pescado + Guarnición extra, a petición
    // del usuario: Carne y Pescado se ven juntos en la misma pestaña) ---
    { id: 4001, name: "Platos principales", rango: 1098, pestanaId: 'principales', sub: [
        {id: 4001, name: "Carne", folder: "carne", max: 4099},
        {id: 4201, name: "Pescado", folder: "pescado", max: 4299},
        {id: 5001, name: "Guarnición extra", folder: "guarnicion", max: 5099}
    ]},
    // --- RANGO 6001-6099: NIÑOS ---
    { id: 6001, name: "Niños", rango: 98, pestanaId: 'ninos', folder: "niños" },
    // --- RANGO 7001-7099: POSTRES ---
    { id: 7001, name: "Postres", rango: 98, pestanaId: 'postres', folder: "postres" },
    // --- RANGO 9001-9199: CAFÉS E INFUSIONES ---
    { id: 9001, name: "Cafés e Infusiones", rango: 198, pestanaId: 'cafes', sub: [
        {id: 9001, name: "Cafés", folder: "cafe", max: 9099},
        {id: 9100, name: "Té e infusiones", folder: "cafe", max: 9199}
    ]},
    // --- RANGO 10001-10299: BEBIDAS ---
    { id: 10001, name: "Bebidas", rango: 298, pestanaId: 'bebidas', sub: [
        {id: 10001, name: "Refrescos", folder: "refrescos", max: 10099},
        {id: 10100, name: "Zumos", folder: "refrescos", max: 10199},
        {id: 10200, name: "Otras bebidas", folder: "refrescos", max: 10299}
    ]},
    // --- RANGO 10301-10499: BEBIDAS SALUDABLES --- (nueva pestaña, 8 septiembre, insertada
    // entre "Bebidas" y "Cervezas" a petición del usuario)
    { id: 10301, name: "Bebidas Saludables", rango: 198, pestanaId: 'bebidas_saludables', sub: [
        {id: 10301, name: "Zumos Saludables", folder: "refrescos", max: 10399},
        {id: 10401, name: "Botellas Saludables", folder: "refrescos", max: 10499}
    ]},
    // --- RANGO 11001-11099: CERVEZAS ---
    { id: 11001, name: "Cervezas", rango: 98, pestanaId: 'cervezas', folder: "cerveza" },
    // --- RANGO 11101-11299: APERITIVOS --- (nueva pestaña, 8 septiembre, insertada entre
    // "Cervezas" y "Vinos Blancos" a petición del usuario)
    { id: 11101, name: "Aperitivos", rango: 198, pestanaId: 'aperitivos', sub: [
        {id: 11101, name: "Aperitivos", folder: "aperitivos", max: 11199},
        {id: 11201, name: "Copas de vino y sangría", folder: "aperitivos", max: 11299}
    ]},

    // --- RANGO 13100-13199: VINOS BLANCOS --- (misma norma que en los otros restaurantes)
    { id: 13100, name: "Vinos Blancos", rango: 99, pestanaId: 'vinos_blancos', folder: "vinos" },
    // --- RANGO 13200-13299: VINOS ROSADOS ---
    { id: 13200, name: "Vinos Rosados", rango: 99, pestanaId: 'vinos_rosados', folder: "vinos" },
    // --- RANGO 13300-13399: VINOS TINTOS ---
    { id: 13300, name: "Vinos Tintos", rango: 99, pestanaId: 'vinos_tintos', folder: "vinos" },
    // --- RANGO 13400-13499: CAVAS & CHAMPAGNE ---
    { id: 13400, name: "Cavas & Champagne", rango: 99, pestanaId: 'cavas', folder: "vinos" },
    // --- ALÉRGENOS E INTOLERANCIAS --- (nueva pestaña, 8 septiembre, última de todas). A
    // diferencia del resto NO tiene platos reales -- es una página fija de contenido en la web
    // pública (leyenda de iconos + aviso, ver script.js/generateAlergenosPageHtml). Se le da un
    // rango de ID sin usar (14001-14099, no colisiona con nada) únicamente de cara al futuro
    // (por si algún día se quisiera añadir algo ahí); "sinPlatos:true" es lo que de verdad hace
    // que el editor (app.js > renderizar()) la muestre con su interruptor aunque tenga 0 platos
    // reales -- por defecto el editor OCULTA cualquier categoría sin platos, así que sin este
    // flag esta tarjeta nunca aparecería en el acordeón.
    { id: 14001, name: "Alérgenos e Intolerancias", rango: 98, pestanaId: 'alergenos', folder: "alergenos", sinPlatos: true }
];


// =================================================================================
// CARTA 02 - US OPEN (restaurante002)
// =================================================================================
// MODIFICADO: estructura reescrita por completo para encajar con los rangos de ID reales
// de la carta de US Open (documento "seccion de id usopen.txt"). La versión anterior era
// prácticamente una copia de la de Roland Garros y no coincidía con los rangos reales ya
// usados en la hoja de Google Sheets de este restaurante (pokes/tacos/ramen/pizzas ya tienen
// platos cargados con estos IDs). Los vinos (13xxx) se dejan EXACTAMENTE igual que en
// restaurante001, tal y como se pidió.
// NUEVO (22 agosto): pestanaId añadido igual que en restaurante001, mapeando aquí contra
// categoriesList del script.js de la web pública de US Open (repo "usopenmain"). En este
// restaurante SÍ hay correspondencia 1:1 en todas las categorías (ninguna se fusiona con otra
// a nivel de pestaña pública), así que ninguna queda en null.
const ESTRUCTURA_RESTAURANTE002 = [
    // --- RANGO 12000-12999: SUGERENCIAS DEL CHEF ---
    // La web pública agrupa esto en 4 bloques (Entrantes / Principales / Postres / Vino, ver
    // script.js de la web US Open), pero aquí se listan por separado para poder asignar la
    // carpeta de imagen correcta a cada tipo de plato al crearlo desde el editor.
    { id: 12100, name: "Sugerencias", rango: 999, pestanaId: 'sugerencias', subAcordeon: true, sub: [
        {id: 12100, name: "Entrantes", folder: "entrantes"},
        {id: 12200, name: "Ensaladas", folder: "ensaladas"},
        {id: 12300, name: "Pokes", folder: "pokes"},
        {id: 12400, name: "Tacos", folder: "tacos"},
        {id: 12500, name: "Ramen", folder: "ramen"},
        {id: 12600, name: "Pastas", folder: "pastas"},
        {id: 12700, name: "Pizzas", folder: "pizzas", max: 12749},
        {id: 12750, name: "Pescados", folder: "pescado", max: 12799},
        {id: 12800, name: "Carnes", folder: "carne", max: 12849},
        {id: 12850, name: "Hamburguesas", folder: "hamburguesas", max: 12899},
        {id: 12900, name: "Postres", folder: "postres", max: 12949},
        {id: 12991, name: "Vino", folder: "vinos", max: 12999}
    ]},
    // --- RANGO 1001-1199: ENTRANTES (Entrantes 1001-1099 + Pan 1101-1199, misma pestaña) ---
    { id: 1000, name: "1- Entrantes", rango: 199, pestanaId: 'entrantes', sub: [
        {id: 1000, name: "Entrantes", folder: "entrantes" },
        {id: 1100, name: "Pan", folder: "entrantes" }
    ]},
    // --- RANGO 2001-2099: ENSALADAS (pestaña propia) ---
    { id: 2000, name: "2- Ensaladas", rango: 99, pestanaId: 'ensaladas', folder: "ensaladas" },
    // --- RANGO 2101-2199: POKES (pestaña propia) ---
    { id: 2100, name: "3- Pokes", rango: 99, pestanaId: 'pokes', folder: "pokes" },
    // --- RANGO 2201-2299: TACOS (pestaña propia) ---
    { id: 2200, name: "4- Tacos", rango: 99, pestanaId: 'tacos', folder: "tacos" },
    // --- RANGO 3001-3099: PASTAS (Ramen 3001-3049 + Pastas 3051-3099, misma pestaña) ---
    { id: 3000, name: "5- Pastas", rango: 99, pestanaId: 'pastas', sub: [
        {id: 3000, name: "Ramen", folder: "ramen", max: 3049},
        {id: 3050, name: "Pastas", folder: "pastas", max: 3099}
    ]},
    // --- RANGO 3101-3199: PIZZAS (pestaña propia) ---
    { id: 3100, name: "6- Pizzas", rango: 99, pestanaId: 'pizzas', folder: "pizzas" },
    // --- RANGO 4001-5099: PRINCIPALES (Pescados+Carnes+Hamburguesas+Guarnición, misma pestaña) ---
    { id: 4000, name: "7- Principales", rango: 1099, pestanaId: 'principales', sub: [
        {id: 4000, name: "Pescados", folder: "pescado" },
        {id: 4100, name: "Carnes", folder: "carne" },
        {id: 4200, name: "Hamburguesas", folder: "hamburguesas" },
        {id: 5000, name: "Guarnición", folder: "guarnicion" }
    ]},
    // --- RANGO 6001-6099: NIÑOS (pestaña propia) ---
    { id: 6000, name: "8- Niños", rango: 99, pestanaId: 'ninos', folder: "niños" },
    // --- RANGO 7001-7099: POSTRES (pestaña propia) ---
    { id: 7000, name: "9- Postres", rango: 99, pestanaId: 'postres', folder: "postres" },
    // --- RANGO 9001-9099: CAFÉ (pestaña propia) ---
    { id: 9000, name: "10- Café", rango: 99, pestanaId: 'cafe', folder: "cafe" },
    // --- RANGO 10001-10299: REFRESCOS (pestaña propia, OJO: 300 IDs, no 100 — por eso usa
    // sub con max explícito en vez de dejar el límite por defecto de 99) ---
    { id: 10000, name: "11- Refrescos", rango: 299, pestanaId: 'refrescos', sub: [
        {id: 10000, name: "Refrescos", folder: "refrescos", max: 10299}
    ]},
    // --- RANGO 11001-11099: CERVEZAS (pestaña propia) ---
    { id: 11000, name: "12- Cervezas", rango: 99, pestanaId: 'cervezas', folder: "cerveza" },

    // --- VINOS: misma estructura que restaurante001 (Roland Garros), sin cambios ---
    // --- RANGO 13000-13099: VINOS BLANCOS ---
    { id: 13100, name: "13.1- Vinos Blancos", rango: 99, pestanaId: '131', sub: [
        {id: 13100, name: "Mallorca", folder: "vinos", max: 13129},
        {id: 13130, name: "Galicia", folder: "vinos", max: 13139},
        {id: 13140, name: "Rueda", folder: "vinos", max: 13149 },
        {id: 13150, name: "Otras D.O.", folder: "vinos", max: 13189 },
        {id: 13190, name: "Copas", folder: "vinos", max: 13199 }
    ]},
    // --- RANGO 13200-13299: VINOS ROSADOS ---
    { id: 13200, name: "13.2- Vinos Rosados", rango: 99, pestanaId: '132', sub: [
        {id: 13200, name: "Vinos Rosados", folder: "vinos", max: 13249 },
        {id: 13250, name: "Copas", folder: "vinos", max: 13259 }
    ]},
    // --- RANGO 13300-13399: VINOS TINTOS ---
    { id: 13300, name: "13.3- Vinos Tintos", rango: 99, pestanaId: '133', sub: [
        {id: 13300, name: "Mallorca", folder: "vinos", max: 13329 },
        {id: 13330, name: "Rioja", folder: "vinos", max: 13349 },
        {id: 13350, name: "Ribera", folder: "vinos", max: 13369 },
        {id: 13370, name: "Otras D.O.", folder: "vinos", max: 13389 },
        {id: 13390, name: "Copas", folder: "vinos", max: 13399 }
    ]},
    // --- RANGO 13400-14499: CAVAS & CHAMPAGNE ---
    { id: 13400, name: "13.4- Cavas & Champagne", rango: 1099, pestanaId: '134', sub: [
        { id: 13400, name: "Botellas", folder: "vinos", max: 13449 },
        { id: 13450, name: "Copas", folder: "vinos", max: 13459 }
    ]}
];

// =================================================================================
// ASIGNACIÓN GLOBAL DIRECTA (Abstract Keys)
// =================================================================================
window.ESTRUCTURA_RESTAURANTE001 = ESTRUCTURA_RESTAURANTE001;
window.ESTRUCTURA_RESTAURANTE002 = ESTRUCTURA_RESTAURANTE002;

function getEstructuraActual() {
    const modo = window.currentMode || 'restaurante001';
    return (modo === 'restaurante002') ? window.ESTRUCTURA_RESTAURANTE002 : window.ESTRUCTURA_RESTAURANTE001;
}
