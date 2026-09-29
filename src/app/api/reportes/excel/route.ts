import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { requerirAdmin } from "@/lib/auth/guardas";
import { desempenoVendedoras } from "@/lib/datos/metricas";
import { listarRedenciones } from "@/lib/datos/redenciones";
import { listarVales } from "@/lib/datos/vales";
import { listarVentasNormales } from "@/lib/datos/ventas-normales";
import { ventasPorTienda } from "@/lib/datos/ventas";
import { fechaExcel } from "@/lib/format";
import { ETIQUETA_SEGMENTO, ETIQUETA_TIPO } from "@/lib/supabase/types";

export const runtime = "nodejs";

/**
 * Reporte completo en Excel: cinco hojas —vendedoras, vales, redenciones,
 * ventas sin vale y el resumen por tienda con los cuatro totales—.
 *
 * Se genera un .xlsx de verdad y no un CSV porque Excel interpreta el
 * separador y la codificación según la configuración regional de cada
 * equipo: un CSV con acentos y comas acaba en una sola columna con la
 * mitad de las tildes rotas. Aquí los tipos van declarados.
 *
 * Solo administradores: contiene teléfonos y correos de clientes.
 */

const CABECERA = { argb: "FF0B0B0C" };
const ORO = { argb: "FFE7CE92" };

type Columna = { header: string; key: string; width: number; formato?: string };

const MONEDA = '"Q" #,##0.00';
const PORCENTAJE = "0.0";
// Declarados y no heredados de la región del equipo: el mismo archivo abierto
// en dos computadoras tiene que decir el mismo día.
const FECHA = "dd/mm/yyyy";
const FECHA_HORA = "dd/mm/yyyy hh:mm";

function hoja(
  libro: ExcelJS.Workbook,
  nombre: string,
  columnas: Columna[],
  filas: Record<string, unknown>[],
) {
  const h = libro.addWorksheet(nombre, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  h.columns = columnas.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
    style: c.formato ? { numFmt: c.formato } : undefined,
  }));

  h.getRow(1).eachCell((celda) => {
    celda.font = { bold: true, color: ORO, size: 10 };
    celda.fill = { type: "pattern", pattern: "solid", fgColor: CABECERA };
    celda.alignment = { vertical: "middle" };
  });
  h.getRow(1).height = 22;

  filas.forEach((f) => h.addRow(f));

  // Autofiltro sobre toda la tabla: lo primero que hace cualquiera al abrirlo.
  if (filas.length > 0) {
    h.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columnas.length },
    };
  }

  return h;
}

