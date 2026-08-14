import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Logotipo } from "@/components/marca/logotipo";
import { tiendaPorToken } from "@/lib/datos/tiendas";
import { descuentosVigentes } from "@/lib/datos/configuracion";

import { FormularioRegistro } from "./formulario";

/**
 * Autorregistro del visitante de tienda.
 *
 * Es lo que abre quien escanea el QR fijo del mostrador. No hay sesión ni
 * vendedora: el cliente se registra solo y el sistema le emite su vale A3
 * en el momento.
 *
 * El QR de la tienda es estable —se imprime una vez y se deja puesto—; lo
 * que cambia en cada registro es el vale que se genera.
 */

export const metadata: Metadata = {
  title: "Obtén tu descuento · ARIGA Joyería",
  robots: { index: false, follow: false },
};

export default async function PaginaAutorregistro({
  params,
}: PageProps<"/t/[token]">) {
  const { token } = await params;
  const tienda = await tiendaPorToken(decodeURIComponent(token));

  if (!tienda) notFound();

  const descuentos = await descuentosVigentes();

  return (
    <main className="bg-ink text-bone relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-12">
      <div className="ariga-hatch pointer-events-none absolute inset-0 opacity-[0.06]" />
      <div className="border-gold/20 absolute -top-40 -right-40 size-96 rotate-45 border" />
      <div className="border-gold/15 absolute -bottom-32 -left-32 size-80 rotate-45 border" />

      <div className="relative flex w-full max-w-[400px] flex-col gap-7">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logotipo tamano={104} />

          {tienda.autorregistro ? (
            <>
              <div className="flex flex-col items-center gap-1">
                <span className="font-display text-gold-light text-[62px] leading-none">
                  {descuentos.A3}%
                </span>
                <span className="text-bone/50 text-[12px] tracking-[0.2em] uppercase">
                  de descuento
                </span>
              </div>
              <p className="text-bone/55 m-0 text-[13.5px] leading-relaxed">
                Regístrate en menos de un minuto y te generamos tu vale para
                usarlo hoy mismo en{" "}
                <span className="text-bone">{tienda.nombre}</span>.
              </p>
            </>
          ) : (
            <p className="text-bone/55 m-0 text-[13.5px] leading-relaxed">
              El registro en {tienda.nombre} está pausado por el momento.
              Pregunta en el mostrador por las promociones vigentes.
            </p>
          )}
        </div>

        {tienda.autorregistro ? (
          <>
            <FormularioRegistro token={tienda.token} clavePais="502" />

            <p className="text-bone/30 m-0 text-center text-[11px] leading-relaxed">
              Vigencia de {descuentos.diasVigencia} días desde hoy · No es
              canjeable por efectivo
            </p>
          </>
        ) : null}
      </div>
    </main>
  );
}
