import type { TipoVenta } from "@/lib/datos/historial";
import { cn } from "@/lib/utils";

/**
 * Por qué vía entró una venta: con vale o de mostrador.
 *
 * No usa los colores de serie A1–A4: esos ya significan «puerta del vale» en
 * todo el sistema y reutilizarlos aquí haría que un mismo color dijera dos
 * cosas distintas en la misma tabla. La vía se distingue por relleno frente a
 * contorno —lleno el vale, que es lo que la campaña generó; vacío la venta
 * normal—, así que también se lee en gris, impreso o por alguien que no
 * distinga los tonos.
 *
 * La etiqueta va escrita, no solo el color: la columna tiene que poder
 * copiarse a otro sitio y seguir diciendo qué es.
 */

const ESTILOS: Record<TipoVenta, string> = {
  vale: "bg-gold/16 text-gold-dark",
  normal: "border-ink/20 text-ink/55 border",
};

const ETIQUETAS: Record<TipoVenta, string> = {
  vale: "VALE",
  normal: "NORMAL",
};

export function ChipVia({
  tipo,
  className,
}: {
  tipo: TipoVenta;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-field inline-flex shrink-0 px-2 py-[3px] text-[10px] font-semibold tracking-[0.08em]",
        ESTILOS[tipo],
        className,
      )}
    >
      {ETIQUETAS[tipo]}
    </span>
  );
}

/** El nombre de la vía en texto, para exportables y lectores de pantalla. */
export function nombreVia(tipo: TipoVenta) {
  return tipo === "vale" ? "Vale" : "Normal";
}
