// --- menu-especial.js ---
// NUEVO (18 sept): módulo de la pestaña "6. Menú Especial" — plantillas de menú de evento
// (boda/grupo/celebración), sin precio, con logo RG opcional, en ES y/o EN, con secciones
// Entrantes/Primero/Principal/Postre activables de forma independiente (cada una con varios
// platos posibles, sacados de la carta de RG y/o de US Open mediante un selector grande con
// checks -- o escritos a mano si el plato no está en ninguna carta), más una sección de Bebida
// fija (Agua/Cerveza/Refresco/Café o infusiones + Vino Blanco/Tinto "a especificar", solo con
// sugerencias de vinos y cavas de verdad, nunca platos de comida). Los menús se guardan de
// verdad (no es solo una herramienta de "componer e imprimir") en un backend de Apps Script
// COMPLETAMENTE NUEVO e independiente de RG y de US Open (ver Codigo_MenusEspeciales.gs y
// config.js/WEBAPP_URL_MENUS_ESPECIALES). Se imprime SIEMPRE en una sola hoja A4 horizontal (2
// copias del menú, con guía de corte para la guillotina) reduciendo la letra automáticamente
// si hace falta -- igual que ya hace "Sugerencias" (sugerencias-print.js) con su patrón de
// ventana emergente (window.open + document.write), para no depender de @media print peleándose
// con el resto de la interfaz del editor.
window.APP_VERSIONS = window.APP_VERSIONS || {};
window.APP_VERSIONS.menuEspecial = '1.25.0'; // NUEVO (27 sept): la impresión ya NO agranda la letra para "llenar" un menú corto -- ahora, si sobra hueco en la página, se reparte como espacio en blanco entre las secciones (Entrantes/Principales/Postre/Bebida), estirando el marco naranja a lo largo de toda la hoja con justify-content:space-evenly, en vez de dejarlas apelotonadas arriba con un hueco vacío abajo. La letra solo se sigue reduciendo (nunca agrandando) cuando un menú largo no cabe de otra forma. Ver repartirEspacioSobrante() en imprimir(). (1.24.0) "Mis Platos" -- los platos de comida (no vino) que se añaden escribiéndolos a mano (agregarPlatoManual) se guardan automáticamente en una biblioteca propia y permanente en el backend (Codigo_MenusEspeciales.gs, hoja "PlatosManuales", acciones listarPlatosManuales/guardarPlatoManual/eliminarPlatoManual -- deduplica por nombre normalizado, sin acentos ni mayúsculas). Esos platos guardados aparecen mezclados en el mismo buscador "🔍 Elegir platos de la carta" (popup), como una categoría más llamada "Mis Platos" (la primera de la lista), con su propia etiqueta verde y un botón 🗑️ para quitarlos de la biblioteca sin afectar a menús ya guardados que los usen. El guardado en la biblioteca es en segundo plano (no bloquea el añadido del plato al menú) y solo aplica a platos de comida, nunca a vinos. (1.23.0) CORREGIDO: la 1.22.0 añadió el aviso de posible falta de ortografía SOLO en el último paso (al pulsar "Añadir plato"/"Guardar", vía revisarOrtografiaManual()) -- pero al pulsar antes "🌐 Traducir" (traducirAIngles), que YA usa window.PROMPTS.opcionesEN() y esa función YA revisa la ortografía en la misma llamada, el resultado de esa revisión (obj.correccion) se estaba descartando sin más: el traductor entendía bien el plato pese a la falta (p.ej. "gaspaxo" se traducía correctamente) pero no avisaba hasta el paso final. Ahora traducirAIngles() también recoge obj.correccion y, si hay falta, muestra el mismo aviso "¿Quisiste decir...?" justo ahí, nada más traducir -- el aviso del paso de "Añadir/Guardar" se mantiene igual, por si el usuario no llega a pulsar "Traducir" (escribe el inglés a mano o lo deja para luego). (1.22.0) NUEVO: aviso de posible falta de ortografía al añadir un plato manualmente (agregarPlatoManual) o al editar el nombre de uno ya añadido (guardarEdicionPlato) -- mismo patrón "¿Quisiste decir...?" que ya usa el editor de carta normal (mostrarCorreccionOrtografiaEN, en app.js) y que se inspiró originalmente en la web de Cartelitos Buffet. Usa un prompt nuevo y más ligero (window.PROMPTS.revisionOrtografica, en prompts.js) que solo revisa ortografía sin pedir traducciones. Nunca se aplica a vinos (nombres propios/marca), y si falla por lo que sea no bloquea el añadido/guardado.

