// =========================================
// REPOSITORIO: Web_Editor_Pro_v3 (PRINCIPAL)
// ARCHIVO: ui.js (orquestador)
// Combina ui-core.js + ui-render.js + ui-batch-info.js + ui-batch-nombres.js
// en un único objeto UI global. Si necesitas tocar una función concreta,
// probablemente esté en uno de esos 4 archivos, no aquí.
// =========================================

import { UICore } from './ui-core.js';
import { UIRender } from './ui-render.js';
import { UIBatchInfo } from './ui-batch-info.js';
import { UIBatchNombres } from './ui-batch-nombres.js';
import { UIBatchInfoOtros } from './ui-batch-info-otros.js';
import { UIBatchRevision } from './ui-batch-revision.js';
import { UIBatchAuditoria } from './ui-batch-auditoria.js';
import { UIBatchAuditoriaSeparadores } from './ui-batch-auditoria-separadores.js';

window.APP_VERSIONS = window.APP_VERSIONS || {};
window.APP_VERSIONS.ui = '1.9.0-AUDITORIA-SEPARADORES';

window.APP_VERSIONS.config = window.APP_VERSIONS.config || '2.2.0';
window.APP_VERSIONS.app = window.APP_VERSIONS.app || '1.0.33';

export const UI = {
    ...UICore,
    ...UIRender,
    ...UIBatchInfo,
    ...UIBatchNombres,
    ...UIBatchInfoOtros,
    ...UIBatchRevision,
    ...UIBatchAuditoria,
    ...UIBatchAuditoriaSeparadores
};

// Exponer UI globalmente: necesario porque los onclick="UI...." del HTML (script clásico)
// y switchTab() no pueden acceder a las exportaciones de un <script type="module">.
window.UI = UI;

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        try {
            if (typeof UI.renderRadiosIdiomas === 'function') UI.renderRadiosIdiomas();
            if (typeof UI.inicializarAjustesExpertos === 'function') UI.inicializarAjustesExpertos();
            if (typeof UI.actualizarListaKeys === 'function') UI.actualizarListaKeys();
        } catch (e) {
            console.warn("[Aviso Auto-UI] Interfaz inicializada parcialmente o esperando datos del app.js:", e.message);
        }
    }, 150);
});
