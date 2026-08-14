import { NextResponse, type NextRequest } from "next/server";

import { requerirSesion } from "@/lib/auth/guardas";
import { cabecerasPdf, renderValePdf } from "@/lib/pdf";
import { qrDataUrl } from "@/lib/qr";
import { urlPublicaVale } from "@/lib/compartir";
import { valePorCodigo } from "@/lib/datos/vales";
import { fecha } from "@/lib/format";
import { ETIQUETA_TIPO } from "@/lib/supabase/types";

export const runtime = "nodejs";

/**
 * PDF del vale.
 *
 *   /api/vales/AR-A1-000045/pdf             → se abre en el visor
 *   /api/vales/AR-A1-000045/pdf?descargar=1 → se descarga
 *
 * A diferencia de la imagen, este documento exige sesión: es material
 * interno y una vendedora solo puede sacar los vales que emitió.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/api/vales/[codigo]/pdf">,
) {
  const sesion = await requerirSesion();
  const { codigo } = await params;

  const vale = await valePorCodigo(decodeURIComponent(codigo));

  if (!vale) {
    return NextResponse.json(
      { error: `No existe el vale ${codigo}.` },
      { status: 404 },
    );
  }

  if (sesion.rol !== "admin" && vale.usuario_id !== sesion.usuarioId) {
    return NextResponse.json(
      { error: "No tienes acceso a este vale." },
      { status: 403 },
    );
  }

  const enlace = urlPublicaVale(vale.codigo);

  const pdf = await renderValePdf({
    codigo: vale.codigo,
    tipo: vale.tipo,
    tipoEtiqueta: ETIQUETA_TIPO[vale.tipo],
    descuento: Number(vale.descuento_pct),
    portador: vale.portador,
    emision: fecha(vale.fecha_emision),
    vigencia: fecha(vale.fecha_vencimiento),
    estado: vale.estado,
    emisora: vale.emisora ?? "Autorregistro",
    tienda: vale.tienda,
    qrDataUrl: await qrDataUrl(enlace, { tamano: 512 }),
    urlPublica: enlace,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: cabecerasPdf(
      `vale-${vale.codigo}.pdf`,
      request.nextUrl.searchParams.get("descargar") === "1",
    ),
  });
}
