import type { Metadata } from "next";

import { PestanasReportes } from "@/components/reportes/pestanas";
import { Tarjeta, TarjetaIndicador } from "@/components/ui/tarjeta";
import { Vacio } from "@/components/ui/vacio";
import { requerirAdmin } from "@/lib/auth/guardas";
import { ventasPorTienda, type RangoVentas } from "@/lib/datos/ventas";
import { fecha, moneda, monedaCompacta, numero } from "@/lib/format";

import { resolverRango, textoPeriodo, texto } from "../rango";
import { FiltrosTiendas } from "./filtros";

export const metadata: Metadata = { title: "Reporte por tienda" };

/**
 * Venta por punto de venta, con el desglose que pide la liquidación.
 *
 * Las otras dos pestañas responden preguntas comerciales —qué puerta trae
 * mejor gente, a qué hora hay movimiento—. Esta responde una contable: cuánto
 * vendió cada tienda, cuánto de eso se fue en descuento y cuánto entró en
 * caja. Por eso es una tabla y no una gráfica: son cifras que se leen al
 * centavo y se suman, no formas que se comparan de un vistazo.
 *
 *   Bruta    `monto_compra`        el precio de lista de lo vendido
 *   Comisión `descuento_aplicado`  lo que la clienta dejó de pagar con el vale
 *   Neta     bruta − comisión      lo que entró en caja
 *
 * La resta no descuenta dos veces: el descuento se calcula SOBRE
 * `monto_compra`, así que esa columna es precio de lista, no lo cobrado.
 */

