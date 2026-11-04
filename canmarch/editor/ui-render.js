// =========================================
// REPOSITORIO: Web_Editor_Pro_v3 (PRINCIPAL)
// ARCHIVO: ui-render.js
// Renderizado de la tabla principal, el selector de idioma y el editor de
// preguntas/respuestas (pestaña QA). Es la parte más "visual"; cambia si se
// retoca el aspecto o el comportamiento de esas pantallas.
// =========================================

import { stateContainer, langState } from './ui-state.js';

export const UIRender = {
    renderRadiosIdiomas: () => {
        const container = document.getElementById('radiosIdiomas');
        if (!container) return;
        let idiomas = window.IDIOMAS_CONFIG || { "EN": "🇬🇧 English", "KO": "🇰🇷 한국어" };
        if (!idiomas.hasOwnProperty("KO")) idiomas["KO"] = "🇰🇷 한국어";
        // CORREGIDO: rejilla de 2 columnas de ancho igual en vez de flex-wrap — con
        // flex-wrap cada botón medía lo que ocupaba su texto, así que las filas
        // quedaban descuadradas entre sí; con grid todos miden lo mismo y alinean.
        let html = '<div class="grid grid-cols-2 gap-1.5">';
        for (const [code, name] of Object.entries(idiomas)) {
            if (code === 'ES') continue;
            const isActive = code === langState.activeLang ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-700 text-slate-300 hover:bg-slate-600';
            html += `<button class="lang-btn text-xs py-1.5 px-2.5 rounded font-semibold transition-all text-left truncate ${isActive}" data-lang="${code}">${name}</button>`;
        }
        html += '</div>';
        container.innerHTML = html;
        container.querySelectorAll('.lang-btn').forEach(btn => {
            btn.onclick = () => {
                langState.activeLang = btn.dataset.lang;
                container.querySelectorAll('.lang-btn').forEach(b => { b.classList.remove('bg-amber-600', 'text-white', 'shadow-md'); b.classList.add('bg-slate-700', 'text-slate-300'); });
                btn.classList.remove('bg-slate-700', 'text-slate-300');
                btn.classList.add('bg-amber-600', 'text-white', 'shadow-md');
                window.UI.renderTable();
            };
        });
    },

    renderTable: () => {
        const tableHeadRow = document.getElementById('tableHeadRow');
        const tablaBody = document.getElementById('tablaBody');
        if (!tableHeadRow || !tablaBody) return;
        if (stateContainer.headers.length === 0) { tableHeadRow.innerHTML = ''; tablaBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-500 italic">Ningún archivo cargado.</td></tr>'; return; }
        const selectedLang = langState.activeLang;
        let idiomas = window.IDIOMAS_CONFIG || { "EN": "🇬🇧 English" };
        const idIdx = stateContainer.headers.findIndex(h => h && h.toUpperCase() === 'ID');
        const esIdx = stateContainer.headers.findIndex(h => h && h.toUpperCase() === 'NOMBRE_ES');
        const langIdx = stateContainer.headers.findIndex(h => h && h.toUpperCase() === `NOMBRE_${selectedLang}`);
        if (idIdx === -1 || esIdx === -1) { tablaBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-500 italic">Estructura CSV no reconocida.</td></tr>'; return; }
        const langName = idiomas[selectedLang] || selectedLang;
        tableHeadRow.innerHTML = `<tr><th style="width: 60px;">Fila</th><th style="width: 70px;">ID</th><th style="width: calc(50% - 65px);">Castellano (ES)</th><th style="width: calc(50% - 65px);">${langName} (${selectedLang})</th></tr>`;
        const rangoInicioEl = document.getElementById('rangoInicio');
        const rangoFinEl = document.getElementById('rangoFin');
        const inicio = rangoInicioEl ? Math.max(0, parseInt(rangoInicioEl.value) - 2) : 0;
        const fin = rangoFinEl ? Math.min(stateContainer.csvData.length, parseInt(rangoFinEl.value) - 1) : stateContainer.csvData.length;
        tablaBody.innerHTML = stateContainer.csvData.slice(inicio, fin).map((row, index) => {
            const rowNum = inicio + index + 2;
            return `<tr><td style="width: 60px; text-align: center;">${rowNum}</td><td style="width: 70px; text-align: center;">${row[idIdx] || ''}</td><td style="width: calc(50% - 65px);">${row[esIdx] || ''}</td><td style="width: calc(50% - 65px);">${langIdx !== -1 ? (row[langIdx] || '') : 'N/A'}</td></tr>`;
        }).join('');

        if (typeof window.UI.renderQA === 'function') window.UI.renderQA();
    },

    // ==========================================
    // EDICIÓN DE PREGUNTAS Y RESPUESTAS (ES / EN)
    // Usa la misma lista cargada (stateContainer) que la pestaña "Traductor Pro".
    // Lee/edita las columnas INFO_ES e INFO_EN (JSON: desc, q1, r1, q2, r2, q3, r3).
    // ==========================================
    renderQA: () => {
        const cont = document.getElementById('qa-lista');
        if (!cont) return; // La pestaña QA no está presente en esta página.

        if (!stateContainer.headers || stateContainer.headers.length === 0 || !stateContainer.csvData || stateContainer.csvData.length === 0) {
            cont.innerHTML = '<p class="text-center py-8 text-slate-500 italic">No hay ninguna lista cargada. Ve a la pestaña "3. Traductor Pro" y carga un CSV o una Google Sheet primero.</p>';
            return;
        }

        const esIdx = stateContainer.headers.findIndex(h => h && h.toUpperCase() === 'NOMBRE_ES');
        const infoEsIdx = stateContainer.headers.findIndex(h => h && h.toUpperCase() === 'INFO_ES');
        const infoEnIdx = stateContainer.headers.findIndex(h => h && h.toUpperCase() === 'INFO_EN');
        const carpetaIdx = stateContainer.headers.findIndex(h => h && h.toUpperCase() === 'CARPETA');

        if (esIdx === -1 || infoEsIdx === -1 || infoEnIdx === -1) {
            cont.innerHTML = '<p class="text-center py-8 text-slate-500 italic">Faltan columnas NOMBRE_ES, INFO_ES o INFO_EN en la lista cargada.</p>';
            return;
        }

        const rangoInicioEl = document.getElementById('rangoInicio');
        const rangoFinEl = document.getElementById('rangoFin');
        const inicio = rangoInicioEl ? Math.max(0, parseInt(rangoInicioEl.value) - 2) : 0;
        const fin = rangoFinEl ? Math.min(stateContainer.csvData.length, parseInt(rangoFinEl.value) - 1) : stateContainer.csvData.length;

        const filtroEl = document.getElementById('qa-filtro');
        const soloConDatosEl = document.getElementById('qa-solo-con-datos');
        const filtroTexto = filtroEl ? filtroEl.value.trim().toLowerCase() : '';
        const mostrarSoloConDatos = soloConDatosEl ? soloConDatosEl.checked : false;

        const parseInfo = (raw) => {
            if (!raw || !raw.trim()) return {};
            try { return JSON.parse(raw); } catch (e) { return { _errorParse: true, _raw: raw }; }
        };

        const filas = stateContainer.csvData
            .map((row, index) => ({ row, index }))
            .slice(inicio, fin)
            .filter(({ row }) => {
                const nombre = (row[esIdx] || '').toLowerCase();
                if (filtroTexto && !nombre.includes(filtroTexto)) return false;
                if (mostrarSoloConDatos) {
                    const tieneEs = row[infoEsIdx] && row[infoEsIdx].trim();
                    const tieneEn = row[infoEnIdx] && row[infoEnIdx].trim();
                    if (!tieneEs && !tieneEn) return false;
                }
                return true;
            });

        if (filas.length === 0) {
            cont.innerHTML = '<p class="text-center py-8 text-slate-500 italic">Ningún plato coincide con el filtro actual.</p>';
            return;
        }

        const CAMPOS = [
            { key: 'desc', label: 'Descripción' },
            { key: 'q1', label: 'Pregunta 1' },
            { key: 'r1', label: 'Respuesta 1' },
            { key: 'q2', label: 'Pregunta 2' },
            { key: 'r2', label: 'Respuesta 2' },
            { key: 'q3', label: 'Pregunta 3 (alérgenos)' },
            { key: 'r3', label: 'Respuesta 3 (alérgenos)' },
        ];

        // Auto-size vertical de un textarea según su contenido (sin scroll interno).
        const autoResize = (ta) => {
            ta.style.height = 'auto';
            ta.style.height = ta.scrollHeight + 'px';
        };

        // Iguala la altura entre el textarea ES y el EN del mismo campo (usa la más alta de las dos).
        const sincronizarCampo = (bodyDiv, key) => {
            const tas = bodyDiv.querySelectorAll(`textarea[data-field="${key}"]`);
            if (tas.length === 0) return;
            tas.forEach(ta => { ta.style.height = 'auto'; });
            let maxH = 0;
            tas.forEach(ta => { maxH = Math.max(maxH, ta.scrollHeight); });
            tas.forEach(ta => { ta.style.height = maxH + 'px'; });
        };

        const sincronizarTodoElCuerpo = (bodyDiv) => {
            CAMPOS.forEach(campo => sincronizarCampo(bodyDiv, campo.key));
        };

        cont.innerHTML = '';

        filas.forEach(({ row, index }) => {
            const nombreEs = row[esIdx] || `(Fila ${index + 2} sin nombre)`;
            const esVinoFila = carpetaIdx !== -1 && (row[carpetaIdx] || '').trim().toLowerCase() === 'vinos';

            // --- Cabecera del acordeón (siempre visible) ---
            const item = document.createElement('div');
            item.className = 'card mb-2';
            item.style.padding = '0';

            const headerBtn = document.createElement('button');
            headerBtn.type = 'button';
            headerBtn.className = 'w-full text-left flex items-center justify-between';
            headerBtn.style.cssText = 'padding:12px 14px; background:transparent; border:none; cursor:pointer; color:inherit;';
            headerBtn.innerHTML = `<span class="font-semibold text-sm">Fila ${index + 2} — ${nombreEs}</span><span class="qa-chevron text-slate-400" style="display:inline-block; transition: transform 0.15s;">▸</span>`;

            const bodyDiv = document.createElement('div');
            bodyDiv.style.display = 'none';
            bodyDiv.style.padding = '0 14px 14px 14px';
            bodyDiv.style.borderTop = '1px solid #334155';

            let construido = false;

            // --- Construcción perezosa del contenido (solo al desplegar por primera vez) ---
            const construirCuerpo = () => {
                const infoEs = parseInfo(row[infoEsIdx]);
                const infoEn = parseInfo(row[infoEnIdx]);

                const guardarEs = () => { row[infoEsIdx] = infoEs._errorParse ? infoEs._raw : (Object.keys(infoEs).length ? JSON.stringify(infoEs) : ''); };
                const guardarEn = () => { row[infoEnIdx] = infoEn._errorParse ? infoEn._raw : (Object.keys(infoEn).length ? JSON.stringify(infoEn) : ''); };

                const buildCol = (obj, guardar, titulo) => {
                    const colDiv = document.createElement('div');
                    const h4 = document.createElement('h4');
                    h4.className = 'text-xs font-bold uppercase text-slate-400 mb-2 pt-3';
                    h4.innerText = titulo;
                    colDiv.appendChild(h4);

                    if (obj._errorParse) {
                        const warn = document.createElement('p');
                        warn.className = 'text-xs mb-1';
                        warn.style.color = '#f87171';
                        warn.innerText = '⚠️ Contenido guardado no es un JSON válido. Edítalo con cuidado:';
                        colDiv.appendChild(warn);
                        const raw = document.createElement('textarea');
                        raw.className = 'input-estandar text-xs w-full';
                        raw.style.cssText = 'overflow:hidden; resize:none; min-height:60px;';
                        raw.value = obj._raw;
                        raw.addEventListener('input', () => { obj._raw = raw.value; guardar(); autoResize(raw); });
                        colDiv.appendChild(raw);
                        return colDiv;
                    }

                    CAMPOS.forEach(campo => {
                        // Los vinos solo llevan descripción (sin preguntas/respuestas).
                        if (esVinoFila && campo.key !== 'desc') return;
                        // q3/r3 solo se muestran si el plato ya los tiene (no todos llevan alérgenos)
                        if ((campo.key === 'q3' || campo.key === 'r3') && obj[campo.key] === undefined) return;
                        const wrap = document.createElement('div');
                        wrap.className = 'mb-2';
                        const lbl = document.createElement('label');
                        lbl.className = 'text-[10px] font-semibold text-slate-400 block mb-0.5';
                        lbl.innerText = campo.label;
                        const txt = document.createElement('textarea');
                        txt.className = 'input-estandar text-xs w-full';
                        txt.dataset.field = campo.key;
                        txt.style.cssText = 'overflow:hidden; resize:none; min-height:30px;';
                        txt.value = obj[campo.key] || '';
                        txt.addEventListener('input', () => {
                            obj[campo.key] = txt.value;
                            guardar();
                            sincronizarCampo(bodyDiv, campo.key);
                        });
                        wrap.appendChild(lbl);
                        wrap.appendChild(txt);
                        colDiv.appendChild(wrap);
                    });
                    return colDiv;
                };

                const grid = document.createElement('div');
                grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-6';
                grid.appendChild(buildCol(infoEs, guardarEs, '🇪🇸 Español'));
                grid.appendChild(buildCol(infoEn, guardarEn, '🇬🇧 Inglés'));
                bodyDiv.appendChild(grid);
            };

            headerBtn.addEventListener('click', () => {
                const abierto = bodyDiv.style.display !== 'none';
                const chevron = headerBtn.querySelector('.qa-chevron');
                if (abierto) {
                    bodyDiv.style.display = 'none';
                    if (chevron) chevron.style.transform = 'rotate(0deg)';
                } else {
                    if (!construido) { construirCuerpo(); construido = true; }
                    bodyDiv.style.display = 'block';
                    if (chevron) chevron.style.transform = 'rotate(90deg)';
                    // El auto-size necesita que el bloque ya sea visible para medir el alto real.
                    requestAnimationFrame(() => sincronizarTodoElCuerpo(bodyDiv));
                }
            });

            item.appendChild(headerBtn);
            item.appendChild(bodyDiv);
            cont.appendChild(item);
        });
    }
};
