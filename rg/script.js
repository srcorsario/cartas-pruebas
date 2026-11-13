const R = window.RESTAURANTE || {};
const BUILD = window.CARTA_BUILD || {};
const APP_VERSION = 'v4.15.0';
const CSV_URL = (R.datos && R.datos.csv) || '';
const LIVE_CSV_ENDPOINT = (R.datos && R.datos.vivo) || '';
const DATOS_TIPO = (R.datos && R.datos.tipo) || 'sheets';
const DATOS_CARPETA = (R.datos && R.datos.carpeta) || 'datos/';
const ESSENTIAL_LANGS = (R.idiomas && R.idiomas.esenciales) || ['ES', 'EN', 'DE', 'FR', 'IT'];
const RTL_LANGS = (R.idiomas && R.idiomas.rtl) || ['AR'];
const CACHE_PREFIX = (R.id || 'carta') + (BUILD.entorno === 'pruebas' ? '-pruebas' : '');
const MENU_CACHE_KEY = CACHE_PREFIX + '-menu-v1';
const TOGGLES_CACHE_KEY = CACHE_PREFIX + '-toggles-v1';
const PESTANAS_CACHE_KEY = CACHE_PREFIX + '-pestanas-v1';
const IMG_CACHE_BUST = BUILD.v || Date.now();
function txt(o) { return o ? (o[currentLang] || o['EN'] || o['ES'] || '') : ''; }
function txtConES(o) { const t = txt(o); return currentLang === 'ES' ? t : `${t} - ${o['ES']}`; }
function enRangos(idNum, rangos) { return !!rangos && rangos.some(([a, b]) => idNum >= a && idNum <= b); }
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
const LOADING_TEXTS = {
ES: "Cargando...", EN: "Loading...", DE: "Wird geladen...", FR: "Chargement...", IT: "Caricamento...",
RU: "Загрузка...", NL: "Laden...", PL: "Ładowanie...", SV: "Laddar...", NO: "Laster...",
DA: "Indlæser...", FI: "Ladataan...", PT: "A carregar...", RO: "Se încarcă...", HU: "Betöltés...",
CS: "Načítání...", EL: "Φόρτωση...", TR: "Yükleniyor...", AR: "جارٍ التحميل...", ZH: "加载中...", JA: "読み込み中...",
KO: "로딩 중...", CA: "Carregant...", EU: "Kargatzen...", GL: "Cargando...", VA: "Carregant..."
};
let allData = [];
let idsGlobalesDesactivados = new Set();
let currentLang = 'ES', currentCat = R.pestanaInicial || '';
let currentGalleryPath = '', currentPhotoIndex = 1, maxPhotosFound = 1;
let verifiedImages = {};
const FOTO_LIGERA = (() => {
try {
const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
if (c && (c.saveData || /2g|3g/.test(c.effectiveType || ''))) return true;
const lado = Math.max(window.screen.width || 0, window.screen.height || 0);
return lado > 0 && lado <= 1000;
} catch (e) { return false; }
})();
let FOTOS_EXISTEN = null;
const fotosListas = Promise.race([
fetch('imagenes/fotos.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null)
.then(j => { if (j && Array.isArray(j.rutas)) FOTOS_EXISTEN = new Set(j.rutas.map(r => 'imagenes/' + r)); })
.catch(() => { }),
new Promise(r => setTimeout(r, 4000))
]);
function urlFotoLigera(url) { return url.replace(/^(imagenes\/[^/]+\/)([^/]+\.webp)$/, '$1m/$2'); }
function cargarFoto(url) {
return fotosListas.then(() => new Promise(resolve => {
const probar = (u, siguiente) => {
const img = new Image();
img.onload = () => resolve(u);
img.onerror = () => siguiente ? probar(siguiente, null) : resolve(false);
img.src = u;
};
const ligera = FOTO_LIGERA ? urlFotoLigera(url) : url;
const url01 = url.replace(/0[2-9]\.webp$/, '01.webp');
const soloLigera = url01 !== url && typeof verifiedImages[url01] === 'string' && verifiedImages[url01].includes('/m/');
if (FOTOS_EXISTEN) {
if (ligera !== url && FOTOS_EXISTEN.has(ligera)) probar(ligera, FOTOS_EXISTEN.has(url) ? url : null);
else if (FOTOS_EXISTEN.has(url)) probar(url, null);
else resolve(false);
return;
}
if (ligera !== url) probar(ligera, soloLigera ? null : url); else probar(url, null);
}));
}
let avisarFotosPrecargadas;
const fotosPrecargadas = new Promise(r => { avisarFotosPrecargadas = r; });
let avisarPestanaAbierta;
const pestanaAbiertaLista = new Promise(r => { avisarPestanaAbierta = r; });
const masIdiomasTocado = new Promise(r => {
const ver = e => { if (e.target && e.target.closest && e.target.closest('#more-langs')) r(); };
['pointerdown', 'touchstart', 'focusin', 'keydown'].forEach(t => document.addEventListener(t, ver, true));
});
let preloadQueue = [];
let isPreloading = false;
let currentPreloadSession = 0;
function redPrecarga() {
try {
const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const t = (c && c.effectiveType) || '';
if (c && c.saveData) return { hilos: 1 };
if (t === '4g') return { hilos: 3 };
} catch (e) { }
return { hilos: 2 };
}
let pendientesPrioritarios = 0;
function conPrioridad(p) {
pendientesPrioritarios++;
const fin = () => { pendientesPrioritarios = Math.max(0, pendientesPrioritarios - 1); };
p.then(fin, fin);
return p;
}
async function esperarTurno(session) {
const hasta = Date.now() + 8000;
while (pendientesPrioritarios > 0 && session === currentPreloadSession && Date.now() < hasta) await new Promise(r => setTimeout(r, 200));
}
const ALERGENOS_PESTANA_NOMBRE = {
ES: 'Alérgenos e Intolerancias', EN: 'Allergens & Intolerances', DE: 'Allergene & Unverträglichkeiten', FR: 'Allergènes & Intolérances', IT: 'Allergeni e Intolleranze',
RU: 'Аллергены и непереносимость', NL: 'Allergenen & Intoleranties', PL: 'Alergeny i Nietolerancje', SV: 'Allergener & Intoleranser', NO: 'Allergener & Intoleranser',
DA: 'Allergener & Intolerancer', FI: 'Allergeenit & Intoleranssit', PT: 'Alergénios e Intolerâncias', RO: 'Alergeni și Intoleranțe', HU: 'Allergének és Intoleranciák',
CS: 'Alergeny a Intolerance', EL: 'Αλλεργιογόνα & Δυσανεξίες', TR: 'Alerjenler ve İntoleranslar', AR: 'مسببات الحساسية وعدم التحمل', ZH: '过敏原与不耐受', JA: 'アレルゲンと不耐性',
KO: '알레르기 유발물질 및 불내증', CA: 'Al·lèrgens i Intoleràncies', EU: 'Alergenoak eta Intolerantziak', GL: 'Alérxenos e Intolerancias', VA: 'Al·lèrgens i Intoleràncies'
};
function prepararPestanas(lista) {
const r = (lista || []).map(p => {
p = Object.assign({}, p, { id: String(p.id) });
return p.especial === 'alergenos' ? Object.assign({ nombre: ALERGENOS_PESTANA_NOMBRE }, p) : p;
});
if (contactoTieneDatos(contactoWeb) && !r.some(p => p.especial === 'contacto')) r.push({ id: 'contacto', especial: 'contacto', nombre: CONTACTO_TEXTOS.pestana });
return r;
}
const CONTACTO_CACHE_KEY = 'contacto_' + (R.id || 'web') + '_' + ((window.CARTA_BUILD || {}).entorno || '');
const CONTACTO_TEXTOS = {
pestana: { ES: 'Contacto y horario', EN: 'Contact & opening hours', DE: 'Kontakt & Öffnungszeiten', FR: 'Contact & horaires', IT: 'Contatti e orari', RU: 'Контакты и часы работы', NL: 'Contact & openingstijden', PL: 'Kontakt i godziny otwarcia', SV: 'Kontakt & öppettider', NO: 'Kontakt og åpningstider', DA: 'Kontakt & åbningstider', FI: 'Yhteystiedot ja aukioloajat', PT: 'Contacto e horário', RO: 'Contact și program', HU: 'Kapcsolat és nyitvatartás', CS: 'Kontakt a otevírací doba', EL: 'Επικοινωνία & ωράριο', TR: 'İletişim ve çalışma saatleri', AR: 'الاتصال ومواعيد العمل', ZH: '联系方式与营业时间', JA: 'お問い合わせ・営業時間', KO: '연락처 및 영업시간', CA: 'Contacte i horari', EU: 'Harremana eta ordutegia', GL: 'Contacto e horario', VA: 'Contacte i horari' },
direccion: { ES: 'Dirección', EN: 'Address', DE: 'Adresse', FR: 'Adresse', IT: 'Indirizzo', RU: 'Адрес', NL: 'Adres', PL: 'Adres', SV: 'Adress', NO: 'Adresse', DA: 'Adresse', FI: 'Osoite', PT: 'Morada', RO: 'Adresă', HU: 'Cím', CS: 'Adresa', EL: 'Διεύθυνση', TR: 'Adres', AR: 'العنوان', ZH: '地址', JA: '住所', KO: '주소', CA: 'Adreça', EU: 'Helbidea', GL: 'Enderezo', VA: 'Adreça' },
comoLlegar: { ES: 'Cómo llegar', EN: 'Get directions', DE: 'Route planen', FR: 'Itinéraire', IT: 'Indicazioni', RU: 'Как добраться', NL: 'Route', PL: 'Wyznacz trasę', SV: 'Vägbeskrivning', NO: 'Veibeskrivelse', DA: 'Rutevejledning', FI: 'Reittiohjeet', PT: 'Como chegar', RO: 'Indicații', HU: 'Útvonal', CS: 'Navigovat', EL: 'Οδηγίες', TR: 'Yol tarifi', AR: 'الاتجاهات', ZH: '导航', JA: '経路案内', KO: '길찾기', CA: 'Com arribar-hi', EU: 'Nola iritsi', GL: 'Como chegar', VA: 'Com arribar-hi' },
telefono: { ES: 'Teléfono', EN: 'Phone', DE: 'Telefon', FR: 'Téléphone', IT: 'Telefono', RU: 'Телефон', NL: 'Telefoon', PL: 'Telefon', SV: 'Telefon', NO: 'Telefon', DA: 'Telefon', FI: 'Puhelin', PT: 'Telefone', RO: 'Telefon', HU: 'Telefon', CS: 'Telefon', EL: 'Τηλέφωνο', TR: 'Telefon', AR: 'الهاتف', ZH: '电话', JA: '電話', KO: '전화', CA: 'Telèfon', EU: 'Telefonoa', GL: 'Teléfono', VA: 'Telèfon' },
email: { ES: 'Correo', EN: 'Email', DE: 'E-Mail', FR: 'E-mail', IT: 'E-mail', RU: 'Эл. почта', NL: 'E-mail', PL: 'E-mail', SV: 'E-post', NO: 'E-post', DA: 'E-mail', FI: 'Sähköposti', PT: 'E-mail', RO: 'E-mail', HU: 'E-mail', CS: 'E-mail', EL: 'Email', TR: 'E-posta', AR: 'البريد الإلكتروني', ZH: '电子邮件', JA: 'メール', KO: '이메일', CA: 'Correu', EU: 'Posta', GL: 'Correo', VA: 'Correu' },
horario: { ES: 'Horario', EN: 'Opening hours', DE: 'Öffnungszeiten', FR: 'Horaires', IT: 'Orari', RU: 'Часы работы', NL: 'Openingstijden', PL: 'Godziny otwarcia', SV: 'Öppettider', NO: 'Åpningstider', DA: 'Åbningstider', FI: 'Aukioloajat', PT: 'Horário', RO: 'Program', HU: 'Nyitvatartás', CS: 'Otevírací doba', EL: 'Ωράριο', TR: 'Çalışma saatleri', AR: 'مواعيد العمل', ZH: '营业时间', JA: '営業時間', KO: '영업시간', CA: 'Horari', EU: 'Ordutegia', GL: 'Horario', VA: 'Horari' },
cerrado: { ES: 'Cerrado', EN: 'Closed', DE: 'Geschlossen', FR: 'Fermé', IT: 'Chiuso', RU: 'Закрыто', NL: 'Gesloten', PL: 'Zamknięte', SV: 'Stängt', NO: 'Stengt', DA: 'Lukket', FI: 'Suljettu', PT: 'Fechado', RO: 'Închis', HU: 'Zárva', CS: 'Zavřeno', EL: 'Κλειστό', TR: 'Kapalı', AR: 'مغلق', ZH: '休息', JA: '定休日', KO: '휴무', CA: 'Tancat', EU: 'Itxita', GL: 'Pechado', VA: 'Tancat' }
};
const LOCALE_DE_IDIOMA = { NO: 'nb', VA: 'ca' };
function contactoTieneDatos(c) {
return !!(c && (c.direccion || c.telefono || c.email || (Array.isArray(c.horario) && c.horario.some(x => x))));
}
let contactoWeb = (() => { try { return JSON.parse(localStorage.getItem(CONTACTO_CACHE_KEY) || 'null'); } catch (e) { return null; } })();
function aplicarContactoDeBase(base) {
if (!base) return;
const nuevo = contactoTieneDatos(base.contacto) ? base.contacto : null;
try { if (nuevo) localStorage.setItem(CONTACTO_CACHE_KEY, JSON.stringify(nuevo)); else localStorage.removeItem(CONTACTO_CACHE_KEY); } catch (e) { }
if (JSON.stringify(nuevo) === JSON.stringify(contactoWeb)) return;
contactoWeb = nuevo;
categoriesListOriginal = prepararPestanas(pestanasFuente);
filtrarPestanas(idsPestanasOcultas);
if (allData && allData.length) { renderCategories(); renderMenu(); }
}
function generateContactoPageHtml() {
const c = contactoWeb || {};
const e = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]));
const T = (k) => txt(CONTACTO_TEXTOS[k]);
let h = '<div class="contacto-pagina">';
if (c.direccion) {
const q = encodeURIComponent(c.mapa || c.direccion);
h += `<section class="contacto-bloque"><h3 class="sub-category-title">${T('direccion')}</h3>` +
`<p class="contacto-direccion">${e(c.direccion).replace(/\n/g, '<br>')}</p>` +
`<a class="contacto-boton" href="https://www.google.com/maps/dir/?api=1&destination=${q}" target="_blank" rel="noopener">📍 ${T('comoLlegar')}</a>` +
`<div class="contacto-mapa"><iframe src="https://maps.google.com/maps?q=${q}&z=16&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="${e(c.direccion)}"></iframe></div></section>`;
}
if (c.telefono || c.email) {
h += `<section class="contacto-bloque"><h3 class="sub-category-title">${T('telefono')}</h3>`;
if (c.telefono) h += `<p><a class="contacto-boton" href="tel:${e(String(c.telefono).replace(/[^+\d]/g, ''))}">📞 ${e(c.telefono)}</a></p>`;
if (c.email) h += `<p><a href="mailto:${e(c.email)}">✉️ ${e(c.email)}</a></p>`;
h += '</section>';
}
if (Array.isArray(c.horario) && c.horario.some(x => x)) {
let loc = (LOCALE_DE_IDIOMA[currentLang] || currentLang || 'es').toLowerCase();
const dia = (i) => { try { const d = new Date(2024, 0, 1 + i).toLocaleDateString(loc, { weekday: 'long' }); return d.charAt(0).toUpperCase() + d.slice(1); } catch (x) { return ['L', 'M', 'X', 'J', 'V', 'S', 'D'][i]; } };
const hoy = (new Date().getDay() + 6) % 7;
h += `<section class="contacto-bloque"><h3 class="sub-category-title">${T('horario')}</h3><table class="contacto-horario">` +
[0, 1, 2, 3, 4, 5, 6].map(i => { const v = String(c.horario[i] || '').trim();
return `<tr class="${i === hoy ? 'hoy' : ''}"><th>${e(dia(i))}</th><td>${v ? e(v) : '<span class="cerrado">' + T('cerrado') + '</span>'}</td></tr>`; }).join('') +
'</table></section>';
}
if (c.nota) h += `<p class="contacto-nota">${e(c.nota)}</p>`;
return h + '</div>';
}
function leerPestanasCacheLocal() {
try {
const raw = localStorage.getItem(PESTANAS_CACHE_KEY);
const p = raw ? JSON.parse(raw) : null;
return p && Array.isArray(p.pestanas) && p.pestanas.length ? p.pestanas : null;
} catch (e) { return null; }
}
function guardarPestanasCacheLocal(lista) {
try { localStorage.setItem(PESTANAS_CACHE_KEY, JSON.stringify({ pestanas: lista })); } catch (e) { }
}
let pestanasFuente = (DATOS_TIPO === 'json' && leerPestanasCacheLocal()) || R.pestanas || [];
let categoriesList = prepararPestanas(pestanasFuente);
let categoriesListOriginal = categoriesList.slice();
let idsPestanasOcultas = new Set();
if (!currentCat && categoriesList.length) currentCat = categoriesList[0].id;
function filtrarPestanas(ocultas) {
idsPestanasOcultas = ocultas || new Set();
categoriesList = categoriesListOriginal.filter(c => !idsPestanasOcultas.has(c.id));
if (!categoriesList.some(c => c.id === currentCat)) {
currentCat = categoriesList.length > 0 ? categoriesList[0].id : currentCat;
}
}
function aplicarMarcaDeBase(base) {
const B = window.CARTA_BUILD || {};
if (!base || (!base.marca && !B.marca)) return;
const m = base.marca || {};
const ico = m.favicon || m.logo;
if (ico) {
let l = document.querySelector('link[rel="icon"]');
if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); }
if (l.getAttribute('href') !== ico) { l.removeAttribute('type'); l.setAttribute('href', ico); }
}
const cont = document.querySelector('.header-logos');
if (!cont) return;
let img = document.getElementById('logo-marca');
if (!m.logo) { if (img) img.remove(); return; }
if (!img) {
img = document.createElement('img');
img.id = 'logo-marca'; img.className = 'header-logo logo-marca';
cont.insertBefore(img, cont.firstChild);
}
img.alt = m.nombre || img.alt || '';
if (img.getAttribute('src') !== m.logo) img.setAttribute('src', m.logo);
}
function aplicarPestanasDeBase(base) {
if (!base || !Array.isArray(base.pestanas) || !base.pestanas.length) return;
guardarPestanasCacheLocal(base.pestanas);
if (JSON.stringify(base.pestanas) === JSON.stringify(pestanasFuente)) return;
const sinPestanas = !categoriesListOriginal.length;
pestanasFuente = base.pestanas;
categoriesListOriginal = prepararPestanas(pestanasFuente);
if (sinPestanas && !currentCat) currentCat = R.pestanaInicial || '';
filtrarPestanas(idsPestanasOcultas);
const hash = sinPestanas ? (location.hash || '').replace('#', '') : '';
if (hash && categoriesList.some(c => c.id === hash)) currentCat = hash;
if (allData && allData.length) { renderCategories(); renderMenu(); }
}
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
if (i === 0) return;
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
if (DATOS_TIPO === 'json') jsonBase().then(b => { aplicarMarcaDeBase(b); aplicarContactoDeBase(b); aplicarPestanasDeBase(b); }).catch(() => { });
const categoriasPromise = fetchCategoriasDeshabilitadas();
const togglesConocidos = leerTogglesCacheLocal();
if (togglesConocidos) {
idsGlobalesDesactivados = togglesConocidos;
filtrarPestanas(togglesConocidos);
}
const cache = leerCacheLocal();
if (cache) {
allData = cache.data;
renderCategories();
renderMenu();
updateLanguageUI();
managePreload();
setupScrollListener();
categoriasPromise.then(categoriasDeshabilitadas => {
guardarTogglesCacheLocal(categoriasDeshabilitadas);
if (idsIguales(categoriasDeshabilitadas, idsGlobalesDesactivados)) return;
idsGlobalesDesactivados = categoriasDeshabilitadas;
managePreload();
filtrarPestanas(categoriasDeshabilitadas);
renderCategories();
renderMenu();
}).catch(e => console.warn('[Pestañas] No se pudo aplicar el estado de categorías:', e.message));
if (!isLangLoaded(currentLang)) {
fetchAndParseCsv([currentLang])
.then(items => { mergeIntoAllData(items); renderCategories(); renderMenu(); updateLanguageUI(); guardarCacheLocal(); })
.catch(e => console.warn('[Caché local] No se pudo precargar el idioma del cliente:', e.message));
}
sincronizarConCache(cache.data)
.catch(e => console.warn('[Caché local] Fallo comprobando cambios en segundo plano:', e.message));
return;
}
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
if (allData.length > 0) {
renderCategories();
renderMenu();
updateLanguageUI();
managePreload();
setupScrollListener();
guardarCacheLocal();
}
categoriasPromise.then(categoriasDeshabilitadas => {
guardarTogglesCacheLocal(categoriasDeshabilitadas);
if (idsIguales(categoriasDeshabilitadas, idsGlobalesDesactivados)) return;
idsGlobalesDesactivados = categoriasDeshabilitadas;
filtrarPestanas(categoriasDeshabilitadas);
if (allData.length > 0) {
managePreload();
renderCategories();
renderMenu();
}
}).catch(e => console.warn('[Pestañas] No se pudo aplicar el estado de categorías:', e.message));
const idiomasPendientesEsenciales = ESSENTIAL_LANGS.filter(l => !idiomasEtapa1.includes(l));
const etapa2 = idiomasPendientesEsenciales.length > 0
? fetchAndParseCsv(idiomasPendientesEsenciales).then(items => { mergeIntoAllData(items); guardarCacheLocal(); }).catch(e => console.warn('[Carga por etapas] No se pudieron precargar los idiomas esenciales restantes:', e.message))
: Promise.resolve();
pestanaAbiertaLista.then(() => cargarInfo(currentLang)).catch(e => console.warn('[Info] no se pudo bajar:', e.message));
Promise.all([etapa2, Promise.race([fotosPrecargadas, masIdiomasTocado])]).then(() => {
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
opcionesInactivas: (() => { const o = get('OPCIONES_INACTIVAS'); return o ? o.split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n)) : []; })(),
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
let _jsonBase = null;
const _jsonIdiomas = {};
const _temprano = (window.__DATOS_TEMPRANO && window.__DATOS_TEMPRANO.carpeta === DATOS_CARPETA) ? window.__DATOS_TEMPRANO : null;
function tomarTemprano(k) {
if (!_temprano) return null;
let p;
if (k === 'base') { p = _temprano.base; _temprano.base = null; }
else { p = _temprano.idiomas[k]; delete _temprano.idiomas[k]; }
return p || null;
}
function jsonBase() {
if (!_jsonBase) {
_jsonBase = conPrioridad((tomarTemprano('base') || fetch(`${DATOS_CARPETA}base.json`, { cache: 'no-cache' }))
.then(r => { if (!r.ok) throw new Error('HTTP ' + r.status + ' en base.json'); return r.json(); }))
.catch(e => { _jsonBase = null; throw e; });
}
return _jsonBase;
}
function jsonIdioma(l) {
const k = l.toLowerCase();
if (!_jsonIdiomas[k]) {
_jsonIdiomas[k] = conPrioridad((tomarTemprano(k) || fetch(`${DATOS_CARPETA}${k}.json`, { cache: 'no-cache' }))
.then(r => { if (r.status === 404) return {}; if (!r.ok) throw new Error('HTTP ' + r.status + ' en ' + k + '.json'); return r.json(); }))
.catch(e => { delete _jsonIdiomas[k]; throw e; });
}
return _jsonIdiomas[k];
}
const _jsonInfo = {};
const _infoYa = {};
function jsonInfo(l) {
const k = l.toLowerCase();
if (!_jsonInfo[k]) {
_jsonInfo[k] = conPrioridad(fetch(`${DATOS_CARPETA}${k}-info.json`, { cache: 'no-cache' })
.then(r => { if (r.status === 404) return {}; if (!r.ok) throw new Error('HTTP ' + r.status + ' en ' + k + '-info.json'); return r.json(); }))
.catch(e => { delete _jsonInfo[k]; throw e; });
}
return _jsonInfo[k];
}
async function cargarInfo(l) {
if (DATOS_TIPO !== 'json' || !l) return false;
const k = l.toLowerCase(), info = await jsonInfo(l);
_infoYa[k] = info;
let cambia = false;
allData.forEach(it => {
if (it[`tieneinfo_${k}`] && it[`info_${k}`] === undefined) { it[`info_${k}`] = info[it.id] || ''; cambia = true; }
});
if (cambia) { try { guardarCacheLocal(); } catch (e) { } }
return cambia;
}
async function abrirInfoPendiente(id) {
try { await cargarInfo(currentLang); } catch (e) { console.warn('[Info] no se pudo bajar:', e.message); return; }
const it = allData.find(x => String(x.id) === String(id));
const inf = it && it[`info_${currentLang.toLowerCase()}`];
if (inf) showInfoModal(utf8ToB64(inf));
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
const k = l.toLowerCase();
it[`nombre_${k}`] = t[0] || '';
if (t[2]) {
it[`tieneinfo_${k}`] = 1;
const ya = _jsonInfo[k] && _infoYa[k];
it[`info_${k}`] = ya ? (ya[p.id] || '') : undefined;
} else {
it[`tieneinfo_${k}`] = 0;
it[`info_${k}`] = t[1] || '';
}
});
return it;
});
}
async function fetchAndParseCsv(langs) {
if (DATOS_TIPO === 'json') return jsonFilas(langs);
const idiomasParam = langs.join(',');
const url = `${LIVE_CSV_ENDPOINT}?accion=csv&idiomas=${encodeURIComponent(idiomasParam)}&zx=${Date.now()}`;
const response = await fetch(url, { cache: 'no-store' });
if (!response.ok) throw new Error('HTTP ' + response.status);
const text = await response.text();
return parseCSV(text);
}
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
function isLangLoaded(lang) {
if (allData.length === 0) return false;
return allData[0][`nombre_${lang.toLowerCase()}`] !== undefined;
}
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
async function fetchHashesBase() {
if (DATOS_TIPO === 'json') return jsonFilas([]);
const url = `${LIVE_CSV_ENDPOINT}?accion=csv&soloBase=1&zx=${Date.now()}`;
const response = await fetch(url, { cache: 'no-store' });
if (!response.ok) throw new Error('HTTP ' + response.status);
const text = await response.text();
return parseCSV(text);
}
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
function detectarIdiomasEnData(data) {
if (!data || data.length === 0) return [];
const langs = new Set();
Object.keys(data[0]).forEach(k => {
if (k.startsWith('nombre_')) langs.add(k.replace('nombre_', '').toUpperCase());
});
return Array.from(langs);
}
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
if (catObj.especial === 'alergenos') {
grid.innerHTML = generateAlergenosPageHtml();
return;
}
if (catObj.especial === 'contacto') {
grid.innerHTML = generateContactoPageHtml();
return;
}
const filtered = allData.filter(item => enRangos(parseInt(item.id, 10), catObj.rangos) && item.activa === 'SI');
const titulo = (o) => `<h3 class="sub-category-title">${txtConES(o)}</h3>`;
const grupos = catObj.grupos || [];
const dual = filtered.some(item => parseFloat(item.precioMedia) > 0);
const o = { dual };
if (dual) {
grid.innerHTML += `<div class="item-row price-columns-header"><div class="item-content"></div>` +
`<div class="price-box price-box-dual"><span class="price-cell"><small>${txt(PRECIO_COLUMNAS_TEXTO.media)}</small></span>` +
`<span class="price-cell"><small>${txt(PRECIO_COLUMNAS_TEXTO.entero)}</small></span></div></div>`;
}
if (grupos.length && catObj.modoGrupos === 'secuencial') {
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
(catObj.anexos || []).forEach(anx => {
const items = allData.filter(item => enRangos(parseInt(item.id, 10), anx.rangos) && item.activa === 'SI');
if (items.length === 0) return;
grid.innerHTML += titulo(anx.nombre);
items.forEach(item => { grid.innerHTML += generateItemHtml(item, { dual, sinPrecioHasta: anx.sinPrecioHasta }); });
});
}
function utf8ToB64(str) { return btoa(unescape(encodeURIComponent(str))); }
function b64ToUtf8(str) { return decodeURIComponent(escape(atob(str))); }
function generateItemHtml(item, opts = {}) {
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
const mini = (R.miniaturas || {})[String(item.id)];
const miniSrc = mini ? (typeof mini === 'string' ? mini : mini.src) : '';
const miniLigera = (miniSrc && FOTO_LIGERA && !(FOTOS_EXISTEN && !FOTOS_EXISTEN.has(urlFotoLigera(miniSrc)))) ? urlFotoLigera(miniSrc) : miniSrc;
const miniClase = mini && typeof mini === 'object' && mini.clase ? ' ' + mini.clase : '';
const tenistaThumbHtml = (!idsGlobalesDesactivados.has('fotos') && miniSrc)
? `<div class="tenista-inline-thumb-wrapper"><img src="${miniLigera}"${miniLigera !== miniSrc ? ` onerror="this.onerror=null;this.src='${miniSrc}'"` : ''} class="tenista-inline-thumb${miniClase}" alt="" loading="lazy" decoding="async" onclick="event.stopPropagation(); openMiniaturaLarge('${miniSrc}')" style="cursor:pointer;"></div>`
: '';
let infoIconHtml = '';
const infoKey = `info_${currentLang.toLowerCase()}`;
const infoData = item[infoKey];
const infoPendiente = !infoData && item[`tieneinfo_${currentLang.toLowerCase()}`];
if (!idsGlobalesDesactivados.has('info') && infoPendiente) {
infoIconHtml = `<span class="emoji-info" onclick="event.stopPropagation(); abrirInfoPendiente('${String(item.id).replace(/[^\w-]/g, '')}')" title="Info">ℹ️</span>`;
} else if (!idsGlobalesDesactivados.has('info') && infoData && infoData.trim() !== '') {
const b64Info = utf8ToB64(infoData);
const infoClickHandler = `event.stopPropagation(); showInfoModal('${b64Info}')`;
infoIconHtml = `<span class="emoji-info" onclick="${infoClickHandler}" title="Info">ℹ️</span>`;
}
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
if (idsGlobalesDesactivados.has('fotos')) {
avisarPestanaAbierta();
avisarFotosPrecargadas();
return;
}
const sortedData = [...allData].sort((a, b) => parseInt(a.id) - parseInt(b.id));
const addCategoryByLevels = (items, desde, hasta) => {
if (desde <= 1) items.filter(item => !/01\.webp$/.test(item.archivo))
.forEach(item => preloadQueue.push({ url: `imagenes/${item.carpeta}/${item.archivo}` }));
const bases = items.filter(item => /01\.webp$/.test(item.archivo))
.map(item => `imagenes/${item.carpeta}/${item.archivo.slice(0, -'01.webp'.length)}`);
for (let level = desde; level <= hasta; level++) {
bases.forEach(base => { preloadQueue.push({ base, n: level }); });
}
};
const platosDe = id => sortedData.filter(i => isItemInCategory(i.id, id) && i.archivo && i.activa === 'SI');
const niveles = c => (c && c.precargaFotos) || 4;
const catActual = categoriesList.find(c => c.id === currentCat);
addCategoryByLevels(platosDe(currentCat), 1, niveles(catActual));
preloadQueue.push({ hito: 'abierta' });
const esPestanaVino = c => Array.isArray(c.rangos) && c.rangos.length > 0 && c.rangos.every(r => Number(r[0]) >= 13000 && Number(r[1]) <= 14999);
const iActual = categoriesList.findIndex(c => c.id === currentCat);
const demas = [];
for (let k = 1; k < categoriesList.length; k++) {
const c = categoriesList[(Math.max(iActual, 0) + k) % categoriesList.length];
if (c && !c.especial && c.id !== currentCat && !esPestanaVino(c)) demas.push(c);
}
demas.forEach(c => addCategoryByLevels(platosDe(c.id), 1, 1));
demas.forEach(c => addCategoryByLevels(platosDe(c.id), 2, niveles(c)));
processPreloadQueue(mySession);
}
async function processPreloadQueue(session) {
if (isPreloading) return;
isPreloading = true;
const enCurso = new Set();
const trabajador = async () => {
while (preloadQueue.length > 0) {
if (session !== currentPreloadSession) return;
const task = preloadQueue.shift();
if (task.hito === 'abierta') { avisarPestanaAbierta(); continue; }
const url = task.url || `${task.base}0${task.n}.webp`;
if (!task.url && task.n > 1) {
const prevUrl = `${task.base}0${task.n - 1}.webp`;
if (verifiedImages[prevUrl] === false) { verifiedImages[url] = false; continue; }
}
if (verifiedImages[url] !== undefined || enCurso.has(url)) continue;
await new Promise(resolve => setTimeout(resolve, 150));
await esperarTurno(session);
if (session !== currentPreloadSession) return;
enCurso.add(url);
verifiedImages[url] = await cargarFoto(url);
enCurso.delete(url);
}
};
await Promise.all(Array.from({ length: redPrecarga().hilos }, trabajador));
isPreloading = false;
if (session !== currentPreloadSession) return;
avisarPestanaAbierta();
avisarFotosPrecargadas();
}
function openMiniaturaLarge(src) {
const img = document.getElementById('modal-img');
const prev = document.getElementById('prev-btn');
const next = document.getElementById('next-btn');
if (img) img.src = src;
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
exists = await cargarFoto(url);
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
if (img) {
const grande = `${currentGalleryPath}0${currentPhotoIndex}.webp`;
const conocida = verifiedImages[grande];
img.onerror = null;
if (conocida) img.src = conocida;
else if (FOTO_LIGERA && urlFotoLigera(grande) !== grande && !(FOTOS_EXISTEN && !FOTOS_EXISTEN.has(urlFotoLigera(grande)))) {
img.onerror = () => { img.onerror = null; img.src = grande; };
img.src = urlFotoLigera(grande);
} else img.src = grande;
}
if (prev) prev.style.display = currentPhotoIndex > 1 ? 'block' : 'none';
if (next) next.style.display = currentPhotoIndex < maxPhotosFound ? 'block' : 'none';
}
function changePhoto(n) { currentPhotoIndex += n; updateModal(); }
function closeModal() { const modal = document.getElementById('photo-modal'); if (modal) modal.style.display = 'none'; }
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
const MIN_LOADING_VISIBLE_MS = 200;
async function changeLanguage(l) {
if (!l) return;
pestanaAbiertaLista.then(() => cargarInfo(l)).catch(() => { });
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
return;
}
}
currentLang = l;
updateLanguageUI();
renderCategories();
renderMenu();
managePreload();
}
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
document.addEventListener('click', function(e) {
const modal = document.getElementById('info-modal');
if (modal && e.target === modal) {
closeInfoModal();
}
});
