import { cn } from "@/lib/utils";

/**
 * Estados de un vale. Cuando definamos el modelo real, este tipo debe
 * coincidir con el enum de la base de datos.
 */
export type EstadoVale = "activo" | "canjeado" | "vencido" | "cancelado";

const ESTILOS: Record<EstadoVale, string> = {
  activo: "bg-gold/16 text-gold-deep",
  canjeado: "bg-ink/6 text-ink/55",
  vencido: "bg-clay/10 text-clay",
  cancelado: "bg-ink/6 text-ink/35 line-through",
};

const ETIQUETAS: Record<EstadoVale, string> = {
  activo: "ACTIVO",
  canjeado: "CANJEADO",
  vencido: "VENCIDO",
  cancelado: "CANCELADO",
};

export function ChipEstado({
  estado,
  className,
}: {
  estado: EstadoVale;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-field justify-self-start px-[10px] py-1 text-[9.5px] font-semibold tracking-[0.1em]",
        ESTILOS[estado],
        className,
      )}
    >
      {ETIQUETAS[estado]}
    </span>
  );
}
