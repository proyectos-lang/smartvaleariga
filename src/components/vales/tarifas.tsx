import { cn } from "@/lib/utils";

/**
 * Las dos tarifas del vale, oro y plata.
 *
 * Aparecen juntas en todas partes porque juntas son la oferta: enseñar solo
 * una llevaría a que el cliente esperase ese porcentaje sobre toda su compra.
 */
export function Tarifas({
  oro,
  plata,
  tamano = "normal",
  className,
}: {
  oro: number;
  plata: number;
  tamano?: "normal" | "grande" | "compacto";
  className?: string;
}) {
  if (tamano === "compacto") {
    return (
      <span className={cn("text-[11.5px] tabular-nums", className)}>
        {oro}% oro · {plata}% plata
      </span>
    );
  }

  const cifra =
    tamano === "grande"
      ? "font-display text-[46px] leading-none"
      : "font-display text-[30px] leading-none";

  return (
    <div className={cn("flex items-end gap-6", className)}>
      {[
        ["oro", oro],
        ["plata", plata],
      ].map(([etiqueta, valor]) => (
        <span key={etiqueta} className="flex flex-col items-center gap-[3px]">
          <span className={cifra}>{valor}%</span>
          <span className="text-[10px] tracking-[0.2em] uppercase opacity-60">
            en {etiqueta}
          </span>
        </span>
      ))}
    </div>
  );
}
