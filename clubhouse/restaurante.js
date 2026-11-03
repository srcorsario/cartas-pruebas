// =========================================================================================
// RESTAURANTE: CLUB HOUSE — configuración de la carta (la lee el núcleo, nucleo/v4/script.js).
// Aquí va TODO lo propio de este restaurante. Lo que no esté aquí es común a todos.
//
// Pestañas, rangos y grupos: en datos.json -> "estructura" (los usa la web y el editor; ver
// LEEME.md). Aquí: datos, idiomas, pestaña inicial, notas informativas y miniaturas.
// =========================================================================================

window.RESTAURANTE = {
    id: 'clubhouse',

    datos: {
        tipo: 'json',
        csv: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSpVWFPsuWkDT5wtr5mM8H0JFC8d0ePBCKJxcXDyyfX7M5FOZ1UXUqRrPiOaLeq_tYt9n9-a1iabKPR/pub?output=csv',
        vivo: 'https://script.google.com/macros/s/AKfycbxzwOUB9Bb7HbngjGuvqhDPF0JCQsuOfwnqZNsUBzS6TDTrJjuC3ZTTe0N0sZElu1jXrg/exec'
    },

    idiomas: { esenciales: ['ES', 'EN', 'DE', 'FR', 'IT'], rtl: ['AR'] },
    disposicion: 'clasica',
    pestanaInicial: 'sugerencias',

    // Las pestañas de la web ya no van aquí: están en datos.json -> "estructura" -> "pestanas"
    // (las edita el editor; copia local en estructura.json). Ver LEEME.md.

    // Filas que no son platos sino avisos: centradas, a todo el ancho y sin precio.
    notasInformativas: [1105, 1703, 1705, 2101],

    // Miniatura fija siempre visible en la fila del plato.
    miniaturas: {
        12990: 'imagenes/vinos/tenista_pegado.webp'
    }
};
