/**
 * Alta en bloque de tiendas y vendedoras.
 *
 *   npm run equipo:sembrar -- --dry        ver qué haría, sin tocar nada
 *   npm run equipo:sembrar                 crearlo
 *   npm run equipo:sembrar -- --rango 100  y además asignar un bloque a cada una
 *   npm run equipo:sembrar -- --csv equipo.csv   guardar las credenciales
 *   npm run equipo:sembrar -- --sql alta-equipo.sql   generar el .sql y no tocar la base
 *
 * Es idempotente: se puede volver a correr. Las tiendas se identifican por
 * nombre y las cuentas por su usuario de acceso. Lo que ya existe se
 * actualiza —nombre, tienda, rol— pero NUNCA se le cambia la contraseña, para
 * que reejecutar el script no deje a media tienda sin poder entrar. Para
 * reponer una clave olvidada está `--reset-claves`.
 *
 * Con `--sql` no escribe en la base: deja un archivo listo para pegar en el
 * SQL Editor de Supabase, con los hashes ya calculados. Postgres no sabe
 * hacer scrypt —no lo trae ni pgcrypto—, así que el hash tiene que salir de
 * aquí sí o sí; lo que el .sql lleva dentro es el resultado, nunca la
 * contraseña.
 *
 * Reimplementa el hash de src/lib/auth/contrasena.ts porque corre fuera de
 * Next y no puede importar TypeScript. Los dos formatos deben coincidir:
 * `scrypt$N$r$p$sal$derivado`.
 */

import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { writeFileSync } from "node:fs";
import { promisify } from "node:util";

/* ── Los datos ───────────────────────────────────────────────────────────
 *
 * Para cambiar el equipo se edita esta parte y se vuelve a correr.
 */

const TIENDAS = [
  "ARIGA MAZATE",
  "ARIGA ALTURAS TIENDA",
  "ARIGA ALTURAS KIOSCO",
  "ARIGA PRADERA KIOSCO",
  "ARIGA TOTO",
  "ARIGA PROCERES",
  "ARIGA PERI",
  "ARIGA NARANJO",
];

/**
 * `usuario` es lo que se teclea para entrar: el nombre de pila, que es lo que
 * cada una recuerda sin pensar. Si mañana entra otra Karla, se desempata con
 * el apellido (`karla.deleon`) y solo cambia esa fila.
 *
 * `tienda` queda vacío porque la lista original venía en dos columnas sueltas
 * —ocho tiendas y diecisiete vendedoras—, y emparejarlas por su posición
 * habría sido inventarse a quién pertenece cada quien. Se rellena aquí con el
 * nombre exacto de la tienda y se vuelve a correr el script.
 *
 * Mientras esté vacío, la pantalla de autorregistro ofrece todas las cuentas
 * en vez de las de esa tienda: se puede trabajar, pero se elige entre más.
 */
const VENDEDORAS = [
  { usuario: "karla",    nombre: "Karla Maricela de León Tello",      tienda: "" },
  { usuario: "erika",    nombre: "Erika Fabiola Marroquín Ordóñez",   tienda: "" },
  { usuario: "seline",   nombre: "Seline Mayte Cifuentes Cano",       tienda: "" },
  { usuario: "arleny",   nombre: "Arleny Yahaira López Gómez",        tienda: "" },
  { usuario: "heidy",    nombre: "Heidy Anabella Rivas Gómez",        tienda: "" },
  { usuario: "yeimy",    nombre: "Yeimy Irasema Villatoro Escobedo",  tienda: "" },
  { usuario: "bianca",   nombre: "Bianca Lourdes López Martínez",     tienda: "" },
  { usuario: "ariana",   nombre: "Ariana Alexandra Martínez Ríos",    tienda: "" },
  { usuario: "tomasa",   nombre: "Tomasa Etelvina García Ajanel",     tienda: "" },
  { usuario: "gabriela", nombre: "Gabriela Yuvisa Say Aguilar",       tienda: "" },
  { usuario: "astrid",   nombre: "Astrid Mariangel Hernández Batz",   tienda: "" },
  { usuario: "karen",    nombre: "Karen Abigail Boche Esqueque",      tienda: "" },
  { usuario: "wendy",    nombre: "Wendy Alexia Villalta González",    tienda: "" },
  { usuario: "brenely",  nombre: "Brenely Esther Rivera Sicay",       tienda: "" },
  { usuario: "carla",    nombre: "Carla Suleydy Nájera Ramírez",      tienda: "" },
  { usuario: "laura",    nombre: "Laura Isabel Toj García",           tienda: "" },
  { usuario: "darlin",   nombre: "Darlin Saray Fajardo Chacaj",       tienda: "" },
];