(function () {
    'use strict';

    // =================================================================================
    // ESTADO DEL MÓDULO
    // =================================================================================
    let platosParaPopup = [];                 // [{modo,alias,id,es,en,tipo}] -- solo comida de verdad (ver CARPETAS_EXCLUIDAS_DE_PLATOS); tipo: 'postre' | 'principal'. Incluye también los de platosManuales (modo:'manual'), fusionados al final de cargarIndiceDePlatos().
    let indiceVinos = [];                     // [{modo,id,es,en,tipo}] -- SOLO vinos y cavas (id 13100-14499); tipo: 'blanco'|'rosado'|'tinto'|'cava'
    let platosManuales = [];                  // [{id,es,en,tipo}] -- biblioteca "Mis Platos" (Codigo_MenusEspeciales.gs, hoja PlatosManuales): platos escritos a mano y guardados para reutilizar en futuros menús. Se funden dentro de platosParaPopup con modo:'manual' (ver cargarIndiceDePlatos/refrescarPlatosManualesEnPool); esta lista es solo la "fuente" tal cual viene del servidor.
    let menusGuardados = [];                  // última lista conocida (GET listarMenus), más recientes primero
    let menusGuardadosPromesa = null;         // 25 sept: ver precargarEnSegundoPlano/init()
    let menuActual = null;                    // el menú que se está editando ahora mismo en pantalla
    let modalGrupoActual = null;              // 'comida' | 'vino' -- a qué pool pertenece el popup abierto ahora mismo
    let modalSeccionActual = null;            // clave de sección ('entrantes'/'primero'/.../'postre') o de vino ('vinoBlanco'/'vinoRosado'/'vinoTinto'/'cava') a la que añade el popup abierto
    const seleccionEnModal = {};              // "modo|id" -> true, mientras el popup está abierto
    let editGrupo = null;                     // 'comida' | 'vino' | null -- grupo del plato/vino que se está editando in situ ahora mismo (null = nada en edición)
    let editKey = null;                       // clave de sección/vino del que se está editando ahora mismo
    let editIndex = null;                     // índice dentro de esa lista del que se está editando ahora mismo

    // Cafés, refrescos/bebidas y cervezas nunca son "platos" de una sección de comida -- ver
    // estructuras.js: en RG caen en el rango de ID 9000-11999, en US Open en 9001-11099 (mismo
    // rango de millar, por seguridad se descarta TODO el bloque 9000-11999 en los dos). Además,
    // por si algún plato antiguo no llevara ese rango de ID bien puesto, se descarta también por
    // "carpeta" (cafe/refrescos/cerveza) -- y 'vinos' por si acaso algún vino colgara de un ID
    // fuera del rango de vinos reconocido (p.ej. el "Vino" de Sugerencias en US Open, ID 12991-
    // 12999, carpeta "vinos" pero FUERA del rango 13100-14499). 'niños' y 'guarnicion' (a petición
    // del usuario, 19 sept): los platos de niño y las guarniciones sueltas/extra no tienen sentido
    // como plato independiente de un menú especial de evento, así que se descartan del todo, no
    // solo se agrupan en "Otros".
    const CARPETAS_EXCLUIDAS_DE_PLATOS = ['cafe', 'refrescos', 'cerveza', 'vinos', 'niños', 'guarnicion'];

    // Agrupación del popup de PLATOS (grupo 'comida', excepto la sección Postre -- ahí el pool ya
    // es un único bloque homogéneo, ver renderModalLista) por la "carpeta" real del plato en la
    // carta (item.carpeta, ver estructuras.js) -- NO cambia en nada qué platos puede llevar cada
    // sección del menú especial (Entrantes/Primero/Principal siguen compartiendo el mismo pool),
    // es solo para que el propio popup sea más fácil de recorrer con montones de platos. Lista de
    // categorías, afinada por el usuario en 2 rondas (19 sept): "pasta" es la carpeta que usa RG
    // ("3- Arroz y Pasta"), "pastas" la que usa US Open ("5- Pastas") -- se incluyen las dos
    // grafías en "Pastas y Pizzas" para no dejar fuera los platos de ninguno de los dos
    // restaurantes. Ramen/tacos siguen sin categoría propia y caen en "Otros" hasta que se pida.
    const CATEGORIAS_POPUP_COMIDA = [
        { label: 'Entrantes', carpetas: ['entrantes'] },
        { label: 'Ensaladas', carpetas: ['ensaladas', 'pokes'] },
        { label: 'Arroces', carpetas: ['arroz'] },
        { label: 'Carnes y Pescado', carpetas: ['carne', 'pescado'] },
        { label: 'Hamburguesas', carpetas: ['hamburguesas'] },
        { label: 'Pastas y Pizzas', carpetas: ['pasta', 'pastas', 'pizzas'] }
    ];
    const CATEGORIA_OTROS_LABEL = 'Otros';
    // NUEVO (19 sept): categoría fija para los platos de la biblioteca "Mis Platos" (ver
    // platosManuales/cargarIndiceDePlatos) -- se identifican por p.modo==='manual' (nunca por
    // carpeta, no tienen), y siempre van los primeros en el popup (ver renderModalListaAgrupada)
    // para que sea rápido reutilizar lo ya guardado.
    const CATEGORIA_MIS_PLATOS_LABEL = 'Mis Platos';

    function categoriaDeCarpeta(carpeta) {
        const c = (carpeta || '').toLowerCase().trim();
        const encontrada = CATEGORIAS_POPUP_COMIDA.find(cat => cat.carpetas.indexOf(c) !== -1);
        return encontrada ? encontrada.label : CATEGORIA_OTROS_LABEL;
    }

    // Normaliza un nombre para comparar/buscar: minúsculas, sin acentos, espacios colapsados.
    // A nivel de módulo (antes vivía solo dentro de cargarIndiceDePlatos, para deduplicarComunes)
    // porque categoriaDePlato() también la necesita para los overrides por nombre de abajo.
    function normalizarNombre(txt) {
        return (txt || '')
            .toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Overrides de categoría POR NOMBRE (19 sept, prioridad sobre la "carpeta" de
    // categoriaDeCarpeta) -- pensados para platos que vienen de "Sugerencias" (rango de ID
    // 12100-12999), donde la carpeta guardada por plato puede no coincidir con la categoría
    // visual real que el usuario espera (p.ej. Fideuá tiene carpeta "pasta" en la estructura de
    // RG pero para el usuario es un arroz; Corvina/Salmón y las hamburguesas sueltas de
    // Sugerencias pueden no llevar bien puesta su carpeta real). Cada "test" se compara contra el
    // nombre en español ya normalizado (minúsculas, sin acentos) con normalizarNombre().
    const CATEGORIA_OVERRIDES_POR_NOMBRE = [
        { test: /fideua/, label: 'Arroces' },
        { test: /burgue/, label: 'Hamburguesas' },
        { test: /corvina|salmon/, label: 'Carnes y Pescado' }
    ];

    // Categoría final de un plato para el popup. Orden de prioridad (19 sept, corregido tras ver
    // que "Ensalada de salmón" y un "Poke de salmón" se iban a Carnes y Pescado por el override
    // de pescado de abajo): 1) ser una ENSALADA O POKE pesa más que llevar pescado dentro -- se
    // detecta por carpeta (ensaladas/pokes) o porque el propio nombre ya lo dice, y si es así gana
    // siempre, sin pasar por los demás overrides; 2) si no, los overrides por nombre normales
    // (Fideuá/hamburguesas/pescado, pensados sobre todo para Sugerencias); 3) si ninguno encaja,
    // categoriaDeCarpeta() de toda la vida.
    function categoriaDePlato(p) {
        // Los de "Mis Platos" (biblioteca de platos manuales guardados, ver platosManuales) van
        // SIEMPRE en su propia categoría, por delante de cualquier otro criterio -- no tienen
        // "carpeta" real de la que deducir nada.
        if (p.modo === 'manual') return CATEGORIA_MIS_PLATOS_LABEL;
        const nombreNorm = normalizarNombre(p.es);
        const carpetaNorm = (p.carpeta || '').toLowerCase().trim();
        if (carpetaNorm === 'ensaladas' || carpetaNorm === 'pokes' || /ensalada|poke/.test(nombreNorm)) {
            return 'Ensaladas';
        }
        const override = CATEGORIA_OVERRIDES_POR_NOMBRE.find(o => o.test.test(nombreNorm));
        return override ? override.label : categoriaDeCarpeta(p.carpeta);
    }

    // "tituloEn" solo se usa al imprimir (etiquetaBilingue en construirHtmlMenuImpreso) -- el
    // formulario de edición sigue mostrando siempre "titulo" (en español), ver renderSeccionHtml.
    const SECCIONES_INFO = [
        { key: 'entrantes', titulo: 'Entrantes', tituloEn: 'Starters', conCompartir: true },
        { key: 'primero', titulo: 'Primero', tituloEn: 'First Course', conAElegir: true },
        { key: 'principal', titulo: 'Principal (Segundo)', tituloEn: 'Main Course', conAElegir: true },
        { key: 'postre', titulo: 'Postre', tituloEn: 'Dessert', conAElegir: true }
    ];

    // Los 4 vinos/cavas de la sección Bebida -- cada uno se activa/desactiva por separado ("por
    // si hay veces que lo ponemos y otras que no") y tiene su PROPIO popup grande con checks que
    // SOLO ofrece vinos de su propio "tipo" (ver indiceVinos más abajo) -- nunca se mezclan
    // blancos con tintos, ni cavas con rosados, etc.
    const WINES_INFO = [
        { key: 'vinoBlanco', tituloEs: 'Vino Blanco', tituloEn: 'White Wine', emoji: '🥂', tipo: 'blanco' },
        { key: 'vinoRosado', tituloEs: 'Vino Rosado', tituloEn: 'Rosé Wine', emoji: '🌸', tipo: 'rosado' },
        { key: 'vinoTinto', tituloEs: 'Vino Tinto', tituloEn: 'Red Wine', emoji: '🍷', tipo: 'tinto' },
        { key: 'cava', tituloEs: 'Cava', tituloEn: 'Cava', emoji: '🍾', tipo: 'cava' }
    ];

    function nuevoMenuVacio() {
        const bebida = { agua: true, cerveza: true, refresco: true, cafe: true };
        WINES_INFO.forEach(w => { bebida[w.key] = { activo: false, platos: [] }; });
        return {
            id: null,
            nombre: '',
            logo: true,
            mostrarNombre: true, // NUEVO (19 sept): imprimir o no el nombre del menú como título -- activado por defecto
            idiomas: { es: true, en: false },
            secciones: {
                entrantes: { activo: true, compartir: false, platos: [] },
                primero: { activo: false, aElegir: false, platos: [] },
                principal: { activo: true, aElegir: false, platos: [] },
                postre: { activo: true, aElegir: false, platos: [] }
            },
            bebida: bebida
        };
    }

    function escHtml(txt) {
        return String(txt === null || txt === undefined ? '' : txt)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function mostrarCargando(activo, texto) {
        if (activo) {
            if (typeof window.mostrarOverlayCarga === 'function') window.mostrarOverlayCarga(texto || '🍽️ Cargando Menú Especial...');
        } else {
            if (typeof window.ocultarOverlayCarga === 'function') window.ocultarOverlayCarga();
        }
    }

    function formatearFecha(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        const pad = n => String(n).padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function claveModoId(modo, id) { return modo + '|' + id; }

    // Palabras "menores" que, en mitad de un nombre, se dejan en minúscula al formatear en Title
    // Case (artículos/preposiciones/conjunciones cortas de ES+EN combinadas en una sola lista,
    // ya que un mismo campo puede ser español o inglés) -- la primera y la última palabra del
    // nombre SIEMPRE se capitalizan, aunque estén en esta lista (regla estándar de Title Case).
    const PALABRAS_MENORES_TITLE_CASE = new Set([
        'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into', 'nor', 'of', 'on',
        'onto', 'or', 'per', 'the', 'to', 'via', 'vs', 'with',
        'al', 'ante', 'con', 'de', 'del', 'el', 'en', 'entre', 'la', 'las', 'lo', 'los', 'o', 'para',
        'por', 'que', 'se', 'si', 'su', 'sus', 'tu', 'tus', 'un', 'una', 'unas', 'unos', 'y'
    ]);

    // Formatea un nombre de plato a "Title Case" inteligente -- mayúscula en cada palabra
    // principal, minúscula en las palabras menores de PALABRAS_MENORES_TITLE_CASE salvo que sean
    // la primera o la última palabra. Se aplica igual a ES y a EN (a petición del usuario, no solo
    // al inglés). Preserva puntuación pegada a la palabra (comas, paréntesis...) y capitaliza cada
    // parte de las palabras compuestas con guion (p.ej. "salsa-verde" -> "Salsa-Verde").
    function formatearTituloInteligente(texto) {
        const t = (texto || '').trim();
        if (!t) return t;
        const partes = t.split(/\s+/);
        return partes.map((token, i) => {
            const m = token.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}][\p{L}\p{N}'’-]*)?([^\p{L}\p{N}]*)$/u);
            if (!m || !m[2]) return token;
            const [, pre, nucleo, post] = m;
            const esExtremo = (i === 0 || i === partes.length - 1);
            const minusc = nucleo.toLowerCase();
            const formateado = (!esExtremo && PALABRAS_MENORES_TITLE_CASE.has(minusc))
                ? minusc
                : minusc.split('-').map(seg => seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : seg).join('-');
            return pre + formateado + post;
        }).join(' ');
    }

    // =================================================================================
    // ESTILOS PROPIOS — inyectados una sola vez, igual que hace sugerencias-print.js con los
    // suyos (ver document.getElementById('sugerencias-print-styles') en ese archivo).
    // =================================================================================
    function inyectarEstilos() {
        if (document.getElementById('menu-especial-styles')) return;
        const style = document.createElement('style');
        style.id = 'menu-especial-styles';
        style.innerHTML = `
            .me-card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px 18px; margin-bottom:14px; }
            .me-fila { display:flex; gap:12px; flex-wrap:wrap; align-items:center; }
            .me-check-label { display:flex; align-items:center; gap:7px; font-weight:700; font-size:0.92rem; cursor:pointer; user-select:none; white-space:nowrap; }
            .me-check-label input { width:17px; height:17px; cursor:pointer; margin:0; }
            .me-sub-check { font-weight:500; font-size:0.8rem; color:#666; }
            .me-plato-row { display:flex; align-items:center; justify-content:space-between; gap:10px; background:#f8f9fa; border:1px solid #eee; border-radius:8px; padding:7px 10px; margin-bottom:6px; font-size:0.86rem; }
            .me-plato-row .me-plato-nombre { flex:1; }
            .me-plato-tag { font-size:0.65rem; font-weight:700; text-transform:uppercase; padding:2px 6px; border-radius:4px; margin-right:8px; }
            .me-tag-rg { background:#fde7d6; color:#c0530b; }
            .me-tag-us { background:#dbeafe; color:#1d4ed8; }
            .me-tag-manual { background:#e5e7eb; color:#4b5563; }
            .me-tag-ambos { background:#ede9fe; color:#6d28d9; }
            .me-tag-mis-platos { background:#dcfce7; color:#15803d; }
            .me-btn-quitar { background:#fdecea; color:#e74c3c; border:none; border-radius:6px; width:26px; height:26px; cursor:pointer; font-weight:700; flex-shrink:0; }
            .me-btn-quitar:hover { background:#f8d7d3; }
            .me-plato-row-btns { display:flex; gap:6px; flex-shrink:0; }
            .me-btn-editar { background:#e8f0fe; color:#1a56d6; border:none; border-radius:6px; width:26px; height:26px; cursor:pointer; font-size:0.8rem; flex-shrink:0; }
            .me-btn-editar:hover { background:#d3e3fd; }
            .me-plato-row-editando { flex-direction:column; align-items:stretch; gap:8px; background:#fff9e6; border-color:#f0d894; }
            .me-plato-edit-campos { display:flex; gap:8px; flex-wrap:wrap; }
            .me-plato-edit-campos input { flex:1; min-width:140px; margin-bottom:0; font-size:0.82rem; }
            .me-plato-edit-btns { display:flex; gap:6px; justify-content:flex-end; }
            .me-layout { display:flex; gap:20px; align-items:flex-start; }
            .me-sidebar { width:270px; flex-shrink:0; }
            .me-menu-item { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:9px 11px; margin-bottom:8px; font-size:0.8rem; }
            .me-menu-item-nombre { font-weight:700; display:block; margin-bottom:3px; word-break:break-word; }
            .me-menu-item-fecha { color:#999; font-size:0.68rem; display:block; margin-bottom:7px; }
            .me-menu-item-btns { display:flex; gap:5px; flex-wrap:wrap; }
            .me-menu-item-btns button { font-size:0.68rem; padding:3px 7px; border-radius:5px; border:1px solid #ddd; background:#f8f9fa; cursor:pointer; }
            .me-menu-item-btns button:hover { background:#eee; }
            .me-modal-plato-row { display:flex; align-items:center; gap:10px; padding:7px 6px; border-bottom:1px solid #f2f2f2; font-size:0.85rem; cursor:pointer; }
            .me-modal-plato-row:hover { background:#f8f9fa; }
            .me-modal-plato-row input { width:16px; height:16px; cursor:pointer; flex-shrink:0; margin:0; }
            .me-modal-plato-row > span { flex:1; }
            .me-btn-borrar-mis-platos { flex-shrink:0; border:none; background:none; cursor:pointer; font-size:0.85rem; padding:2px 6px; border-radius:5px; opacity:0.6; }
            .me-btn-borrar-mis-platos:hover { opacity:1; background:#fee2e2; }
            .me-modal-grupo-titulo { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; color:#666; background:#f3f4f6; padding:6px 8px; margin:10px 0 2px; border-radius:5px; }
            .me-modal-grupo-titulo:first-child { margin-top:0; }
            .me-modal-grupo-contador { font-weight:500; color:#999; text-transform:none; letter-spacing:0; }
            @media (max-width: 900px) { .me-layout { flex-direction: column; } .me-sidebar { width:100%; } }
        `;
        document.head.appendChild(style);
    }

    // =================================================================================
    // CARGA DE PLATOS — combina RG + US Open, reutilizando cargarYCachearModo(modo) de app.js
    // (misma caché de siempre, así no se duplica ninguna descarga de CSV ya hecha por el
    // editor normal). Se ejecutan en paralelo porque son independientes entre sí. Separa
    // estrictamente "platos de comida" (para Entrantes/Primero/Principal/Postre) de "vinos y
    // cavas" (para la sección Bebida) -- nunca se mezclan en ningún sentido.
    // =================================================================================
    async function cargarIndiceDePlatos() {
        let datosRG = null, datosUS = null;
        try {
            // "Mis Platos" (platosManuales, ver más abajo) se pide en PARALELO con las 2 cartas --
            // es independiente de ellas y así no añade tiempo de carga extra.
            const resultados = await Promise.all([
                (typeof window.cargarYCachearModo === 'function') ? window.cargarYCachearModo('restaurante001') : Promise.resolve(null),
                (typeof window.cargarYCachearModo === 'function') ? window.cargarYCachearModo('restaurante002') : Promise.resolve(null),
                listarPlatosManuales()
            ]);
            datosRG = resultados[0];
            datosUS = resultados[1];
            platosManuales = resultados[2] || [];
        } catch (e) {
            console.error('[MenuEspecial] Error cargando las cartas de RG/US Open:', e);
        }

        platosParaPopup = [];
        indiceVinos = [];

        // Limpia el "//" (usado para las "opciones" del plato -- ver desglosarNombre/
        // reconstruirNombreConOpciones en utils.js) dejando solo el nombre principal. Se sigue
        // usando tal cual para VINOS, donde "//" indica la uva/denominación (detalle que no
        // interesa en el menú especial).
        function limpiarNombre(txt) { return (txt || '').split('//')[0].trim(); }

        // Para PLATOS (no vinos): a diferencia de limpiarNombre(), esta NO descarta lo que va
        // tras el "//" -- en muchos platos esa parte es la guarnición (p.ej. "Solomillo de
        // ternera //Patatas panaderas//"), y perderla al añadir el plato a un menú especial es
        // justo lo que se pidió corregir (19 sept). Usa desglosarNombre() (utils.js, ya usada en
        // el resto del proyecto) para no reinventar el parseo de "//", y añade la guarnición
        // entre paréntesis pegada al nombre; si el plato no tiene guarnición, el resultado es
        // idéntico a limpiarNombre().
        function nombreConGuarnicion(txt) {
            if (typeof desglosarNombre !== 'function') return limpiarNombre(txt);
            const d = desglosarNombre(txt);
            if (!d.nombre) return '';
            return d.opciones.length ? `${d.nombre} (${d.opciones.join(', ')})` : d.nombre;
        }

        // Dentro de cada tipo de vino, estructuras.js reserva el último tramo de IDs para
        // "Copas" (venta por copa, no por botella) -- ver ESTRUCTURA_RESTAURANTE001/002: Vinos
        // Blancos 13190-13199, Rosados 13250-13259, Tintos 13390-13399, Cavas 13450-13459. Un
        // "Menú Especial" es para elegir el VINO/CAVA que se sirve (la botella), nunca la
        // opción de venderlo por copa, así que esos tramos se descartan por completo del
        // selector de vinos -- ni siquiera se ofrecen como opción.
        function esCopaDeVino(id) {
            return (id >= 13190 && id <= 13199) ||
                (id >= 13250 && id <= 13259) ||
                (id >= 13390 && id <= 13399) ||
                (id >= 13450 && id <= 13459);
        }

        // Si el mismo plato/vino (mismo nombre normalizado y mismo "tipo") aparece en RG Y en US
        // Open -- muy habitual, muchos vinos y algunos platos son idénticos en las dos cartas --
        // se queda con UNA sola entrada marcada "ambos:true" (nunca se ofrece duplicado en el
        // popup). Si aparece en un solo restaurante (o 2 veces dentro del mismo, por error de
        // datos) se queda con una sola entrada sin más.
        function deduplicarComunes(lista) {
            const grupos = new Map();
            lista.forEach(item => {
                const clave = item.tipo + '|' + normalizarNombre(item.es);
                if (!grupos.has(clave)) grupos.set(clave, []);
                grupos.get(clave).push(item);
            });
            const resultado = [];
            grupos.forEach(items => {
                const base = items[0];
                if (items.length === 1) {
                    resultado.push(Object.assign({}, base, { ambos: false }));
                    return;
                }
                const modosDistintos = new Set(items.map(i => i.modo));
                const conEn = items.find(i => i.en) || base;
                resultado.push(Object.assign({}, base, {
                    en: conEn.en || base.en,
                    ambos: modosDistintos.size > 1
                }));
            });
            return resultado;
        }

        function procesar(datos, modo, alias) {
            if (!Array.isArray(datos)) return;
            datos.forEach(item => {
                // Las primeras filas de la hoja de datos (id < 1001, fila 14 en la hoja de
                // Google Sheets) no son platos reales -- se descartan aquí, igual en RG que en
                // US Open (a petición del usuario, 19 sept). No afecta a los vinos (13100+) ni a
                // Sugerencias (12100+), muy por encima de este umbral.
                if (item.id < 1001) return;

                // NOTA: a diferencia de las webs públicas, aquí NO se filtra por item.activa --
                // un "Menú Especial" es una plantilla propia para eventos, independiente de lo
                // que esté visible/activo ahora mismo en la web pública (un plato desactivado
                // temporalmente en la carta normal puede seguir siendo válido para una boda).
                // Antes se descartaban los platos inactivos aquí, lo que hacía que el popup
                // pareciera tener "menos platos de los que hay realmente" en la carta.

                // Vinos y cavas de verdad (blancos/rosados/tintos/Cavas & Champagne -- mismos
                // rangos en RG y en US Open, ver estructuras.js): van SOLO al selector de
                // Bebida, nunca al de comida. Se etiquetan con su "tipo" exacto para que el
                // popup de cada uno de los 4 vinos de Bebida ofrezca SOLO su propio tipo (un
                // Vino Blanco jamás debe poder añadir un tinto, ni un Cava un rosado, etc.).
                if (item.id >= 13100 && item.id <= 14499) {
                    if (esCopaDeVino(item.id)) return; // "Copas" (venta por copa): fuera del selector
                    const nombreVino = limpiarNombre(item.es);
                    // Salvaguarda extra por nombre, por si algún dato no tuviera el ID exacto de
                    // "Copas" bien puesto -- una botella real no debería empezar por "Copa".
                    if (nombreVino && /^copas?\b/i.test(nombreVino)) return;
                    if (nombreVino) {
                        let tipoVino;
                        if (item.id <= 13199) tipoVino = 'blanco';
                        else if (item.id <= 13299) tipoVino = 'rosado';
                        else if (item.id <= 13399) tipoVino = 'tinto';
                        else tipoVino = 'cava';
                        indiceVinos.push({ modo: modo, id: item.id, es: nombreVino, en: limpiarNombre(item.en), tipo: tipoVino });
                    }
                    return;
                }
                if (item.id >= 13000) return; // otro ID de vino fuera del rango reconocido: se descarta (ni plato ni vino)

                // Cafés / Refrescos-Bebidas / Cervezas: nunca son "platos" de Entrantes,
                // Primero, Principal o Postre.
                if (item.id >= 9000 && item.id <= 11999) return;
                const carpeta = (item.carpeta || '').toLowerCase().trim();
                if (CARPETAS_EXCLUIDAS_DE_PLATOS.indexOf(carpeta) !== -1) return;

                const nombreEs = nombreConGuarnicion(item.es);
                if (!nombreEs) return;
                // "tipo" separa Postre del resto (Entrantes/Primero/Principal comparten pool,
                // pero Postre nunca se mezcla con ellos en ningún sentido -- ver poolParaModal).
                const tipo = (carpeta === 'postres') ? 'postre' : 'principal';
                platosParaPopup.push({ modo: modo, alias: alias, id: item.id, es: nombreEs, en: nombreConGuarnicion(item.en), tipo: tipo, carpeta: carpeta });
            });
        }
        procesar(datosRG, 'restaurante001', 'RG');
        procesar(datosUS, 'restaurante002', 'US Open');
        platosParaPopup = deduplicarComunes(platosParaPopup);
        indiceVinos = deduplicarComunes(indiceVinos);

        // Funde "Mis Platos" (platosManuales) dentro del mismo pool que RG/US Open, con
        // modo:'manual' -- así se benefician gratis de todo lo que ya sabe manejar el popup
        // (categoría propia vía categoriaDePlato, filtro Postre/no-Postre por "tipo", búsqueda,
        // orden alfabético...) sin tener que duplicar esa lógica. NUNCA pasan por
        // deduplicarComunes() de arriba (es solo para el cruce RG/US Open) ni tienen "carpeta".
        platosParaPopup = platosParaPopup.concat(platosManuales.map(p => ({
            modo: 'manual', alias: 'Mis Platos', id: p.id, es: p.es, en: p.en || '',
            tipo: (p.tipo === 'postre') ? 'postre' : 'principal', carpeta: ''
        })));

        platosParaPopup.sort((a, b) => a.es.localeCompare(b.es, 'es'));
        indiceVinos.sort((a, b) => a.es.localeCompare(b.es, 'es'));
    }

    // Vuelve a pedir SOLO "Mis Platos" al servidor (GET, ligero) y refresca su parte dentro de
    // platosParaPopup -- se usa tras guardar/borrar un plato de la biblioteca, para que el popup
    // ya abierto (o el próximo que se abra) refleje el cambio sin tener que recargar las 2
    // cartas completas de RG/US Open otra vez.
    async function refrescarPlatosManualesEnPool() {
        platosManuales = await listarPlatosManuales();
        platosParaPopup = platosParaPopup.filter(p => p.modo !== 'manual').concat(platosManuales.map(p => ({
            modo: 'manual', alias: 'Mis Platos', id: p.id, es: p.es, en: p.en || '',
            tipo: (p.tipo === 'postre') ? 'postre' : 'principal', carpeta: ''
        })));
        platosParaPopup.sort((a, b) => a.es.localeCompare(b.es, 'es'));
    }

    // =================================================================================
    // BACKEND — Codigo_MenusEspeciales.gs (proyecto nuevo, ver config.js). Las lecturas (GET
    // listarMenus) son fetch normales (sí se puede leer la respuesta). Los guardados/borrados
    // (POST) usan "no-cors, fire-and-forget" — el MISMO patrón que ya usa el resto del proyecto
    // para escribir en Apps Script (ver toggleCategoriaPestana en app.js) — porque un POST con
    // Content-Type JSON dispara un preflight CORS que Apps Script no responde bien; con
    // "no-cors" el navegador SÍ espera a que el servidor termine, solo que no puede leer la
    // respuesta. Por eso, tras guardar, se vuelve a pedir la lista completa (esa sí legible)
    // para saber el id real que ha asignado el servidor a un menú recién creado.
    // =================================================================================
    function urlBackend() {
        return (typeof window.WEBAPP_URL_MENUS_ESPECIALES !== 'undefined') ? window.WEBAPP_URL_MENUS_ESPECIALES : '';
    }

    // 24 sept: la lista ya NO se traga los errores en silencio. Antes, si el backend no respondía
    // JSON (URL /exec mal copiada, implementación sin acceso "Cualquier usuario", etc.) se
    // devolvía [] y la pantalla decía "Todavía no hay ningún menú guardado" -- justo el síntoma
    // de "dice que guarda pero no los carga". Ahora el motivo real se guarda en
    // ultimoErrorLista y se muestra arriba de la lista de menús (ver renderSidebarLista).
    let ultimoErrorLista = '';

    // Una sola lectura de la lista (sin reintentos). Lanza Error con el motivo si falla.
    async function leerListaUnaVez(url) {
        // 25 sept: límite de tiempo (ver fetchConTimeout en utils.js) -- sin él, cada intento
        // podía quedarse colgado 15-35s (visto en un HAR real del usuario) antes de fallar,
        // haciendo que los 3 reintentos de listarMenus() sumaran hasta minuto y medio.
        const fetcher = (typeof window.fetchConTimeout === 'function') ? window.fetchConTimeout : fetch;
        const resp = await fetcher(url + '?accion=listarMenus&zx=' + Date.now(), { cache: 'no-store' }, 15000);
        let data;
        try { data = await resp.json(); }
        catch (e) { throw new Error('La URL no devolvió datos JSON (revisa que la implementación tenga acceso "Cualquier usuario" y que la URL /exec sea la vigente).'); }
        if (!data || !data.ok || !Array.isArray(data.menus)) {
            throw new Error((data && data.error) || 'Respuesta inesperada del servidor de menús.');
        }
        return data.menus;
    }

    // 24 sept: hasta 3 intentos (pausas de 0,8 s y 1,5 s), cada uno con su propio límite de
    // tiempo (fetchConTimeout, ver utils.js) para no quedarse colgado si Apps Script tarda.
    //
    // 25 sept -- DEDUPLICACIÓN (mismo patrón que cargarYCachearModo en app.js): varios sitios
    // llaman a listarMenus() por su cuenta (la precarga al arrancar, init() al abrir la
    // pestaña, "🔄 Refrescar lista", guardar/borrar un menú...) -- sin esto, pulsar "Refrescar
    // lista" mientras la precarga inicial TODAVÍA está en marcha lanzaba una SEGUNDA petición en
    // paralelo a la MISMA implementación de Apps Script, y ambas competían por la misma cola de
    // ejecuciones del proyecto, alargando el tiempo de las dos en vez de ir cada una a su ritmo.
    // Ahora, si ya hay una lectura en curso, cualquier llamada nueva se engancha a ESA MISMA
    // petición en lugar de lanzar otra.
    let listarMenusEnCurso = null;

    async function listarMenus() {
        if (listarMenusEnCurso) return listarMenusEnCurso;
        const promesa = listarMenusSinDeduplicar();
        listarMenusEnCurso = promesa;
        try {
            return await promesa;
        } finally {
            listarMenusEnCurso = null;
        }
    }

    async function listarMenusSinDeduplicar() {
        const url = urlBackend();
        if (!url) {
            ultimoErrorLista = 'Falta configurar WEBAPP_URL_MENUS_ESPECIALES en config.js.';
            console.warn('[MenuEspecial] ' + ultimoErrorLista);
            return [];
        }
        const PAUSAS_MS = [800, 1500];
        let ultimoError = null;
        for (let intento = 0; intento <= PAUSAS_MS.length; intento++) {
            try {
                const menus = await leerListaUnaVez(url);
                ultimoErrorLista = '';
                return menus;
            } catch (e) {
                ultimoError = e;
                console.warn('[MenuEspecial] Intento ' + (intento + 1) + ' de listar menús falló:', e);
                if (intento < PAUSAS_MS.length) await new Promise(r => setTimeout(r, PAUSAS_MS[intento]));
            }
        }
        console.error('[MenuEspecial] Error al listar menús guardados:', ultimoError);
        ultimoErrorLista = (ultimoError && ultimoError.message) ? ultimoError.message : 'No se pudo conectar con el servidor de menús.';
        // 25 sept: null (no []) para distinguir "no se pudo leer nada" de "se leyó bien y no hay
        // menús guardados" -- así los que llaman a esto (refrescarLista, init, precarga...)
        // pueden saber que esto fue un FALLO y no una lista vacía de verdad, y no reemplazan
        // la última lista buena que tuvieran en pantalla por una vacía.
        return null;
    }

    // POST con Content-Type "text/plain": es una petición "simple" para CORS (sin preflight, que
    // Apps Script no sabe responder) y, a diferencia de "no-cors", SÍ permite leer la respuesta
    // JSON del backend ({ok, id, error}). El .gs no mira el Content-Type, lee e.postData.contents
    // tal cual, así que no hace falta tocar ni redesplegar el Apps Script.
    async function postBackend(url, payload) {
        // 25 sept: límite de tiempo más largo que las lecturas (35s) -- guardarMenu/
        // eliminarMenu en el .gs usan LockService.waitLock(30000), así que una espera legítima
        // (otra escritura en curso) puede llegar casi a 30s; esto solo corta un cuelgue real.
        const fetcher = (typeof window.fetchConTimeout === 'function') ? window.fetchConTimeout : fetch;
        const resp = await fetcher(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        }, 35000);
        let data;
        try { data = await resp.json(); }
        catch (e) { throw new Error('El servidor no devolvió una respuesta válida (¿la implementación tiene acceso "Cualquier usuario"?).'); }
        if (!data || !data.ok) throw new Error((data && data.error) || 'El servidor rechazó la petición.');
        return data;
    }

    async function guardarMenuEnServidor(menu) {
        const url = urlBackend();
        if (!url) throw new Error('Falta configurar WEBAPP_URL_MENUS_ESPECIALES en config.js');

        const nombreLimpio = (menu.nombre || '').trim();
        if (!nombreLimpio) throw new Error('No se puede guardar un menú sin nombre.');

        const inicio = Date.now();
        let idDevuelto = menu.id || '';
        try {
            const data = await postBackend(url, { id: menu.id || '', nombre: nombreLimpio, config: menu });
            if (data.id) idDevuelto = data.id;
        } catch (e) {
            // Solo si el fallo es de RED/CORS (TypeError de fetch) se comprueba si el servidor lo
            // llegó a guardar igualmente (releyendo la lista) en vez de reenviar el POST, para no
            // duplicar un menú nuevo. Cualquier otro error (el servidor respondió ok:false, etc.)
            // se propaga tal cual con su mensaje real.
            if (!(e instanceof TypeError)) throw e;
            // Bypasa la deduplicación a propósito: necesitamos una lectura NUEVA de verdad para
            // comprobar si el servidor guardó pese al error de red, no una que ya estuviera en
            // marcha desde antes de este POST (podría no incluir todavía el menú recién enviado).
            const lista = await listarMenusSinDeduplicar(); // null si esta lectura también falla
            const enviado = (lista || []).find(m => (menu.id && String(m.id) === String(menu.id)) ||
                (!menu.id && nombreVisible(m) === nombreLimpio && new Date(m.fechaModificacion).getTime() >= inicio - 5000));
            if (!enviado) throw new Error('No se pudo contactar con el servidor de menús y el menú no aparece guardado.');
            idDevuelto = enviado.id;
        }

        // Relee la lista y VERIFICA que el menú está realmente ahí: así nunca se anuncia "guardado"
        // si el servidor no lo escribió (o si lee de una hoja distinta a la que escribe). Igual
        // que arriba, sin deduplicar -- tiene que ser una lectura posterior al POST, no una que
        // ya estuviera en marcha antes de guardar.
        // 25 sept: si esta relectura falla (null), NO se pisa menusGuardados con nada -- se deja
        // la lista anterior tal cual (renderSidebarLista se encarga de mostrarla + el aviso rojo,
        // ver init/refrescarLista) y se informa de que no se pudo VERIFICAR el guardado, sin decir
        // que falló el guardado en sí (el POST ya respondió ok:true en este punto).
        const listaFresca = await listarMenusSinDeduplicar();
        if (listaFresca !== null) menusGuardados = listaFresca;
        const guardado = (listaFresca || []).find(m => String(m.id) === String(idDevuelto));
        if (!guardado) {
            const motivo = (listaFresca === null)
                ? (ultimoErrorLista || 'no se pudo releer la lista para comprobarlo')
                : 'no aparece al releer la lista';
            throw new Error('El servidor respondió que guardó el menú, pero no se ha podido confirmar (' + motivo + '). Pulsa "🔄 Refrescar lista" en unos segundos para comprobarlo.');
        }
        menu.id = guardado.id;
        return menu.id;
    }

    async function eliminarMenuEnServidor(id) {
        const url = urlBackend();
        if (!url) throw new Error('Falta configurar WEBAPP_URL_MENUS_ESPECIALES en config.js');
        await postBackend(url + '?accion=eliminarMenu', { id: id });
        // Sin deduplicar, por el mismo motivo que en guardarMenuEnServidor: tiene que reflejar
        // el borrado que se acaba de hacer, no un listarMenus() que ya estuviera en marcha antes.
        const listaFresca = await listarMenusSinDeduplicar();
        if (listaFresca !== null) {
            menusGuardados = listaFresca;
        } else {
            // 25 sept: si esta relectura falla, el borrado en el servidor YA se hizo (el POST de
            // arriba respondió ok:true) -- se quita el menú de la lista local a mano para que no
            // se quede viéndose como si siguiera ahí, en vez de pisar menusGuardados con [].
            menusGuardados = menusGuardados.filter(m => String(m.id) !== String(id));
        }
    }

    // NUEVO (19 sept): "Mis Platos" -- biblioteca de platos añadidos a mano, MISMO backend
    // (Codigo_MenusEspeciales.gs), hoja/acciones nuevas e independientes de las de menús. Mismo
    // patrón de lectura normal (GET) / escritura no-cors fire-and-forget (POST) que el resto.
    async function listarPlatosManuales() {
        const url = urlBackend();
        if (!url) return [];
        try {
            const fetcher = (typeof window.fetchConTimeout === 'function') ? window.fetchConTimeout : fetch;
            const resp = await fetcher(url + '?accion=listarPlatosManuales&zx=' + Date.now(), { cache: 'no-store' }, 15000);
            const data = await resp.json();
            return (data && data.ok && Array.isArray(data.platos)) ? data.platos : [];
        } catch (e) {
            console.error('[MenuEspecial] Error al listar Mis Platos:', e);
            return [];
        }
    }

    // Guarda (o actualiza, si ya existe un plato con el mismo nombre en español) un plato en la
    // biblioteca "Mis Platos". No lanza ni bloquea nada si falla -- ver comentario en
    // agregarPlatoManual() sobre por qué esto nunca debe impedir añadir el plato al menú actual.
    async function guardarPlatoManualEnBiblioteca(es, en, tipo) {
        const url = urlBackend();
        if (!url || !es) return;
        try {
            await fetch(url + '?accion=guardarPlatoManual', {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ es: es, en: en || '', tipo: tipo })
            });
            await refrescarPlatosManualesEnPool();
        } catch (e) {
            console.error('[MenuEspecial] Error al guardar en Mis Platos:', e);
        }
    }

    // Quita un plato de la biblioteca "Mis Platos" (nunca de ningún menú ya guardado, ni de la
    // carta real de RG/US Open -- solo de esta lista propia). Se usa desde el 🗑️ del popup.
    async function eliminarPlatoManualDeBiblioteca(id) {
        const url = urlBackend();
        if (!url) return;
        try {
            await fetch(url + '?accion=eliminarPlatoManual', {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id })
            });
            await refrescarPlatosManualesEnPool();
            renderModalLista();
        } catch (e) {
            console.error('[MenuEspecial] Error al borrar de Mis Platos:', e);
        }
    }

    // Diagnóstico: muestra tal cual qué responde el backend (estado HTTP y primeros caracteres),
    // para distinguir "URL equivocada / sin acceso público" (responde HTML de Google) de "el
    // .gs responde bien pero la hoja está vacía / mal cabeceada".
    async function diagnosticarConexion() {
        const url = urlBackend();
        if (!url) { alert('Falta WEBAPP_URL_MENUS_ESPECIALES en config.js'); return; }
        let msg = 'URL: ' + url + '\n\n';
        try {
            const resp = await fetch(url + '?accion=listarMenus&zx=' + Date.now(), { cache: 'no-store' });
            const txt = await resp.text();
            msg += 'GET -> HTTP ' + resp.status + '\n' + txt.slice(0, 300).replace(/\s+/g, ' ');
            try { const d = JSON.parse(txt); msg += '\n\nJSON válido. Menús devueltos: ' + (d.menus ? d.menus.length : 'ninguno') + (d.error ? '\nError: ' + d.error : ''); }
            catch (e) { msg += '\n\n⚠️ La respuesta NO es JSON: la URL no es la del script de Menús Especiales o la implementación no tiene acceso "Cualquier usuario".'; }
        } catch (e) {
            msg += 'GET falló: ' + e.message + '\n(bloqueo de red/CORS: implementación sin acceso público o URL incorrecta)';
        }
        alert(msg);
    }

    function buscarMenuPorId(id) { return menusGuardados.find(m => String(m.id) === String(id)); }

    // El "Nombre" de la fila en Google Sheets puede corromperse si Sheets detecta que el texto
    // "parece una fecha" y lo autoconvierte a un valor Date real -- al leerlo de vuelta, Apps
    // Script devuelve un objeto Date, que se serializa como ISO ("2026-09-19T22:00:00.000Z") en
    // vez del texto original. El nombre dentro de config (Config_JSON) SÍ es fiable, porque va
    // embebido como texto dentro de un JSON más grande, nunca como el valor "crudo" de una
    // celda -- así que aquí siempre se prefiere ese, y solo se cae al nombre de la fila si config
    // no lo tiene.
    function nombreVisible(m) {
        if (m && m.config && typeof m.config.nombre === 'string' && m.config.nombre.trim()) return m.config.nombre;
        return (m && m.nombre) || '';
    }

    // Reconstruye un menú editable a partir de lo guardado, rellenando con los valores por
    // defecto de nuevoMenuVacio() cualquier campo que faltara (por si se guardó con una versión
    // anterior de la plantilla y luego se ha añadido algún campo nuevo, p.ej. "aElegir").
    function mergeMenuDesdeGuardado(m) {
        const base = nuevoMenuVacio();
        const cfg = m.config || {};
        const menu = Object.assign({}, base, cfg, { id: m.id, nombre: nombreVisible(m) });
        menu.idiomas = Object.assign({}, base.idiomas, cfg.idiomas);
        menu.secciones = {};
        Object.keys(base.secciones).forEach(k => {
            menu.secciones[k] = Object.assign({}, base.secciones[k], (cfg.secciones && cfg.secciones[k]) || {});
            if (!Array.isArray(menu.secciones[k].platos)) menu.secciones[k].platos = [];
        });
        menu.bebida = Object.assign({}, base.bebida, cfg.bebida);
        WINES_INFO.forEach(w => {
            const guardado = (cfg.bebida && cfg.bebida[w.key]) || {};
            const slot = Object.assign({}, base.bebida[w.key], guardado);
            if (!Array.isArray(slot.platos)) slot.platos = [];
            // Compatibilidad con menús guardados con el modelo antiguo (solo 2 vinos, cada uno
            // con un campo de texto libre "texto" en vez de una lista de platos): si tenía
            // "texto" pero no lista, migra ese texto a una entrada manual para no perder el dato.
            if (guardado.texto && !slot.platos.length) {
                slot.platos = [{ manual: true, modo: null, id: null, es: guardado.texto, en: '' }];
            }
            menu.bebida[w.key] = slot;
        });
        return menu;
    }

    // =================================================================================
    // RENDER — esqueleto fijo (se construye una sola vez) + dos zonas que se repintan por
    // separado (sidebar de menús guardados / formulario de edición), para no reconstruir toda
    // la pestaña en cada tecla y perder el foco de los campos de texto que sí se escriben del
    // tirón (nombre del menú, texto de los vinos, búsqueda del popup): esos campos NO disparan
    // un repintado completo, solo actualizan el estado o una zona pequeña — se relee entero al
    // guardar/imprimir.
    // =================================================================================
    function construirEsqueleto() {
        const cont = document.getElementById('menu-especial-contenido');
        if (!cont) return;
        if (document.getElementById('me-form-area')) return; // ya construido — no lo tocamos
        cont.innerHTML = `
            <div class="me-layout">
                <div class="me-sidebar">
                    <div class="me-card">
                        <label class="label-seccion">📋 Menús guardados</label>
                        <button class="btn btn-primary" style="width:100%;margin-bottom:8px;" onclick="MenuEspecial.nuevoMenu()">+ Nuevo menú</button>
                        <button class="btn btn-secondary" style="width:100%;margin-bottom:10px;" onclick="MenuEspecial.refrescarLista()">🔄 Refrescar lista</button>
                        <button class="btn btn-secondary" style="width:100%;margin-bottom:10px;" onclick="MenuEspecial.diagnosticarConexion()">🔌 Probar conexión</button>
                        <div id="me-sidebar-lista"></div>
                    </div>
                </div>
                <div id="me-form-area" style="flex:1;min-width:0;"></div>
            </div>

            <div id="me-modal-platos" class="modal">
                <div class="modal-content" style="max-width:920px; max-height:88vh; display:flex; flex-direction:column;">
                    <h2 id="me-modal-titulo" style="margin-top:0;margin-bottom:4px;">🍽️ Elegir platos</h2>
                    <p id="me-modal-subtitulo" style="margin:0 0 14px 0; font-size:0.82rem; color:#777;"></p>
                    <div class="me-fila" style="margin-bottom:12px;">
                        <input type="text" id="me-modal-buscar" class="input-estandar" style="flex:2;min-width:200px;margin-bottom:0;" placeholder="Buscar por nombre..." oninput="MenuEspecial.filtrarModalLista()">
                        <select id="me-modal-filtro-restaurante" class="input-estandar" style="flex:0 0 170px;margin-bottom:0;" onchange="MenuEspecial.filtrarModalLista()">
                            <option value="">RG y US Open</option>
                            <option value="restaurante001">Solo RG</option>
                            <option value="restaurante002">Solo US Open</option>
                        </select>
                    </div>
                    <div id="me-modal-lista" style="flex:1;overflow-y:auto;border:1px solid #eee;border-radius:8px;padding:6px 10px;min-height:200px;"></div>
                    <div class="me-fila" style="margin-top:14px;justify-content:flex-end;">
                        <button class="btn btn-secondary" onclick="MenuEspecial.cerrarModalPlatos()">Cancelar</button>
                        <button class="btn btn-success" onclick="MenuEspecial.confirmarSeleccionPlatos()">+ <span id="me-modal-btn-confirmar-texto">Añadir seleccionados</span> (<span id="me-modal-contador">0</span>)</button>
                    </div>
                </div>
            </div>
        `;
    }

    function renderSidebarLista() {
        const cont = document.getElementById('me-sidebar-lista');
        if (!cont) return;
        const avisoError = ultimoErrorLista
            ? `<p style="font-size:0.78rem;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:6px 8px;margin:0 0 8px 0;">⚠️ No se han podido cargar los menús: ${escHtml(ultimoErrorLista)}</p>`
            : '';
        if (!menusGuardados.length) {
            cont.innerHTML = avisoError + (ultimoErrorLista ? '' : `<p style="font-size:0.78rem;color:#999;margin:0;">Todavía no hay ningún menú guardado.</p>`);
            return;
        }
        cont.innerHTML = avisoError + menusGuardados.map(m => {
            const activo = menuActual && String(menuActual.id) === String(m.id);
            return `<div class="me-menu-item" style="${activo ? 'border-color:var(--primario);box-shadow:0 0 0 1px var(--primario);' : ''}">
                <span class="me-menu-item-nombre">${escHtml(nombreVisible(m))}</span>
                <span class="me-menu-item-fecha">Modificado: ${escHtml(formatearFecha(m.fechaModificacion))}</span>
                <div class="me-menu-item-btns">
                    <button onclick="MenuEspecial.cargarMenu('${m.id}')">✏️ Editar</button>
                    <button onclick="MenuEspecial.duplicarMenu('${m.id}')">📄 Duplicar</button>
                    <button onclick="MenuEspecial.imprimirMenuGuardado('${m.id}')">🖨️ Imprimir</button>
                    <button onclick="MenuEspecial.eliminarMenu('${m.id}')" style="color:#e74c3c;">🗑️ Borrar</button>
                </div>
            </div>`;
        }).join('');
    }

    function renderFormulario() {
        const cont = document.getElementById('me-form-area');
        if (!cont || !menuActual) return;

        let html = `<div class="me-card">
            <div class="me-fila" style="justify-content:space-between;">
                <div style="flex:1;min-width:260px;">
                    <label class="label-seccion">Nombre del menú <span style="font-weight:500;text-transform:none;color:#999;">(aparecerá impreso como título del menú)</span></label>
                    <input type="text" id="me-nombre" class="input-estandar" style="margin-bottom:0;" placeholder="Ej: Boda García — 20 septiembre" value="${escHtml(menuActual.nombre)}" oninput="MenuEspecial.actualizarNombre(this.value)">
                </div>
                <label class="me-check-label"><input type="checkbox" ${menuActual.logo ? 'checked' : ''} onchange="MenuEspecial.toggleLogo(this.checked)"> 🎾 Logos cabecera (Rafa Nadal + RG)</label>
                <label class="me-check-label"><input type="checkbox" ${menuActual.mostrarNombre ? 'checked' : ''} onchange="MenuEspecial.toggleMostrarNombre(this.checked)"> 📝 Imprimir nombre</label>
                <label class="me-check-label"><input type="checkbox" ${menuActual.idiomas.es ? 'checked' : ''} onchange="MenuEspecial.toggleIdioma('es', this.checked)"> 🇪🇸 Español</label>
                <label class="me-check-label"><input type="checkbox" ${menuActual.idiomas.en ? 'checked' : ''} onchange="MenuEspecial.toggleIdioma('en', this.checked)"> 🇬🇧 Inglés</label>
            </div>
            <div class="me-fila" style="margin-top:14px;">
                <button class="btn btn-success" onclick="MenuEspecial.guardarMenuActual()">💾 Guardar menú</button>
                <button class="btn btn-primary" onclick="MenuEspecial.imprimirMenuActual()">🖨️ Imprimir (A4 horizontal, 1 hoja, 2 menús)</button>
            </div>
        </div>`;

        SECCIONES_INFO.forEach(info => { html += renderSeccionHtml(info); });
        html += renderBebidaHtml();

        cont.innerHTML = html;
    }

    function renderSeccionHtml(info) {
        const sec = menuActual.secciones[info.key];
        const conEn = menuActual.idiomas.en;
        return `<div class="me-card">
            <div class="me-fila">
                <label class="me-check-label"><input type="checkbox" ${sec.activo ? 'checked' : ''} onchange="MenuEspecial.toggleSeccion('${info.key}', this.checked)"> ${info.titulo}</label>
                ${info.conCompartir ? `<label class="me-check-label me-sub-check"><input type="checkbox" ${sec.compartir ? 'checked' : ''} onchange="MenuEspecial.toggleCompartir(this.checked)"> A compartir (si no, se imprime "Entrantes" individual)</label>` : ''}
                ${info.conAElegir ? `<label class="me-check-label me-sub-check"><input type="checkbox" ${sec.aElegir ? 'checked' : ''} onchange="MenuEspecial.toggleAElegir('${info.key}', this.checked)"> A elegir (el comensal elige una opción de la lista)</label>` : ''}
            </div>
            ${sec.activo ? `
            <div style="margin-top:12px;">
                <div class="me-fila" style="margin-bottom:10px;">
                    <button class="btn btn-secondary" onclick="MenuEspecial.abrirModalPlatos('comida', '${info.key}')">🔍 Elegir platos de la carta (RG / US Open)...</button>
                </div>
                <div class="me-fila" style="margin-bottom:10px;">
                    <input type="text" id="me-input-manual-comida-${info.key}" class="input-estandar" style="flex:2;min-width:200px;margin-bottom:0;" placeholder="¿No está en la carta? Escríbelo aquí...">
                    ${conEn ? `<input type="text" id="me-input-manual-comida-${info.key}-en" class="input-estandar" style="flex:1;min-width:160px;margin-bottom:0;" placeholder="Nombre en inglés">` : ''}
                    ${conEn ? `<button class="btn btn-secondary" id="me-btn-traducir-comida-${info.key}" onclick="MenuEspecial.traducirAIngles('me-input-manual-comida-${info.key}', 'me-input-manual-comida-${info.key}-en', 'me-btn-traducir-comida-${info.key}', false)" title="Traducir el nombre en español al inglés con IA">🌐 Traducir</button>` : ''}
                    <button class="btn btn-secondary" id="me-btn-manual-add-comida-${info.key}" onclick="MenuEspecial.agregarPlatoManual('comida', '${info.key}')">+ Añadir manual</button>
                </div>
                <div id="me-lista-${info.key}">${renderListaPlatosHtml('comida', info.key)}</div>
            </div>` : ''}
        </div>`;
    }

    // Devuelve el array real (dentro de menuActual) donde viven los platos/vinos de un
    // "grupo|key" concreto -- centraliza el único sitio donde hay que saber que 'comida' vive en
    // menuActual.secciones[key].platos y 'vino' en menuActual.bebida[key].platos.
    function obtenerListaDestino(grupo, key) {
        return (grupo === 'vino') ? menuActual.bebida[key].platos : menuActual.secciones[key].platos;
    }

    // Id del <div> donde se pinta la lista de platos/vinos añadidos de un "grupo|key" concreto.
    function idListaPara(grupo, key) {
        return (grupo === 'vino') ? `me-lista-vino-${key}` : `me-lista-${key}`;
    }

    function renderListaPlatosHtml(grupo, key) {
        const platos = obtenerListaDestino(grupo, key);
        if (!platos.length) return `<p style="font-size:0.8rem;color:#999;margin:0;">Ningún ${grupo === 'vino' ? 'vino' : 'plato'} añadido todavía.</p>`;
        const conEn = menuActual.idiomas.en;
        return platos.map((p, i) => {
            // Fila en edición: en vez del nombre + tag, se muestran los inputs ES/EN precargados
            // con el valor actual (ver iniciarEdicionPlato/guardarEdicionPlato/cancelarEdicionPlato).
            if (grupo === editGrupo && key === editKey && i === editIndex) {
                const prefijo = `me-edit-${grupo}-${key}-${i}`;
                return `<div class="me-plato-row me-plato-row-editando">
                    <div class="me-plato-edit-campos">
                        <input type="text" id="${prefijo}-es" class="input-estandar" value="${escHtml(p.es)}" placeholder="Nombre en español">
                        ${conEn ? `<input type="text" id="${prefijo}-en" class="input-estandar" value="${escHtml(p.en || '')}" placeholder="Nombre en inglés">` : ''}
                        ${conEn ? `<button class="btn btn-secondary" id="${prefijo}-btn-traducir" style="font-size:0.78rem;padding:6px 10px;flex-shrink:0;" onclick="MenuEspecial.traducirAIngles('${prefijo}-es', '${prefijo}-en', '${prefijo}-btn-traducir', ${grupo === 'vino'})" title="Traducir el nombre en español al inglés con IA">🌐</button>` : ''}
                    </div>
                    <div class="me-plato-edit-btns">
                        <button class="btn btn-success" id="${prefijo}-btn-guardar" style="font-size:0.72rem;padding:5px 9px;" onclick="MenuEspecial.guardarEdicionPlato('${grupo}', '${key}', ${i})">✓ Guardar</button>
                        <button class="btn btn-secondary" style="font-size:0.72rem;padding:5px 9px;" onclick="MenuEspecial.cancelarEdicionPlato()">✕ Cancelar</button>
                    </div>
                </div>`;
            }
            const tag = p.manual
                ? `<span class="me-plato-tag me-tag-manual">Manual</span>`
                : p.modo === 'manual'
                    ? `<span class="me-plato-tag me-tag-mis-platos">Mis Platos</span>`
                    : p.ambos
                        ? `<span class="me-plato-tag me-tag-ambos">RG + US Open</span>`
                        : (p.modo === 'restaurante002' ? `<span class="me-plato-tag me-tag-us">US Open</span>` : `<span class="me-plato-tag me-tag-rg">RG</span>`);
            const nombre = (conEn && p.en) ? `${escHtml(p.es)} <span style="color:#999;">/ ${escHtml(p.en)}</span>` : escHtml(p.es);
            return `<div class="me-plato-row">
                <span class="me-plato-nombre">${tag}${nombre}</span>
                <div class="me-plato-row-btns">
                    <button class="me-btn-editar" onclick="MenuEspecial.iniciarEdicionPlato('${grupo}', '${key}', ${i})" title="Editar">✏️</button>
                    <button class="me-btn-quitar" onclick="MenuEspecial.quitarPlato('${grupo}', '${key}', ${i})" title="Quitar">✕</button>
                </div>
            </div>`;
        }).join('');
    }

    function renderVinoSlotHtml(w) {
        const slot = menuActual.bebida[w.key];
        const conEn = menuActual.idiomas.en;
        // Solo se permite UN vino/cava por slot (ver confirmarSeleccionPlatos/agregarPlatoManual,
        // que sustituyen en vez de acumular): si ya hay uno elegido, el botón/campo pasa a decir
        // "cambiar" en vez de "añadir", para dejar claro que sustituye al que ya está.
        const yaHayUno = slot.platos.length > 0;
        return `<div style="flex:1;min-width:230px;">
            <label class="me-check-label" style="margin-bottom:6px;"><input type="checkbox" ${slot.activo ? 'checked' : ''} onchange="MenuEspecial.toggleVino('${w.key}', this.checked)"> ${w.emoji} ${escHtml(w.tituloEs)}</label>
            ${slot.activo ? `
            <div class="me-fila" style="margin-bottom:8px;">
                <button class="btn btn-secondary" style="font-size:0.78rem;padding:6px 10px;" onclick="MenuEspecial.abrirModalPlatos('vino', '${w.key}')">${yaHayUno ? '🔄 Cambiar por otro de la carta...' : '🔍 Elegir de la carta...'}</button>
            </div>
            <div class="me-fila" style="margin-bottom:4px;">
                <input type="text" id="me-input-manual-vino-${w.key}" class="input-estandar" style="flex:1;min-width:140px;margin-bottom:0;font-size:0.8rem;" placeholder="¿No está en la carta? Escríbelo...">
                ${conEn ? `<input type="text" id="me-input-manual-vino-${w.key}-en" class="input-estandar" style="flex:1;min-width:120px;margin-bottom:0;font-size:0.8rem;" placeholder="En inglés">` : ''}
                ${conEn ? `<button class="btn btn-secondary" id="me-btn-traducir-vino-${w.key}" style="font-size:0.78rem;padding:6px 10px;" onclick="MenuEspecial.traducirAIngles('me-input-manual-vino-${w.key}', 'me-input-manual-vino-${w.key}-en', 'me-btn-traducir-vino-${w.key}', true)" title="Traducir el nombre en español al inglés con IA">🌐</button>` : ''}
                <button class="btn btn-secondary" style="font-size:0.78rem;padding:6px 10px;" onclick="MenuEspecial.agregarPlatoManual('vino', '${w.key}')">${yaHayUno ? '🔄 Cambiar' : '+ Añadir'}</button>
            </div>
            <div style="font-size:0.68rem;color:#999;margin-bottom:8px;">Solo se puede elegir un ${w.tituloEs.toLowerCase()} -- elegir uno nuevo sustituye al anterior.</div>
            <div id="me-lista-vino-${w.key}">${renderListaPlatosHtml('vino', w.key)}</div>
            ` : ''}
        </div>`;
    }

    function renderBebidaHtml() {
        const b = menuActual.bebida;
        return `<div class="me-card">
            <label class="label-seccion">🥤 Bebida</label>
            <div class="me-fila" style="margin-bottom:14px;">
                <label class="me-check-label me-sub-check"><input type="checkbox" ${b.agua ? 'checked' : ''} onchange="MenuEspecial.toggleBebida('agua', this.checked)"> Agua</label>
                <label class="me-check-label me-sub-check"><input type="checkbox" ${b.cerveza ? 'checked' : ''} onchange="MenuEspecial.toggleBebida('cerveza', this.checked)"> Cerveza</label>
                <label class="me-check-label me-sub-check"><input type="checkbox" ${b.refresco ? 'checked' : ''} onchange="MenuEspecial.toggleBebida('refresco', this.checked)"> Refresco</label>
                <label class="me-check-label me-sub-check"><input type="checkbox" ${b.cafe ? 'checked' : ''} onchange="MenuEspecial.toggleBebida('cafe', this.checked)"> Café o infusiones</label>
            </div>
            <div class="me-fila" style="align-items:flex-start;flex-wrap:wrap;gap:18px;">
                ${WINES_INFO.map(renderVinoSlotHtml).join('')}
            </div>
        </div>`;
    }

    // =================================================================================
    // POPUP DE SELECCIÓN — grande, con buscador + filtro de restaurante, un check por fila
    // (multi-selección) y "+ Añadir seleccionados" para meterlos todos de golpe. Un ÚNICO popup
    // genérico sirve tanto para elegir platos (grupo 'comida', para Entrantes/Primero/
    // Principal/Postre) como para elegir vinos (grupo 'vino', para cada uno de los 4 vinos de
    // Bebida) -- lo único que cambia es de qué "pool" saca las opciones (poolParaModal) y en qué
    // lista de menuActual las mete al confirmar (obtenerListaDestino). El pool está SIEMPRE
    // acotado de forma estricta:
    //  - grupo 'comida': solo Postre ve platos tipo:'postre'; el resto de secciones ve todo lo
    //    demás (tipo:'principal') -- nunca se mezclan platos de Postre con los de otra sección.
    //  - grupo 'vino': cada uno de los 4 vinos ve SOLO su propio tipo (blanco/rosado/tinto/cava),
    //    nunca los de otro vino.
    // =================================================================================
    function abrirModalPlatos(grupo, key) {
        modalGrupoActual = grupo;
        modalSeccionActual = key;
        Object.keys(seleccionEnModal).forEach(k => delete seleccionEnModal[k]);
        const buscar = document.getElementById('me-modal-buscar');
        const filtro = document.getElementById('me-modal-filtro-restaurante');
        if (buscar) buscar.value = '';
        if (filtro) filtro.value = '';

        let titulo = '';
        let tituloModal = '🍽️ Elegir platos';
        if (grupo === 'vino') {
            const w = WINES_INFO.find(x => x.key === key);
            titulo = w ? w.tituloEs : '';
            tituloModal = '🍷 Elegir vino';
        } else {
            const s = SECCIONES_INFO.find(x => x.key === key);
            titulo = s ? s.titulo : '';
        }
        const tituloEl = document.getElementById('me-modal-titulo');
        if (tituloEl) tituloEl.textContent = tituloModal;
        const sub = document.getElementById('me-modal-subtitulo');
        if (sub) {
            // Vinos/cavas: selección única (un solo check a la vez, ver toggleSeleccionModal) --
            // se avisa aquí mismo, junto al título, para que quede claro antes de elegir.
            sub.textContent = titulo
                ? `Añadiendo a: ${titulo}${grupo === 'vino' ? ' (solo se puede elegir uno)' : ''}`
                : '';
        }
        const textoBtn = document.getElementById('me-modal-btn-confirmar-texto');
        if (textoBtn) textoBtn.textContent = (grupo === 'vino') ? 'Añadir vino elegido' : 'Añadir seleccionados';

        renderModalLista();
        const modal = document.getElementById('me-modal-platos');
        if (modal) modal.style.display = 'flex';
    }

    function cerrarModalPlatos() {
        const modal = document.getElementById('me-modal-platos');
        if (modal) modal.style.display = 'none';
        modalGrupoActual = null;
        modalSeccionActual = null;
    }

    function filtrarModalLista() { renderModalLista(); }

    // El conjunto de opciones que puede ofrecer el popup abierto ahora mismo, ya estrictamente
    // acotado según grupo/tipo (ver comentario de arriba).
    function poolParaModal() {
        if (modalGrupoActual === 'vino') {
            const w = WINES_INFO.find(x => x.key === modalSeccionActual);
            const tipo = w ? w.tipo : null;
            return indiceVinos.filter(v => v.tipo === tipo);
        }
        const esPostre = modalSeccionActual === 'postre';
        return platosParaPopup.filter(p => esPostre ? p.tipo === 'postre' : p.tipo !== 'postre');
    }

    function renderModalLista() {
        const cont = document.getElementById('me-modal-lista');
        if (!cont || !modalSeccionActual || !modalGrupoActual) return;
        const buscarEl = document.getElementById('me-modal-buscar');
        const filtroEl = document.getElementById('me-modal-filtro-restaurante');
        const textoBusqueda = (buscarEl && buscarEl.value || '').trim().toLowerCase();
        const filtroModo = filtroEl ? filtroEl.value : '';

        const yaAnadidos = new Set(
            obtenerListaDestino(modalGrupoActual, modalSeccionActual).filter(p => !p.manual).map(p => claveModoId(p.modo, p.id))
        );

        const items = poolParaModal().filter(p => {
            if (yaAnadidos.has(claveModoId(p.modo, p.id))) return false;
            // Un plato/vino común a los 2 restaurantes (p.ambos) pasa el filtro de restaurante
            // pase lo que pase -- de verdad está disponible en RG Y en US Open, así que "Solo
            // RG" o "Solo US Open" no deberían ocultarlo.
            if (filtroModo && p.modo !== filtroModo && !p.ambos) return false;
            if (textoBusqueda && p.es.toLowerCase().indexOf(textoBusqueda) === -1) return false;
            return true;
        });

        if (!items.length) {
            cont.innerHTML = `<p style="font-size:0.82rem;color:#999;text-align:center;padding:24px 0;">No hay ${modalGrupoActual === 'vino' ? 'vinos' : 'platos'} que coincidan (o ya están todos añadidos).</p>`;
            actualizarContadorModal();
            return;
        }

        // Agrupado por categoría SOLO para el popup de comida en Entrantes/Primero/Principal --
        // Postre y los 4 popups de vino siguen como lista plana (ver comentario de
        // CATEGORIAS_POPUP_COMIDA): en Postre el pool ya es un único bloque homogéneo, y en vino
        // cada popup ya está acotado a un solo tipo (blanco/rosado/tinto/cava).
        const agrupar = (modalGrupoActual === 'comida' && modalSeccionActual !== 'postre');
        cont.innerHTML = agrupar ? renderModalListaAgrupada(items) : renderModalListaFilas(items);
        actualizarContadorModal();
    }

    function renderModalListaFilas(items) {
        return items.map(renderModalFilaHtml).join('');
    }

    function renderModalFilaHtml(p) {
        const clave = claveModoId(p.modo, p.id);
        const marcado = !!seleccionEnModal[clave];
        const esMisPlatos = p.modo === 'manual';
        const tag = esMisPlatos
            ? `<span class="me-plato-tag me-tag-mis-platos">Mis Platos</span>`
            : p.ambos
                ? `<span class="me-plato-tag me-tag-ambos">RG + US Open</span>`
                : (p.modo === 'restaurante002' ? `<span class="me-plato-tag me-tag-us">US Open</span>` : `<span class="me-plato-tag me-tag-rg">RG</span>`);
        const btnBorrar = esMisPlatos
            ? `<button type="button" class="me-btn-borrar-mis-platos" title="Quitar de Mis Platos" onclick="event.preventDefault(); event.stopPropagation(); MenuEspecial.eliminarPlatoManualDeBiblioteca(${JSON.stringify(p.id)});">🗑️</button>`
            : '';
        return `<label class="me-modal-plato-row">
            <input type="checkbox" ${marcado ? 'checked' : ''} onchange="MenuEspecial.toggleSeleccionModal('${clave}', this.checked)">
            <span>${tag}${escHtml(p.es)}</span>
            ${btnBorrar}
        </label>`;
    }

    // Agrupa los platos ya filtrados por su categoría (ver categoriaDeCarpeta) y pinta un
    // encabezado por grupo -- el orden de los encabezados es SIEMPRE el de CATEGORIAS_POPUP_COMIDA
    // (no alfabético ni el de aparición), con "Otros" al final; un grupo sin platos que coincidan
    // no se pinta.
    function renderModalListaAgrupada(items) {
        const grupos = new Map();
        items.forEach(p => {
            const label = categoriaDePlato(p);
            if (!grupos.has(label)) grupos.set(label, []);
            grupos.get(label).push(p);
        });
        // "Mis Platos" va SIEMPRE primero (biblioteca propia, la más rápida de reutilizar),
        // luego las categorías de carta de siempre, y "Otros" al final -- igual que antes.
        const ordenLabels = [CATEGORIA_MIS_PLATOS_LABEL].concat(CATEGORIAS_POPUP_COMIDA.map(c => c.label), [CATEGORIA_OTROS_LABEL]);
        let html = '';
        ordenLabels.forEach(label => {
            const lista = grupos.get(label);
            if (!lista || !lista.length) return;
            html += `<div class="me-modal-grupo-titulo">${escHtml(label)} <span class="me-modal-grupo-contador">(${lista.length})</span></div>`;
            html += renderModalListaFilas(lista);
        });
        return html;
    }

    function toggleSeleccionModal(clave, marcado) {
        if (modalGrupoActual === 'vino') {
            // Vinos/cavas: selección ÚNICA -- marcar uno desmarca cualquier otro que hubiera
            // marcado (a diferencia de los platos, que sí son multi-selección). Se repinta la
            // lista entera para reflejar visualmente el desmarcado del resto de checks.
            Object.keys(seleccionEnModal).forEach(k => delete seleccionEnModal[k]);
            if (marcado) seleccionEnModal[clave] = true;
            renderModalLista();
            return;
        }
        if (marcado) seleccionEnModal[clave] = true; else delete seleccionEnModal[clave];
        actualizarContadorModal();
    }

    function actualizarContadorModal() {
        const el = document.getElementById('me-modal-contador');
        if (el) el.textContent = Object.keys(seleccionEnModal).length;
    }

    function confirmarSeleccionPlatos() {
        if (!modalSeccionActual || !modalGrupoActual) return;
        const claves = Object.keys(seleccionEnModal);
        const grupo = modalGrupoActual;
        const key = modalSeccionActual;
        if (claves.length) {
            const poolOrigen = (grupo === 'vino') ? indiceVinos : platosParaPopup;
            const destino = obtenerListaDestino(grupo, key);
            // Vinos/cavas: como solo se permite UNO por slot, la nueva selección sustituye a
            // cualquier vino que hubiera antes en ese slot (venga del popup o fuera manual) --
            // solo se vacía aquí, dentro de "hay selección nueva", para no borrar el vino ya
            // puesto si el usuario abre el popup y cierra sin marcar nada.
            if (grupo === 'vino') destino.length = 0;
            claves.forEach(clave => {
                const idxSep = clave.indexOf('|');
                const modo = clave.substring(0, idxSep);
                const id = parseInt(clave.substring(idxSep + 1), 10);
                const p = poolOrigen.find(x => x.modo === modo && x.id === id);
                if (p) destino.push({ manual: false, modo: p.modo, id: p.id, es: formatearTituloInteligente(p.es), en: formatearTituloInteligente(p.en), ambos: !!p.ambos });
            });
        }
        cerrarModalPlatos();
        const listaEl = document.getElementById(idListaPara(grupo, key));
        if (listaEl) listaEl.innerHTML = renderListaPlatosHtml(grupo, key);
    }

    // =================================================================================
    // ACCIONES — expuestas en window.MenuEspecial, llamadas desde los onclick/onchange/oninput
    // generados arriba.
    // =================================================================================
    function actualizarNombre(v) { menuActual.nombre = v; }
    function toggleLogo(v) { menuActual.logo = v; }
    function toggleMostrarNombre(v) { menuActual.mostrarNombre = v; }

    function toggleIdioma(lang, v) {
        const otro = (lang === 'es') ? 'en' : 'es';
        if (!v && !menuActual.idiomas[otro]) {
            alert('Debe quedar activado al menos un idioma (Español o Inglés).');
            renderFormulario(); // revierte el checkbox visualmente, el estado no ha cambiado
            return;
        }
        menuActual.idiomas[lang] = v;
        renderFormulario();
    }

    function toggleSeccion(key, v) { menuActual.secciones[key].activo = v; renderFormulario(); }
    function toggleCompartir(v) { menuActual.secciones.entrantes.compartir = v; renderFormulario(); }
    function toggleAElegir(key, v) { menuActual.secciones[key].aElegir = v; }
    function toggleBebida(key, v) { menuActual.bebida[key] = v; }
    function toggleVino(key, v) { menuActual.bebida[key].activo = v; renderFormulario(); }

    // Revisa la ortografía del nombre en español de un plato manual (nunca de vinos -- son
    // nombres propios/marca) ANTES de añadirlo/guardarlo, con window.PROMPTS.revisionOrtografica()
    // -- versión ligera de opcionesEN() (mismo criterio conservador, entiende nombres "como
    // suenan") que NO pide traducciones, para no gastar esa llamada más cara cuando no hace falta.
    // Mismo patrón de reintento por API Key que traducirAIngles(). Si no hay ninguna clave
    // configurada, o la llamada falla por lo que sea (cuota, red...), NO bloquea nada -- se
    // devuelve "sin corrección" y el plato se añade igual, tal como se comportaba la app antes de
    // tener este aviso.
    async function revisarOrtografiaManual(textoEs) {
        const sinCorreccion = { hayError: false, texto: textoEs };
        let keys = [];
        if (typeof getKeys === 'function') keys = getKeys();
        if (!keys.length) return sinCorreccion;
        if (typeof window.PROMPTS === 'undefined' || typeof window.PROMPTS.revisionOrtografica !== 'function') return sinCorreccion;

        const endpoint = window.GEMINI_ENDPOINT_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';
        const instruccion = window.PROMPTS.revisionOrtografica(textoEs.replace(/"/g, "'"));

        for (let i = 0; i < keys.length; i++) {
            try {
                const response = await fetch(`${endpoint}?key=${keys[i]}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: instruccion }] }], generationConfig: { maxOutputTokens: window.GEMINI_MAX_OUTPUT_TOKENS || 65536, thinkingConfig: { thinkingLevel: window.GEMINI_THINKING_LEVEL || 'medium' } } })
                });
                const data = await response.json();
                if (!response.ok || data.error) continue; // prueba con la siguiente clave (p.ej. sin cuota)

                const txt = (typeof extraerTextoCompletoRespuesta === 'function')
                    ? extraerTextoCompletoRespuesta(data.candidates && data.candidates[0])
                    : (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text);
                if (!txt) continue;

                const obj = (typeof extraerJSON === 'function') ? extraerJSON(txt) : JSON.parse(txt);
                const textoCorregido = typeof obj.texto === 'string' ? obj.texto.trim() : '';
                const hayError = obj.hayError === true && !!textoCorregido && textoCorregido.toLowerCase() !== textoEs.trim().toLowerCase();
                return hayError ? { hayError: true, texto: textoCorregido } : sinCorreccion;
            } catch (e) {
                // sigue probando con la siguiente clave
            }
        }
        return sinCorreccion; // ninguna clave funcionó: no se bloquea el añadido por esto
    }

    async function agregarPlatoManual(grupo, key) {
        const prefijo = `me-input-manual-${grupo}-${key}`;
        const inputEs = document.getElementById(prefijo);
        const inputEn = document.getElementById(prefijo + '-en');
        if (!inputEs) return;
        let valor = (inputEs.value || '').trim();
        if (!valor) return;

        // Aviso "¿Quisiste decir...?" (nunca en vinos, nombres propios/marca) -- reutiliza el
        // MISMO modal que ya usa el editor de carta normal (mostrarCorreccionOrtografiaEN, en
        // app.js, compartido en toda la web vía index.html), en vez de duplicarlo aquí.
        if (grupo !== 'vino') {
            const btnAdd = document.getElementById(`me-btn-manual-add-${grupo}-${key}`);
            const textoOriginalBtn = btnAdd ? btnAdd.textContent : '';
            if (btnAdd) { btnAdd.textContent = '⏳ Revisando...'; btnAdd.disabled = true; }
            try {
                const resultado = await revisarOrtografiaManual(valor);
                if (resultado.hayError && typeof mostrarCorreccionOrtografiaEN === 'function') {
                    const corregido = await mostrarCorreccionOrtografiaEN(resultado.texto);
                    if (corregido) valor = corregido;
                }
            } finally {
                if (btnAdd) { btnAdd.textContent = textoOriginalBtn; btnAdd.disabled = false; }
            }
            // Si mientras se revisaba el formulario se repintó entero (cambio de idioma/sección),
            // este input ya no existe -- se aborta en vez de arriesgar un añadido a ciegas.
            if (!document.getElementById(prefijo)) return;
        }

        const esFinal = formatearTituloInteligente(valor);
        const enFinal = inputEn ? formatearTituloInteligente((inputEn.value || '').trim()) : '';

        const destino = obtenerListaDestino(grupo, key);
        if (grupo === 'vino') destino.length = 0; // un solo vino/cava por slot, sustituye al que hubiera
        destino.push({ manual: true, modo: null, id: null, es: esFinal, en: enFinal });
        inputEs.value = '';
        if (inputEn) inputEn.value = '';
        const listaEl = document.getElementById(idListaPara(grupo, key));
        if (listaEl) listaEl.innerHTML = renderListaPlatosHtml(grupo, key);

        // NUEVO (19 sept): guarda este plato en la biblioteca "Mis Platos" para poder reutilizarlo
        // en menús futuros sin volver a escribirlo ni traducirlo -- automático, sin ningún paso
        // extra (a petición del usuario), nunca para vinos (nombres propios/marca). Deliberadamente
        // SIN "await": no debe retrasar ni un instante que el plato aparezca ya añadido al menú, y
        // si falla (sin red, backend caído...) no debe impedir añadirlo -- guardarPlatoManualEnBiblioteca()
        // ya se traga sus propios errores.
        if (grupo !== 'vino') {
            guardarPlatoManualEnBiblioteca(esFinal, enFinal, key === 'postre' ? 'postre' : 'principal');
        }
    }

    function quitarPlato(grupo, key, index) {
        obtenerListaDestino(grupo, key).splice(index, 1);
        // Si se quita un plato de la misma lista que se estaba editando, los índices se desajustan
        // -- se cancela cualquier edición en curso de esa lista para no dejar el editor apuntando
        // al plato equivocado.
        if (grupo === editGrupo && key === editKey) { editGrupo = null; editKey = null; editIndex = null; }
        const listaEl = document.getElementById(idListaPara(grupo, key));
        if (listaEl) listaEl.innerHTML = renderListaPlatosHtml(grupo, key);
    }

    // Abre la edición in situ de un plato/vino ya añadido (venga de la carta o manual) --
    // renderListaPlatosHtml pinta inputs ES/EN en su lugar mientras editGrupo/editKey/editIndex
    // apunten a esa fila concreta.
    function iniciarEdicionPlato(grupo, key, index) {
        editGrupo = grupo; editKey = key; editIndex = index;
        const listaEl = document.getElementById(idListaPara(grupo, key));
        if (listaEl) listaEl.innerHTML = renderListaPlatosHtml(grupo, key);
    }

    function cancelarEdicionPlato() {
        const grupo = editGrupo, key = editKey;
        editGrupo = null; editKey = null; editIndex = null;
        if (!grupo || !key) return;
        const listaEl = document.getElementById(idListaPara(grupo, key));
        if (listaEl) listaEl.innerHTML = renderListaPlatosHtml(grupo, key);
    }

    // Guarda el texto corregido de un plato/vino en edición -- reformatea a Title Case
    // inteligente igual que al añadir (misma regla para ES y EN), así el resultado es consistente
    // tanto si se retoca un plato traído de la carta como si se corrige uno escrito a mano.
    async function guardarEdicionPlato(grupo, key, index) {
        const prefijo = `me-edit-${grupo}-${key}-${index}`;
        const inputEs = document.getElementById(prefijo + '-es');
        const inputEn = document.getElementById(prefijo + '-en');
        if (!inputEs) return;
        let valorEs = (inputEs.value || '').trim();
        if (!valorEs) { alert('El nombre en español no puede quedar vacío.'); return; }

        // Mismo aviso "¿Quisiste decir...?" que agregarPlatoManual() -- así corregir a mano el
        // nombre de un plato ya añadido (venga de la carta o manual) también avisa si se cuela una
        // falta, no solo al añadirlo la primera vez. Nunca en vinos (nombres propios/marca).
        if (grupo !== 'vino') {
            const btnGuardar = document.getElementById(`${prefijo}-btn-guardar`);
            const textoOriginalBtn = btnGuardar ? btnGuardar.textContent : '';
            if (btnGuardar) { btnGuardar.textContent = '⏳...'; btnGuardar.disabled = true; }
            try {
                const resultado = await revisarOrtografiaManual(valorEs);
                if (resultado.hayError && typeof mostrarCorreccionOrtografiaEN === 'function') {
                    const corregido = await mostrarCorreccionOrtografiaEN(resultado.texto);
                    if (corregido) valorEs = corregido;
                }
            } finally {
                if (btnGuardar) { btnGuardar.textContent = textoOriginalBtn; btnGuardar.disabled = false; }
            }
            // Si mientras se revisaba se canceló la edición, se quitó el plato o se abrió otra
            // fila a editar, se aborta sin guardar en vez de escribir en el sitio equivocado.
            if (!(editGrupo === grupo && editKey === key && editIndex === index)) return;
        }

        const plato = obtenerListaDestino(grupo, key)[index];
        if (!plato) return;
        plato.es = formatearTituloInteligente(valorEs);
        if (inputEn) plato.en = formatearTituloInteligente((inputEn.value || '').trim());
        editGrupo = null; editKey = null; editIndex = null;
        const listaEl = document.getElementById(idListaPara(grupo, key));
        if (listaEl) listaEl.innerHTML = renderListaPlatosHtml(grupo, key);
    }

    // Prompt de respaldo, SOLO por si window.PROMPTS (prompts.js) no estuviera cargado por algún
    // motivo -- en condiciones normales nunca se usa (ver traducirAIngles), porque prompts.js se
    // carga antes que menu-especial.js en index.html.
    function construirPromptTraduccionSimple(textoEs) {
        return `Actúa como traductor profesional de menús de restaurantes de alta gama. Traduce al inglés el siguiente nombre de plato o bebida, tal como aparecería en la carta impresa de un restaurante (nombre corto y natural, sin explicaciones ni alternativas ni comillas): "${textoEs.replace(/"/g, "'")}"\n\nResponde ÚNICAMENTE con un JSON de una sola clave, sin explicaciones ni markdown: {"en":"la traducción aquí"}`;
    }

    // Traduce al inglés con Gemini el texto de idInputEs y lo mete en idInputEn -- reutiliza las
    // mismas API Keys/endpoint/reintentos que ya usa el resto del proyecto (getKeys(), config.js,
    // utils.js), así que si hay Keys configuradas en el editor normal, funcionan aquí igual sin
    // configuración aparte. Se usa tanto al añadir un plato/vino manual como dentro del editor
    // in situ (✏️) de un plato ya añadido.
    // CORREGIDO (19 sept): la primera versión usaba un prompt propio simplificado que pedía una
    // única traducción "seca" -- por eso "Ensaladilla Rusa" salía como "Russian Salad" sin más.
    // Ahora reutiliza EXACTAMENTE window.PROMPTS.opcionesEN(), el mismo prompt que ya usa
    // generarTraduccionEN() en app.js, que sí incluye REGLA_EXPLICACION_TERMINOS_NO_UNIVERSALES
    // (añade una breve descripción en inglés cuando el término no es ya universalmente conocido)
    // y REGLA_FIDELIDAD_CARNES -- solo que aquí, al ser un botón rápido de un solo resultado (no
    // el modal de 3 opciones), se queda con "directa" (la que aplica esa regla de explicación) en
    // vez de abrir un selector; el usuario sigue pudiendo retocar el resultado a mano después.
    async function traducirAIngles(idInputEs, idInputEn, idBoton, esVino) {
        const inputEs = document.getElementById(idInputEs);
        const inputEn = document.getElementById(idInputEn);
        if (!inputEs || !inputEn) return;
        const textoEs = (inputEs.value || '').trim();
        if (!textoEs) { alert('Escribe primero el nombre en español.'); return; }

        let keys = [];
        if (typeof getKeys === 'function') keys = getKeys();
        if (!keys.length) { alert('❌ No hay API Keys de Gemini configuradas (icono ⚙️ de ajustes).'); return; }

        const btn = idBoton ? document.getElementById(idBoton) : null;
        const textoOriginalBtn = btn ? btn.innerHTML : '';
        if (btn) { btn.innerHTML = '⏳'; btn.disabled = true; }
        mostrarCargando(true, '🌐 Traduciendo al inglés...');

        const endpoint = window.GEMINI_ENDPOINT_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';
        const instruccion = (typeof window.PROMPTS !== 'undefined' && typeof window.PROMPTS.opcionesEN === 'function')
            ? window.PROMPTS.opcionesEN(textoEs.replace(/"/g, "'"), !!esVino)
            : construirPromptTraduccionSimple(textoEs);

        let exito = false, intentos = 0, ultimoError = '', traduccion = '', correccionDetectada = null;
        while (!exito && intentos < keys.length) {
            try {
                const apiKey = keys[intentos];
                const response = await fetch(`${endpoint}?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: instruccion }] }], generationConfig: { maxOutputTokens: window.GEMINI_MAX_OUTPUT_TOKENS || 65536, thinkingConfig: { thinkingLevel: window.GEMINI_THINKING_LEVEL || 'medium' } } })
                });
                const data = await response.json();
                if (!response.ok || data.error) {
                    ultimoError = (data.error && data.error.message) || ('Error HTTP ' + response.status);
                    if ((data.error && data.error.code === 429) || response.status === 429) await new Promise(r => setTimeout(r, 3000));
                    intentos++;
                    continue;
                }
                const txt = (typeof extraerTextoCompletoRespuesta === 'function')
                    ? extraerTextoCompletoRespuesta(data.candidates && data.candidates[0])
                    : (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text);
                if (txt) {
                    const obj = (typeof extraerJSON === 'function') ? extraerJSON(txt) : JSON.parse(txt);
                    // "directa" es la opción que lleva la explicación breve para términos no
                    // universales (ver REGLA_EXPLICACION_TERMINOS_NO_UNIVERSALES en prompts.js);
                    // "gastronomica"/"corta"/"en" son de respaldo si por lo que sea faltara.
                    const resultado = obj && (obj.directa || obj.gastronomica || obj.corta || obj.en);
                    if (resultado) {
                        traduccion = resultado;
                        exito = true;
                        // CORREGIDO (19 sept, 2ª ronda): window.PROMPTS.opcionesEN() YA revisa la
                        // ortografía del español en la misma llamada (ver "correccion" en
                        // prompts.js) -- entiende igual el plato aunque haya una falta y lo
                        // traduce bien (por eso "gaspaxo" se traducía correctamente sin más), pero
                        // antes este resultado se descartaba sin más y el aviso solo llegaba en el
                        // último paso (al pulsar "Añadir plato"/"Guardar", vía
                        // revisarOrtografiaManual()). Ahora también se recoge aquí, para avisar ya
                        // en el propio paso de traducir, no solo al final.
                        if (!esVino && obj.correccion && obj.correccion.hayError && obj.correccion.texto) {
                            correccionDetectada = obj.correccion;
                        }
                    } else { throw new Error('El JSON no contiene ninguna traducción esperada.'); }
                }
            } catch (err) {
                ultimoError = err.message;
                intentos++;
            }
        }

        mostrarCargando(false);
        if (btn) { btn.innerHTML = textoOriginalBtn; btn.disabled = false; }

        if (exito) {
            if (correccionDetectada && typeof mostrarCorreccionOrtografiaEN === 'function') {
                const corregido = await mostrarCorreccionOrtografiaEN(correccionDetectada.texto);
                if (corregido) inputEs.value = corregido;
            }
            inputEn.value = formatearTituloInteligente(traduccion);
        } else {
            alert('❌ Error al traducir al inglés.\nDetalles: ' + ultimoError);
        }
    }

    function nuevoMenu() {
        if (menuActual && (menuActual.nombre || algunaSeccionConPlatos(menuActual)) &&
            !confirm('¿Empezar un menú nuevo? Se perderá cualquier cambio sin guardar del que estás editando ahora.')) return;
        menuActual = nuevoMenuVacio();
        renderFormulario();
        renderSidebarLista();
    }

    async function refrescarLista() {
        mostrarCargando(true, '🔄 Actualizando lista de menús...');
        try {
            // 25 sept: si falla, NO se pisa menusGuardados -- se deja la última lista buena tal
            // cual (el aviso rojo de arriba ya avisa de que el refresco falló); antes se
            // sobrescribía siempre, así que un refresco fallido dejaba la pantalla en blanco
            // aunque un momento antes se hubiera visto la lista completa.
            const resultado = await listarMenus();
            if (resultado !== null) menusGuardados = resultado;
        } finally {
            mostrarCargando(false);
        }
        renderSidebarLista();
    }

    function cargarMenu(id) {
        const m = buscarMenuPorId(id);
        if (!m) { alert('No se ha encontrado ese menú (puede que la lista esté desactualizada — pulsa "🔄 Refrescar lista").'); return; }
        menuActual = mergeMenuDesdeGuardado(m);
        renderFormulario();
        renderSidebarLista();
    }

    function duplicarMenu(id) {
        const m = buscarMenuPorId(id);
        if (!m) return;
        menuActual = mergeMenuDesdeGuardado(m);
        menuActual.id = null;
        menuActual.nombre = nombreVisible(m) + ' (copia)';
        renderFormulario();
        renderSidebarLista();
    }

    async function guardarMenuActual() {
        if (!menuActual.nombre || !menuActual.nombre.trim()) {
            alert('Ponle un nombre al menú antes de guardarlo (por ejemplo, el evento o la fecha).');
            return;
        }
        mostrarCargando(true, '💾 Guardando menú...');
        try {
            await guardarMenuEnServidor(menuActual);
            renderSidebarLista();
            alert('✅ Menú guardado correctamente.');
        } catch (e) {
            console.error('[MenuEspecial] Error al guardar el menú:', e);
            alert('❌ No se ha podido guardar el menú: ' + ((e && e.message) || 'error desconocido') + '\n\nRevisa la conexión e inténtalo de nuevo.');
        } finally {
            mostrarCargando(false);
        }
    }

    async function eliminarMenu(id) {
        const m = buscarMenuPorId(id);
        const nombre = nombreVisible(m);
        if (!confirm(`¿Seguro que quieres borrar el menú "${nombre}"? Esta acción no se puede deshacer.`)) return;
        mostrarCargando(true, '🗑️ Borrando menú...');
        try {
            await eliminarMenuEnServidor(id);
            if (menuActual && String(menuActual.id) === String(id)) { menuActual = nuevoMenuVacio(); renderFormulario(); }
            renderSidebarLista();
        } catch (e) {
            console.error('[MenuEspecial] Error al borrar el menú:', e);
            alert('❌ No se ha podido borrar el menú: ' + ((e && e.message) || 'error desconocido'));
        } finally {
            mostrarCargando(false);
        }
    }

    function algunaSeccionConPlatos(menu) {
        return SECCIONES_INFO.some(info => menu.secciones[info.key].activo && menu.secciones[info.key].platos.length > 0);
    }

    // =================================================================================
    // IMPRESIÓN — A4 horizontal, SIEMPRE en una sola hoja (no negociable): 2 copias del mismo
    // menú por hoja con una línea de corte discontinua en el centro (guillotina), reduciendo la
    // letra automáticamente (con márgenes/paddings apretados desde el principio) si el
    // contenido no cabe a tamaño normal — mismo tipo de ajuste automático que ya usa
    // "Sugerencias" (ajustarAUnaPagina en sugerencias-print.js), simplificado aquí a un único
    // factor de escala en em (texto + espaciados + logo escalan juntos) porque el contenido de
    // un menú especial es mucho más corto que una carta completa. Se usa el MISMO patrón de
    // ventana emergente (window.open + document.write) que ya usa sugerencias-print.js, en vez
    // de @media print sobre la propia interfaz del editor.
    // =================================================================================
    function construirHtmlMenuImpreso(menu) {
        const mostrarEs = menu.idiomas.es;
        const mostrarEn = menu.idiomas.en;

        // Cada "línea" (nombre en ES, y si aplica su traducción EN) va en su propio <div
        // class="me-print-plato-linea"> -- es el gancho que usa balancearLineasDobles() en el
        // script de la ventana de impresión (más abajo) para reequilibrar manualmente el corte
        // de una línea que se parte en 2, dejando SIEMPRE la primera línea igual o más larga que
        // la segunda. IMPORTANTE (19 sept, 2º arreglo): el CSS de estas clases NO debe llevar
        // text-wrap:balance -- balancearLineasDobles() ya decide el corte a mano insertando un
        // <br>; si el navegador además intenta "balancear" ese <br> con su propio algoritmo, el
        // resultado en la impresión real puede salir mal (nombres partidos a mitad de palabra).
        function nombrePlato(p) {
            const es = escHtml(p.es);
            const en = escHtml(p.en);
            if (mostrarEs && mostrarEn) {
                const esLinea = `<div class="me-print-plato-linea">${es}</div>`;
                return en ? `${esLinea}<div class="me-print-plato-linea me-print-plato-en">${en}</div>` : esLinea;
            }
            if (mostrarEn && !mostrarEs) return `<div class="me-print-plato-linea">${en || es}</div>`;
            return `<div class="me-print-plato-linea">${es}</div>`;
        }

        // Etiqueta de una categoría/título en el idioma o idiomas activos: "Vino Blanco / White
        // Wine" si ES+EN están los dos activos, solo uno de los dos si solo hay uno activo --
        // MISMO criterio en todos los títulos de sección y de vino (nunca el nombre del propio
        // plato/vino, que es libre y no se traduce, ver más abajo).
        function etiquetaBilingue(tituloEs, tituloEn) {
            if (mostrarEs && mostrarEn) return `${escHtml(tituloEs)} / ${escHtml(tituloEn)}`;
            if (mostrarEn && !mostrarEs) return escHtml(tituloEn);
            return escHtml(tituloEs);
        }

        function seccionHtml(info) {
            const sec = menu.secciones[info.key];
            if (!sec.activo || !sec.platos.length) return '';
            let sufijoEs = '', sufijoEn = '';
            if (info.key === 'entrantes' && sec.compartir) {
                sufijoEs = ' - A Compartir'; sufijoEn = ' - To Share';
            } else if (info.conAElegir && sec.aElegir) {
                sufijoEs = ' - A Elegir'; sufijoEn = ' - To Choose';
            }
            const titulo = etiquetaBilingue(info.titulo + sufijoEs, info.tituloEn + sufijoEn);
            const items = sec.platos.map(p => `<div class="me-print-plato">${nombrePlato(p)}</div>`).join('');
            return `<div class="me-print-seccion"><div class="me-print-seccion-titulo">${titulo}</div>${items}</div>`;
        }

        const bebidaItems = [];
        // Agua/Cerveza/Refresco en una única línea (más compacto); Café e infusiones aparte,
        // como pidió el usuario.
        // Cada palabra suelta también bilingüe (misma etiquetaBilingue que el resto), pero
        // manteniendo la misma estructura de 2 líneas de siempre: Agua/Cerveza/Refresco juntos
        // en una línea, Café e infusiones en la suya propia.
        const basicos = [];
        if (menu.bebida.agua) basicos.push(etiquetaBilingue('Agua', 'Water'));
        if (menu.bebida.cerveza) basicos.push(etiquetaBilingue('Cerveza', 'Beer'));
        if (menu.bebida.refresco) basicos.push(etiquetaBilingue('Refresco', 'Soft drink'));
        if (basicos.length) bebidaItems.push(basicos.join(' · '));
        if (menu.bebida.cafe) bebidaItems.push(etiquetaBilingue('Café o infusiones', 'Coffee or tea'));
        // Los NOMBRES de los vinos van solo en castellano (son nombres propios/marca, no hace
        // falta repetirlos en inglés) -- solo la ETIQUETA de la categoría ("Vino Blanco / White
        // Wine:") es bilingüe si ES+EN están los dos activos.
        WINES_INFO.forEach(w => {
            const slot = menu.bebida[w.key];
            if (slot.activo && slot.platos && slot.platos.length) {
                const etiqueta = etiquetaBilingue(w.tituloEs, w.tituloEn);
                const nombres = slot.platos.map(p => escHtml(p.es)).join(', ');
                bebidaItems.push(`${etiqueta}: ${nombres}`);
            }
        });
        const bebidaHtml = bebidaItems.length
            ? `<div class="me-print-seccion"><div class="me-print-seccion-titulo">${etiquetaBilingue('Bebida', 'Drinks')}</div>${bebidaItems.map(t => `<div class="me-print-plato"><div class="me-print-plato-linea">${t}</div></div>`).join('')}</div>`
            : '';

        // 24 sept: cabecera a imitación del menú real de la Rafa Nadal Academy -- a la IZQUIERDA el
        // bull (imagen) con el texto "RAFA NADAL / ACADEMY" debajo, a la DERECHA el logo Roland
        // Garros Restaurant. El checkbox "logo" activa/desactiva la cabecera entera.
        const logoHtml = menu.logo ? `<div class="me-print-cabecera">
                <div class="me-print-cab-izq"><img src="logo_bull_RN.png" class="me-print-bull" alt="Rafa Nadal"><div class="me-print-rn-texto">RAFA NADAL</div><div class="me-print-rn-sub">ACADEMY</div></div>
                <div class="me-print-cab-der"><img src="logo_RG_REST_recorte.png" class="me-print-logo" alt="Roland Garros Restaurant"></div>
            </div>` : '';
        // El nombre del menú (imprimir es opcional, checkbox "📝 Imprimir nombre") va arriba del
        // todo dentro del marco, centrado, en naranja y grande.
        const tituloHtml = menu.mostrarNombre ? `<div class="me-print-titulo">${escHtml(menu.nombre || 'Menú')}</div>` : '';

        return `<div class="me-print-menu"><div class="me-print-inner">
            ${logoHtml}
            <div class="me-print-marco"><div class="me-print-marco-fondo"></div><div class="me-print-marco-borde"></div><div class="me-print-marco-int">
                ${tituloHtml}
                ${SECCIONES_INFO.map(seccionHtml).join('')}
                ${bebidaHtml}
            </div></div>
        </div></div>`;
    }

    function imprimir(menu) {
        if (!menu) return;
        if (!menu.nombre && !algunaSeccionConPlatos(menu)) {
            if (!confirm('El menú está vacío y sin nombre. ¿Imprimir igualmente?')) return;
        }
        const menuHtml = construirHtmlMenuImpreso(menu);
        // ALTO_DISPONIBLE_MM = 210mm (A4 horizontal) - 2×6mm de margen VERTICAL de @page = 198mm
        // (el margen HORIZONTAL se ha apretado más, a 3mm, para ganar sitio y que los títulos
        // bilingües largos como "Principal (Segundo) - A Elegir / Main Course - To Choose" quepan
        // en una sola línea -- no afecta a este cálculo, que solo mide el alto disponible). Ver
        // ALTO_DISPONIBLE_MM más abajo en scriptAjuste, debe coincidir con este margen vertical
        // si se vuelve a tocar.
        const estilos = `
            * { box-sizing: border-box; }
            html, body { margin:0; }
            body { font-family: 'Montserrat', Georgia, serif; -webkit-print-color-adjust: exact; }
            @page { size: A4 landscape; margin: 6mm 3mm; }
            .me-print-sheet { display:flex; width:291mm; max-width:100%; height:198mm; margin:0 auto; }
            .me-print-menu { flex:1 1 50%; padding: 3mm 1mm 0 1mm; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; }
            .me-print-inner { width:100%; display:flex; flex-direction:column; align-items:center; text-align:center; font-size:13px; }
            /* Marcas de corte (antes: línea de puntos vertical de arriba a abajo + emoji de
               tijeras ✂ rotado en cada punta): ahora, SOLO dos trazos finos sueltos, uno arriba y
               otro abajo -- se quita el border-left (la línea de puntos continua) porque ya no
               hace falta, las dos marcas solas bastan para alinear una guillotina de papel.
               CORREGIDO: con un sangrado negativo (p.ej. top:-4mm) la marca de ARRIBA no
               aparecía en el PDF -- los navegadores no pintan de forma fiable contenido que
               sobresale por encima del borde superior del área imprimible (la de ABAJO sí se
               veía porque ahí "sobresalir" cae dentro de la misma página, no hay página anterior
               a la que "faltarle" ese trozo). Ahora las dos marcas se quedan DENTRO del área
               imprimible (top:0 / bottom:0, sin sangrado), pegadas a los bordes exactos de esos
               198mm -- se ven siempre, en las dos puntas, con el mismo aspecto. */
            .me-print-cutline { width:0; position:relative; margin:0 2mm; }
            .me-print-cutline::before, .me-print-cutline::after { content:''; position:absolute; left:50%; transform:translateX(-50%); width:1.5px; height:4mm; background:#999; }
            .me-print-cutline::before { top:0; }
            .me-print-cutline::after { bottom:0; }
            .me-print-cabecera { width:100%; display:flex; justify-content:space-between; align-items:center; margin-bottom:1.1em; padding:0 2.6em; }
            .me-print-cab-izq { display:flex; flex-direction:column; align-items:center; }
            .me-print-bull { height:2.6em; width:auto; object-fit:contain; }
            .me-print-rn-texto { font-size:1.35em; font-weight:600; letter-spacing:0.03em; line-height:1.05; margin-top:0.15em; color:#222; }
            .me-print-rn-sub { font-size:0.95em; font-weight:400; letter-spacing:0.08em; line-height:1.1; color:#555; }
            .me-print-cab-der { display:flex; align-items:center; }
            .me-print-logo { height:5.4em; width:auto; object-fit:contain; }
            /* Marco a imitación del menú de referencia: SOLO las líneas van inclinadas (losa naranja
               detrás + rectángulo de borde naranja fino, cada uno con su propio giro, y pueden
               sobresalir de la hoja sin problema); el texto va recto encima, con el formato de
               siempre (centrado, títulos dorados en mayúsculas con línea fina). */
            .me-print-marco { position:relative; width:calc(100% - 7em); margin:1.3em 3.5em 1em 3.5em; }
            .me-print-marco-fondo { position:absolute; top:-0.8em; left:-0.9em; right:0.7em; bottom:0.9em; background:#d2491a; transform:rotate(-3.6deg); transform-origin:50% 50%; border-radius:0.25em; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
            .me-print-marco-borde { position:absolute; top:0; left:0; right:0; bottom:0; background:#fff; border:0.12em solid #d2491a; border-radius:0.3em; transform:rotate(-2.2deg); transform-origin:50% 50%; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
            .me-print-marco-int { position:relative; padding:1.1em 1.4em 1em 1.4em; display:flex; flex-direction:column; align-items:center; text-align:center; }
            .me-print-titulo { font-size:1.55em; font-weight:800; letter-spacing:0.01em; color:#d2491a; margin:0 0 0.6em 0; align-self:center; text-align:center; }
            .me-print-seccion { width:100%; max-width:35em; margin:0 auto 0.5em auto; }
            .me-print-seccion-titulo { font-size:0.76em; font-weight:800; text-transform:uppercase; letter-spacing:0.03em; white-space:nowrap; color:#b8860b; border-bottom:1px solid #ddd; padding-bottom:0.15em; margin-bottom:0.3em; }
            .me-print-plato { margin-bottom:0.22em; }
            .me-print-plato-linea { font-size:0.92em; line-height:1.25; }
            .me-print-plato-en { font-style:italic; color:#555; font-size:0.85em; line-height:1.25; }
        `;
        const bodyHtml = `<div class="me-print-sheet">${menuHtml}<div class="me-print-cutline"></div>${menuHtml}</div>`;

        // Script embebido en la propia ventana emergente: espera imágenes/fuentes, mide el
        // alto real disponible de la página (misma técnica de "sonda" que ya usa
        // ajustarAUnaPagina en sugerencias-print.js: crear un div oculto con una altura en mm
        // conocida y leer a cuántos px equivale, evitando asumir una resolución fija) y AJUSTA
        // el font-size de .me-print-inner (todo lo demás está en "em", así que espaciados y logo
        // escalan en la misma proporción) EN LOS DOS SENTIDOS: si un menú corto sobra espacio a
        // tamaño normal, sube el factor para aprovechar el hueco (letra más grande Y más
        // separación entre secciones a la vez, sin quedarse chico en una hoja medio vacía); si un
        // menú largo no cabe, lo reduce como siempre, hasta un mínimo legible -- si ni así cupiera,
        // avisa y deja decidir.
        const scriptAjuste = `
            (function () {
                var ALTO_DISPONIBLE_MM = 198;
                var BASE_PX = 13;
                // LÍMITE DE TAMAÑO (27 sept, reemplaza el esquema anterior): el texto NUNCA baja
                // de FACTOR_MIN (para que un menú largo siga siendo legible) pero YA NO SUBE por
                // encima de 1 -- antes, un menú corto hacía crecer la letra hasta FACTOR_MAX
                // (1.25) para "aprovechar" el hueco, y el usuario pidió explícitamente lo
                // contrario: un menú con poco texto no debe verse con letras gigantes, debe
                // verse con la letra de siempre pero repartiendo las SECCIONES (Entrantes/
                // Principales/Postre/Bebida) a lo largo de toda la hoja en vez de apelotonadas
                // arriba -- ver repartirEspacioSobrante() más abajo, que es quien ahora se encarga
                // de aprovechar el hueco sobrante. La cabecera con los logos sigue el mismo
                // factor que el texto (para achicarse junto con él si un menú largo lo necesita)
                // pero acotada por su cuenta con CAB_MIN para no volverse diminuta.
                var FACTOR_MIN = 0.80;
                var CAB_MIN = 0.90;
                var PASO = 0.035;
                var MAX_INTENTOS = 24;

                function alturaDisponiblePx() {
                    var probe = document.createElement('div');
                    probe.style.cssText = 'position:absolute; visibility:hidden; height:' + ALTO_DISPONIBLE_MM + 'mm; width:0;';
                    document.body.appendChild(probe);
                    var px = probe.getBoundingClientRect().height;
                    document.body.removeChild(probe);
                    return px;
                }

                function aplicarFactor(f) {
                    var styleEl = document.getElementById('me-ajuste-dinamico');
                    var fc = Math.max(CAB_MIN, f);
                    if (styleEl) styleEl.textContent = '.me-print-inner{ font-size:' + (BASE_PX * f) + 'px !important; } .me-print-cabecera{ font-size:' + (BASE_PX * fc) + 'px !important; }';
                }

                // Reequilibra manualmente el corte de cada ".me-print-plato-linea" que se parte en
                // 2 líneas: de entre todos los cortes (por palabra completa, nunca a mitad de
                // palabra) que caben en el ancho disponible, elige siempre el más equilibrado que
                // deje la línea 1 igual o más larga que la línea 2, nunca al revés. Solo actúa si
                // el texto necesita EXACTAMENTE 2 líneas a este ancho/tamaño (si cupiera en 1 no
                // toca nada; si necesitara 3 o más, no se ha encontrado ningún corte válido y se
                // deja tal cual, a merced del ajuste normal del navegador). Se llama DESPUÉS de
                // fijar el factor de letra definitivo (ajustarYimprimir), así que mide con el
                // tamaño real ya asentado -- y como el texto ya envolvía a 2 líneas de forma
                // natural, cambiar SOLO el punto de corte no cambia el alto total del bloque, por
                // lo que no invalida el cálculo de "cabe()" ya hecho.
                //
                // CORREGIDO (19 sept, 2º arreglo): la 1.20.0 medía los anchos con
                // canvas.measureText(), que puede resolver la fuente de forma ligeramente distinta
                // al motor de layout real del navegador -- y encima el CSS dejaba activo
                // text-wrap:balance a la vez que aquí se insertaba un <br> a mano, así que el
                // navegador podía intentar "rebalancear" ese <br> por su cuenta con resultado
                // impredecible (nombres partidos a mitad de palabra en la impresión real, aunque
                // esta función por construcción SOLO corta por espacios, nunca a mitad de
                // palabra). Ahora: (a) el CSS ya no lleva text-wrap:balance en absoluto -- el
                // corte a 2 líneas es SIEMPRE cosa de esta función, el navegador no vuelve a
                // tocarlo; (b) los anchos se miden con una sonda DOM oculta (mismo motor de layout
                // que el render real) en vez de canvas; (c) antes de escribir cada corte se
                // comprueba que línea 1 + espacio + línea 2 reconstruye EXACTAMENTE el texto
                // original -- si por lo que sea no cuadrara, no se toca ese plato y se deja el
                // texto tal cual, nunca a medias.
                function balancearLineasDobles() {
                    var MARGEN_SEGURIDAD_PX = 3; // colchón por si la sonda no calca al 100% el layout real
                    var elementos = document.querySelectorAll('.me-print-plato-linea');
                    if (!elementos.length) return;

                    // Sonda oculta, hermana del propio elemento (mismo padre, así hereda EXACTAMENTE
                    // el mismo font-size en cascada -- incluido el factor dinámico en em que aplica
                    // aplicarFactor() más arriba en .me-print-inner) y con la fuente ya resuelta a
                    // px/estilo concretos vía getComputedStyle(), para no depender de en qué
                    // elemento del DOM esté insertada.
                    var sonda = document.createElement('span');
                    sonda.style.cssText = 'position:absolute; visibility:hidden; white-space:nowrap; left:-9999px; top:0;';
                    document.body.appendChild(sonda);

                    function anchoTexto(fontCss, texto) {
                        sonda.style.font = fontCss;
                        sonda.textContent = texto;
                        return sonda.getBoundingClientRect().width;
                    }

                    function escaparHtml(t) {
                        return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    }

                    for (var idx = 0; idx < elementos.length; idx++) {
                        var el = elementos[idx];
                        var texto = (el.textContent || '').trim();
                        var palabras = texto.split(/\s+/).filter(Boolean);
                        if (palabras.length < 2) continue;

                        var maxWidth = el.clientWidth;
                        if (!maxWidth) continue;
                        var maxWidthSeguro = maxWidth - MARGEN_SEGURIDAD_PX;

                        var fontCss = window.getComputedStyle(el).font;
                        var anchoCompleto = anchoTexto(fontCss, texto);
                        if (anchoCompleto <= maxWidth) continue; // ya cabe en 1 línea, no tocar

                        var candidatos = [];
                        for (var i = 1; i < palabras.length; i++) {
                            var linea1 = palabras.slice(0, i).join(' ');
                            var linea2 = palabras.slice(i).join(' ');
                            var w1 = anchoTexto(fontCss, linea1);
                            var w2 = anchoTexto(fontCss, linea2);
                            if (w1 > maxWidthSeguro || w2 > maxWidthSeguro) continue;
                            candidatos.push({ linea1: linea1, linea2: linea2, w1: w1, w2: w2 });
                        }
                        if (!candidatos.length) continue; // necesitaría 3+ líneas: se deja tal cual

                        var conLinea1Mayor = candidatos.filter(function (c) { return c.w1 >= c.w2; });
                        var pool = conLinea1Mayor.length ? conLinea1Mayor : candidatos;
                        pool.sort(function (a, b) { return Math.abs(a.w1 - a.w2) - Math.abs(b.w1 - b.w2); });
                        var elegido = pool[0];

                        // Red de seguridad: si por lo que sea las 2 líneas elegidas no reconstruyen
                        // EXACTAMENTE el texto original (uniéndolas con un espacio), no se toca este
                        // plato -- mejor dejarlo con el ajuste automático del navegador que arriesgar
                        // un nombre incompleto o cortado.
                        if ((elegido.linea1 + ' ' + elegido.linea2) !== texto) continue;

                        el.innerHTML = escaparHtml(elegido.linea1) + '<br>' + escaparHtml(elegido.linea2);
                    }

                    document.body.removeChild(sonda);
                }

                // 27 sept -- reparte el hueco que sobra bajo un menú corto como espacio EN
                // BLANCO entre sus bloques (título/Entrantes/Principales/Postre/Bebida), en vez
                // de agrandar la letra (ver comentario de FACTOR_MIN más arriba). Estira
                // ".me-print-marco-int" (el marco naranja que ya envuelve todo el contenido) a
                // una altura mayor que la que necesita de forma natural, y le pone
                // justify-content:space-evenly -- como es un flex en columna, el navegador
                // reparte solo el espacio de más EN PARTES IGUALES antes del primer bloque, entre
                // cada bloque y después del último (con un solo bloque, eso lo centra
                // verticalmente sin más). El resto de estilos del marco (fondo, borde, padding)
                // no se tocan: al ser ".me-print-marco" position:relative sin altura propia, y
                // ".me-print-marco-fondo"/".me-print-marco-borde" absolutos con inset relativo a
                // él, crecen solos junto con ".me-print-marco-int" para seguir enmarcando todo el
                // bloque ya repartido.
                function repartirEspacioSobrante(maxAlturaPx, menuEl) {
                    var marcoInt = document.querySelector('.me-print-marco-int');
                    var styleEl = document.getElementById('me-ajuste-dinamico');
                    if (!marcoInt || !styleEl) return;
                    void menuEl.offsetHeight;
                    var sobrante = maxAlturaPx - menuEl.getBoundingClientRect().height;
                    if (sobrante <= 4) return; // ya llena la página (o casi), no hace falta repartir nada
                    var alturaMarcoActual = marcoInt.getBoundingClientRect().height;
                    styleEl.textContent += ' .me-print-marco-int{ height:' + (alturaMarcoActual + sobrante) + 'px !important; justify-content:space-evenly !important; }';
                }

                function ajustarYimprimir() {
                    var maxAlturaPx = alturaDisponiblePx();
                    // Se mide .me-print-inner (el bloque de contenido real, que crece/encoge con
                    // el font-size que aplicarFactor() va cambiando), NO .me-print-menu -- ese
                    // contenedor ahora tiene una altura fija (198mm, ver .me-print-sheet en los
                    // estilos) para poder centrar verticalmente el contenido cuando sobra espacio,
                    // así que su propio alto ya no sirve para saber si el contenido cabe o no.
                    var menuEl = document.querySelector('.me-print-inner');
                    if (!menuEl) { window.print(); return; }

                    function cabe() { void menuEl.offsetHeight; return menuEl.getBoundingClientRect().height <= maxAlturaPx; }

                    var factor = 1, intentos = 0;
                    aplicarFactor(factor);

                    // Ya NO se agranda la letra si sobra espacio a tamaño normal (ver comentario
                    // de FACTOR_MIN arriba) -- solo se reduce si un menú largo no cabe, igual que
                    // siempre, hasta el mínimo legible.
                    while (!cabe() && intentos < MAX_INTENTOS && (factor - PASO) >= FACTOR_MIN) {
                        factor -= PASO;
                        aplicarFactor(factor);
                        intentos++;
                    }

                    if (cabe()) {
                        repartirEspacioSobrante(maxAlturaPx, menuEl);
                        balancearLineasDobles();
                        setTimeout(function () { window.print(); }, 150);
                    } else {
                        var aviso = document.createElement('div');
                        aviso.style.cssText = 'position:fixed; top:10px; left:50%; transform:translateX(-50%); background:#fef2f2; border:1px solid #dc2626; color:#991b1b; padding:10px 16px; border-radius:8px; font-family:sans-serif; font-size:13px; z-index:9999; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.15);';
                        aviso.innerHTML = '⚠️ Hay demasiados platos para que quepa todo en una sola hoja, incluso con la letra al mínimo legible.<br>Quita algún plato del menú antes de imprimir.<br><button id="me-print-btn-forzar" style="margin-top:8px;cursor:pointer;background:#dc2626;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:12px;">Imprimir de todas formas</button>';
                        document.body.appendChild(aviso);
                        document.getElementById('me-print-btn-forzar').onclick = function () {
                            aviso.parentNode.removeChild(aviso);
                            window.print();
                        };
                    }
                }

                function esperar() {
                    var imgs = Array.prototype.slice.call(document.images);
                    var promesasImgs = imgs.map(function (img) {
                        if (img.complete) return Promise.resolve();
                        return new Promise(function (res) { img.onload = img.onerror = res; });
                    });
                    var promesaFuentes = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function () {}) : Promise.resolve();
                    return Promise.all(promesasImgs.concat([promesaFuentes])).then(function () {
                        return new Promise(function (res) { requestAnimationFrame(function () { requestAnimationFrame(res); }); });
                    });
                }

                esperar().then(ajustarYimprimir);
            })();
        `;

        const pWin = window.open('', '_blank', 'width=1100,height=800');
        if (!pWin) { alert('El navegador ha bloqueado la ventana de impresión (bloqueador de pop-ups). Permite las ventanas emergentes para esta web e inténtalo de nuevo.'); return; }
        pWin.document.write(`<html><head><title>${escHtml(menu.nombre || 'Menú Especial')}</title><style>${estilos}</style><style id="me-ajuste-dinamico"></style></head><body>${bodyHtml}<script>${scriptAjuste}<\/script></body></html>`);
        pWin.document.close();
    }

    function imprimirMenuActual() { imprimir(menuActual); }

    function imprimirMenuGuardado(id) {
        const m = buscarMenuPorId(id);
        if (!m) { alert('No se ha encontrado ese menú.'); return; }
        imprimir(mergeMenuDesdeGuardado(m));
    }

    // =================================================================================
    // PRECARGA DE ÍNDICES — punto único que deja platosParaPopup/indiceVinos listos, con el
    // mismo espíritu de "no repetir trabajo" que ya usa cargarYCachearModo() de app.js para
    // RG/US Open: si ya se cargaron antes (típicamente por precargarEnSegundoPlano() más abajo,
    // lanzada al arrancar la web -- ver index.html) no se vuelve a tocar la red ni a reprocesar
    // nada; si ya hay una carga en marcha (dos llamadas casi a la vez) se espera esa misma en
    // vez de lanzar una segunda en paralelo.
    // =================================================================================
    let indicesListos = false;
    let indicesPromesaEnCurso = null;

    async function asegurarIndicesCargados() {
        if (indicesListos) return;
        if (indicesPromesaEnCurso) { await indicesPromesaEnCurso; return; }
        indicesPromesaEnCurso = cargarIndiceDePlatos().then(() => { indicesListos = true; });
        try {
            await indicesPromesaEnCurso;
        } finally {
            indicesPromesaEnCurso = null;
        }
    }

    // NUEVO: precarga en segundo plano (sin overlay, sin tocar la interfaz de esta pestaña --
    // de hecho puede llamarse ANTES de que construirEsqueleto() haya montado nada) de las
    // cartas de RG y US Open que necesita "Menú Especial". Pensada para lanzarse nada más
    // arrancar la web, exactamente igual que ya hace precargarEnSegundoPlano(otroModo) en
    // app.js con "el otro restaurante" del Editor normal (ver index.html) -- de hecho, como
    // cargarIndiceDePlatos() reutiliza cargarYCachearModo() (la misma caché compartida de
    // siempre), si RG/US Open ya se estaban cargando o ya estaban en caché por ese motivo, esto
    // no duplica ninguna descarga, solo se une a la que ya hubiera en marcha o reutiliza el
    // resultado ya guardado. Respeta el mismo checkbox "⚡ Precargar" de la cabecera (mismo
    // localStorage que ya usa esa función de app.js) para no descargar nada si el usuario lo
    // desactivó.
    async function precargarEnSegundoPlano() {
        try {
            if (typeof localStorage !== 'undefined' && localStorage.getItem('precargaSegundoPlanoDesactivada') === '1') return;
        } catch (e) { /* si localStorage no está disponible, seguimos con la precarga activada */ }
        try {
            // 25 sept: listarMenus() se lanza EN PARALELO con los índices de platos (antes solo
            // se precargaban las cartas; la lista de menús guardados se pedía siempre al entrar
            // en la pestaña, de forma secuencial DESPUÉS de esperar las cartas -- ver init() más
            // abajo). Guarda la promesa en menusGuardadosPromesa para que init() la reutilice en
            // vez de repetir la petición si esto ya la lanzó.
            menusGuardadosPromesa = listarMenus().then(m => { if (m !== null) menusGuardados = m; return m; });
            await Promise.all([asegurarIndicesCargados(), menusGuardadosPromesa]);
        } catch (e) {
            // Una precarga fallida no es un error visible para el usuario: si de verdad entra
            // en la pestaña, init() simplemente hará la carga normal en ese momento.
            console.warn('[MenuEspecial] Precarga en segundo plano falló (sin problema):', e);
        }
    }

    // =================================================================================
    // INICIALIZACIÓN — llamada desde switchTab() en index.html cada vez que se abre la
    // pestaña. No reinicia menuActual si ya había uno en edición (para no perder cambios al
    // cambiar de pestaña y volver). Si los índices de platos/vinos YA estaban listos (lo más
    // habitual gracias a precargarEnSegundoPlano(), lanzada al arrancar la web -- ver
    // index.html) no muestra overlay de carga ni reprocesa nada, solo refresca la lista de
    // menús guardados (una petición GET ligera).
    // =================================================================================
    async function init() {
        inyectarEstilos();
        construirEsqueleto();
        if (!menuActual) menuActual = nuevoMenuVacio();

        const yaEstabanListos = indicesListos;
        if (!yaEstabanListos) mostrarCargando(true, '🍽️ Cargando cartas de RG y US Open...');
        try {
            // 25 sept: si precargarEnSegundoPlano() ya lanzó listarMenus() al arrancar la web,
            // se reutiliza esa MISMA petición en curso (menusGuardadosPromesa) en vez de pedirla
            // otra vez; y aunque no se hubiera lanzado antes, aquí va EN PARALELO con las cartas
            // (Promise.all) en vez de esperar a que las cartas terminen para empezar -- antes
            // era secuencial, así que la carga de la pestaña sumaba el tiempo de las cartas MÁS
            // el de listarMenus (que puede tardar varios segundos, ver fetchConTimeout).
            const promesaMenus = menusGuardadosPromesa || listarMenus().then(m => { if (m !== null) menusGuardados = m; return m; });
            await Promise.all([asegurarIndicesCargados(), promesaMenus]);
        } finally {
            menusGuardadosPromesa = null;
            if (!yaEstabanListos) mostrarCargando(false);
        }

        renderSidebarLista();
        renderFormulario();
    }

    window.MenuEspecial = {
        init: init,
        precargarEnSegundoPlano: precargarEnSegundoPlano,
        nuevoMenu: nuevoMenu,
        refrescarLista: refrescarLista,
        diagnosticarConexion: diagnosticarConexion,
        cargarMenu: cargarMenu,
        duplicarMenu: duplicarMenu,
        guardarMenuActual: guardarMenuActual,
        eliminarMenu: eliminarMenu,
        imprimirMenuActual: imprimirMenuActual,
        imprimirMenuGuardado: imprimirMenuGuardado,
        actualizarNombre: actualizarNombre,
        toggleLogo: toggleLogo,
        toggleMostrarNombre: toggleMostrarNombre,
        toggleIdioma: toggleIdioma,
        toggleSeccion: toggleSeccion,
        toggleCompartir: toggleCompartir,
        toggleAElegir: toggleAElegir,
        toggleBebida: toggleBebida,
        toggleVino: toggleVino,
        agregarPlatoManual: agregarPlatoManual,
        quitarPlato: quitarPlato,
        iniciarEdicionPlato: iniciarEdicionPlato,
        cancelarEdicionPlato: cancelarEdicionPlato,
        guardarEdicionPlato: guardarEdicionPlato,
        traducirAIngles: traducirAIngles,
        abrirModalPlatos: abrirModalPlatos,
        cerrarModalPlatos: cerrarModalPlatos,
        filtrarModalLista: filtrarModalLista,
        toggleSeleccionModal: toggleSeleccionModal,
        confirmarSeleccionPlatos: confirmarSeleccionPlatos,
        eliminarPlatoManualDeBiblioteca: eliminarPlatoManualDeBiblioteca
    };
})();
