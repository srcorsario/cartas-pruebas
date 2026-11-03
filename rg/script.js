// =========================================================================================
// CARTA DIGITAL — NÚCLEO v4 (script.js)
// Común a todos los restaurantes. NO lleva nada propio de ningún restaurante: todo eso viene
// de window.RESTAURANTE (restaurantes/<id>/restaurante.js), que index.html carga antes que
// este archivo. window.CARTA_BUILD lo escribe construir.ps1 dentro de index.html.
// =========================================================================================

const R = window.RESTAURANTE || {};
const BUILD = window.CARTA_BUILD || {};
const APP_VERSION = 'v4.3.0'; // 3 nov: idiomas de la web elegibles desde el editor (base.json "idiomas")

const CSV_URL = (R.datos && R.datos.csv) || '';
// Endpoint en vivo (Código.gs, ?accion=csv): carga por etapas/idioma y ?accion=categorias.
const LIVE_CSV_ENDPOINT = (R.datos && R.datos.vivo) || '';
// v4.2: datos.tipo 'json' -> la carta sale de un archivo propio (datos.json, generado con
// PASAR_A_JSON.bat) en vez de Google Sheets. 'sheets' (por defecto) = como siempre.
const DATOS_TIPO = (R.datos && R.datos.tipo) || 'sheets';
// Carpeta con base.json (sin textos) + un <idioma>.json por idioma (la genera construir.ps1 y el
// editor al guardar, a partir de datos.json). Así se cargan por etapas igual que con Sheets.
const DATOS_CARPETA = (R.datos && R.datos.carpeta) || 'datos/';
const ESSENTIAL_LANGS = (R.idiomas && R.idiomas.esenciales) || ['ES', 'EN', 'DE', 'FR', 'IT'];
const RTL_LANGS = (R.idiomas && R.idiomas.rtl) || ['AR'];

// Claves de localStorage: van por restaurante (y con sufijo en pruebas), porque todas las webs
// de srcorsario.github.io comparten el mismo localStorage aunque estén en repos distintos.
const CACHE_PREFIX = (R.id || 'carta') + (BUILD.entorno === 'pruebas' ? '-pruebas' : '');
const MENU_CACHE_KEY = CACHE_PREFIX + '-menu-v1';
const TOGGLES_CACHE_KEY = CACHE_PREFIX + '-toggles-v1';

// Sello ?v= para imágenes insertadas por JS (miniaturas fijas). Lo pone construir.ps1; si no
// hay (abriendo el núcleo a mano), se usa la hora para no servir una copia vieja.
const IMG_CACHE_BUST = BUILD.v || Date.now();

// Texto en el idioma actual de un objeto {ES:'..', EN:'..', ...}, con EN y ES de reserva.
function txt(o) { return o ? (o[currentLang] || o['EN'] || o['ES'] || '') : ''; }
// Igual, pero añadiendo " - <texto en ES>" cuando el idioma no es ES (formato de títulos).
function txtConES(o) { const t = txt(o); return currentLang === 'ES' ? t : `${t} - ${o['ES']}`; }
function enRangos(idNum, rangos) { return !!rangos && rangos.some(([a, b]) => idNum >= a && idNum <= b); }

// MODIFICADO: Agregado Coreano (KO) con su respectivo emoji compatible
const IDIOMAS = {
    ES: "🇪🇸 Español", EN: "🇬🇧 English", DE: "🇩🇪 Deutsch", FR: "🇫🇷 Français", IT: "🇮🇹 Italiano",
    RU: "🇷🇺 Русский", NL: "🇳🇱 Nederlands", PL: "🇵🇱 Polski", SV: "🇸🇪 Svenska", NO: "🇳🇴 Norsk",
    DA: "🇩🇰 Dansk", FI: "🇫🇮 Suomi", PT: "🇵🇹 Português", RO: "🇷🇴 Română", HU: "🇭🇺 Magyar",
    CS: "🇨🇿 Čeština", EL: "🇬🇷 Ελληνικά", TR: "🇹🇷 Türkçe", AR: "🇦🇪 العربية", ZH: "🇨🇳 中文", JA: "🇯🇵 日本語",
    KO: "🇰🇷 한국어",     
    CA: "🏰 Català",     
    EU: "🌳 Euskara",    
    GL: "🐙 Galego",     
    VA: "🥘 Valencià"    
};

const MENU_TEXTS = {
    ES: "Menú", EN: "Menu", DE: "Menü", FR: "Menu", IT: "Menu",
    RU: "Меню", NL: "Menu", PL: "Menu", SV: "Meny", NO: "Meny",
    DA: "Menu", FI: "Menu", PT: "Menu", RO: "Meniu", HU: "Menü",
    CS: "Menu", EL: "Μενού", TR: "Menü", AR: "قائمة", ZH: "菜单", JA: "メニュー",
    KO: "메뉴", CA: "Menú", EU: "Menu", GL: "Menú", VA: "Menú"
};

// NUEVO (26 agosto): texto "Cargando..." traducido, para el indicador visual que aparece al
// pulsar un idioma que todavía no está descargado (ver changeLanguage). Se muestra en el
// idioma que se está PIDIENDO, no en el idioma actual — así alguien que pulsa "DE" ve
// "Wird geladen...", no "Cargando...".
const LOADING_TEXTS = {
    ES: "Cargando...", EN: "Loading...", DE: "Wird geladen...", FR: "Chargement...", IT: "Caricamento...",
    RU: "Загрузка...", NL: "Laden...", PL: "Ładowanie...", SV: "Laddar...", NO: "Laster...",
    DA: "Indlæser...", FI: "Ladataan...", PT: "A carregar...", RO: "Se încarcă...", HU: "Betöltés...",
    CS: "Načítání...", EL: "Φόρτωση...", TR: "Yükleniyor...", AR: "جارٍ التحميل...", ZH: "加载中...", JA: "読み込み中...",
    KO: "로딩 중...", CA: "Carregant...", EU: "Kargatzen...", GL: "Cargando...", VA: "Carregant..."
};

let allData = [];

// NUEVO: además de pestañas completas, la hoja "Categorias" del backend también puede traer
// dos interruptores GLOBALES para toda la web (no por sección): id "fotos" (icono 📸 de
// galería, incluida la miniatura fija del vino "El Tenista") e id "info" (icono ℹ️ de
// descripción/preguntas). Se leen y guardan con el mismo mecanismo que las pestañas
// (fetchCategoriasDeshabilitadas), solo que generateItemHtml() los consulta directamente por
// su id fijo en vez de por pestanaId.
let idsGlobalesDesactivados = new Set();
let currentLang = 'ES', currentCat = R.pestanaInicial || '';
let currentGalleryPath = '', currentPhotoIndex = 1, maxPhotosFound = 1;
let verifiedImages = {}; 
let preloadQueue = [];
let isPreloading = false;
let currentPreloadSession = 0;

// Nombre de la pestaña fija de alérgenos (común a todos). Cada restaurante decide si la tiene y
// en qué posición poniendo { id: 'alergenos', especial: 'alergenos' } en su lista de pestañas.
const ALERGENOS_PESTANA_NOMBRE = {
        ES: 'Alérgenos e Intolerancias', EN: 'Allergens & Intolerances', DE: 'Allergene & Unverträglichkeiten', FR: 'Allergènes & Intolérances', IT: 'Allergeni e Intolleranze',
        RU: 'Аллергены и непереносимость', NL: 'Allergenen & Intoleranties', PL: 'Alergeny i Nietolerancje', SV: 'Allergener & Intoleranser', NO: 'Allergener & Intoleranser',
        DA: 'Allergener & Intolerancer', FI: 'Allergeenit & Intoleranssit', PT: 'Alergénios e Intolerâncias', RO: 'Alergeni și Intoleranțe', HU: 'Allergének és Intoleranciák',
        CS: 'Alergeny a Intolerance', EL: 'Αλλεργιογόνα & Δυσανεξίες', TR: 'Alerjenler ve İntoleranslar', AR: 'مسببات الحساسية وعدم التحمل', ZH: '过敏原与不耐受', JA: 'アレルゲンと不耐性',
        KO: '알레르기 유발물질 및 불내증', CA: 'Al·lèrgens i Intoleràncies', EU: 'Alergenoak eta Intolerantziak', GL: 'Alérxenos e Intolerancias', VA: 'Al·lèrgens i Intoleràncies'
};

// Lista de pestañas de la web: sale de R.pestanas. "let" porque init() la reasigna al filtrar
// las pestañas desactivadas desde el editor (ver fetchCategoriasDeshabilitadas()).
// Cada pestaña: { id, nombre:{ES,EN..}, rangos:[[ini,fin],..], grupos?, modoGrupos?, anexos?,
// precargaFotos? } — ver restaurante.js.
let categoriesList = (R.pestanas || []).map(p =>
    p.especial === 'alergenos' ? Object.assign({ nombre: ALERGENOS_PESTANA_NOMBRE }, p) : p
);
if (!currentCat && categoriesList.length) currentCat = categoriesList[0].id;