export default async function PaginaReporteTiendas({
  searchParams,
}: PageProps<"/panel/reportes/tiendas">) {
  await requerirAdmin();
  const params = await searchParams;

  const atajo = texto(params.rango) || "30";
  const desdeParam = texto(params.desde);
  const hastaParam = texto(params.hasta);

  const rango: RangoVentas = resolverRango(atajo, desdeParam, hastaParam);
  const filas = await ventasPorTienda(rango);

  const enlace = (cambios: Record<string, string>) => {
    const q = new URLSearchParams();
    const base: Record<string, string> = {
      rango: atajo,
      desde: desdeParam,
      hasta: hastaParam,
      ...cambios,
    };
    for (const [k, v] of Object.entries(base)) {
      if (!v) continue;
      if (k === "rango" && v === "30") continue;
      q.set(k, v);
    }
    const s = q.toString();
    return `/panel/reportes/tiendas${s ? `?${s}` : ""}`;
  };

  // Los totales se suman aquí y no en Postgres: son las mismas filas que ya
  // están en pantalla, así que la fila de total no puede discrepar de lo que
  // hay encima —que es justo lo que alguien va a comprobar con la calculadora.
  const total = filas.reduce(
    (a, f) => ({
      tickets: a.tickets + f.tickets,
      bruta: a.bruta + Number(f.venta),
      comision: a.comision + Number(f.comision),
      neta: a.neta + Number(f.neta),
    }),
    { tickets: 0, bruta: 0, comision: 0, neta: 0 },
  );

  const periodo = textoPeriodo(rango, fecha);
  const parte = (n: number) =>
    total.bruta > 0 ? `${Math.round((n / total.bruta) * 1000) / 10}%` : "—";

  return (
    <>
      <PestanasReportes activa="/panel/reportes/tiendas" />

      <FiltrosTiendas
        atajo={atajo}
        desde={desdeParam}
        hasta={hastaParam}
        enlace={enlace}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaIndicador
          etiqueta="VENTA BRUTA"
          valor={monedaCompacta(total.bruta)}
          nota={periodo}
        />
        <TarjetaIndicador
          etiqueta="COMISIONES"
          valor={monedaCompacta(total.comision)}
          nota={`${parte(total.comision)} de la bruta`}
        />
        <TarjetaIndicador
          etiqueta="VENTA NETA"
          valor={monedaCompacta(total.neta)}
          nota={`${parte(total.neta)} de la bruta`}
        />
        <TarjetaIndicador
          etiqueta="TIENDAS CON VENTA"
          valor={numero(filas.length)}
          nota={`${numero(total.tickets)} ${total.tickets === 1 ? "compra" : "compras"}`}
        />
      </section>

      <Tarjeta className="overflow-hidden">
        {filas.length === 0 ? (
          <Vacio
            titulo="Sin ventas en el periodo"
            descripcion="Ninguna tienda registró compras entre esas fechas. Prueba con un rango más amplio."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <caption className="sr-only">
                Venta bruta, comisiones y venta neta por punto de venta
              </caption>
              <thead>
                <tr className="border-ink/8 border-b">
                  <th
                    scope="col"
                    className="text-ink/42 px-5 py-3 text-left text-[9px] font-medium tracking-[0.18em]"
                  >
                    TIENDA
                  </th>
                  <th
                    scope="col"
                    className="text-ink/42 px-3 py-3 text-right text-[9px] font-medium tracking-[0.18em]"
                  >
                    COMPRAS
                  </th>
                  <th
                    scope="col"
                    className="text-ink/42 px-3 py-3 text-right text-[9px] font-medium tracking-[0.18em]"
                  >
                    VENTA BRUTA
                  </th>
                  <th
                    scope="col"
                    className="text-ink/42 px-3 py-3 text-right text-[9px] font-medium tracking-[0.18em]"
                  >
                    COMISIONES
                  </th>
                  <th
                    scope="col"
                    className="text-ink/42 px-5 py-3 text-right text-[9px] font-medium tracking-[0.18em]"
                  >
                    VENTA NETA
                  </th>
                </tr>
              </thead>

              <tbody>
                {filas.map((f) => (
                  <tr key={f.tienda_id} className="border-ink/6 border-b">
                    <th
                      scope="row"
                      className="px-5 py-[13px] text-left text-[13px] font-medium"
                    >
                      {f.tienda}
                    </th>
                    <td className="text-ink/55 px-3 py-[13px] text-right tabular-nums">
                      {numero(f.tickets)}
                    </td>
                    <td className="px-3 py-[13px] text-right tabular-nums">
                      {moneda(Number(f.venta))}
                    </td>
                    {/* El descuento en su propio tono: es lo único de la fila
                        que resta, y verlo distinto ahorra leer la cabecera. */}
                    <td className="text-clay px-3 py-[13px] text-right tabular-nums">
                      −{moneda(Number(f.comision))}
                    </td>
                    <td className="px-5 py-[13px] text-right font-semibold tabular-nums">
                      {moneda(Number(f.neta))}
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* El total va en `tfoot`: para un lector de pantalla deja de ser
                  una fila más y pasa a ser el cierre de la tabla. */}
              <tfoot>
                <tr className="border-ink/12 bg-ink/3 border-t-2">
                  <th scope="row" className="px-5 py-[15px] text-left text-[13px] font-semibold">
                    TOTAL
                  </th>
                  <td className="px-3 py-[15px] text-right font-semibold tabular-nums">
                    {numero(total.tickets)}
                  </td>
                  <td className="px-3 py-[15px] text-right font-semibold tabular-nums">
                    {moneda(total.bruta)}
                  </td>
                  <td className="text-clay px-3 py-[15px] text-right font-semibold tabular-nums">
                    −{moneda(total.comision)}
                  </td>
                  <td className="px-5 py-[15px] text-right font-semibold tabular-nums">
                    {moneda(total.neta)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Tarjeta>

      <p className="text-ink/45 m-0 text-[11.5px]">
        La venta bruta es el precio de lista de lo vendido; la comisión, el
        descuento que otorgó el vale; la neta, lo que entró en caja. Las fechas
        van en horario de Guatemala.
      </p>
    </>
  );
}
