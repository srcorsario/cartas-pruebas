// --- data.js ---
// NUEVO: Registro de versión del archivo
window.APP_VERSIONS = window.APP_VERSIONS || {};
window.APP_VERSIONS.data = '1.0.1'; 

// =====================================================================
// ESTRUCTURA DEL MENÚ (Árbol de Categorías y Subcategorías)
// =====================================================================

var ESTRUCTURA = [
    { id: 12000, name: "Sugerencias", rango: 999, sub: [{id: 12100, name: "Croquetas", folder: "entrantes"},{id: 12200, name: "Croquetas Veg.", folder: "entrantes"},{id: 12300, name: "Entrantes", folder: "Entrantes"},{id: 12400, name: "Pasta", folder: "pasta"},{id: 12500, name: "Arroz", folder: "arroz"},{id: 12700, name: "Pescado", folder: "pescado"},{id: 12800, name: "Carne", folder: "carne"},{id: 12900, name: "Postres", folder: "postres"}]},
    { id: 1000, name: "1- Entrantes", rango: 999, sub: [{id: 1000, name: "Entrantes", folder: "entrantes"},{id: 1100, name: "Pan", folder: "entrantes"}]},
    { id: 2000, name: "2- Ensaladas", rango: 999, sub: [{id: 2000, name: "Clasicas", folder: "ensaladas"},{id: 2100, name: "Pokes", folder: "ensaladas"},{id: 2200, name: "Otras", folder: "ensaladas"}]},
    { id: 3000, name: "3- Arroz y Pasta", rango: 999, sub: [{id: 3000, name: "Risotto", folder: "arroz"},{id: 3100, name: "Arroz", folder: "arroz"},{id: 3200, name: "Fideuá", folder: "pasta"},{id: 3300, name: "Pasta", folder: "pasta"}]},
    { id: 4000, name: "4- Recetas", rango: 999, sub: [{id: 4000, name: "Pescado", folder: "pescado"},{id: 4100, name: "Carne", folder: "carne"}]},
    { id: 5000, name: "5- Platos principales", rango: 999, sub: [{id: 5000, name: "Pescado", folder: "pescado"},{id: 5100, name: "Carne", folder: "carne"}]},
    { id: 6000, name: "6- Guarniciones", rango: 999, sub: [{id: 6000, name: "Guarnición", folder: "guarnicion"},{id: 1, name: "Extra", folder: "guarnicion"}]},
    { id: 7000, name: "7- Platos niño", rango: 999, folder: "niños" },
    { id: 8000, name: "8- Postres", rango: 999, folder: "postres" },
    { id: 9000, name: "9- Cafés", rango: 999, sub: [{id: 9000, name: "Cafés", folder: "cafe"},{id: 9100, name: "Infusiones", folder: "cafe"}]},
    { id: 10000, name: "10- Bebidas", rango: 999, sub: [{id: 10000, name: "Refrescos", folder: "refrescos"},{id: 10100, name: "Zumos", folder: "refrescos"},{id: 10200, name: "Otros", folder: "refrescos"}]},
    { id: 11000, name: "11- Cervezas", rango: 999, folder: "cerveza" },
    
    { id: 13100, name: "13.1- Vinos Blancos", rango: 99, sub: [
        {id: 13100, name: "Mallorca", folder: "vinos", max: 13129},
        {id: 13130, name: "Galicia", folder: "vinos", max: 13139},
        {id: 13140, name: "Rueda", folder: "vinos", max: 13149},
        {id: 13150, name: "Otras D.O.", folder: "vinos", max: 13189},
        {id: 13190, name: "Copas", folder: "vinos", max: 13199}
    ]},
    { id: 13200, name: "13.2- Vinos Rosados", rango: 99, sub: [
        {id: 13200, name: "Vinos Rosados", folder: "vinos", max: 13249},
        {id: 13250, name: "Copas", folder: "vinos", max: 13259}
    ]},
    { id: 13300, name: "13.3- Vinos Tintos", rango: 99, sub: [
        {id: 13300, name: "Mallorca", folder: "vinos", max: 13329},
        {id: 13330, name: "Rioja", folder: "vinos", max: 13349},
        {id: 13350, name: "Ribera", folder: "vinos", max: 13369},
        {id: 13370, name: "Otras D.O.", folder: "vinos", max: 13389},
        {id: 13390, name: "Copas", folder: "vinos", max: 13399}
    ]},
    { id: 13400, name: "13.4- Cavas & Champagne", rango: 1099, sub: [
        {id: 13400, name: "Botellas", folder: "vinos", max: 13449},
        {id: 13450, name: "Copas", folder: "vinos", max: 13459}
    ]}
];