// NUEVO (8 septiembre): leyenda de la pestaña fija "Alérgenos e Intolerancias" (última pestaña,
// sin platos). "code" es el nombre exacto del archivo en imagenes/alergenos/ (ya usado por cada
// plato en generateItemHtml, ver alergenosHtml) -- se reutilizan los mismos 16 iconos, no hace
// falta subir ninguno nuevo. Orden y agrupación en 2 columnas iguales a la pestaña equivalente
// ya entregada en la web de Club House. ACTUALIZADO: completados los 26 idiomas en cada
// alérgeno (a petición del usuario) -- terminología de los 14 alérgenos oficiales de la UE
// (Reglamento 1169/2011) donde aplica, más "Plato Vegetariano/Vegano" que no son alérgenos
// oficiales pero se etiquetan igual en la carta.
const ALERGENOS_INFO_COL_IZQUIERDA = [
    { code: 'GLUTEN',
        ES: 'Gluten', EN: 'Gluten', DE: 'Gluten', FR: 'Gluten', IT: 'Glutine',
        RU: 'Глютен', NL: 'Gluten', PL: 'Gluten', SV: 'Gluten', NO: 'Gluten',
        DA: 'Gluten', FI: 'Gluteeni', PT: 'Glúten', RO: 'Gluten', HU: 'Glutén',
        CS: 'Lepek', EL: 'Γλουτένη', TR: 'Gluten', AR: 'الغلوتين', ZH: '麸质', JA: 'グルテン',
        KO: '글루텐', CA: 'Gluten', EU: 'Glutena', GL: 'Glute', VA: 'Gluten'
    },
    { code: 'LACTOSA',
        ES: 'Lactosa', EN: 'Lactose', DE: 'Laktose', FR: 'Lactose', IT: 'Lattosio',
        RU: 'Лактоза', NL: 'Lactose', PL: 'Laktoza', SV: 'Laktos', NO: 'Laktose',
        DA: 'Laktose', FI: 'Laktoosi', PT: 'Lactose', RO: 'Lactoză', HU: 'Laktóz',
        CS: 'Laktóza', EL: 'Λακτόζη', TR: 'Laktoz', AR: 'اللاكتوز', ZH: '乳糖', JA: '乳糖',
        KO: '유당', CA: 'Lactosa', EU: 'Laktosa', GL: 'Lactosa', VA: 'Lactosa'
    },
    { code: 'FRUTOSCASCARA',
        ES: 'Frutos de Cáscara', EN: 'Tree Nuts', DE: 'Schalenfrüchte', FR: 'Fruits à Coque', IT: 'Frutta a Guscio',
        RU: 'Орехи', NL: 'Noten', PL: 'Orzechy', SV: 'Nötter', NO: 'Nøtter',
        DA: 'Nødder', FI: 'Pähkinät', PT: 'Frutos de Casca Rija', RO: 'Fructe cu Coajă', HU: 'Diófélék',
        CS: 'Skořápkové plody', EL: 'Ξηροί Καρποί', TR: 'Kabuklu Yemişler', AR: 'المكسرات', ZH: '坚果', JA: 'ナッツ類',
        KO: '견과류', CA: 'Fruits de Closca', EU: 'Fruitu Lehorrak', GL: 'Froitos Secos', VA: 'Fruits de Closca'
    },
    { code: 'SULFITOS',
        ES: 'Sulfitos', EN: 'Sulphites', DE: 'Sulfite', FR: 'Sulfites', IT: 'Solfiti',
        RU: 'Сульфиты', NL: 'Sulfieten', PL: 'Siarczyny', SV: 'Sulfiter', NO: 'Sulfitter',
        DA: 'Sulfitter', FI: 'Sulfiitit', PT: 'Sulfitos', RO: 'Sulfiți', HU: 'Szulfitok',
        CS: 'Siřičitany', EL: 'Θειώδη', TR: 'Sülfitler', AR: 'الكبريتيت', ZH: '亚硫酸盐', JA: '亜硫酸塩',
        KO: '아황산염', CA: 'Sulfits', EU: 'Sulfitoak', GL: 'Sulfitos', VA: 'Sulfits'
    },
    { code: 'HUEVO',
        ES: 'Huevo', EN: 'Egg', DE: 'Ei', FR: 'Œuf', IT: 'Uovo',
        RU: 'Яйца', NL: 'Ei', PL: 'Jajka', SV: 'Ägg', NO: 'Egg',
        DA: 'Æg', FI: 'Kananmuna', PT: 'Ovo', RO: 'Ou', HU: 'Tojás',
        CS: 'Vejce', EL: 'Αυγό', TR: 'Yumurta', AR: 'البيض', ZH: '鸡蛋', JA: '卵',
        KO: '계란', CA: 'Ou', EU: 'Arrautza', GL: 'Ovo', VA: 'Ou'
    },
    { code: 'MOLUSCO',
        ES: 'Molusco', EN: 'Molluscs', DE: 'Weichtiere', FR: 'Mollusques', IT: 'Molluschi',
        RU: 'Моллюски', NL: 'Weekdieren', PL: 'Mięczaki', SV: 'Blötdjur', NO: 'Bløtdyr',
        DA: 'Bløddyr', FI: 'Nilviäiset', PT: 'Moluscos', RO: 'Moluște', HU: 'Puhatestűek',
        CS: 'Měkkýši', EL: 'Μαλάκια', TR: 'Yumuşakçalar', AR: 'الرخويات', ZH: '软体动物', JA: '軟体動物',
        KO: '연체동물', CA: 'Mol·luscos', EU: 'Moluskuak', GL: 'Moluscos', VA: 'Mol·luscs'
    },
    { code: 'PESCADO',
        ES: 'Pescado', EN: 'Fish', DE: 'Fisch', FR: 'Poisson', IT: 'Pesce',
        RU: 'Рыба', NL: 'Vis', PL: 'Ryby', SV: 'Fisk', NO: 'Fisk',
        DA: 'Fisk', FI: 'Kala', PT: 'Peixe', RO: 'Pește', HU: 'Hal',
        CS: 'Ryby', EL: 'Ψάρι', TR: 'Balık', AR: 'السمك', ZH: '鱼类', JA: '魚',
        KO: '생선', CA: 'Peix', EU: 'Arraina', GL: 'Peixe', VA: 'Peix'
    },
    { code: 'VEGETARIANO',
        ES: 'Plato Vegetariano', EN: 'Vegetarian Dish', DE: 'Vegetarisches Gericht', FR: 'Plat Végétarien', IT: 'Piatto Vegetariano',
        RU: 'Вегетарианское блюдо', NL: 'Vegetarisch Gerecht', PL: 'Danie Wegetariańskie', SV: 'Vegetarisk Rätt', NO: 'Vegetarrett',
        DA: 'Vegetarisk Ret', FI: 'Kasvisruoka', PT: 'Prato Vegetariano', RO: 'Fel Vegetarian', HU: 'Vegetáriánus Étel',
        CS: 'Vegetariánské Jídlo', EL: 'Χορτοφαγικό Πιάτο', TR: 'Vejetaryen Yemek', AR: 'طبق نباتي', ZH: '素食菜肴', JA: 'ベジタリアン料理',
        KO: '채식 요리', CA: 'Plat Vegetarià', EU: 'Plater Begetarianoa', GL: 'Prato Vexetariano', VA: 'Plat Vegetarià'
    },
    { code: 'VEGANO',
        ES: 'Plato Vegano', EN: 'Vegan Dish', DE: 'Veganes Gericht', FR: 'Plat Végétalien', IT: 'Piatto Vegano',
        RU: 'Веганское блюдо', NL: 'Veganistisch Gerecht', PL: 'Danie Wegańskie', SV: 'Vegansk Rätt', NO: 'Vegansk Rett',
        DA: 'Vegansk Ret', FI: 'Vegaaniruoka', PT: 'Prato Vegan', RO: 'Fel Vegan', HU: 'Vegán Étel',
        CS: 'Veganské Jídlo', EL: 'Βίγκαν Πιάτο', TR: 'Vegan Yemek', AR: 'طبق نباتي صرف', ZH: '纯素菜肴', JA: 'ビーガン料理',
        KO: '비건 요리', CA: 'Plat Vegà', EU: 'Plater Beganoa', GL: 'Prato Vegano', VA: 'Plat Vegà'
    }
];
const ALERGENOS_INFO_COL_DERECHA = [
    { code: 'SOJA',
        ES: 'Soja', EN: 'Soy', DE: 'Soja', FR: 'Soja', IT: 'Soia',
        RU: 'Соя', NL: 'Soja', PL: 'Soja', SV: 'Soja', NO: 'Soya',
        DA: 'Soja', FI: 'Soija', PT: 'Soja', RO: 'Soia', HU: 'Szója',
        CS: 'Sója', EL: 'Σόγια', TR: 'Soya', AR: 'الصويا', ZH: '大豆', JA: '大豆',
        KO: '대두', CA: 'Soja', EU: 'Soja', GL: 'Soia', VA: 'Soja'
    },
    { code: 'SESAMO',
        ES: 'Sésamo', EN: 'Sesame', DE: 'Sesam', FR: 'Sésame', IT: 'Sesamo',
        RU: 'Кунжут', NL: 'Sesam', PL: 'Sezam', SV: 'Sesam', NO: 'Sesam',
        DA: 'Sesam', FI: 'Seesami', PT: 'Sésamo', RO: 'Susan', HU: 'Szezámmag',
        CS: 'Sezam', EL: 'Σουσάμι', TR: 'Susam', AR: 'السمسم', ZH: '芝麻', JA: 'ごま',
        KO: '참깨', CA: 'Sèsam', EU: 'Ajonjolia', GL: 'Sésamo', VA: 'Sèsam'
    },
    { code: 'ALTRAMUCES',
        ES: 'Altramuces', EN: 'Lupin', DE: 'Lupinen', FR: 'Lupin', IT: 'Lupini',
        RU: 'Люпин', NL: 'Lupine', PL: 'Łubin', SV: 'Lupin', NO: 'Lupin',
        DA: 'Lupin', FI: 'Lupiini', PT: 'Tremoço', RO: 'Lupin', HU: 'Csillagfürt',
        CS: 'Vlčí bob', EL: 'Λούπινο', TR: 'Acı Bakla', AR: 'الترمس', ZH: '羽扇豆', JA: 'ルピナス豆',
        KO: '루핀', CA: 'Tramussos', EU: 'Altramuzak', GL: 'Chocho', VA: 'Tramussos'
    },
    { code: 'MOSTAZA',
        ES: 'Mostaza', EN: 'Mustard', DE: 'Senf', FR: 'Moutarde', IT: 'Senape',
        RU: 'Горчица', NL: 'Mosterd', PL: 'Gorczyca', SV: 'Senap', NO: 'Sennep',
        DA: 'Sennep', FI: 'Sinappi', PT: 'Mostarda', RO: 'Muștar', HU: 'Mustár',
        CS: 'Hořčice', EL: 'Μουστάρδα', TR: 'Hardal', AR: 'الخردل', ZH: '芥末', JA: 'マスタード',
        KO: '겨자', CA: 'Mostassa', EU: 'Mostaza', GL: 'Mostaza', VA: 'Mostassa'
    },
    { code: 'CACAHUETE',
        ES: 'Cacahuete', EN: 'Peanuts', DE: 'Erdnüsse', FR: 'Arachides', IT: 'Arachidi',
        RU: 'Арахис', NL: "Pinda's", PL: 'Orzeszki Ziemne', SV: 'Jordnötter', NO: 'Peanøtter',
        DA: 'Jordnødder', FI: 'Maapähkinä', PT: 'Amendoim', RO: 'Arahide', HU: 'Földimogyoró',
        CS: 'Arašídy', EL: 'Αράπικο Φιστίκι', TR: 'Yer Fıstığı', AR: 'الفول السوداني', ZH: '花生', JA: 'ピーナッツ',
        KO: '땅콩', CA: 'Cacauet', EU: 'Kakahuetea', GL: 'Cacahuete', VA: 'Cacauet'
    },
    { code: 'CRUSTACEO',
        ES: 'Crustáceo', EN: 'Crustaceans', DE: 'Krebstiere', FR: 'Crustacés', IT: 'Crostacei',
        RU: 'Ракообразные', NL: 'Schaaldieren', PL: 'Skorupiaki', SV: 'Kräftdjur', NO: 'Skalldyr',
        DA: 'Skaldyr', FI: 'Äyriäiset', PT: 'Crustáceos', RO: 'Crustacee', HU: 'Rákfélék',
        CS: 'Korýši', EL: 'Καρκινοειδή', TR: 'Kabuklular', AR: 'القشريات', ZH: '甲壳类', JA: '甲殻類',
        KO: '갑각류', CA: 'Crustacis', EU: 'Krustazeoak', GL: 'Crustáceos', VA: 'Crustacis'
    },
    { code: 'APIO',
        ES: 'Apio', EN: 'Celery', DE: 'Sellerie', FR: 'Céleri', IT: 'Sedano',
        RU: 'Сельдерей', NL: 'Selderij', PL: 'Seler', SV: 'Selleri', NO: 'Selleri',
        DA: 'Selleri', FI: 'Selleri', PT: 'Aipo', RO: 'Țelină', HU: 'Zeller',
        CS: 'Celer', EL: 'Σέλινο', TR: 'Kereviz', AR: 'الكرفس', ZH: '芹菜', JA: 'セロリ',
        KO: '셀러리', CA: 'Api', EU: 'Apioa', GL: 'Apio', VA: 'Api'
    }
];
// Frase de aviso debajo de la leyenda -- propuesta por Claude, pendiente de que el usuario la
// confirme o la sustituya por un texto propio (misma que en Club House). ACTUALIZADO: traducida
// a los 26 idiomas a petición del usuario.
// Cabecera "1/2 | Entero" de las pestañas donde algún plato tiene precio de media ración
// (columna PRECIO_MEDIA de la hoja). Si la hoja no tiene esa columna, no aparece nunca.
const PRECIO_COLUMNAS_TEXTO = {
    media: { ES: "1/2", EN: "Half", DE: "Halb", FR: "1/2", IT: "1/2", RU: "Половина", NL: "Half", PL: "Połowa", SV: "Halv", NO: "Halv", DA: "Halv", FI: "Puolikas", PT: "Meia", RO: "Jumătate", HU: "Fél", CS: "Půl", EL: "Μισή", TR: "Yarım", AR: "نصف", ZH: "半份", JA: "ハーフ", KO: "하프", CA: "1/2", EU: "Erdia", GL: "Media", VA: "1/2" },
    entero: { ES: "Entero", EN: "Whole", DE: "Ganz", FR: "Entier", IT: "Intero", RU: "Целая", NL: "Heel", PL: "Cała", SV: "Hel", NO: "Hel", DA: "Hel", FI: "Kokonainen", PT: "Inteira", RO: "Întreagă", HU: "Egész", CS: "Celá", EL: "Ολόκληρη", TR: "Tam", AR: "كامل", ZH: "整份", JA: "フル", KO: "풀", CA: "Sencer", EU: "Osoa", GL: "Enteira", VA: "Sencer" }
};

