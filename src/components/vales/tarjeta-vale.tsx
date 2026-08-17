"use client";

import { useState } from "react";
import Image from "next/image";
import QRCode from "react-qr-code";
import { Check, Download, FileText, MessageCircle } from "lucide-react";

import {
  enlaceWhatsApp,
  mensajeVale,
  urlPdfVale,
  urlPublicaVale,
  urlTarjetaVale,
} from "@/lib/compartir";
import {
  AVISO_LEGAL,
  PALETA,
  PASOS,
  TITULO_PASOS,
  type TrazoIcono,
  leyendaVigencia,
  notaEstatus,
} from "@/lib/vale-plantilla";
import type { EstadoVale, TipoVale } from "@/lib/supabase/types";
import { ETIQUETA_TIPO } from "@/lib/supabase/types";

export type DatosTarjeta = {
  codigo: string;
  /** Identificador del enlace público; el QR lo lleva a él. */
  token: string;
  tipo: TipoVale;
  estado: EstadoVale;
  descuentoOro: number;
  descuentoPlata: number;
  portador: string;
  telefono: string;
  /** Ya formateada. */
  vigencia: string;
};

/**
 * Tarjeta del vale y sus tres salidas: WhatsApp, imagen y PDF.
 *
 * Lo que se ve aquí es la vista en pantalla. La imagen que se descarga o se
 * comparte la dibuja el servidor en `/api/v/[token]/imagen`, con el mismo
 * diseño pero a 800×1200 y sin depender del navegador. Los colores, los
 * textos y los iconos salen de `lib/vale-plantilla.ts` para que las dos no
 * puedan separarse.
 */