// =====================================================================
// DICCIONARIOS DE TRADUCCIÓN DE MENÚ
// =====================================================================

var categoriesList = [ 
    { id: '12', ES: 'Sugerencias', EN: 'Suggestions', DE: 'Vorschläge', FR: 'Suggestions', IT: 'Suggerimenti', RU: 'Предложения', NL: 'Suggesties', PL: 'Sugestie', SV: 'Förslag', NO: 'Forslag', DA: 'Forslag', FI: 'Suositukset', PT: 'Sugstões', RO: 'Sugestii', HU: 'Ajánlatok', CS: 'Doporučení', EL: 'Προτάσεις', TR: 'Öneriler', AR: 'اقتrahat', ZH: '推荐', JA: 'おすすめ', CA: 'Suggeriments', EU: 'Iradokizunak', GL: 'Suxestións', VA: 'Suggeriments' }, 
    { id: '1', ES: 'Entrantes', EN: 'Starters', DE: 'Vorspeisen', FR: 'Entrées', IT: 'Antipasti', RU: 'Закуски', NL: 'Voorgerechten', PL: 'Przystawki', SV: 'Förrätter', NO: 'Forretter', DA: 'Forretter', FI: 'Alkuruoat', PT: 'Entradas', RO: 'Gustări', HU: 'Előételek', CS: 'Předkrmy', EL: 'Ορεκτικά', TR: 'Başlangıçlar', AR: 'مقبلات', ZH: '前菜', JA: '前菜', CA: 'Entrants', EU: 'Hasierakoak', GL: 'Entrantes', VA: 'Entrants' }, 
    { id: '2', ES: 'Ensaladas', EN: 'Salads', DE: 'Salate', FR: 'Salades', IT: 'Insalate', RU: 'Салаты', NL: 'Salades', PL: 'Sałatki', SV: 'Sallader', NO: 'Salater', DA: 'Salater', FI: 'Salaatit', PT: 'Saladas', RO: 'Salate', HU: 'Saláták', CS: 'Saláty', EL: 'Σαλάτες', TR: 'Salatalar', AR: 'سلطات', ZH: '沙拉', JA: 'サラダ', CA: 'Amanides', EU: 'Entsaladak', GL: 'Ensaladas', VA: 'Amanides' }, 
    { id: '3', ES: 'Arroces & Pastas', EN: 'Rice & Pasta', DE: 'Reis & Pasta', FR: 'Riz & Pâtes', IT: 'Riso e Pasta', RU: 'Рис и паста', NL: 'Rijst & Pasta', PL: 'Ryż i Makaron', SV: 'Ris & Pasta', NO: 'Ris og pasta', DA: 'Ris & Pasta', FI: 'Riisi & Pasta', PT: 'Arroz e Massa', RO: 'Orez și paste', HU: 'Rizs és tészták', CS: 'Rýže a těstoviny', EL: 'Ρύζι & Ζυμαρικά', TR: 'Pilav & Makarna', AR: 'أرز وباستا', ZH: '米饭与面食', JA: 'ライス＆パスタ', CA: 'Arrossos i Pastes', EU: 'Arrozak eta Pastak', GL: 'Arroces e Pastas', VA: 'Arrossos i Pastes' }, 
    { id: '4', ES: 'Recetas', EN: 'Recipes', DE: 'Rezepte', FR: 'Recettes', IT: 'Ricette', RU: 'Рецепты', NL: 'Recepten', PL: 'Przepisy', SV: 'Recept', NO: 'Oppskrifter', DA: 'Opskrifter', FI: 'Reseptit', PT: 'Receitas', RO: 'Rețete', HU: 'Receptek', CS: 'Recepty', EL: 'Συνταγές', TR: 'Tarifler', AR: 'وصفات', ZH: '特色菜', JA: 'レシピ', CA: 'Receptes', EU: 'Errezetak', GL: 'Receitas', VA: 'Receptes' }, 
    { id: '5', ES: 'Principales', EN: 'Mains', DE: 'Hauptspeisen', FR: 'Plats', IT: 'Piatti', RU: 'Основные блюда', NL: 'Hoofdgerechten', PL: 'Dania główne', SV: 'Huvudrätter', NO: 'Hovedretter', DA: 'Hovedretter', FI: 'Pääruoat', PT: 'Pratos principais', RO: 'Feluri principale', HU: 'Főételek', CS: 'Hlavní jídla', EL: 'Κύριαως Πιάτα', TR: 'Ana Yemekler', AR: 'أطباق رئيسية', ZH: '主菜', JA: 'メインディッシュ', CA: 'Principals', EU: 'Plater Nagusiak', GL: 'Pratos Principais', VA: 'Principals' }, 
    { id: '7', ES: 'Niños', EN: 'Kids', DE: 'Kinder', FR: 'Enfants', IT: 'Bambini', RU: 'Детское меню', NL: 'Kinderen', PL: 'Dla dzieci', SV: 'Barn', NO: 'Barn', DA: 'Børn', FI: 'Lapset', PT: 'Crianças', RO: 'Copii', HU: 'Gyerekeknek', CS: 'Pro děti', EL: 'Παιδικά', TR: 'Çocuklar', AR: 'أطفال', ZH: '儿童餐', JA: 'キッズメニュー', CA: 'Nens', EU: 'Haurrak', GL: 'Nenos', VA: 'Nens' }, 
    { id: '8', ES: 'Postres', EN: 'Desserts', DE: 'Desserts', FR: 'Desserts', IT: 'Dolci', RU: 'Десерты', NL: 'Desserts', PL: 'Desery', SV: 'Efterrätter', NO: 'Desesser', DA: 'Desesser', FI: 'Jälkiruoat', PT: 'Sobremesas', RO: 'Deserturi', HU: 'Desszertek', CS: 'Dezerty', EL: 'Εsplit;ίδορπια', TR: 'Tatlılar', AR: 'حلويات', ZH: '甜点', JA: 'デザート', CA: 'Postres', EU: 'Postreak', GL: 'Sobremesas', VA: 'Postres' }, 
    { id: '9', ES: 'Café', EN: 'Coffee', DE: 'Kaffee', FR: 'Café', IT: 'Caffè', RU: 'Кофе', NL: 'Koffie', PL: 'Kawa', SV: 'Kaffe', NO: 'Kaffe', DA: 'Kaffe', FI: 'Kahvi', PT: 'Café', RO: 'Cafea', HU: 'Kávé', CS: 'Káva', EL: 'Καφές', TR: 'Kahve', AR: 'قهوة', ZH: '咖啡', JA: 'コーヒー', CA: 'Cafè', EU: 'Kafea', GL: 'Café', VA: 'Cafè' }, 
    { id: '10', ES: 'Bebidas', EN: 'Drinks', DE: 'Getränke', FR: 'Boissons', IT: 'Bibite', RU: 'Напитки', NL: 'Dranken', PL: 'Napoje', SV: 'Drycker', NO: 'Drikkevarer', DA: 'Drikkevarer', FI: 'Juomat', PT: 'Bebidas', RO: 'Băuturi', HU: 'Italok', CS: 'Nápoje', EL: 'Ποτά', TR: 'İçecekler', AR: 'مشروبات', ZH: '饮料', JA: 'ドリンク', CA: 'Begudes', EU: 'Edariak', GL: 'Bebidas', VA: 'Begudes' }, 
    { id: '11', ES: 'Cervezas', EN: 'Beers', DE: 'Biere', FR: 'Bières', IT: 'Birre', RU: 'Пиво', NL: 'Bieren', PL: 'Piwa', SV: 'Öl', NO: 'Øl', DA: 'Øl', FI: 'Olutta', PT: 'Cervezas', RO: 'Beri', HU: 'Sörök', CS: 'Priva', EL: 'Μπύρες', TR: 'Biralar', AR: 'بيرة', ZH: '啤酒', JA: 'ビール', CA: 'Cerveses', EU: 'Garagardoak', GL: 'Cervexas', VA: 'Cerveses' }, 
    { id: '131', ES: 'Vinos Blancos', EN: 'White Wines', DE: 'Weissweine', FR: 'Vins Blancs', IT: 'Vini Bianchi', RU: 'Белые вина', NL: 'Witte wijnen', PL: 'Białe wina', SV: 'Vita viner', NO: 'Hvite viner', DA: 'Hvidvine', FI: 'Valkoviinit', PT: 'Vinhos brancos', RO: 'Vinuri albe', HU: 'Fehérborok', CS: 'Bílá vína', EL: 'Λευκά Κρασιά', TR: 'Beyaz Şaraplar', AR: 'نبيذ أبيض', ZH: '白葡萄酒', JA: '白ワイン', CA: 'Vins Blancs', EU: 'Ardo Zuriak', GL: 'Viños Brancos', VA: 'Vins Blancs' }, 
    { id: '132', ES: 'Vinos Rosados', EN: 'Rosé Wines', DE: 'Roséweine', FR: 'Vins Rosés', IT: 'Vini Rosati', RU: 'Розовые вина', NL: 'Rosé wijnen', PL: 'Wina różowe', SV: 'Roséviner', NO: 'Roséviner', DA: 'Rosévine', FI: 'Roséviinit', PT: 'Vinhos rosés', RO: 'Vinuri roze', HU: 'Rozé borok', CS: 'Růžová vína', EL: 'Ροζέ Κρασιά', TR: 'Roze Şaraplar', AR: 'نبيذ روزيه', ZH: '桃红葡萄酒', JA: 'ロゼワイン', CA: 'Vins Rosats', EU: 'Ardo Gorriak', GL: 'Viños Rosados', VA: 'Vins Rosats' }, 
    { id: '133', ES: 'Vinos Tintos', EN: 'Red Wines', DE: 'Rotweine', FR: 'Vins Rouges', IT: 'Vini Rossi', RU: 'Красные вина', NL: 'Rode wijnen', PL: 'Czerwone wina', SV: 'Röda viner', NO: 'Røde viner', DA: 'Rødvine', FI: 'Punaviinit', PT: 'Vinhos tintos', RO: 'Vinuri roșii', HU: 'Vörösborok', CS: 'Červená vína', EL: 'Κόκκινα Κρασιά', TR: 'Kırmızı Şaraplar', AR: 'نبيذ أحمر', ZH: '红葡萄酒', JA: '赤ワイン', CA: 'Vins Negres', EU: 'Ardo Beltzak', GL: 'Viños Tintos', VA: 'Vins Negres' }, 
    { id: '134', ES: 'Cavas & Champagne', EN: 'Cava & Champagne', DE: 'Cava & Champagne', FR: 'Cava & Champagne', IT: 'Cava & Champagne', RU: 'Кава и Шампанское', NL: 'Cava & Champagne', PL: 'Cava i Szampanie', SV: 'Cava & Champagne', NO: 'Cava og champagne', DA: 'Cava og champagne', FI: 'Cava ja Samppanja', PT: 'Cavas e Champagne', RO: 'Cava & Șampanie', HU: 'Cava és pezsgők', CS: 'Cava a Šampaňské', EL: 'Cava & Σαμπάνια', TR: 'Kava & Şampanya', AR: 'كافا وشامبانيا', ZH: '卡瓦与香槟', JA: 'カヴァ＆シャンパン', CA: 'Caves i Xampany', EU: 'Kava eta Xanpaina', GL: 'Cavas e Champaña', VA: 'Caves i Xampany' }
];

