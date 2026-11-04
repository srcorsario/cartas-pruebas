// --- state.js ---
// NUEVO: Registro de versión del archivo
window.APP_VERSIONS = window.APP_VERSIONS || {};
window.APP_VERSIONS.state = '1.0.2'; // Versión incrementada por limpieza de URLs movidas a config.js

// Sistema dinámico de API Keys en LocalStorage
function getKeys() {
    const keys = localStorage.getItem('geminiKeys');
    return keys ? JSON.parse(keys) : [];
}

function saveKey(key) {
    const keys = getKeys();
    if (!keys.includes(key)) {
        keys.push(key);
        localStorage.setItem('geminiKeys', JSON.stringify(keys));
    }
}

function deleteKey(key) {
    let keys = getKeys();
    keys = keys.filter(k => k !== key);
    localStorage.setItem('geminiKeys', JSON.stringify(keys));
}

// MODIFICADO: La función getWebAppUrl() y la constante WEB_APP_URL se han trasladado a config.js