const ALERGENOS_AVISO_TEXTO = {
    ES: 'Si padece alguna alergia o intolerancia alimentaria, por favor infórmenos antes de realizar su pedido. Estaremos encantados de ayudarle a elegir las mejores opciones.',
    EN: 'If you have any food allergy or intolerance, please let us know before placing your order. We will be happy to help you choose the best options.',
    DE: 'Wenn Sie an einer Lebensmittelallergie oder -unverträglichkeit leiden, informieren Sie uns bitte vor der Bestellung. Wir helfen Ihnen gerne bei der Auswahl der besten Optionen.',
    FR: 'Si vous souffrez d\'une allergie ou d\'une intolérance alimentaire, merci de nous en informer avant de passer commande. Nous serons heureux de vous aider à choisir les meilleures options.',
    IT: 'Se soffre di un\'allergia o intolleranza alimentare, vi preghiamo di avvisarci prima di ordinare. Saremo lieti di aiutarvi a scegliere le opzioni migliori.',
    RU: 'Если у вас есть пищевая аллергия или непереносимость, пожалуйста, сообщите нам об этом перед заказом. Мы будем рады помочь вам выбрать лучшие варианты.',
    NL: 'Als u een voedselallergie of -intolerantie heeft, laat het ons dan weten voordat u bestelt. Wij helpen u graag de beste opties te kiezen.',
    PL: 'Jeśli masz jakąkolwiek alergię lub nietolerancję pokarmową, poinformuj nas przed złożeniem zamówienia. Chętnie pomożemy Ci wybrać najlepsze opcje.',
    SV: 'Om du har någon matallergi eller intolerans, vänligen meddela oss innan du beställer. Vi hjälper dig gärna att välja de bästa alternativen.',
    NO: 'Hvis du har en matallergi eller intoleranse, vennligst gi oss beskjed før du bestiller. Vi hjelper deg gjerne med å velge de beste alternativene.',
    DA: 'Hvis du har en fødevareallergi eller intolerance, bedes du give os besked, inden du bestiller. Vi hjælper dig gerne med at vælge de bedste muligheder.',
    FI: 'Jos sinulla on ruoka-allergia tai -intoleranssi, ilmoita siitä meille ennen tilaamista. Autamme mielellämme valitsemaan parhaat vaihtoehdot.',
    PT: 'Se sofre de alguma alergia ou intolerância alimentar, informe-nos antes de fazer o seu pedido. Teremos todo o gosto em ajudá-lo a escolher as melhores opções.',
    RO: 'Dacă suferiți de vreo alergie sau intoleranță alimentară, vă rugăm să ne informați înainte de a comanda. Vom fi bucuroși să vă ajutăm să alegeți cele mai bune opțiuni.',
    HU: 'Ha bármilyen ételallergiája vagy -intoleranciája van, kérjük, tájékoztasson minket rendelés előtt. Szívesen segítünk a legjobb lehetőségek kiválasztásában.',
    CS: 'Pokud trpíte jakoukoli potravinovou alergií nebo intolerancí, informujte nás prosím před objednáním. Rádi vám pomůžeme vybrat ty nejlepší možnosti.',
    EL: 'Εάν έχετε κάποια τροφική αλλεργία ή δυσανεξία, παρακαλούμε ενημερώστε μας πριν παραγγείλετε. Θα χαρούμε να σας βοηθήσουμε να επιλέξετε τις καλύτερες επιλογές.',
    TR: 'Herhangi bir gıda alerjiniz veya intoleransınız varsa, lütfen siparişinizi vermeden önce bize bildirin. En iyi seçenekleri seçmenize yardımcı olmaktan memnuniyet duyarız.',
    AR: 'إذا كنت تعاني من أي حساسية أو عدم تحمل غذائي، يرجى إخبارنا قبل تقديم طلبك. سيسعدنا مساعدتك في اختيار أفضل الخيارات.',
    ZH: '如果您有任何食物过敏或不耐受，请在点餐前告知我们。我们将很乐意帮助您选择最佳选项。',
    JA: '食物アレルギーや不耐性がある場合は、ご注文の前にお知らせください。最適なメニューをお選びするお手伝いをいたします。',
    KO: '식품 알레르기나 불내증이 있으시면 주문 전에 알려주시기 바랍니다. 최선의 선택을 하실 수 있도록 기꺼이 도와드리겠습니다.',
    CA: 'Si pateix alguna al·lèrgia o intolerància alimentària, informi\'ns abans de fer la seva comanda. Estarem encantats d\'ajudar-lo a triar les millors opcions.',
    EU: 'Elikagai-alergiaren edo intolerantziaren bat baduzu, mesedez jakinarazi eskaera egin aurretik. Pozik lagunduko dizugu aukerarik onenak hautatzen.',
    GL: 'Se padece algunha alerxia ou intolerancia alimentaria, por favor infórmenos antes de facer o seu pedido. Estaremos encantados de axudarlle a escoller as mellores opcións.',
    VA: 'Si patix alguna al·lèrgia o intolerància alimentària, per favor informe\'ns abans de fer la seua comanda. Estarem encantats d\'ajudar-lo a triar les millors opcions.'
};

// NUEVO: pinta la página fija de la pestaña "Alérgenos e Intolerancias" -- 2 columnas de
// icono+texto (mismos iconos que ya usa cada plato en imagenes/alergenos/) más la frase de
// aviso debajo. No depende de allData porque no es una lista de platos.
function generateAlergenosPageHtml() {
    const renderCol = (items) => items.map(a => {
        const label = a[currentLang] || a['EN'] || a['ES'];
        return `<div class="alergeno-info-row"><img src="imagenes/alergenos/${a.code}.webp" loading="lazy" onerror="this.style.display='none'"><span>${label}</span></div>`;
    }).join('');
    const aviso = txt((R.textos && R.textos.avisoAlergenos) || ALERGENOS_AVISO_TEXTO);
    return `<div class="alergenos-page">
        <div class="alergenos-page-columns">
            <div class="alergenos-page-col">${renderCol(ALERGENOS_INFO_COL_IZQUIERDA)}</div>
            <div class="alergenos-page-col">${renderCol(ALERGENOS_INFO_COL_DERECHA)}</div>
        </div>
        <p class="alergenos-page-aviso">${aviso}</p>
    </div>`;
}

// REESCRITO: antes se descargaban las 26 columnas de nombre + info de golpe en un único
// fetch (~470 KB con los datos actuales). Ahora se hace en 3 niveles de prioridad:
//  1) Idioma del cliente (+ ES, que se usa siempre como referencia secundaria bajo el
//     nombre principal) -> primer render lo antes posible.
//  2) Los 5 idiomas esenciales (ES/EN/DE/FR/IT) -> se piden en segundo plano justo después,
//     sin bloquear lo que ya se ve en pantalla.
//  3) El resto de los 26 idiomas -> solo se piden bajo demanda, si alguien los elige en el
//     selector "Más..." (ver changeLanguage).
// Si el endpoint en vivo fallara por lo que sea, se cae automáticamente al CSV_URL de
// siempre (con todas las columnas) para no dejar la web sin datos.
// NUEVO: lee la hoja "Categorias" del backend (Código.gs, ?accion=categorias) y devuelve el
// Set de ids de pestaña que están desactivadas (activa=NO). Si algo falla (red, endpoint aún
// no actualizado, etc.) devuelve un Set vacío — es decir, se muestran TODAS las pestañas, el
// mismo comportamiento de siempre. Nunca debe poder romper la carga del menú.
async function fetchCategoriasDeshabilitadas() {
    if (DATOS_TIPO === 'json') {
        try { return new Set(((await jsonBase()).ocultas || []).map(String)); }
        catch (e) { console.warn('[Pestañas] base.json no disponible, se muestran todas:', e.message); return new Set(); }
    }
    try {
        const url = `${LIVE_CSV_ENDPOINT}?accion=categorias&zx=${Date.now()}`;
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const text = await response.text();
        const filas = text.split(/\r?\n/).filter(f => f.trim() !== '');
        const deshabilitadas = new Set();
        filas.forEach((f, i) => {
            if (i === 0) return; // cabecera "ID,Activa"
            const c = f.split(',');
            const id = (c[0] || '').trim();
            const activa = (c[1] || '').trim().toUpperCase();
            if (id && activa === 'NO') deshabilitadas.add(id);
        });
        return deshabilitadas;
    } catch (e) {
        console.warn('[Pestañas] No se pudo comprobar qué secciones están desactivadas, se muestran todas:', e.message);
        return new Set();
    }
}

