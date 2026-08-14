import { Suspense } from "react";
import type { Metadata } from "next";

import { Logotipo } from "@/components/marca/logotipo";

import { FormularioAcceso } from "./formulario-acceso";

export const metadata: Metadata = { title: "Iniciar sesión" };

/** Cifras de la portada. Se conectarán a Supabase cuando exista el esquema. */
const CIFRAS = [
  { valor: "1,284", etiqueta: "VALES EMITIDOS" },
  { valor: "6", etiqueta: "SUCURSALES" },
  { valor: "99.2%", etiqueta: "CANJE VÁLIDO" },
];

export default function PaginaLogin() {
  return (
    <div className="bg-ink text-bone grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Panel de marca */}
      <section className="ariga-glow relative hidden flex-col justify-between overflow-hidden px-[60px] py-14 lg:flex">
        <div className="ariga-hatch pointer-events-none absolute inset-0 opacity-12" />
        <div className="border-gold/25 absolute right-[-190px] bottom-[-160px] size-[520px] rotate-45 border" />
        <div className="border-gold/16 absolute right-[-90px] bottom-[-70px] size-[340px] rotate-45 border" />

        <div className="relative h-px" />

        <div className="relative mx-auto flex max-w-[520px] flex-col items-center gap-[30px] text-center">
          <Logotipo
            tamano={236}
            className="shadow-[0_0_0_1px_rgba(198,161,91,0.35),0_30px_90px_rgba(0,0,0,0.6)]"
          />
          <div className="bg-gold h-px w-[52px]" />
          <p className="font-display text-bone m-0 text-[26px] leading-[1.45]">
            Plataforma de generación y redención de vales
          </p>
          <span className="text-gold-light/75 tracking-brand text-[10px] leading-none font-medium">
            ARIGA JOYERÍA
          </span>
        </div>

        <div className="relative flex gap-10">
          {CIFRAS.map((c) => (
            <div key={c.etiqueta} className="flex flex-col gap-1">
              <span className="font-display text-gold-light text-xl leading-none font-medium">
                {c.valor}
              </span>
              <span className="text-bone/35 text-[10px] leading-none tracking-[0.18em]">
                {c.etiqueta}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Formulario */}
      <section className="bg-bone text-ink flex items-center justify-center p-8 sm:p-14">
        <Suspense fallback={null}>
          <FormularioAcceso />
        </Suspense>
      </section>
    </div>
  );
}
