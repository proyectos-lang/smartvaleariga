import type { Metadata } from "next";

import { Tarjeta } from "@/components/ui/tarjeta";
import { Vacio } from "@/components/ui/vacio";
import { requerirAdmin } from "@/lib/auth/guardas";
import { alternarTienda } from "@/lib/acciones/tiendas";
import { listarTiendas } from "@/lib/datos/tiendas";
import { descuentosVigentes } from "@/lib/datos/configuracion";
import { urlAutorregistro } from "@/lib/compartir";

import { FormularioTienda } from "./formulario";
import { QrTienda } from "./qr-tienda";

export const metadata: Metadata = { title: "Puntos de venta" };

export default async function PaginaTiendas() {
  await requerirAdmin();
  const [tiendas, descuentos] = await Promise.all([
    listarTiendas(false),
    descuentosVigentes(),
  ]);
  const descuentoA3 = descuentos.oro;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <Tarjeta className="overflow-hidden">
        <div className="border-ink/7 flex items-center justify-between border-b px-5 py-4">
          <h3 className="font-display m-0 text-lg leading-none font-normal">
            Tiendas registradas
          </h3>
          <span className="text-ink/45 text-[12px]">
            {tiendas.filter((t) => t.activo).length} activas
          </span>
        </div>

        {tiendas.length === 0 ? (
          <Vacio
            titulo="Sin puntos de venta"
            descripcion="Los vales A3 y todas las redenciones necesitan una tienda. Crea la primera con el formulario de al lado."
          />
        ) : (
          <ul className="m-0 list-none p-0">
            {tiendas.map((t) => (
              <li
                key={t.id}
                className="border-ink/6 flex items-center gap-4 border-t px-5 py-[14px] first:border-t-0"
              >
                <span
                  className={`inline-block size-[7px] rotate-45 ${t.activo ? "bg-gold" : "bg-ink/20"}`}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={`truncate text-[13.5px] font-medium ${t.activo ? "" : "text-ink/40"}`}
                  >
                    {t.nombre}
                  </span>
                  {t.direccion || t.telefono ? (
                    <span className="text-ink/42 truncate text-[11px]">
                      {[t.direccion, t.telefono].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                </span>

                <span className="flex items-center gap-2">
                  {t.activo ? (
                    <QrTienda
                      nombre={t.nombre}
                      url={urlAutorregistro(t.token)}
                      descuento={descuentoA3}
                    />
                  ) : null}

                  <form action={alternarTienda}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="activo" value={String(t.activo)} />
                    <button
                      type="submit"
                      className="border-ink/14 text-ink/55 hover:border-gold hover:text-ink rounded-field cursor-pointer border px-3 py-[6px] text-[11px] transition-colors"
                    >
                      {t.activo ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <aside className="flex flex-col gap-4">
        <Tarjeta className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-1">
            <span className="text-gold-dark tracking-eyebrow text-[9px] font-medium">
              NUEVO PUNTO DE VENTA
            </span>
            <h3 className="font-display m-0 text-[20px] leading-tight font-normal">
              Agregar tienda
            </h3>
          </div>
          <FormularioTienda />
        </Tarjeta>

        <p className="text-ink/45 m-0 px-1 text-[11.5px] leading-relaxed">
          Las tiendas no se borran: desactivarlas las quita de los formularios
          sin romper los vales y las redenciones que ya las referencian.
        </p>
      </aside>
    </div>
  );
}