async function init() {
    try {
        injectVisualIndicatorStyles();
        populateLanguageSelect();
        if (DATOS_TIPO === 'json') aplicarIdiomasWeb(idiomasWebGuardados());

        const userLang = (navigator.language || navigator.userLanguage).split('-')[0].toUpperCase();
        currentLang = IDIOMAS[userLang] ? userLang : 'EN';
        comprobarIdiomasWeb();

        // Copia SIN filtrar de categoriesList — se usa como base cada vez que se aplica un
        // estado de pestañas desactivadas, para poder tanto ocultar como volver a mostrar una
        // categoría según el estado más reciente (filtrar en el sitio sería irreversible: una
        // vez quitada una categoría no habría forma de "recuperarla" si luego resulta que sigue
        // activa de verdad).
        const categoriesListOriginal = categoriesList.slice();

        const categoriasPromise = fetchCategoriasDeshabilitadas();

        // NUEVO (27 agosto, recordar último estado de toggles): antes de saber la respuesta real
        // del servidor (puede tardar de 1,5 a varios segundos), se aplica el último estado
        // CONFIRMADO en una visita anterior si lo hay — así el primer pintado ya acierta, sin
        // fotos/info/pestañas que en realidad llevan tiempo desactivadas apareciendo un instante
        // y desapareciendo después. Si no hay nada guardado (primera visita, o se borró), se
        // sigue asumiendo "todo activo" como hasta ahora.
        const togglesConocidos = leerTogglesCacheLocal();
        if (togglesConocidos) {
            idsGlobalesDesactivados = togglesConocidos;
            categoriesList = categoriesListOriginal.filter(c => !togglesConocidos.has(c.id));
            if (!categoriesList.some(c => c.id === currentCat)) {
                currentCat = categoriesList.length > 0 ? categoriesList[0].id : currentCat;
            }
        }

        // NUEVO (26 agosto, caché local + delta por hash): si este navegador ya tiene una copia
        // guardada de una visita anterior (y de esta misma versión de la app), se pinta con ella
        // AL INSTANTE — cero fetches antes del primer render — y la comprobación de qué ha
        // cambiado de verdad desde entonces se hace después, en segundo plano (ver
        // sincronizarConCache). Si no hay caché (primera visita en este navegador, se borró, o
        // es de una versión de la app distinta), se cae al flujo de siempre por etapas.
        const cache = leerCacheLocal();
        if (cache) {
            allData = cache.data;
            renderCategories();
            renderMenu();
            updateLanguageUI();
            managePreload();
            setupScrollListener();

            categoriasPromise.then(categoriasDeshabilitadas => {
                // Se guarda SIEMPRE el estado real confirmado, para que la próxima visita ya
                // parta de él (ver leerTogglesCacheLocal más arriba).
                guardarTogglesCacheLocal(categoriasDeshabilitadas);
                // Si coincide con lo que ya se había aplicado (desde la caché de toggles, o
                // porque no había ninguna y "todo activo" resultó ser correcto), no hay nada que
                // corregir ni que repintar — este es ahora el caso normal en visitas repetidas.
                if (idsIguales(categoriasDeshabilitadas, idsGlobalesDesactivados)) return;

                idsGlobalesDesactivados = categoriasDeshabilitadas;
                // La managePreload() de más arriba pudo haberse lanzado con un estado de "Fotos"
                // desactualizado; ahora que se confirma el real, se relanza para que cargue o
                // corte lo que corresponda (currentPreloadSession invalida la anterior si hacía
                // falta cortarla).
                managePreload();
                categoriesList = categoriesListOriginal.filter(c => !categoriasDeshabilitadas.has(c.id));
                if (!categoriesList.some(c => c.id === currentCat)) {
                    currentCat = categoriesList.length > 0 ? categoriesList[0].id : currentCat;
                }
                renderCategories();
                renderMenu();
            }).catch(e => console.warn('[Pestañas] No se pudo aplicar el estado de categorías:', e.message));

            // NUEVO: si el idioma del navegador cambió desde la última visita y no estaba entre
            // los ya cacheados, se pide igual que siempre bajo demanda (independiente de la
            // comprobación general de cambios, para no retrasarlo).
            if (!isLangLoaded(currentLang)) {
                fetchAndParseCsv([currentLang])
                    .then(items => { mergeIntoAllData(items); renderCategories(); renderMenu(); updateLanguageUI(); guardarCacheLocal(); })
                    .catch(e => console.warn('[Caché local] No se pudo precargar el idioma del cliente:', e.message));
            }

            sincronizarConCache(cache.data)
                .catch(e => console.warn('[Caché local] Fallo comprobando cambios en segundo plano:', e.message));
            return;
        }

        // v4.2: etapa 1 = idioma del móvil + los "primeros" (por defecto ES y EN; restaurante.js
        // idiomas.primeros). Etapa 2 = idiomas.esenciales. Etapa 3 = el resto (no en 2G/3G/ahorro).
        const PRIMEROS = (R.idiomas && R.idiomas.primeros) || ['ES', 'EN'];
        const idiomasEtapa1 = Array.from(new Set([currentLang, ...PRIMEROS]));

        try {
            allData = await fetchAndParseCsv(idiomasEtapa1);
        } catch (e) {
            if (DATOS_TIPO === 'json') {
                console.warn('[datos] Fallo cargando, reintento en 2 s:', e.message);
                await new Promise(r => setTimeout(r, 2000));
                allData = await fetchAndParseCsv(idiomasEtapa1);
            } else {
                console.warn('[Carga por etapas] Fallo en el endpoint en vivo, usando CSV completo de reserva:', e.message);
                const response = await fetch(CSV_URL);
                const csvText = await response.text();
                allData = parseCSV(csvText);
            }
        }

        // MODIFICADO (22 agosto, velocidad de apertura): antes se esperaba SIEMPRE a "categorias"
        // además del CSV antes de pintar nada — dos peticiones independientes a Apps Script, así
        // que si "categorias" tardaba más que el CSV (nada lo garantiza, aunque en la práctica
        // suele ser la más rápida de las dos), retrasaba el primer pintado sin necesidad. Ahora
        // se pinta en cuanto llega el CSV, con el supuesto por defecto de que nada está oculto
        // (que es el caso normal — "una pestaña ausente de la hoja se considera ACTIVA por
        // defecto"); si "categorias" resuelve después y de verdad hay algo desactivado, se repinta
        // solo entonces (repintado gratis en el caso normal, porque no hay nada que ocultar).
        if (allData.length > 0) {
            renderCategories();
            renderMenu();
            updateLanguageUI();
            managePreload();
            setupScrollListener();
            // NUEVO (26 agosto): se guarda ya lo que tenemos (idioma cliente + ES) por si el
            // usuario cierra la pestaña antes de que terminen las etapas 2/3 — así la próxima
            // visita ya parte de algo cacheado en vez de ir de cero. Se vuelve a guardar (con más
            // idiomas) al terminar cada etapa siguiente.
            guardarCacheLocal();
        }

        categoriasPromise.then(categoriasDeshabilitadas => {
            guardarTogglesCacheLocal(categoriasDeshabilitadas);
            if (idsIguales(categoriasDeshabilitadas, idsGlobalesDesactivados)) return;

            idsGlobalesDesactivados = categoriasDeshabilitadas; // fotos/info conviven en el mismo Set
            categoriesList = categoriesListOriginal.filter(c => !categoriasDeshabilitadas.has(c.id));
            if (!categoriesList.some(c => c.id === currentCat)) {
                currentCat = categoriesList.length > 0 ? categoriesList[0].id : currentCat;
            }
            if (allData.length > 0) {
                managePreload();
                renderCategories();
                renderMenu();
            }
        }).catch(e => console.warn('[Pestañas] No se pudo aplicar el estado de categorías:', e.message));

        // NUEVO: etapa 2 en segundo plano — no se espera ni bloquea el primer render.
        const idiomasPendientesEsenciales = ESSENTIAL_LANGS.filter(l => !idiomasEtapa1.includes(l));
        const etapa2 = idiomasPendientesEsenciales.length > 0
            ? fetchAndParseCsv(idiomasPendientesEsenciales).then(items => { mergeIntoAllData(items); guardarCacheLocal(); }).catch(e => console.warn('[Carga por etapas] No se pudieron precargar los idiomas esenciales restantes:', e.message))
            : Promise.resolve();

        // NUEVO: etapa 3 — el resto de los 26 idiomas, en segundo plano y SOLO después de que
        // la etapa 2 termine (para no competir por ancho de banda con lo prioritario). Pesa
        // poco por idioma (nombres cortos, sin INFO_* salvo en ES/EN), así que en conexiones
        // normales no cuesta nada tenerlo ya listo si alguien acaba abriendo el selector
        // "Más...". Si la conexión es lenta (Save-Data / 2G / 3G), se salta esta etapa.
        etapa2.then(() => {
            const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (conn && (conn.saveData || /2g|3g/.test(conn.effectiveType || ''))) return;

            const idiomasRestantes = Object.keys(IDIOMAS).filter(l => !idiomasEtapa1.includes(l) && !ESSENTIAL_LANGS.includes(l));
            if (idiomasRestantes.length === 0) return;
            fetchAndParseCsv(idiomasRestantes)
                .then(items => { mergeIntoAllData(items); guardarCacheLocal(); })
                .catch(e => console.warn('[Carga por etapas] No se pudo precargar el resto de idiomas:', e.message));
        });
    } catch (e) { console.error("Error en la inicialización:", e); }
}

function injectVisualIndicatorStyles() {
    if (document.getElementById('indicator-styles')) return;
    const style = document.createElement('style');
    style.id = 'indicator-styles';
    style.textContent = `
        .nav-container-interactive {
            position: relative;
            width: 100%;
            margin-bottom: 5px;
        }
        #category-selector {
            display: flex;
            overflow-x: auto;
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
            white-space: nowrap;
            padding-right: 50px !important;
        }
        #category-selector::-webkit-scrollbar {
            display: none;
        }
        .scroll-hint-hand {
            position: absolute;
            right: 25px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 28px;
            pointer-events: none;
            z-index: 100;
            opacity: 0.85;
            background: rgba(255,255,255,0.9);
            width: 44px;
            height: 44px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
            animation: swipeHand 1.6s ease-in-out infinite;
            transition: opacity 0.4s ease, transform 0.4s ease;
        }
        @keyframes swipeHand {
            0% { transform: translateY(-50%) translateX(10px); opacity: 0; }
            30% { opacity: 0.9; }
            70% { transform: translateY(-50%) translateX(-55px); opacity: 0.9; }
            100% { transform: translateY(-50%) translateX(-65px); opacity: 0; }
        }
        /* MODIFICADO (27 agosto, visibilidad de "hay más categorías"): el degradado blanco del
           borde bajaba de 45px a opacidad casi total (0.95) — eso tapaba justo la porción del
           siguiente botón que ya asoma de forma natural por el borde del contenedor (el propio
           recorte del overflow, sin necesitar JS), que es la pista más clara y universal de "esto
           continúa". Se deja mucho más estrecho y suave para que ese trocito de botón se siga
           viendo, y el borde no quede "borrado" en blanco.
        */
        .nav-container-interactive::after {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 18px;
            height: 100%;
            background: linear-gradient(to right, rgba(255,255,255,0), rgba(255, 255, 255, 0.55));
            pointer-events: none;
            z-index: 5;
        }
        /* NUEVO (26 agosto): indicador visual de "cargando idioma" — ver changeLanguage(). El
           anillo usa currentColor en el trazo superior para heredar automáticamente el color de
           texto del elemento donde se inserta (botón activo/inactivo, píldora...), sin tener que
           declarar colores propios que pudieran desentonar con el tema de cada web. */
        .lang-spinner {
            display: inline-block;
            width: 11px;
            height: 11px;
            margin-right: 6px;
            border: 2px solid rgba(128, 128, 128, 0.35);
            border-top-color: currentColor;
            border-radius: 50%;
            vertical-align: -1px;
            animation: lang-spin 0.7s linear infinite;
        }
        @keyframes lang-spin {
            to { transform: rotate(360deg); }
        }
        #language-selector button:disabled,
        #more-langs:disabled {
            opacity: 0.65;
            cursor: default;
        }
        .lang-loading-pill {
            display: inline-flex;
            align-items: center;
            margin-left: 8px;
            padding: 3px 10px;
            font-size: 0.8em;
            border-radius: 999px;
            background: rgba(128, 128, 128, 0.15);
            white-space: nowrap;
            vertical-align: middle;
        }
    `;
    document.head.appendChild(style);
}

