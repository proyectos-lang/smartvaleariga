import sharp from "sharp";

/**
 * Procesamiento de imágenes en el servidor (sharp).
 *
 * Los otros dos caminos para generar imágenes en este proyecto:
 *
 * 1. `next/og` (`ImageResponse`) — convierte JSX en PNG desde el servidor.
 *    Es la vía recomendada para la "tarjeta del vale" que se comparte por
 *    WhatsApp: se maqueta con JSX y sale un PNG, sin navegador headless.
 *
 * 2. `html-to-image` — captura un nodo del DOM ya renderizado y lo baja como
 *    PNG desde el navegador. Ver `src/lib/image-cliente.ts`.
 */

export type Formato = "webp" | "png" | "jpeg" | "avif";

export type OpcionesImagen = {
  ancho?: number;
  alto?: number;
  formato?: Formato;
  calidad?: number;
  /** Cómo encajar la imagen si se dan ancho y alto. */
  ajuste?: "cover" | "contain" | "inside";
};

type Entrada = Buffer | Uint8Array | ArrayBuffer | string;

function normalizar(entrada: Entrada) {
  if (typeof entrada === "string") return entrada;
  if (entrada instanceof ArrayBuffer) return Buffer.from(entrada);
  return Buffer.from(entrada);
}

/** Redimensiona y convierte una imagen. Devuelve el buffer resultante. */
export async function procesarImagen(
  entrada: Entrada,
  {
    ancho,
    alto,
    formato = "webp",
    calidad = 82,
    ajuste = "cover",
  }: OpcionesImagen = {},
) {
  let pipeline = sharp(normalizar(entrada), { failOn: "none" }).rotate();

  if (ancho || alto) {
    pipeline = pipeline.resize({
      width: ancho,
      height: alto,
      fit: ajuste,
      withoutEnlargement: true,
    });
  }

  return pipeline.toFormat(formato, { quality: calidad }).toBuffer();
}

/** Miniatura cuadrada, útil para avatares y fotos de piezas en listados. */
export function miniatura(entrada: Entrada, lado = 256) {
  return procesarImagen(entrada, {
    ancho: lado,
    alto: lado,
    formato: "webp",
    ajuste: "cover",
  });
}

/** Dimensiones, formato y peso de una imagen sin decodificarla entera. */
export async function metadatosImagen(entrada: Entrada) {
  const { width, height, format, size } = await sharp(
    normalizar(entrada),
  ).metadata();
  return { ancho: width, alto: height, formato: format, bytes: size };
}

/**
 * Superpone el isotipo sobre el centro de un QR.
 * Requiere que el QR se haya generado con corrección de error "H".
 */
export async function qrConLogotipo(
  qrPng: Entrada,
  logoPng: Entrada,
  proporcionLogo = 0.22,
) {
  const base = sharp(normalizar(qrPng));
  const { width = 512 } = await base.metadata();
  const ladoLogo = Math.round(width * proporcionLogo);

  const logo = await sharp(normalizar(logoPng))
    .resize(ladoLogo, ladoLogo, { fit: "contain" })
    .png()
    .toBuffer();

  return base
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
}
