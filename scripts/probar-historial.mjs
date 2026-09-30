/**
 * Comprueba la vista unificada de ventas contra sus tablas de origen.
 *
 *   node --env-file=.env.local scripts/probar-historial.mjs
 *
 * Es de solo lectura: no crea ni borra nada. Verifica que el historial no
 * pierda, duplique ni altere ninguna fila de las dos vías.
 */

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !clave) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const cabeceras = {
  apikey: clave,
  Authorization: `Bearer ${clave}`,
  "Accept-Profile": "smartvale",
};

/** Recorre todas las páginas: PostgREST corta en `db-max-rows`. */
async function todas(ruta, campos) {
  const filas = [];
  const LOTE = 1000;

  for (let desde = 0; ; desde += LOTE) {
    const r = await fetch(`${url}/rest/v1/${ruta}?select=${campos}`, {
      headers: { ...cabeceras, Range: `${desde}-${desde + LOTE - 1}` },
    });
    if (!r.ok) throw new Error(`${ruta}: ${await r.text()}`);
    const lote = await r.json();
    filas.push(...lote);
    if (lote.length < LOTE) break;
  }
  return filas;
}

let pasadas = 0;
const fallos = [];

function comprobar(descripcion, condicion, detalle = "") {
  if (condicion) {
    pasadas++;
    console.log(`  [ok] ${descripcion}`);
  } else {
    fallos.push(descripcion);
    console.log(`  [!!] ${descripcion}${detalle ? ` — ${detalle}` : ""}`);
  }
}

const suma = (filas, campo) =>
  filas.reduce((a, f) => a + Number(f[campo] ?? 0), 0);
const cerca = (a, b) => Math.abs(a - b) < 0.01;

const Q = (x) =>
  x.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

console.log("\nHistorial unificado de ventas");

try {
  const [hist, red, nor] = await Promise.all([
    todas("vw_historial_ventas", "tipo,clave,id,monto,descuento,neto,dia,fecha_creacion,vale_codigo"),
    todas("redenciones", "id,monto_compra,descuento_aplicado,fecha_creacion"),
    todas("ventas_normales", "id,monto,fecha_creacion"),
  ]);

  const conVale = hist.filter((h) => h.tipo === "vale");
  const normal = hist.filter((h) => h.tipo === "normal");

  /* ── Ninguna fila se pierde ni se duplica ──────────────────────────── */

  comprobar(
    "trae todas las redenciones",
    conVale.length === red.length,
    `vista ${conVale.length} · tabla ${red.length}`,
  );
  comprobar(
    "trae todas las ventas sin vale",
    normal.length === nor.length,
    `vista ${normal.length} · tabla ${nor.length}`,
  );
  comprobar(
    "no trae ninguna fila de más",
    hist.length === red.length + nor.length,
    `vista ${hist.length} · suma ${red.length + nor.length}`,
  );
  comprobar(
    "cada fila tiene una clave única",
    new Set(hist.map((h) => h.clave)).size === hist.length,
  );
  comprobar(
    "la clave distingue ids repetidos entre las dos tablas",
    !conVale.some((v) => normal.some((n) => n.clave === v.clave)),
  );

  /* ── El dinero cuadra ──────────────────────────────────────────────── */

  comprobar(
    "el monto con vale cuadra con las redenciones",
    cerca(suma(conVale, "monto"), suma(red, "monto_compra")),
    `Q${Q(suma(conVale, "monto"))} vs Q${Q(suma(red, "monto_compra"))}`,
  );
  comprobar(
    "el descuento cuadra con las redenciones",
    cerca(suma(conVale, "descuento"), suma(red, "descuento_aplicado")),
  );
  comprobar(
    "el monto sin vale cuadra con ventas_normales",
    cerca(suma(normal, "monto"), suma(nor, "monto")),
  );
  comprobar(
    "la venta normal nunca lleva descuento",
    normal.every((n) => Number(n.descuento) === 0),
  );
  comprobar(
    "neto = monto − descuento en todas las filas",
    hist.every((f) => cerca(Number(f.neto), Number(f.monto) - Number(f.descuento))),
  );

  /* ── Coherencia de cada vía ────────────────────────────────────────── */

  comprobar(
    "toda venta con vale trae su código",
    conVale.every((v) => v.vale_codigo),
  );
  comprobar(
    "ninguna venta normal trae código de vale",
    normal.every((n) => n.vale_codigo === null),
  );
  comprobar(
    "solo existen los dos tipos",
    hist.every((f) => f.tipo === "vale" || f.tipo === "normal"),
  );

  /* ── El día, en horario de Guatemala ───────────────────────────────── */

  const enGt = (iso) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Guatemala",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));

  const malDia = hist.filter((f) => f.dia !== enGt(f.fecha_creacion));
  comprobar(
    "el día va en horario de Guatemala en todas las filas",
    malDia.length === 0,
    malDia.length ? `${malDia.length} filas con el día corrido` : "",
  );

  console.log(
    `\n  ${hist.length} ventas · Q${Q(suma(hist, "monto"))} de monto · ` +
      `Q${Q(suma(hist, "descuento"))} de descuento · Q${Q(suma(hist, "neto"))} en caja`,
  );
} catch (e) {
  console.error(`\nError: ${e.message}`);
  fallos.push(`excepción: ${e.message}`);
}

console.log(`\n${pasadas} comprobaciones pasadas, ${fallos.length} fallidas`);
if (fallos.length) {
  for (const f of fallos) console.log(`  · ${f}`);
  process.exit(1);
}
console.log();