/* ── Contraseñas ─────────────────────────────────────────────────────────
 *
 * El nombre de acceso y cuatro cifras: `karla4821`. Es lo más fácil de
 * dictar y de teclear en un mostrador, que es lo que se pidió.
 *
 * Conviene saber lo que implica: quien vea la lista de vendedoras conoce ya
 * la mitad de cada contraseña, así que lo único que la protege son las
 * cuatro cifras. Sirve para arrancar; no para dejarlas puestas un año.
 */
const LARGO_MINIMO = 8;

function claveFacil(usuario) {
  // El usuario puede llevar punto si hubo que desempatar (karla.deleon);
  // en la contraseña estorba al dictarla.
  const base = usuario.replace(/[^a-z0-9]/gi, "");
  const b = randomBytes(2);
  const cifras = String((((b[0] << 8) | b[1]) % 9000) + 1000);
  const clave = `${base}${cifras}`;

  // Las mismas reglas que aplica la aplicación al cambiar una contraseña.
  if (
    clave.length < LARGO_MINIMO ||
    !/[a-zA-Z]/.test(clave) ||
    !/[0-9]/.test(clave)
  ) {
    throw new Error(
      `La clave de "${usuario}" quedaría en "${clave}", que no cumple el mínimo de ${LARGO_MINIMO} caracteres.`,
    );
  }
  return clave;
}

/* ── Infraestructura ─────────────────────────────────────────────────── */

const scrypt = promisify(scryptCb);
const PARAMS = { N: 16384, r: 8, p: 1 };

async function hashear(contrasena) {
  const sal = randomBytes(16);
  const derivado = await scrypt(contrasena.normalize("NFKC"), sal, 64, {
    ...PARAMS,
    maxmem: 64 * 1024 * 1024,
  });
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, sal.toString("hex"), derivado.toString("hex")].join("$");
}

function argumentos() {
  const args = {};
  const lista = process.argv.slice(2);
  for (let i = 0; i < lista.length; i++) {
    if (!lista[i].startsWith("--")) continue;
    const clave = lista[i].slice(2);
    args[clave] = lista[i + 1]?.startsWith("--") || lista[i + 1] === undefined
      ? "true"
      : lista[++i];
  }
  return args;
}

const credencialesSql = [];

const args = argumentos();
const ensayo = args.dry === "true";
const resetear = args["reset-claves"] === "true";
const tamanoRango = args.rango && args.rango !== "true" ? Number(args.rango) : null;
const rutaSql = args.sql && args.sql !== "true" ? args.sql : null;

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const servicio = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !servicio) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

async function rest(ruta, opciones = {}) {
  const r = await fetch(`${url}/rest/v1/${ruta}`, {
    ...opciones,
    headers: {
      apikey: servicio,
      Authorization: `Bearer ${servicio}`,
      "Content-Type": "application/json",
      "Accept-Profile": "smartvale",
      "Content-Profile": "smartvale",
      Prefer: "return=representation",
      ...(opciones.headers ?? {}),
    },
  });
  const texto = await r.text();
  const cuerpo = texto ? JSON.parse(texto) : null;
  if (!r.ok) {
    const e = new Error(cuerpo?.message ?? `HTTP ${r.status}`);
    e.code = cuerpo?.code;
    throw e;
  }
  return cuerpo;
}

const rpc = (fn, cuerpo) =>
  rest(`rpc/${fn}`, { method: "POST", body: JSON.stringify(cuerpo) });

/* ── Comprobaciones antes de escribir nada ───────────────────────────── */

const usuarios = VENDEDORAS.map((v) => v.usuario);
const repetidos = usuarios.filter((u, i) => usuarios.indexOf(u) !== i);
if (repetidos.length) {
  console.error(`\nHay usuarios repetidos: ${[...new Set(repetidos)].join(", ")}`);
  console.error("Desempata con el apellido, por ejemplo karla.deleon.\n");
  process.exit(1);
}

const ES_USUARIO = /^[a-z0-9][a-z0-9._+-]{1,63}$/;
const malos = usuarios.filter((u) => !ES_USUARIO.test(u));
if (malos.length) {
  console.error(`\nUsuarios inválidos (sin acentos, espacios ni mayúsculas): ${malos.join(", ")}\n`);
  process.exit(1);
}

const desconocidas = VENDEDORAS
  .filter((v) => v.tienda && !TIENDAS.includes(v.tienda))
  .map((v) => `${v.usuario} → ${v.tienda}`);
if (desconocidas.length) {
  console.error(`\nEstas tiendas no están en la lista TIENDAS:\n  ${desconocidas.join("\n  ")}\n`);
  process.exit(1);
}

