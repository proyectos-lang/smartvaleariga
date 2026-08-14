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
import type { EstadoVale, TipoVale } from "@/lib/supabase/types";
import { ETIQUETA_TIPO } from "@/lib/supabase/types";

export type DatosTarjeta = {
  codigo: string;
  /** Identificador del enlace público; el QR lo lleva a él. */
  token: string;
  tipo: TipoVale;
  estado: EstadoVale;
  descuento: number;
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
 * diseño pero a 800×1200 y sin depender del navegador.
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
    descuento: vale.descuento,
    vigencia: vale.vigencia,
  });

  const vigente = vale.estado === "activo";

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
        className="bg-ink text-bone rounded-panel relative overflow-hidden"
        style={{ backgroundColor: "#0B0B0C" }}
      >
        <div className="ariga-hatch pointer-events-none absolute inset-0 opacity-[0.07]" />
        <div className="border-gold/20 absolute -top-24 -right-24 size-64 rotate-45 border" />

        <div className="relative flex flex-col items-center gap-5 px-6 py-8 sm:px-8">
          <div className="flex flex-col items-center gap-[10px]">
            <Image
              src="/brand/ariga-logo.png"
              alt="ARIGA Joyería"
              width={72}
              height={72}
              className="rounded-full"
              priority
            />
          </div>

          <div className="bg-gold/30 h-px w-12" />

          <div className="flex flex-col items-center gap-1">
            <span className="font-display text-gold-light text-[54px] leading-none">
              {vale.descuento}%
            </span>
            <span className="text-bone/50 text-[11px] tracking-[0.18em] uppercase">
              de descuento
            </span>
          </div>

          {/* El QR lleva un enlace, no el código: cualquier cámara lo abre */}
          <div className="rounded-card bg-bone p-3">
            <QRCode
              value={url}
              size={148}
              level="H"
              bgColor="#F6F3ED"
              fgColor="#0B0B0C"
            />
          </div>

          <div className="flex flex-col items-center gap-[6px]">
            <span className="text-gold-light font-mono text-[17px] font-medium tracking-[0.14em]">
              {vale.codigo}
            </span>
            <span className="text-bone/45 text-[11.5px]">
              {vale.portador} · {ETIQUETA_TIPO[vale.tipo]}
            </span>
          </div>

          <div className="border-bone/10 flex w-full flex-col items-center gap-1 border-t pt-4">
            <span className="text-bone/55 text-[11.5px]">
              {vigente
                ? `Vigente hasta el ${vale.vigencia}`
                : vale.estado === "vencido"
                  ? `Venció el ${vale.vigencia}`
                  : "Vale anulado"}
            </span>
            <span className="text-bone/30 text-center text-[10px] leading-relaxed">
              Preséntalo en cualquier sucursal ARIGA. No es canjeable por
              efectivo.
            </span>
          </div>
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