var subCatsLang = {
    mallorca: { ES: 'Vinos de Mallorca', EN: 'Majorcan Wines', DE: 'Weine aus Mallorca', FR: 'Vins de Majorque', IT: 'Vini di Maiorca', RU: 'Мальорканские вина', NL: 'Mallorquijnse wijnen', PL: 'Wina z Majorki', SV: 'Mallorkinska viner', NO: 'Mallorcanske viner', DA: 'Mallorcanske vine', FI: 'Mallorcalaiset viinit', PT: 'Vinhos de Maiorca', RO: 'Vinuri de Mallorca', HU: 'Mallorcai borok', CS: 'Mallorská vína', EL: 'Κρασιά της Μαγιόρκα', TR: 'Mallorca Şarapları', AR: 'نبيذ مايوركا', ZH: '马略卡葡萄酒', JA: 'マヨルカワイン', CA: 'Vins de Mallorca', EU: 'Mallorcako Ardoak', GL: 'Viños de Mallorca', VA: 'Vins de Mallorca' },
    copas: { ES: 'Copas', EN: 'By the Glass', DE: 'Glasweise', FR: 'Au Verre', IT: 'Al Calice', RU: 'По бокалам', NL: 'Per glas', PL: 'Na kieliszki', SV: 'Glasvis', NO: 'Glassvis', DA: 'Pr. glas', FI: 'Laseittain', PT: 'A copo', RO: 'La pahar', HU: 'Pohárral', CS: 'Rozlévaná vína', EL: 'Σε Ποτήρι', TR: 'Kadehtehte', AR: 'بأقداح الكأس', ZH: '杯装酒', JA: 'グラスワイン', CA: 'Copes', EU: 'Kopak', GL: 'Copas', VA: 'Copes' },
    otras: { ES: 'Otras D.O.', EN: 'Other D.O.', DE: 'Andere D.O.', FR: 'Autres D.O.', IT: 'Altre D.O.', RU: 'Другие D.O.', NL: 'Overige D.O.', PL: 'Inne D.O.', SV: 'Andra D.O.', NO: 'Andre D.O.', DA: 'Andre D.O.', FI: 'Muut D.O.', PT: 'Outras D.O.', RO: 'Alte D.O.', HU: 'Egyéb D.O.', CS: 'Ostatné D.O.', EL: 'Άλλες D.O.', TR: 'Diğer D.O.', AR: 'تسميات منشأ أخرى', ZH: '其他D.O.产区', JA: 'その他のD.O.', CA: 'Altres D.O.', EU: 'Beste D.O. batzukak', GL: 'Outras D.O.', VA: 'Altres D.O.' }, 
    galicia: { ES: 'Galicia', EN: 'Galicia', DE: 'Galicien', FR: 'Galice', IT: 'Galizia', RU: 'Галисия', NL: 'Galicië', PL: 'Galcja', SV: 'Galicien', NO: 'Galicia', DA: 'Galicien', FI: 'Galicia', PT: 'Galiza', RO: 'Galicia', HU: 'Galícia', CS: 'Galicie', EL: 'Γαλικία', TR: 'Galiçya', AR: 'غاليسيا', ZH: '加利西亚', JA: 'ガリシア', CA: 'Galícia', EU: 'Galizia', GL: 'Galicia', VA: 'Galícia' },
    rueda: { ES: 'Rueda', EN: 'Rueda', DE: 'Rueda', FR: 'Rueda', IT: 'Rueda', RU: 'Руэда', NL: 'Rueda', PL: 'Rueda', SV: 'Rueda', NO: 'Rueda', DA: 'Rueda', FI: 'Rueda', PT: 'Rueda', RO: 'Rueda', HU: 'Rueda', CS: 'Rueda', EL: 'Ρουέδα', TR: 'Rueda', AR: 'رويدا', ZH: '卢埃达', JA: 'ルエダ', CA: 'Rueda', EU: 'Rueda', GL: 'Rueda', VA: 'Rueda' },
    rioja: { ES: 'Rioja', EN: 'Rioja', DE: 'Rioja', FR: 'Rioja', IT: 'Rioja', RU: 'Риоха', NL: 'Rioja', PL: 'Rioja', SV: 'Rioja', NO: 'Rioja', DA: 'Rioja', FI: 'Rioja', PT: 'Rioja', RO: 'Rioja', HU: 'Rioja', CS: 'Rioja', EL: 'Ριόχα', TR: 'Rioja', AR: 'ريوخا', ZH: '里奥哈', JA: 'リオハ', CA: 'Rioja', EU: 'Rioja', GL: 'Rioja', VA: 'Rioja' },
    ribera: { ES: 'Ribera', EN: 'Ribera', DE: 'Ribera', FR: 'Ribera', IT: 'Ribera', RU: 'Рибера', NL: 'Ribera', PL: 'Ribera', SV: 'Ribera', NO: 'Ribera', DA: 'Ribera', FI: 'Ribera', PT: 'Ribera', RO: 'Ribera', HU: 'Ribera', CS: 'Ribera', EL: 'Ρίβέρα', TR: 'Ribera', AR: 'ريبيرا', ZH: '杜埃罗河岸', JA: 'リベラ', CA: 'Ribera', EU: 'Ribera', GL: 'Ribera', VA: 'Ribera' }
};
