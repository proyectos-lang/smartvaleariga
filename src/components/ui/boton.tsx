import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * Botón de la marca. Cuatro variantes tomadas del mockup:
 *
 * - `solido`   negro con texto oro — acción principal sobre crema
 * - `contorno` borde tenue sobre crema — acción secundaria
 * - `oro`      borde y texto oro sobre fondo oscuro — dentro del sidebar
 * - `fantasma` sin caja — acciones terciarias
 */

type Variante = "solido" | "contorno" | "oro" | "fantasma";
type Tamano = "sm" | "md" | "lg";

const VARIANTES: Record<Variante, string> = {
  solido: "bg-ink text-gold-light hover:bg-ink-raised border border-transparent",
  contorno:
    "border border-ink/16 text-ink/70 hover:border-gold hover:text-ink bg-transparent",
  oro: "border border-gold/40 bg-gold/10 text-gold-light hover:bg-gold/20",
  fantasma: "border border-transparent text-ink/60 hover:text-ink bg-transparent",
};

const TAMANOS: Record<Tamano, string> = {
  sm: "px-3 py-2 text-[10px]",
  md: "px-5 py-3 text-[11px]",
  lg: "w-full px-5 py-[15px] text-[12px]",
};

export type BotonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  tamano?: Tamano;
};

export function Boton({
  variante = "solido",
  tamano = "md",
  className,
  ...props
}: BotonProps) {
  return (
    <button
      className={cn(
        "rounded-field tracking-action cursor-pointer font-semibold transition-colors duration-200",
        "focus-visible:ring-gold/50 focus-visible:ring-2 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTES[variante],
        TAMANOS[tamano],
        className,
      )}
      {...props}
    />
  );
}