export async function GET() {
  await requerirAdmin();

  const [desempeno, vales, redenciones, normales, porTienda] =
    await Promise.all([
      desempenoVendedoras("ingreso"),
      listarVales({ porPagina: 5000 }),
      listarRedenciones({ porPagina: 5000 }),
      listarVentasNormales({ porPagina: 5000 }),
      ventasPorTienda(),
    ]);

  const libro = new ExcelJS.Workbook();
  libro.creator = "ARIGA SMART VALE";
  libro.created = new Date();

  /* ── Vendedoras ─────────────────────────────────────────────────────── */
  hoja(
    libro,
    "Vendedoras",
    [
      { header: "Vendedora", key: "vendedora", width: 26 },
      { header: "Acceso", key: "correo", width: 20 },
      { header: "Rol", key: "rol", width: 12 },
      { header: "Tienda", key: "tienda", width: 20 },
      { header: "Activa", key: "activo", width: 9 },
      { header: "Vales emitidos", key: "emitidos", width: 15 },
      { header: "A1", key: "a1", width: 7 },
      { header: "A2", key: "a2", width: 7 },
      { header: "A3", key: "a3", width: 7 },
      { header: "A4", key: "a4", width: 7 },
      { header: "Vigentes", key: "vigentes", width: 10 },
      { header: "Vencidos", key: "vencidos", width: 10 },
      { header: "Compras", key: "redenciones", width: 10 },
      { header: "Vales con compra", key: "conCompra", width: 17 },
      { header: "Conversión %", key: "conversion", width: 14, formato: PORCENTAJE },
      { header: "Venta generada", key: "ingreso", width: 17, formato: MONEDA },
      { header: "Ticket promedio", key: "ticket", width: 17, formato: MONEDA },
      { header: "Descuento otorgado", key: "descuento", width: 19, formato: MONEDA },
      { header: "Cupo asignado", key: "cupoTotal", width: 15 },
      { header: "Cupo restante", key: "cupoRestante", width: 15 },
      { header: "Última emisión", key: "ultimaEmision", width: 20 },
    ],
    (desempeno ?? []).map((d) => ({
      vendedora: d.vendedora,
      correo: d.correo,
      rol: d.rol === "admin" ? "Administrador" : "Vendedora",
      tienda: d.tienda ?? "",
      activo: d.activo ? "Sí" : "No",
      emitidos: d.vales_emitidos,
      a1: d.vales_a1,
      a2: d.vales_a2,
      a3: d.vales_a3,
      a4: d.vales_a4,
      vigentes: d.vales_vigentes,
      vencidos: d.vales_vencidos,
      redenciones: d.redenciones,
      conCompra: d.vales_con_compra,
      conversion: d.tasa_conversion === null ? null : Number(d.tasa_conversion),
      ingreso: Number(d.ingreso_generado),
      ticket: d.ticket_promedio === null ? null : Number(d.ticket_promedio),
      descuento: Number(d.descuento_otorgado),
      cupoTotal: d.correlativos_asignados,
      cupoRestante: d.correlativos_restantes,
      ultimaEmision: d.ultima_emision ? new Date(d.ultima_emision) : null,
    })),
  );

  /* ── Vales ──────────────────────────────────────────────────────────── */
  hoja(
    libro,
    "Vales",
    [
      { header: "Código", key: "codigo", width: 16 },
      { header: "Tipo", key: "tipo", width: 24 },
      { header: "Clasificación", key: "segmento", width: 22 },
      { header: "Origen", key: "origen", width: 26 },
      { header: "Portador", key: "portador", width: 26 },
      { header: "Teléfono", key: "telefono", width: 16 },
      { header: "Correo", key: "correo", width: 24 },
      { header: "Emitido por", key: "emisora", width: 24 },
      { header: "Tienda", key: "tienda", width: 20 },
      { header: "Lo refirió", key: "referidor", width: 24 },
      { header: "Vale del referidor", key: "origenCodigo", width: 18 },
      { header: "Personas que trajo", key: "referidos", width: 18 },
      { header: "% oro", key: "descuentoOro", width: 10, formato: PORCENTAJE },
      { header: "% plata", key: "descuentoPlata", width: 10, formato: PORCENTAJE },
      { header: "Emisión", key: "emision", width: 20, formato: FECHA_HORA },
      { header: "Vencimiento", key: "vencimiento", width: 20, formato: FECHA },
      { header: "Estado", key: "estado", width: 12 },
      { header: "Compras", key: "compras", width: 10 },
      { header: "Venta generada", key: "ingreso", width: 17, formato: MONEDA },
      { header: "Descuento otorgado", key: "descuento", width: 19, formato: MONEDA },
      { header: "Venta en oro", key: "ingresoOro", width: 16, formato: MONEDA },
      { header: "Venta en plata", key: "ingresoPlata", width: 16, formato: MONEDA },
    ],
    vales.vales.map((v) => ({
      codigo: v.codigo,
      tipo: `${v.tipo} · ${ETIQUETA_TIPO[v.tipo]}`,
      segmento: v.segmento ? ETIQUETA_SEGMENTO[v.segmento] : "",
      origen: v.origen ?? "",
      portador: v.portador,
      telefono: v.portador_telefono,
      correo: v.portador_correo ?? "",
      emisora: v.emisora,
      tienda: v.tienda ?? "",
      referidor: v.referidor ?? "",
      origenCodigo: v.origen_codigo ?? "",
      referidos: v.referidos,
      descuentoOro: Number(v.descuento_oro_pct),
      descuentoPlata: Number(v.descuento_plata_pct),
      emision: fechaExcel(v.fecha_emision),
      vencimiento: fechaExcel(v.fecha_vencimiento),
      estado: v.estado,
      compras: v.total_redenciones,
      ingreso: Number(v.ingreso_generado),
      descuento: Number(v.descuento_otorgado),
      ingresoOro: Number(v.ingreso_oro),
      ingresoPlata: Number(v.ingreso_plata),
    })),
  );

  /* ── Redenciones ────────────────────────────────────────────────────── */
  hoja(
    libro,
    "Redenciones",
    [
      { header: "Fecha", key: "fecha", width: 20, formato: FECHA_HORA },
      { header: "Vale", key: "codigo", width: 16 },
      { header: "Comprador", key: "comprador", width: 26 },
      { header: "Teléfono", key: "telefono", width: 16 },
      { header: "Correo", key: "correo", width: 24 },
      { header: "Le compartió", key: "referido", width: 24 },
      { header: "Tienda", key: "tienda", width: 20 },
      { header: "Ticket", key: "ticket", width: 14 },
      { header: "Monto", key: "monto", width: 15, formato: MONEDA },
      { header: "En oro", key: "montoOro", width: 14, formato: MONEDA },
      { header: "En plata", key: "montoPlata", width: 14, formato: MONEDA },
      { header: "Descuento", key: "descuento", width: 15, formato: MONEDA },
      { header: "Registró", key: "registro", width: 24 },
      { header: "Nota", key: "nota", width: 30 },
    ],
    redenciones.redenciones.map((r) => ({
      fecha: fechaExcel(r.fecha_creacion),
      codigo: r.codigo,
      comprador: r.comprador,
      telefono: r.comprador_telefono,
      correo: r.comprador_correo ?? "",
      referido: r.referido_por ?? "",
      tienda: r.tienda,
      ticket: r.ticket ?? "",
      monto: r.monto_compra,
      montoOro: r.monto_oro,
      montoPlata: r.monto_plata,
      descuento: r.descuento_aplicado,
      registro: r.registrada_por,
      nota: r.nota ?? "",
    })),
  );

  /* ── Ventas sin vale ────────────────────────────────────────────────── */
  hoja(
    libro,
    "Ventas sin vale",
    [
      { header: "Fecha", key: "fecha", width: 20, formato: FECHA_HORA },
      { header: "Tienda", key: "tienda", width: 22 },
      { header: "Registró", key: "vendedora", width: 24 },
      { header: "Ticket", key: "ticket", width: 14 },
      { header: "Monto", key: "monto", width: 15, formato: MONEDA },
      { header: "En oro", key: "oro", width: 14, formato: MONEDA },
      { header: "En plata", key: "plata", width: 14, formato: MONEDA },
      { header: "Otras piezas", key: "otras", width: 15, formato: MONEDA },
    ],
    normales.ventas.map((v) => ({
      fecha: fechaExcel(v.fecha_creacion),
      tienda: v.tienda,
      vendedora: v.vendedora,
      ticket: v.ticket ?? "",
      monto: Number(v.monto),
      oro: Number(v.monto_oro),
      plata: Number(v.monto_plata),
      otras: Number(v.monto) - Number(v.monto_oro) - Number(v.monto_plata),
    })),
  );

  /* ── Resumen por tienda ─────────────────────────────────────────────── */
  //
  // Es la hoja que cuadra las dos vías de venta, y la única con fila de
  // totales: quien liquida abre esta, no las de detalle.
  const resumen = hoja(
    libro,
    "Por tienda",
    [
      { header: "Tienda", key: "tienda", width: 24 },
      { header: "Compras con vale", key: "tickets", width: 17 },
      { header: "Bruto con vales", key: "bruta", width: 17, formato: MONEDA },
      { header: "Comisiones", key: "comision", width: 16, formato: MONEDA },
      { header: "Neto con vales", key: "neta", width: 17, formato: MONEDA },
      { header: "Ventas sin vale", key: "normales", width: 16 },
      { header: "Monto sin vale", key: "ventaNormal", width: 17, formato: MONEDA },
      { header: "Gran total", key: "granTotal", width: 17, formato: MONEDA },
    ],
    porTienda.map((t) => ({
      tienda: t.tienda,
      tickets: t.tickets,
      bruta: Number(t.venta),
      comision: Number(t.comision),
      neta: Number(t.neta),
      normales: t.ventas_normales,
      ventaNormal: Number(t.venta_normal),
      granTotal: Number(t.gran_total),
    })),
  );

  // La fila de totales, con fórmulas y no con cifras ya sumadas: quien abra
  // el archivo y filtre o corrija una fila ve el total seguirle. Un número
  // fijo se quedaría contando lo que ya no está.
  if (porTienda.length > 0) {
    const primera = 2;
    const ultima = porTienda.length + 1;
    const suma = (col: string) => ({
      formula: `SUBTOTAL(109,${col}${primera}:${col}${ultima})`,
    });

    const fila = resumen.addRow({
      tienda: "TOTAL",
      tickets: suma("B"),
      bruta: suma("C"),
      comision: suma("D"),
      neta: suma("E"),
      normales: suma("F"),
      ventaNormal: suma("G"),
      granTotal: suma("H"),
    });

    fila.font = { bold: true };
    fila.eachCell((celda) => {
      celda.border = { top: { style: "double", color: CABECERA } };
    });
  }

  const buffer = await libro.xlsx.writeBuffer();
  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ariga-smart-vale-${fecha}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
