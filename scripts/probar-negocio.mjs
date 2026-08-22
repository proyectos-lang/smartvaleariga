/**
 * Pruebas de la lógica de negocio contra la base real.
 *
 *   npm run test:negocio
 *
 * Crea datos marcados como de prueba, comprueba las reglas que importan y
 * borra todo al terminar, incluso si algo falla. No toca datos existentes.
 *
 * Lo que verifica:
 *   · formato del código y tarifas de oro y plata congeladas al emitir
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
    "las dos tarifas se congelan desde configuración (20% oro / 40% plata)",
    Number(a1.descuento_oro_pct) === 20 && Number(a1.descuento_plata_pct) === 40,
    `${a1.descuento_oro_pct}% oro · ${a1.descuento_plata_pct}% plata`,
  );
  // La vigencia se comprueba más abajo, cuando ya están emitidos los cuatro
  // tipos: desde que la campaña tiene fecha de cierre, la regla es la misma
  // para todos y verificarla en uno solo no diría nada.

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
  comprobar(
    "A3 lleva su tarifa propia (15% oro / 35% plata), no la general",
    Number(a3.descuento_oro_pct) === 15 &&
      Number(a3.descuento_plata_pct) === 35,
    `${a3.descuento_oro_pct}% oro · ${a3.descuento_plata_pct}% plata`,
  );

  // El A3 no cuenta días: muere el día de cierre de la campaña, lo emita
  // quien lo emita. Se compara en hora de Guatemala, que es la que vale.
  const diaGT = (iso) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Guatemala",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));

  const [corte] = await rest(
    "configuracion?select=valor&clave=eq.vigencia_hasta",
  );
  comprobar(
    "la campaña tiene día de cierre configurado",
    Boolean(corte?.valor),
    corte?.valor ?? "sin clave",
  );

  // Las cuatro puertas mueren el mismo día: el A3 lo hereda de la clave
  // general desde que dejó de tener fecha propia.
  for (const [tipo, vale] of [["A1", a1], ["A2", a2], ["A3", a3]]) {
    comprobar(
      `el ${tipo} vence el día de cierre, no a los 30 días`,
      diaGT(vale.fecha_vencimiento) === corte.valor,
      `vence ${diaGT(vale.fecha_vencimiento)}, se esperaba ${corte.valor}`,
    );
  }

  comprobar(
    "y vencen al cerrar ese día en Guatemala, no a medianoche",
    new Date(a3.fecha_vencimiento).toISOString().slice(11, 19) === "05:59:59",
    new Date(a3.fecha_vencimiento).toISOString(),
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

  // [nombre, teléfono, total, oro, plata]. La tercera compra deja 1 000 en
  // piezas que no son ni oro ni plata: el descuento no debe tocarlas.
  const compradores = [
    ["Compradora uno", "5218112342001", 4000, 4000, 0],
    ["Comprador dos", "5218112342002", 2500, 0, 2500],
    ["Compradora tres", "5218112342003", 9000, 5000, 3000],
  ];

  for (const [nombre, telefono, monto, oro, plata] of compradores) {
    await rpc("fn_registrar_redencion", {
      p_codigo: vale.codigo,
      p_usuario_id: creado.usuarioId,
      p_tienda_id: creado.tiendaId,
      p_nombre: `${nombre} ${MARCA}`,
      p_telefono: telefono,
      p_correo: null,
      p_monto: monto,
      // Sin ticket ni nota: es lo que manda la caja desde que se quitaron
      // esos campos del formulario.
      p_monto_oro: oro,
      p_monto_plata: plata,
    });
  }

  const [primera] = await rest(
    `redenciones?select=ticket,nota&vale_id=eq.${vale.id}&limit=1`,
  );
  comprobar(
    "una compra sin ticket se registra, y queda nulo y no vacío",
    primera.ticket === null && primera.nota === null,
    `ticket ${JSON.stringify(primera.ticket)}, nota ${JSON.stringify(primera.nota)}`,
  );

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
    `vw_vales_detalle?select=ingreso_generado,descuento_otorgado,ingreso_oro,ingreso_plata&codigo=eq.${vale.codigo}`,
  );
  comprobar(
    "el ingreso acumulado suma las tres compras",
    Number(detalle.ingreso_generado) === 15500,
    `${detalle.ingreso_generado}`,
  );
  comprobar(
    "el reparto por material se acumula (9 000 oro · 5 500 plata)",
    Number(detalle.ingreso_oro) === 9000 && Number(detalle.ingreso_plata) === 5500,
    `${detalle.ingreso_oro} oro · ${detalle.ingreso_plata} plata`,
  );
  comprobar(
    "cada material lleva su tarifa (20% de 9 000 + 40% de 5 500)",
    Number(detalle.descuento_otorgado) === 4000,
    `${detalle.descuento_otorgado}`,
  );
  comprobar(
    "las piezas que no son oro ni plata quedan sin descuento",
    Number(detalle.ingreso_generado) -
      Number(detalle.ingreso_oro) -
      Number(detalle.ingreso_plata) ===
      1000,
  );

  await debeFallar(
    "un reparto mayor que el total se rechaza",
    rpc("fn_registrar_redencion", {
      p_codigo: vale.codigo,
      p_usuario_id: creado.usuarioId,
      p_tienda_id: creado.tiendaId,
      p_nombre: `Excede ${MARCA}`,
      p_telefono: "5218112342004",
      p_correo: null,
      p_monto: 1000,
      p_ticket: "T-EXC",
      p_monto_oro: 800,
      p_monto_plata: 400,
    }),
    "SV006",
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
    p_usuario_id: creado.usuarioId,
  });
  comprobar(
    "el código lleva el prefijo de la tienda",
    /^AR-A3-T\d{3,}-\d{5}$/.test(primero.codigo),
    primero.codigo,
  );
  comprobar(
    "el vale queda acreditado a la asesora",
    primero.usuario_id === creado.usuarioId,
  );
  comprobar(
    "pero no gasta su bloque",
    primero.rango_id === null,
    `rango_id: ${primero.rango_id}`,
  );
  comprobar("queda marcado como autorregistro", primero.autorregistro === true);
  comprobar(
    "hereda la tarifa del A3",
    Number(primero.descuento_oro_pct) === 15 &&
      Number(primero.descuento_plata_pct) === 35,
    `${primero.descuento_oro_pct}% oro · ${primero.descuento_plata_pct}% plata`,
  );
  comprobar("se emite sin correo", true);

  await debeFallar(
    "sin asesora se rechaza",
    rpc("fn_autorregistro_a3", {
      p_token: tienda.token,
      p_nombre: `Sin asesora ${MARCA}`,
      p_telefono: "5218112399004",
    }),
    "SV010",
  );

  await debeFallar(
    "una asesora inexistente se rechaza",
    rpc("fn_autorregistro_a3", {
      p_token: tienda.token,
      p_nombre: `Asesora mala ${MARCA}`,
      p_telefono: "5218112399005",
      p_usuario_id: 2147483000,
    }),
    "SV010",
  );

  const repetido = await rpc("fn_autorregistro_a3", {
    p_token: tienda.token,
    p_nombre: `Visitante ${MARCA}`,
    p_telefono: "5218112399001",
    p_usuario_id: creado.usuarioId,
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
    p_usuario_id: creado.usuarioId,
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
      p_usuario_id: creado.usuarioId,
    }),
    "SV007",
  );
}

async function probarA4Referidos(a2) {
  console.log("\nA4: el referido y su conversión");

  const a4 = await rpc("fn_emitir_vale", {
    p_usuario_id: creado.usuarioId,
    p_tipo: "A4",
    p_nombre: `Referida ${MARCA}`,
    p_telefono: "5218112344001",
    p_vale_origen: a2.codigo,
  });
  comprobar(
    "el código A4 lleva el prefijo de la vendedora",
    /^AR-A4-V\d{3,}-\d{5}$/.test(a4.codigo),
    a4.codigo,
  );
  comprobar("A4 no consume el bloque", a4.rango_id === null, `rango_id: ${a4.rango_id}`);
  comprobar(
    "queda ligado al vale de quien lo refirió",
    a4.vale_origen_id === a2.id,
  );
  comprobar(
    "toma la tienda de la vendedora si no se indica",
    a4.tienda_id === creado.tiendaId,
  );

  const [detalle] = await rest(
    `vw_vales_detalle?select=referidor,origen_codigo,origen_tipo,convertido&codigo=eq.${a4.codigo}`,
  );
  comprobar(
    "la vista dice quién lo refirió",
    detalle.origen_codigo === a2.codigo && detalle.origen_tipo === "A2",
    `${detalle.referidor} · ${detalle.origen_codigo}`,
  );
  comprobar("todavía no está convertido", detalle.convertido === false);

  await debeFallar(
    "un A4 sin referidor se rechaza",
    rpc("fn_emitir_vale", {
      p_usuario_id: creado.usuarioId,
      p_tipo: "A4",
      p_nombre: `Sin origen ${MARCA}`,
      p_telefono: "5218112344002",
    }),
    "SV006",
  );

  await debeFallar(
    "un código de referidor inexistente se rechaza",
    rpc("fn_emitir_vale", {
      p_usuario_id: creado.usuarioId,
      p_tipo: "A4",
      p_nombre: `Origen falso ${MARCA}`,
      p_telefono: "5218112344003",
      p_vale_origen: "AR-A2-V000-00000",
    }),
    "SV009",
  );

  await debeFallar(
    "un A4 no puede venir de otro A4",
    rpc("fn_emitir_vale", {
      p_usuario_id: creado.usuarioId,
      p_tipo: "A4",
      p_nombre: `Cadena ${MARCA}`,
      p_telefono: "5218112344004",
      p_vale_origen: a4.codigo,
    }),
    "SV009",
  );

  // Un vale anulado no sirve de referencia: quien lo enseñó ya no tiene
  // nada válido que enseñar.
  const paraAnular = await rpc("fn_emitir_vale", {
    p_usuario_id: creado.usuarioId,
    p_tipo: "A2",
    p_nombre: `Anulable ${MARCA}`,
    p_telefono: "5218112344006",
    p_origen: "Prueba de anulación",
  });
  // Anular es de administrador desde que existe la pantalla de retirada.
  const [quienAnula] = await rest(
    "usuarios?select=id&rol=eq.admin&activo=is.true&limit=1",
  );
  await rpc("fn_anular_vale", {
    p_codigo: paraAnular.codigo,
    p_usuario_id: quienAnula.id,
    p_motivo: "Prueba automatizada",
  });
  await debeFallar(
    "un vale anulado no sirve como referidor",
    rpc("fn_emitir_vale", {
      p_usuario_id: creado.usuarioId,
      p_tipo: "A4",
      p_nombre: `Desde anulado ${MARCA}`,
      p_telefono: "5218112344007",
      p_vale_origen: paraAnular.codigo,
    }),
    "SV009",
  );

  // La conversión: el A1 nace apuntando al A4.
  const convertido = await rpc("fn_emitir_vale", {
    p_usuario_id: creado.usuarioId,
    p_tipo: "A1",
    p_nombre: `Referida ${MARCA}`,
    p_telefono: "5218112344001",
    p_segmento: "A1-30",
    p_vale_origen: a4.codigo,
  });
  comprobar(
    "el A1 de conversión apunta de vuelta al A4",
    convertido.vale_origen_id === a4.id,
    convertido.codigo,
  );

  const [tras] = await rest(
    `vw_vales_detalle?select=convertido,referidos,referidos_convertidos&codigo=eq.${a4.codigo}`,
  );
  comprobar("el A4 queda marcado como convertido", tras.convertido === true);

  const [origen] = await rest(
    `vw_vales_detalle?select=referidos&codigo=eq.${a2.codigo}`,
  );
  comprobar(
    "el A2 acumula a la persona que trajo",
    origen.referidos === 1,
    `${origen.referidos} referidos`,
  );

  await debeFallar(
    "convertir en A1 algo que no es un A4 se rechaza",
    rpc("fn_emitir_vale", {
      p_usuario_id: creado.usuarioId,
      p_tipo: "A1",
      p_nombre: `Mala conversión ${MARCA}`,
      p_telefono: "5218112344005",
      p_segmento: "A1-30",
      p_vale_origen: a2.codigo,
    }),
    "SV009",
  );

  return a4;
}

async function probarAutorregistroA4(a1) {
  console.log("\nAutorregistro con código de referidor");

  const [tienda] = await rest(`tiendas?select=token,id&id=eq.${creado.tiendaId}`);

  const vale = await rpc("fn_autorregistro_a3", {
    p_token: tienda.token,
    p_nombre: `Referido QR ${MARCA}`,
    p_telefono: "5218112399010",
    p_codigo_referidor: a1.codigo,
    p_usuario_id: creado.usuarioId,
  });
  comprobar(
    "con código de referidor el autorregistro sale A4",
    vale.tipo === "A4" && /^AR-A4-T\d{3,}-\d{5}$/.test(vale.codigo),
    vale.codigo,
  );
  comprobar("queda ligado al referidor", vale.vale_origen_id === a1.id);
  comprobar(
    "también se acredita a la asesora",
    vale.usuario_id === creado.usuarioId,
  );
  comprobar(
    "el A4 conserva la tarifa general, no la del A3",
    Number(vale.descuento_oro_pct) === 20 &&
      Number(vale.descuento_plata_pct) === 40,
    `${vale.descuento_oro_pct}% oro · ${vale.descuento_plata_pct}% plata`,
  );

  await debeFallar(
    "un código de referidor inválido se rechaza también aquí",
    rpc("fn_autorregistro_a3", {
      p_token: tienda.token,
      p_nombre: `Malo ${MARCA}`,
      p_telefono: "5218112399011",
      // V000 no lo puede generar nadie: `fn_prefijo_vendedora` rellena el id
      // a tres dígitos y los ids arrancan en 1.
      p_codigo_referidor: "AR-A1-V000-00000",
      p_usuario_id: creado.usuarioId,
    }),
    "SV009",
  );
}

async function probarCampanaCerrada() {
  console.log("\nCampaña con fecha de corte");

  // Se tocan las dos claves y se restauran al final: la del tipo manda sobre
  // la general, así que para probar «sin fecha de corte» hay que vaciar las
  // dos, o el A3 seguiría heredando el cierre de la campaña.
  const CLAVES = ["vigencia_hasta_a3", "vigencia_hasta"];

  const antes = Object.fromEntries(
    await Promise.all(
      CLAVES.map(async (c) => {
        const [fila] = await rest(`configuracion?select=valor&clave=eq.${c}`);
        return [c, fila?.valor ?? ""];
      }),
    ),
  );

  const poner = (valor, clave = "vigencia_hasta_a3") =>
    rest(`configuracion?clave=eq.${clave}`, {
      method: "PATCH",
      body: JSON.stringify({ valor }),
    });

  try {
    // Una campaña que cerró ayer: emitir daría un vale nacido muerto.
    await poner("2020-01-31");
    await debeFallar(
      "con la campaña cerrada no se emite un vale ya vencido",
      rpc("fn_emitir_vale", {
        p_usuario_id: creado.usuarioId,
        p_tipo: "A3",
        p_nombre: `Tarde ${MARCA}`,
        p_telefono: "5218112345001",
      }),
      "SV011",
    );

    // Y no debe haberse quemado un correlativo del bloque por el intento.
    const [cupoTras] = await rpc("fn_resumen_rango", {
      p_usuario_id: creado.usuarioId,
    });
    comprobar(
      "el intento fallido no consume correlativo",
      typeof cupoTras.restantes === "number",
      `quedan ${cupoTras.restantes}`,
    );

    // Sin ninguna de las dos, el A3 vuelve a la ventana rodante de días.
    await poner("");
    await poner("", "vigencia_hasta");
    const suelto = await rpc("fn_emitir_vale", {
      p_usuario_id: creado.usuarioId,
      p_tipo: "A3",
      p_nombre: `Sin corte ${MARCA}`,
      p_telefono: "5218112345002",
    });
    comprobar(
      "sin fecha de corte el A3 vuelve a los 30 días",
      Math.round(
        (new Date(suelto.fecha_vencimiento) - new Date(suelto.fecha_emision)) /
          86400000,
      ) === 30,
    );

    await debeFallar(
      "una fecha con formato inválido se rechaza",
      poner("31/10/2026").then(() =>
        rpc("fn_emitir_vale", {
          p_usuario_id: creado.usuarioId,
          p_tipo: "A3",
          p_nombre: `Formato ${MARCA}`,
          p_telefono: "5218112345003",
        }),
      ),
      "SV011",
    );
  } finally {
    // Se deja la configuración exactamente como estaba.
    for (const c of CLAVES) await poner(antes[c], c);
  }
}

async function probarCorregirCompras(vale) {
  console.log("\nCorregir y eliminar compras");

  const [admin] = await rest("usuarios?select=id&rol=eq.admin&activo=is.true&limit=1");

  const compra = await rpc("fn_registrar_redencion", {
    p_codigo: vale.codigo,
    p_usuario_id: creado.usuarioId,
    p_tienda_id: creado.tiendaId,
    p_nombre: `Corregible ${MARCA}`,
    p_telefono: "5218112347001",
    p_correo: null,
    p_monto: 1000,
    p_monto_oro: 1000,
    p_monto_plata: 0,
  });
  comprobar(
    "la compra nace sin firma de corrección",
    compra.editada_por === null && compra.fecha_edicion === null,
  );

  const base = {
    p_id: compra.id,
    p_tienda_id: creado.tiendaId,
    p_nombre: `Corregible ${MARCA}`,
    p_telefono: "5218112347001",
    p_monto: 2000,
    p_monto_oro: 2000,
    p_monto_plata: 0,
  };

  await debeFallar(
    "una vendedora no puede corregir",
    rpc("fn_editar_redencion", { ...base, p_usuario_id: creado.usuarioId }),
    "SV012",
  );

  await debeFallar(
    "un reparto mayor que el total se rechaza al corregir",
    rpc("fn_editar_redencion", {
      ...base,
      p_usuario_id: admin.id,
      p_monto: 100,
      p_monto_oro: 90,
      p_monto_plata: 50,
    }),
    "SV006",
  );

  await debeFallar(
    "un monto de cero se rechaza",
    rpc("fn_editar_redencion", {
      ...base,
      p_usuario_id: admin.id,
      p_monto: 0,
      p_monto_oro: 0,
    }),
    "SV006",
  );

  const corregida = await rpc("fn_editar_redencion", {
    ...base,
    p_usuario_id: admin.id,
  });
  comprobar(
    "el administrador corrige el monto",
    Number(corregida.monto_compra) === 2000,
    `quedó en ${corregida.monto_compra}`,
  );
  comprobar(
    "sin descuento explícito se recalcula con la tarifa del vale",
    Number(corregida.descuento_aplicado) ===
      Math.round(2000 * Number(vale.descuento_oro_pct)) / 100,
    `${corregida.descuento_aplicado} con ${vale.descuento_oro_pct}% de oro`,
  );
  comprobar(
    "queda firmada la corrección",
    corregida.editada_por === admin.id && corregida.fecha_edicion !== null,
  );

  // Corregir el teléfono mueve la compra a la persona correcta.
  const movida = await rpc("fn_editar_redencion", {
    ...base,
    p_usuario_id: admin.id,
    p_nombre: `Comprador real ${MARCA}`,
    p_telefono: "5218112347002",
  });
  comprobar(
    "cambiar el teléfono mueve la compra de persona",
    movida.contacto_id !== compra.contacto_id,
  );
  const viejo = await rest(`contactos?select=id&id=eq.${compra.contacto_id}`);
  comprobar(
    "y el contacto anterior se va si no le quedaba nada",
    viejo.length === 0,
  );

  await debeFallar(
    "una vendedora no puede eliminar una compra",
    rpc("fn_eliminar_redencion", {
      p_id: compra.id,
      p_usuario_id: creado.usuarioId,
    }),
    "SV012",
  );

  const resp = await rpc("fn_eliminar_redencion", {
    p_id: compra.id,
    p_usuario_id: admin.id,
  });
  const borrada = Array.isArray(resp) ? resp[0] : resp;
  comprobar(
    "el administrador elimina la compra",
    borrada.vale_codigo === vale.codigo,
    JSON.stringify(borrada),
  );

  const quedan = await rest(`redenciones?select=id&id=eq.${compra.id}`);
  comprobar("ya no está en la base", quedan.length === 0);

  await debeFallar(
    "eliminar una que ya no existe se rechaza",
    rpc("fn_eliminar_redencion", { p_id: compra.id, p_usuario_id: admin.id }),
    "SV014",
  );
}

async function probarRetirarVales(a1ConCompras, a2ConReferido) {
  console.log("\nAnular y eliminar");

  const [admin] = await rest("usuarios?select=id&rol=eq.admin&activo=is.true&limit=1");

  // Un vale limpio, del que se puede tirar sin consecuencias.
  const limpio = await rpc("fn_emitir_vale", {
    p_usuario_id: creado.usuarioId,
    p_tipo: "A1",
    p_nombre: `Desechable ${MARCA}`,
    p_telefono: "5218112346001",
    p_segmento: "A1-30",
  });

  await debeFallar(
    "una vendedora no puede anular",
    rpc("fn_anular_vale", {
      p_codigo: limpio.codigo,
      p_usuario_id: creado.usuarioId,
      p_motivo: "Prueba de permisos",
    }),
    "SV012",
  );

  await debeFallar(
    "anular sin motivo se rechaza",
    rpc("fn_anular_vale", {
      p_codigo: limpio.codigo,
      p_usuario_id: admin.id,
      p_motivo: "  ",
    }),
    "SV006",
  );

  const anulado = await rpc("fn_anular_vale", {
    p_codigo: limpio.codigo,
    p_usuario_id: admin.id,
    p_motivo: "Se emitió por error",
  });
  comprobar(
    "el administrador anula y queda el motivo y quién fue",
    anulado.anulado === true &&
      anulado.motivo_anulacion === "Se emitió por error" &&
      anulado.anulado_por === admin.id,
  );

  await debeFallar(
    "anular dos veces se rechaza",
    rpc("fn_anular_vale", {
      p_codigo: limpio.codigo,
      p_usuario_id: admin.id,
      p_motivo: "Otra vez",
    }),
    "SV002",
  );

  const reactivado = await rpc("fn_reactivar_vale", {
    p_codigo: limpio.codigo,
    p_usuario_id: admin.id,
  });
  comprobar(
    "reactivar deshace la anulación y limpia el motivo",
    reactivado.anulado === false &&
      reactivado.motivo_anulacion === null &&
      reactivado.anulado_por === null,
  );

  await debeFallar(
    "reactivar uno que no está anulado se rechaza",
    rpc("fn_reactivar_vale", {
      p_codigo: limpio.codigo,
      p_usuario_id: admin.id,
    }),
    "SV002",
  );

  await debeFallar(
    "una vendedora no puede eliminar",
    rpc("fn_eliminar_vale", {
      p_codigo: limpio.codigo,
      p_usuario_id: creado.usuarioId,
    }),
    "SV012",
  );

  // Lo que protege la contabilidad: un vale con compras no se borra.
  await debeFallar(
    "un vale con compras no se puede eliminar",
    rpc("fn_eliminar_vale", {
      p_codigo: a1ConCompras.codigo,
      p_usuario_id: admin.id,
    }),
    "SV013",
  );

  // Ni uno que trajo gente: se perdería de dónde vinieron.
  await debeFallar(
    "un vale que trajo referidos no se puede eliminar",
    rpc("fn_eliminar_vale", {
      p_codigo: a2ConReferido.codigo,
      p_usuario_id: admin.id,
    }),
    "SV013",
  );

  // Con parámetros OUT y sin SETOF, PostgREST devuelve un objeto suelto y
  // no un arreglo de una fila.
  const respuesta = await rpc("fn_eliminar_vale", {
    p_codigo: limpio.codigo,
    p_usuario_id: admin.id,
  });
  const borrado = Array.isArray(respuesta) ? respuesta[0] : respuesta;
  comprobar(
    "un vale sin rastro sí se elimina",
    borrado.codigo_borrado === limpio.codigo,
    JSON.stringify(borrado),
  );
  comprobar(
    "y su portador sale del directorio por no quedarle nada",
    borrado.contacto_borrado === true,
  );

  const quedan = await rest(`vales?select=id&codigo=eq.${limpio.codigo}`);
  comprobar("ya no está en la base", quedan.length === 0);

  const contacto = await rest(
    `contactos?select=id&id=eq.${limpio.contacto_id}`,
  );
  comprobar("el contacto tampoco", contacto.length === 0);

  await debeFallar(
    "eliminar uno que no existe se rechaza",
    rpc("fn_eliminar_vale", {
      p_codigo: limpio.codigo,
      p_usuario_id: admin.id,
    }),
    "SV002",
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
  const { a1, a2 } = await probarEmision();
  await probarRedencion(a1);
  await probarA1SinLimite();
  await probarAutorregistro();
  await probarA4Referidos(a2);
  await probarAutorregistroA4(a1);
  await probarCampanaCerrada();
  await probarCorregirCompras(a1);
  await probarRetirarVales(a1, a2);
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
