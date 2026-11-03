// --- postres-print.js ---
// NUEVO (30 oct): hoja imprimible A4 de POSTRES, una por restaurante (RG / US Open).
// NO sale en la web pública: usa el rango de IDs 16000-16299, que no corresponde a ninguna
// categoría de la web (isItemInCategory solo reconoce las pestañas reales).
//   16000-16099  Postres              -> lista normal (nombre, detalle "//...//", alérgenos, precio)
//   16100-16199  Helados (sabores)    -> UN bloque "Helados artesanos" con los sabores activos + foto
//   16200-16299  Bebidas para acompañar -> lista + imágenes de botella opcionales (+ QR)
// Cada elemento se muestra solo si está ACTIVO en el editor (el mismo interruptor de siempre).
// Reutiliza las clases .sugerencias-* y el motor de ajuste a una página de sugerencias-print.js
// (window.MotorA4Sugerencias) para no duplicar el cálculo.
(function () {
    'use strict';

    window.APP_VERSIONS = window.APP_VERSIONS || {};
    window.APP_VERSIONS.postres_print = '1.8.5'; // 3 nov: rangos desde datos.json (categorias.js). 1.8.4: marco con más aire lateral. 1.8.3: sabor con descripción: ES+descripción en 1ª línea, inglés debajo. 1.8.2: descripción //..// también en sabores de helado. 1.8.1: pantalla = impresión (neutraliza styles.css), hoja centrada con márgenes "Ninguno". 1.8.0: puntitos a todo el ancho en helados, tarro centrado con los sabores, sin "Todos / All", logo mayor. 1.7.0: inglés en 1 línea + alérgenos comunes de helados una sola vez. 1.6.1: // botella+copa agrupadas y solapadas. 1.6.0: // varias imágenes por bebida (botella + copa). 1.5.0: // bebidas en una sola línea. 1.4.0: // puntitos desde el nombre ES. 1.3.3: // marco separado de los bordes del A4 // marco de dos hojas superpuestas. 1.2.0: // alérgenos de sabores en línea con el nombre. 1.1.0: // helado más pequeño, escala por botella, alérgenos como el editor

    // 3 nov: rangos de la categoría "hoja-postres" de datos.json (categorias.js); si no hay, config.js.
    const rangos = () => (window.Categorias && window.Categorias.rangosHojaPostres()) || POSTRES_HOJA_RANGOS;
    const enRango = (id, r) => id >= r[0] && id <= r[1];

    const POSTRES_CONFIG = {
        restaurante001: {
            containerId: 'postres-contenido',
            logoSrc: LOGO_RESTAURANTE001,
            qrImgId: 'img-qr-postres-rg',
            qrRadioName: 'qr-mode-postres-rg',
            qrDefault: QR_RESTAURANTE001_DEFAULT,
            qrMod: QR_RESTAURANTE001_MOD,
            qrTipoDefault: POSTRES_QR_TIPO_DEFAULT_RESTAURANTE001,
            bebidasWrapperId: 'postres-bebidas-img-rg'
        },
        restaurante002: {
            containerId: 'postres-contenido-usopen',
            logoSrc: LOGO_RESTAURANTE002,
            qrImgId: 'img-qr-postres-usopen',
            qrRadioName: 'qr-mode-postres-usopen',
            qrDefault: QR_RESTAURANTE002_DEFAULT,
            qrMod: QR_RESTAURANTE002_MOD,
            qrTipoDefault: POSTRES_QR_TIPO_DEFAULT_RESTAURANTE002,
            bebidasWrapperId: 'postres-bebidas-img-usopen'
        }
    };

    if (!document.getElementById('postres-print-styles')) {
        const st = document.createElement('style');
        st.id = 'postres-print-styles';
        st.innerHTML = `
            #postres-contenido, #postres-contenido-usopen { overflow-x: auto; }
            .postres-detalle-es { font-size: 0.75em !important; color: #555 !important; font-style: italic !important; font-weight: 400 !important; }
            .postres-detalle-en { font-size: 0.7em !important; color: #94a3b8 !important; font-style: italic !important; }
            .postres-helados-bloque { display: flex !important; align-items: center !important; gap: 18px !important; }
            .postres-helados-info { flex: 1 1 auto !important; display: flex !important; flex-direction: column !important; }
            .postres-helados-cabecera { width: 100% !important; margin-bottom: 2px !important; }
            .postres-helados-cabecera .sugerencias-plato { margin-bottom: 2px !important; }
            .postres-plato { flex-direction: column !important; align-items: stretch !important; }
            .postres-plato-linea1 { display: flex !important; align-items: baseline !important; width: 100% !important; }
            .postres-plato-linea1 .sugerencias-nombre-es { flex: 0 1 auto !important; }
            .postres-bebida-nombre { display: inline-flex !important; flex-wrap: wrap !important; align-items: baseline !important; column-gap: 6px !important; flex: 0 1 auto !important; }
            .postres-bebida-nombre .sugerencias-alergenos { margin-top: 0 !important; align-self: center !important; }
            .postres-bebida-sep { color: #94a3b8 !important; font-size: 0.8em !important; }
            .postres-en-linea { display: inline !important; }
            .postres-en-linea .postres-bebida-sep { margin: 0 5px !important; }
            .postres-helados-comunes { margin-bottom: 6px !important; }
            .postres-plato-resto { display: flex !important; flex-direction: column !important; max-width: 88% !important; }
            .postres-helados-sub { font-size: 0.75em !important; color: #0d5c63 !important; font-style: italic !important; margin-bottom: 6px !important; }
            .postres-sabores { display: grid !important; grid-template-columns: 1fr 1fr !important; column-gap: 14px !important; row-gap: 4px !important; }
            .postres-sabor { display: flex !important; flex-direction: column !important; justify-content: center !important; padding-left: 10px !important; border-left: 3px solid #f3c9a8 !important; }
            .postres-sabor .sugerencias-nombre-es { font-size: 0.82em !important; }
            .postres-sabor .sugerencias-nombre-en { font-size: 0.72em !important; }
            .postres-sabor-det { line-height: 1.15 !important; }
            .postres-sabor-linea { display: flex !important; flex-wrap: wrap !important; align-items: center !important; column-gap: 6px !important; }
            .postres-sabor-linea .sugerencias-alergenos { margin-top: 0 !important; }
            .postres-sabor .sugerencias-alergeno-icon { width: 16px !important; height: 16px !important; }
            .postres-bebidas-bloque { display: flex !important; align-items: center !important; gap: 14px !important; }
            .postres-bebidas-lista { flex: 1 1 auto !important; display: flex !important; flex-direction: column !important; }
            .postres-bebidas-bloque .sugerencias-vino-imagen-wrapper, .postres-bebidas-bloque .sugerencias-vino-imagen-wrapper[data-n] { flex: 0 0 auto !important; padding: 0 !important; gap: 10px !important; justify-content: flex-end !important; align-items: flex-end !important; }
            .postres-bebida-grupo { display: flex !important; align-items: flex-end !important; }
            .postres-bebida-grupo .sugerencias-vino-imagen + .sugerencias-vino-imagen { margin-left: -12px !important; position: relative; }
            /* Marco "dos hojas superpuestas": hoja naranja girada detrás + hoja blanca con borde verde
               delante. Son capas absolutas dentro del panel: no cuentan para el ajuste a una página. */
            .postres-panel { padding: 62px 72px 0 72px !important; overflow: hidden !important; }
            .postres-panel > :not(.postres-hoja-capa):not(.sugerencias-debug-a4) { position: relative; z-index: 1; }
            .postres-hoja-capa { position: absolute !important; pointer-events: none !important; border-radius: 16px !important; z-index: 0 !important; box-sizing: border-box !important; }
            .postres-hoja-fondo { top: 34px; left: 44px; right: 44px; bottom: 26px; background: #e05a2b !important; transform: rotate(-1.4deg); }
            .postres-hoja-frente { top: 28px; left: 52px; right: 52px; bottom: 36px; background: #ffffff !important; border: 3px solid #0d4d3a !important; }
            .postres-panel .sugerencias-footer { padding-bottom: 54px !important; }
            .postres-panel .sugerencias-logo-img { width: 120px !important; }
            .postres-panel .sugerencias-header-layout { margin-bottom: 8px !important; }
            .postres-panel .sugerencias-title-en { color: #0d4d3a !important; font-weight: 700 !important; }
            .postres-helado-img { flex: 0 0 auto !important; height: 80px; width: auto; object-fit: contain !important; }
        `;
        document.head.appendChild(st);
    }

    // Elementos quitados A MANO de esta hoja (no toca "activa" ni el Excel; se pierde al recargar).
    const excluidos = { restaurante001: new Set(), restaurante002: new Set() };
    // Estado de las opciones de imagen (se conserva entre re-renderizados de la misma sesión).
    const estado = {
        restaurante001: { heladoImg: POSTRES_HELADO_IMAGEN_DEFAULT, bebidasImg: {}, escala: VINO_IMAGEN_ESCALA_DEFAULT, qr: POSTRES_QR_TIPO_DEFAULT_RESTAURANTE001 },
        restaurante002: { heladoImg: POSTRES_HELADO_IMAGEN_DEFAULT, bebidasImg: {}, escala: VINO_IMAGEN_ESCALA_DEFAULT, qr: POSTRES_QR_TIPO_DEFAULT_RESTAURANTE002 }
    };

    const motor = () => window.MotorA4Sugerencias;
    const rerender = (modo) => window.renderHojaPostres(modo);

    window.quitarElementoPostres = function (id, modo) { excluidos[modo].add(parseInt(id, 10)); rerender(modo); };
    window.devolverElementoPostres = function (id, modo) { excluidos[modo].delete(parseInt(id, 10)); rerender(modo); };
    window.restaurarTodosPostres = function (modo) { excluidos[modo].clear(); rerender(modo); };

    window.setOpcionPostres = function (modo, clave, valor, extra) {
        const e = estado[modo]; if (!e) return;
        if (clave === 'bebidaImg') e.bebidasImg[extra] = !!valor; else e[clave] = valor;
        rerender(modo);
    };

    function reajustar(modo) {
        const c = document.getElementById(POSTRES_CONFIG[modo].containerId);
        const panel = c && c.querySelector('.sugerencias-panel');
        if (!panel || !motor()) return;
        motor().ajustarYRepartir(panel).then(r => motor().mostrarAvisoInline(c, panel, r));
    }
    window.reajustarHojaPostres = reajustar;

    // Mismo criterio que el editor (app.js): "1 GLUTEN" / "gluten" -> "GLUTEN"
    function codigosAlergenos(p) {
        if (!p || !p.alergenos) return [];
        return String(p.alergenos).split(/[,;]/).map(a => a.trim().toUpperCase().split(' ').pop()).filter(a => a && a !== 'NINGUNO' && a !== '0');
    }
    function iconosHtml(codigos) {
        if (!codigos.length) return '';
        return '<div class="sugerencias-alergenos">' + codigos.map(a => `<img src="${PATH_ALERGENOS}${a}.webp" class="sugerencias-alergeno-icon" title="${a}">`).join('') + '</div>';
    }
    function iconosAlergenos(p) { return iconosHtml(codigosAlergenos(p)); }
    const precio = (v) => (parseFloat(v) || 0).toFixed(2) + '€';

    function lineaConPrecio(nombreHtml, precioTxt, restoHtml) {
        return `<div class="sugerencias-plato postres-plato"><div class="postres-plato-linea1">${nombreHtml}${precioTxt ? `<div class="sugerencias-puntos"></div><div class="sugerencias-precio">${precioTxt}</div>` : ''}</div>${restoHtml ? `<div class="postres-plato-resto">${restoHtml}</div>` : ''}</div>`;
    }

    // NUEVO (1.5.0): bebidas en UNA sola línea -> "Can Axartell Dolç · Vino dulce · Sweet wine ....... 4,50€"
    // (detalle ES/EN entre "//" en la hoja, igual que en los postres; alérgenos al final de la línea).
    function filaBebida(p) {
        const es = window.desglosarNombre(p.es || ''), en = window.desglosarNombre(p.en || '');
        const detEs = es.opciones.join(' / '), detEn = en.opciones.join(' / ');
        const textoEn = detEn || (en.nombre && en.nombre.toLowerCase() !== es.nombre.toLowerCase() ? en.nombre : '');
        const nombre = `<span class="postres-bebida-nombre"><span class="sugerencias-nombre-es">${es.nombre}</span>` +
            (detEs ? `<span class="postres-bebida-sep">·</span><span class="postres-detalle-es">${detEs}</span>` : '') +
            (textoEn && textoEn !== detEs ? `<span class="postres-bebida-sep">·</span><span class="sugerencias-nombre-en">${textoEn}</span>` : '') +
            iconosAlergenos(p) + `</span>`;
        return lineaConPrecio(nombre, precio(p.precio), '');
    }

    function filaPlato(p) {
        const es = window.desglosarNombre(p.es || ''), en = window.desglosarNombre(p.en || '');
        const detEs = es.opciones.join(' // '), detEn = en.opciones.join(' // ');
        // MODIFICADO (1.4.0): los puntitos van del nombre en castellano al precio, en la PRIMERA
        // línea; descripción, inglés y alérgenos quedan debajo, a todo el ancho.
        const resto = [];
        if (detEs) resto.push(`<span class="postres-detalle-es">${detEs}</span>`);
        // Inglés (nombre + descripción) en UNA sola línea: "Papua Mango Passion · Mango sphere filled..."
        const enNombre = (en.nombre && en.nombre.toLowerCase() !== es.nombre.toLowerCase()) ? `<span class="sugerencias-nombre-en">${en.nombre}</span>` : '';
        const enDet = (detEn && detEn !== detEs) ? `<span class="postres-detalle-en">${detEn}</span>` : '';
        if (enNombre || enDet) resto.push(`<span class="postres-en-linea">${enNombre}${enNombre && enDet ? '<span class="postres-bebida-sep">·</span>' : ''}${enDet}</span>`);
        // Iconos de alérgenos en la MISMA línea que el último texto (ahorra una línea por postre)
        const iconos = iconosAlergenos(p);
        if (iconos) resto.push(resto.length ? `<div class="postres-sabor-linea">${resto.pop()}${iconos}</div>` : iconos);
        return lineaConPrecio(`<span class="sugerencias-nombre-es">${es.nombre}</span>`, precio(p.precio), resto.join(''));
    }

    window.renderHojaPostres = function (modo) {
        const config = POSTRES_CONFIG[modo];
        const contenedor = config && document.getElementById(config.containerId);
        if (!contenedor) return;
        let intentos = 0;
        (function intentar() {
            const fuente = window.datosLocales || [];
            const hayDatos = fuente.length > 0 && !!motor();
            if (hayDatos) procesarYRender(fuente, contenedor, config, modo);
            else if (intentos++ < 10) setTimeout(intentar, 500);
            else contenedor.innerHTML = `<div class="p-4 text-center text-slate-500 italic">Esperando origen de datos...</div>`;
        })();
    };

    function aplicarParcheOptimista(fuente, modo) {
        const st = window.optimisticState ? window.optimisticState[modo] : null;
        if (!st || !st.s || !st.s.length || (Date.now() - st.t) >= CONSISTENCY_WINDOW_MS) return;
        fuente.forEach(item => { if (!item || !item.id) return; const s = st.s.find(x => x.id === item.id); if (s) Object.keys(s).forEach(k => { item[k] = s[k]; }); });
    }

    function procesarYRender(fuente, contenedor, config, modo) {
        aplicarParcheOptimista(fuente, modo);
        const ex = excluidos[modo], est = estado[modo], M = motor();
        const R = rangos(), ID_MIN = R.postres[0], ID_MAX = R.bebidas[1];
        const todos = fuente.filter(p => p && p.activa && parseInt(p.id, 10) >= ID_MIN && parseInt(p.id, 10) <= ID_MAX)
            .sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
        const visibles = todos.filter(p => !ex.has(parseInt(p.id, 10)));
        const postres = visibles.filter(p => enRango(parseInt(p.id, 10), R.postres));
        const helados = visibles.filter(p => enRango(parseInt(p.id, 10), R.helados));
        const bebidas = visibles.filter(p => enRango(parseInt(p.id, 10), R.bebidas));

        let html = `<div class="sugerencias-panel postres-panel" data-texto-primero="1">
            <div class="postres-hoja-capa postres-hoja-fondo"></div><div class="postres-hoja-capa postres-hoja-frente"></div>
            <div class="sugerencias-debug-a4"></div>
            <div class="sugerencias-header-layout">
                <div class="sugerencias-brand-title-group"><div class="sugerencias-title-es">POSTRES</div><div class="sugerencias-title-en">DESSERTS</div></div>
                <img src="${config.logoSrc}" class="sugerencias-logo-img">
            </div><div class="sugerencias-body">`;

        if (postres.length) {
            html += `<div class="sugerencias-seccion"><div class="sugerencias-seccion-titulo">POSTRES / DESSERTS</div>${postres.map(filaPlato).join('')}</div>`;
        }

        // --- Bloque único de helados: un precio + los sabores activos + foto del tarro ---
        if (helados.length) {
            const precios = [...new Set(helados.map(p => (parseFloat(p.precio) || 0).toFixed(2)))];
            const precioUnico = precios.length === 1;
            // Alérgenos COMUNES a todos los sabores: se muestran una sola vez en la cabecera del
            // bloque; en cada sabor solo salen los que tenga de más.
            const codsPorSabor = helados.map(codigosAlergenos);
            const comunes = codsPorSabor.length ? codsPorSabor[0].filter(c => codsPorSabor.every(l => l.includes(c))) : [];
            const sabores = helados.map((p, i) => {
                const dEs = window.desglosarNombre(p.es || ''), dEn = window.desglosarNombre(p.en || '');
                const es = dEs.nombre, en = dEn.nombre;
                const detS = dEs.opciones.join(' // '), detE = dEn.opciones.join(' // ');
                const extraPrecio = precioUnico ? '' : ` <span class="sugerencias-detalles-uvas-inline">${precio(p.precio)}</span>`;
                const extra = iconosHtml(codsPorSabor[i].filter(c => !comunes.includes(c)));
                const enHtml = en && en.toLowerCase() !== es.toLowerCase() ? `<span class="sugerencias-nombre-en">${en}</span>` : '';
                const nomEs = `<span class="sugerencias-nombre-es">${es}${extraPrecio}</span>`;
                if (detS || detE) {
                    // Con descripción: castellano + su descripción en la 1ª línea; inglés (+ su descripción) en la 2ª
                    const l1 = `${nomEs}${detS ? `<span class="postres-detalle-es">${detS}</span>` : ''}${extra}`;
                    const l2 = (enHtml || detE) ? `<div class="postres-sabor-linea">${enHtml}${detE ? `<span class="postres-detalle-en">${detE}</span>` : ''}</div>` : '';
                    return `<div class="postres-sabor"><div class="postres-sabor-linea">${l1}</div>${l2}</div>`;
                }
                // Sin descripción: una sola línea castellano · inglés + alérgenos propios
                return `<div class="postres-sabor"><div class="postres-sabor-linea">${nomEs}${enHtml}${extra}</div></div>`;
            }).join('');
            const comunesHtml = comunes.length ? iconosHtml(comunes) : '';
            const imgHelado = est.heladoImg && POSTRES_HELADO_IMAGEN
                ? `<img src="${POSTRES_HELADO_IMAGEN}" class="postres-helado-img" style="height:${Math.round(POSTRES_HELADO_ALTURA * est.escala)}px;" onerror="this.style.display='none'">` : '';
            html += `<div class="sugerencias-seccion"><div class="sugerencias-seccion-titulo">HELADOS / ICE CREAM</div>
                <div class="postres-helados-cabecera">${lineaConPrecio(`<span class="sugerencias-nombre-es">${POSTRES_HELADOS_TITULO_ES}</span>`, precioUnico ? precio(precios[0]) : '', `<span class="sugerencias-nombre-en">${POSTRES_HELADOS_TITULO_EN}</span>`)}</div>
                <div class="postres-sabor-linea postres-helados-sub"><span>${POSTRES_HELADOS_SUBTITULO_ES} \u00b7 ${POSTRES_HELADOS_SUBTITULO_EN}</span>${comunesHtml}</div>
                <div class="postres-helados-bloque"><div class="postres-helados-info"><div class="postres-sabores">${sabores}</div></div>${imgHelado}</div></div>`;
        }

        // --- Bebidas para acompañar (+ imágenes de botella y QR en la misma fila) ---
        const qrOculto = est.qr === 'none';
        const qrSrc = est.qr === 'default' ? config.qrDefault : config.qrMod;
        const alto = POSTRES_BEBIDAS_ALTURA * est.escala, qrTam = M.QR_IMAGEN_BASE_SIZE * est.escala;
        // Admite 'ruta.webp' o { src, escala } (escala relativa a la altura base: 0.75 = 3/4)
        // Admite 'ruta.webp', { src, escala } o una LISTA de ellos (p. ej. botella + copa).
        const norm = (v) => typeof v === 'string' ? { src: v, escala: 1 } : { src: v.src, escala: v.escala || 1 };
        const imgDe = (id) => { const v = POSTRES_BEBIDAS_IMAGENES[id]; return !v ? null : (Array.isArray(v) ? v.map(norm) : [norm(v)]); };
        const conImagen = bebidas.filter(p => imgDe(parseInt(p.id, 10)));
        const imgVisible = (id) => est.bebidasImg[id] !== undefined ? est.bebidasImg[id] : POSTRES_BEBIDAS_IMAGEN_DEFAULT;
        const qrHtml = `<img src="${qrSrc}" class="sugerencias-qr-img" id="${config.qrImgId}" style="width:${qrTam}px !important; height:${qrTam}px !important; display:${qrOculto ? 'none' : ''};">`;
        if (bebidas.length) {
            const imgs = conImagen.map(p => { const id = parseInt(p.id, 10); return `<span class="postres-bebida-grupo">` + imgDe(id).map(im => `<img src="${im.src}" class="sugerencias-vino-imagen" style="display:${imgVisible(id) ? '' : 'none'}; height:${Math.round(alto * im.escala)}px;">`).join('') + `</span>`; }).join('');
            const nVis = conImagen.filter(p => imgVisible(parseInt(p.id, 10))).reduce((n, p) => n + imgDe(parseInt(p.id, 10)).length, 0) + (qrOculto ? 0 : 1);
            // Botellas (y QR) a la DERECHA de la lista, no debajo: ocupa mucho menos alto.
            html += `<div class="sugerencias-seccion sugerencias-seccion-bodega"><div class="sugerencias-seccion-titulo">PARA ACOMPAÑAR / PAIRING SUGGESTIONS</div>
                <div class="postres-bebidas-bloque"><div class="postres-bebidas-lista">${bebidas.map(filaBebida).join('')}</div>
                ${nVis > 0 ? `<div class="sugerencias-vino-imagen-wrapper" id="${config.bebidasWrapperId}" data-n="${nVis}">${imgs}${qrHtml}</div>` : ''}</div></div>`;
        }

        html += `</div><div class="sugerencias-footer">
                <div class="sugerencias-advertencia-alergenos">Si usted tiene algún tipo de alergia alimentaria, por favor comuníquelo a nuestro personal.<br>If you have any food allergies, please inform our staff.</div>
                ${bebidas.length ? '' : `<div class="sugerencias-qr-container">${qrHtml}</div>`}
            </div></div>`;

        // --- Controles (fuera de la hoja A4) ---
        const lbl = (activo) => `cursor:pointer; color:${activo ? '#0d5c63' : '#64748b'}; font-weight:${activo ? 'bold' : 'normal'};`;
        const fila = (contenido) => `<div class="qr-selector-wrapper" style="font-size:0.75rem; color:#64748b; display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:8px; margin-bottom:6px; user-select:none;">${contenido}</div>`;
        let imagenesCtl = '';
        if (helados.length && POSTRES_HELADO_IMAGEN) imagenesCtl += `<label style="${lbl(est.heladoImg)}"><input type="checkbox" ${est.heladoImg ? 'checked' : ''} onchange="window.setOpcionPostres('${modo}','heladoImg',this.checked)"> Helado</label>`;
        conImagen.forEach(p => { const id = parseInt(p.id, 10); const on = imgVisible(id); imagenesCtl += `<label style="${lbl(on)}"><input type="checkbox" ${on ? 'checked' : ''} onchange="window.setOpcionPostres('${modo}','bebidaImg',this.checked,${id})"> ${window.desglosarNombre(p.es).nombre}</label>`; });
        const escalaCtl = M.VINO_IMAGEN_ESCALAS.map(x => `<label style="${lbl(x === est.escala)}"><input type="radio" name="postres-escala-${modo}" ${x === est.escala ? 'checked' : ''} onchange="window.setOpcionPostres('${modo}','escala',${x})"> ${x}x</label>`).join('');
        const qrCtl = [['none', 'Sin QR'], ['default', 'Oficial'], ['mod', 'Alternativo']].map(([v, t]) => `<label style="${lbl(v === est.qr)}"><input type="radio" name="${config.qrRadioName}" ${v === est.qr ? 'checked' : ''} onchange="window.setOpcionPostres('${modo}','qr','${v}')"> ${t}</label>`).join('');

        const nombreCorto = (p) => window.desglosarNombre(p.es).nombre || p.es || ('#' + p.id);
        const quitarCtl = visibles.length ? `<div class="sugerencias-selector-quitar-plato" style="display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap; margin-top:10px; padding-top:10px; border-top:1px solid #cbd5e1;">
                <label style="font-size:0.75rem; color:#64748b;">Quitar de esta hoja:</label>
                <select id="select-quitar-postres-${modo}" style="font-size:0.8rem; padding:4px 6px; border-radius:5px; border:1px solid #cbd5e1; max-width:220px;">${visibles.map(p => `<option value="${p.id}">${nombreCorto(p)}</option>`).join('')}</select>
                <button type="button" onclick="window.quitarElementoPostres(document.getElementById('select-quitar-postres-${modo}').value, '${modo}')" style="font-size:0.75rem; padding:5px 10px; border-radius:5px; border:1px solid #dc2626; background:#fef2f2; color:#991b1b; cursor:pointer;">Quitar</button></div>` : '';
        const quitados = todos.filter(p => ex.has(parseInt(p.id, 10)));
        const quitadosCtl = quitados.length ? `<div style="margin-top:10px; padding-top:10px; border-top:1px solid #cbd5e1; text-align:center;">
                <div style="font-size:0.75rem; color:#64748b; margin-bottom:4px;">Quitados de esta hoja:</div>
                <div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center;">${quitados.map(p => `<span style="font-size:0.75rem; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:12px; padding:3px 8px;">${nombreCorto(p)} <a href="javascript:void(0)" onclick="window.devolverElementoPostres(${p.id}, '${modo}')" style="color:#0d5c63; text-decoration:none; font-weight:700;" title="Devolver a la hoja">↺</a></span>`).join('')}</div>
                <button type="button" onclick="window.restaurarTodosPostres('${modo}')" style="margin-top:6px; font-size:0.7rem; color:#64748b; background:none; border:none; text-decoration:underline; cursor:pointer;">Restaurar todos</button></div>` : '';

        const vacio = todos.length === 0
            ? `<div style="margin-bottom:10px; font-size:0.8rem; color:#92400e; text-align:center;">No hay ningún elemento activo en el rango ${ID_MIN}-${ID_MAX}. Actívalos en el Editor de Carta ("Hoja Postres").</div>` : '';

        const controles = `<div class="sugerencias-controles-box">${vacio}
                <div style="display:flex; gap:8px; margin-bottom:15px;">
                    <button onclick="window.imprimirHojaPostres('${modo}')" class="btn-imprimir-a4" style="margin-bottom:0; flex:1;">🖨️ Imprimir Postres ${getModoAlias(modo)} (A4)</button>
                    <button type="button" onclick="window.reajustarHojaPostres('${modo}')" title="Recalcular ajuste a una página" style="flex:0 0 auto; padding:12px 14px; background:#e2e8f0; color:#334155; border:none; border-radius:8px; font-weight:700; cursor:pointer;">🔄</button>
                </div>
                ${imagenesCtl ? fila('Imágenes: ' + imagenesCtl) : ''}
                ${fila('Tamaño: ' + escalaCtl)}
                ${fila('Tipo de QR: ' + qrCtl)}
                ${quitarCtl}${quitadosCtl}
            </div>`;

        contenedor.innerHTML = html + controles;
        const panel = contenedor.querySelector('.sugerencias-panel');
        M.ajustarYRepartir(panel).then(r => {
            M.mostrarAvisoInline(contenedor, panel, r);
            setTimeout(() => {
                if (contenedor.querySelector('.sugerencias-panel') !== panel) return;
                M.ajustarYRepartir(panel).then(r2 => M.mostrarAvisoInline(contenedor, panel, r2));
            }, 900);
        });
    }

    window.imprimirHojaPostres = function (modo) {
        const config = POSTRES_CONFIG[modo];
        const c = config && document.getElementById(config.containerId);
        const panel = c && c.querySelector('.sugerencias-panel');
        if (!panel || !motor()) return;
        const css = document.getElementById('sugerencias-print-styles').innerHTML + document.getElementById('postres-print-styles').innerHTML;
        const pWin = window.open('', '_blank', 'width=800,height=1000');
        pWin.document.write(`<html><head><title>Postres ${getModoAlias(modo)}</title><style>${css}@media print { #sugerencias-aviso-ajuste { display: none !important; } }@page { size: A4; margin: 0; } body { margin: 0; padding: 15mm 0 0 0; }</style></head><body>${panel.outerHTML}<script>${motor().construirScriptImpresion()}<\/script></body></html>`);
        pWin.document.close();
    };
})();
