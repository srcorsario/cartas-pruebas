// --- estructuras.js ---
window.APP_VERSIONS = window.APP_VERSIONS || {};
window.APP_VERSIONS.estructuras = '3.5.0'; // NUEVO (30 oct): categoría "Hoja Postres (imprimible)" 16000-16299 en ambas cartas. Anterior 3.4.0: // MODIFICADO: RG Sugerencias -> subcategoría "Vino" 12990-12999 (Postres limitado a 12989). Anterior 3.3.0: // NUEVO: añadido subAcordeon (true) a "Sugerencias" en ambas cartas — activa el acordeón anidado de subcategorías en el Editor (app.js/renderizar) para no perder de vista los platos a medida que crecen

// =================================================================================
// CARTA 01 - ROLAND GARROS (restaurante001)
// =================================================================================
// NUEVO (22 agosto): cada categoría de nivel superior lleva ahora "pestanaId", el id que usa
// esa MISMA sección en categoriesList del script.js de la web pública (repo "web"). Es la clave
// que se guarda en la hoja "Categorias" al activar/desactivar el interruptor de la cabecera del
// acordeón. Si una categoría no tiene pestaña propia en la web pública (se fusiona dentro de
// otra), pestanaId se deja en null y esa tarjeta no muestra interruptor — ver "6- Guarniciones"
// más abajo, que en la web pública de RG forma parte de la pestaña "5- Principales".
const ESTRUCTURA_RESTAURANTE001 = [
    // --- RANGO 12000-12999: SUGERENCIAS DEL CHEF ---
    { id: 12100, name: "Sugerencias", rango: 999, pestanaId: '12', subAcordeon: true, sub: [{id: 12100, name: "Croquetas", folder: "entrantes"},{id: 12200, name: "Croquetas Veg.", folder: "entrantes"},{id: 12300, name: "Entrantes", folder: "entrantes"},{id: 12400, name: "Pasta", folder: "pasta"},{id: 12500, name: "Arroz", folder: "arroz"},{id: 12700, name: "Pescado", folder: "pescado"},{id: 12800, name: "Carne", folder: "carne"},{id: 12900, name: "Postres", folder: "postres", max: 12989},{id: 12990, name: "Vino", folder: "vinos", max: 12999}]}, // MODIFICADO: Postres hasta 12989; 12990-12999 reservado a vinos de Sugerencias
    // --- RANGO 1000-1999: ENTRANTES ---
    { id: 1000, name: "1- Entrantes", rango: 999, pestanaId: '1', sub: [{id: 1000, name: "Entrantes", folder: "entrantes"},{id: 1100, name: "Pan", folder: "entrantes"}]},
    // --- RANGO 2000-2999: ENSALADAS ---
    { id: 2000, name: "2- Ensaladas", rango: 999, pestanaId: '2', sub: [{id: 2000, name: "Clasicas", folder: "ensaladas"},{id: 2100, name: "Pokes", folder: "ensaladas"},{id: 2200, name: "Otras", folder: "ensaladas"}]}, // CORREGIDO: ID 22200 a 2200
    // --- RANGO 3000-3999: ARROZ Y PASTA ---
    { id: 3000, name: "3- Arroz y Pasta", rango: 999, pestanaId: '3', sub: [{id: 3000, name: "Risotto", folder: "arroz"},{id: 3100, name: "Arroz", folder: "arroz"},{id: 3200, name: "Fideuá", folder: "pasta"},{id: 3300, name: "Pasta", folder: "pasta"}]},
    // --- RANGO 4000-4999: RECETAS ---
    { id: 4000, name: "4- Recetas", rango: 999, pestanaId: '4', sub: [{id: 4000, name: "Pescado", folder: "pescado"},{id: 4100, name: "Carne", folder: "carne"}]},
    // --- RANGO 5000-5999: PLATOS PRINCIPALES ---
    { id: 5000, name: "5- Platos principales", rango: 999, pestanaId: '5', sub: [{id: 5000, name: "Pescado", folder: "pescado"},{id: 5100, name: "Carne", folder: "carne"}]},
    // --- RANGO 6000-6999: GUARNICIONES --- (NUEVO: pestanaId null a propósito — en la web
    // pública de RG las guarniciones cuelgan de la pestaña "5- Principales", no tienen botón
    // de pestaña propio; desactivar "5" ya las oculta a ellas también)
    { id: 6000, name: "6- Guarniciones", rango: 999, pestanaId: null, sub: [{id: 6000, name: "Guarnición", folder: "guarnicion"},{id: 6100, name: "Extra", folder: "guarnicion"}]}, // CORREGIDO: ID 1 a 6100
    // --- RANGO 7000-7999: PLATOS NIÑO ---
    { id: 7000, name: "7- Platos niño", rango: 999, pestanaId: '7', folder: "niños" },
    // --- RANGO 8000-8999: POSTRES ---
    { id: 8000, name: "8- Postres", rango: 999, pestanaId: '8', folder: "postres" },
    // --- RANGO 9000-9999: CAFÉS ---
    { id: 9000, name: "9- Cafés", rango: 999, pestanaId: '9', sub: [{id: 9000, name: "Cafés", folder: "cafe"},{id: 9100, name: "Infusiones", folder: "cafe"}]},
    // --- RANGO 10000-10999: BEBIDAS ---
    { id: 10000, name: "10- Bebidas", rango: 999, pestanaId: '10', sub: [{id: 10000, name: "Refrescos", folder: "refrescos"},{id: 10100, name: "Zumos", folder: "refrescos"},{id: 10200, name: "Otros", folder: "refrescos"}]},
    // --- RANGO 11000-11999: CERVEZAS ---
    { id: 11000, name: "11- Cervezas", rango: 999, pestanaId: '11', folder: "cerveza" },

    // --- RANGO 13000-13099: VINOS BLANCOS ---
    { id: 13100, name: "13.1- Vinos Blancos", rango: 99, pestanaId: '131', sub: [
        {id: 13100, name: "Mallorca", folder: "vinos", max: 13129},
        {id: 13130, name: "Galicia", folder: "vinos", max: 13139},
        {id: 13140, name: "Rueda", folder: "vinos", max: 13149},
        {id: 13150, name: "Otras D.O.", folder: "vinos", max: 13189},
        {id: 13190, name: "Copas", folder: "vinos", max: 13199}
    ]},
    // --- RANGO 13200-13299: VINOS ROSADOS ---
    { id: 13200, name: "13.2- Vinos Rosados", rango: 99, pestanaId: '132', sub: [
        {id: 13200, name: "Vinos Rosados", folder: "vinos", max: 13249},
        {id: 13250, name: "Copas", folder: "vinos", max: 13259}
    ]},
    // --- RANGO 13300-13399: VINOS TINTOS ---
    { id: 13300, name: "13.3- Vinos Tintos", rango: 99, pestanaId: '133', sub: [
        {id: 13300, name: "Mallorca", folder: "vinos", max: 13329},
        {id: 13330, name: "Rioja", folder: "vinos", max: 13349},
        {id: 13350, name: "Ribera", folder: "vinos", max: 13369},
        {id: 13370, name: "Otras D.O.", folder: "vinos", max: 13389},
        {id: 13390, name: "Copas", folder: "vinos", max: 13399}
    ]},
    // --- RANGO 13400-14499: CAVAS & CHAMPAGNE ---
    { id: 13400, name: "13.4- Cavas & Champagne", rango: 1099, pestanaId: '134', sub: [
        {id: 13400, name: "Botellas", folder: "vinos", max: 13449},
        {id: 13450, name: "Copas", folder: "vinos", max: 13459 }
    ]},
    // --- ALÉRGENOS E INTOLERANCIAS --- (nueva pestaña, 8 septiembre, última de todas). A
    // diferencia del resto NO tiene platos reales -- es una página fija de contenido en la web
    // pública (leyenda de iconos + aviso, ver script.js/generateAlergenosPageHtml del repo
    // "web"). Rango de ID sin usar (15001-15099, por encima del 14499 al que llega Cavas más
    // arriba) solo para que el acordeón pueda mostrarla con su interruptor; "sinPlatos:true" es
    // lo que de verdad evita que app.js/renderizar() la oculte por no tener platos.
    { id: 15001, name: "Alérgenos e Intolerancias", rango: 98, pestanaId: 'alergenos', folder: "alergenos", sinPlatos: true },
    // --- RANGO 16000-16299: HOJA IMPRIMIBLE DE POSTRES --- (NUEVO 30 oct) Solo editor + hoja A4
    // (postres-print.js). pestanaId null: sin interruptor de pestaña, y la web pública no tiene
    // categoría "16", así que nunca sale allí. Cada elemento se activa/desactiva con su interruptor.
    { id: 16000, name: "Hoja Postres (imprimible)", rango: 299, pestanaId: null, subAcordeon: true, sub: [
        {id: 16000, name: "Postres", folder: "postres", max: 16099},
        {id: 16100, name: "Helados (sabores)", folder: "postres", max: 16199},
        {id: 16200, name: "Bebidas para acompañar", folder: "vinos", max: 16299}
    ]},
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
    ]},
    // --- ALÉRGENOS E INTOLERANCIAS --- (nueva pestaña, 8 septiembre, última de todas). A
    // diferencia del resto NO tiene platos reales -- es una página fija de contenido en la web
    // pública (leyenda de iconos + aviso, ver script.js/generateAlergenosPageHtml del repo
    // "usopenmain"). Rango de ID sin usar (15001-15099, por encima del 14499 al que llega Cavas
    // más arriba) solo para que el acordeón pueda mostrarla con su interruptor;
    // "sinPlatos:true" es lo que de verdad evita que app.js/renderizar() la oculte por no tener
    // platos.
    { id: 15001, name: "Alérgenos e Intolerancias", rango: 98, pestanaId: 'alergenos', folder: "alergenos", sinPlatos: true },
    // --- RANGO 16000-16299: HOJA IMPRIMIBLE DE POSTRES --- (NUEVO 30 oct) Solo editor + hoja A4
    // (postres-print.js). pestanaId null: sin interruptor de pestaña, y la web pública no tiene
    // categoría "16", así que nunca sale allí. Cada elemento se activa/desactiva con su interruptor.
    { id: 16000, name: "Hoja Postres (imprimible)", rango: 299, pestanaId: null, subAcordeon: true, sub: [
        {id: 16000, name: "Postres", folder: "postres", max: 16099},
        {id: 16100, name: "Helados (sabores)", folder: "postres", max: 16199},
        {id: 16200, name: "Bebidas para acompañar", folder: "vinos", max: 16299}
    ]},
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
