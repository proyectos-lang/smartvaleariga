import { NextResponse, type NextRequest } from "next/server";

import { cabecerasPdf, renderValePdf } from "@/lib/pdf";
import { qrDataUrl, urlCanje } from "@/lib/qr";
import { fecha, moneda } from "@/lib/format";
import { VALES_DEMO } from "@/lib/datos-demo";

export const runtime = "nodejs";

/**
 * PDF del vale.
 *
 *   /api/vales/AR-2451/pdf            → se abre en el visor
 *   /api/vales/AR-2451/pdf?descargar=1 → se descarga
 *
 * Hoy lee de los datos de muestra; al conectar Supabase, aquí va la consulta
 * del vale y la verificación de permisos antes de renderizar.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/api/vales/[folio]/pdf">,
) {
  const { folio } = await params;

  const vale = VALES_DEMO.find(
    (v) => v.folio.toLowerCase() === folio.toLowerCase(),
  );

  if (!vale) {
    return NextResponse.json(
      { error: `No existe el vale ${folio}.` },
      { status: 404 },
    );
  }

  const enlace = urlCanje(vale.folio);

  const pdf = await renderValePdf({
    folio: vale.folio,
    cliente: vale.cliente,
    concepto: vale.pieza,
    monto: moneda(vale.monto),
    vigencia: fecha(vale.vence),
    sucursal: "Sucursal Centro",
    qrDataUrl: await qrDataUrl(enlace, { tamano: 512 }),
    urlCanje: enlace,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: cabecerasPdf(
      `vale-${vale.folio}.pdf`,
      request.nextUrl.searchParams.get("descargar") === "1",
    ),
  });
}
