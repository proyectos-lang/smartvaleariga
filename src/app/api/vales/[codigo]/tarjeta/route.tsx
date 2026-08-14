import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";

import { valePorCodigo } from "@/lib/datos/vales";
import { qrDataUrl } from "@/lib/qr";
import { urlPublicaVale } from "@/lib/compartir";
import { fecha } from "@/lib/format";
import { ETIQUETA_TIPO } from "@/lib/supabase/types";

export const runtime = "nodejs";

/**
 * Imagen del vale (PNG 1200×630).
 *
 * Es pública a propósito: la usa la vista previa de WhatsApp cuando la
 * vendedora manda el enlace, y ahí no hay sesión. Solo expone lo que ya
 * lleva la tarjeta impresa —código, descuento y vigencia—, nunca el
 * teléfono ni el correo del portador.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/vales/[codigo]/tarjeta">,
) {
  const { codigo } = await params;
  const vale = await valePorCodigo(decodeURIComponent(codigo));

  if (!vale) {
    return NextResponse.json({ error: "Vale no encontrado." }, { status: 404 });
  }

  const qr = await qrDataUrl(urlPublicaVale(vale.codigo), {
    tamano: 320,
    margen: 1,
  });

  const oro = "#C6A15B";
  const oroClaro = "#E7CE92";
  const tinta = "#0B0B0C";
  const hueso = "#F6F3ED";

  const leyenda =
    vale.estado === "activo"
      ? `Vigente hasta el ${fecha(vale.fecha_vencimiento)}`
      : vale.estado === "vencido"
        ? `Venció el ${fecha(vale.fecha_vencimiento)}`
        : "Vale anulado";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: tinta,
          color: hueso,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Rombos de la marca */}
        <div
          style={{
            position: "absolute",
            width: 420,
            height: 420,
            right: -150,
            top: -170,
            border: `1px solid ${oro}44`,
            transform: "rotate(45deg)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 260,
            height: 260,
            left: -110,
            bottom: -120,
            border: `1px solid ${oro}33`,
            transform: "rotate(45deg)",
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            flex: 1,
            padding: "56px 64px",
            alignItems: "center",
            gap: 56,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 22 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span
                style={{
                  fontSize: 22,
                  letterSpacing: 14,
                  color: oroClaro,
                  fontWeight: 700,
                }}
              >
                ARIGA
              </span>
              <span style={{ fontSize: 13, letterSpacing: 8, color: "#8E8A82" }}>
                JOYERÍA
              </span>
            </div>

            <div style={{ display: "flex", width: 64, height: 2, backgroundColor: oro }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 108, color: oroClaro, lineHeight: 1, fontWeight: 700 }}>
                {Number(vale.descuento_pct)}%
              </span>
              <span style={{ fontSize: 20, letterSpacing: 5, color: "#A8A49C" }}>
                DE DESCUENTO
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              <span style={{ fontSize: 34, color: hueso, letterSpacing: 4, fontWeight: 700 }}>
                {vale.codigo}
              </span>
              <span style={{ fontSize: 18, color: "#8E8A82" }}>
                {ETIQUETA_TIPO[vale.tipo]} · {leyenda}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                padding: 16,
                backgroundColor: hueso,
                borderRadius: 6,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} width={260} height={260} alt="" />
            </div>
            <span style={{ fontSize: 15, color: "#8E8A82" }}>
              Escanea para presentarlo
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // La tarjeta no cambia salvo que se anule el vale; un día de caché
        // le ahorra el trabajo a la vista previa de WhatsApp.
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    },
  );
}
