// =========================================================================================
// RESTAURANTE: RG — configuración de la carta (la lee el núcleo, nucleo/v4/script.js).
// Aquí va TODO lo propio de este restaurante. Lo que no esté aquí es común a todos.
//
// Pestañas: los "id" deben coincidir con los pestanaId del editor (estructuras.js), porque
// con ellos se guardan las pestañas desactivadas. Por eso RG sigue con ids numéricos.
//   rangos       IDs de plato que entran en la pestaña: [[desde, hasta], ...]
//   grupos       títulos dentro de la pestaña, cada uno con sus rangos
//   modoGrupos   'bloques' (por defecto): sin grupo arriba y luego cada grupo en orden
//                'secuencial': en el orden de la hoja, título cada vez que cambia el grupo
//   anexos       platos de otros rangos añadidos al final con título (guarniciones)
//   precargaFotos  fotos por plato que se precargan (por defecto 2)
// =========================================================================================

// Nombres de zona de vinos (se repiten en varias pestañas).
const ZONAS = {
    mallorca: {
        ES: 'Vinos de Mallorca', EN: 'Majorcan Wines', DE: 'Weine aus Mallorca', FR: 'Vins de Majorque', IT: 'Vini di Maiorca',
        RU: 'Мальорканские вина', NL: 'Mallorquijnse wijnen', PL: 'Wina z Majorki', SV: 'Mallorkinska viner', NO: 'Mallorcanske viner',
        DA: 'Mallorcanske vine', FI: 'Mallorcalaiset viinit', PT: 'Vinhos de Maiorca', RO: 'Vinuri de Mallorca', HU: 'Mallorcai borok',
        CS: 'Mallorská vína', EL: 'Κρασιά της Μαγιόρκα', TR: 'Mallorca Şarapları', AR: 'نبيذ مايوركا', ZH: '马略卡葡萄酒', JA: 'マヨルカワイン',
        KO: '마요르카 와인', CA: 'Vins de Mallorca', EU: 'Mallorcako Ardoak', GL: 'Viños de Mallorca', VA: 'Vins de Mallorca'
    },
    copas: {
        ES: 'Copas', EN: 'By the Glass', DE: 'Glasweise', FR: 'Au Verre', IT: 'Al Calice',
        RU: 'По бокалам', NL: 'Per glas', PL: 'Na kieliszki', SV: 'Glasvis', NO: 'Glassvis',
        DA: 'Pr. glas', FI: 'Laseittain', PT: 'A copo', RO: 'La pahar', HU: 'Pohárral',
        CS: 'Rozlévaná vína', EL: 'Σε Ποτήρι', TR: 'Kadehte', AR: 'بأقداح الكأس', ZH: '杯装酒', JA: 'グラスワイン',
        KO: '글라스 와인', CA: 'Copes', EU: 'Kopak', GL: 'Copas', VA: 'Copes'
    },
    otras: {
        ES: 'Otras D.O.', EN: 'Other D.O.', DE: 'Andere D.O.', FR: 'Autres D.O.', IT: 'Altre D.O.',
        RU: 'Другие D.O.', NL: 'Overige D.O.', PL: 'Inne D.O.', SV: 'Andra D.O.', NO: 'Andre D.O.',
        DA: 'Andre D.O.', FI: 'Muut D.O.', PT: 'Outras D.O.', RO: 'Alte D.O.', HU: 'Egyéb D.O.',
        CS: 'Ostatní D.O.', EL: 'Άλλες D.O.', TR: 'Diğer D.O.', AR: 'تسميات منشأ أخرى', ZH: '其他D.O.产区', JA: 'その他のD.O.',
        KO: '기타 D.O. 원산지', CA: 'Altres D.O.', EU: 'Beste J.I.', GL: 'Outras D.O.', VA: 'Altres D.O.'
    },
    galicia: {
        ES: 'Galicia', EN: 'Galicia', DE: 'Galicien', FR: 'Galice', IT: 'Galizia',
        RU: 'Галисия', NL: 'Galicië', PL: 'Galicja', SV: 'Galicien', NO: 'Galicia',
        DA: 'Galicien', FI: 'Galicia', PT: 'Galiza', RO: 'Galicia', HU: 'Galícia',
        CS: 'Galicie', EL: 'Γαλικία', TR: 'Galiçya', AR: 'غاليسيا', ZH: '加利西亚', JA: 'ガリシア',
        KO: '갈리시아', CA: 'Galícia', EU: 'Galizia', GL: 'Galicia', VA: 'Galícia'
    },
    rueda: {
        ES: 'Rueda', EN: 'Rueda', DE: 'Rueda', FR: 'Rueda', IT: 'Rueda',
        RU: 'Руэда', NL: 'Rueda', PL: 'Rueda', SV: 'Rueda', NO: 'Rueda',
        DA: 'Rueda', FI: 'Rueda', PT: 'Rueda', RO: 'Rueda', HU: 'Rueda',
        CS: 'Rueda', EL: 'Ρουέδα', TR: 'Rueda', AR: 'رويدا', ZH: '卢埃达', JA: 'ルエダ',
        KO: '루에다', CA: 'Rueda', EU: 'Rueda', GL: 'Rueda', VA: 'Rueda'
    },
    rioja: {
        ES: 'Rioja', EN: 'Rioja', DE: 'Rioja', FR: 'Rioja', IT: 'Rioja',
        RU: 'Риоха', NL: 'Rioja', PL: 'Rioja', SV: 'Rioja', NO: 'Rioja',
        DA: 'Rioja', FI: 'Rioja', PT: 'Rioja', RO: 'Rioja', HU: 'Rioja',
        CS: 'Rioja', EL: 'Ριόχα', TR: 'Rioja', AR: 'ريوخا', ZH: '里奥哈', JA: 'リオハ',
        KO: '리오하', CA: 'Rioja', EU: 'Errioxa', GL: 'Rioja', VA: 'Rioja'
    },
    ribera: {
        ES: 'Ribera', EN: 'Ribera', DE: 'Ribera', FR: 'Ribera', IT: 'Ribera',
        RU: 'Рибера', NL: 'Ribera', PL: 'Ribera', SV: 'Ribera', NO: 'Ribera',
        DA: 'Ribera', FI: 'Ribera', PT: 'Ribera', RO: 'Ribera', HU: 'Ribera',
        CS: 'Ribera', EL: 'Ριμπέρα', TR: 'Ribera', AR: 'ريبيرا', ZH: '杜埃罗河岸', JA: 'リベラ',
        KO: '리베라', CA: 'Ribera', EU: 'Erribera', GL: 'Ribera', VA: 'Ribera'
    }
};

