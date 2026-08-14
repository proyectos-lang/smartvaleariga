/**
 * Genera todos los formatos del logotipo desde un único original.
 *
 *   npm run marca:generar
 *   npm run marca:generar -- ruta/a/otro-logo.png
 *
 * Produce:
 *   public/brand/ariga-logo.png   maestro que usa la interfaz
 *   src/app/icon.png              favicon (Next deriva las medidas)
 *   src/app/apple-icon.png        icono de pantalla de inicio en iOS
 *   src/lib/marca-datos.ts        el logo en base64
 *
 * El último hace falta porque la imagen de la tarjeta (`next/og`) y el PDF
 * se arman en el servidor: leer de `public/` o pedirlo por red desde una
 * función serverless es frágil, y empotrarlo no falla nunca.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const raiz = process.cwd();
const origen = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(raiz, "design", "ariga-logo-original.png");

const TINTA = { r: 11, g: 11, b: 12, alpha: 1 }; // #0B0B0C, el negro de la marca

await mkdir(path.join(raiz, "public", "brand"), { recursive: true });

const meta = await sharp(origen).metadata();
const lado = Math.max(meta.width, meta.height);

// El original no tiene por qué ser cuadrado; en cajas cuadradas —avatares,
// la tarjeta del vale— se deformaría. Se centra en lienzo cuadrado.
const cuadrado = await sharp(origen)
  .extend({
    top: Math.floor((lado - meta.height) / 2),
    bottom: Math.ceil((lado - meta.height) / 2),
    left: Math.floor((lado - meta.width) / 2),
    right: Math.ceil((lado - meta.width) / 2),
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

const salidas = [];

const maestro = path.join(raiz, "public", "brand", "ariga-logo.png");
await sharp(cuadrado)
  .resize(512, 512)
  .png({ compressionLevel: 9, palette: true })
  .toFile(maestro);
salidas.push(["logotipo", "public/brand/ariga-logo.png"]);

await sharp(cuadrado)
  .resize(256, 256)
  .png({ compressionLevel: 9, palette: true })
  .toFile(path.join(raiz, "src", "app", "icon.png"));
salidas.push(["favicon", "src/app/icon.png"]);

// iOS compone el icono sobre blanco, así que este lleva el negro de la
// marca detrás en lugar de transparencia.
await sharp(cuadrado)
  .resize(160, 160)
  .extend({ top: 10, bottom: 10, left: 10, right: 10, background: TINTA })
  .flatten({ background: TINTA })
  .png({ compressionLevel: 9 })
  .toFile(path.join(raiz, "src", "app", "apple-icon.png"));
salidas.push(["icono iOS", "src/app/apple-icon.png"]);

// 256 px basta: en la tarjeta compartible se ve a ~110 px y en el PDF a
// ~60 pt. Más resolución solo engordaría el módulo.
const empotrado = await sharp(cuadrado)
  .resize(256, 256)
  .png({ compressionLevel: 9, palette: true })
  .toBuffer();

const modulo = `/**
 * Logotipo de ARIGA en base64.
 *
 * GENERADO por scripts/generar-marca.mjs. No editar a mano: se regenera con
 * \`npm run marca:generar\`.
 *
 * Va empotrado porque lo consumen la imagen de la tarjeta (\`next/og\`) y el
 * PDF, que se arman en el servidor: leer de \`public/\` o pedirlo por red
 * desde una función serverless es frágil.
 */

export const LOGO_DATA_URL =
  "data:image/png;base64,${empotrado.toString("base64")}";
`;

await writeFile(path.join(raiz, "src", "lib", "marca-datos.ts"), modulo, "utf8");
salidas.push(["base64", "src/lib/marca-datos.ts"]);

console.log(`\nDesde ${path.relative(raiz, origen)}\n`);
for (const [etiqueta, ruta] of salidas) {
  const m = ruta.endsWith(".ts") ? null : await sharp(path.join(raiz, ruta)).metadata();
  console.log(
    `  ${etiqueta.padEnd(10)} ${m ? `${m.width}×${m.height}`.padStart(9) : "         "}  ${ruta}`,
  );
}
console.log();
