"use client";

import { useEffect } from "react";

import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";

/**
 * Diálogo de emisión de vale.
 *
 * Por ahora es la maqueta del mockup: los campos existen pero no persisten.
 * Al definir el modelo de datos, este componente pasa a enviar una Server
 * Action que crea el vale, genera el QR y devuelve el PDF.
 */
export function ModalNuevoVale({
  abierto,
  onCerrar,
  folioSugerido,
}: {
  abierto: boolean;
  onCerrar: () => void;
  folioSugerido: string;
}) {
  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nuevo vale digital"
      onClick={onCerrar}
      className="bg-ink/55 fixed inset-0 z-40 flex items-center justify-center p-10"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-bone text-ink rounded-panel animate-rise-fast flex w-[480px] max-w-full flex-col gap-[22px] p-8"
      >
        <div className="flex flex-col gap-[7px]">
          <span className="text-gold-dark tracking-eyebrow text-[9px] leading-none font-medium">
            NUEVO VALE DIGITAL
          </span>
          <h3 className="font-display m-0 text-[27px] leading-[1.1] font-normal">
            Folio {folioSugerido}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-[14px]">
          <div className="col-span-2">
            <Campo etiqueta="CLIENTE" name="cliente" placeholder="Nombre completo" />
          </div>
          <Campo etiqueta="MONTO" name="monto" inputMode="decimal" placeholder="$0.00" />
          <Campo etiqueta="VIGENCIA" name="vigencia" placeholder="30 días" />
          <div className="col-span-2">
            <Campo
              etiqueta="PIEZA / CONCEPTO"
              name="concepto"
              placeholder="Collar oro 18k con dije"
            />
          </div>
        </div>

        <div className="flex gap-[10px]">
          <Boton variante="contorno" onClick={onCerrar} className="flex-1 py-[13px]">
            CANCELAR
          </Boton>
          <Boton onClick={onCerrar} className="flex-[1.4] py-[13px]">
            GENERAR Y ENVIAR
          </Boton>
        </div>
      </div>
    </div>
  );
}
