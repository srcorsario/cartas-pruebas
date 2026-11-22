(function () {
    'use strict';

    // MODIFICADO: Mapa de configuración unificado usando Abstract Keys estrictas
    const SUGERENCIAS_CONFIG = {
        restaurante001: {
            versionStr: 'v3.5.0-Abstract-Keys', // 3.5.0 (22 nov): ✕ y ➕ también en las hojas GUARDADAS (◀ ▶): cambian esa hoja (sug-historial 1.3.0 la guarda o la aplica); el ➕ ofrece los platos de la carta de hoy que no están en ella. 3.4.0 (22 nov): ✕ y ➕ ya NO guardan al momento (cada uno creaba una posición en el historial): quedan pendientes en una barra sobre la hoja con «✔ Aplicar y guardar en la web» (UN guardado = UNA posición guardada) y «↶ Deshacer»; aviso al salir con cambios pendientes. 3.3.2 (21 nov): ventana del ➕ con los platos en UNA columna. 3.3.1 (21 nov): ventana del ➕ a todo el ancho (platos en columnas) y aviso grande propio al quitar con ✕. 3.3.0 (21 nov): en la hoja, ✕ a la izquierda de cada plato (lo quita de la lista: se desactiva, no se borra) y ➕ en cada sección (elegir entre los platos ya creados de esa sección); se guarda solo. 3.2.0 (20 nov): ◀ fecha ▶ del historial de Sugerencias (sug-historial.js). 3.1.0 (4 nov): plantilla neutra (window.MARCA)
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
            vinoImagenDefault: VINO_IMAGEN_DEFAULT_RESTAURANTE001,
                    },
        restaurante002: {
            versionStr: 'v3.5.0-Abstract-Keys', // 3.5.0 (22 nov): ✕/➕ también en hojas guardadas. 3.4.0 (22 nov): ✕/➕ pendientes hasta «Aplicar y guardar». 3.3.2 (21 nov): ➕ en una columna. 3.3.1 (21 nov): ventana del ➕ y aviso de ✕ grandes. 3.3.0 (21 nov): ✕ y ➕ en la hoja. 3.2.0 (20 nov): historial de Sugerencias
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
            vinoImagenDefault: VINO_IMAGEN_DEFAULT_RESTAURANTE002,
                    }
    };

    // 4 nov: PLANTILLA NEUTRA (marca.js, webs con "marca"): logo y QR de la propia web, leídos al
    // pintar (se pueden cambiar con 🏷️ Logos y QR sin recargar); sin imagen fija de vino ni logo
    // de respaldo; solo se ofrecen los QR que haya subidos. RG/US Open/Club House: sin cambios.
    if (window.MARCA && window.EDITOR_SITIO && SUGERENCIAS_CONFIG[window.EDITOR_SITIO.modo]) {
        const c = SUGERENCIAS_CONFIG[window.EDITOR_SITIO.modo], MK = window.MARCA;
        Object.defineProperty(c, 'logoSrc', { get: () => MK.src('logo') });
        Object.defineProperty(c, 'qrDefault', { get: () => MK.src('qr') });
        Object.defineProperty(c, 'qrMod', { get: () => MK.src('qrAlt') });
        Object.defineProperty(c, 'qrOptions', { get: () => [
            { value: 'none', label: 'Sin QR', isDefault: true },
            MK.qr ? { value: 'default', label: 'Oficial', isDefault: false } : null,
            MK.qrAlt ? { value: 'mod', label: 'Alternativo', isDefault: false } : null
        ].filter(Boolean) });
        c.logoFallback = '';
        c.vinoImagenSrc = '';
    }

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
            .sugerencias-plato-col { flex-direction: column !important; align-items: stretch !important; }
            .sugerencias-linea1 { display: flex !important; align-items: baseline !important; width: 100% !important; }
            .sugerencias-linea1 > .sugerencias-nombre-es { flex: 0 1 auto !important; max-width: 93% !important; }
            .sugerencias-plato-resto { display: flex !important; flex-direction: column !important; max-width: 93% !important; }
            .sugerencias-plato-nombres { flex: 0 1 auto !important; max-width: 93% !important; display: flex !important; flex-direction: column !important; }
            .sugerencias-nombre-es { font-size: 0.9em !important; font-weight: 600 !important; color: #000000 !important; }
            .sugerencias-nombre-en { font-size: 0.8em !important; color: #7f8c8d !important; font-style: italic !important; }
            .sugerencias-detalles-uvas-inline { display: inline !important; margin-left: 4px !important; font-size: 0.8em !important; color: #555 !important; font-style: normal !important; font-weight: 400 !important; }
            .sugerencias-alergenos { display: flex !important; flex-direction: row !important; flex-wrap: wrap !important; margin-top: 2px !important; align-items: center !important; }
            .sugerencias-alergeno-icon { display: inline-block !important; width: 20px !important; height: 20px !important; object-fit: contain !important; vertical-align: middle !important; margin-right: 3px !important; }
            .sugerencias-puntos { flex: 1 !important; border-bottom: 1px dotted #94a3b8 !important; margin: 0 8px !important; height: 1px !important; }
            /* NUEVO: neutraliza reglas de styles.css (solo existen en la página del editor, no en la ventana
               de impresión) que hacían la vista previa ~16mm más alta que la impresión: margen superior y
               línea del footer, margen del inglés, espaciado de letras y borde del panel. Así pantalla e
               impresión miden lo mismo y no se quita la imagen de las bebidas "por falta de sitio". */
            .sugerencias-footer { margin-top: 0 !important; border-top: none !important; }
            .sugerencias-nombre-en { margin-top: 0 !important; }
            .sugerencias-seccion-titulo { letter-spacing: normal !important; }
            .sugerencias-puntos { top: 0 !important; }
            .sugerencias-panel { border: none !important; }
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
            .sugerencias-vino-imagen-wrapper { display: flex !important; flex-wrap: nowrap !important; align-items: center !important; justify-content: center !important; gap: 90px !important; padding: 20px 0 8px 0 !important; }
            .sugerencias-vino-imagen-wrapper[data-n="3"], .sugerencias-vino-imagen-wrapper[data-n="4"], .sugerencias-vino-imagen-wrapper[data-n="5"], .sugerencias-vino-imagen-wrapper[data-n="6"] { justify-content: space-evenly !important; gap: 0 !important; }
            .sugerencias-descripcion-aperitivo { font-size: 0.75em !important; color: #555 !important; font-style: italic !important; font-weight: 400 !important; }
            .sugerencias-vino-imagen { justify-self: center !important; height: 140px; width: auto; max-width: 300px; object-fit: contain !important; transition: height 0.15s ease !important; }
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
            /* 21 nov (3.3.0): ✕ (quitar de la lista) y ➕ (añadir de la sección) — solo en pantalla, en el margen izquierdo
               de la hoja (position:absolute: no cambian la medida del ajuste a una página ni salen al imprimir). */
            .sugerencias-plato, .sugerencias-seccion-titulo { position: relative !important; }
            .sug-ed { position: absolute !important; left: -21px !important; width: 17px !important; height: 17px !important; padding: 0 !important; border-radius: 50% !important; font: 700 11px/15px sans-serif !important; text-align: center !important; cursor: pointer !important; box-sizing: border-box !important; opacity: .45; }
            .sug-ed:hover, .sugerencias-plato:hover > .sug-quitar { opacity: 1; }
            .sug-quitar { top: 1px !important; border: 1px solid #fca5a5 !important; background: #fef2f2 !important; color: #b91c1c !important; }
            .sug-mas { top: -2px !important; border: 1px solid #0d5c63 !important; background: #ecfeff !important; color: #0d5c63 !important; font-size: 14px !important; opacity: .8; }
            #sug-popup { position: fixed; inset: 0; z-index: 10050; background: rgba(15,23,42,.5); display: flex; align-items: center; justify-content: center; font-family: 'Montserrat', sans-serif; }
            #sug-popup .sp-caja { background: #fff; border-radius: 14px; width: 96vw; max-width: 1700px; min-height: 50vh; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 50px rgba(0,0,0,.3); }
            #sug-popup .sp-cab { padding: 20px 28px 10px; font-weight: 700; font-size: 1.5rem; color: #0d5c63; display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
            #sug-popup .sp-cab small { font-size: .9rem; font-weight: 400; color: #64748b; }
            #sug-popup .sp-cab .sp-x { margin-left: auto; border: none; background: none; font-size: 1.6rem; color: #94a3b8; cursor: pointer; line-height: 1; }
            #sug-popup input[type=search] { margin: 0 28px 12px; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 9px; font-size: 1rem; }
            #sug-popup .sp-lista { overflow: auto; padding: 4px 20px 12px; flex: 1; min-height: 80px; display: grid; grid-template-columns: 1fr; gap: 6px; align-content: start; }
            #sug-popup label.sp-pl { display: flex; gap: 12px; align-items: flex-start; padding: 10px 12px; border-radius: 9px; border: 1px solid #e2e8f0; cursor: pointer; }
            #sug-popup label.sp-pl:hover { background: #f1f5f9; }
            #sug-popup label.sp-pl:has(input:checked) { background: #ecfeff; border-color: #0d5c63; box-shadow: inset 0 0 0 1px #0d5c63; }
            #sug-popup label.sp-pl input { width: 18px; height: 18px; margin-top: 2px; flex-shrink: 0; }
            #sug-popup .sp-id { color: #94a3b8; font: 12px monospace; min-width: 42px; padding-top: 3px; }
            #sug-popup .sp-nom { flex: 1; font-size: .98rem; font-weight: 600; color: #0f172a; }
            #sug-popup .sp-nom small { display: block; font-weight: 400; color: #7f8c8d; font-style: italic; font-size: .82rem; margin-top: 2px; }
            #sug-popup .sp-pre { font-weight: 700; font-size: .98rem; white-space: nowrap; }
            #sug-popup .sp-tag { font-size: .75rem; color: #c2410c; display: block; font-weight: 400; }
            #sug-popup .sp-vacio { color: #64748b; font-size: 1rem; padding: 30px 8px; text-align: center; grid-column: 1 / -1; }
            #sug-popup .sp-pie { display: flex; gap: 10px; justify-content: flex-end; align-items: center; padding: 14px 28px; border-top: 1px solid #e2e8f0; }
            #sug-popup .sp-pie .sp-cuenta { margin-right: auto; color: #64748b; font-size: .9rem; }
            #sug-popup .sp-pie button { padding: 11px 20px; border-radius: 9px; border: 1px solid #cbd5e1; background: #f8fafc; cursor: pointer; font-weight: 600; font-size: 1rem; }
            #sug-popup .sp-pie button.sp-si { background: #0d5c63; border-color: #0d5c63; color: #fff; }
            #sug-popup .sp-pie button.sp-quitar { background: #b91c1c; border-color: #b91c1c; color: #fff; }
            #sug-popup .sp-pie button:disabled { opacity: .5; cursor: default; }
            /* aviso de ✕ (también grande) */
            #sug-popup .sp-caja.sp-conf { min-height: 0; max-height: 90vh; width: 96vw; max-width: 1100px; }
            #sug-popup .sp-conf .sp-cuerpo { padding: 8px 28px 22px; overflow: auto; }
            #sug-popup .sp-conf .sp-plato { border: 1px solid #fecaca; background: #fef2f2; border-radius: 12px; padding: 18px 22px; display: flex; gap: 18px; align-items: baseline; }
            #sug-popup .sp-conf .sp-plato .sp-nom { font-size: 1.25rem; }
            #sug-popup .sp-conf .sp-plato .sp-nom small { font-size: .95rem; }
            #sug-popup .sp-conf .sp-plato .sp-pre { font-size: 1.2rem; }
            #sug-popup .sp-conf ul { margin: 18px 0 0; padding-left: 22px; color: #334155; font-size: 1rem; line-height: 1.6; }
            #sug-aviso { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); z-index: 10060; padding: 9px 16px; border-radius: 8px; color: #fff; font: 600 .85rem 'Montserrat', sans-serif; box-shadow: 0 6px 20px rgba(0,0,0,.25); }
            @media print { body { -webkit-print-color-adjust: exact !important; } .sugerencias-controles-box, .sugerencias-debug-a4, .sug-ed { display: none !important; } }
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

    // =====================================================================================
    // 21 nov (3.3.0): EDITAR LA LISTA DESDE LA HOJA — ✕ a la izquierda de cada plato y ➕ en cada sección.
    // La hoja enseña los platos ACTIVOS de Sugerencias, así que:
    //   ✕ = desactivar el plato (sale de la hoja y de la pestaña Sugerencias de la web; NO se borra).
    //   ➕ = ventana con los platos YA CREADOS de esa sección que no están en la hoja → activarlos.
    // Se guarda solo (POST ?accion=sugerencias {activar, desactivar}: almacen-json 1.19.0 cambia solo
    // esos platos sobre lo último de GitHub). Si el editor tiene otros cambios sin guardar, el cambio
    // se queda en el editor y va con "GUARDAR CAMBIOS EN WEB" (ese guardado lleva "activa" de todos).
    // =====================================================================================
    const vistaEdicion = {};   // modo -> secciones de la última hoja pintada (con .lista y .cand)
    const escSug = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const nombreCortoSug = (t) => { try { return window.desglosarNombre(t || '').nombre || String(t || '').trim(); } catch (e) { return String(t || '').replace(/\s*\/\/.*$/, '').trim(); } };
    function sinBotonesEdicion(panel) {
        const c = panel.cloneNode(true);
        c.querySelectorAll('.sug-ed').forEach(b => b.remove());
        return c.outerHTML;
    }
    function avisoSug(texto, color, ms) {
        let a = document.getElementById('sug-aviso');
        if (!a) { a = document.createElement('div'); a.id = 'sug-aviso'; document.body.appendChild(a); }
        a.textContent = texto; a.style.background = color || '#0d5c63'; a.style.display = '';
        clearTimeout(a._t);
        if (ms !== 0) a._t = setTimeout(() => { a.style.display = 'none'; }, ms || 3500);
    }
    function repintarTrasCambio(modo) {
        if (typeof window.renderCarta === 'function') window.renderCarta(modo);
        try { if (typeof window.renderizar === 'function' && (window.currentMode || modo) === modo) window.renderizar(); } catch (e) { console.warn('[sugerencias] renderizar:', e); }
    }
    function ponerActiva(modo, id, valor, antes) {
        (window.datosLocales || []).forEach(p => { if (p && parseInt(p.id, 10) === id) { if (antes && !(id in antes)) antes[id] = !!p.activa; p.activa = valor; } });
        const st = window.optimisticState && window.optimisticState[modo];
        if (st && st.s && st.s.length) {
            st.s.forEach(p => { if (p && parseInt(p.id, 10) === id) p.activa = valor; });
            try { sessionStorage.setItem('optState_' + modo, JSON.stringify(st)); } catch (e) { }
        }
    }
    // 22 nov (3.4.0): los cambios de ✕ / ➕ quedan PENDIENTES (en el editor) hasta «✔ Aplicar y guardar en la web»:
    // así varios cambios = UN guardado = UNA posición en el historial de Sugerencias.
    const pendientesSug = {};   // modo -> { id: activa ORIGINAL (antes del primer cambio) }
    const pendientes = (modo) => (pendientesSug[modo] = pendientesSug[modo] || {});
    function cambiarSugerencias(modo, activar, desactivar) {
        const antes = {}, set = platosExcluidosSugerencias[modo], pend = pendientes(modo);
        activar.forEach(id => { ponerActiva(modo, id, true, antes); if (set) set.delete(id); });
        desactivar.forEach(id => ponerActiva(modo, id, false, antes));
        activar.concat(desactivar).forEach(id => {
            if (!(id in antes)) return;
            if (!(id in pend)) pend[id] = antes[id];
            const ahora = activar.includes(id);
            if (pend[id] === ahora) delete pend[id];   // vuelve a como estaba guardado: ya no es cambio
        });
        repintarTrasCambio(modo);
    }
    function nombrePorId(id) { const p = (window.datosLocales || []).find(x => x && parseInt(x.id, 10) === id); return p ? nombreCortoSug(p.es) : String(id); }
    function barraPendientesHtml(modo) {
        const pend = pendientes(modo), ids = Object.keys(pend).map(Number);
        if (!ids.length) return '';
        const lista = ids.map(id => (pend[id] ? '− ' : '+ ') + escSug(nombrePorId(id))).join(' · ');
        return `<div class="sug-pendientes" style="position:sticky; top:0; z-index:40; max-width:1100px; margin:0 auto 10px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:10px 14px; border-radius:10px; background:#fff7ed; border:1px solid #fdba74; box-shadow:0 4px 14px rgba(0,0,0,.08); font-family:'Montserrat',sans-serif;">
            <b style="color:#c2410c; white-space:nowrap;">✏️ ${ids.length} cambio${ids.length > 1 ? 's' : ''} sin guardar en la hoja</b>
            <span style="flex:1; min-width:200px; font-size:.8rem; color:#7c2d12;">${lista}</span>
            <button type="button" onclick="window.sugDeshacer('${modo}')" style="padding:7px 12px; border-radius:8px; border:1px solid #cbd5e1; background:#f8fafc; cursor:pointer; font-weight:600;">↶ Deshacer</button>
            <button type="button" class="sug-aplicar" onclick="window.sugAplicar('${modo}')" style="padding:7px 14px; border-radius:8px; border:1px solid #0d5c63; background:#0d5c63; color:#fff; cursor:pointer; font-weight:700;">✔ Aplicar y guardar en la web</button></div>`;
    }
    window.sugDeshacer = function(modo) {
        const pend = pendientes(modo);
        Object.keys(pend).forEach(k => ponerActiva(modo, parseInt(k, 10), pend[k]));
        pendientesSug[modo] = {};
        repintarTrasCambio(modo);
    };
    let guardandoSug = false;
    window.sugAplicar = async function(modo) {
        if (guardandoSug) return;
        const pend = pendientes(modo), ids = Object.keys(pend).map(Number);
        if (!ids.length) return;
        const on = ids.filter(id => !pend[id]), off = ids.filter(id => pend[id]);
        guardandoSug = true;
        document.querySelectorAll('.sug-aplicar').forEach(b => { b.disabled = true; b.textContent = '⏳ Guardando…'; });
        avisoSug('⏳ Guardando en la web…', '#475569', 0);
        try {
            const url = window.getWebAppUrl(modo);
            if (!url) throw new Error('el editor no tiene dirección de guardado');
            const r = await fetch(url + '?accion=sugerencias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activar: on, desactivar: off }) });
            const tx = await r.text();
            if (!r.ok || !/^OK/.test(tx)) throw new Error(tx || ('HTTP ' + r.status));
            pendientesSug[modo] = {};
            avisoSug('✔ Guardado en la web (' + ids.length + ' cambio' + (ids.length > 1 ? 's' : '') + ')', '#15803d');
            try { if (window.SugHistorial && window.SugHistorial.recargar) window.SugHistorial.recargar(); } catch (e) { }
        } catch (err) {
            const a = document.getElementById('sug-aviso'); if (a) a.style.display = 'none';
            alert('❌ No se pudo guardar la hoja de Sugerencias: ' + err.message + '\n\nLos cambios siguen pendientes: puedes volver a intentarlo.');
        } finally {
            guardandoSug = false;
            repintarTrasCambio(modo);
        }
    };
    window.addEventListener('beforeunload', (e) => {
        if (Object.keys(pendientesSug).some(m => Object.keys(pendientesSug[m]).length)) { e.preventDefault(); e.returnValue = ''; }
    });
    function tarjetaPlato(p, extra) {
        const es = nombreCortoSug(p.es), en = nombreCortoSug(p.en), pre = p.precio ? parseFloat(p.precio).toFixed(2) + '€' : '';
        return `<span class="sp-id">${parseInt(p.id, 10)}</span><span class="sp-nom">${escSug(es || '(sin nombre)')}${en && en !== es ? `<small>${escSug(en)}</small>` : ''}${extra || ''}</span><span class="sp-pre">${pre}</span>`;
    }
    // Ventana grande (fondo oscuro, Esc / clic fuera = cerrar). Devuelve { caja, cerrar }.
    function abrirVentana(html, clase, alCerrar) {
        const viejo = document.getElementById('sug-popup'); if (viejo) viejo.remove();
        const caja = document.createElement('div');
        caja.id = 'sug-popup'; caja.setAttribute('aria-modal', 'true');
        caja.innerHTML = `<div class="sp-caja ${clase || ''}">${html}</div>`;
        document.body.appendChild(caja);
        let hecho = false;
        const cerrar = () => { if (hecho) return; hecho = true; caja.remove(); document.removeEventListener('keydown', tecla, true); if (alCerrar) alCerrar(); };
        function tecla(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(); } }
        document.addEventListener('keydown', tecla, true);
        caja.addEventListener('mousedown', e => { if (e.target === caja) cerrar(); });
        caja.querySelectorAll('.sp-no, .sp-x').forEach(b => b.onclick = cerrar);
        return { caja, cerrar };
    }
    const enGuardadaSug = (modo) => !!(window.SugHistorial && window.SugHistorial.enGuardada && window.SugHistorial.enGuardada(modo));
    window.sugQuitar = function(modo, id) {
        id = parseInt(id, 10);
        const guardada = enGuardadaSug(modo);
        const p = ((guardada ? window.SugHistorial.fuente(modo) : window.datosLocales) || []).find(x => x && parseInt(x.id, 10) === id);
        if (!p) return;
        let si = false;
        const v = guardada ? abrirVentana(`<div class="sp-cab">✕ ¿Quitar este plato de esta hoja GUARDADA?<button type="button" class="sp-x" title="Cerrar (Esc)">×</button></div>
            <div class="sp-cuerpo"><div class="sp-plato">${tarjetaPlato(p)}</div>
            <ul><li>El plato <b>NO se borra</b> ni cambia en la carta de hoy.</li>
            <li>Solo sale de esta hoja guardada. No se guarda hasta que pulses <b>💾 Guardar cambios en esta guardada</b> o <b>✔ Aplicar esta configuración…</b> (barra de arriba).</li></ul></div>
            <div class="sp-pie"><button type="button" class="sp-no">Cancelar</button><button type="button" class="sp-quitar">Sí, quitar de esta hoja</button></div>`, 'sp-conf',
            () => { if (si) window.SugHistorial.quitar(id); }) : abrirVentana(`<div class="sp-cab">✕ ¿Quitar este plato de la hoja de Sugerencias?<button type="button" class="sp-x" title="Cerrar (Esc)">×</button></div>
            <div class="sp-cuerpo"><div class="sp-plato">${tarjetaPlato(p)}</div>
            <ul><li>El plato <b>NO se borra</b>: queda <b>desactivado</b> en la carta.</li>
            <li>Tampoco sale en la pestaña <b>Sugerencias de la web</b>.</li>
            <li>No se guarda hasta que pulses <b>✔ Aplicar y guardar en la web</b> (barra de arriba).</li>
            <li>Lo puedes volver a poner cuando quieras con el <b>➕</b> de su sección.</li></ul></div>
            <div class="sp-pie"><button type="button" class="sp-no">Cancelar</button><button type="button" class="sp-quitar">Sí, quitar de la lista</button></div>`, 'sp-conf',
            () => { if (si) cambiarSugerencias(modo, [], [id]); });
        const b = v.caja.querySelector('.sp-quitar');
        b.onclick = () => { si = true; v.cerrar(); };
        setTimeout(() => b.focus(), 30);
    };
    window.sugAnadir = function(modo, idx) {
        const secs = vistaEdicion[modo], s = secs && secs[idx];
        if (!s) return;
        const excl = platosExcluidosSugerencias[modo] || new Set();
        const titulo = s.titulo.split(' / ')[0];
        const filas = s.cand.map(p => {
            const id = parseInt(p.id, 10);
            const busca = (id + ' ' + nombreCortoSug(p.es) + ' ' + nombreCortoSug(p.en)).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
            return `<label class="sp-pl" data-busca="${escSug(busca)}"><input type="checkbox" value="${id}">${tarjetaPlato(p, p.activa && excl.has(id) ? '<span class="sp-tag">quitado solo de esta impresión</span>' : '')}</label>`;
        }).join('');
        let ids = null;
        const v = abrirVentana(`<div class="sp-cab">➕ Añadir a «${escSug(titulo)}»<small>${enGuardadaSug(modo) ? 'Hoja guardada: platos de la carta de hoy de esta sección que no están en ella' : 'Platos ya creados de esta sección que no están en la hoja'} (${s.cand.length}). Para uno nuevo: ➕ Nuevo plato en el Editor.</small><button type="button" class="sp-x" title="Cerrar (Esc)">×</button></div>
            ${s.cand.length > 6 ? '<input type="search" placeholder="Buscar por nombre o ID…">' : ''}
            <div class="sp-lista">${filas || '<div class="sp-vacio">No hay más platos creados en esta sección: todos están ya en la hoja.</div>'}</div>
            <div class="sp-pie"><span class="sp-cuenta"></span><button type="button" class="sp-no">Cancelar</button>${filas ? '<button type="button" class="sp-si" disabled>Añadir a la hoja</button>' : ''}</div>`, '',
            () => { if (ids && ids.length) { if (enGuardadaSug(modo)) window.SugHistorial.anadir(ids); else cambiarSugerencias(modo, ids, []); } });
        const caja = v.caja, si = caja.querySelector('.sp-si'), cuenta = caja.querySelector('.sp-cuenta');
        const marcados = () => [...caja.querySelectorAll('.sp-lista input:checked')].map(i => parseInt(i.value, 10));
        const contar = () => { if (!si) return; const n = marcados().length; si.disabled = !n; si.textContent = n > 1 ? 'Añadir ' + n + ' a la hoja' : 'Añadir a la hoja'; cuenta.textContent = n ? n + ' marcado' + (n > 1 ? 's' : '') : ''; };
        caja.querySelectorAll('.sp-lista input').forEach(i => i.addEventListener('change', contar));
        const bus = caja.querySelector('input[type=search]');
        if (bus) {
            bus.addEventListener('input', () => {
                const q = bus.value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/\s+/).filter(Boolean);
                caja.querySelectorAll('label.sp-pl').forEach(l => { l.style.display = q.every(w => l.dataset.busca.includes(w)) ? '' : 'none'; });
            });
            bus.addEventListener('keydown', e => {
                if (e.key !== 'Enter') return;
                const vis = [...caja.querySelectorAll('label.sp-pl')].filter(l => l.style.display !== 'none');
                if (vis.length === 1) { const c = vis[0].querySelector('input'); c.checked = !c.checked; contar(); }
            });
            setTimeout(() => bus.focus(), 30);
        }
        if (si) si.onclick = () => { ids = marcados(); if (ids.length) v.cerrar(); };
    };
    window.SugerenciasEdicion = { _vista: (m) => vistaEdicion[m], pendientes: (m) => Object.keys(pendientes(m)).length };

    // MODIFICADO: Ahora recibe 'restaurante001' o 'restaurante002'
    window.toggleQR = function(tipo, modo) {
        const config = SUGERENCIAS_CONFIG[modo];
        if (!config) return;
        const img = document.getElementById(config.qrImgId);
        if (!img) return;
        if (tipo === 'none') { img.style.display = 'none'; window.repartirImagenesVino(modo); reajustarVistaPrevia(modo); return; }
        img.style.display = '';
        img.src = (tipo === 'default') ? config.qrDefault : config.qrMod;
        window.repartirImagenesVino(modo);
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
    // MODIFICADO: un control por imagen ('tenista' / 'canonita'); el QR sigue con toggleQR.
    // Tras cada cambio se recalcula el reparto según cuántas imágenes quedan visibles.
    // NUEVO (3 nov): imágenes de "Vinos y aperitivos": las fijas (El Tenista 12990, Canonita) y,
    // para el resto, la foto principal asignada al plato (Carpeta + Nombre Imagen) — solo en el
    // editor dentro de la web, donde las fotos están en ../imagenes/.
    const FOTOS_WEB_SUGERENCIAS = window.EDITOR_SITIO ? '../imagenes/' : '';
    function imagenesDeVinos(vinos, config) {
        const out = [];
        vinos.forEach(p => {
            const id = parseInt(p.id, 10);
            let src = '';
            if (id === 12990 && config.vinoImagenSrc) src = config.vinoImagenSrc;
            else if (APERITIVO_CANONITA_ID && id === APERITIVO_CANONITA_ID) src = APERITIVO_IMAGEN_CANONITA;
            else if (FOTOS_WEB_SUGERENCIAS && String(p.carpeta || '').trim() && /01\.webp$/i.test(String(p.imagen || ''))) src = FOTOS_WEB_SUGERENCIAS + encodeURI(String(p.carpeta).trim() + '/' + p.imagen);
            if (!src) return;
            let nombre = (window.desglosarNombre ? window.desglosarNombre(p.es || '').nombre : p.es) || ('ID ' + id);
            if (nombre.length > 28) nombre = nombre.slice(0, 26) + '…';
            out.push({ cual: 'p' + id, src, etiqueta: nombre.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) });
        });
        return out;
    }

    window.repartirImagenesVino = function(modo) {
        const config = SUGERENCIAS_CONFIG[modo];
        if (!config) return;
        const wrapper = document.getElementById(config.vinoImagenWrapperId);
        if (!wrapper) return;
        const n = Array.from(wrapper.children).filter(el => el.style.display !== 'none').length;
        wrapper.dataset.n = String(n);
    };
    window.toggleVinoImagen = function(cual, visible, modo) {
        const config = SUGERENCIAS_CONFIG[modo];
        if (!config) return;
        const wrapper = document.getElementById(config.vinoImagenWrapperId);
        if (!wrapper) return;
        const img = wrapper.querySelector('.sugerencias-vino-imagen[data-img="' + cual + '"]');
        if (img) img.style.display = visible ? '' : 'none';
        window.repartirImagenesVino(modo);
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
        // MODIFICADO: escala todas las imágenes (vino + aperitivo) a la misma altura
        wrapper.querySelectorAll('.sugerencias-vino-imagen').forEach(img => { img.style.height = (VINO_IMAGEN_BASE_MAX_HEIGHT * escala) + 'px'; });
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
        // MODIFICADO: se detecta por clase (antes por el texto 'BODEGA' del título, que ya no existe)
        var secBodega = panel.querySelector('.sugerencias-seccion-bodega');
        if (secBodega) alturaBodega = secBodega.getBoundingClientRect().height;

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
        panel.querySelectorAll('.sugerencias-vino-imagen').forEach(function(vinoImgParaCarga) {
            if (vinoImgParaCarga.dataset.cargaFallida === '1') resultado.imagenVinoFalloCarga = true;
        });

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
            resultado.medidas.push(etiqueta + ': ' + alturaMm + 'mm de 267mm (cabecera+alérgenos+vinos/aperitivos: ' + pieFijoMm + 'mm → tope máximo disponible para Entrantes/Principales/Postres: ' + disponibleCategoriasMm + 'mm)');
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

        // NUEVO: con data-texto-primero (hoja de Postres) se reduce antes la letra y solo al final se quitan imagen/QR.
        var textoPrimero = panel.getAttribute('data-texto-primero') === '1';
        function quitarImagenYQr() {
        panel.querySelectorAll('.sugerencias-vino-imagen').forEach(function(vinoImg) {
            if (vinoImg.style.display !== 'none') {
                ocultarPorAjuste(vinoImg);
                resultado.imagenVinoQuitada = true;
            }
        });
        if (medir('Sin imagen vino')) return true;

        var qrImg = panel.querySelector('.sugerencias-qr-img');
        var qrYaEstabaVisible = qrImg && qrImg.style.display !== 'none' && qrImg.offsetHeight > 0;
        if (qrImg) {
            ocultarPorAjuste(qrImg);
            if (qrYaEstabaVisible) resultado.qrQuitado = true;
        }
        if (medir('Sin QR')) return true;
            return false;
        }
        if (!textoPrimero && quitarImagenYQr()) return resultado;

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
            if (sec.classList.contains('sugerencias-seccion-bodega')) return;
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
        if (textoPrimero && !medir('Antes de quitar imagen') && quitarImagenYQr()) return resultado;
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
            if (!sec.classList.contains('sugerencias-seccion-bodega')) secciones.push(sec);
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
            // 20 nov (v3.2.0): ◀ fecha ▶ de sug-historial.js -> la hoja de aquel momento (si no, la de ahora).
            let fuente = (window.SugHistorial && window.SugHistorial.fuente(modo)) || window.datosLocales || [];
            const tieneDatosEnRango = fuente.some(p => p && enSugerencias(p.id)); // 21 nov: también sin ninguna activa (se han quitado todas con ✕: queda el ➕)
            if (tieneDatosEnRango) procesarYRender(fuente, contenedor, config, modo);
            else if (intentos < MAX_INTENTOS) { intentos++; setTimeout(intentarRenderizado, 500); }
            else contenedor.innerHTML = `<div class="p-4 text-center text-slate-500 italic">Esperando origen de datos...</div>`;
        }
        intentarRenderizado();
    };

    // 3 nov: rangos de Sugerencias y de sus vinos desde datos.json (categorias.js); si no hay, los fijos.
    const rangoSug = () => (window.Categorias && window.Categorias.rangoSugerencias()) || [12000, 12999];
    const rangoVinosSug = () => (window.Categorias && window.Categorias.rangoVinosSugerencias()) || [12990, 12999];
    const enSugerencias = (id) => { const n = parseInt(id, 10), r = rangoSug(); return n >= r[0] && n <= r[1]; };
    const esVinoSugerencias = (id) => { const n = parseInt(id, 10), r = rangoVinosSug(); return n >= r[0] && n <= r[1]; };
    // 3 nov (v3.0.0): secciones de la hoja = grupos de la pestaña Sugerencias de la web (datos.json ->
    // estructura), en su orden; el grupo "tipo":"vino" es el bloque de vinos/aperitivos (con imágenes).
    // Sin grupos: los rangos fijos de siempre (12100-12399 / 12400-12899 / 12900-12999 + vinos).
    const TITULO_VINOS_SUG = "VINOS Y APERITIVOS RECOMENDADOS / RECOMMENDED WINES & APERITIFS";
    const TITULOS_SUG = { entrantes: "ENTRANTES / STARTERS", principales: "PRINCIPALES / MAIN COURSES", postres: "POSTRES / DESSERTS" };
    function seccionesSugerencias() {
        const g = window.Categorias && window.Categorias.gruposSugerencias ? window.Categorias.gruposSugerencias() : null;
        if (!g || !g.length) return [
            { titulo: TITULOS_SUG.entrantes, rangos: [[12100, 12399]] }, { titulo: TITULOS_SUG.principales, rangos: [[12400, 12899]] },
            { titulo: TITULOS_SUG.postres, rangos: [[12900, 12999]] }, { titulo: TITULO_VINOS_SUG, vino: true, rangos: [] }];
        const sec = g.map(x => {
            const n = x.nombre || {}, es = String(n.ES || '').trim(), en = String(n.EN || '').trim();
            const titulo = x.tipo === 'vino' ? TITULO_VINOS_SUG : (TITULOS_SUG[es.toLowerCase()] || (es.toUpperCase() + (en && en.toLowerCase() !== es.toLowerCase() ? ' / ' + en.toUpperCase() : '')));
            return { titulo, vino: x.tipo === 'vino', rangos: x.rangos || [] };
        });
        if (!sec.some(s => s.vino)) sec.push({ titulo: TITULO_VINOS_SUG, vino: true, rangos: [] });
        return sec;
    }

    function aplicarParcheOptimista(fuente, modo) {
        if (fuente && fuente.__historial) return fuente;   // hoja de otro momento (sug-historial.js): tal cual
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
        const todosLosPlatos = fuente.filter(p => p && p.activa && enSugerencias(p.id));
        const platos = todosLosPlatos.filter(p => !excluidos.has(parseInt(p.id, 10)));
        // NUEVO: aperitivo Canonita ("Usopen Splitz") — ID 12993, ver config.js
        const esAperitivoCanonita = (p) => p && parseInt(p.id, 10) === APERITIVO_CANONITA_ID;
        // 3 nov (v3.0.0): por secciones de la estructura (seccionesSugerencias). Un plato que no cae en
        // ninguna sección va, como siempre, a Entrantes/Principales/Postres por su número (delante).
        let secciones = seccionesSugerencias().map(s => Object.assign(s, { lista: [], cand: [] }));
        const secVino = secciones.find(s => s.vino);
        const fijas = [
            { titulo: TITULOS_SUG.entrantes, rangos: [[12100, 12399]], lista: [], cand: [] }, { titulo: TITULOS_SUG.principales, rangos: [[12400, 12899]], lista: [], cand: [] },
            { titulo: TITULOS_SUG.postres, rangos: [[12900, 12999]], lista: [], cand: [] }];
        // 21 nov: sección de un ID (la misma regla de siempre), para los activos y para los candidatos del ➕.
        const destino = (id) => {
            if (esVinoSugerencias(id)) return secVino;
            const s = secciones.find(x => !x.vino && x.rangos.some(r => id >= r[0] && id <= r[1])) || secciones.find(x => x.rangos.some(r => id >= r[0] && id <= r[1]));
            if (s) return s;
            const fx = fijas.find(y => y.rangos.some(r => id >= r[0] && id <= r[1])) || fijas[0];
            return secciones.find(x => x.titulo === fx.titulo) || fx;
        };
        platos.forEach(p => destino(parseInt(p.id, 10)).lista.push(p));
        // ✕ / ➕ en el editor dentro de la web: en la hoja de AHORA (3.3.0) y, desde 3.5.0, también en las GUARDADAS (◀ ▶).
        const editar = !!(window.EDITOR_SITIO && typeof window.getWebAppUrl === 'function');
        const enGuardada = !!(fuente && fuente.__historial);
        if (editar && !enGuardada) fuente.forEach(p => { if (p && enSugerencias(p.id) && (!p.activa || excluidos.has(parseInt(p.id, 10)))) destino(parseInt(p.id, 10)).cand.push(p); });
        if (editar && enGuardada) {   // candidatos = platos de la carta de HOY (activos o no) que no están en esa hoja guardada
            const enHoja = new Set(fuente.map(p => parseInt(p.id, 10)));
            (window.datosLocales || []).forEach(p => { if (p && enSugerencias(p.id) && !enHoja.has(parseInt(p.id, 10))) destino(parseInt(p.id, 10)).cand.push(p); });
        }
        secciones = fijas.filter(f => (f.lista.length || (editar && f.cand.length)) && !secciones.includes(f)).concat(secciones);
        secciones.forEach((s, i) => { s.idx = i; s.cand.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10)); });
        vistaEdicion[modoSeguro] = editar ? secciones : null;
        const vinos = secVino.lista;

        // MODIFICADO: la hoja A4 real (.sugerencias-panel) ya NO contiene el botón de imprimir ni
        // ninguna opción — así lo que se ve dentro de ella en pantalla es EXACTAMENTE lo que se
        // imprime, sin nada de interfaz mezclado. El botón y las opciones (Imagen Vino, Tamaño,
        // Tipo de QR) se juntan en un box aparte, debajo de la hoja (ver más abajo, sugerencias-controles-box).
        let html = `<div class="sugerencias-panel">
            <div class="sugerencias-debug-a4"></div>
            <div class="sugerencias-header-layout">
                <span class="sugerencias-version-tag" style="display:none;">Módulo ${config.versionStr}</span>
                <div class="sugerencias-brand-title-group"><div class="sugerencias-title-es">SUGERENCIAS DEL CHEF</div><div class="sugerencias-title-en">CHEF'S SUGGESTIONS</div></div>
                ${config.logoSrc ? `<img src="${config.logoSrc}" class="sugerencias-logo-img" onerror="${config.logoFallback ? `this.src='${config.logoFallback}';` : `this.style.display='none';`}">` : ''}
            </div><div class="sugerencias-body">`;

        const renderCat = (titulo, lista, extraHtml = '', claseExtra = '', sec = null) => {
            if (lista.length === 0) return '';
            const botonMas = (editar && sec) ? `<button type="button" class="sug-ed sug-mas" onclick="window.sugAnadir('${modoSeguro}', ${sec.idx})" title="Añadir un plato de esta sección (${sec.cand.length} disponible${sec.cand.length === 1 ? '' : 's'})">+</button>` : '';
            let h = `<div class="sugerencias-seccion${claseExtra ? ' ' + claseExtra : ''}"><div class="sugerencias-seccion-titulo">${botonMas}${titulo}</div>`;
            lista.forEach(p => {
                let iconsHtml = '';
                if (p.alergenos) iconsHtml = '<div class="sugerencias-alergenos">' + p.alergenos.split(',').map(a => `<img src="${PATH_ALERGENOS}${a.trim()}.webp" class="sugerencias-alergeno-icon">`).join('') + '</div>';
                const objEs = window.desglosarNombre(p.es); const objEn = window.desglosarNombre(p.en);
                const esVino = (esVinoSugerencias(p.id) || p.id >= 13000); // MODIFICADO: 12990-12999 = vinos de Sugerencias
                let htmlNombreEs = "", htmlNombreEn = "", htmlExtraEs = "";
                if (esAperitivoCanonita(p)) {
                    // NUEVO: aperitivo — nombre y debajo su línea de explicación (ES y EN)
                    const descEs = objEs.opciones.join(' // ');
                    const descEn = objEn.opciones.join(' // ');
                    htmlNombreEs = `<span class="sugerencias-nombre-es">${objEs.nombre}</span>`;
                    htmlExtraEs = descEs ? `<span class="sugerencias-descripcion-aperitivo">${descEs}</span>` : '';
                    htmlNombreEn = (descEn && descEn !== descEs) ? `<span class="sugerencias-nombre-en">${descEn}</span>` : '';
                }
                else if (esVino) htmlNombreEs = objEs.uvas ? `<span class="sugerencias-nombre-es">${objEs.nombre} <span class="sugerencias-detalles-uvas-inline">(${objEs.uvas})</span></span>` : `<span class="sugerencias-nombre-es">${objEs.nombre}</span>`;
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
                // MODIFICADO: los puntitos van del final del nombre ES al precio (1ª línea); EN, descripción y alérgenos debajo.
                const botonQuitar = editar ? `<button type="button" class="sug-ed sug-quitar" onclick="window.sugQuitar('${modoSeguro}', ${parseInt(p.id, 10)})" title="Quitar de la hoja (el plato no se borra)">✕</button>` : '';
                h += `<div class="sugerencias-plato sugerencias-plato-col">${botonQuitar}<div class="sugerencias-linea1">${htmlNombreEs}<div class="sugerencias-puntos"></div><div class="sugerencias-precio">${precioFormateado}</div></div><div class="sugerencias-plato-resto">${htmlExtraEs}${htmlNombreEn}${iconsHtml}</div></div>`;
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
        const imagenesVino = imagenesDeVinos(vinos, config);
        const tieneVinoEspecial = imagenesVino.length > 0;
        const vinoImagenDefaultCon = !!config.vinoImagenDefault;
        // MODIFICADO: tamaño inicial ya a VINO_IMAGEN_ESCALA_DEFAULT (1.2x) en vez del 1x base,
        // tanto para la botella como para el QR (proporcional, ver QR_IMAGEN_BASE_SIZE). El
        // !important en el QR es necesario para ganarle al width/height !important de su CSS base.
        const vinoImgAlturaInicial = VINO_IMAGEN_BASE_MAX_HEIGHT * VINO_IMAGEN_ESCALA_DEFAULT;
        const qrTamanoInicial = QR_IMAGEN_BASE_SIZE * VINO_IMAGEN_ESCALA_DEFAULT;
        const nImgsIniciales = (vinoImagenDefaultCon ? imagenesVino.length : 0) + (qrInicialOculto ? 0 : 1);
        const vinoImagenHtml = tieneVinoEspecial
            ? `<div class="sugerencias-vino-imagen-wrapper" id="${config.vinoImagenWrapperId}" data-n="${nImgsIniciales}">${imagenesVino.map(im => `<img src="${im.src}" class="sugerencias-vino-imagen" data-img="${im.cual}" style="display:${vinoImagenDefaultCon ? '' : 'none'}; height:${vinoImgAlturaInicial}px;" onerror="this.style.display='none'; window.repartirImagenesVino('${modoSeguro}')">`).join('')}<img src="${initialImgSrc}" class="sugerencias-qr-img" id="${config.qrImgId}" style="width:${qrTamanoInicial}px !important; height:${qrTamanoInicial}px !important; display:${qrInicialOculto ? 'none' : ''};"></div>`
            : '';

        secciones.forEach(s => {
            html += s.vino ? renderCat(s.titulo, s.lista, vinoImagenHtml, 'sugerencias-seccion-bodega', s) : renderCat(s.titulo, s.lista, '', '', s);
        });

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
            imagenesVino.forEach(({ cual, etiqueta }) => {
                const isActive = vinoImagenDefaultCon;
                const style = `cursor: pointer; color: ${isActive ? '#0d5c63' : '#64748b'}; font-weight: ${isActive ? 'bold' : 'normal'};`;
                vinoImagenButtonsHtml += `<label style="${style}"><input type="checkbox" ${isActive ? 'checked' : ''} onchange="this.parentNode.style.fontWeight=this.checked?'bold':'normal';this.parentNode.style.color=this.checked?'#0d5c63':'#64748b';window.toggleVinoImagen('${cual}', this.checked, '${modoSeguro}')"> ${etiqueta}</label>`;
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
                    <label style="font-size:0.75rem; color:#64748b;" title="Solo para imprimir ahora: no se guarda y al recargar vuelve. Para quitarlo de verdad, la ✕ de su izquierda.">Quitar solo de esta impresión (no se guarda):</label>
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
                ${(vinoImagenButtonsHtml || vinoImagenEscalaHtml) ? `<div class="qr-selector-wrapper" style="font-size: 0.75rem; color: #64748b; text-align: center; margin-bottom: 3px; user-select:none; display: flex; flex-direction: row; align-items: center; justify-content: center; flex-wrap: nowrap; gap: 8px; white-space: nowrap;">${vinoImagenButtonsHtml ? `<span class="vino-imagen-selector-wrapper" style="display:flex; align-items:center; gap:8px; padding-right:10px; border-right:1px solid #cbd5e1;">Imágenes: ${vinoImagenButtonsHtml}</span>` : ''}${vinoImagenEscalaHtml ? `<span class="vino-imagen-selector-wrapper" style="display:flex; align-items:center; gap:6px;">Tamaño: ${vinoImagenEscalaHtml}</span>` : ''}</div>` : ''}
                <div class="qr-selector-wrapper" style="font-size: 0.75rem; color: #64748b; text-align: center; margin-bottom: 0; user-select:none; display: flex; flex-direction: row; align-items: center; justify-content: center; flex-wrap: nowrap; gap: 8px; white-space: nowrap;">Tipo de QR: ${qrButtonsHtml}</div>
                ${editar && secciones.some(s => !s.lista.length) ? `<div style="display:flex; align-items:center; justify-content:center; gap:6px; flex-wrap:wrap; margin-top:10px; padding-top:10px; border-top:1px solid #cbd5e1; font-size:0.75rem; color:#64748b;">➕ Sección sin platos en la hoja:${secciones.filter(s => !s.lista.length).map(s => `<button type="button" onclick="window.sugAnadir('${modoSeguro}', ${s.idx})" style="font-size:0.75rem; padding:4px 9px; border-radius:12px; border:1px solid #0d5c63; background:#ecfeff; color:#0d5c63; cursor:pointer;">+ ${s.titulo.split(' / ')[0]} (${s.cand.length})</button>`).join('')}</div>` : ''}
                ${selectorQuitarHtml}
                ${listaQuitadosHtml}
            </div>`;

        contenedor.innerHTML = (editar && !enGuardada ? barraPendientesHtml(modoSeguro) : '') + html + controlesHtml;
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

    // NUEVO (30 oct): el script de ajuste que se inyecta en la ventana de impresión pasa a
    // construirse en una función propia, para poder reutilizarlo tal cual desde la hoja de
    // Postres (postres-print.js) sin duplicar el motor de ajuste a una página A4.
    function construirScriptImpresion() {
        return `
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
        const scriptAjuste = construirScriptImpresion();

        pWin.document.write(`<html><head><title>Sugerencias ${getModoAlias(modo)}</title><style>${styleContent}@media print { #sugerencias-aviso-ajuste { display: none !important; } }</style></head><body>${sinBotonesEdicion(panelReal)}<script>${scriptAjuste}<\/script></body></html>`);
        pWin.document.close();
    };
    // NUEVO (30 oct): motor de ajuste A4 expuesto para la hoja de Postres (postres-print.js),
    // que reutiliza las mismas clases .sugerencias-* y el mismo cálculo — una sola copia.
    window.MotorA4Sugerencias = {
        ajustarYRepartir: ajustarYRepartir,
        mostrarAvisoInline: mostrarAvisoInline,
        posicionarDebugA4: posicionarDebugA4,
        construirScriptImpresion: construirScriptImpresion,
        VINO_IMAGEN_BASE_MAX_HEIGHT: VINO_IMAGEN_BASE_MAX_HEIGHT,
        QR_IMAGEN_BASE_SIZE: QR_IMAGEN_BASE_SIZE,
        VINO_IMAGEN_ESCALAS: VINO_IMAGEN_ESCALAS
    };
})();
