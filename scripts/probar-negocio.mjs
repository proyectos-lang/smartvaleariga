/**
 * Pruebas de la lógica de negocio contra la base real.
 *
 *   npm run test:negocio
 *
 * Crea datos marcados como de prueba, comprueba las reglas que importan y
 * borra todo al terminar, incluso si algo falla. No toca datos existentes.
 *
 * Lo que verifica:
 *   · formato del código y descuento congelado al emitir
 *   · validaciones propias de cada puerta (A1 segmento, A2 origen, A3 tienda)
 *   · redención múltiple sin consumir el vale
 *   · mensaje exacto al agotarse el rango
 *   · correlativos sin repetir ni saltar bajo emisiones simultáneas
 */

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !clave) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const MARCA = "zz-prueba-automatica";

const cabeceras = {
  apikey: clave,
  Authorization: `Bearer ${clave}`,
  "Content-Type": "application/json",
  "Accept-Profile": "smartvale",
  "Content-Profile": "smartvale",
};

async function rest(ruta, opciones = {}) {
  const r = await fetch(`${url}/rest/v1/${ruta}`, {
    ...opciones,
    headers: { ...cabeceras, ...opciones.headers },
  });
  const texto = await r.text();
  const cuerpo = texto ? JSON.parse(texto) : null;
  if (!r.ok) {
    const e = new Error(cuerpo?.message ?? `HTTP ${r.status}`);
    e.code = cuerpo?.code;
    e.status = r.status;
    throw e;
  }
  return cuerpo;
}

const rpc = (fn, args) =>
  rest(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });

/* ── Aserciones ──────────────────────────────────────────────────────── */

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

async function debeFallar(descripcion, promesa, codigoEsperado) {
  try {
    await promesa;
    comprobar(descripcion, false, "no lanzó error");
  } catch (e) {
    comprobar(
      descripcion,
      !codigoEsperado || e.code === codigoEsperado,
      `código ${e.code ?? "?"} · ${e.message}`,
    );
  }
}

/* ── Datos de prueba ─────────────────────────────────────────────────── */

const creado = { tiendaId: null, usuarioId: null };

async function preparar() {
  console.log("\nPreparando datos de prueba");

  const [tienda] = await rest("tiendas", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ nombre: `Tienda ${MARCA}` }),
  });
  creado.tiendaId = tienda.id;

  const [usuario] = await rest("usuarios", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      nombre: `Vendedora ${MARCA}`,
      correo: `${MARCA}@verificacion.local`,
      contrasena_hash: "scrypt$16384$8$1$00$00",
      rol: "vendedora",
      tienda_id: tienda.id,
    }),
  });
  creado.usuarioId = usuario.id;

  console.log(`  tienda ${tienda.id}, vendedora ${usuario.id}`);
}

async function limpiar() {
  console.log("\nLimpiando");
  if (!creado.usuarioId) return;

  const vales = await rest(
    `vales?select=id&or=(usuario_id.eq.${creado.usuarioId},tienda_id.eq.${creado.tiendaId})`,
  ).catch(() => []);

  if (vales.length) {
    const ids = vales.map((v) => v.id).join(",");
    await rest(`redenciones?vale_id=in.(${ids})`, { method: "DELETE" });
    await rest(`vales?id=in.(${ids})`, { method: "DELETE" });
  }

  await rest(`rangos?usuario_id=eq.${creado.usuarioId}`, { method: "DELETE" });
  await rest(`contactos?nombre=like.*${MARCA}*`, { method: "DELETE" });
  await rest(`usuarios?id=eq.${creado.usuarioId}`, { method: "DELETE" });
  if (creado.tiendaId) {
    await rest(`tiendas?id=eq.${creado.tiendaId}`, { method: "DELETE" });
  }
  console.log("  datos de prueba eliminados");
}

/* ── Pruebas ─────────────────────────────────────────────────────────── */

