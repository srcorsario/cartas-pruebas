// =========================================================================================
// RESTAURANTE: RG — configuración de la carta (la lee el núcleo, nucleo/v4/script.js).
// Aquí va TODO lo propio de este restaurante. Lo que no esté aquí es común a todos.
//
// Pestañas, rangos y grupos: en datos.json -> "estructura" (los usa la web y el editor; ver
// LEEME.md). Aquí: datos, idiomas, pestaña inicial, notas informativas y miniaturas.
// =========================================================================================

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

    // Las pestañas de la web ya no van aquí: están en datos.json -> "estructura" -> "pestanas"
    // (las edita el editor; copia local en estructura.json). Ver LEEME.md.

    // Miniatura fija siempre visible en la fila del plato (más adelante: columna "Miniatura").
    miniaturas: {
        12990: 'imagenes/vinos/tenista_pegado.webp',
        12993: { src: 'imagenes/vinos/canonita.webp', clase: 'canonita-inline-thumb' }
    }
};
