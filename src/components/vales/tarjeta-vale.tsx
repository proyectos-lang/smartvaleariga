"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import QRCode from "react-qr-code";
import { Check, Download, FileText, MessageCircle } from "lucide-react";

import {
  descargarNodoComoPng,
  compartirNodoComoPng,
} from "@/lib/image-cliente";
import {
  enlaceWhatsApp,
  mensajeVale,
  urlPdfVale,
  urlPublicaVale,
} from "@/lib/compartir";
import type { EstadoVale, TipoVale } from "@/lib/supabase/types";
import { ETIQUETA_TIPO } from "@/lib/supabase/types";

export type DatosTarjeta = {
  codigo: string;
  tipo: TipoVale;
  estado: EstadoVale;
  descuento: number;
  portador: string;
  telefono: string;
  /** Ya formateada. */
  vigencia: string;
};

/**
 * Tarjeta del vale y sus tres salidas.
 *
 * La tarjeta se captura tal cual se ve (`html-to-image`) para bajarla como
 * PNG, así que lo que el cliente recibe es exactamente lo que la vendedora
 * tiene en pantalla.
 */
export function TarjetaVale({
  vale,
  compacta = false,
}: {
  vale: DatosTarjeta;
  /** Sin botones: para la página pública, que solo muestra. */
  compacta?: boolean;
}) {
  const tarjeta = useRef<HTMLDivElement>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const url = urlPublicaVale(vale.codigo);
  const mensaje = mensajeVale({
    nombre: vale.portador,
    codigo: vale.codigo,
    descuento: vale.descuento,
    vigencia: vale.vigencia,
  });

  const vigente = vale.estado === "activo";

  /**
   * En móvil abre la hoja nativa de compartir, que es lo que permite mandar
   * la imagen directo a WhatsApp. En escritorio no existe, así que baja el
   * archivo.
   */
  async function compartirImagen() {
    if (!tarjeta.current) return;
    const nombre = `vale-${vale.codigo}`;
    setOcupado("imagen");
    try {
      const compartido = await compartirNodoComoPng(tarjeta.current, nombre);
      if (!compartido) await descargarNodoComoPng(tarjeta.current, nombre);
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
        ref={tarjeta}
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
