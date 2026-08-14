import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Isotipo de ARIGA.
 *
 * El archivo lo genera `npm run marca:generar` a partir del original en
 * `design/`, junto con el favicon, el icono de iOS y la copia en base64 que
 * usan la tarjeta compartible y el PDF. Para cambiar el logotipo se sustituye
 * el original y se vuelve a ejecutar ese comando: no hay que tocar código.
 */
const LOGOTIPO = "/brand/ariga-logo.png";

export function Logotipo({
  tamano = 40,
  className,
}: {
  tamano?: number;
  className?: string;
}) {
  return (
    <Image
      src={LOGOTIPO}
      alt="ARIGA Joyería"
      width={tamano}
      height={tamano}
      priority
      className={cn("rounded-full object-cover", className)}
      style={{ width: tamano, height: tamano }}
    />
  );
}

/** Logotipo + nombre, como aparece en la cabecera del panel. */
export function MarcaCompacta({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Logotipo tamano={40} />
      <div className="flex flex-col gap-[3px]">
        <span className="text-gold-light text-[13px] leading-none font-semibold tracking-[0.3em]">
          ARIGA
        </span>
        <span className="text-bone/40 text-[8px] leading-none tracking-[0.36em]">
          JOYERÍA
        </span>
      </div>
    </div>
  );
}
