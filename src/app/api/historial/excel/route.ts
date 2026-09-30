import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";

import { alcanceDe, requerirSesion } from "@/lib/auth/guardas";
import { historialCompleto, type TipoVenta } from "@/lib/datos/historial";
import { nombreVia } from "@/components/ventas/chip-via";
import { fechaExcel } from "@/lib/format";

export const runtime = "nodejs";

/**
 * El historial de ventas en Excel, por las dos vías y con los filtros puestos.
 *
 * Respeta el alcance de quien descarga: una vendedora se lleva lo suyo, no
 * todo. Y respeta los filtros de la pantalla, porque descargar algo distinto
 * a lo que se está mirando es la forma más silenciosa de equivocarse.
 */

const CABECERA = { argb: "FF0B0B0C" };
const ORO = { argb: "FFE7CE92" };
const MONEDA = '"Q" #,##0.00';
const FECHA_HORA = "dd/mm/yyyy hh:mm";

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(peticion: NextRequest) {
  const sesion = await requerirSesion();
  const q = peticion.nextUrl.searchParams;

  const via = q.get("via") ?? "";
  const desde = q.get("desde") ?? "";
  const hasta = q.get("hasta") ?? "";

  const lineas = await historialCompleto({
    usuarioId: alcanceDe(sesion),
    tipo: via === "vale" || via === "normal" ? (via as TipoVenta) : undefined,
    tiendaId: Number(q.get("tienda")) || undefined,
    desde: ES_FECHA.test(desde) ? desde : null,
    hasta: ES_FECHA.test(hasta) ? hasta : null,
  });

  const libro = new ExcelJS.Workbook();
  libro.creator = "ARIGA SMART VALE";
  libro.created = new Date();

  const h = libro.addWorksheet("Ventas", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  h.columns = [
    { header: "Fecha", key: "fecha", width: 20, style: { numFmt: FECHA_HORA } },
    // La vía va segunda, junto a la fecha: es la columna por la que se filtra
    // y agrupa, no un dato de detalle que se busca al final de la fila.
    { header: "Tipo de venta", key: "via", width: 14 },
    { header: "Vale", key: "vale", width: 16 },
    { header: "Puerta", key: "puerta", width: 9 },
    { header: "Tienda", key: "tienda", width: 22 },
    { header: "Registró", key: "vendedora", width: 24 },
    { header: "Comprador", key: "comprador", width: 26 },
    { header: "Teléfono", key: "telefono", width: 16 },
    { header: "Ticket", key: "ticket", width: 14 },
    { header: "Monto", key: "monto", width: 15, style: { numFmt: MONEDA } },
    { header: "En oro", key: "oro", width: 14, style: { numFmt: MONEDA } },
    { header: "En plata", key: "plata", width: 14, style: { numFmt: MONEDA } },
    { header: "Descuento", key: "descuento", width: 15, style: { numFmt: MONEDA } },
    { header: "Entró en caja", key: "neto", width: 16, style: { numFmt: MONEDA } },
  ];

  h.getRow(1).eachCell((celda) => {
    celda.font = { bold: true, color: ORO, size: 10 };
    celda.fill = { type: "pattern", pattern: "solid", fgColor: CABECERA };
    celda.alignment = { vertical: "middle" };
  });
  h.getRow(1).height = 22;

  for (const l of lineas) {
    h.addRow({
      fecha: fechaExcel(l.fecha_creacion),
      via: nombreVia(l.tipo),
      vale: l.vale_codigo ?? "",
      puerta: l.vale_tipo ?? "",
      tienda: l.tienda,
      vendedora: l.vendedora,
      comprador: l.comprador ?? "",
      telefono: l.comprador_telefono ?? "",
      ticket: l.ticket ?? "",
      monto: Number(l.monto),
      oro: Number(l.monto_oro),
      plata: Number(l.monto_plata),
      descuento: Number(l.descuento),
      neto: Number(l.neto),
    });
  }

  if (lineas.length > 0) {
    h.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 14 } };

    // Totales con SUBTOTAL: al filtrar por vía en Excel, la suma sigue al
    // filtro en vez de quedarse contando lo que ya no se ve.
    const ultima = lineas.length + 1;
    const suma = (col: string) => ({
      formula: `SUBTOTAL(109,${col}2:${col}${ultima})`,
    });

    const fila = h.addRow({
      via: "TOTAL",
      monto: suma("J"),
      oro: suma("K"),
      plata: suma("L"),
      descuento: suma("M"),
      neto: suma("N"),
    });
    fila.font = { bold: true };
    fila.eachCell((celda) => {
      celda.border = { top: { style: "double", color: CABECERA } };
    });
  }

  const buffer = await libro.xlsx.writeBuffer();
  const dia = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ariga-ventas-${dia}.xlsx"`,
    },
  });
}
