// =========================================================================================
// RESTAURANTE: CAN MARCH — configuración de la carta (la lee el núcleo, nucleo/v4/script.js).
// Web creada desde la PLANTILLA NEUTRA (sitio.json "marca"): logos y QR se suben desde el
// editor (🏷️ Logos y QR) y van en datos.json -> "marca".
// Pestañas, rangos y grupos: en datos.json -> "estructura". Aquí: datos, idiomas, pestaña
// inicial y notas informativas.
// =========================================================================================

window.RESTAURANTE = {
    id: 'canmarch',

    datos: { tipo: 'json' },

    idiomas: { esenciales: ['ES', 'EN', 'DE', 'FR', 'IT'], rtl: ['AR'] },
    disposicion: 'clasica',
    pestanaInicial: 'entrantes',

    // Filas que no son platos sino avisos: centradas, a todo el ancho y sin precio.
    notasInformativas: [1199, 3901],

    miniaturas: {}
};