function setupScrollListener() {
    const selector = document.getElementById('category-selector');
    if (!selector) return;

    const hideHint = () => {
        const hint = document.querySelector('.scroll-hint-hand');
        if (hint) {
            hint.style.opacity = '0';
            hint.style.transform = 'translateY(-50%) scale(0.5)';
            setTimeout(() => hint.remove(), 400); 
        }
        selector.removeEventListener('scroll', hideHint);
        selector.removeEventListener('touchstart', hideHint);
    };

    selector.addEventListener('scroll', hideHint);
    selector.addEventListener('touchstart', hideHint);
}

// v4.3: la web solo ofrece los idiomas elegidos en el editor (🌐 Idiomas -> base.json "idiomas";
// vacío = todos). ES y EN siempre. Se recuerda en este navegador para aplicarlo ya al abrir.
const IDIOMAS_TODOS_WEB = Object.assign({}, IDIOMAS);
const ESENCIALES_TODOS_WEB = ESSENTIAL_LANGS.slice();
const IDIOMAS_WEB_KEY = CACHE_PREFIX + '-idiomas-v1';
function aplicarIdiomasWeb(lista) {
    const ok = (Array.isArray(lista) && lista.length) ? new Set(lista.map(x => String(x).toUpperCase()).concat(['ES', 'EN'])) : null;
    Object.keys(IDIOMAS).forEach(k => delete IDIOMAS[k]);
    Object.keys(IDIOMAS_TODOS_WEB).forEach(k => { if (!ok || ok.has(k)) IDIOMAS[k] = IDIOMAS_TODOS_WEB[k]; });
    ESSENTIAL_LANGS.length = 0;
    ESENCIALES_TODOS_WEB.forEach(k => { if (IDIOMAS[k]) ESSENTIAL_LANGS.push(k); });
    document.querySelectorAll('#language-selector button').forEach(b => {
        b.style.display = IDIOMAS[b.id.replace('btn-', '')] ? '' : 'none';
    });
    populateLanguageSelect();
    const sel = document.getElementById('more-langs');
    if (sel) sel.style.display = sel.options.length > 1 ? '' : 'none';
}
function idiomasWebGuardados() {
    try { return JSON.parse(localStorage.getItem(IDIOMAS_WEB_KEY) || 'null'); } catch (e) { return null; }
}
function comprobarIdiomasWeb() {
    if (DATOS_TIPO !== 'json') return;
    jsonBase().then(b => {
        const lista = Array.isArray(b.idiomas) ? b.idiomas : [];
        try { localStorage.setItem(IDIOMAS_WEB_KEY, JSON.stringify(lista)); } catch (e) { }
        aplicarIdiomasWeb(lista);
        if (!IDIOMAS[currentLang]) changeLanguage('EN');
        else updateLanguageUI();
    }).catch(() => { });
}

function populateLanguageSelect() {
    const select = document.getElementById('more-langs');
    if (!select) return;
     
    select.innerHTML = '<option value="">🌐 Más...</option>';
     
    const ordenPrioritario = ['CA', 'EU', 'VA', 'GL'];
    
    ordenPrioritario.forEach(code => {
        if (IDIOMAS[code]) {
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = IDIOMAS[code];
            select.appendChild(opt);
        }
    });
    
    Object.entries(IDIOMAS).forEach(([code, name]) => {
        if (!ESSENTIAL_LANGS.includes(code) && !ordenPrioritario.includes(code)) {
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = name; 
            select.appendChild(opt);
        }
    });
}

function updateLanguageUI() {
    // NUEVO: activa/desactiva la maquetación de derecha a izquierda según el idioma actual.
    // Al ir en <html>, se hereda a toda la página (cabecera, pestañas de categorías, filas de
    // platos y el modal de info incluidos) sin tener que tocar CSS de cada componente uno a
    // uno: con dir="rtl" el texto se alinea a la derecha y flexbox invierte visualmente filas
    // como .item-row (el precio pasa a la izquierda, el nombre queda pegado al margen derecho).
    document.documentElement.dir = RTL_LANGS.includes(currentLang) ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang.toLowerCase();

    const menuTitleEl = document.getElementById('header-menu-title');
    if (menuTitleEl) {
        menuTitleEl.textContent = MENU_TEXTS[currentLang] || MENU_TEXTS['ES'];
    }

    document.querySelectorAll('#language-selector button').forEach(b => {
        b.classList.remove('active');
        const code = b.id.replace('btn-', '');
        if (IDIOMAS[code]) {
            b.textContent = IDIOMAS[code];
        }
    });
     
    const btn = document.getElementById(`btn-${currentLang}`);
    const select = document.getElementById('more-langs');
     
    if (btn) {
        btn.classList.add('active');
        if (select) select.value = '';
    } else {
        if (select) select.value = currentLang;
    }
}

// REESCRITO: antes leía por POSICIÓN fija de columna (col[0]..col[31], info a partir de la
// 32 en orden alfabético fijo). Eso rompía en cuanto el CSV traía menos columnas (como los
// que ahora sirve LIVE_CSV_ENDPOINT con &idiomas=). Ahora lee la fila de cabeceras y mapea
// por NOMBRE, así funciona igual de bien con el CSV completo (26 idiomas) que con uno
// parcial (p.ej. solo Nombre_KO/INFO_KO). Un nombre_xx / info_xx que no venga en este CSV se
// deja "undefined" a propósito — así isLangLoaded() puede distinguir "aún no cargado" de
// "cargado pero vacío".
function parseCSV(text) {
    const rows = [];
    const lines = text.split(/\r?\n(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    if (lines.length < 2) return rows;

    const clean = (val) => val ? val.replace(/^"|"$/g, '').replace(/""/g, '"').trim() : "";

    const headerCols = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => clean(h).toUpperCase());
    const idx = {};
    headerCols.forEach((h, i) => { if (h) idx[h] = i; });
    if (idx['ID'] === undefined) return rows;

    for (let i = 1; i < lines.length; i++) {
        const col = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const get = (headerName) => {
            const colIdx = idx[headerName];
            return (colIdx !== undefined && col[colIdx] !== undefined) ? clean(col[colIdx]) : undefined;
        };

        const idVal = get('ID');
        if (!idVal) continue;

        const item = {
            id: idVal,
            precio: (get('PRECIO') || '0').replace(',', '.'),
            precioMedia: (get('PRECIO_MEDIA') || '').replace(',', '.'),
            activa: (get('ACTIVA') || '').toUpperCase(),
            carpeta: get('CARPETA') || '',
            archivo: get('ARCHIVO_FOTO') || '',
            alergenos: (() => { const a = get('ALERGENOS_COD'); return a ? a.split(',').map(x => x.trim()).filter(x => x) : []; })(),
            // NUEVO (paridad con US Open): posiciones (1, 2, 3...) de las palabras entre
            // "//.../ /" del nombre que están desactivadas para este plato — p.ej. "2,5". Es
            // la misma lista para todos los idiomas (ver processName/generateItemHtml, que la
            // aplican por posición). Requiere que Código.gs sirva también la columna
            // OPCIONES_INACTIVAS (ver COLUMNAS_BASE en el propio Código.gs).
            opcionesInactivas: (() => { const o = get('OPCIONES_INACTIVAS'); return o ? o.split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n)) : []; })(),
            // NUEVO (26 agosto, caché local + delta por hash): hash de la fila calculado por el
            // servidor (ver Código.gs > calcularHashFila). Permite comparar "¿ha cambiado este
            // plato desde mi última visita?" sin descargar su contenido completo — ver
            // sincronizarConCache/diffHashes. '' si el servidor todavía no sirve esta columna
            // (versión antigua de Código.gs sin desplegar) o si esta respuesta concreta no la
            // incluye.
            hash: get('HASH_FILA') || ''
        };

        Object.keys(idx).forEach(h => {
            if (h.indexOf('NOMBRE_') === 0) {
                item[`nombre_${h.replace('NOMBRE_', '').toLowerCase()}`] = get(h) || '';
            } else if (h.indexOf('INFO_') === 0) {
                item[`info_${h.replace('INFO_', '').toLowerCase()}`] = get(h) || '';
            }
        });

        rows.push(item);
    }
    return rows;
}

// =========================================================================================
// v4.2 — DATOS EN JSON (datos.tipo 'json'). Sustituyen a las 4 peticiones a Apps Script con la
// misma forma de resultado que parseCSV, así el resto (etapas por idioma, caché local, hashes,
// changeLanguage) funciona igual. Archivos: datos/base.json y datos/<idioma>.json.
// cache:'no-cache' = el navegador revalida (304 si no cambió): barato con mala cobertura.
// =========================================================================================
let _jsonBase = null;
const _jsonIdiomas = {};
function jsonBase() {
    if (!_jsonBase) {
        _jsonBase = fetch(`${DATOS_CARPETA}base.json`, { cache: 'no-cache' })
            .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status + ' en base.json'); return r.json(); })
            .catch(e => { _jsonBase = null; throw e; });
    }
    return _jsonBase;
}
function jsonIdioma(l) {
    const k = l.toLowerCase();
    if (!_jsonIdiomas[k]) {
        _jsonIdiomas[k] = fetch(`${DATOS_CARPETA}${k}.json`, { cache: 'no-cache' })
            .then(r => { if (r.status === 404) return {}; if (!r.ok) throw new Error('HTTP ' + r.status + ' en ' + k + '.json'); return r.json(); })
            .catch(e => { delete _jsonIdiomas[k]; throw e; });
    }
    return _jsonIdiomas[k];
}
function jsonFilaBase(p) {
    return {
        id: String(p.id),
        precio: String(p.precio == null || p.precio === '' ? '0' : p.precio).replace(',', '.'),
        precioMedia: String(p.precioMedia == null ? '' : p.precioMedia).replace(',', '.'),
        activa: String(p.activa == null ? '' : p.activa).toUpperCase(),
        carpeta: p.carpeta || '',
        archivo: p.archivo || '',
        alergenos: (p.alergenos || []).map(x => String(x).trim()).filter(x => x),
        opcionesInactivas: (p.opcionesInactivas || []).map(x => parseInt(x, 10)).filter(n => !isNaN(n)),
        hash: p.h || ''
    };
}
async function jsonFilas(langs, ids) {
    const [base, ...textos] = await Promise.all([jsonBase(), ...langs.map(jsonIdioma)]);
    const filtro = ids ? new Set(ids.map(String)) : null;
    return (base.platos || []).filter(p => !filtro || filtro.has(String(p.id))).map(p => {
        const it = jsonFilaBase(p);
        langs.forEach((l, i) => {
            const t = textos[i][p.id] || [];
            it[`nombre_${l.toLowerCase()}`] = t[0] || '';
            it[`info_${l.toLowerCase()}`] = t[1] || '';
        });
        return it;
    });
}

