// =========================================================================================
// RESTAURANTE: US OPEN — configuración de la carta (la lee el núcleo, nucleo/v4/script.js).
// Aquí va TODO lo propio de este restaurante. Lo que no esté aquí es común a todos.
//
// Pestañas, rangos y grupos: en datos.json -> "estructura" (los usa la web y el editor; ver
// LEEME.md). Aquí: datos, idiomas, pestaña inicial, notas informativas y miniaturas.
// =========================================================================================


window.RESTAURANTE = {
    id: 'usopen',

    datos: {
        tipo: 'json',
        csv: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSOWewZgqWZEFYiIMh8DTUX5tr6EEXBwvUJGr7hrpkCG91UhE5xU8fDJ12qcRVrT69xfZ5NGGGyhNCE/pub?output=csv',
        vivo: 'https://script.google.com/macros/s/AKfycbweTq3o4NCOeBpZw-s65RgN9N311N5BLd1m9pA6_W9r6M_JdcxBsOrbyR8JLXAG9WbL/exec'
    },

    idiomas: { esenciales: ['ES', 'EN', 'DE', 'FR', 'IT'], rtl: ['AR'] },
    disposicion: 'clasica',
    pestanaInicial: 'sugerencias'

    // Las pestañas de la web ya no van aquí: están en datos.json -> "estructura" -> "pestanas"
    // (las edita el editor; copia local en estructura.json). Ver LEEME.md.
};
