// =========================================================================================
// RESTAURANTE: CLUB HOUSE — configuración de la carta (la lee el núcleo, nucleo/v4/script.js).
// Aquí va TODO lo propio de este restaurante. Lo que no esté aquí es común a todos.
//
// Pestañas: los "id" deben coincidir con los pestanaId del editor (estructuras.js), porque
// con ellos se guardan las pestañas desactivadas.
//   rangos       IDs de plato que entran en la pestaña: [[desde, hasta], ...]
//   grupos       títulos dentro de la pestaña, cada uno con sus rangos
//   modoGrupos   'bloques' (por defecto): sin grupo arriba y luego cada grupo en orden
//                'secuencial': en el orden de la hoja, título cada vez que cambia el grupo
//   anexos       platos de otros rangos añadidos al final con título (guarniciones)
//   precargaFotos  fotos por plato que se precargan (por defecto 2)
// =========================================================================================

window.RESTAURANTE = {
    id: 'clubhouse',

    datos: {
        tipo: 'sheets',
        csv: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSpVWFPsuWkDT5wtr5mM8H0JFC8d0ePBCKJxcXDyyfX7M5FOZ1UXUqRrPiOaLeq_tYt9n9-a1iabKPR/pub?output=csv',
        vivo: 'https://script.google.com/macros/s/AKfycbxzwOUB9Bb7HbngjGuvqhDPF0JCQsuOfwnqZNsUBzS6TDTrJjuC3ZTTe0N0sZElu1jXrg/exec'
    },

    idiomas: { esenciales: ['ES', 'EN', 'DE', 'FR', 'IT'], rtl: ['AR'] },
    disposicion: 'clasica',
    pestanaInicial: 'sugerencias',

    pestanas: [
        { id: 'sugerencias', rangos: [[12000, 12999]], nombre: {
            ES: "Sugerencias", EN: "Chef's Suggestions", DE: "Empfehlungen des Chefs", FR: "Suggestions du Chef", IT: "Suggerimenti dello Chef",
            RU: "Рекомендации шеф-повара", NL: "Aanbevelingen van de Chef", PL: "Sugestie Szefa Kuchni", SV: "Kockens Förslag", NO: "Kokkens Forslag",
            DA: "Kokkens Forslag", FI: "Kokin Suositukset", PT: "Sugestões do Chef", RO: "Recomandările Bucătarului-Șef", HU: "A Séf Ajánlata",
            CS: "Doporučení Šéfkuchaře", EL: "Προτάσεις του Σεφ", TR: "Şefin Önerileri", AR: "اقتراحات الشيف", ZH: "主厨推荐",
            JA: "シェフのおすすめ", KO: "셰프의 추천", CA: "Suggeriments del Xef", EU: "Sukaldariaren Gomendioak", GL: "Suxestións do Chef",
            VA: "Suggeriments del Xef"
        } },
        { id: 'tostadas', rangos: [[1000, 1199]], nombre: {
            ES: "Tostadas", EN: "Toasts", DE: "Toasts", FR: "Toasts", IT: "Toast",
            RU: "Тосты", NL: "Toosties", PL: "Tosty", SV: "Rostat Bröd", NO: "Ristet Brød",
            DA: "Ristet Brød", FI: "Paahtoleivät", PT: "Torradas", RO: "Toasturi", HU: "Pirítósok",
            CS: "Toasty", EL: "Τοστ", TR: "Tostlar", AR: "التوست", ZH: "吐司",
            JA: "トースト", KO: "토스트", CA: "Torrades", EU: "Ogi Txigortuak", GL: "Torradas",
            VA: "Torrades"
        },
          grupos: [
            { rangos: [[1100, 1199]], nombre: {
                ES: "Ingredientes Extra", EN: "Extra Ingredients", DE: "Extra-Zutaten", FR: "Suppléments", IT: "Ingredienti Extra",
                RU: "Дополнительные ингредиенты", NL: "Extra Ingrediënten", PL: "Dodatkowe Składniki", SV: "Extra Ingredienser", NO: "Ekstra Ingredienser",
                DA: "Ekstra Ingredienser", FI: "Lisätäytteet", PT: "Ingredientes Extra", RO: "Ingrediente Suplimentare", HU: "Extra Hozzávalók",
                CS: "Extra Ingredience", EL: "Επιπλέον Υλικά", TR: "Ekstra Malzemeler", AR: "مكونات إضافية", ZH: "额外配料",
                JA: "追加具材", KO: "추가 재료", CA: "Ingredients Extra", EU: "Osagai Gehigarriak", GL: "Ingredientes Extra",
                VA: "Ingredients Extra"
            } }
          ] },
        { id: 'creps', rangos: [[1200, 1299]], nombre: {
            ES: "Creps", EN: "Crêpes", DE: "Crêpes", FR: "Crêpes", IT: "Crêpe",
            RU: "Блины", NL: "Crêpes", PL: "Naleśniki", SV: "Crêpes", NO: "Crêpes",
            DA: "Crêpes", FI: "Crêpet", PT: "Crepes", RO: "Clătite", HU: "Palacsinta",
            CS: "Palačinky", EL: "Κρέπες", TR: "Krep", AR: "كريب", ZH: "可丽饼",
            JA: "クレープ", KO: "크레페", CA: "Crêpes", EU: "Krepeak", GL: "Crepes",
            VA: "Crêpes"
        } },
        { id: 'bocadillos', rangos: [[1300, 1499]], nombre: {
            ES: "Bocadillos", EN: "Baguette Sandwiches", DE: "Baguette-Sandwiches", FR: "Sandwichs Baguette", IT: "Panini Baguette",
            RU: "Багеты-сэндвичи", NL: "Baguette Sandwiches", PL: "Kanapki Bagietkowe", SV: "Baguettesmörgåsar", NO: "Baguettesmørbrød",
            DA: "Baguettesandwich", FI: "Patonkivoileivät", PT: "Sanduíches de Baguete", RO: "Sandvișuri Baghetă", HU: "Bagett Szendvicsek",
            CS: "Bagetové Sendviče", EL: "Σάντουιτς Μπαγκέτα", TR: "Baget Sandviçler", AR: "سندويشات الباغيت", ZH: "法棍三明治",
            JA: "バゲットサンド", KO: "바게트 샌드위치", CA: "Entrepans de Baguet", EU: "Baguette Ogitartekoak", GL: "Bocadillos de Baguete",
            VA: "Entrepans de Baguet"
        },
          grupos: [
            { rangos: [[1400, 1499]], nombre: {
                ES: "Ingredientes Extra", EN: "Extra Ingredients", DE: "Extra-Zutaten", FR: "Suppléments", IT: "Ingredienti Extra",
                RU: "Дополнительные ингредиенты", NL: "Extra Ingrediënten", PL: "Dodatkowe Składniki", SV: "Extra Ingredienser", NO: "Ekstra Ingredienser",
                DA: "Ekstra Ingredienser", FI: "Lisätäytteet", PT: "Ingredientes Extra", RO: "Ingrediente Suplimentare", HU: "Extra Hozzávalók",
                CS: "Extra Ingredience", EL: "Επιπλέον Υλικά", TR: "Ekstra Malzemeler", AR: "مكونات إضافية", ZH: "额外配料",
                JA: "追加具材", KO: "추가 재료", CA: "Ingredients Extra", EU: "Osagai Gehigarriak", GL: "Ingredientes Extra",
                VA: "Ingredients Extra"
            } }
          ] },
        { id: 'sandwich', rangos: [[1500, 1599]], nombre: {
            ES: "Sandwich", EN: "Sandwiches", DE: "Sandwiches", FR: "Sandwichs", IT: "Sandwich",
            RU: "Сэндвичи", NL: "Sandwiches", PL: "Kanapki", SV: "Smörgåsar", NO: "Smørbrød",
            DA: "Sandwich", FI: "Voileivät", PT: "Sandes", RO: "Sandvișuri", HU: "Szendvicsek",
            CS: "Sendviče", EL: "Σάντουιτς", TR: "Sandviçler", AR: "السندويتشات", ZH: "三明治",
            JA: "サンドイッチ", KO: "샌드위치", CA: "Sandvitxos", EU: "Ogitartekoak", GL: "Sandwiches",
            VA: "Sandvitxos"
        } },
        { id: 'entrantes', rangos: [[1600, 1699]], nombre: {
            ES: "Para Picar", EN: "Starters", DE: "Vorspeisen", FR: "Entrées", IT: "Antipasti",
            RU: "Закуски", NL: "Voorgerechten", PL: "Przystawki", SV: "Förrätter", NO: "Forretter",
            DA: "Forretter", FI: "Alkuruoat", PT: "Entradas", RO: "Aperitive", HU: "Előételek",
            CS: "Předkrmy", EL: "Ορεκτικά", TR: "Başlangıçlar", AR: "المقبلات", ZH: "前菜",
            JA: "前菜", KO: "애피타이저", CA: "Entrants", EU: "Hastekoak", GL: "Entrantes",
            VA: "Entrants"
        } },
        { id: 'pizzas', rangos: [[1700, 1799]], nombre: {
            ES: "Pizzas", EN: "Pizzas", DE: "Pizzen", FR: "Pizzas", IT: "Pizze",
            RU: "Пицца", NL: "Pizza's", PL: "Pizze", SV: "Pizzor", NO: "Pizzaer",
            DA: "Pizzaer", FI: "Pizzat", PT: "Pizzas", RO: "Pizza", HU: "Pizzák",
            CS: "Pizzy", EL: "Πίτσες", TR: "Pizzalar", AR: "البيتزا", ZH: "披萨",
            JA: "ピザ", KO: "피자", CA: "Pizzes", EU: "Pizzak", GL: "Pizzas",
            VA: "Pizzes"
        } },
        { id: 'ensaladas', rangos: [[2000, 2199]], nombre: {
            ES: "Ensaladas", EN: "Salads", DE: "Salate", FR: "Salades", IT: "Insalate",
            RU: "Салаты", NL: "Salades", PL: "Sałatki", SV: "Sallader", NO: "Salater",
            DA: "Salater", FI: "Salaatit", PT: "Saladas", RO: "Salate", HU: "Saláták",
            CS: "Saláty", EL: "Σαλάτες", TR: "Salatalar", AR: "السلطات", ZH: "沙拉",
            JA: "サラダ", KO: "샐러드", CA: "Amanides", EU: "Entsaladak", GL: "Ensaladas",
            VA: "Amanides"
        },
          grupos: [
            { rangos: [[2100, 2199]], nombre: {
                ES: "Ingredientes Extra", EN: "Extra Ingredients", DE: "Extra-Zutaten", FR: "Suppléments", IT: "Ingredienti Extra",
                RU: "Дополнительные ингредиенты", NL: "Extra Ingrediënten", PL: "Dodatkowe Składniki", SV: "Extra Ingredienser", NO: "Ekstra Ingredienser",
                DA: "Ekstra Ingredienser", FI: "Lisätäytteet", PT: "Ingredientes Extra", RO: "Ingrediente Suplimentare", HU: "Extra Hozzávalók",
                CS: "Extra Ingredience", EL: "Επιπλέον Υλικά", TR: "Ekstra Malzemeler", AR: "مكونات إضافية", ZH: "额外配料",
                JA: "追加具材", KO: "추가 재료", CA: "Ingredients Extra", EU: "Osagai Gehigarriak", GL: "Ingredientes Extra",
                VA: "Ingredients Extra"
            } }
          ] },
        { id: 'hamburguesas', rangos: [[3900, 3999]], nombre: {
            ES: "Hamburguesas", EN: "Burgers", DE: "Burger", FR: "Burgers", IT: "Hamburger",
            RU: "Бургеры", NL: "Burgers", PL: "Burgery", SV: "Hamburgare", NO: "Burgere",
            DA: "Burgere", FI: "Hampurilaiset", PT: "Hambúrgueres", RO: "Burgeri", HU: "Hamburgerek",
            CS: "Hamburgery", EL: "Μπέργκερ", TR: "Burgerler", AR: "البرغر", ZH: "汉堡",
            JA: "ハンバーガー", KO: "버거", CA: "Hamburgueses", EU: "Hanburgesak", GL: "Hamburguesas",
            VA: "Hamburgueses"
        } },
        { id: 'principales', rangos: [[4000, 4099], [4200, 4299], [5000, 5099]], nombre: {
            ES: "Platos Principales", EN: "Main Courses", DE: "Hauptgerichte", FR: "Plats Principaux", IT: "Piatti Principali",
            RU: "Основные блюда", NL: "Hoofdgerechten", PL: "Dania Główne", SV: "Huvudrätter", NO: "Hovedretter",
            DA: "Hovedretter", FI: "Pääruoat", PT: "Pratos Principais", RO: "Feluri Principale", HU: "Főételek",
            CS: "Hlavní Jídla", EL: "Κυρίως Πιάτα", TR: "Ana Yemekler", AR: "الأطباق الرئيسية", ZH: "主菜",
            JA: "メインディッシュ", KO: "메인 요리", CA: "Plats Principals", EU: "Plater Nagusiak", GL: "Pratos Principais",
            VA: "Plats Principals"
        },
          grupos: [
            { rangos: [[5000, 5099]], nombre: {
                ES: "Guarnición Extra", EN: "Extra Side Dishes", DE: "Extra-Beilagen", FR: "Garnitures Supplémentaires", IT: "Contorni Extra",
                RU: "Дополнительные гарниры", NL: "Extra Bijgerechten", PL: "Dodatkowe Dodatki", SV: "Extra Tillbehör", NO: "Ekstra Tilbehør",
                DA: "Ekstra Tilbehør", FI: "Ylimääräiset Lisäkkeet", PT: "Acompanhamentos Extra", RO: "Garnituri Suplimentare", HU: "Extra Köretek",
                CS: "Extra Přílohy", EL: "Επιπλέον Συνοδευτικά", TR: "Ekstra Garnitürler", AR: "أطباق جانبية إضافية", ZH: "额外配菜",
                JA: "追加サイドディッシュ", KO: "추가 사이드 메뉴", CA: "Guarnicions Extra", EU: "Gehigarrizko Garnizioak", GL: "Garnicións Extra",
                VA: "Guarnicions Extra"
            } }
          ] },
        { id: 'ninos', rangos: [[6000, 6099]], nombre: {
            ES: "Niños", EN: "Kids", DE: "Kinder", FR: "Enfants", IT: "Bambini",
            RU: "Детское меню", NL: "Kinderen", PL: "Dla Dzieci", SV: "Barn", NO: "Barn",
            DA: "Børn", FI: "Lapset", PT: "Crianças", RO: "Copii", HU: "Gyerekeknek",
            CS: "Pro Děti", EL: "Παιδικά", TR: "Çocuklar", AR: "الأطفال", ZH: "儿童餐",
            JA: "キッズメニュー", KO: "어린이 메뉴", CA: "Nens", EU: "Umeak", GL: "Nenos",
            VA: "Xiquets"
        } },
        { id: 'postres', rangos: [[7000, 7099]], nombre: {
            ES: "Postres", EN: "Desserts", DE: "Desserts", FR: "Desserts", IT: "Dolci",
            RU: "Десерты", NL: "Desserts", PL: "Desery", SV: "Efterrätter", NO: "Desserter",
            DA: "Desserter", FI: "Jälkiruoat", PT: "Sobremesas", RO: "Deserturi", HU: "Desszertek",
            CS: "Dezerty", EL: "Επιδόρπια", TR: "Tatlılar", AR: "الحلويات", ZH: "甜点",
            JA: "デザート", KO: "디저트", CA: "Postres", EU: "Postreak", GL: "Sobremesas",
            VA: "Postres"
        } },
        { id: 'cafes', rangos: [[9000, 9199]], nombre: {
            ES: "Cafés e Infusiones", EN: "Coffees & Teas", DE: "Kaffee & Tee", FR: "Cafés & Infusions", IT: "Caffè e Tisane",
            RU: "Кофе и чай", NL: "Koffie & Thee", PL: "Kawa i Herbaty", SV: "Kaffe & Te", NO: "Kaffe & Te",
            DA: "Kaffe & Te", FI: "Kahvit & Teet", PT: "Cafés e Infusões", RO: "Cafele și Ceaiuri", HU: "Kávék és Teák",
            CS: "Káva a Čaje", EL: "Καφέδες & Ροφήματα", TR: "Kahveler ve Çaylar", AR: "القهوة والشاي", ZH: "咖啡与茶",
            JA: "コーヒーとお茶", KO: "커피 & 차", CA: "Cafès i Infusions", EU: "Kafeak eta Infusioak", GL: "Cafés e Infusións",
            VA: "Cafès i Infusions"
        } },
        { id: 'bebidas', rangos: [[10000, 10299]], nombre: {
            ES: "Bebidas", EN: "Drinks", DE: "Getränke", FR: "Boissons", IT: "Bibite",
            RU: "Напитки", NL: "Dranken", PL: "Napoje", SV: "Drycker", NO: "Drikke",
            DA: "Drikkevarer", FI: "Juomat", PT: "Bebidas", RO: "Băuturi", HU: "Italok",
            CS: "Nápoje", EL: "Ποτά", TR: "İçecekler", AR: "المشروبات", ZH: "饮料",
            JA: "ドリンク", KO: "음료", CA: "Begudes", EU: "Edariak", GL: "Bebidas",
            VA: "Begudes"
        } },
        { id: 'bebidas_saludables', rangos: [[10300, 10499]], nombre: {
            ES: "Bebidas Saludables", EN: "Healthy Drinks", DE: "Gesunde Getränke", FR: "Boissons Saines", IT: "Bevande Salutari",
            RU: "Полезные напитки", NL: "Gezonde Dranken", PL: "Zdrowe Napoje", SV: "Hälsosamma Drycker", NO: "Sunne Drikker",
            DA: "Sunde Drikke", FI: "Terveelliset Juomat", PT: "Bebidas Saudáveis", RO: "Băuturi Sănătoase", HU: "Egészséges Italok",
            CS: "Zdravé Nápoje", EL: "Υγιεινά Ποτά", TR: "Sağlıklı İçecekler", AR: "المشروبات الصحية", ZH: "健康饮品",
            JA: "ヘルシードリンク", KO: "건강 음료", CA: "Begudes Saludables", EU: "Edari Osasungarriak", GL: "Bebidas Saudables",
            VA: "Begudes Saludables"
        },
          grupos: [
            { rangos: [[10300, 10399]], nombre: {
                ES: "Zumos Saludables", EN: "Healthy Juices", DE: "Gesunde Säfte", FR: "Jus Sains", IT: "Succhi Salutari",
                RU: "Полезные соки", NL: "Gezonde Sappen", PL: "Zdrowe Soki", SV: "Hälsosamma Juicer", NO: "Sunne Juicer",
                DA: "Sunde Juicer", FI: "Terveelliset Mehut", PT: "Sumos Saudáveis", RO: "Sucuri Sănătoase", HU: "Egészséges Levek",
                CS: "Zdravé Šťávy", EL: "Υγιεινοί Χυμοί", TR: "Sağlıklı Meyve Suları", AR: "عصائر صحية", ZH: "健康果汁",
                JA: "ヘルシージュース", KO: "건강 주스", CA: "Sucs Saludables", EU: "Zuku Osasungarriak", GL: "Zumos Saudables",
                VA: "Sucs Saludables"
            } },
            { rangos: [[10400, 10499]], nombre: {
                ES: "Botellas Saludables", EN: "Healthy Bottled Drinks", DE: "Gesunde Flaschengetränke", FR: "Boissons en Bouteille Saines", IT: "Bevande in Bottiglia Salutari",
                RU: "Полезные напитки в бутылках", NL: "Gezonde Flesdranken", PL: "Zdrowe Napoje Butelkowane", SV: "Hälsosamma Flaskdrycker", NO: "Sunne Flaskedrikker",
                DA: "Sunde Flaskedrikke", FI: "Terveelliset Pullojuomat", PT: "Bebidas Saudáveis Engarrafadas", RO: "Băuturi Îmbuteliate Sănătoase", HU: "Egészséges Palackozott Italok",
                CS: "Zdravé Lahvové Nápoje", EL: "Υγιεινά Εμφιαλωμένα Ποτά", TR: "Sağlıklı Şişe İçecekler", AR: "مشروبات معبأة صحية", ZH: "健康瓶装饮料",
                JA: "ヘルシーボトル飲料", KO: "건강 병 음료", CA: "Ampolles Saludables", EU: "Botilako Edari Osasungarriak", GL: "Botellas Saudables",
                VA: "Botelles Saludables"
            } }
          ] },
        { id: 'cervezas', rangos: [[11000, 11099]], nombre: {
            ES: "Cervezas", EN: "Beers", DE: "Biere", FR: "Bières", IT: "Birre",
            RU: "Пиво", NL: "Bieren", PL: "Piwa", SV: "Öl", NO: "Øl",
            DA: "Øl", FI: "Oluet", PT: "Cervejas", RO: "Beri", HU: "Sörök",
            CS: "Piva", EL: "Μπύρες", TR: "Biralar", AR: "البيرة", ZH: "啤酒",
            JA: "ビール", KO: "맥주", CA: "Cerveses", EU: "Garagardoak", GL: "Cervexas",
            VA: "Cerveses"
        } },
        { id: 'aperitivos', rangos: [[11100, 11299]], nombre: {
            ES: "Aperitivos", EN: "Aperitifs", DE: "Aperitifs", FR: "Apéritifs", IT: "Aperitivi",
            RU: "Аперитивы", NL: "Aperitieven", PL: "Aperitify", SV: "Aperitifer", NO: "Aperitiffer",
            DA: "Aperitiffer", FI: "Aperitiivit", PT: "Aperitivos", RO: "Aperitive", HU: "Aperitifek",
            CS: "Aperitivy", EL: "Απεριτίφ", TR: "Aperitifler", AR: "المقبلات الفاتحة للشهية", ZH: "开胃酒",
            JA: "アペリティフ", KO: "아페리티프", CA: "Aperitius", EU: "Aperitiboak", GL: "Aperitivos",
            VA: "Aperitius"
        },
          grupos: [
            { rangos: [[11100, 11199]], nombre: {
                ES: "Aperitivos", EN: "Aperitifs", DE: "Aperitifs", FR: "Apéritifs", IT: "Aperitivi",
                RU: "Аперитивы", NL: "Aperitieven", PL: "Aperitify", SV: "Aperitifer", NO: "Aperitiffer",
                DA: "Aperitiffer", FI: "Aperitiivit", PT: "Aperitivos", RO: "Aperitive", HU: "Aperitifek",
                CS: "Aperitivy", EL: "Απεριτίφ", TR: "Aperitifler", AR: "المقبلات الفاتحة للشهية", ZH: "开胃酒",
                JA: "アペリティフ", KO: "아페리티프", CA: "Aperitius", EU: "Aperitiboak", GL: "Aperitivos",
                VA: "Aperitius"
            } },
            { rangos: [[11200, 11299]], nombre: {
                ES: "Copas de vino y sangría", EN: "Wine & Sangria by the Glass", DE: "Wein & Sangria im Glas", FR: "Vin & Sangria au Verre", IT: "Vino e Sangria al Calice",
                RU: "Вино и сангрия по бокалам", NL: "Wijn & Sangria per Glas", PL: "Wino i Sangria na Kieliszki", SV: "Vin & Sangria på Glas", NO: "Vin & Sangria i Glass",
                DA: "Vin & Sangria på Glas", FI: "Viini & Sangria Lasillisina", PT: "Vinho e Sangria a Copo", RO: "Vin și Sangria la Pahar", HU: "Bor és Sangria Pohárban",
                CS: "Víno a Sangria na Skleničky", EL: "Κρασί & Σανγκρία σε Ποτήρι", TR: "Kadehte Şarap ve Sangria", AR: "النبيذ والسانجريا بالكأس", ZH: "杯装葡萄酒与桑格利亚汽酒",
                JA: "グラスワイン＆サングリア", KO: "잔술 와인 & 상그리아", CA: "Copes de Vi i Sangria", EU: "Ardoa eta Sangria Kopan", GL: "Copas de Viño e Sangría",
                VA: "Copes de Vi i Sangria"
            } }
          ] },
        { id: 'vinos_blancos', rangos: [[13100, 13199]], precargaFotos: 1, nombre: {
            ES: "Vinos Blancos", EN: "White Wines", DE: "Weissweine", FR: "Vins Blancs", IT: "Vini Bianchi",
            RU: "Белые вина", NL: "Witte Wijnen", PL: "Białe Wina", SV: "Vita Viner", NO: "Hvite Viner",
            DA: "Hvidvine", FI: "Valkoviinit", PT: "Vinhos Brancos", RO: "Vinuri Albe", HU: "Fehérborok",
            CS: "Bílá Vína", EL: "Λευκά Κρασιά", TR: "Beyaz Şaraplar", AR: "النبيذ الأبيض", ZH: "白葡萄酒",
            JA: "白ワイン", KO: "화이트 와인", CA: "Vins Blancs", EU: "Ardo Zuriak", GL: "Viños Brancos",
            VA: "Vins Blancs"
        } },
        { id: 'vinos_rosados', rangos: [[13200, 13299]], precargaFotos: 1, nombre: {
            ES: "Vinos Rosados", EN: "Rosé Wines", DE: "Roséweine", FR: "Vins Rosés", IT: "Vini Rosati",
            RU: "Розовые вина", NL: "Rosé Wijnen", PL: "Wina Różowe", SV: "Roséviner", NO: "Roséviner",
            DA: "Rosévine", FI: "Roseeviinit", PT: "Vinhos Rosés", RO: "Vinuri Roze", HU: "Rozé Borok",
            CS: "Růžová Vína", EL: "Ροζέ Κρασιά", TR: "Roze Şaraplar", AR: "النبيذ الوردي", ZH: "桃红葡萄酒",
            JA: "ロゼワイン", KO: "로제 와인", CA: "Vins Rosats", EU: "Ardo Arrosak", GL: "Viños Rosados",
            VA: "Vins Rosats"
        } },
        { id: 'vinos_tintos', rangos: [[13300, 13399]], precargaFotos: 1, nombre: {
            ES: "Vinos Tintos", EN: "Red Wines", DE: "Rotweine", FR: "Vins Rouges", IT: "Vini Rossi",
            RU: "Красные вина", NL: "Rode Wijnen", PL: "Czerwone Wina", SV: "Röda Viner", NO: "Røde Viner",
            DA: "Rødvine", FI: "Punaviinit", PT: "Vinhos Tintos", RO: "Vinuri Roșii", HU: "Vörösborok",
            CS: "Červená Vína", EL: "Κόκκινα Κρασιά", TR: "Kırmızı Şaraplar", AR: "النبيذ الأحمر", ZH: "红葡萄酒",
            JA: "赤ワイン", KO: "레드 와인", CA: "Vins Negres", EU: "Ardo Beltzak", GL: "Viños Tintos",
            VA: "Vins Negres"
        } },
        { id: 'cavas', rangos: [[13400, 13499]], precargaFotos: 1, nombre: {
            ES: "Cavas & Champagne", EN: "Cava & Champagne", DE: "Cava & Champagne", FR: "Cava & Champagne", IT: "Cava & Champagne",
            RU: "Кава и шампанское", NL: "Cava & Champagne", PL: "Cava i Szampan", SV: "Cava & Champagne", NO: "Cava og Champagne",
            DA: "Cava & Champagne", FI: "Cava & Samppanja", PT: "Cavas e Champanhe", RO: "Cava și Șampanie", HU: "Cava és Pezsgő",
            CS: "Cava a Šampaňské", EL: "Cava & Σαμπάνια", TR: "Kava ve Şampanya", AR: "الكافا والشمبانيا", ZH: "卡瓦与香槟",
            JA: "カヴァ&シャンパン", KO: "카바 & 샴페인", CA: "Caves i Xampany", EU: "Cava eta Xanpaina", GL: "Cavas e Champán",
            VA: "Caves i Xampany"
        } },
        { id: 'alergenos', especial: 'alergenos' }
    ],

    // Filas que no son platos sino avisos: centradas, a todo el ancho y sin precio.
    notasInformativas: [1105, 1703, 1705, 2101],

    // Miniatura fija siempre visible en la fila del plato.
    miniaturas: {
        12990: 'imagenes/vinos/tenista_pegado.webp'
    }
};
