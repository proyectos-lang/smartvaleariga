import type { TipoVale } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

/**
 * Distintivo de la puerta de entrada del vale. Cada tipo tiene su color para
 * que en un listado largo se distingan de un vistazo.
 */

const ESTILOS: Record<TipoVale, string> = {
  A1: "bg-gold/16 text-gold-deep",
  A2: "bg-sage/14 text-sage",
  A3: "bg-ink/8 text-ink/65",
};

export function ChipTipo({
  tipo,
  className,
}: {
  tipo: TipoVale;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-field inline-flex px-2 py-[3px] font-mono text-[10px] font-semibold tracking-[0.08em]",
        ESTILOS[tipo],
        className,
      )}
    >
      {tipo}
    </span>
  );
}