// NUEVO: pide al endpoint en vivo solo las columnas de los idiomas indicados.
async function fetchAndParseCsv(langs) {
    if (DATOS_TIPO === 'json') return jsonFilas(langs);
    const idiomasParam = langs.join(',');
    const url = `${LIVE_CSV_ENDPOINT}?accion=csv&idiomas=${encodeURIComponent(idiomasParam)}&zx=${Date.now()}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const text = await response.text();
    return parseCSV(text);
}

// MODIFICADO (26 agosto, caché local + delta por hash): antes solo se pisaban las claves
// nombre_*/info_* (pensado para cuando cada lote descargado era SIEMPRE un idioma nuevo, nunca
// contenido ya visto). Ahora que también se usa para aplicar filas cambiadas (precio, activa,
// alérgenos, hash...) tras la comprobación de cambios en segundo plano, se pisa CUALQUIER clave
// que venga en el lote — precio/activa/carpeta/archivo/alergenos/opcionesInactivas/hash
// incluidos. Esto no cambia el comportamiento de las etapas 1/2/3 ni de changeLanguage(): un
// lote pedido solo con &idiomas= sigue trayendo las columnas base (Código.gs las incluye
// siempre, ver COLUMNAS_BASE), así que overwrite total. Sigue añadiendo el item entero si el id
// es nuevo (plato/vino recién creado en la hoja).
function mergeIntoAllData(newItems) {
    const byId = {};
    allData.forEach(it => { byId[it.id] = it; });
    newItems.forEach(ni => {
        const existente = byId[ni.id];
        if (existente) {
            Object.keys(ni).forEach(k => { existente[k] = ni[k]; });
        } else {
            allData.push(ni);
            byId[ni.id] = ni;
        }
    });
}

// NUEVO: ¿ya tenemos descargado el nombre de ese idioma para los platos? (undefined = nunca
// se pidió esa columna todavía; '' = se pidió y está vacía, que es distinto).
function isLangLoaded(lang) {
    if (allData.length === 0) return false;
    return allData[0][`nombre_${lang.toLowerCase()}`] !== undefined;
}

// =========================================================================================
// NUEVO (26 agosto): caché local (localStorage) + sincronización por hash. Objetivo: en una
// visita recurrente desde el mismo navegador, pintar la carta al instante con la última copia
// conocida (sin esperar ningún fetch) y comprobar en segundo plano qué ha cambiado de verdad
// desde entonces, descargando solo eso — en vez de repetir siempre la carga completa por
// etapas. Si algo falla en cualquier punto de este bloque (localStorage bloqueado/lleno, red,
// servidor con Código.gs aún sin actualizar...) se degrada solo, sin romper la carga normal:
// ver los try/catch y los "return null"/early-return de cada función.
// =========================================================================================

// Lee la caché guardada en este navegador. Devuelve null si no existe, está corrupta, o es de
// una versión de la app distinta a la que se está ejecutando ahora (para que un cambio futuro
// en la forma de los datos no se quede pisado con un objeto de forma antigua).
function leerCacheLocal() {
    try {
        const raw = localStorage.getItem(MENU_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.data) || parsed.data.length === 0) return null;
        if (parsed.appVersion !== APP_VERSION) return null;
        return parsed;
    } catch (e) {
        console.warn('[Caché local] No se pudo leer la caché, se ignora:', e.message);
        return null;
    }
}

// Guarda el estado actual de allData en localStorage. Se llama varias veces a lo largo de la
// carga (tras el primer pintado, tras cada etapa) para que incluso si el usuario cierra la
// pestaña antes de que termine todo, la próxima visita ya parta de algo en vez de ir de cero.
function guardarCacheLocal() {
    try {
        localStorage.setItem(MENU_CACHE_KEY, JSON.stringify({
            data: allData,
            ts: Date.now(),
            appVersion: APP_VERSION
        }));
    } catch (e) {
        console.warn('[Caché local] No se pudo guardar la caché (¿localStorage lleno o bloqueado?):', e.message);
    }
}

// NUEVO (27 agosto): recordar el último estado CONFIRMADO de pestañas/fotos/info entre visitas.
// Objetivo: la web pinta el menú al instante (desde MENU_CACHE_KEY) mucho antes de que responda
// ?accion=categorias (1,5 a varios segundos) — hasta ahora, mientras tanto, se asumía "todo
// activo", así que si en realidad "Fotos" (o una pestaña) estaba desactivada, se veía un
// instante y desaparecía al llegar la respuesta real ("flash"), además de arrancar una precarga
// de fotos que luego había que cortar. Guardando aquí el último estado real, la visita
// SIGUIENTE ya puede partir de él desde el primer pintado — sin esperar nada — y solo hace
// falta corregir si de verdad ha cambiado desde entonces (ver idsIguales más abajo).
// (TOGGLES_CACHE_KEY se define arriba, por restaurante.)

// Compara dos Set de ids por contenido (no por referencia).
function idsIguales(a, b) {
    if (a.size !== b.size) return false;
    for (const id of a) { if (!b.has(id)) return false; }
    return true;
}

function leerTogglesCacheLocal() {
    try {
        const raw = localStorage.getItem(TOGGLES_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.ids)) return null;
        return new Set(parsed.ids);
    } catch (e) {
        console.warn('[Toggles] No se pudo leer el último estado conocido, se asume todo activo:', e.message);
        return null;
    }
}

function guardarTogglesCacheLocal(idsDeshabilitados) {
    try {
        localStorage.setItem(TOGGLES_CACHE_KEY, JSON.stringify({ ids: Array.from(idsDeshabilitados) }));
    } catch (e) {
        console.warn('[Toggles] No se pudo guardar el último estado conocido:', e.message);
    }
}

// Pide SOLO las columnas base (incluida HASH_FILA) de todas las filas — una petición de unos
// pocos KB pensada únicamente para comprobar qué ha cambiado, no para renderizar nada con ella
// directamente (los nombre_*/info_* de estas filas vendrán "undefined", como espera parseCSV).
async function fetchHashesBase() {
    if (DATOS_TIPO === 'json') return jsonFilas([]);
    const url = `${LIVE_CSV_ENDPOINT}?accion=csv&soloBase=1&zx=${Date.now()}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const text = await response.text();
    return parseCSV(text);
}

