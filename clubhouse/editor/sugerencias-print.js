(function () {
    'use strict';

    // MODIFICADO: Mapa de configuración unificado usando Abstract Keys estrictas
    const SUGERENCIAS_CONFIG = {
        restaurante001: {
            versionStr: 'v2.9.6-Abstract-Keys',
            versionKey: 'sugerencias_restaurante001',
            containerId: 'sugerencias-contenido',
            logoSrc: LOGO_RESTAURANTE001,
            logoFallback: 'https://z-cdn-media.chatglm.cn/files/fc4b4919-b148-470d-97a2-c740c58d1178.png?auth_key=1881113734-9f1ef8e42c5a4eae8f4f0f9055730ecf-0-f7b585f0f08f5f78de683fb163bec75d',
            qrImgId: 'img-qr-rg',
            qrRadioName: 'qr-mode-rg-footer',
            qrDefault: QR_RESTAURANTE001_DEFAULT, 
            qrMod: QR_RESTAURANTE001_MOD,           
            qrOptions: [
                { value: 'none', label: 'Sin QR', isDefault: QR_TIPO_DEFAULT_RESTAURANTE001 === 'none' },
                { value: 'default', label: 'Oficial', isDefault: QR_TIPO_DEFAULT_RESTAURANTE001 === 'default' },
                { value: 'mod', label: 'Alternativo', isDefault: QR_TIPO_DEFAULT_RESTAURANTE001 === 'mod' }
            ],
            vinoImagenSrc: VINO_IMAGEN_TENISTA,
            vinoImagenWrapperId: 'vino-imagen-rg',
            vinoImagenRadioName: 'vino-imagen-mode-rg-footer',
            vinoImagenOptions: [
                { value: 'con', label: 'Con imagen Vino', isDefault: VINO_IMAGEN_DEFAULT_RESTAURANTE001 },
                { value: 'sin', label: 'Sin imagen Vino', isDefault: !VINO_IMAGEN_DEFAULT_RESTAURANTE001 }
            ]
        },
        restaurante002: {
            versionStr: 'v2.9.6-Abstract-Keys',
            versionKey: 'sugerencias_restaurante002',
            containerId: 'sugerencias-contenido-usopen',
            logoSrc: LOGO_RESTAURANTE002,
            logoFallback: 'https://z-cdn-media.chatglm.cn/files/fc4b4919-b148-470d-97a2-c740c58d1178.png?auth_key=1881113734-9f1ef8e42c5a4eae8f4f0f9055730ecf-0-f7b585f0f08f5f78de683fb163bec75d',
            qrImgId: 'img-qr-usopen',
            qrRadioName: 'qr-mode-usopen-footer',
            qrDefault: QR_RESTAURANTE002_DEFAULT, 
            qrMod: QR_RESTAURANTE002_MOD,         
            qrOptions: [
                { value: 'none', label: 'Sin QR', isDefault: QR_TIPO_DEFAULT_RESTAURANTE002 === 'none' },
                { value: 'default', label: 'Oficial', isDefault: QR_TIPO_DEFAULT_RESTAURANTE002 === 'default' },
                { value: 'mod', label: 'Alternativo', isDefault: QR_TIPO_DEFAULT_RESTAURANTE002 === 'mod' }
            ],
            vinoImagenSrc: VINO_IMAGEN_TENISTA,
            vinoImagenWrapperId: 'vino-imagen-usopen',
            vinoImagenRadioName: 'vino-imagen-mode-usopen-footer',
            vinoImagenOptions: [
                { value: 'con', label: 'Con imagen Vino', isDefault: VINO_IMAGEN_DEFAULT_RESTAURANTE002 },
                { value: 'sin', label: 'Sin imagen Vino', isDefault: !VINO_IMAGEN_DEFAULT_RESTAURANTE002 }
            ]
        }
    };

    if (!document.getElementById('sugerencias-print-styles')) {
        const stylePrint = document.createElement('style');
        stylePrint.id = 'sugerencias-print-styles';
        stylePrint.innerHTML = `
            @page { size: A4; margin: 15mm 10mm; } /* Margen superior/inferior a 15mm (10mm original + 5mm más) */
            /* MODIFICADO: ancho FIJO de 190mm (antes width:100% con tope max-width:190mm) — con
               width:100% el panel se encogía para caber en el hueco disponible dentro de la pestaña
               del editor si esa columna era más estrecha que 190mm (ventana del navegador no
               maximizada, portátil pequeño...). Un panel más estrecho envuelve los nombres de los
               platos en más líneas de las que ocupan en la hoja impresa (la ventana de impresión sí
               consigue los 190mm completos en su propia ventana nueva), y ese contenido "de más" es
               justo lo que hacía saltar el ajuste automático (quitar botella/QR, encoger letra) SIN
               falta ninguna: la vista previa medía un ancho distinto al que de verdad se imprime. Con
               un ancho fijo, el panel envuelve el texto EXACTAMENTE igual en pantalla que en el
               papel — si no cabe en la ventana del editor, se ve con scroll horizontal en vez de
               deformarse (ver overflow-x en el contenedor, más abajo).
            */
            /* MODIFICADO: line-height: normal !important añadido aquí — el panel heredaba el
               line-height que tuviera puesto <html>/<body> en CADA página donde vive. En la
               ventana de impresión (documento aislado, sin ningún CSS de la web) eso siempre ha
               sido el "normal" del navegador (~1.2), pero en la propia página del editor,
               Tailwind (cargado por <script src="https://cdn.tailwindcss.com">) pone
               line-height:1.5 en <html> como parte de su reset — un 25% más alto en CADA línea
               de texto de la hoja (nombres de plato, descripciones en inglés, títulos...), que
               con varios platos se traduce en varios centímetros de más. Esa era la causa real
               de que con muy pocos platos el ajuste ya diera por hecho que no cabía la imagen del
               vino y la quitase: la vista previa medía con interlineado 1.5 mientras que la
               impresión (que sí cabía de sobra, como confirman los PDF) medía con el normal del
               navegador — dos alturas de verdad distintas para el mismo contenido, sin que
               ningún reajuste manual pudiera arreglarlo, porque la medida en pantalla ERA así de
               alta de verdad. Fijar aquí "normal" desengancha el panel de lo que decida el CSS
               global de la página donde esté incrustado, así vista previa e impresión miden
               siempre lo mismo. */
            .sugerencias-panel { background: #ffffff !important; padding: 15px 25px !important; width: 190mm !important; max-width: 190mm !important; min-height: 267mm !important; margin: 0 auto !important; font-family: 'Montserrat', sans-serif !important; line-height: normal !important; box-sizing: border-box !important; display: flex !important; flex-direction: column !important; position: relative !important; flex-shrink: 0 !important; }
            #sugerencias-contenido, #sugerencias-contenido-usopen { overflow-x: auto; }
            /* NUEVO: rectángulo de depuración visual — marca exactamente los 190mm x 267mm de zona
               imprimible real (el resultado de A4 menos los márgenes de @page). Se ancla al propio
               .sugerencias-panel (que ya tiene position:relative) para que top/left:0 coincida con
               su esquina real sin depender de márgenes del body, y con height fija en mm para que
               NO crezca si el contenido se desborda — así se ve a simple vista si algo se pasa de la
               línea roja. Solo en pantalla: oculto en la impresión real vía @media print más abajo.
            */
            .sugerencias-debug-a4 { position: absolute !important; top: 0; left: 0 !important; width: 100% !important; height: 267mm !important; border: 2px solid red !important; box-sizing: border-box !important; pointer-events: none !important; z-index: 9998 !important; }
            .sugerencias-header-layout { display: flex !important; justify-content: space-between !important; align-items: center !important; margin-bottom: 15px !important; position: relative !important; }
            .sugerencias-brand-title-group { display: flex !important; flex-direction: column !important; gap: 2px !important; }
            .sugerencias-title-es { font-weight: 700 !important; font-size: 1.7em !important; color: #e05a2b !important; text-transform: uppercase !important; margin:0 !important; }
            .sugerencias-title-en { font-weight: 300 !important; font-size: 1.2em !important; color: #0d5c63 !important; text-transform: uppercase !important; margin:0 !important; }
            .sugerencias-version-tag { position: absolute !important; top: -15px !important; left: 0 !important; font-size: 0.6em !important; color: #94a3b8 !important; font-family: monospace !important; }
            .sugerencias-logo-img { width: 135px !important; height: auto !important; object-fit: contain !important; } 
            /* CORREGIDO: flex-grow (el "1" inicial de "1 1 auto") hacía que .sugerencias-body Y
               cada .sugerencias-seccion se estirasen automáticamente para absorber el hueco
               sobrante DENTRO de sus propias cajas, de forma imprevisible — eso competía con
               repartirEspacioSobrante() (ver más abajo, dentro de imprimirSugerencias), que
               calcula y reparte ese mismo hueco de forma explícita y controlada. Con flex-grow:0
               ninguno de los dos se estira solo; el body y las secciones ocupan exactamente su
               alto natural, y el único que decide qué hacer con el sobrante es el script. */
            .sugerencias-body { flex: 0 1 auto !important; display: flex !important; flex-direction: column !important; }
            .sugerencias-seccion { flex: 0 1 auto !important; display: flex !important; flex-direction: column !important; margin-bottom: 12px !important; }
            .sugerencias-seccion-titulo { font-size: 0.85em !important; font-weight: 700 !important; color: #d97706 !important; border-bottom: 1px solid #334155 !important; margin-bottom: 8px !important; text-transform: uppercase !important; }
            .sugerencias-plato { display: flex !important; align-items: baseline !important; margin-bottom: 5px !important; width: 100% !important; }
            .sugerencias-plato-nombres { flex: 0 1 auto !important; max-width: 93% !important; display: flex !important; flex-direction: column !important; }
            .sugerencias-nombre-es { font-size: 0.9em !important; font-weight: 600 !important; color: #000000 !important; }
            .sugerencias-nombre-en { font-size: 0.8em !important; color: #7f8c8d !important; font-style: italic !important; }
            .sugerencias-detalles-uvas-inline { display: inline !important; margin-left: 4px !important; font-size: 0.8em !important; color: #555 !important; font-style: normal !important; font-weight: 400 !important; }
            .sugerencias-alergenos { display: flex !important; flex-direction: row !important; flex-wrap: wrap !important; margin-top: 2px !important; align-items: center !important; }
            .sugerencias-alergeno-icon { display: inline-block !important; width: 20px !important; height: 20px !important; object-fit: contain !important; vertical-align: middle !important; margin-right: 3px !important; }
            .sugerencias-puntos { flex: 1 !important; border-bottom: 1px dotted #94a3b8 !important; margin: 0 8px !important; height: 1px !important; }
            .sugerencias-precio { font-size: 0.9em !important; font-weight: 700 !important; flex-shrink: 0 !important; }
            .sugerencias-footer { padding-top: 15px !important; display: flex !important; flex-direction: column !important; align-items: center !important; width: 100% !important; }
            /* MODIFICADO: font-size en "em" en vez de "rem" en todas las reglas de dentro de
               .sugerencias-panel (título, nombres, precio, aviso de alérgenos...) — necesario
               para que ajustarAUnaPagina() pueda encoger SOLO el texto de esta hoja aplicando
               un font-size al propio .sugerencias-panel (ver más abajo). Con "rem" no habría
               forma de hacerlo sin tocar el <html> de toda la página del editor, que es
               justo lo que impedía reutilizar el mismo ajuste en la vista previa en pantalla
               (solo funcionaba en la ventana de impresión, que es un documento aparte). */
            .sugerencias-advertencia-alergenos { font-size: 0.6em !important; color: #64748b !important; max-width: 80% !important; line-height: 1.3 !important; text-align: center !important; font-style: italic !important; margin: 0 auto 5px auto !important; }
            .sugerencias-qr-container { display: flex !important; flex-direction: column !important; align-items: center !important; gap: 5px !important; }
            .sugerencias-qr-img { width: 90px !important; height: 90px !important; object-fit: contain !important; } 
            .sugerencias-qr-toggle { font-size: 0.7rem !important; color: #64748b !important; cursor: pointer !important; display: flex !important; user-select: none !important; gap: 5px !important; }
            .sugerencias-qr-toggle input:checked + span { font-weight: bold; }
            .sugerencias-qr-img { transition: opacity 0.3s; }
            .sugerencias-vino-imagen-wrapper { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center !important; padding: 20px 0 8px 0 !important; column-gap: 10px !important; }
            .sugerencias-vino-imagen { justify-self: center !important; height: 140px; width: auto; max-width: 300px; object-fit: contain !important; transition: height 0.15s ease !important; }
            .sugerencias-vino-imagen-wrapper .sugerencias-qr-img { justify-self: end !important; }
            .vino-imagen-selector-wrapper { font-size: 0.75rem !important; color: #64748b !important; }
            .btn-imprimir-a4 { display: block; width: 100%; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 0.9rem; cursor: pointer; margin-bottom: 15px; text-align: center; }
            /* NUEVO: box de controles, deliberadamente separado y con estilo distinto (fondo gris,
               borde, debajo de la hoja blanca) para que se note a simple vista que NO es parte de
               la hoja A4 que se imprime — solo agrupa el botón de imprimir y las opciones (imagen
               del vino, tamaño, tipo de QR), extraídas de dentro de la hoja para dejarla como un
               espejo fiel de lo que sale impreso. */
            .sugerencias-controles-box { max-width: 190mm; margin: 15px auto 0 auto; padding: 15px 20px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; box-sizing: border-box; font-family: 'Montserrat', sans-serif; }
            /* NUEVO: en pantallas estrechas (móvil), las filas "Imagen Vino:" y "Tipo de QR:"
               se generan con flex-wrap:nowrap y white-space:nowrap en línea (para que en
               pantallas normales queden en una sola fila compacta), lo que en móvil las hacía
               desbordarse por el borde derecho. Aquí se sobreescribe con !important (gana al
               estilo en línea, que no lo es) permitiendo que cada grupo de opciones baje de
               línea si no cabe, y se quita el borde/padding lateral que separaba "Imagen Vino"
               de "Tamaño" (no tiene sentido ya en vertical). */
            @media (max-width: 600px) {
                .qr-selector-wrapper { flex-wrap: wrap !important; white-space: normal !important; }
                .vino-imagen-selector-wrapper { border-right: none !important; padding-right: 0 !important; }
            }
            @media print { body { -webkit-print-color-adjust: exact !important; } .sugerencias-controles-box, .sugerencias-debug-a4 { display: none !important; } }
        `;
        document.head.appendChild(stylePrint);
    }

    // NUEVO: platos quitados A MANO de la hoja de Sugerencias (por restaurante), para poder
    // encajarla en una página sin depender solo de reducir letra/espaciado. Es un estado SOLO
    // de esta pantalla (no se guarda en el Excel ni afecta al plato en el resto de la carta):
    // se pierde al recargar la página, igual que el tipo de QR o el tamaño de la imagen del vino.
    const platosExcluidosSugerencias = { restaurante001: new Set(), restaurante002: new Set() };

    // NUEVO: quita un plato concreto de la hoja de Sugerencias (a petición del usuario, típicamente
    // porque el aviso de que "no cabe ni reduciendo el texto" señala que hace falta quitar alguno) y
    // vuelve a renderizar — el nuevo renderizado ya recalcula el ajuste a una página automáticamente.
    window.quitarPlatoSugerencia = function(id, modo) {
        const set = platosExcluidosSugerencias[modo];
        if (!set) return;
        set.add(parseInt(id, 10));
        if (typeof window.renderCarta === 'function') window.renderCarta(modo);
    };

    // NUEVO: devuelve un plato concreto (quitado antes a mano) a la hoja de Sugerencias.
    window.devolverPlatoSugerencia = function(id, modo) {
        const set = platosExcluidosSugerencias[modo];
        if (!set) return;
        set.delete(parseInt(id, 10));
        if (typeof window.renderCarta === 'function') window.renderCarta(modo);
    };

    // NUEVO: devuelve TODOS los platos quitados a mano de una hoja de Sugerencias.
    window.restaurarTodosPlatosSugerencia = function(modo) {
        const set = platosExcluidosSugerencias[modo];
        if (!set) return;
        set.clear();
        if (typeof window.renderCarta === 'function') window.renderCarta(modo);
    };

    // MODIFICADO: Ahora recibe 'restaurante001' o 'restaurante002'
    window.toggleQR = function(tipo, modo) {
        const config = SUGERENCIAS_CONFIG[modo];
        if (!config) return;
        const img = document.getElementById(config.qrImgId);
        if (!img) return;
        if (tipo === 'none') { img.style.display = 'none'; reajustarVistaPrevia(modo); return; }
        img.style.display = 'block';
        img.src = (tipo === 'default') ? config.qrDefault : config.qrMod;
        reajustarVistaPrevia(modo);
    };

    // NUEVO: tamaño base de la imagen del vino (debe coincidir con el CSS .sugerencias-vino-imagen)
    // y multiplicadores disponibles para agrandarla desde la pantalla.
    const VINO_IMAGEN_BASE_MAX_HEIGHT = 140; // px
    // MODIFICADO: ya no se usa un ancho porcentual — ver .sugerencias-vino-imagen (height fijo,
    // width:auto). Un porcentaje se resolvía de forma poco fiable dentro de la columna "auto"
    // del grid, dejando la botella más corta que el QR aunque compartieran la misma base.
    const VINO_IMAGEN_ESCALAS = [1, 1.2, 1.4, 1.6];
    // MODIFICADO: el valor por defecto ahora vive en config.js (VINO_IMAGEN_ESCALA_DEFAULT),
    // junto al resto de opciones por defecto de este mismo bloque (VINO_IMAGEN_DEFAULT_*,
    // QR_TIPO_DEFAULT_*) — así se puede tocar sin entrar en la lógica de este archivo.
    // MODIFICADO: base del QR igualada a VINO_IMAGEN_BASE_MAX_HEIGHT (antes 90px, un tamaño
    // propio distinto) — así, al aplicar la misma escala a ambas, el QR sale siempre con la
    // misma altura vertical que la botella (antes no coincidían: 90px vs 140px en la base).
    const QR_IMAGEN_BASE_SIZE = VINO_IMAGEN_BASE_MAX_HEIGHT; // px

    // MODIFICADO: solo oculta/muestra la imagen del vino en sí, NUNCA el wrapper entero — desde
    // que el QR vive en la misma fila, ocultar el wrapper apagaba el QR también.
    window.toggleVinoImagen = function(tipo, modo) {
        const config = SUGERENCIAS_CONFIG[modo];
        if (!config) return;
        const wrapper = document.getElementById(config.vinoImagenWrapperId);
        if (!wrapper) return;
        const img = wrapper.querySelector('.sugerencias-vino-imagen');
        if (img) img.style.display = (tipo === 'con') ? '' : 'none';
        reajustarVistaPrevia(modo);
    };

    // NUEVO: ajusta el tamaño de la imagen del vino aplicando un multiplicador sobre el tamaño
    // base (p.ej. 1.2 = un 20% más grande). Reajusta max-height y max-width a la vez para que
    // crezca de forma proporcionada.
    // MODIFICADO: ahora también reescala el QR en la misma proporción (antes se quedaba fijo
    // en 90px mientras la botella crecía, descuadrando la fila); su CSS base tiene
    // width/height con !important, así que el ajuste se fuerza con setProperty(..., 'important')
    // para poder ganarle, en vez de una simple asignación de style que perdería frente a él.
    window.setVinoImagenEscala = function(escala, modo) {
        const config = SUGERENCIAS_CONFIG[modo];
        if (!config) return;
        const wrapper = document.getElementById(config.vinoImagenWrapperId);
        if (!wrapper) return;
        const img = wrapper.querySelector('.sugerencias-vino-imagen');
        if (img) {
            img.style.height = (VINO_IMAGEN_BASE_MAX_HEIGHT * escala) + 'px';
        }
        const qrImg = wrapper.querySelector('.sugerencias-qr-img');
        if (qrImg) {
            const qrTamano = (QR_IMAGEN_BASE_SIZE * escala) + 'px';
            qrImg.style.setProperty('width', qrTamano, 'important');
            qrImg.style.setProperty('height', qrTamano, 'important');
        }
        reajustarVistaPrevia(modo);
    };

    // MODIFICADO: esta función anclaba el rectángulo de depuración al offsetTop de la cabecera
    // porque, en una versión antigua, el botón "Imprimir Sugerencias..." vivía DENTRO del propio
    // panel, encima de la cabecera — y como ese botón nunca sale impreso, el rectángulo tenía que
    // empezar más abajo para no "engloparlo" también. Desde que el botón y el resto de controles
    // se sacaron del panel a su propia caja aparte (sugerencias-controles-box, ver más abajo en
    // procesarYRender), ya no hay nada entre el borde superior del panel y la cabecera salvo el
    // padding del propio panel — así que ese desplazamiento (el padding-top, ~15px) ya no evitaba
    // nada real: solo hacía que el recuadro rojo se dibujara empezando más abajo de donde de
    // verdad empieza la zona de 267mm que usa el cálculo de ajuste (que sí mide desde el borde
    // superior real del panel, ver medir() más arriba) — el recuadro quedaba "de más" 15px por
    // abajo, dando la falsa impresión visual de que quedaba más sitio del que el cálculo real
    // estaba considerando. Se deja el rectángulo en su posición por defecto (top:0, ya puesto en
    // el CSS), pegado al borde superior real del panel, para que lo que se ve coincida con lo que
    // de verdad se mide.
    function posicionarDebugA4(panel) {
        if (!panel) return;
        const debugDiv = panel.querySelector('.sugerencias-debug-a4');
        if (debugDiv) debugDiv.style.top = '0px';
    }
    window.posicionarDebugA4 = posicionarDebugA4;

    // ============================================================
    // NUEVO: motor de "ajuste a una página A4", COMPARTIDO entre la vista
    // previa en pantalla (pestaña Sugerencias) y la ventana de impresión.
    // Antes este algoritmo vivía solo dentro del script que imprimirSugerencias()
    // inyectaba en la ventana emergente — por eso la vista previa nunca
    // mostraba el resultado real (letra/espaciado reducidos, imagen del vino
    // o QR quitados) hasta pulsar "Imprimir". Ahora se define aquí UNA vez y:
    //   1) se ejecuta directamente sobre el panel en pantalla cada vez que se
    //      renderiza o se cambia una opción (imagen del vino, tamaño, QR),
    //      así la vista previa ya es un espejo fiel de lo que se imprimirá.
    //   2) se serializa con .toString() dentro del script que se inyecta en
    //      la ventana emergente de imprimirSugerencias() — que sigue sin
    //      depender de window.opener (poco fiable: bloqueadores de popups,
    //      iframes de Apps Script...), pero ya no hay una copia aparte del
    //      algoritmo que se pueda quedar desincronizada con el tiempo.
    // ============================================================

    // MODIFICADO: antes, si una imagen (sobre todo la de la botella de vino) fallaba al cargar
    // UNA sola vez — p.ej. justo al abrir la pestaña, con la conexión ocupada cargando fuentes,
    // CSS y el resto de recursos a la vez — su propio onerror la escondía para siempre
    // (this.style.display='none') y ahí se quedaba: nada volvía a intentar cargarla, así que la
    // vista previa en pantalla se quedaba con un hueco en blanco de forma permanente. La ventana
    // de impresión, en cambio, es un documento nuevo aparte (ver imprimirSugerencias) — al copiar
    // el HTML de la hoja, la imagen vuelve a pedirse desde cero, ya sin la carga inicial
    // compitiendo con todo lo demás, y esa segunda vez normalmente sí cargaba bien: por eso
    // imprimir "arreglaba" la botella pero la vista previa seguía en blanco.
    // Ahora, para las imágenes que antes se escondían solas al fallar (botella de vino, iconos de
    // alérgenos, QR), esperarImagenes() reintenta la carga un par de veces (con un pequeño retraso
    // y "cache-bust" en la URL) antes de darse por vencida — y como esta misma función se ejecuta
    // en CADA reajuste (la pasada automática de seguridad a los 900ms, el botón manual 🔄, o al
    // cambiar cualquier opción), una imagen que solo tuvo mala suerte una vez tiene más de una
    // oportunidad de recuperarse sola, sin tener que abrir la ventana de impresión para "arreglarla".
    var SELECTOR_IMAGENES_CON_REINTENTO = '.sugerencias-vino-imagen, .sugerencias-qr-img, .sugerencias-alergeno-icon';
    var MAX_REINTENTOS_IMG = 2;
    var RETRASO_REINTENTO_IMG_MS = 500;

    function esperarUnaImagen(img, conReintento) {
        return new Promise(function(resolve) {
            var intentos = 0;
            function intentar() {
                function limpiar() {
                    img.removeEventListener('load', onOk);
                    img.removeEventListener('error', onFallo);
                }
                function onOk() {
                    limpiar();
                    // Si una pasada ANTERIOR había acabado dándose por vencida y escondiendo esta
                    // imagen (ver más abajo), y ahora por fin ha cargado bien, hay que devolverle
                    // el display de antes de esconderla — si no, se queda invisible para siempre
                    // aunque ya haya cargado correctamente (el fallo de carga habría "curado" pero
                    // el escondite manual seguiría activo).
                    if (img.hasAttribute('data-carga-fallida') || img.hasAttribute('data-display-previo-fallo')) {
                        img.style.display = img.getAttribute('data-display-previo-fallo') || '';
                        img.removeAttribute('data-display-previo-fallo');
                    }
                    img.removeAttribute('data-carga-fallida');
                    resolve();
                }
                function onFallo() {
                    limpiar();
                    if (conReintento && intentos < MAX_REINTENTOS_IMG) {
                        intentos++;
                        setTimeout(function() {
                            var base = (img.getAttribute('data-src-original') || img.src).split('?')[0];
                            img.setAttribute('data-src-original', base);
                            img.src = base + '?reintento=' + intentos + '-' + Date.now();
                            intentar();
                        }, RETRASO_REINTENTO_IMG_MS * intentos);
                        return;
                    }
                    if (conReintento) {
                        // Se han agotado los reintentos: se marca como fallo de carga "real" (no
                        // por falta de espacio) para que el aviso pueda contarlo tal cual, y se
                        // esconde como hacía antes el onerror en línea — guardando primero el
                        // display que tenía, para poder devolvérselo si más adelante se recupera.
                        if (!img.hasAttribute('data-display-previo-fallo')) {
                            img.setAttribute('data-display-previo-fallo', img.style.display || '');
                        }
                        img.setAttribute('data-carga-fallida', '1');
                        img.style.setProperty('display', 'none', 'important');
                    }
                    resolve();
                }
                if (img.complete) {
                    if (!img.src || img.naturalWidth > 0) {
                        if (img.hasAttribute('data-carga-fallida') || img.hasAttribute('data-display-previo-fallo')) {
                            img.style.display = img.getAttribute('data-display-previo-fallo') || '';
                            img.removeAttribute('data-display-previo-fallo');
                        }
                        img.removeAttribute('data-carga-fallida');
                        resolve();
                        return;
                    }
                    onFallo();
                    return;
                }
                img.addEventListener('load', onOk);
                img.addEventListener('error', onFallo);
            }
            intentar();
        });
    }

    function esperarImagenes(root) {
        var imgs = Array.prototype.slice.call(root.querySelectorAll('img'));
        return Promise.all(imgs.map(function(img) {
            var conReintento = img.matches && img.matches(SELECTOR_IMAGENES_CON_REINTENTO);
            return esperarUnaImagen(img, conReintento);
        }));
    }

    // NUEVO: espera a que la fuente Montserrat (cargada desde el <link> de Google Fonts en el
    // <head> de index.html, que ya incluye los pesos 300/400/600/700) termine de cargar Y de
    // aplicarse antes de medir nada. Sin esto, la primera vez que se
    // renderiza la hoja (nada más entrar en la pestaña, con la fuente todavía descargándose de
    // Google Fonts) el texto se mide con la fuente de reserva del sistema — que puede envolver los
    // nombres de los platos en más o menos líneas que Montserrat — y eso puede hacer que el
    // algoritmo decida (mal) quitar la imagen del vino o el QR para "que quepa", cuando con la
    // fuente definitiva sí cabía. Como no había ningún reajuste posterior, esa decisión se quedaba
    // fija en la vista previa aunque la fuente terminara de cargar un instante después — por eso la
    // ventana de impresión (que mide más tarde, con la fuente ya en caché) sí mostraba la botella.
    function esperarFuentes() {
        var listo;
        if (document.fonts && document.fonts.ready) {
            try {
                ['300', '400', '600', '700'].forEach(function(peso) {
                    document.fonts.load(peso + ' 16px Montserrat');
                });
            } catch (e) { /* ignorar: si el navegador no soporta document.fonts.load, seguimos igual */ }
            listo = document.fonts.ready.catch(function() {});
        } else {
            listo = Promise.resolve();
        }
        // Doble requestAnimationFrame: además de esperar a que la fuente termine de cargar, se
        // espera a que el navegador pinte al menos un frame con ella ya aplicada — si se mide justo
        // al resolverse la promesa de fuentes, el layout definitivo puede no haberse aplicado
        // todavía en ese mismo instante.
        return listo.then(function() {
            return new Promise(function(resolve) {
                requestAnimationFrame(function() { requestAnimationFrame(resolve); });
            });
        });
    }

    function mmDesdePx(px, maxAlturaPx) { return (px * 267 / maxAlturaPx).toFixed(1); }

    function medirBloqueFijo(panel) {
        var header = panel.querySelector('.sugerencias-header-layout');
        var alturaHeader = header ? header.getBoundingClientRect().height : 0;

        var footer = panel.querySelector('.sugerencias-footer');
        var alturaFooter = footer ? footer.getBoundingClientRect().height : 0;

        var alturaBodega = 0;
        panel.querySelectorAll('.sugerencias-seccion-titulo').forEach(function(titulo) {
            if (titulo.textContent.indexOf('BODEGA') !== -1 && titulo.parentElement) {
                alturaBodega = titulo.parentElement.getBoundingClientRect().height;
            }
        });

        return { alturaHeader: alturaHeader, alturaFooter: alturaFooter, alturaBodega: alturaBodega, alturaFija: alturaHeader + alturaFooter + alturaBodega };
    }

    // NUEVO: deshace TODO lo que haya aplicado una pasada anterior de
    // ajustarAUnaPagina() sobre este panel — imprescindible en la vista previa
    // en pantalla, donde el mismo panel se reajusta una y otra vez (cada vez
    // que cambia una opción); sin este reseteo el ajuste solo podría encoger
    // más y más, sin poder recuperar espacio si el usuario quita a mano el QR
    // o la imagen del vino, o si el nombre de un plato se acorta.
    function limpiarAjustePrevio(panel) {
        panel.style.removeProperty('font-size');
        panel.querySelectorAll('.sugerencias-seccion, .sugerencias-seccion-titulo, .sugerencias-plato').forEach(function(el) {
            el.style.removeProperty('margin-bottom');
        });
        // El aviso de alérgenos puede llevar un font-size forzado a mano (ver
        // protegerAdvertenciaAlergenos, dentro de ajustarAUnaPagina) para blindarlo de la
        // reducción general de texto — se limpia aquí también, junto con el resto, y se
        // recalculará su propio valor de nuevo al empezar el siguiente ajuste.
        var advertencia = panel.querySelector('.sugerencias-advertencia-alergenos');
        if (advertencia) advertencia.style.removeProperty('font-size');
        // Restaura SOLO lo que el propio ajuste automático ocultó (marcado con
        // data-fit-oculto) a su estado justo anterior — nunca toca un elemento
        // que el usuario haya ocultado a mano con los selectores de opciones.
        panel.querySelectorAll('[data-fit-oculto="1"]').forEach(function(el) {
            el.style.display = el.dataset.fitDisplayPrevio || '';
            delete el.dataset.fitOculto;
            delete el.dataset.fitDisplayPrevio;
        });
    }

    function ocultarPorAjuste(el) {
        if (!el || el.dataset.fitOculto === '1') return;
        el.dataset.fitDisplayPrevio = el.style.display || '';
        el.style.setProperty('display', 'none', 'important');
        el.dataset.fitOculto = '1';
    }

    function ajustarAUnaPagina(panel) {
        var resultado = { espacioCategoriasReducido: false, imagenVinoQuitada: false, imagenVinoFalloCarga: false, qrQuitado: false, textoReducido: false, noCabeNiReduciendo: false, medidas: [] };
        if (!panel) return resultado;

        limpiarAjustePrevio(panel);

        // NUEVO: esto se comprueba SIEMPRE, ANTES de medir nada — si se dejara para la sección de
        // "quitar imagen del vino por falta de espacio" (más abajo), esa comprobación solo se
        // ejecuta cuando el ajuste llega hasta ahí, y con una hoja corta que cabe de sobra el
        // algoritmo devuelve el resultado mucho antes de llegar a mirar la imagen — así que un
        // fallo real de carga (ver esperarImagenes, más arriba) podía quedar sin avisar nunca,
        // aunque la imagen llevara ya un buen rato en blanco por un problema de red y no por falta
        // de sitio en la hoja.
        var vinoImgParaCarga = panel.querySelector('.sugerencias-vino-imagen');
        if (vinoImgParaCarga && vinoImgParaCarga.dataset.cargaFallida === '1') {
            resultado.imagenVinoFalloCarga = true;
        }

        // IMPORTANTE: el aviso de alérgenos es información de seguridad alimentaria — es MÁS
        // IMPORTANTE que cualquier plato de la hoja, así que nunca debe encogerse junto con el
        // resto del texto (ver más abajo, donde se reaplica su tamaño original cada vez que se
        // reduce la letra del panel). Se captura su tamaño real ANTES de tocar nada.
        var advertenciaAlergenos = panel.querySelector('.sugerencias-advertencia-alergenos');
        var tamanoAdvertenciaOriginal = advertenciaAlergenos ? getComputedStyle(advertenciaAlergenos).fontSize : null;
        function protegerAdvertenciaAlergenos() {
            if (advertenciaAlergenos && tamanoAdvertenciaOriginal) {
                advertenciaAlergenos.style.setProperty('font-size', tamanoAdvertenciaOriginal, 'important');
            }
        }

        var probe = document.createElement('div');
        probe.style.cssText = 'position:absolute; visibility:hidden; height:267mm; width:0;';
        document.body.appendChild(probe);
        var maxAlturaPx = probe.getBoundingClientRect().height;
        document.body.removeChild(probe);

        // .sugerencias-debug-a4 es position:absolute con una altura FIJA de
        // 267mm dentro de un panel position:relative — eso hace que cuente
        // para el scrollHeight del panel. Se oculta durante toda la medición
        // (se restaura al final, fuera de esta función, junto con el reparto
        // del hueco sobrante) para que no falsee ningún cálculo.
        panel.querySelectorAll('.sugerencias-debug-a4').forEach(function(el) {
            el.style.setProperty('display', 'none', 'important');
        });

        // CORREGIDO: medir() usaba panel.scrollHeight, pero .sugerencias-panel tiene
        // min-height:267mm !important — eso hace que scrollHeight mida SIEMPRE alrededor de
        // 267mm pase lo que pase (una carta cortísima o una larga), porque el propio panel ya
        // está "estirado" a esa altura mínima por CSS. En la práctica scrollHeight salía unos
        // px por ENCIMA de los 267mm de la sonda (por redondeos del layout flex), lo bastante
        // para superar el margen de tolerancia SIEMPRE — así que "Original" nunca daba por
        // bueno el hueco real disponible y el algoritmo pasaba a apretar espacio, quitar la
        // imagen del vino, el QR... aunque sobrara muchísimo sitio de verdad. Se mide en su
        // lugar el final REAL del contenido (borde inferior del footer menos borde superior del
        // panel) — la misma técnica ya usada más abajo en repartirEspacioSobrante() por este
        // mismo motivo, documentado allí desde antes.
        var footerParaMedir = panel.querySelector('.sugerencias-footer');

        function medir(etiqueta) {
            void panel.offsetHeight;
            var bloqueFijo = medirBloqueFijo(panel);
            var panelRect = panel.getBoundingClientRect();
            var footerRect = footerParaMedir ? footerParaMedir.getBoundingClientRect() : panelRect;
            var alturaContenidoReal = footerRect.bottom - panelRect.top;
            var alturaMm = mmDesdePx(alturaContenidoReal, maxAlturaPx);
            var pieFijoMm = mmDesdePx(bloqueFijo.alturaFija, maxAlturaPx);
            var disponibleCategoriasMm = mmDesdePx(maxAlturaPx - bloqueFijo.alturaFija, maxAlturaPx);
            resultado.medidas.push(etiqueta + ': ' + alturaMm + 'mm de 267mm (cabecera+alérgenos+BODEGA: ' + pieFijoMm + 'mm → tope máximo disponible para Entrantes/Principales/Postres: ' + disponibleCategoriasMm + 'mm)');
            var pxPorMm = maxAlturaPx / 267;
            return alturaContenidoReal <= (maxAlturaPx + pxPorMm);
        }

        if (medir('Original')) return resultado;

        var pasosGap = 0, MAX_PASOS_GAP = 18;
        while (!medir('Apretando espacio entre categorías, paso ' + pasosGap) && pasosGap < MAX_PASOS_GAP) {
            pasosGap++;
            var factorGap = 1 - (pasosGap * 0.04);
            panel.querySelectorAll('.sugerencias-seccion').forEach(function(el) {
                el.style.setProperty('margin-bottom', (12 * factorGap) + 'px', 'important');
            });
            panel.querySelectorAll('.sugerencias-seccion-titulo').forEach(function(el) {
                el.style.setProperty('margin-bottom', (8 * factorGap) + 'px', 'important');
            });
        }
        if (pasosGap > 0) resultado.espacioCategoriasReducido = true;
        if (medir('Tras apretar categorías')) return resultado;

        var vinoImg = panel.querySelector('.sugerencias-vino-imagen');
        if (vinoImg && vinoImg.style.display !== 'none') {
            ocultarPorAjuste(vinoImg);
            resultado.imagenVinoQuitada = true;
        }
        if (medir('Sin imagen vino')) return resultado;

        var qrImg = panel.querySelector('.sugerencias-qr-img');
        var qrYaEstabaVisible = qrImg && qrImg.style.display !== 'none' && qrImg.offsetHeight > 0;
        if (qrImg) {
            ocultarPorAjuste(qrImg);
            if (qrYaEstabaVisible) resultado.qrQuitado = true;
        }
        if (medir('Sin QR')) return resultado;

        var factor = 1, pasos = 0, MAX_PASOS = 12;
        // NUEVO: suelo de legibilidad — el texto de los platos no se reduce por debajo de este
        // punto (82% del tamaño original). Si aun así no cabe, se marca noCabeNiReduciendo para
        // que se avise de que hace falta quitar algún plato en vez de seguir encogiendo la letra
        // hasta hacerla ilegible.
        var FACTOR_MINIMO_LEGIBLE = 0.82;

        var bloqueFijoActual = medirBloqueFijo(panel);
        var disponibleParaCategoriasPx = maxAlturaPx - bloqueFijoActual.alturaFija;
        var alturaCategoriasActualPx = 0;
        panel.querySelectorAll('.sugerencias-seccion').forEach(function(sec) {
            var titulo = sec.querySelector('.sugerencias-seccion-titulo');
            if (titulo && titulo.textContent.indexOf('BODEGA') !== -1) return;
            alturaCategoriasActualPx += sec.getBoundingClientRect().height;
        });
        if (alturaCategoriasActualPx > 0 && disponibleParaCategoriasPx > 0) {
            var factorEstimado = disponibleParaCategoriasPx / alturaCategoriasActualPx;
            var factorInicial = Math.max(FACTOR_MINIMO_LEGIBLE, Math.min(1, factorEstimado - 0.03));
            if (factorInicial < 1) {
                factor = factorInicial;
                pasos = Math.max(1, Math.round((1 - factor) / 0.03));
                panel.style.setProperty('font-size', (factor * 100) + '%', 'important');
                protegerAdvertenciaAlergenos();
                panel.querySelectorAll('.sugerencias-plato').forEach(function(el) {
                    el.style.setProperty('margin-bottom', (5 * factor) + 'px', 'important');
                });
                panel.querySelectorAll('.sugerencias-seccion').forEach(function(el) {
                    el.style.setProperty('margin-bottom', (12 * factor) + 'px', 'important');
                });
                panel.querySelectorAll('.sugerencias-seccion-titulo').forEach(function(el) {
                    el.style.setProperty('margin-bottom', (8 * factor) + 'px', 'important');
                });
                resultado.medidas.push('Salto directo a factor ' + (factor * 100).toFixed(0) + '% (disponible categorías: ' + mmDesdePx(disponibleParaCategoriasPx, maxAlturaPx) + 'mm, necesario: ' + mmDesdePx(alturaCategoriasActualPx, maxAlturaPx) + 'mm)');
            }
        }

        while (!medir('Reduciendo texto, paso ' + pasos) && pasos < MAX_PASOS && (factor - 0.03) >= FACTOR_MINIMO_LEGIBLE) {
            factor -= 0.03;
            pasos++;
            panel.style.setProperty('font-size', (factor * 100) + '%', 'important');
            protegerAdvertenciaAlergenos();
            panel.querySelectorAll('.sugerencias-plato').forEach(function(el) {
                el.style.setProperty('margin-bottom', (5 * factor) + 'px', 'important');
            });
            panel.querySelectorAll('.sugerencias-seccion').forEach(function(el) {
                el.style.setProperty('margin-bottom', (12 * factor) + 'px', 'important');
            });
            panel.querySelectorAll('.sugerencias-seccion-titulo').forEach(function(el) {
                el.style.setProperty('margin-bottom', (8 * factor) + 'px', 'important');
            });
        }
        if (pasos > 0) resultado.textoReducido = true;

        // NUEVO: comprobación final — si ni reduciendo el texto hasta el mínimo legible cabe todo
        // en una página, no se sigue encogiendo: se marca para pedirle a la persona que quite algún
        // plato de la hoja (ver el desplegable "Quitar un plato de esta hoja" en los controles).
        if (!medir('Comprobación final')) {
            resultado.noCabeNiReduciendo = true;
        }
        return resultado;
    }

    function repartirEspacioSobrante(panel) {
        if (!panel) return;

        var probe = document.createElement('div');
        probe.style.cssText = 'position:absolute; visibility:hidden; height:267mm; width:0;';
        document.body.appendChild(probe);
        var maxAlturaPx = probe.getBoundingClientRect().height;
        document.body.removeChild(probe);

        var footer = panel.querySelector('.sugerencias-footer');
        if (!footer) return;
        void panel.offsetHeight;

        var panelRect = panel.getBoundingClientRect();
        var footerRect = footer.getBoundingClientRect();
        var alturaContenidoReal = footerRect.bottom - panelRect.top;
        var libre = maxAlturaPx - alturaContenidoReal;
        if (libre <= 0) return;

        var secciones = [];
        panel.querySelectorAll('.sugerencias-seccion').forEach(function(sec) {
            var titulo = sec.querySelector('.sugerencias-seccion-titulo');
            if (titulo && titulo.textContent.indexOf('BODEGA') === -1) secciones.push(sec);
        });
        if (secciones.length === 0) return;

        var extraPorSeccion = libre / secciones.length;
        secciones.forEach(function(sec) {
            var actual = parseFloat(getComputedStyle(sec).marginBottom) || 0;
            sec.style.setProperty('margin-bottom', (actual + extraPorSeccion) + 'px', 'important');
        });
    }

    // Punto de entrada único: espera a que carguen las imágenes del panel y
    // aplica el ajuste completo (encaje a una página + reparto del hueco
    // sobrante). Devuelve una promesa con el resultado, usado tanto para el
    // aviso en pantalla como para el de la ventana de impresión.
    function ajustarYRepartir(panel) {
        if (!panel) return Promise.resolve(null);
        return Promise.all([esperarImagenes(panel), esperarFuentes()]).then(function() {
            var resultado = ajustarAUnaPagina(panel);
            repartirEspacioSobrante(panel);
            panel.querySelectorAll('.sugerencias-debug-a4').forEach(function(el) {
                el.style.removeProperty('display');
            });
            posicionarDebugA4(panel);
            return resultado;
        });
    }

    // NUEVO: aviso EN PANTALLA (dentro de la propia pestaña) de que la vista
    // previa se ha reajustado para caber en una A4 — antes este aviso solo
    // existía dentro de la ventana emergente de impresión, así que la persona
    // solo se enteraba de la reducción de tamaño/letra al pulsar "Imprimir".
    function mostrarAvisoInline(contenedor, panel, resultado) {
        var avisoPrevio = contenedor.querySelector('.sugerencias-aviso-ajuste-inline');
        if (avisoPrevio) avisoPrevio.remove();
        if (!resultado) return;
        if (!resultado.espacioCategoriasReducido && !resultado.imagenVinoQuitada && !resultado.imagenVinoFalloCarga && !resultado.qrQuitado && !resultado.textoReducido && !resultado.noCabeNiReduciendo) return;

        var mensajes = [];
        if (resultado.espacioCategoriasReducido) mensajes.push('Se ha reducido un poco el espacio entre categorías.');
        if (resultado.imagenVinoQuitada) mensajes.push('No se usará la imagen del vino, para que quepa todo en una hoja A4.');
        if (resultado.imagenVinoFalloCarga) mensajes.push('La imagen de la botella de vino no se ha podido cargar (posible fallo de red), no por falta de espacio. Pulsa el botón 🔄 para intentarlo de nuevo.');
        if (resultado.qrQuitado) mensajes.push('No se incluirá el código QR, para que quepa todo en una hoja A4.');
        if (resultado.textoReducido) mensajes.push('Se ha reducido ligeramente el tamaño de letra y el espaciado (el aviso de alérgenos NUNCA se reduce).');

        var aviso = document.createElement('div');
        aviso.className = 'sugerencias-aviso-ajuste-inline';
        var esCritico = resultado.noCabeNiReduciendo;
        // El fallo de carga de la imagen no tiene que ver con "quitar un plato" (no es un problema
        // de espacio), pero sí merece el mismo color de alerta que "crítico" para que no pase
        // desapercibido — solo se diferencia en que NO resalta el selector de quitar plato.
        var esAvisoImportante = esCritico || resultado.imagenVinoFalloCarga;
        aviso.style.cssText = 'max-width: 190mm; margin: 12px auto 0 auto; padding:10px 16px; border-radius:8px; font-size:13px; font-family: Montserrat, sans-serif; box-sizing: border-box; ' +
            (esAvisoImportante ? 'background:#fef2f2; border:1px solid #dc2626; color:#991b1b;' : 'background:#fff7ed; border:1px solid #f59e0b; color:#92400e;');
        var htmlAviso = '<b>⚠️ Esta vista previa ya está ajustada a una página A4 (así saldrá impresa):</b>' +
            '<ul style="margin:6px 0 0 18px; padding:0;">' + mensajes.map(function(m) { return '<li>' + m + '</li>'; }).join('') + '</ul>';
        if (esCritico) {
            htmlAviso += '<div style="margin-top:8px; font-weight:700;">Aun así, sigue sin caber todo en una página aunque el texto ya está en el tamaño mínimo legible.<br>Quita algún plato con "Quitar un plato de esta hoja" (justo debajo) para que quepa.</div>';
        }
        aviso.innerHTML = htmlAviso;

        if (panel && panel.parentNode) panel.parentNode.insertBefore(aviso, panel.nextSibling);
        else contenedor.insertBefore(aviso, contenedor.firstChild);

        if (esCritico) {
            var selectorQuitar = contenedor.querySelector('.sugerencias-selector-quitar-plato');
            if (selectorQuitar) {
                selectorQuitar.scrollIntoView({ behavior: 'smooth', block: 'center' });
                selectorQuitar.style.setProperty('outline', '2px solid #dc2626', 'important');
                selectorQuitar.style.setProperty('border-radius', '8px', 'important');
                setTimeout(function() { selectorQuitar.style.removeProperty('outline'); }, 4000);
            }
        }
    }

    // NUEVO: reejecuta el ajuste a una página sobre el panel YA visible en la
    // pestaña (tras un cambio de opción como QR / imagen del vino / tamaño)
    // para que la vista previa en pantalla siga siendo un espejo fiel de lo
    // que saldrá impreso, sin tener que pulsar "Imprimir" para descubrirlo.
    function reajustarVistaPrevia(modo) {
        const config = SUGERENCIAS_CONFIG[modo];
        if (!config) return;
        const contenedor = document.getElementById(config.containerId);
        if (!contenedor) return;
        const panel = contenedor.querySelector('.sugerencias-panel');
        if (!panel) return;
        ajustarYRepartir(panel).then(function(resultado) {
            mostrarAvisoInline(contenedor, panel, resultado);
        });
    }
    // NUEVO: expuesta en window — botón manual "🔄" en los controles, por si la persona quiere
    // forzar un recálculo del ajuste a una página sin esperar a la pasada automática ni tener que
    // abrir la ventana de impresión para comprobarlo.
    window.reajustarVistaPreviaSugerencias = reajustarVistaPrevia;

    window.renderCarta = function(modo) {
        const config = SUGERENCIAS_CONFIG[modo];
        if (!config) return;
        const contenedor = document.getElementById(config.containerId);
        if (!contenedor) return;

        window.APP_VERSIONS = window.APP_VERSIONS || {};
        window.APP_VERSIONS[config.versionKey] = config.versionStr;

        let intentos = 0; const MAX_INTENTOS = 10;
        function intentarRenderizado() {
            let fuente = window.datosLocales || [];
            const tieneDatosEnRango = fuente.some(p => p && p.activa && parseInt(p.id, 10) >= 12000 && parseInt(p.id, 10) <= 12999);
            if (tieneDatosEnRango) procesarYRender(fuente, contenedor, config, modo);
            else if (intentos < MAX_INTENTOS) { intentos++; setTimeout(intentarRenderizado, 500); }
            else contenedor.innerHTML = `<div class="p-4 text-center text-slate-500 italic">Esperando origen de datos...</div>`;
        }
        intentarRenderizado();
    };

    function aplicarParcheOptimista(fuente, modo) {
        const state = window.optimisticState ? window.optimisticState[modo] : { t: 0, s: [] };
        const timeSinceSave = Date.now() - state.t;
        if (timeSinceSave < CONSISTENCY_WINDOW_MS && state.s && state.s.length > 0) {
            let parchesAplicados = 0;
            fuente.forEach(item => { if (!item || !item.id) return; const savedItem = state.s.find(s => s.id === item.id); if (savedItem && JSON.stringify(item) !== JSON.stringify(savedItem)) { parchesAplicados++; Object.keys(savedItem).forEach(k => { item[k] = savedItem[k]; }); } });
        }
        return fuente;
    }

    function procesarYRender(fuente, contenedor, config, modoSeguro) {
        aplicarParcheOptimista(fuente, modoSeguro);
        const excluidos = platosExcluidosSugerencias[modoSeguro] || new Set();
        // NUEVO: los platos que la persona haya quitado a mano de ESTA hoja (ver
        // window.quitarPlatoSugerencia) se excluyen aquí — es independiente de "activa" (el plato
        // sigue en el resto de la carta con normalidad, solo se omite en esta hoja de Sugerencias).
        const todosLosPlatos = fuente.filter(p => p && p.activa && parseInt(p.id, 10) >= 12000 && parseInt(p.id, 10) <= 12999);
        const platos = todosLosPlatos.filter(p => !excluidos.has(parseInt(p.id, 10)));
        let entrantes = [], principales = [], postres = [], vinos = [];
        platos.forEach(p => { const id = parseInt(p.id, 10); if (id === 12990) vinos.push(p); else if (id >= 12100 && id <= 12399) entrantes.push(p); else if (id >= 12400 && id <= 12899) principales.push(p); else if (id >= 12900 && id <= 12999) postres.push(p); else entrantes.push(p); });

        // MODIFICADO: la hoja A4 real (.sugerencias-panel) ya NO contiene el botón de imprimir ni
        // ninguna opción — así lo que se ve dentro de ella en pantalla es EXACTAMENTE lo que se
        // imprime, sin nada de interfaz mezclado. El botón y las opciones (Imagen Vino, Tamaño,
        // Tipo de QR) se juntan en un box aparte, debajo de la hoja (ver más abajo, sugerencias-controles-box).
        let html = `<div class="sugerencias-panel">
            <div class="sugerencias-debug-a4"></div>
            <div class="sugerencias-header-layout">
                <span class="sugerencias-version-tag" style="display:none;">Módulo ${config.versionStr}</span>
                <div class="sugerencias-brand-title-group"><div class="sugerencias-title-es">SUGERENCIAS DEL CHEF</div><div class="sugerencias-title-en">CHEF'S SUGGESTIONS</div></div>
                <img src="${config.logoSrc}" class="sugerencias-logo-img" onerror="this.src='${config.logoFallback}';">
            </div><div class="sugerencias-body">`;

        const renderCat = (titulo, lista, extraHtml = '') => {
            if (lista.length === 0) return '';
            let h = `<div class="sugerencias-seccion"><div class="sugerencias-seccion-titulo">${titulo}</div>`;
            lista.forEach(p => {
                let iconsHtml = '';
                if (p.alergenos) iconsHtml = '<div class="sugerencias-alergenos">' + p.alergenos.split(',').map(a => `<img src="${PATH_ALERGENOS}${a.trim()}.webp" class="sugerencias-alergeno-icon">`).join('') + '</div>';
                const objEs = window.desglosarNombre(p.es); const objEn = window.desglosarNombre(p.en);
                const esVino = (p.id === 12990 || p.id >= 13000);
                let htmlNombreEs = "", htmlNombreEn = "";
                if (esVino) htmlNombreEs = objEs.uvas ? `<span class="sugerencias-nombre-es">${objEs.nombre} <span class="sugerencias-detalles-uvas-inline">(${objEs.uvas})</span></span>` : `<span class="sugerencias-nombre-es">${objEs.nombre}</span>`;
                else {
                    // NUEVO: igual que ya se hacía con la uva del vino, si el plato tiene una
                    // segunda línea tras "//" (ingredientes/opciones) también se muestra aquí,
                    // entre paréntesis junto al nombre — antes solo se imprimía objEs.nombre/
                    // objEn.nombre y ese detalle desaparecía por completo de la hoja impresa.
                    const detalleEs = objEs.opciones.join(' // ');
                    const detalleEn = objEn.opciones.join(' // ');
                    htmlNombreEs = `<span class="sugerencias-nombre-es">${objEs.nombre}${detalleEs ? ` <span class="sugerencias-detalles-uvas-inline">(${detalleEs})</span>` : ''}</span>`;
                    htmlNombreEn = `<span class="sugerencias-nombre-en">${objEn.nombre}${detalleEn ? ` <span class="sugerencias-detalles-uvas-inline">(${detalleEn})</span>` : ''}</span>`;
                }
                const precioFormateado = p.precio ? parseFloat(p.precio).toFixed(2) + '€' : '0.00€';
                h += `<div class="sugerencias-plato"><div class="sugerencias-plato-nombres">${htmlNombreEs}${htmlNombreEn}${iconsHtml}</div><div class="sugerencias-puntos"></div><div class="sugerencias-precio">${precioFormateado}</div></div>`;
            });
            if (extraHtml) h += extraHtml;
            return h + '</div>';
        };

        let initialImgSrc = config.qrMod;
        const defaultOpt = config.qrOptions.find(o => o.isDefault);
        if (defaultOpt && defaultOpt.value === 'default') initialImgSrc = config.qrDefault;
        // CORREGIDO: antes, si isDefault apuntaba a 'none' (Sin QR), el render inicial igual
        // mostraba el QR — solo se ocultaba si el usuario hacía clic manualmente en el radio.
        // Ahora se calcula también el estado inicial oculto, usado en los dos sitios donde se
        // pinta el <img> del QR más abajo.
        const qrInicialOculto = defaultOpt && defaultOpt.value === 'none';

        // NUEVO: si el vino especial (ID 12990) está activo, el QR se mueve a la MISMA fila que
        // la imagen del vino — imagen del vino centrada (columna central de un grid de 3), QR
        // pegado a la derecha (columna derecha) — en vez de vivir abajo del todo junto al aviso
        // de alérgenos.
        const tieneVinoEspecial = vinos.some(p => parseInt(p.id, 10) === 12990);
        const vinoImagenDefaultCon = config.vinoImagenOptions.find(o => o.isDefault)?.value === 'con';
        // MODIFICADO: tamaño inicial ya a VINO_IMAGEN_ESCALA_DEFAULT (1.2x) en vez del 1x base,
        // tanto para la botella como para el QR (proporcional, ver QR_IMAGEN_BASE_SIZE). El
        // !important en el QR es necesario para ganarle al width/height !important de su CSS base.
        const vinoImgAlturaInicial = VINO_IMAGEN_BASE_MAX_HEIGHT * VINO_IMAGEN_ESCALA_DEFAULT;
        const qrTamanoInicial = QR_IMAGEN_BASE_SIZE * VINO_IMAGEN_ESCALA_DEFAULT;
        const vinoImagenHtml = tieneVinoEspecial
            ? `<div class="sugerencias-vino-imagen-wrapper" id="${config.vinoImagenWrapperId}">
                <span></span>
                <img src="${config.vinoImagenSrc}" class="sugerencias-vino-imagen" style="display:${vinoImagenDefaultCon ? '' : 'none'}; height:${vinoImgAlturaInicial}px;">
                <img src="${initialImgSrc}" class="sugerencias-qr-img" id="${config.qrImgId}" style="width:${qrTamanoInicial}px !important; height:${qrTamanoInicial}px !important; display:${qrInicialOculto ? 'none' : ''};">
               </div>`
            : '';

        html += renderCat("ENTRANTES / STARTERS", entrantes);
        html += renderCat("PRINCIPALES / MAIN COURSES", principales);
        html += renderCat("POSTRES / DESSERTS", postres);
        html += renderCat("BODEGA / WINE CELLAR", vinos, vinoImagenHtml);

        let qrButtonsHtml = '';
        config.qrOptions.forEach(opt => {
            const isActive = opt.isDefault;
            const style = `cursor: pointer; color: ${isActive ? '#0d5c63' : '#64748b'}; font-weight: ${isActive ? 'bold' : 'normal'};`;
            qrButtonsHtml += `<label style="${style}"><input type="radio" name="${config.qrRadioName}" value="${opt.value}" ${isActive ? 'checked' : ''} onchange="window.toggleQR('${opt.value}', '${modoSeguro}')"> ${opt.label}</label>`;
        });

        // NUEVO: botones del toggle "Con/Sin imagen Vino" + selector de tamaño, solo se muestran
        // si el vino especial (ID 12990) está activo en esta hoja de Sugerencias.
        let vinoImagenButtonsHtml = '';
        let vinoImagenEscalaHtml = '';
        if (tieneVinoEspecial) {
            config.vinoImagenOptions.forEach(opt => {
                const isActive = opt.isDefault;
                const style = `cursor: pointer; color: ${isActive ? '#0d5c63' : '#64748b'}; font-weight: ${isActive ? 'bold' : 'normal'};`;
                vinoImagenButtonsHtml += `<label style="${style}"><input type="radio" name="${config.vinoImagenRadioName}" value="${opt.value}" ${isActive ? 'checked' : ''} onchange="window.toggleVinoImagen('${opt.value}', '${modoSeguro}')"> ${opt.label}</label>`;
            });
            VINO_IMAGEN_ESCALAS.forEach((escala, idx) => {
                const isActive = escala === VINO_IMAGEN_ESCALA_DEFAULT; // MODIFICADO: 1.2x por defecto (antes 1.4x)
                const style = `cursor: pointer; color: ${isActive ? '#0d5c63' : '#64748b'}; font-weight: ${isActive ? 'bold' : 'normal'};`;
                const etiqueta = escala === 1 ? '1x' : `${escala}x`;
                vinoImagenEscalaHtml += `<label style="${style}"><input type="radio" name="vino-imagen-escala-${modoSeguro}" value="${escala}" ${isActive ? 'checked' : ''} onchange="window.setVinoImagenEscala(${escala}, '${modoSeguro}')"> ${etiqueta}</label>`;
            });
        }
        
        html += `</div><div class="sugerencias-footer">
                <div class="sugerencias-advertencia-alergenos">Si usted tiene algún tipo de alergia alimentaria, por favor comuníquelo a nuestro personal.<br>If you have any food allergies, please inform our staff.</div>
                ${tieneVinoEspecial ? '' : `<div class="sugerencias-qr-container"><img src="${initialImgSrc}" class="sugerencias-qr-img" id="${config.qrImgId}" style="display:${qrInicialOculto ? 'none' : ''};"></div>`}
            </div>
        </div>`;

        // NUEVO: selector para quitar un plato concreto de ESTA hoja de Sugerencias (no afecta al
        // resto de la carta, el plato sigue activo normalmente). Pensado sobre todo para cuando ni
        // reduciendo el texto al mínimo legible cabe todo en una página (ver noCabeNiReduciendo en
        // ajustarAUnaPagina): en vez de seguir encogiendo la letra, se le pide a la persona que
        // decida qué plato quitar — el aviso de alérgenos nunca se sacrifica (ver protegerAdvertenciaAlergenos).
        const opcionesPlatosHtml = platos.map(p => {
            const nombreCorto = (window.desglosarNombre(p.es).nombre || p.es || ('#' + p.id));
            return `<option value="${p.id}">${nombreCorto}</option>`;
        }).join('');
        const selectorQuitarHtml = platos.length > 0
            ? `<div class="sugerencias-selector-quitar-plato" style="display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap; margin-top:10px; padding-top:10px; border-top:1px solid #cbd5e1;">
                    <label style="font-size:0.75rem; color:#64748b;">Quitar un plato de esta hoja:</label>
                    <select id="select-quitar-plato-${modoSeguro}" style="font-size:0.8rem; padding:4px 6px; border-radius:5px; border:1px solid #cbd5e1; max-width:220px;">${opcionesPlatosHtml}</select>
                    <button type="button" onclick="window.quitarPlatoSugerencia(document.getElementById('select-quitar-plato-${modoSeguro}').value, '${modoSeguro}')" style="font-size:0.75rem; padding:5px 10px; border-radius:5px; border:1px solid #dc2626; background:#fef2f2; color:#991b1b; cursor:pointer;">Quitar</button>
               </div>`
            : '';

        const platosExcluidosArray = todosLosPlatos.filter(p => excluidos.has(parseInt(p.id, 10)));
        const listaQuitadosHtml = platosExcluidosArray.length > 0
            ? `<div style="margin-top:10px; padding-top:10px; border-top:1px solid #cbd5e1; text-align:center;">
                    <div style="font-size:0.75rem; color:#64748b; margin-bottom:4px;">Quitados de esta hoja:</div>
                    <div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center;">
                        ${platosExcluidosArray.map(p => {
                            const nombreCorto = (window.desglosarNombre(p.es).nombre || p.es || ('#' + p.id));
                            return `<span style="font-size:0.75rem; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:12px; padding:3px 8px; display:inline-flex; align-items:center; gap:5px;">${nombreCorto} <a href="javascript:void(0)" onclick="window.devolverPlatoSugerencia(${p.id}, '${modoSeguro}')" style="color:#0d5c63; text-decoration:none; font-weight:700;" title="Devolver a la hoja">↺</a></span>`;
                        }).join('')}
                    </div>
                    <button type="button" onclick="window.restaurarTodosPlatosSugerencia('${modoSeguro}')" style="margin-top:6px; font-size:0.7rem; color:#64748b; background:none; border:none; text-decoration:underline; cursor:pointer;">Restaurar todos</button>
               </div>`
            : '';

        // NUEVO: box de controles, SEPARADO de la hoja A4 y colocado debajo de ella — agrupa
        // todo lo que antes vivía disperso dentro de la propia hoja (botón de imprimir arriba del
        // todo, opciones de imagen del vino/tamaño y de QR abajo del todo): así la hoja de encima
        // es un espejo fiel y exclusivo de lo que se va a imprimir, y aquí abajo se controla cómo.
        let controlesHtml = `<div class="sugerencias-controles-box">
                <div style="display:flex; gap:8px; margin-bottom:15px;">
                    <button onclick="window.imprimirSugerencias('${modoSeguro}')" class="btn-imprimir-a4" style="margin-bottom:0; flex:1;">🖨️ Imprimir Sugerencias ${getModoAlias(modoSeguro)} (A4)</button>
                    <button type="button" onclick="window.reajustarVistaPreviaSugerencias('${modoSeguro}')" title="Vuelve a calcular el ajuste a una página, por si algo no se ha actualizado solo" style="flex:0 0 auto; padding:12px 14px; background:#e2e8f0; color:#334155; border:none; border-radius:8px; font-weight:700; font-size:0.9rem; cursor:pointer;">🔄</button>
                </div>
                ${(vinoImagenButtonsHtml || vinoImagenEscalaHtml) ? `<div class="qr-selector-wrapper" style="font-size: 0.75rem; color: #64748b; text-align: center; margin-bottom: 3px; user-select:none; display: flex; flex-direction: row; align-items: center; justify-content: center; flex-wrap: nowrap; gap: 8px; white-space: nowrap;">${vinoImagenButtonsHtml ? `<span class="vino-imagen-selector-wrapper" style="display:flex; align-items:center; gap:8px; padding-right:10px; border-right:1px solid #cbd5e1;">Imagen Vino: ${vinoImagenButtonsHtml}</span>` : ''}${vinoImagenEscalaHtml ? `<span class="vino-imagen-selector-wrapper" style="display:flex; align-items:center; gap:6px;">Tamaño: ${vinoImagenEscalaHtml}</span>` : ''}</div>` : ''}
                <div class="qr-selector-wrapper" style="font-size: 0.75rem; color: #64748b; text-align: center; margin-bottom: 0; user-select:none; display: flex; flex-direction: row; align-items: center; justify-content: center; flex-wrap: nowrap; gap: 8px; white-space: nowrap;">Tipo de QR: ${qrButtonsHtml}</div>
                ${selectorQuitarHtml}
                ${listaQuitadosHtml}
            </div>`;

        contenedor.innerHTML = html + controlesHtml;
        posicionarDebugA4(contenedor);

        // NUEVO: ajusta la vista previa a una página A4 nada más renderizarla,
        // el mismo cálculo que antes solo se aplicaba al pulsar "Imprimir"
        // (ver ajustarYRepartir más arriba) — así lo que se ve en pantalla ya
        // es lo que va a salir impreso, sin sorpresas de última hora.
        const panelParaAjustar = contenedor.querySelector('.sugerencias-panel');
        ajustarYRepartir(panelParaAjustar).then(function(resultado) {
            mostrarAvisoInline(contenedor, panelParaAjustar, resultado);

            // NUEVO: red de seguridad — se repite el ajuste una vez más al cabo de un instante,
            // por si al primer cálculo le faltaba algo por asentar del todo (una imagen que
            // reajusta su tamaño real tras cargar, la fuente aplicándose con un pelín de retraso,
            // un reflow tardío del navegador...). Es barato y no hace nada si ya estaba bien —
            // limpiarAjustePrevio() deshace el primer ajuste antes de volver a medir, así que esta
            // segunda pasada no puede dejar las cosas peor, solo corregirlas si hacía falta. Evita
            // que la vista previa se quede "pillada" en un estado incorrecto (p. ej. la botella de
            // vino quitada sin necesitarlo) hasta que la persona abre la ventana de impresión.
            if (contenedor.querySelector('.sugerencias-panel') === panelParaAjustar) {
                setTimeout(function() {
                    if (contenedor.querySelector('.sugerencias-panel') !== panelParaAjustar) return; // se re-renderizó mientras tanto
                    ajustarYRepartir(panelParaAjustar).then(function(resultadoFinal) {
                        mostrarAvisoInline(contenedor, panelParaAjustar, resultadoFinal);
                    });
                }, 900);
            }
        });
    }

    window.imprimirSugerencias = function(modo) {
        const config = SUGERENCIAS_CONFIG[modo];
        if (!config) return;
        const contenedor = document.getElementById(config.containerId);
        if (!contenedor) return;
        // MODIFICADO: contenedor ya no ES la hoja — ahora también incluye debajo el box de
        // controles (botón imprimir, opciones). Se busca el div.sugerencias-panel real dentro,
        // que es exactamente lo único que debe imprimirse.
        const panelReal = contenedor.querySelector('.sugerencias-panel');
        if (!panelReal) return;
        const styleContent = document.getElementById('sugerencias-print-styles').innerHTML;
        const pWin = window.open('', '_blank', 'width=800,height=1000');

        // MODIFICADO: el aviso ya no depende de window.opener (poco fiable: bloqueadores de
        // popups, o que el admin corra embebido en un iframe de Apps Script pueden romper esa
        // comunicación en silencio, sin error visible). Ahora el aviso se muestra DENTRO de esta
        // misma ventana de impresión, antes de imprimir, con las medidas reales en mm para poder
        // depurar si algo se quita sin hacer falta.
        // MODIFICADO: el algoritmo de ajuste ya NO está duplicado aquí a mano — se serializan con
        // .toString() las mismas funciones que usa la vista previa en pantalla (definidas arriba,
        // ajustarAUnaPagina / repartirEspacioSobrante y sus auxiliares), para que solo exista UNA
        // copia del cálculo y no puedan divergir con el tiempo. Sigue sin depender de window.opener
        // por el mismo motivo de siempre: esta ventana es un documento JS completamente aparte. El
        // panel que se copia (panelReal.outerHTML, más abajo) ya llega con el ajuste de la vista
        // previa aplicado; aquí se resetea (limpiarAjustePrevio, al principio de ajustarAUnaPagina)
        // y se recalcula desde cero por si la fuente o el layout rinden distinto en la ventana nueva.
        const scriptAjuste = `
            var SELECTOR_IMAGENES_CON_REINTENTO = ${JSON.stringify(SELECTOR_IMAGENES_CON_REINTENTO)};
            var MAX_REINTENTOS_IMG = ${MAX_REINTENTOS_IMG};
            var RETRASO_REINTENTO_IMG_MS = ${RETRASO_REINTENTO_IMG_MS};
            ${esperarUnaImagen.toString()}
            ${esperarImagenes.toString()}
            ${esperarFuentes.toString()}
            ${mmDesdePx.toString()}
            ${medirBloqueFijo.toString()}
            ${posicionarDebugA4.toString()}
            ${limpiarAjustePrevio.toString()}
            ${ocultarPorAjuste.toString()}
            ${ajustarAUnaPagina.toString()}
            ${repartirEspacioSobrante.toString()}

            function mostrarAviso(resultado) {
                if (!resultado.espacioCategoriasReducido && !resultado.imagenVinoQuitada && !resultado.imagenVinoFalloCarga && !resultado.qrQuitado && !resultado.textoReducido && !resultado.noCabeNiReduciendo) return;
                var mensajes = [];
                if (resultado.espacioCategoriasReducido) mensajes.push('Se ha reducido un poco el espacio entre categorías.');
                if (resultado.imagenVinoQuitada) mensajes.push('No se ha usado la imagen del vino, para que quepa todo en una hoja A4.');
                if (resultado.imagenVinoFalloCarga) mensajes.push('La imagen de la botella de vino no se ha podido cargar (posible fallo de red), no por falta de espacio.');
                if (resultado.qrQuitado) mensajes.push('No se ha incluido el código QR, para que quepa todo en una hoja A4.');
                if (resultado.textoReducido) mensajes.push('Se ha reducido ligeramente el tamaño de letra y el espaciado (el aviso de alérgenos NUNCA se reduce).');
                var esCritico = resultado.noCabeNiReduciendo;
                var esAvisoImportante = esCritico || resultado.imagenVinoFalloCarga;
                var caja = document.createElement('div');
                caja.id = 'sugerencias-aviso-ajuste';
                caja.style.cssText = 'position:fixed; top:16px; right:16px; z-index:9999; padding:12px 16px; border-radius:8px; font-size:13px; max-width:340px; box-shadow:0 4px 12px rgba(0,0,0,0.15); font-family:sans-serif; ' +
                    (esAvisoImportante ? 'background:#fef2f2; border:1px solid #dc2626; color:#991b1b;' : 'background:#fff7ed; border:1px solid #f59e0b; color:#92400e;');
                var htmlCaja = '<b>⚠️ Ajuste automático a una página</b>' +
                    '<ul style="margin:6px 0 0 18px; padding:0;">' + mensajes.map(function(m){ return '<li>' + m + '</li>'; }).join('') + '</ul>' +
                    '<details style="margin-top:8px; font-size:11px; color:#78716c;"><summary style="cursor:pointer;">Ver medidas</summary>' + resultado.medidas.join('<br>') + '</details>';
                if (esCritico) {
                    htmlCaja += '<div style="margin-top:8px; font-weight:700;">Aun con el texto en su tamaño mínimo legible, sigue sin caber todo en una página. Cierra esta ventana y quita algún plato con "Quitar un plato de esta hoja" antes de imprimir.</div>';
                }
                htmlCaja += '<div style="text-align:right; margin-top:8px;"><button id="btn-continuar-impresion" style="cursor:pointer; background:' + (esCritico ? '#dc2626' : '#f59e0b') + '; color:#fff; border:none; padding:5px 12px; border-radius:5px; font-size:12px;">' + (esCritico ? 'Imprimir de todas formas' : 'Imprimir ahora') + '</button></div>';
                caja.innerHTML = htmlCaja;
                document.body.appendChild(caja);
                return caja;
            }

            Promise.all([esperarImagenes(document.body), esperarFuentes()]).then(function() {
                var panel = document.querySelector('.sugerencias-panel');
                var resultado = ajustarAUnaPagina(panel);
                repartirEspacioSobrante(panel);
                // Volver a mostrar el rectángulo de depuración con el resultado YA decidido (no
                // afecta a ninguna medición a partir de aquí) y reposicionarlo, porque la cabecera
                // puede haberse movido un poco tras apretar el espacio entre categorías.
                panel.querySelectorAll('.sugerencias-debug-a4').forEach(function(el) { el.style.removeProperty('display'); });
                posicionarDebugA4(panel);
                var caja = mostrarAviso(resultado);
                if (!caja) {
                    // Nada que avisar: todo cabía de partida, seguimos con el flujo rápido de siempre
                    setTimeout(function() { window.print(); window.close(); }, 150);
                } else {
                    // Hay algo que avisar: se espera a que la persona pulse "Imprimir ahora" para
                    // dar tiempo real a leer el aviso (no se cierra sola la ventana esta vez).
                    document.getElementById('btn-continuar-impresion').onclick = function() { window.print(); };
                }
            });
        `;

        pWin.document.write(`<html><head><title>Sugerencias ${getModoAlias(modo)}</title><style>${styleContent}@media print { #sugerencias-aviso-ajuste { display: none !important; } }</style></head><body>${panelReal.outerHTML}<script>${scriptAjuste}<\/script></body></html>`);
        pWin.document.close();
    };
})();