console.log(
  `\nARIGA SMART VALE · alta de equipo${ensayo ? "  (ENSAYO: no se escribe nada)" : ""}`,
);
console.log(`${url}\n`);

/* ── Salida en SQL ───────────────────────────────────────────────────────
 *
 * Para quien prefiere pegarlo en el SQL Editor, como las migraciones. No
 * consulta ni escribe en la base: las inserciones son idempotentes por sí
 * solas, así que el archivo se puede correr dos veces sin duplicar nada ni
 * pisar contraseñas ya entregadas.
 */
if (rutaSql) {
  const comilla = (t) => `'${String(t).replace(/'/g, "''")}'`;
  const guion = "-".repeat(70);
  const lineas = [
    `-- ${guion}`,
    "-- ARIGA SMART VALE — alta del equipo",
    "--",
    "-- GENERADO por scripts/sembrar-equipo.mjs. No editar a mano.",
    "--",
    "-- Se puede correr dos veces sin miedo: `on conflict do nothing` deja",
    "-- intactas las tiendas y las cuentas que ya existan, así que nadie se",
    "-- queda fuera por reejecutarlo.",
    "--",
    "-- Las contraseñas NO están aquí, solo su hash scrypt, que no se puede",
    "-- deshacer. Las claves en claro salieron por la terminal al generar el",
    "-- archivo, y esa es la única vez que se muestran.",
    `-- ${guion}`,
    "",
    "begin;",
    "",
    "-- ═══ Puntos de venta ═══",
    "insert into smartvale.tiendas (nombre) values",
    TIENDAS.map((t) => `  (${comilla(t)})`).join(",\n"),
    "on conflict (nombre) do nothing;",
    "",
    "-- ═══ Vendedoras ═══",
  ];

  for (const v of VENDEDORAS) {
    const clave = claveFacil(v.usuario);
    credencialesSql.push({ ...v, clave });

    // La tienda se resuelve por nombre dentro del propio SQL: así el archivo
    // no depende de unos ids que solo existen en esta base.
    const tienda = v.tienda
      ? `(select id from smartvale.tiendas where nombre = ${comilla(v.tienda)})`
      : "null";

    lineas.push(
      "insert into smartvale.usuarios (nombre, correo, rol, tienda_id, contrasena_hash) values",
      `  (${comilla(v.nombre)}, ${comilla(v.usuario)}, 'vendedora', ${tienda}, ${comilla(await hashear(clave))})`,
      "on conflict (correo) do nothing;",
    );
  }

  lineas.push("", "commit;", "");
  writeFileSync(rutaSql, lineas.join("\n"), "utf8");

  console.log(`Generado ${rutaSql}`);
  console.log(`  ${TIENDAS.length} tiendas y ${VENDEDORAS.length} vendedoras`);
  console.log("  Pégalo en Supabase → SQL Editor → Run.\n");

  console.log("Credenciales — no se vuelven a mostrar\n");
  console.log(`  ${"USUARIO".padEnd(10)} ${"CONTRASEÑA".padEnd(14)} NOMBRE`);
  for (const c of credencialesSql) {
    console.log(`  ${c.usuario.padEnd(10)} ${c.clave.padEnd(14)} ${c.nombre}`);
  }
  console.log("\n  Entran en /login con el usuario, sin correo ni arroba.\n");

  process.exit(0);
}

/* ── Tiendas ─────────────────────────────────────────────────────────── */

console.log("Puntos de venta");

const existentes = await rest("tiendas?select=id,nombre");
const porNombre = new Map(existentes.map((t) => [t.nombre, t]));
const idDeTienda = new Map(existentes.map((t) => [t.nombre, t.id]));

for (const nombre of TIENDAS) {
  if (porNombre.has(nombre)) {
    console.log(`  ya existía   ${nombre}`);
    continue;
  }
  if (ensayo) {
    console.log(`  se crearía   ${nombre}`);
    continue;
  }
  const [creada] = await rest("tiendas", {
    method: "POST",
    body: JSON.stringify({ nombre }),
  });
  idDeTienda.set(nombre, creada.id);
  console.log(`  creada       ${nombre}`);
}

/* ── Vendedoras ──────────────────────────────────────────────────────── */

console.log("\nVendedoras");

const cuentas = await rest("usuarios?select=id,correo,nombre,rol,tienda_id");
const porCorreo = new Map(cuentas.map((u) => [u.correo, u]));

const credenciales = [];

