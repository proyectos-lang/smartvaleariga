import Link from "next/link";
import type { Metadata } from "next";

import { Tarjeta, TarjetaEncabezado, TarjetaIndicador } from "@/components/ui/tarjeta";
import { Vacio } from "@/components/ui/vacio";
import { alcanceDe, esAdmin, requerirSesion } from "@/lib/auth/guardas";
import { listarTiendas } from "@/lib/datos/tiendas";
import { listarVentasNormales } from "@/lib/datos/ventas-normales";
import { monedaCompacta, numero } from "@/lib/format";

import { FilaVenta } from "./fila";
import { FormularioVentaNormal } from "./formulario";

export const metadata: Metadata = { title: "Venta sin vale" };

/**
 * Venta de mostrador.
 *
 * La otra puerta de la caja: lo que se vende sin que medie un vale. Va en su
 * propio módulo y no dentro de Redenciones porque no comparte casi nada con
 * ellas —ni cliente, ni vale, ni descuento— y mezclarlas haría que el
 * historial de la campaña dejara de ser el historial de la campaña.
 *
 * El formulario y las últimas ventas conviven en la misma pantalla: quien
 * registra en caja quiere confirmar que lo suyo entró, y para eso no debería
 * tener que navegar a ningún sitio.
 */

export default async function PaginaVentasNormales({
  searchParams,
}: PageProps<"/panel/ventas">) {
  const sesion = await requerirSesion();
  const params = await searchParams;

  const pagina = Number(params.pagina) || 1;

  const [tiendas, listado] = await Promise.all([
    listarTiendas(),
    listarVentasNormales({ usuarioId: alcanceDe(sesion), pagina }),
  ]);

  const { ventas, total, monto, porPagina } = listado;
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const admin = esAdmin(sesion);

  // Volver aquí tras borrar, con la página puesta: borrar una línea de la
  // página 3 no debería devolver a la 1.
  const volverA = pagina > 1 ? `/panel/ventas?pagina=${pagina}` : "/panel/ventas";

  const fallo = typeof params.fallo === "string" ? params.fallo : null;

  const aviso =
    params.ok === "1"
      ? "Se registró la venta."
      : params.editada === "1"
        ? "Se guardaron los cambios."
        : params.eliminada === "1"
          ? "Se eliminó la venta."
          : null;

  return (
    <>
      {fallo ? (
        <p
          role="alert"
          className="border-clay/30 bg-clay/6 text-clay rounded-card m-0 border px-4 py-3 text-[12.5px]"
        >
          No se pudo eliminar la venta: {fallo}
        </p>
      ) : aviso ? (
        <p className="border-ink/12 bg-ink/3 text-ink/65 rounded-card m-0 border px-4 py-3 text-[12.5px]">
          {aviso}
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaIndicador
          etiqueta="VENTAS SIN VALE"
          valor={numero(total)}
          nota={admin ? "De todas las tiendas" : "Registradas por ti"}
        />
        <TarjetaIndicador
          etiqueta="MONTO ACUMULADO"
          valor={monedaCompacta(monto)}
          nota="Sin descuento de campaña"
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
        <Tarjeta className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-display m-0 text-lg leading-none font-normal">
              Registrar venta
            </h2>
            <p className="text-ink/45 m-0 text-[12px]">
              La venta que no lleva vale ni descuento.
            </p>
          </div>

          <FormularioVentaNormal
            tiendas={tiendas.map((t) => ({ id: t.id, nombre: t.nombre }))}
            tiendaPredeterminada={sesion.tiendaId ?? null}
          />
        </Tarjeta>

        <Tarjeta className="overflow-hidden">
          <TarjetaEncabezado titulo="Últimas ventas" />

          {ventas.length === 0 ? (
            <Vacio
              titulo="Todavía no hay ventas sin vale"
              descripcion="La primera que registres aparecerá aquí."
            />
          ) : (
            <ul className="m-0 list-none p-0">
              {ventas.map((v) => (
                <FilaVenta
                  key={v.id}
                  admin={admin}
                  volverA={volverA}
                  venta={{
                    id: v.id,
                    tienda: v.tienda,
                    vendedora: v.vendedora,
                    monto: Number(v.monto),
                    monto_oro: Number(v.monto_oro),
                    monto_plata: Number(v.monto_plata),
                    ticket: v.ticket,
                    fecha_creacion: v.fecha_creacion,
                    fecha_edicion: v.fecha_edicion,
                  }}
                />
              ))}
            </ul>
          )}

          {paginas > 1 ? (
            <div className="border-ink/6 text-ink/50 flex items-center justify-between border-t px-5 py-3 text-[12px]">
              <span>
                {ventas.length} de {numero(total)} · página {pagina} de {paginas}
              </span>
              <span className="flex gap-3">
                {pagina > 1 ? (
                  <Link
                    href={`/panel/ventas?pagina=${pagina - 1}`}
                    className="text-gold-dark"
                  >
                    Anterior
                  </Link>
                ) : null}
                {pagina < paginas ? (
                  <Link
                    href={`/panel/ventas?pagina=${pagina + 1}`}
                    className="text-gold-dark"
                  >
                    Siguiente
                  </Link>
                ) : null}
              </span>
            </div>
          ) : null}
        </Tarjeta>
      </div>
    </>
  );
}
