"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { MarcaCompacta } from "@/components/marca/logotipo";
import { NAVEGACION, itemActivo } from "@/lib/navegacion";
import { cn } from "@/lib/utils";

export type UsuarioSesion = {
  nombre: string;
  iniciales: string;
  detalle: string;
};

/** Rombo de 45° que marca cada elemento del menú. */
function Rombo({ activo }: { activo: boolean }) {
  return (
    <span
      className={cn(
        "inline-block size-[6px] rotate-45 transition-colors",
        activo ? "bg-gold" : "bg-bone/22",
      )}
    />
  );
}

export function BarraLateral({
  usuario,
  contadores = {},
  onNuevoVale,
  onSalir,
}: {
  usuario: UsuarioSesion;
  /** Insignias numéricas por nombre de item, p. ej. `{ "Vales digitales": 24 }`. */
  contadores?: Record<string, number>;
  onNuevoVale?: () => void;
  onSalir?: () => void;
}) {
  const pathname = usePathname();
  const activo = itemActivo(pathname);

  const [plegados, setPlegados] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      NAVEGACION.map((g) => [g.etiqueta, Boolean(g.plegadoPorDefecto)]),
    ),
  );

  const alternar = (etiqueta: string) =>
    setPlegados((s) => ({ ...s, [etiqueta]: !s[etiqueta] }));

  return (
    <aside className="ariga-sidebar border-gold/16 sticky top-0 flex h-screen w-[262px] shrink-0 flex-col gap-[26px] border-r px-[18px] py-[26px]">
      <MarcaCompacta className="px-2" />

      <button
        type="button"
        onClick={onNuevoVale}
        className="border-gold/40 bg-gold/10 text-gold-light hover:bg-gold/20 rounded-card tracking-field flex cursor-pointer items-center gap-[10px] border px-[14px] py-3 text-[11px] font-semibold transition-colors"
      >
        <span className="bg-gold inline-block size-[9px] rotate-45" />
        NUEVO VALE
      </button>

      <nav className="flex flex-1 flex-col gap-[22px] overflow-y-auto">
        {NAVEGACION.map((grupo) => {
          const plegado = plegados[grupo.etiqueta];
          return (
            <div key={grupo.etiqueta} className="flex flex-col gap-[3px]">
              <button
                type="button"
                onClick={() => alternar(grupo.etiqueta)}
                aria-expanded={!plegado}
                className="text-bone/32 hover:text-gold-light/80 tracking-label flex w-full cursor-pointer items-center gap-2 px-[10px] pt-[6px] pb-2 text-[9px] leading-none font-medium transition-colors"
              >
                <span className="flex-1 text-left">{grupo.etiqueta}</span>
                <span
                  className={cn(
                    "size-[5px] border-r-[1.5px] border-b-[1.5px] border-current transition-transform duration-200",
                    plegado ? "-rotate-45" : "rotate-45",
                  )}
                />
              </button>

              {!plegado &&
                grupo.items.map((item) => {
                  const esActivo = activo?.href === item.href;
                  const insignia = contadores[item.nombre];
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "rounded-card flex w-full items-center gap-[11px] px-[11px] py-[10px] text-[13px] font-medium transition-colors duration-150",
                        esActivo
                          ? "bg-gold/14 text-bone shadow-[inset_2px_0_0_var(--color-gold)]"
                          : "text-bone/60 hover:bg-bone/4 hover:text-bone/85",
                      )}
                    >
                      <Rombo activo={esActivo} />
                      <span className="flex-1 text-left">{item.nombre}</span>
                      {insignia ? (
                        <span className="bg-gold/16 text-gold-light rounded-[9px] px-[7px] py-[2px] text-[9px] font-semibold tracking-[0.08em]">
                          {insignia}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
            </div>
          );
        })}
      </nav>

      <div className="border-bone/8 flex items-center gap-[11px] border-t pt-4">
        <span className="border-gold/50 font-display text-gold-light flex size-[34px] items-center justify-center rounded-full border text-xs font-medium">
          {usuario.iniciales}
        </span>
        <div className="flex flex-1 flex-col gap-[2px]">
          <span className="text-bone text-xs leading-none font-medium">
            {usuario.nombre}
          </span>
          <span className="text-bone/40 text-[10px] leading-none">
            {usuario.detalle}
          </span>
        </div>
        <button
          type="button"
          onClick={onSalir}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="text-bone/40 hover:text-gold cursor-pointer transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
