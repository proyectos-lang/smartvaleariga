import Link from "next/link";
import type { Metadata } from "next";

import { Tarjeta } from "@/components/ui/tarjeta";
import { requerirSesion } from "@/lib/auth/guardas";
import { descuentosVigentes } from "@/lib/datos/configuracion";
import { listarTiendas } from "@/lib/datos/tiendas";
import { urlAutorregistro } from "@/lib/compartir";
import { DESCRIPCION_TIPO, ETIQUETA_TIPO } from "@/lib/supabase/types";

import { EnlacePublico } from "./enlace-publico";
import { FormularioEmision } from "../[tipo]/formulario";

export const metadata: Metadata = { title: "Vale A3 · Visitante de tienda" };

/**
 * A3 tiene dos caminos y esta pantalla los presenta en ese orden.
 *
 * El principal es que el cliente se registre solo desde el QR de la tienda:
 * captura sus propios datos —sin errores de dictado— y la vendedora no tiene
 * que pedirle el teléfono ni teclearlo. El segundo, capturarlos ella, se
 * queda para cuando el cliente no trae teléfono o no quiere usarlo.
 *
 * El QR es el de la tienda, no el de la vendedora: es el mismo que está
 * impreso en el mostrador y no cambia nunca.
 */
export default async function PaginaEmitirA3({
  searchParams,
}: PageProps<"/panel/emitir/a3">) {
  const sesion = await requerirSesion();
  const params = await searchParams;

  const [descuentos, tiendas] = await Promise.all([
    descuentosVigentes("A3"),
    listarTiendas(),
  ]);

  const pedida = Number(params.tienda);
  const tienda =
    tiendas.find((t) => t.id === pedida) ??
    tiendas.find((t) => t.id === sesion.tiendaId) ??
    tiendas[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
      <Tarjeta className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-2">
          <span className="text-gold-dark tracking-eyebrow text-[9px] font-medium">
            AUTORREGISTRO · LO MÁS RÁPIDO
          </span>
          <h2 className="font-display m-0 text-[22px] leading-tight font-normal">
            Que el cliente se registre solo
          </h2>
        </div>

        {tiendas.length === 0 ? (
          <p className="border-clay/25 bg-clay/6 text-clay rounded-field m-0 border px-3 py-[10px] text-[12px] leading-relaxed">
            No hay puntos de venta registrados. Un administrador debe crearlos
            en{" "}
            <Link href="/panel/tiendas" className="underline">
              Tiendas
            </Link>
            .
          </p>
        ) : (
          <>
            {tiendas.length > 1 ? (
              <div className="flex flex-wrap gap-[6px]">
                {tiendas.map((t) => (
                  <Link
                    key={t.id}
                    href={`/panel/emitir/a3?tienda=${t.id}`}
                    className={`rounded-field px-3 py-[6px] text-[10px] font-medium tracking-[0.1em] uppercase transition-colors ${
                      t.id === tienda.id
                        ? "bg-ink text-gold-light"
                        : "border-ink/12 text-ink/55 hover:border-gold border"
                    }`}
                  >
                    {t.nombre}
                  </Link>
                ))}
              </div>
            ) : null}

            {tienda.autorregistro ? (
              <EnlacePublico
                tienda={tienda.nombre}
                url={urlAutorregistro(tienda.token)}
                tarifas={descuentos}
              />
            ) : (
              <p className="border-clay/25 bg-clay/6 text-clay rounded-field m-0 border px-3 py-[10px] text-[12px] leading-relaxed">
                El autorregistro de {tienda.nombre} está desactivado. Un
                administrador puede volver a encenderlo desde Tiendas.
              </p>
            )}
          </>
        )}
      </Tarjeta>

      <div className="flex flex-col gap-5">
        <Tarjeta className="flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex flex-col gap-2">
            <span className="text-ink/40 tracking-eyebrow text-[9px] font-medium">
              O CAPTURA TÚ LOS DATOS
            </span>
            <h2 className="font-display m-0 text-[22px] leading-tight font-normal">
              {ETIQUETA_TIPO.A3}
            </h2>
            <p className="text-ink/50 m-0 text-[13px] leading-relaxed">
              {DESCRIPCION_TIPO.A3}. Úsalo cuando el cliente no trae teléfono a
              mano o prefiere que lo hagas tú.
            </p>
          </div>

          <FormularioEmision
            tipo="A3"
            tarifas={descuentos}
            tiendas={tiendas.map((t) => ({ id: t.id, nombre: t.nombre }))}
            tiendaPredeterminada={sesion.tiendaId ?? tienda?.id ?? null}
          />
        </Tarjeta>

        <p className="text-ink/45 m-0 px-1 text-[11.5px] leading-relaxed">
          Al registrarse, el cliente elige quién lo atendió y el vale queda a
          nombre de esa asesora, pero se numera con la secuencia de la tienda y
          no gasta bloque. Los que capturas aquí sí consumen un número del
          tuyo.
        </p>
      </div>
    </div>
  );
}
