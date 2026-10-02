/**
 * Ruta secreta del formulario de reseñas que va impreso como QR en la etiqueta
 * del producto.
 *
 * No está enlazada desde ninguna parte del sitio y la página se emite con
 * `noindex`, así que solo llega quien escanea la etiqueta. Eso filtra el abuso
 * casual, pero **no es una verificación de compra**: basta que un cliente
 * comparta el link, o que se lea el QR de la foto de un producto publicada en
 * redes, para que la URL circule. Por eso estas reseñas se guardan con
 * `source = 'qr'` y se muestran sin el sello "Verified purchase", que queda
 * reservado para las que nacen de una invitación atada a una orden real.
 *
 * Cambiar este valor invalida los QR ya impresos. Tratarlo como una constante
 * estable, no como un secreto rotable.
 */
export const REVIEW_QR_SLUG = 'wks-sgsmykr0';

export const REVIEW_QR_PATH = `/r/${REVIEW_QR_SLUG}`;