export function TarjetaVale({
  vale,
  compacta = false,
}: {
  vale: DatosTarjeta;
  /** Sin botones: para la página pública, que solo muestra. */
  compacta?: boolean;
}) {
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const url = urlPublicaVale(vale.token);
  const mensaje = mensajeVale({
    nombre: vale.portador,
    codigo: vale.codigo,
    token: vale.token,
    descuentoOro: vale.descuentoOro,
    descuentoPlata: vale.descuentoPlata,
    vigencia: vale.vigencia,
  });

  const vigente = vale.estado === "activo";
  const nota = notaEstatus(vale.portador);

  /**
   * La imagen la dibuja el servidor y aquí solo se descarga o se pasa a la
   * hoja nativa de compartir, que en móvil permite mandarla directa a
   * WhatsApp. Antes se capturaba esta misma tarjeta del DOM, pero salía sin
   * texto ni fondo: la técnica clona el nodo dentro de un SVG donde no llegan
   * las fuentes ni las variables de color.
   */
  async function compartirImagen() {
    const nombre = `vale-${vale.codigo}.png`;
    setOcupado("imagen");

    try {
      const respuesta = await fetch(urlTarjetaVale(vale.token));
      if (!respuesta.ok) throw new Error("No se pudo generar la imagen.");
      const blob = await respuesta.blob();
      const archivo = new File([blob], nombre, { type: "image/png" });

      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: `Vale ${vale.codigo}` });
        return;
      }

      // Escritorio: sin hoja de compartir, se baja el archivo.
      const enlace = document.createElement("a");
      enlace.href = URL.createObjectURL(blob);
      enlace.download = nombre;
      enlace.click();
      URL.revokeObjectURL(enlace.href);
    } catch (e) {
      // Cancelar la hoja de compartir lanza AbortError: no es un fallo.
      if ((e as Error)?.name !== "AbortError") {
        window.open(urlTarjetaVale(vale.token, true), "_blank");
      }
    } finally {
      setOcupado(null);
    }
  }

  async function copiarEnlace() {
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* La tarjeta que ve el cliente */}
      <div
        className="rounded-panel relative overflow-hidden"
        style={{ backgroundColor: PALETA.fondo }}
      >
        <div className="vale-textura pointer-events-none absolute inset-0" />

        {/* Trazos geométricos de las esquinas */}
        <div
          className="pointer-events-none absolute top-3 left-3 size-8 border-t border-l"
          style={{ borderColor: PALETA.oro }}
        />
        <div
          className="pointer-events-none absolute right-3 bottom-3 size-8 border-r border-b"
          style={{ borderColor: PALETA.oro }}
        />

        <div className="relative flex flex-col items-center px-6 py-8 sm:px-8">
          <Image
            src="/brand/ariga-logo.png"
            alt="ARIGA Joyería"
            width={72}
            height={72}
            className="rounded-full"
            priority
          />
          <span
            className="font-display mt-[6px] text-[27px] leading-none tracking-[0.08em]"
            style={{ color: PALETA.oro }}
          >
            ARIGA
          </span>
          <span
            className="mt-[7px] ml-[0.42em] text-[9px] tracking-[0.42em]"
            style={{ color: PALETA.oro }}
          >
            JOYERÍA
          </span>

          <div
            className="mt-[14px] mb-4 h-px w-10 opacity-60"
            style={{ backgroundColor: PALETA.oro }}
          />

          {/* Las dos tarifas juntas y partidas por la línea: enseñar solo una
              haría esperar ese porcentaje sobre toda la compra. */}
          <div className="flex items-center">
            {(
              [
                ["EN ORO", vale.descuentoOro],
                ["EN PLATA", vale.descuentoPlata],
              ] as [string, number][]
            ).map(([etiqueta, pct], i) => (
              <div key={etiqueta} className="flex items-center">
                {i === 1 ? (
                  <div
                    className="mx-5 h-[52px] w-px opacity-55"
                    style={{ backgroundColor: PALETA.oro }}
                  />
                ) : null}
                <span className="flex flex-col items-center">
                  <span
                    className="font-display text-[46px] leading-none"
                    style={{ color: PALETA.oro }}
                  >
                    {pct}%
                  </span>
                  <span
                    className="mt-[7px] ml-[0.22em] text-[9.5px] tracking-[0.22em]"
                    style={{ color: PALETA.gris }}
                  >
                    {etiqueta}
                  </span>
                </span>
              </div>
            ))}
          </div>

          {/* El QR lleva un enlace, no el código: cualquier cámara lo abre */}
          <div
            className="rounded-card mt-5 p-3"
            style={{ backgroundColor: PALETA.blanco }}
          >
            <QRCode
              value={url}
              size={140}
              level="H"
              bgColor={PALETA.blanco}
              fgColor="#0B0B0C"
            />
          </div>

          <span
            className="mt-[14px] font-mono text-[15px] font-medium tracking-[0.14em]"
            style={{ color: PALETA.oro }}
          >
            {vale.codigo}
          </span>
          <span className="mt-[7px] text-[11px]" style={{ color: PALETA.gris }}>
            {vale.portador} · {ETIQUETA_TIPO[vale.tipo]}
          </span>

          <div
            className="mt-4 mb-3 h-px w-full"
            style={{ backgroundColor: PALETA.divisor }}
          />

          <span className="text-[11.5px]" style={{ color: PALETA.gris }}>
            {leyendaVigencia(vale.estado, vale.vigencia)}
          </span>
          <span
            className="mt-[6px] text-center text-[10px] leading-relaxed opacity-75"
            style={{ color: PALETA.gris }}
          >
            {AVISO_LEGAL}
          </span>

          {/* Un vale vencido o anulado no invita a pasar por la tienda. */}
          {vigente ? (
            <div
              className="mt-4 flex w-full flex-col rounded-[12px] px-4 py-3"
              style={{
                backgroundColor: PALETA.textura,
                border: `1px solid ${PALETA.oro}40`,
              }}
            >
              <span
                className="mb-[10px] ml-[0.24em] text-center text-[9px] font-semibold tracking-[0.24em]"
                style={{ color: PALETA.oro }}
              >
                {TITULO_PASOS}
              </span>
              <ol className="m-0 flex list-none flex-col gap-[7px] p-0">
                {PASOS.map((paso) => (
                  <li key={paso.numero} className="flex items-center">
                    <Icono trazos={paso.trazos} />
                    <span
                      className="ml-[7px] w-[13px] text-[11px]"
                      style={{ color: PALETA.oro }}
                    >
                      {paso.numero}.
                    </span>
                    <span className="text-[11px]" style={{ color: PALETA.gris }}>
                      {paso.texto}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <span
            className="mt-[14px] text-center text-[9.5px] leading-relaxed opacity-70"
            style={{ color: PALETA.gris }}
          >
            {nota.antes}
            <span style={{ color: PALETA.oro }}>{nota.estatus}</span>
            {nota.despues}
          </span>
        </div>
      </div>

      {compacta ? null : (
        <div className="flex flex-col gap-2">
          <a
            href={enlaceWhatsApp(vale.telefono, mensaje)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-field tracking-action flex items-center justify-center gap-2 bg-[#25D366] px-5 py-[15px] text-[12px] font-semibold text-[#05340f] transition-opacity hover:opacity-90"
          >
            <MessageCircle size={16} />
            ENVIAR POR WHATSAPP
          </a>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={compartirImagen}
              disabled={ocupado !== null}
              className="border-ink/16 text-ink/70 hover:border-gold hover:text-ink rounded-field flex cursor-pointer items-center justify-center gap-2 border px-4 py-3 text-[11.5px] font-medium transition-colors disabled:opacity-50"
            >
              <Download size={15} />
              {ocupado === "imagen" ? "Generando…" : "Imagen"}
            </button>

            <a
              href={urlPdfVale(vale.codigo, true)}
              className="border-ink/16 text-ink/70 hover:border-gold hover:text-ink rounded-field flex items-center justify-center gap-2 border px-4 py-3 text-[11.5px] font-medium transition-colors"
            >
              <FileText size={15} />
              PDF
            </a>
          </div>

          <button
            type="button"
            onClick={copiarEnlace}
            className="text-ink/45 hover:text-gold-dark cursor-pointer py-1 text-[11.5px] transition-colors"
          >
            {copiado ? (
              <span className="text-gold-dark inline-flex items-center gap-1">
                <Check size={13} /> Enlace copiado
              </span>
            ) : (
              "Copiar enlace del vale"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Icono de un paso. Dibuja los mismos trazos que el PNG del servidor en vez de
 * importar el componente de lucide: así no hay dos iconos parecidos que se
 * puedan desincronizar.
 */
function Icono({ trazos }: { trazos: TrazoIcono[] }) {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke={PALETA.oro}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {trazos.map(([etiqueta, atributos], i) =>
        etiqueta === "rect" ? (
          <rect key={i} {...atributos} />
        ) : (
          <path key={i} {...atributos} />
        ),
      )}
    </svg>
  );
}
