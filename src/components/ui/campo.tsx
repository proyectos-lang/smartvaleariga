import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Rótulo en versalitas espaciadas: el patrón tipográfico de toda la interfaz. */
export function Rotulo({
  children,
  className,
  tono = "oscuro",
}: {
  children: ReactNode;
  className?: string;
  tono?: "oscuro" | "claro" | "oro";
}) {
  return (
    <span
      className={cn(
        "tracking-field text-[10px] leading-none font-medium",
        tono === "oscuro" && "text-ink/50",
        tono === "claro" && "text-bone/40",
        tono === "oro" && "text-gold-dark",
        className,
      )}
    >
      {children}
    </span>
  );
}

export type CampoProps = InputHTMLAttributes<HTMLInputElement> & {
  etiqueta?: string;
  error?: string;
};

/** Campo de texto con rótulo y estado de error. */
export function Campo({ etiqueta, error, className, ...props }: CampoProps) {
  return (
    <label className="flex flex-col gap-[7px]">
      {etiqueta ? <Rotulo>{etiqueta}</Rotulo> : null}
      <input
        aria-invalid={error ? true : undefined}
        className={cn(
          "border-ink/14 bg-paper text-ink rounded-field w-full border px-[14px] py-[13px] text-sm",
          "transition-[border-color,box-shadow] duration-150",
          "focus:border-gold focus:shadow-[0_0_0_3px_rgba(198,161,91,0.16)]",
          error && "border-clay focus:border-clay focus:shadow-[0_0_0_3px_rgba(142,69,52,0.16)]",
          className,
        )}
        {...props}
      />
      {error ? <span className="text-clay text-[11px]">{error}</span> : null}
    </label>
  );
}
