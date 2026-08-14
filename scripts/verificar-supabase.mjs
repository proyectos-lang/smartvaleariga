/**
 * Comprobación de la conexión con Supabase.
 *
 *   npm run db:check
 *
 * Verifica, sin escribir nada: que las variables estén completas, que el
 * servicio de autenticación responda, qué esquemas están expuestos y qué
 * tablas hay en el esquema de la aplicación.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clavePublica =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const claveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Debe coincidir con ESQUEMA en src/lib/supabase/env.ts
const esquema = "smartvale";

const ok = (m) => console.log(`  [ok] ${m}`);
const mal = (m) => console.log(`  [!!] ${m}`);

if (!url || !clavePublica) {
  mal("Faltan NEXT_PUBLIC_SUPABASE_URL o la clave pública en .env.local");
  process.exit(1);
}

const cabeceras = (clave) => ({
  apikey: clave,
  Authorization: `Bearer ${clave}`,
});

console.log(`\nProyecto: ${url}`);
console.log(`Esquema:  ${esquema}\n`);

let fallos = 0;

// 1. Autenticación
console.log("Autenticación");
try {
  const r = await fetch(`${url}/auth/v1/health`, {
    headers: cabeceras(clavePublica),
  });
  const j = await r.json();
  if (r.ok) {
    ok(`GoTrue ${j.version}`);
  } else {
    mal(`respondió ${r.status}`);
    fallos++;
  }
} catch (e) {
  mal(`sin respuesta: ${e.message}`);
  fallos++;
}

// 2. Esquemas expuestos — PostgREST los enumera al rechazar uno inválido
console.log("\nEsquemas expuestos en la API");
try {
  const r = await fetch(`${url}/rest/v1/_sondeo?select=*`, {
    headers: { ...cabeceras(clavePublica), "Accept-Profile": "__sondeo__" },
  });
  const j = await r.json();
  const lista = /schemas are exposed: (.+)$/.exec(j.hint ?? "")?.[1];

  if (!lista) {
    ok("no se pudo enumerar (la API respondió distinto), continúa");
  } else if (lista.split(", ").includes(esquema)) {
    ok(lista);
  } else {
    mal(`'${esquema}' NO está expuesto. Expuestos: ${lista}`);
    mal("Habilítalo en Dashboard → Project Settings → API → Exposed schemas");
    fallos++;
  }
} catch (e) {
  mal(e.message);
  fallos++;
}

// 3. Tablas del esquema de la aplicación
console.log(`\nTablas en '${esquema}'`);
if (!claveServicio) {
  mal("sin SUPABASE_SERVICE_ROLE_KEY no se puede leer el catálogo");
} else {
  try {
    const r = await fetch(`${url}/rest/v1/`, {
      headers: { ...cabeceras(claveServicio), "Accept-Profile": esquema },
    });
    const spec = await r.json();
    const rutas = Object.keys(spec.paths ?? {}).filter((p) => p !== "/");
    const tablas = rutas.filter((p) => !p.startsWith("/rpc/"));
    const funciones = rutas.filter((p) => p.startsWith("/rpc/"));

    if (!rutas.length) {
      ok("el esquema está vacío — todavía no hay migraciones aplicadas");
    } else {
      ok(`${tablas.length} tablas/vistas, ${funciones.length} funciones`);
      for (const t of tablas) console.log(`       ${t.slice(1)}`);
    }
  } catch (e) {
    mal(e.message);
    fallos++;
  }
}

console.log(
  fallos ? `\n${fallos} problema(s) encontrados.\n` : "\nConexión correcta.\n",
);
process.exit(fallos ? 1 : 0);