window.RESTAURANTE = {
    id: 'rg',

    datos: {
        tipo: 'json',
        csv: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT9rPlxpax2lE0rN97c6Hoy_OxUwREqRb48juEBr9C91ZFY2UvaKgC8JdiRcwDrtBErXFVmFRh0Zr5e/pub?gid=0&single=true&output=csv',
        vivo: 'https://script.google.com/macros/s/AKfycbz6mX3oj9_-Kd-BiREXq318PPx3MeI8rdg4d8bFWuE6W7QhTih3rcgYOqExcFGgpD3YaA/exec'
    },

    idiomas: { esenciales: ['ES', 'EN', 'DE', 'FR', 'IT'], rtl: ['AR'] },
    disposicion: 'clasica',
    pestanaInicial: '12',

    pestanas: [
        { id: '12', rangos: [[12000, 12999]], nombre: {
        ES: 'Sugerencias', EN: 'Suggestions', DE: 'Vorschläge', FR: 'Suggestions', IT: 'Suggerimenti',
        RU: 'Предложения', NL: 'Suggesties', PL: 'Sugestie', SV: 'Förslag', NO: 'Forslag',
        DA: 'Forslag', FI: 'Suositukset', PT: 'Sugestões', RO: 'Sugestii', HU: 'Ajánlatok',
        CS: 'Doporučení', EL: 'Προτάσεις', TR: 'Öneriler', AR: 'اقتراحات', ZH: '推荐', JA: 'おすすめ',
        KO: '추천 메뉴', CA: 'Suggeriments', EU: 'Gomendioak', GL: 'Suxestións', VA: 'Suggeriments'
    },
          grupos: [
            { rangos: [[12000, 12399]], nombre: {
                ES: 'Entrantes', EN: 'Starters', DE: 'Vorspeisen', FR: 'Entrées', IT: 'Antipasti',
                RU: 'Закуски', NL: 'Voorgerechten', PL: 'Przystawki', SV: 'Förrätter', NO: 'Forretter',
                DA: 'Forretter', FI: 'Alkuruoat', PT: 'Entradas', RO: 'Gustări', HU: 'Előételek',
                CS: 'Předkrmy', EL: 'Ορεκτικά', TR: 'Başlangıçlar', AR: 'مقبلات', ZH: '前菜', JA: '前菜',
                KO: '에피타이저', CA: 'Entrants', EU: 'Hastekoak', GL: 'Entrantes', VA: 'Entrants'
            } },
            { rangos: [[12400, 12899]], nombre: {
                ES: 'Principales', EN: 'Mains', DE: 'Hauptspeisen', FR: 'Plats', IT: 'Piatti',
                RU: 'Основные блюда', NL: 'Hoofdgerechten', PL: 'Dania główne', SV: 'Huvudrätter', NO: 'Hovedretter',
                DA: 'Hovedretter', FI: 'Pääruoat', PT: 'Pratos principais', RO: 'Feluri principale', HU: 'Főételek',
                CS: 'Hlavní jídla', EL: 'Κυρίως Πιάτα', TR: 'Ana Yemekler', AR: 'أطباق رئيسية', ZH: '主菜', JA: 'メインディッシュ',
                KO: '메인 요리', CA: 'Principals', EU: 'Plater Nagusiak', GL: 'Principais', VA: 'Principals'
            } },
            { rangos: [[12900, 12989]], nombre: {
                ES: 'Postres', EN: 'Desserts', DE: 'Desserts', FR: 'Desserts', IT: 'Dolci',
                RU: 'Десерты', NL: 'Desserts', PL: 'Desery', SV: 'Efterrätter', NO: 'Desserter',
                DA: 'Desserter', FI: 'Jälkiruoat', PT: 'Sobremesas', RO: 'Deserturi', HU: 'Desszertek',
                CS: 'Dezerty', EL: 'Επιδόρπια', TR: 'Tatlılar', AR: 'حلويات', ZH: '甜点', JA: 'デザート',
                KO: '디저트', CA: 'Postres', EU: 'Postreak', GL: 'Postres', VA: 'Postres'
            } },
            { rangos: [[12990, 12999]], nombre: {
                ES: 'Vinos y aperitivos recomendados', EN: 'Recommended wines & aperitifs', DE: 'Empfohlene Weine & Aperitifs', FR: 'Vins et apéritifs recommandés', IT: 'Vini e aperitivi consigliati',
                RU: 'Рекомендуемые вина и аперитивы', NL: 'Aanbevolen wijnen & aperitieven', PL: 'Polecane wina i aperitify', SV: 'Rekommenderade viner & aperitifer', NO: 'Anbefalte viner og aperitiffer',
                DA: 'Anbefalede vine og aperitiffer', FI: 'Suositellut viinit ja aperitiivit', PT: 'Vinhos e aperitivos recomendados', RO: 'Vinuri și aperitive recomandate', HU: 'Ajánlott borok és aperitifek',
                CS: 'Doporučená vína a aperitivy', EL: 'Προτεινόμενα κρασιά & απεριτίφ', TR: 'Önerilen şaraplar ve aperatifler', AR: 'نبيذ ومشروبات فاتحة للشهية موصى بها', ZH: '推荐葡萄酒与开胃酒', JA: 'おすすめのワインと食前酒',
                KO: '추천 와인 & 아페리티프', CA: 'Vins i aperitius recomanats', EU: 'Gomendatutako ardoak eta aperitiboak', GL: 'Viños e aperitivos recomendados', VA: 'Vins i aperitius recomanats'
            } }
          ] },
        { id: '1', rangos: [[1000, 1999]], nombre: {
        ES: 'Entrantes', EN: 'Starters', DE: 'Vorspeisen', FR: 'Entrées', IT: 'Antipasti',
        RU: 'Закуски', NL: 'Voorgerechten', PL: 'Przystawki', SV: 'Förrätter', NO: 'Forretter',
        DA: 'Forretter', FI: 'Alkuruoat', PT: 'Entradas', RO: 'Gustări', HU: 'Előételek',
        CS: 'Předkrmy', EL: 'Ορεκτικά', TR: 'Başlangıçlar', AR: 'مقبلات', ZH: '前菜', JA: '前菜',
        KO: '에피타이저', CA: 'Entrants', EU: 'Hastekoak', GL: 'Entrantes', VA: 'Entrants'
    } },
        { id: '2', rangos: [[2000, 2999]], nombre: {
        ES: 'Ensaladas', EN: 'Salads', DE: 'Salate', FR: 'Salades', IT: 'Insalate',
        RU: 'Салаты', NL: 'Salades', PL: 'Sałatki', SV: 'Sallader', NO: 'Salater',
        DA: 'Salater', FI: 'Salaatit', PT: 'Saladas', RO: 'Salate', HU: 'Saláták',
        CS: 'Saláty', EL: 'Σαλάτες', TR: 'Salatalar', AR: 'سلطات', ZH: '沙拉', JA: 'サラダ',
        KO: '샐러드', CA: 'Amanides', EU: 'Entsaladak', GL: 'Ensaladas', VA: 'Amanides'
    } },
        { id: '3', rangos: [[3000, 3999]], nombre: {
        ES: 'Arroces & Pastas', EN: 'Rice & Pasta', DE: 'Reis & Pasta', FR: 'Riz & Pâtes', IT: 'Riso e Pasta',
        RU: 'Рис и паста', NL: 'Rijst & Pasta', PL: 'Ryż i Makaron', SV: 'Ris & Pasta', NO: 'Ris og pasta',
        DA: 'Ris & Pasta', FI: 'Riisi & Pasta', PT: 'Arroz e Massa', RO: 'Orez și paste', HU: 'Rizs és tészták',
        CS: 'Rýže a těstoviny', EL: 'Ρύζι & Ζυμαρικά', TR: 'Pilav & Makarna', AR: 'أرز وباستا', ZH: '米饭与面食', JA: 'ライス＆パスタ',
        KO: '라이스 & 파스타', CA: 'Arrossos i Pastes', EU: 'Arrozak eta Pastak', GL: 'Arroces e Pastas', VA: 'Arrossos i Pastes'
    } },
        { id: '5', rangos: [[5000, 5999]], nombre: {
        ES: 'Principales', EN: 'Mains', DE: 'Hauptspeisen', FR: 'Plats', IT: 'Piatti',
        RU: 'Основные блюда', NL: 'Hoofdgerechten', PL: 'Dania główne', SV: 'Huvudrätter', NO: 'Hovedretter',
        DA: 'Hovedretter', FI: 'Pääruoat', PT: 'Pratos principais', RO: 'Feluri principale', HU: 'Főételek',
        CS: 'Hlavní jídla', EL: 'Κυρίως Πιάτα', TR: 'Ana Yemekler', AR: 'أطباق رئيسية', ZH: '主菜', JA: 'メインディッシュ',
        KO: '메인 요리', CA: 'Principals', EU: 'Plater Nagusiak', GL: 'Principais', VA: 'Principals'
    },
          anexos: [ { rangos: [[6000, 6999]], sinPrecioHasta: 6099, nombre: {
        ES: 'Guarniciones', EN: 'Side Dishes', DE: 'Beilagen', FR: 'Garnitures', IT: 'Contorni',
        KO: '사이드 메뉴', CA: 'Guarnicions', EU: 'Garnizioak', GL: 'Guarnicións', VA: 'Guarnicions'
    } } ] },
        { id: '7', rangos: [[7000, 7999]], nombre: {
        ES: 'Niños', EN: 'Kids', DE: 'Kinder', FR: 'Enfants', IT: 'Bambini',
        RU: 'Детское меню', NL: 'Kinderen', PL: 'Dla dzieci', SV: 'Barn', NO: 'Barn',
        DA: 'Børn', FI: 'Lapset', PT: 'Crianças', RO: 'Copii', HU: 'Gyerekeknek',
        CS: 'Pro děti', EL: 'Παιδικά', TR: 'Çocuklar', AR: 'أطفال', ZH: '儿童餐', JA: 'キッズメニュー',
        KO: '어린이 메뉴', CA: 'Nens', EU: 'Umeak', GL: 'Nenos', VA: 'Xiquets'
    } },
        { id: '8', rangos: [[8000, 8999]], nombre: {
        ES: 'Postres', EN: 'Desserts', DE: 'Desserts', FR: 'Desserts', IT: 'Dolci',
        RU: 'Десерты', NL: 'Desserts', PL: 'Desery', SV: 'Efterrätter', NO: 'Desserter',
        DA: 'Desserter', FI: 'Jälkiruoat', PT: 'Sobremesas', RO: 'Deserturi', HU: 'Desszertek',
        CS: 'Dezerty', EL: 'Επιδόρπια', TR: 'Tatlılar', AR: 'حلويات', ZH: '甜点', JA: 'デザート',
        KO: '디저트', CA: 'Postres', EU: 'Postreak', GL: 'Postres', VA: 'Postres'
    } },
        { id: '9', rangos: [[9000, 9999]], nombre: {
        ES: 'Café', EN: 'Coffee', DE: 'Kaffee', FR: 'Café', IT: 'Caffè',
        RU: 'Кофе', NL: 'Koffie', PL: 'Kawa', SV: 'Kaffe', NO: 'Kaffe',
        DA: 'Kaffe', FI: 'Kahvi', PT: 'Café', RO: 'Cafea', HU: 'Kávé',
        CS: 'Káva', EL: 'Καφές', TR: 'Kahve', AR: 'قهوة', ZH: '咖啡', JA: 'コーヒー',
        KO: '커피', CA: 'Cafè', EU: 'Kafea', GL: 'Café', VA: 'Cafè'
    } },
        { id: '10', rangos: [[10000, 10999]], nombre: {
        ES: 'Bebidas', EN: 'Drinks', DE: 'Getränke', FR: 'Boissons', IT: 'Bibite',
        RU: 'Напитки', NL: 'Dranken', PL: 'Napoje', SV: 'Drycker', NO: 'Drikke',
        DA: 'Drikkevarer', FI: 'Juomat', PT: 'Bebidas', RO: 'Băuturi', HU: 'Italok',
        CS: 'Nápoje', EL: 'Ποτά', TR: 'İçecekler', AR: 'مشروبات', ZH: '饮料', JA: 'ドリンク',
        KO: '음료', CA: 'Begudes', EU: 'Edariak', GL: 'Bebidas', VA: 'Begudes'
    } },
        { id: '11', rangos: [[11000, 11999]], nombre: {
        ES: 'Cervezas', EN: 'Beers', DE: 'Biere', FR: 'Bières', IT: 'Birre',
        RU: 'Пиво', NL: 'Bieren', PL: 'Piwa', SV: 'Öl', NO: 'Øl',
        DA: 'Øl', FI: 'Olutta', PT: 'Cervejas', RO: 'Beri', HU: 'Sörök',
        CS: 'Piva', EL: 'Μπύρες', TR: 'Biralar', AR: 'بيرة', ZH: '啤酒', JA: 'ビール',
        KO: '맥주', CA: 'Cerveses', EU: 'Garagardoak', GL: 'Cerveses', VA: 'Cerveses'
    } },
        { id: '131', rangos: [[13100, 13199]], precargaFotos: 1, modoGrupos: 'secuencial', nombre: {
        ES: 'Vinos Blancos', EN: 'White Wines', DE: 'Weissweine', FR: 'Vins Blancs', IT: 'Vini Bianchi',
        RU: 'Белые вина', NL: 'Witte wijnen', PL: 'Białe wina', SV: 'Vita viner', NO: 'Hvite viner',
        DA: 'Hvidvine', FI: 'Valkoviinit', PT: 'Vinhos brancos', RO: 'Vinuri albe', HU: 'Fehérborok',
        CS: 'Bílá vína', EL: 'Λευκά Κρασιά', TR: 'Beyaz Şaraplar', AR: 'نبيذ أبيض', ZH: '白葡萄酒', JA: '白ワイン',
        KO: '화이트 와인', CA: 'Vins Blancs', EU: 'Ardo Zuriak', GL: 'Viños Brancos', VA: 'Vins Blancs'
    },
          grupos: [
            { rangos: [[13100, 13129]], nombre: ZONAS.mallorca },
            { rangos: [[13130, 13139]], nombre: ZONAS.galicia },
            { rangos: [[13140, 13149]], nombre: ZONAS.rueda },
            { rangos: [[13150, 13189]], nombre: ZONAS.otras },
            { rangos: [[13190, 13199]], nombre: ZONAS.copas }
          ] },
        { id: '132', rangos: [[13200, 13299]], precargaFotos: 1, modoGrupos: 'secuencial', nombre: {
        ES: 'Vinos Rosados', EN: 'Rosé Wines', DE: 'Roséweine', FR: 'Vins Rosés', IT: 'Vini Rosati',
        RU: 'Розовые вина', NL: 'Rosé wijnen', PL: 'Wina różowe', SV: 'Roséviner', NO: 'Roséviner',
        DA: 'Rosévine', FI: 'Roséviinit', PT: 'Vinhos rosés', RO: 'Vinuri roze', HU: 'Rozé borok',
        CS: 'Růžová vína', EL: 'Ροζέ Κρασιά', TR: 'Roze Şaraplar', AR: 'نبيذ روزيه', ZH: '桃红葡萄酒', JA: 'ロゼワイン',
        KO: '로제 와인', CA: 'Vins Rosats', EU: 'Ardo Arrosak', GL: 'Viños Rosados', VA: 'Vins Rosats'
    },
          grupos: [
            { rangos: [[13200, 13249]], nombre: ZONAS.mallorca },
            { rangos: [[13250, 13259]], nombre: ZONAS.copas }
          ] },
        { id: '133', rangos: [[13300, 13399]], precargaFotos: 1, modoGrupos: 'secuencial', nombre: {
        ES: 'Vinos Tintos', EN: 'Red Wines', DE: 'Rotweine', FR: 'Vins Rouges', IT: 'Vini Rossi',
        RU: 'Красные вина', NL: 'Rode wijnen', PL: 'Czerwone wina', SV: 'Röda viner', NO: 'Røde viner',
        DA: 'Rødvine', FI: 'Punaviinit', PT: 'Vinhos tintos', RO: 'Vinuri roșii', HU: 'Vörösborok',
        CS: 'Červená vína', EL: 'Κόκκινα Κρασιά', TR: 'Kırmızı Şaraplar', AR: 'نبيذ أحمر', ZH: '红葡萄酒', JA: '赤ワイン',
        KO: '레드 와인', CA: 'Vins Negres', EU: 'Ardo Beltzak', GL: 'Viños Tintos', VA: 'Vins Negres'
    },
          grupos: [
            { rangos: [[13300, 13329]], nombre: ZONAS.mallorca },
            { rangos: [[13330, 13349]], nombre: ZONAS.rioja },
            { rangos: [[13350, 13369]], nombre: ZONAS.ribera },
            { rangos: [[13370, 13389]], nombre: ZONAS.otras },
            { rangos: [[13390, 13399]], nombre: ZONAS.copas }
          ] },
        { id: '134', rangos: [[13400, 13499]], precargaFotos: 1, modoGrupos: 'secuencial', nombre: {
        ES: 'Cavas & Champagne', EN: 'Cava & Champagne', DE: 'Cava & Champagne', FR: 'Cava & Champagne', IT: 'Cava & Champagne',
        RU: 'Кава и Шампанское', NL: 'Cava & Champagne', PL: 'Cava i Szampan', SV: 'Cava & Champagne', NO: 'Cava og champagne',
        DA: 'Cava & Champagne', FI: 'Cava & Samppanja', PT: 'Cavas e Champagne', RO: 'Cava & Șampanie', HU: 'Cava és pezsgők',
        CS: 'Cava a Šampaňské', EL: 'Cava & Σαμπάνια', TR: 'Kava & Şampanya', AR: 'كافا وشامبانيا', ZH: '卡瓦与香槟', JA: 'カヴァ＆シャンパン',
        KO: '카바 & 샴페인', CA: 'Caves i Xampany', EU: 'Cabak eta Xanpaina', GL: 'Cavas e Champán', VA: 'Caves i Xampany'
    },
          grupos: [
            { rangos: [[13450, 13459]], nombre: ZONAS.copas }
          ] },
        { id: 'alergenos', especial: 'alergenos' }
    ],

    // Miniatura fija siempre visible en la fila del plato (más adelante: columna "Miniatura").
    miniaturas: {
        12990: 'imagenes/vinos/tenista_pegado.webp',
        12993: { src: 'imagenes/vinos/canonita.webp', clase: 'canonita-inline-thumb' }
    }
};