async function probarEmision() {
  console.log("\nEmisión");

  const rango = await rpc("fn_asignar_rango", {
    p_usuario_id: creado.usuarioId,
    p_asignado_por: creado.usuarioId,
    p_tamano: 5,
  });
  comprobar(
    "se asigna un bloque de 5",
    rango.rango_fin - rango.rango_inicio + 1 === 5,
    `${rango.rango_inicio}–${rango.rango_fin}`,
  );
  comprobar(
    "el correlativo arranca en el inicio del bloque",
    rango.correlativo_actual === rango.rango_inicio,
  );

  const a1 = await rpc("fn_emitir_vale", {
    p_usuario_id: creado.usuarioId,
    p_tipo: "A1",
    p_nombre: `Regina ${MARCA}`,
    p_telefono: "5218112341001",
    p_segmento: "A1-VIP",
  });
  comprobar(
    "el código A1 lleva el prefijo de la vendedora",
    /^AR-A1-V\d{3,}-\d{5}$/.test(a1.codigo),
    a1.codigo,
  );
  comprobar(
    "A1 no consume el bloque",
    a1.rango_id === null,
    `rango_id: ${a1.rango_id}`,
  );
  comprobar(
    "el descuento A1-VIP se congela desde configuración (30%)",
    Number(a1.descuento_pct) === 30,
    `${a1.descuento_pct}%`,
  );
  comprobar(
    "la vigencia son 30 días",
    Math.round(
      (new Date(a1.fecha_vencimiento) - new Date(a1.fecha_emision)) / 86400000,
    ) === 30,
  );

  const a2 = await rpc("fn_emitir_vale", {
    p_usuario_id: creado.usuarioId,
    p_tipo: "A2",
    p_nombre: `Jorge ${MARCA}`,
    p_telefono: "5218112341002",
    p_origen: "Centro comercial Valle",
  });
  comprobar("A2 guarda el origen", a2.origen === "Centro comercial Valle");
  comprobar(
    "A2 sí sale del bloque asignado",
    a2.rango_id === rango.id && a2.correlativo === rango.rango_inicio,
    `correlativo ${a2.correlativo} del bloque ${rango.rango_inicio}–${rango.rango_fin}`,
  );

  const a3 = await rpc("fn_emitir_vale", {
    p_usuario_id: creado.usuarioId,
    p_tipo: "A3",
    p_nombre: `Ana ${MARCA}`,
    p_telefono: "5218112341003",
  });
  comprobar(
    "A3 toma la tienda de la vendedora si no se indica",
    a3.tienda_id === creado.tiendaId,
  );

  await debeFallar(
    "A1 sin segmento se rechaza",
    rpc("fn_emitir_vale", {
      p_usuario_id: creado.usuarioId,
      p_tipo: "A1",
      p_nombre: `X ${MARCA}`,
      p_telefono: "5218112341004",
    }),
    "SV006",
  );

  await debeFallar(
    "A2 sin origen se rechaza",
    rpc("fn_emitir_vale", {
      p_usuario_id: creado.usuarioId,
      p_tipo: "A2",
      p_nombre: `X ${MARCA}`,
      p_telefono: "5218112341005",
    }),
    "SV006",
  );

  return { a1, a2, a3, rango };
}

async function probarRedencion(vale) {
  console.log("\nRedención múltiple");

  const compradores = [
    ["Compradora uno", "5218112342001", 4000],
    ["Comprador dos", "5218112342002", 2500],
    ["Compradora tres", "5218112342003", 9000],
  ];

  for (const [nombre, telefono, monto] of compradores) {
    await rpc("fn_registrar_redencion", {
      p_codigo: vale.codigo,
      p_usuario_id: creado.usuarioId,
      p_tienda_id: creado.tiendaId,
      p_nombre: `${nombre} ${MARCA}`,
      p_telefono: telefono,
      p_correo: null,
      p_monto: monto,
      p_ticket: `T-${telefono.slice(-4)}`,
    });
  }

  const [validado] = await rpc("fn_validar_vale", { p_codigo: vale.codigo });
  comprobar(
    "tres personas distintas redimen el mismo vale",
    validado.total_redenciones === 3,
    `${validado.total_redenciones} redenciones`,
  );
  comprobar(
    "el vale sigue vigente después de redimirse",
    validado.redimible === true && validado.estado === "activo",
  );

  const [detalle] = await rest(
    `vw_vales_detalle?select=ingreso_generado,descuento_otorgado&codigo=eq.${vale.codigo}`,
  );
  comprobar(
    "el ingreso acumulado suma las tres compras",
    Number(detalle.ingreso_generado) === 15500,
    `${detalle.ingreso_generado}`,
  );
  comprobar(
    "el descuento se calcula con el % del vale (30% de 15 500)",
    Number(detalle.descuento_otorgado) === 4650,
    `${detalle.descuento_otorgado}`,
  );

  await debeFallar(
    "un código inexistente se rechaza",
    rpc("fn_registrar_redencion", {
      p_codigo: "AR-A1-999999",
      p_usuario_id: creado.usuarioId,
      p_tienda_id: creado.tiendaId,
      p_nombre: `X ${MARCA}`,
      p_telefono: "5218112349999",
      p_correo: null,
      p_monto: 100,
      p_ticket: "T-X",
    }),
    "SV002",
  );
}

