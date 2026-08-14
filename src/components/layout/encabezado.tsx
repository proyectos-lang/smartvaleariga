"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

import { Boton } from "@/components/ui/boton";
import { encabezadoDeRuta } from "@/lib/navegacion";

/**
 * Cabecera pegajosa del panel: migaja + título derivados de la ruta,
 * buscador global y acción principal.
 */
export function Encabezado({ onEmitirVale }: { onEmitirVale?: () => void }) {
  const pathname = usePathname();
  const { migaja, titulo } = encabezadoDeRuta(pathname);

  return (
    <header className="border-ink/8 bg-bone/90 sticky top-0 z-10 flex items-center gap-6 border-b px-[38px] py-[22px] backdrop-blur-md">
      <div className="flex flex-1 flex-col gap-[5px]">
        <span className="text-gold-dark tracking-label text-[9px] leading-none font-medium">
          {migaja}
        </span>
        <h2 className="font-display m-0 text-[25px] leading-none font-normal">
          {titulo}
        </h2>
      </div>

      <div className="border-ink/12 bg-paper rounded-field flex w-[280px] items-center gap-[9px] border px-[14px] py-[10px]">
        <Search size={13} className="text-ink/35 shrink-0" />
        <input
          type="search"
          placeholder="Buscar vale, cliente o folio…"
          aria-label="Buscar"
          className="text-ink min-w-0 flex-1 border-none bg-transparent text-[12.5px]"
        />
      </div>

      <Boton onClick={onEmitirVale} className="px-5 py-3">
        EMITIR VALE
      </Boton>
    </header>
  );
}
