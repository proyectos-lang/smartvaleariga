"use client";

import { useState } from "react";
import Image from "next/image";
import QRCode from "react-qr-code";

import { PALETA } from "@/lib/vale-plantilla";
import { Check, Copy, MessageCircle, Printer } from "lucide-react";

/**
 * Enlace público de autorregistro de una tienda.
 *
 * El uso habitual es enseñar este QR en el teléfono de la vendedora para que
 * el cliente lo escane con el suyo y se registre. El mismo enlace sirve
 * impreso en el mostrador o mandado por WhatsApp: no caduca ni cambia con
 * cada cliente, porque identifica a la tienda y no a un vale.
 */
export function EnlacePublico({
  tienda,
  url,
  tarifas,
}: {
  tienda: string;
  url: string;
  tarifas: { oro: number; plata: number };
}) {
  const [copiado, setCopiado] = useState(false);

  const mensaje = [
    "Te compartimos tu descuento en ARIGA Joyería.",
    "",
    `${tarifas.oro}% en oro`,
    `${tarifas.plata}% en plata`,
    "",
    "Regístrate aquí y recibe tu vale al instante:",
    url,
  ].join("\n");

  return (
    <div className="flex flex-col items-center gap-5">
      {/*
        Mismo lenguaje que la tarjeta del vale, y con la misma paleta: es el
        primer material de ARIGA que ve el cliente, así que enseñarlo sobre
        blanco lo hacía parecer una pantalla del sistema y no una pieza de la
        marca. Va con la oferta impresa encima, que es lo que decide si se
        agacha a escanear.
      */}
      <div
        className="rounded-panel relative w-full overflow-hidden"
        style={{ backgroundColor: PALETA.fondo }}
      >
        <div className="vale-textura pointer-events-none absolute inset-0" />

        <div
          className="pointer-events-none absolute top-3 left-3 size-8 border-t border-l"
          style={{ borderColor: PALETA.oro }}
        />
        <div
          className="pointer-events-none absolute right-3 bottom-3 size-8 border-r border-b"
          style={{ borderColor: PALETA.oro }}
        />

        <div className="relative flex flex-col items-center px-5 py-7">
          <Image
            src="/brand/ariga-logo.png"
            alt="ARIGA Joyería"
            width={72}
            height={72}
            className="rounded-full"
          />

          <div
            className="mt-4 mb-4 h-px w-10 opacity-60"
            style={{ backgroundColor: PALETA.oro }}
          />

          {/* Las dos tarifas del A3, cada cifra del color de su material.
              Son las suyas —15/35—, no las generales: prometer aquí el 20/40
              sería ofrecer un descuento que el vale no va a traer. */}
          <div className="flex items-center">
            {(
              [
                ["EN ORO", tarifas.oro, PALETA.oro],
                ["EN PLATA", tarifas.plata, PALETA.plata],
              ] as [string, number, string][]
            ).map(([etiqueta, pct, tinte], i) => (
              <div key={etiqueta} className="flex items-center">
                {i === 1 ? (
                  <div
                    className="mx-5 h-[44px] w-px opacity-55"
                    style={{ backgroundColor: PALETA.oro }}
                  />
                ) : null}
                <span className="flex flex-col items-center">
                  <span
                    className="font-display text-[38px] leading-none"
                    style={{ color: tinte }}
                  >
                    {pct}%
                  </span>
                  <span
                    className="mt-[7px] ml-[0.22em] text-[9px] tracking-[0.22em]"
                    style={{ color: PALETA.gris }}
                  >
                    {etiqueta}
                  </span>
                </span>
              </div>
            ))}
          </div>

          {/* Grande a propósito: se escanea desde el teléfono de al lado */}
          <div
            className="rounded-card mt-5 p-3"
            style={{ backgroundColor: PALETA.blanco }}
          >
            <QRCode
              value={url}
              size={188}
              level="H"
              bgColor={PALETA.blanco}
              fgColor="#0B0B0C"
            />
          </div>

          <span
            className="mt-4 text-[11.5px] tracking-[0.16em] uppercase"
            style={{ color: PALETA.oro }}
          >
            Escanea y regístrate
          </span>
          <span
            className="mt-[6px] text-center text-[11px]"
            style={{ color: PALETA.gris }}
          >
            {tienda}
          </span>
        </div>
      </div>

      <div className="border-ink/10 bg-ink/2 rounded-field flex w-full items-center gap-2 border px-3 py-[10px]">
        <span className="text-ink/55 min-w-0 flex-1 truncate font-mono text-[11.5px]">
          {url}
        </span>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
          }}
          aria-label="Copiar enlace"
          className="text-ink/45 hover:text-gold-dark shrink-0 cursor-pointer transition-colors"
        >
          {copiado ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>

      <div className="grid w-full grid-cols-2 gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-field flex items-center justify-center gap-2 bg-[#25D366] px-4 py-3 text-[11.5px] font-semibold text-[#05340f] transition-opacity hover:opacity-90"
        >
          <MessageCircle size={15} />
          WhatsApp
        </a>
        <button
          type="button"
          onClick={() => window.print()}
          className="border-ink/16 text-ink/70 hover:border-gold hover:text-ink rounded-field flex cursor-pointer items-center justify-center gap-2 border px-4 py-3 text-[11.5px] font-medium transition-colors"
        >
          <Printer size={15} />
          Imprimir
        </button>
      </div>

      <p className="text-ink/45 m-0 text-center text-[11.5px] leading-relaxed">
        Muéstraselo al cliente para que lo escanee, o mándaselo. Se registra
        solo, elige quién lo atendió y recibe su vale al instante.
      </p>
    </div>
  );
}