async function probarA1SinLimite() {
  console.log("\nA1 sin límite");

  // El bloque es de 5 y ya se consumió parte con A2 y A3. Emitir más A1 que
  // el bloque entero demuestra que su secuencia es independiente.
  const codigos = [];
  for (let i = 0; i < 8; i++) {
    const v = await rpc("fn_emitir_vale", {
      p_usuario_id: creado.usuarioId,
      p_tipo: "A1",
      p_nombre: `Ilimitado ${i} ${MARCA}`,
      p_telefono: `5218112345${String(i).padStart(3, "0")}`,
      p_segmento: "A1-30",
    });
    codigos.push(v.codigo);
  }

  comprobar(
    "se emiten 8 vales A1 pese a un bloque de solo 5",
    codigos.length === 8,
  );
  comprobar(
    "ningún código A1 se repite",
    new Set(codigos).size === codigos.length,
  );

  const correlativos = codigos.map((c) => Number(c.slice(-5)));
  comprobar(
    "la secuencia A1 avanza sin huecos",
    correlativos.every((n, i) => i === 0 || n === correlativos[i - 1] + 1),
    codigos.at(0) + " … " + codigos.at(-1),
  );

  const cupo = await rpc("fn_resumen_rango", { p_usuario_id: creado.usuarioId });
  comprobar(
    "el bloque no se movió con los A1",
    cupo[0].emitidos === 2,
    `${cupo[0].emitidos} consumidos del bloque`,
  );
}

async function probarAutorregistro() {
  console.log("\nAutorregistro desde el QR de la tienda");

  const [tienda] = await rest(`tiendas?select=token,id&id=eq.${creado.tiendaId}`);

  const primero = await rpc("fn_autorregistro_a3", {
    p_token: tienda.token,
    p_nombre: `Visitante ${MARCA}`,
    p_telefono: "5218112399001",
    p_correo: null,
  });
  comprobar(
    "el código lleva el prefijo de la tienda",
    /^AR-A3-T\d{3,}-\d{5}$/.test(primero.codigo),
    primero.codigo,
  );
  comprobar("el vale no tiene vendedora", primero.usuario_id === null);
  comprobar("queda marcado como autorregistro", primero.autorregistro === true);
  comprobar("se emite sin correo", true);

  const repetido = await rpc("fn_autorregistro_a3", {
    p_token: tienda.token,
    p_nombre: `Visitante ${MARCA}`,
    p_telefono: "5218112399001",
  });
  comprobar(
    "volver a escanear devuelve el mismo vale, no uno nuevo",
    repetido.id === primero.id,
    `${primero.codigo} vs ${repetido.codigo}`,
  );

  const otro = await rpc("fn_autorregistro_a3", {
    p_token: tienda.token,
    p_nombre: `Otro visitante ${MARCA}`,
    p_telefono: "5218112399002",
  });
  comprobar(
    "otra persona sí obtiene su propio vale",
    otro.id !== primero.id,
    otro.codigo,
  );

  await debeFallar(
    "un token de tienda inventado se rechaza",
    rpc("fn_autorregistro_a3", {
      p_token: "token-que-no-existe-000",
      p_nombre: `X ${MARCA}`,
      p_telefono: "5218112399003",
    }),
    "SV007",
  );
}