// Pide el contenido completo (columnas base + los idiomas indicados) de solo las filas cuyo ID
// esté en la lista — para traer SOLO lo que ha cambiado, tras compararlo con fetchHashesBase.
async function fetchFilasPorId(ids, langs) {
    if (DATOS_TIPO === 'json') return (ids && ids.length) ? jsonFilas(langs, ids) : [];
    if (!ids || ids.length === 0) return [];
    const idiomasParam = langs.join(',');
    const idsParam = ids.join(',');
    const url = `${LIVE_CSV_ENDPOINT}?accion=csv&idiomas=${encodeURIComponent(idiomasParam)}&ids=${encodeURIComponent(idsParam)}&zx=${Date.now()}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const text = await response.text();
    return parseCSV(text);
}

// Qué idiomas tiene ya cargados (nombre_xx presente, aunque sea vacío) un conjunto de datos
// dado — se usa para saber qué idiomas pedir de las filas que han cambiado, sin perder ninguno
// de los que este navegador ya tenía descargados antes de la comprobación.
function detectarIdiomasEnData(data) {
    if (!data || data.length === 0) return [];
    const langs = new Set();
    Object.keys(data[0]).forEach(k => {
        if (k.startsWith('nombre_')) langs.add(k.replace('nombre_', '').toUpperCase());
    });
    return Array.from(langs);
}

// Compara la caché guardada contra las filas base recién descargadas (por hash) y devuelve qué
// IDs han cambiado (nuevo o hash distinto) y qué IDs de la caché ya no existen en la hoja.
function diffHashes(cachedData, freshBaseRows) {
    const cachedById = {};
    cachedData.forEach(it => { cachedById[it.id] = it; });
    const freshIds = new Set();
    const changedIds = [];
    freshBaseRows.forEach(row => {
        freshIds.add(row.id);
        const cached = cachedById[row.id];
        if (!cached || cached.hash !== row.hash) changedIds.push(row.id);
    });
    const deletedIds = cachedData.filter(it => !freshIds.has(it.id)).map(it => it.id);
    return { changedIds, deletedIds };
}

// Comprobación en segundo plano tras un arranque "en caliente" (pintado desde caché): pide solo
// los hashes, calcula qué ha cambiado/desaparecido desde la copia guardada, y solo si hay algo
// distinto descarga el contenido completo de esas filas concretas (en los idiomas que este
// navegador ya tenía cargados) y repinta. Si no hay ningún cambio, no se descarga ni se repinta
// nada más — la visita ya se sirvió entera desde la caché.
async function sincronizarConCache(cachedData) {
    const freshBaseRows = await fetchHashesBase();
    const { changedIds, deletedIds } = diffHashes(cachedData, freshBaseRows);

    if (changedIds.length === 0 && deletedIds.length === 0) return;

    if (deletedIds.length > 0) {
        const deletedSet = new Set(deletedIds.map(String));
        allData = allData.filter(it => !deletedSet.has(String(it.id)));
    }

    if (changedIds.length > 0) {
        const idiomasNecesarios = Array.from(new Set([currentLang, ...detectarIdiomasEnData(cachedData)]));
        const filasActualizadas = await fetchFilasPorId(changedIds, idiomasNecesarios);
        mergeIntoAllData(filasActualizadas);
    }

    renderCategories();
    renderMenu();
    guardarCacheLocal();
}

// Un plato pertenece a una pestaña si su ID cae en alguno de los rangos de esa pestaña.
function isItemInCategory(itemId, catId) {
    const cat = categoriesList.find(c => c.id === catId);
    return !!cat && enRangos(parseInt(itemId, 10), cat.rangos);
}

function renderCategories() { 
    const nav = document.getElementById('category-selector'); 
    if (!nav) return;

    if (nav.parentNode && !nav.parentNode.classList.contains('nav-container-interactive')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'nav-container-interactive';
        nav.parentNode.insertBefore(wrapper, nav);
        wrapper.appendChild(nav);
         
        const handHint = document.createElement('div');
        handHint.className = 'scroll-hint-hand';
        handHint.innerHTML = '👉'; 
        wrapper.appendChild(handHint);
    }

    nav.innerHTML = categoriesList.map(c => {
        const finalLabel = txtConES(c.nombre);
        return `<button onclick="filterCategory('${c.id}')" class="cat-btn ${currentCat === c.id ? 'active' : ''}">${finalLabel}</button>`;
    }).join('');
}

function renderMenu() {
    const grid = document.getElementById('items-list'), title = document.getElementById('current-category-name');
    const catObj = categoriesList.find(c => c.id === currentCat);
    const translatedTitle = catObj ? txtConES(catObj.nombre) : '';

    if (title) title.innerHTML = `${translatedTitle} <span style="font-size: 0.4em; opacity: 0.5; font-weight: normal; margin-left: 10px;">${APP_VERSION}</span>`;
    if (grid) grid.innerHTML = '';
    if (!catObj || !grid) return;

    // Página fija de contenido (sin platos).
    if (catObj.especial === 'alergenos') {
        grid.innerHTML = generateAlergenosPageHtml();
        return;
    }

    // Todo lo activo dentro de los rangos de la pestaña, en el orden de la hoja.
    const filtered = allData.filter(item => enRangos(parseInt(item.id, 10), catObj.rangos) && item.activa === 'SI');
    const titulo = (o) => `<h3 class="sub-category-title">${txtConES(o)}</h3>`;
    const grupos = catObj.grupos || [];

    // Precio de media ración: si algún plato de la pestaña lo tiene, todas sus filas llevan dos
    // columnas (1/2 | Entero) con una cabecera encima, alineada con ellas.
    const dual = filtered.some(item => parseFloat(item.precioMedia) > 0);
    const o = { dual };
    if (dual) {
        grid.innerHTML += `<div class="item-row price-columns-header"><div class="item-content"></div>` +
            `<div class="price-box price-box-dual"><span class="price-cell"><small>${txt(PRECIO_COLUMNAS_TEXTO.media)}</small></span>` +
            `<span class="price-cell"><small>${txt(PRECIO_COLUMNAS_TEXTO.entero)}</small></span></div></div>`;
    }

    if (grupos.length && catObj.modoGrupos === 'secuencial') {
        // Recorre los platos en orden y pone el título de su grupo cada vez que cambia
        // (vinos por zona). Un plato sin grupo se pinta sin título y no corta el bloque.
        let tituloActual = '';
        filtered.forEach(item => {
            const idNum = parseInt(item.id, 10);
            const g = grupos.find(gr => enRangos(idNum, gr.rangos));
            if (g) {
                const t = txtConES(g.nombre);
                if (t !== tituloActual) { grid.innerHTML += titulo(g.nombre); tituloActual = t; }
            }
            grid.innerHTML += generateItemHtml(item, o);
        });
    } else if (grupos.length) {
        // "bloques": primero los platos que no caen en ningún grupo (sin título) y después cada
        // grupo, en el orden declarado, con su título. Cada plato va al PRIMER grupo que lo
        // contenga. Un grupo sin platos activos no se pinta.
        const porGrupo = grupos.map(() => []);
        const sueltos = [];
        filtered.forEach(item => {
            const idNum = parseInt(item.id, 10);
            const i = grupos.findIndex(gr => enRangos(idNum, gr.rangos));
            (i >= 0 ? porGrupo[i] : sueltos).push(item);
        });
        sueltos.forEach(item => { grid.innerHTML += generateItemHtml(item, o); });
        grupos.forEach((g, i) => {
            if (porGrupo[i].length === 0) return;
            grid.innerHTML += titulo(g.nombre);
            porGrupo[i].forEach(item => { grid.innerHTML += generateItemHtml(item, o); });
        });
    } else {
        filtered.forEach(item => { grid.innerHTML += generateItemHtml(item, o); });
    }

    // Anexos: platos de OTROS rangos que se añaden al final de la pestaña con su título
    // (p. ej. guarniciones dentro de Principales).
    (catObj.anexos || []).forEach(anx => {
        const items = allData.filter(item => enRangos(parseInt(item.id, 10), anx.rangos) && item.activa === 'SI');
        if (items.length === 0) return;
        grid.innerHTML += titulo(anx.nombre);
        items.forEach(item => { grid.innerHTML += generateItemHtml(item, { dual, sinPrecioHasta: anx.sinPrecioHasta }); });
    });
}

// NUEVO: helpers para pasar el JSON de info_* al onclick sin que ninguna comilla, apóstrofe
// o barra invertida del texto pueda romper el HTML/JS generado (ver showInfoModal).
function utf8ToB64(str) { return btoa(unescape(encodeURIComponent(str))); }
function b64ToUtf8(str) { return decodeURIComponent(escape(atob(str))); }

// MODIFICADO: Lógica para incluir el icono de información dinámico y el manejo del popup de preguntas/respuestas
// opts.sinPrecioHasta: los platos con ID <= ese número no muestran precio (anexos tipo
// guarniciones, donde las incluidas van sin precio y las de pago con él).
// opts.dual: dos columnas de precio (1/2 | Entero), ver renderMenu.
// R.notasInformativas: IDs que no son platos sino avisos (p. ej. "Opción de pan sin gluten"):
// se pintan centrados a todo el ancho y sin precio.
function generateItemHtml(item, opts = {}) {
    // MODIFICADO (paridad con US Open): además del "Nombre // Detalle" de siempre (una sola
    // pareja de "//", usado para la uva de los vinos), ahora se admiten VARIAS palabras entre
    // "//.../ /" seguidas — cada una es una "opción" independiente (sabor, ingrediente...) que
    // se puede activar/desactivar por plato desde el editor (ver item.opcionesInactivas). OJO:
    // a propósito NO se filtran los trozos vacíos del split ANTES de separar nombre/opciones —
    // si se hiciera, un separador no vacío como " , " desplazaría la paridad par/impar y se
    // romperían las posiciones. Los índices IMPARES del split (1, 3, 5...) son siempre las
    // opciones; los PARES (0, 2, 4...) son el nombre y el texto de relleno entre opciones, que
    // se descarta.
    const processName = (text) => {
        if (!text) return { name: '', uvas: '', opciones: [] };
        const parts = text.split('//');
        const name = (parts[0] || '').trim();
        const opciones = [];
        for (let i = 1; i < parts.length; i += 2) {
            const tok = (parts[i] || '').trim();
            if (tok !== '') opciones.push(tok);
        }
        return { name, uvas: opciones[0] || '', opciones };
    };

    // NUEVO: texto final de la segunda línea — solo las opciones ACTIVAS (por posición
    // 1-based, misma lista para todos los idiomas), unidas por comas.
    const opcionesActivasTexto = (data) => {
        if (!data.opciones || data.opciones.length === 0) return '';
        const inactivas = item.opcionesInactivas || [];
        return data.opciones.filter((_, idx) => !inactivas.includes(idx + 1)).join(', ');
    };

    const currentData = processName(item[`nombre_${currentLang.toLowerCase()}`] || item.nombre_es);
    const secondaryData = processName(item.nombre_es);
    const currentOpcionesTexto = opcionesActivasTexto(currentData);
    const secondaryOpcionesTexto = opcionesActivasTexto(secondaryData);

    const ocultarPrecio = opts.sinPrecioHasta !== undefined && parseInt(item.id, 10) <= opts.sinPrecioHasta;
    const price = ocultarPrecio ? '' : (parseFloat(item.precio) > 0 ? `${parseFloat(item.precio).toFixed(2)}€` : ''); 
    const precioMedia = ocultarPrecio ? '' : (parseFloat(item.precioMedia) > 0 ? `${parseFloat(item.precioMedia).toFixed(2)}€` : '');
    const esNota = (R.notasInformativas || []).includes(parseInt(item.id, 10));
    const priceBoxHtml = esNota ? ''
        : opts.dual ? `<div class="price-box price-box-dual"><span class="price-cell">${precioMedia}</span><span class="price-cell">${price}</span></div>`
        : `<div class="price-box">${price}</div>`;
    const alergenosHtml = item.alergenos.map(a => `<img src="imagenes/alergenos/${a}.webp" loading="lazy" onerror="this.style.display='none'">`).join('');  
     
    let photoIcon = ''; 
    let clickAction = ''; 
    let clickableStyle = '';

    if (!idsGlobalesDesactivados.has('fotos') && item.archivo && item.archivo.includes('01.webp')) {
        const base = `imagenes/${item.carpeta}/${item.archivo.split('01.webp')[0]}`;
        photoIcon = `<span class="emoji-photo">📸</span>`;
        clickAction = `onclick="openGallery('${base}')"`;
        clickableStyle = 'style="cursor: pointer;"';
    }

    // Miniatura fija siempre visible en la fila (R.miniaturas: { id: 'ruta' } o
    // { id: { src: 'ruta', clase: 'clase-extra' } }). Se oculta con el interruptor global "fotos".
    const mini = (R.miniaturas || {})[String(item.id)];
    const miniSrc = mini ? (typeof mini === 'string' ? mini : mini.src) : '';
    const miniClase = mini && typeof mini === 'object' && mini.clase ? ' ' + mini.clase : '';
    const tenistaThumbHtml = (!idsGlobalesDesactivados.has('fotos') && miniSrc)
        ? `<div class="tenista-inline-thumb-wrapper"><img src="${miniSrc}?v=${IMG_CACHE_BUST}" class="tenista-inline-thumb${miniClase}" alt="" onclick="event.stopPropagation(); openMiniaturaLarge('${miniSrc}')" style="cursor:pointer;"></div>`
        : '';

    // NUEVO: Comprobar si existe información para el idioma actual y generar el icono correspondiente
    let infoIconHtml = '';
    const infoKey = `info_${currentLang.toLowerCase()}`;
    const infoData = item[infoKey];
    if (!idsGlobalesDesactivados.has('info') && infoData && infoData.trim() !== '') {
        // CORREGIDO: antes se escapaban las comillas a mano (' -> \' , " -> &quot;), pero si el
        // JSON ya traía una comilla interna escapada (\"), JS se comía la barra invertida al
        // evaluar el string y dejaba una comilla suelta -> JSON.parse fallaba en silencio y el
        // botón no hacía nada, solo en los platos cuyo texto llevaba una frase entrecomillada.
        // Base64 no tiene ese problema: no contiene comillas, apóstrofes ni barras invertidas.
        const b64Info = utf8ToB64(infoData);
        const infoClickHandler = `event.stopPropagation(); showInfoModal('${b64Info}')`;
        infoIconHtml = `<span class="emoji-info" onclick="${infoClickHandler}" title="Info">ℹ️</span>`;
    }

    // Lógica de ubicación del icono de info según las reglas solicitadas:
    // 1. Si existe foto, poner el icono de info justo al lado del icono de foto
    // 2. Si no existe foto pero hay descripción, ponerlo al final de la descripción
    // CORREGIDO: el nombre del plato debe mostrarse SIEMPRE; antes, cuando había foto, se sustituía por completo por los iconos
    const infoPlacement = `${currentData.name}${photoIcon ? ' ' + photoIcon : ''}${infoIconHtml ? ' ' + infoIconHtml : ''}`;

    return ` 
    <div class="item-row${esNota ? ' item-row-nota' : ''}"> 
        <div class="item-content" ${clickAction} ${clickableStyle}> 
            <span class="name-selected">
                ${infoPlacement}
                ${currentOpcionesTexto ? `<br><small style="font-size:0.85em; opacity:0.8; font-style:italic; display:block; margin-top:2px;">${currentOpcionesTexto}</small>` : ''}
            </span>
            ${currentLang !== 'ES' ? `
            <span class="name-secondary">
                ${secondaryData.name}
                ${secondaryOpcionesTexto ? `<br><small style="font-size:0.85em; opacity:0.8; font-style:italic;">${secondaryOpcionesTexto}</small>` : ''}
            </span>` : ''}
            <div class="alergenos-list">${alergenosHtml}</div> 
        </div> 
        ${priceBoxHtml}
        ${tenistaThumbHtml}
    </div>`;
}

function managePreload() {
    currentPreloadSession++;
    const mySession = currentPreloadSession;
    isPreloading = false;
    preloadQueue = [];

    // NUEVO (27 agosto): si la opción global "Fotos" está desactivada, no tiene sentido
    // descargar en segundo plano fotos que el usuario nunca va a poder ver (generateItemHtml
    // ya oculta el icono/miniatura/galería en ese caso). Antes esta función ignoraba el
    // toggle y precargaba igualmente, gastando datos/batería sin ningún beneficio visible.
    // El incremento de currentPreloadSession de arriba ya invalida cualquier precarga que
    // estuviera en curso de una llamada anterior, así que basta con no encolar nada nuevo.
    if (idsGlobalesDesactivados.has('fotos')) {
        return;
    }

    const sortedData = [...allData].sort((a, b) => parseInt(a.id) - parseInt(b.id));

    // MODIFICADO (22 agosto, optimización de carga inicial): dos cambios respecto a antes.
    // (1) YA NO se precargan en segundo plano las fotos de TODAS las demás categorías (antes
    // "otherFoodItems") — con ~130 fotos en el repo eso disparaba varios megas de descarga
    // silenciosa justo tras el primer pintado aunque el usuario nunca llegara a abrir esas
    // secciones; ahora solo se precarga la categoría que se está viendo, y el resto se precarga
    // bajo demanda al cambiar de pestaña (filterCategory/changeLanguage ya llaman a
    // managePreload() en ese momento). (2) el nivel por defecto baja de 4 a 2 fotos por plato —
    // la mayoría no pasa de la 1ª/2ª foto de la galería; la 3ª y 4ª se comprueban bajo demanda
    // al abrir la galería (openGallery ya prueba sobre la marcha lo que falte, sin bloquear la
    // apertura). Los vinos se quedan igual que antes, en 1 sola foto precargada por botella.
    const addCategoryByLevels = (items, maxNivel = 2) => {
        const bases = items.map(item => `imagenes/${item.carpeta}/${item.archivo.split('01.webp')[0]}`);
        for (let level = 1; level <= maxNivel; level++) {
            bases.forEach(base => { preloadQueue.push({ base, n: level }); });
        }
    };

    const currentItems = sortedData.filter(i => isItemInCategory(i.id, currentCat) && i.archivo && i.activa === 'SI');
    const catActual = categoriesList.find(c => c.id === currentCat);
    addCategoryByLevels(currentItems, (catActual && catActual.precargaFotos) || 2);

    processPreloadQueue(mySession);
}

async function processPreloadQueue(session) { 
    if (isPreloading) return; 
    isPreloading = true;

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn && (conn.saveData || /2g|3g/.test(conn.effectiveType || ''))) {
        isPreloading = false;
        return;
    }

    while (preloadQueue.length > 0) { 
        if (session !== currentPreloadSession) { isPreloading = false; return; }  
        const task = preloadQueue.shift(); 
        const url = `${task.base}0${task.n}.webp`;

        if (task.n > 1) { 
            const prevUrl = `${task.base}0${task.n - 1}.webp`; 
            if (verifiedImages[prevUrl] === false) { verifiedImages[url] = false; continue; } 
        }

        if (verifiedImages[url] !== undefined) continue;

        await new Promise(resolve => setTimeout(resolve, 150));
        if (session !== currentPreloadSession) { isPreloading = false; return; }

        const success = await new Promise(resolve => { 
            const img = new Image(); 
            img.onload = () => resolve(true); 
            img.onerror = () => resolve(false); 
            img.src = url; 
        });

        verifiedImages[url] = success; 
    } 
    isPreloading = false;
}

// Abre en grande una miniatura fija (ver R.miniaturas) en el modal de fotos, sin flechas.
function openMiniaturaLarge(src) {
    const img = document.getElementById('modal-img');
    const prev = document.getElementById('prev-btn');
    const next = document.getElementById('next-btn');
    if (img) img.src = src + '?v=' + IMG_CACHE_BUST;
    if (prev) prev.style.display = 'none';
    if (next) next.style.display = 'none';
    const modal = document.getElementById('photo-modal');
    if (modal) modal.style.display = 'flex';
}

async function openGallery(base) { 
    currentPreloadSession++;  
    currentGalleryPath = base;  
    currentPhotoIndex = 1;  
    maxPhotosFound = 1;

    updateModal(); 
    const modal = document.getElementById('photo-modal');
    if (modal) modal.style.display = 'flex';

    for (let i = 2; i <= 4; i++) { 
        const url = `${base}0${i}.webp`; 
        let exists = verifiedImages[url];

        if (exists === undefined) { 
            exists = await new Promise(r => {  
                const img = new Image();  
                img.onload = () => r(true);  
                img.onerror = () => r(false);  
                img.src = url;  
            }); 
            verifiedImages[url] = exists; 
        }

        if (exists) {  
            maxPhotosFound = i;  
            updateModal();  
        } else { 
            break;  
        } 
    } 
    processPreloadQueue(currentPreloadSession);
}

function updateModal() { 
    const img = document.getElementById('modal-img');
    const prev = document.getElementById('prev-btn');
    const next = document.getElementById('next-btn');

    if (img) img.src = `${currentGalleryPath}0${currentPhotoIndex}.webp`; 
    if (prev) prev.style.display = currentPhotoIndex > 1 ? 'block' : 'none'; 
    if (next) next.style.display = currentPhotoIndex < maxPhotosFound ? 'block' : 'none';
}

function changePhoto(n) { currentPhotoIndex += n; updateModal(); }
function closeModal() { const modal = document.getElementById('photo-modal'); if (modal) modal.style.display = 'none'; }

// NUEVO: Funcionalidad para mostrar el modal de información con preguntas y respuestas del plato
function showInfoModal(b64Str) {
    let data;
    try { 
        const jsonStr = b64ToUtf8(b64Str);
        data = JSON.parse(jsonStr); 
    } catch(e) { 
        console.error("Error al parsear info:", e); 
        return; 
    }

    let modal = document.getElementById('info-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'info-modal';
        document.body.appendChild(modal);
    }

    let html = `<div class="info-modal-content">
        <span class="close-modal" onclick="closeInfoModal()">&times;</span>
        <div class="info-desc">${data.desc || ''}</div>`;

    if (data.q1 && data.r1) html += `<div class="info-qa"><b>Q: ${data.q1}</b><br><span class="info-a">A: ${data.r1}</span></div>`;
    if (data.q2 && data.r2) html += `<div class="info-qa"><b>Q: ${data.q2}</b><br><span class="info-a">A: ${data.r2}</span></div>`;
    if (data.q3 && data.r3) html += `<div class="info-qa"><b>Q: ${data.q3}</b><br><span class="info-a">A: ${data.r3}</span></div>`;

    html += `</div>`;
    modal.innerHTML = html;
    modal.style.display = 'flex';
}

function closeInfoModal() {
    const modal = document.getElementById('info-modal');
    if (modal) modal.style.display = 'none';
}

// NUEVO (26 agosto): tiempo mínimo que se mantiene visible el indicador de "cargando idioma",
// aunque la respuesta llegue antes — para que en una red muy rápida no aparezca y desaparezca
// en un parpadeo casi imperceptible (peor sensación que no ponerlo, da la impresión de un tic).
const MIN_LOADING_VISIBLE_MS = 200;

// MODIFICADO (26 agosto): si el idioma elegido no es de los ya cargados (idioma del cliente, ES,
// o los esenciales), se pide bajo demanda al endpoint en vivo antes de renderizar. Antes, durante
// esa espera (los 1,5-3s típicos de latencia de Apps Script) no había NINGÚN cambio visible en
// los botones de idioma — solo se desactivaba el <select> de "Más...", así que pulsar un idioma
// del selector fijo (ES/EN/DE/FR/IT) podía dar la sensación de que el botón no había respondido.
// Ahora se muestra un anillo girando + el texto "cargando" traducido AL IDIOMA QUE SE PIDE (no al
// actual): si el idioma tiene botón fijo, el indicador sustituye el propio texto del botón; si
// viene del selector "Más...", se muestra como una pequeña píldora justo al lado (un <select>
// nativo no admite HTML dentro de sus opciones). Se bloquean todos los controles de idioma
// mientras dura la carga, para evitar dos peticiones solapadas si se pulsa dos veces seguidas.
async function changeLanguage(l) {
    if (!l) return;

    if (!isLangLoaded(l)) {
        const select = document.getElementById('more-langs');
        const btnEl = document.getElementById(`btn-${l}`);
        const textoCarga = LOADING_TEXTS[l] || LOADING_TEXTS['EN'];
        const spinnerHtml = `<span class="lang-spinner" aria-hidden="true"></span>${textoCarga}`;

        const originalBtnHtml = btnEl ? btnEl.innerHTML : null;
        let pillEl = null;

        document.querySelectorAll('#language-selector button').forEach(b => { b.disabled = true; });
        if (select) select.disabled = true;

        if (btnEl) {
            btnEl.innerHTML = spinnerHtml;
        } else if (select) {
            pillEl = document.createElement('span');
            pillEl.className = 'lang-loading-pill';
            pillEl.innerHTML = spinnerHtml;
            select.insertAdjacentElement('afterend', pillEl);
        }

        const inicioCarga = Date.now();
        let errorCarga = null;
        try {
            const nuevosItems = await fetchAndParseCsv([l]);
            mergeIntoAllData(nuevosItems);
        } catch (e) {
            errorCarga = e;
        }

        // NUEVO: fuerza el tiempo mínimo visible antes de quitar el indicador.
        const transcurrido = Date.now() - inicioCarga;
        if (transcurrido < MIN_LOADING_VISIBLE_MS) {
            await new Promise(r => setTimeout(r, MIN_LOADING_VISIBLE_MS - transcurrido));
        }

        if (btnEl && originalBtnHtml !== null) btnEl.innerHTML = originalBtnHtml;
        if (pillEl) pillEl.remove();
        document.querySelectorAll('#language-selector button').forEach(b => { b.disabled = false; });
        if (select) select.disabled = false;

        if (errorCarga) {
            console.error('Error cargando idioma bajo demanda:', errorCarga.message);
            return; // se queda en el idioma anterior si falla la descarga
        }
    }

    currentLang = l;
    updateLanguageUI();
    renderCategories();
    renderMenu();
    managePreload();
}

// NUEVO (28 agosto): la barra de categorías se puede arrastrar con el dedo/ratón, y al pulsar
// una pestaña que queda fuera de la parte visible de esa barra, el usuario perdía de vista cuál
// estaba activa (el resaltado oscuro de .cat-btn.active existe, pero de nada sirve si el propio
// botón está desplazado fuera de la pantalla). Esta función trae siempre de vuelta a la vista el
// botón de la categoría activa, sin mover el scroll vertical de la página (block:'nearest').
function scrollActiveCategoryIntoView() {
    const activeBtn = document.querySelector('#category-selector .cat-btn.active');
    if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
}

function filterCategory(id) {
    currentCat = id;
    renderCategories();
    renderMenu();
    window.scrollTo(0,0);
    managePreload();
    scrollActiveCategoryIntoView();
}

init();

window.addEventListener('hashchange', checkUrlHash);
window.addEventListener('DOMContentLoaded', checkUrlHash);

function checkUrlHash() { 
    const hash = window.location.hash.replace('#', ''); 
    if (hash && categoriesList.some(c => c.id === hash)) { filterCategory(hash); }
}

// NUEVO: Listener global para cerrar el modal de información al hacer clic fuera de él
document.addEventListener('click', function(e) {
    const modal = document.getElementById('info-modal');
    if (modal && e.target === modal) {
        closeInfoModal();
    }
});
