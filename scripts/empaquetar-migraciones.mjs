/**
 * Concatena las migraciones en un solo archivo listo para pegar en el
 * SQL Editor de Supabase.
 *
 *   npm run db:bundle
 *
 * Se genera desde supabase/migrations/, así que nunca se desincroniza.
 * El archivo de salida está en .gitignore: es un artefacto, no fuente.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const raizMigraciones = path.join(process.cwd(), "supabase", "migrations");
const salida = path.join(process.cwd(), "supabase", "aplicar.sql");

const archivos = (await readdir(raizMigraciones))
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (!archivos.length) {
  console.error("No hay migraciones en supabase/migrations/");
  process.exit(1);
}

const separador = "-".repeat(73);
const partes = [
  `-- ${separador}`,
  "-- ARIGA SMART VALE — migraciones consolidadas",
  "--",
  "-- GENERADO AUTOMÁTICAMENTE por scripts/empaquetar-migraciones.mjs.",
  "-- No editar a mano: los cambios van en supabase/migrations/.",
  "--",
  "-- Cómo aplicarlo: Supabase → SQL Editor → pegar todo → Run.",
  "-- Se ejecuta como una sola transacción, así que si algo falla no queda",
  "-- nada a medias.",
  `-- ${separador}`,
  "",
  "begin;",
  "",
];

for (const archivo of archivos) {
  const contenido = await readFile(path.join(raizMigraciones, archivo), "utf8");
  partes.push(`-- ${separador}`);
  partes.push(`-- ARCHIVO: ${archivo}`);
  partes.push(`-- ${separador}`);
  partes.push("");
  partes.push(contenido.trimEnd());
  partes.push("");
}

partes.push("commit;");
partes.push("");

await writeFile(salida, partes.join("\n"), "utf8");

const lineas = partes.join("\n").split("\n").length;
console.log(`\nGenerado: supabase/aplicar.sql`);
console.log(`  ${archivos.length} migraciones, ${lineas} líneas\n`);
for (const a of archivos) console.log(`  · ${a}`);
console.log("\nPégalo completo en Supabase → SQL Editor → Run.\n");