async function probarAgotamiento() {
  console.log("\nAgotamiento del rango");

  // Se llena lo que quede del bloque con A3, que sí lo consume.
  const [cupo] = await rpc("fn_resumen_rango", {
    p_usuario_id: creado.usuarioId,
  });
  for (let i = 0; i < cupo.restantes; i++) {
    await rpc("fn_emitir_vale", {
      p_usuario_id: creado.usuarioId,
      p_tipo: "A3",
      p_nombre: `Relleno ${i} ${MARCA}`,
      p_telefono: `52181123430${i}0`,
    });
  }

  try {
    await rpc("fn_emitir_vale", {
      p_usuario_id: creado.usuarioId,
      p_tipo: "A3",
      p_nombre: `Excedente ${MARCA}`,
      p_telefono: "5218112343099",
    });
    comprobar("el bloque agotado bloquea la emisión", false, "no lanzó error");
  } catch (e) {
    comprobar("el bloque agotado bloquea la emisión", e.code === "SV001");
    comprobar(
      "el mensaje es exactamente el de la especificación",
      e.message ===
        "Ha alcanzado el límite de su rango asignado. Contacte al administrador para asignar un nuevo bloque.",
      e.message,
    );
  }

  const [despues] = await rpc("fn_resumen_rango", {
    p_usuario_id: creado.usuarioId,
  });
  comprobar("fn_resumen_rango reporta el bloque agotado", despues.agotado === true);
  comprobar("no quedan vales disponibles", despues.restantes === 0);

  // Lo importante del cambio: agotado el bloque, A1 sigue funcionando.
  const a1 = await rpc("fn_emitir_vale", {
    p_usuario_id: creado.usuarioId,
    p_tipo: "A1",
    p_nombre: `Tras agotarse ${MARCA}`,
    p_telefono: "5218112343500",
    p_segmento: "A1-90",
  });
  comprobar(
    "con el bloque agotado, A1 se sigue emitiendo",
    /^AR-A1-V\d{3,}-\d{5}$/.test(a1.codigo),
    a1.codigo,
  );
}

async function probarConcurrencia() {
  console.log("\nEmisiones simultáneas");

  const N = 20;
  await rpc("fn_asignar_rango", {
    p_usuario_id: creado.usuarioId,
    p_asignado_por: creado.usuarioId,
    p_tamano: N,
  });

  // Se prueba con A3 porque es el tipo que toma el número del bloque, que es
  // donde una carrera produciría correlativos repetidos.
  const resultados = await Promise.allSettled(
    Array.from({ length: N }, (_, i) =>
      rpc("fn_emitir_vale", {
        p_usuario_id: creado.usuarioId,
        p_tipo: "A3",
        p_nombre: `Simultaneo ${i} ${MARCA}`,
        p_telefono: `5218112344${String(i).padStart(3, "0")}`,
      }),
    ),
  );

  const exitosas = resultados.filter((r) => r.status === "fulfilled");
  comprobar(
    `las ${N} emisiones simultáneas se completan`,
    exitosas.length === N,
    `${exitosas.length}/${N}`,
  );

  const correlativos = exitosas.map((r) => r.value.correlativo).sort((a, b) => a - b);
  comprobar(
    "ningún correlativo se repite",
    new Set(correlativos).size === correlativos.length,
  );
  comprobar(
    "no quedan huecos en la secuencia",
    correlativos.every((c, i) => i === 0 || c === correlativos[i - 1] + 1),
    correlativos.join(","),
  );

  const codigos = exitosas.map((r) => r.value.codigo);
  comprobar("ningún código se repite", new Set(codigos).size === codigos.length);
}

/* ── Ejecución ───────────────────────────────────────────────────────── */

console.log(`\nARIGA SMART VALE · pruebas de negocio\n${url}`);

try {
  await preparar();
  const { a1 } = await probarEmision();
  await probarRedencion(a1);
  await probarA1SinLimite();
  await probarAutorregistro();
  await probarAgotamiento();
  await probarConcurrencia();
} catch (e) {
  console.error(`\nError inesperado: ${e.message}`);
  fallos.push(`excepción: ${e.message}`);
} finally {
  await limpiar().catch((e) => console.error(`  fallo al limpiar: ${e.message}`));
}

console.log(`\n${pasadas} comprobaciones pasadas, ${fallos.length} fallidas`);
if (fallos.length) {
  for (const f of fallos) console.log(`  · ${f}`);
  process.exit(1);
}
console.log();
