/**
 * Comprueba la lectura de códigos de vale.
 *
 *   npm run test:codigo
 *
 * No toca la base ni la red: `src/lib/codigo-vale.ts` es lógica pura, y es
 * justo la que decide si una cajera puede redimir tecleando el código
 * cuando la cámara no coopera. Se rompió una vez —el patrón estaba fijado a
 * `A[123]` y el A4 nació después—, y el fallo solo se veía en caja.
 *
 * El módulo se transpila al vuelo porque es TypeScript con alias `@/`.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** Saca `TIPOS_VALE` sin arrastrar todo el archivo de tipos. */
function tiposVale() {
  const fuente = readFileSync(
    path.join(raiz, "src/lib/supabase/types.ts"),
    "utf8",
  );
  const m = fuente.match(/export const TIPOS_VALE = \[([^\]]+)\]/);
  if (!m) throw new Error("No se encontró TIPOS_VALE en types.ts");
  return m[1].split(",").map((s) => s.trim().replace(/['"]/g, "")).filter(Boolean);
}

/**
 * Convierte el módulo a JavaScript ejecutable: se le quitan los tipos y el
 * import del alias, que aquí se sustituye por la lista ya leída.
 */
async function cargarModulo() {
  const ts = readFileSync(path.join(raiz, "src/lib/codigo-vale.ts"), "utf8");

  const js = ts
    .replace(/^import .*$/gm, "")
    .replace(/: string \| null/g, "")
    .replace(/\(([a-zA-Z]+): string\)/g, "($1)")
    .replace(
      /^/,
      `const TIPOS_VALE = ${JSON.stringify(tiposVale())};\n`,
    );

  const url =
    "data:text/javascript;base64," + Buffer.from(js, "utf8").toString("base64");
  return import(url);
}

const { extraerCodigo } = await cargarModulo();

const CASOS = [
  // [entrada, esperado, qué prueba]
  ["AR-A4-V002-00005", "AR-A4-V002-00005", "A4 por vendedora"],
  ["ar-a4-v002-00005", "AR-A4-V002-00005", "en minúsculas"],
  ["  AR-A4-V002-00005  ", "AR-A4-V002-00005", "con espacios"],
  ["ara4v00200005", "AR-A4-V002-00005", "dictado sin guiones"],
  ["https://x.app/v/AR-A4-V002-00005", "AR-A4-V002-00005", "dentro de una URL"],
  ["AR-A4-T003-00012", "AR-A4-T003-00012", "A4 de autorregistro"],
  ["AR-A1-V012-00045", "AR-A1-V012-00045", "A1 por vendedora"],
  ["AR-A3-T003-00012", "AR-A3-T003-00012", "A3 por tienda"],
  ["AR-A2-000125", "AR-A2-000125", "del bloque asignado"],
  ["AR-A1-000000", "AR-A1-000000", "numeración vieja"],
  ["ara2000125", "AR-A2-000125", "del bloque, dictado"],
  ["AR-A9-000125", null, "tipo que no existe"],
  ["AR-A4-V002-005", null, "correlativo corto"],
  ["hola qué tal", null, "texto suelto"],
  ["", null, "vacío"],
];

let fallos = 0;
console.log("\nLectura de códigos de vale");

for (const [entrada, esperado, nota] of CASOS) {
  const obtenido = extraerCodigo(entrada);
  const ok = obtenido === esperado;
  if (!ok) fallos++;
  console.log(
    `  [${ok ? "ok" : "!!"}] ${nota.padEnd(22)} ${JSON.stringify(entrada).padEnd(36)} → ${JSON.stringify(obtenido)}` +
      (ok ? "" : `   se esperaba ${JSON.stringify(esperado)}`),
  );
}

console.log(`\n${CASOS.length - fallos} de ${CASOS.length}\n`);
process.exit(fallos ? 1 : 0);
