"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
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
      {/* Grande a propósito: se escanea desde el teléfono de al lado */}
      <div className="rounded-card border-ink/8 border bg-white p-5">
        <QRCode value={url} size={196} level="H" fgColor="#0B0B0C" />
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
        Muéstraselo al cliente para que lo escane, o mándaselo. Se registra
        solo y recibe su vale al instante —{tarifas.oro}% en oro y {tarifas.plata}%
        en plata—, a nombre de{" "}
        {tienda}.
      </p>
    </div>
  );
}
