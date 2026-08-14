import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";

import { valePorToken } from "@/lib/datos/vales";
import { qrDataUrl } from "@/lib/qr";
import { urlPublicaVale } from "@/lib/compartir";
import { fecha } from "@/lib/format";
import { ETIQUETA_TIPO } from "@/lib/supabase/types";
import { LOGO_DATA_URL } from "@/lib/marca-datos";

export const runtime = "nodejs";

/**
 * Imagen del vale, en dos formatos.
 *
 *   ?formato=social    1200×630 apaisada — la vista previa del enlace
 *   ?formato=tarjeta    800×1200 vertical — la que se comparte como imagen
 *   ?descargar=1        fuerza la descarga en vez de abrirla
 *
 * Se dibuja en el servidor y no capturando el DOM con `html-to-image`: esa
 * técnica clona el nodo dentro de un `<foreignObject>` de SVG, donde no
 * llegan las fuentes de `next/font` ni las variables CSS de Tailwind, así que
 * la tarjeta salía sin texto y sin fondo. Aquí el resultado es idéntico en
 * cualquier navegador y teléfono.
 *
 * Es pública a propósito: la pide el servidor de WhatsApp al generar la vista
 * previa, y ahí no hay sesión. Solo expone lo que ya lleva impreso la
 * tarjeta; nunca el teléfono ni el correo del portador.
 */

const ORO = "#C6A15B";
const ORO_CLARO = "#E7CE92";
const TINTA = "#0B0B0C";
const HUESO = "#F6F3ED";
const TENUE = "#8E8A82";

export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/api/v/[token]/imagen">,
) {
  const { token } = await params;
  const vale = await valePorToken(decodeURIComponent(token));

  if (!vale) {
    return NextResponse.json({ error: "Vale no encontrado." }, { status: 404 });
  }

  const vertical = request.nextUrl.searchParams.get("formato") === "tarjeta";
  const descargar = request.nextUrl.searchParams.get("descargar") === "1";

  const enlace = urlPublicaVale(vale.token);
  const qr = await qrDataUrl(enlace, { tamano: vertical ? 620 : 320, margen: 1 });
  // Las dos tarifas siempre juntas: enseñar solo una haría esperar ese
  // porcentaje sobre toda la compra.
  const tarifas: [string, number][] = [
    ["EN ORO", Number(vale.descuento_oro_pct)],
    ["EN PLATA", Number(vale.descuento_plata_pct)],
  ];

  const leyenda =
    vale.estado === "activo"
      ? `Vigente hasta el ${fecha(vale.fecha_vencimiento)}`
      : vale.estado === "vencido"
        ? `Venció el ${fecha(vale.fecha_vencimiento)}`
        : "Vale anulado";

  const cabeceras = {
    "Cache-Control": descargar
      ? "private, no-store"
      : "public, max-age=86400, stale-while-revalidate=604800",
    ...(descargar
      ? {
          "Content-Disposition": `attachment; filename="vale-${vale.codigo}.png"`,
        }
      : {}),
  };

  /* ── Formato vertical: el que se manda por WhatsApp como imagen ──────── */
  if (vertical) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: TINTA,
            color: HUESO,
            fontFamily: "sans-serif",
            padding: "64px 56px",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 520,
              height: 520,
              right: -230,
              top: -230,
              border: `1px solid ${ORO}33`,
              transform: "rotate(45deg)",
              display: "flex",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 380,
              height: 380,
              left: -190,
              bottom: -190,
              border: `1px solid ${ORO}2b`,
              transform: "rotate(45deg)",
              display: "flex",
            }}
          />

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_DATA_URL} width={190} height={190} alt="" />

          <div
            style={{
              display: "flex",
              width: 70,
              height: 2,
              backgroundColor: ORO,
              margin: "34px 0 26px",
            }}
          />

          <div style={{ display: "flex", alignItems: "flex-end", gap: 56 }}>
            {tarifas.map(([etiqueta, pct]) => (
              <div
                key={etiqueta}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 118,
                    lineHeight: 1,
                    color: ORO_CLARO,
                    fontWeight: 700,
                  }}
                >
                  {pct}%
                </span>
                <span
                  style={{
                    fontSize: 22,
                    letterSpacing: 6,
                    color: TENUE,
                    marginTop: 10,
                  }}
                >
                  {etiqueta}
                </span>
              </div>
            ))}
          </div>
          <span
            style={{
              fontSize: 20,
              letterSpacing: 4,
              color: "#5F5C57",
              marginTop: 18,
            }}
          >
            DE DESCUENTO
          </span>

          <div
            style={{
              display: "flex",
              backgroundColor: HUESO,
              borderRadius: 8,
              padding: 20,
              margin: "40px 0 28px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} width={300} height={300} alt="" />
          </div>

          <span
            style={{
              fontSize: 40,
              letterSpacing: 6,
              color: HUESO,
              fontWeight: 700,
            }}
          >
            {vale.codigo}
          </span>
          <span style={{ fontSize: 22, color: TENUE, marginTop: 14 }}>
            {vale.portador} · {ETIQUETA_TIPO[vale.tipo]}
          </span>
          <span style={{ fontSize: 22, color: TENUE, marginTop: 8 }}>
            {leyenda}
          </span>

          <span
            style={{
              fontSize: 17,
              color: "#5F5C57",
              marginTop: 40,
              textAlign: "center",
            }}
          >
            Preséntalo en cualquier sucursal ARIGA. No es canjeable por efectivo.
          </span>
        </div>
      ),
      { width: 800, height: 1200, headers: cabeceras },
    );
  }

  /* ── Formato apaisado: la vista previa del enlace ────────────────────── */
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: TINTA,
          color: HUESO,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 420,
            height: 420,
            right: -150,
            top: -170,
            border: `1px solid ${ORO}44`,
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
            border: `1px solid ${ORO}33`,
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
          <div
            style={{ display: "flex", flexDirection: "column", flex: 1, gap: 18 }}
          >
            {/* Grande a propósito: WhatsApp muestra la vista previa a menos
                de la mitad de ancho, y el nombre va dentro del logotipo. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_DATA_URL} width={158} height={158} alt="" />

            <div
              style={{ display: "flex", width: 64, height: 2, backgroundColor: ORO }}
            />

            <div style={{ display: "flex", alignItems: "flex-end", gap: 40 }}>
              {tarifas.map(([etiqueta, pct]) => (
                <div
                  key={etiqueta}
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <span
                    style={{
                      fontSize: 96,
                      color: ORO_CLARO,
                      lineHeight: 1,
                      fontWeight: 700,
                    }}
                  >
                    {pct}%
                  </span>
                  <span
                    style={{ fontSize: 19, letterSpacing: 4, color: "#A8A49C" }}
                  >
                    {etiqueta}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginTop: 8,
              }}
            >
              <span
                style={{
                  fontSize: 34,
                  color: HUESO,
                  letterSpacing: 4,
                  fontWeight: 700,
                }}
              >
                {vale.codigo}
              </span>
              <span style={{ fontSize: 18, color: TENUE }}>
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
                backgroundColor: HUESO,
                borderRadius: 6,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} width={260} height={260} alt="" />
            </div>
            <span style={{ fontSize: 15, color: TENUE }}>
              Escanea para presentarlo
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: cabeceras },
  );
}