for (const v of VENDEDORAS) {
  const tiendaId = v.tienda ? (idDeTienda.get(v.tienda) ?? null) : null;
  const existente = porCorreo.get(v.usuario);

  if (existente) {
    // Se pone al día lo que puede haber cambiado, nunca la contraseña.
    const cambios = {};
    if (existente.nombre !== v.nombre) cambios.nombre = v.nombre;
    if (tiendaId !== null && existente.tienda_id !== tiendaId) {
      cambios.tienda_id = tiendaId;
    }

    let clave = null;
    if (resetear) {
      clave = claveFacil(v.usuario);
      cambios.contrasena_hash = await hashear(clave);
    }

    if (Object.keys(cambios).length === 0) {
      console.log(`  sin cambios  ${v.usuario.padEnd(9)} ${v.nombre}`);
    } else if (ensayo) {
      console.log(
        `  se ajustaría ${v.usuario.padEnd(9)} ${Object.keys(cambios).filter((c) => c !== "contrasena_hash").join(", ") || "contraseña"}`,
      );
    } else {
      await rest(`usuarios?id=eq.${existente.id}`, {
        method: "PATCH",
        body: JSON.stringify(cambios),
      });
      console.log(`  actualizada  ${v.usuario.padEnd(9)} ${v.nombre}`);
    }

    if (clave) credenciales.push({ ...v, clave, nota: "clave repuesta" });
    continue;
  }

  const clave = claveFacil(v.usuario);

  if (ensayo) {
    console.log(`  se crearía   ${v.usuario.padEnd(9)} ${v.nombre}`);
    credenciales.push({ ...v, clave, nota: "ensayo" });
    continue;
  }

  const [creada] = await rest("usuarios", {
    method: "POST",
    body: JSON.stringify({
      nombre: v.nombre,
      correo: v.usuario,
      rol: "vendedora",
      tienda_id: tiendaId,
      contrasena_hash: await hashear(clave),
    }),
  });

  porCorreo.set(v.usuario, creada);
  credenciales.push({ ...v, clave, nota: "nueva" });
  console.log(`  creada       ${v.usuario.padEnd(9)} ${v.nombre}`);
}

/* ── Bloques de correlativos ─────────────────────────────────────────── */

/*
 * Sin bloque, una vendedora puede emitir A1 y A4 —que llevan secuencia
 * propia— pero no A2 ni A3, que salen del rango asignado. Se hace solo si se
 * pide, porque repartir cupo es una decisión del administrador.
 */
if (tamanoRango) {
  console.log(`\nBloques de ${tamanoRango} correlativos`);

  if (!Number.isInteger(tamanoRango) || tamanoRango < 1) {
    console.error("  --rango debe ser un entero positivo");
    process.exit(1);
  }

  const [admin] = await rest(
    "usuarios?select=id&rol=eq.admin&activo=is.true&limit=1",
  );
  if (!admin) {
    console.error("  No hay ninguna cuenta admin que pueda asignar bloques.");
    process.exit(1);
  }

  const conRango = new Set(
    (await rest("rangos?select=usuario_id&activo=is.true")).map((r) => r.usuario_id),
  );

  for (const v of VENDEDORAS) {
    const cuenta = porCorreo.get(v.usuario);
    if (!cuenta) continue;

    if (conRango.has(cuenta.id)) {
      console.log(`  ya tenía     ${v.usuario}`);
      continue;
    }
    if (ensayo) {
      console.log(`  se asignaría ${v.usuario}`);
      continue;
    }

    const r = await rpc("fn_asignar_rango", {
      p_usuario_id: cuenta.id,
      p_asignado_por: admin.id,
      p_tamano: tamanoRango,
      p_nota: "Alta inicial del equipo",
    });
    console.log(`  ${String(r.rango_inicio).padStart(6)}–${String(r.rango_fin).padEnd(6)} ${v.usuario}`);
  }
}

/* ── Credenciales ────────────────────────────────────────────────────── */

if (credenciales.length === 0) {
  console.log("\nNo hay contraseñas nuevas que entregar.\n");
} else {
  console.log("\nCredenciales — no se vuelven a mostrar\n");
  console.log(`  ${"USUARIO".padEnd(10)} ${"CONTRASEÑA".padEnd(12)} NOMBRE`);
  for (const c of credenciales) {
    console.log(`  ${c.usuario.padEnd(10)} ${c.clave.padEnd(12)} ${c.nombre}`);
  }

  if (args.csv && args.csv !== "true") {
    const filas = [
      "usuario,contrasena,nombre,tienda",
      ...credenciales.map((c) =>
        [c.usuario, c.clave, `"${c.nombre}"`, `"${c.tienda}"`].join(","),
      ),
    ].join("\n");
    writeFileSync(args.csv, `${filas}\n`, "utf8");
    console.log(`\n  Guardado en ${args.csv}`);
    console.log("  Contiene contraseñas en claro: bórralo en cuanto las repartas.");
  }

  console.log(
    "\n  Entra en https://…/login con el usuario, sin correo ni arroba.\n",
  );
}
