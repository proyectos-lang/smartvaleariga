import type { Metadata } from "next";

import { PestanasReportes } from "@/components/reportes/pestanas";
import { Tarjeta, TarjetaIndicador } from "@/components/ui/tarjeta";
import { Vacio } from "@/components/ui/vacio";
import { requerirAdmin } from "@/lib/auth/guardas";
import { ventasPorTienda, type RangoVentas } from "@/lib/datos/ventas";
import { fecha, moneda, monedaCompacta, numero } from "@/lib/format";

import { resolverRango, textoPeriodo, texto } from "@/lib/rango-fechas";
import { FiltrosTiendas } from "./filtros";

export const metadata: Metadata = { title: "Reporte por tienda" };

/**
 * Venta por punto de venta, con el desglose que pide la liquidación.
 *
 * Las otras dos pestañas responden preguntas comerciales —qué puerta trae
 * mejor gente, a qué hora hay movimiento—. Esta responde una contable: cuánto
 * vendió cada tienda por cada vía y cuánto entró en caja en total. Por eso es
 * una tabla y no una gráfica: son cifras que se leen al centavo y se suman,
 * no formas que se comparan de un vistazo.
 *
 *   Bruta con vales  `monto_compra`        precio de lista de lo vendido con vale
 *   Comisión         `descuento_aplicado`  lo que la clienta dejó de pagar
 *   Neta con vales   bruta − comisión      lo que entró por esa vía
 *   Venta normal     `ventas_normales`     lo vendido sin vale, sin descuento
 *   GRAN TOTAL       neta + venta normal   el dinero real de la tienda
 *
 * La resta no descuenta dos veces: el descuento se calcula SOBRE
 * `monto_compra`, así que esa columna es precio de lista, no lo cobrado.
 *
 * El gran total lleva la NETA y no la bruta porque mide dinero, no valor de
 * lista: sumarle la bruta contaría lo que la clienta nunca llegó a pagar.
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
      normales: a.normales + f.ventas_normales,
      ventaNormal: a.ventaNormal + Number(f.venta_normal),
      granTotal: a.granTotal + Number(f.gran_total),
    }),
    {
      tickets: 0,
      bruta: 0,
      comision: 0,
      neta: 0,
      normales: 0,
      ventaNormal: 0,
      granTotal: 0,
    },
  );

  const periodo = textoPeriodo(rango, fecha);

  return (
    <>
      <PestanasReportes activa="/panel/reportes/tiendas" />

      <FiltrosTiendas
        atajo={atajo}
        desde={desdeParam}
        hasta={hastaParam}
        enlace={enlace}
      />

      {/* Los cuatro totales, en el orden en que se leen: lo que se vendió con
          vale a precio de lista, lo que de eso entró en caja, lo que se
          vendió sin vale, y la suma real de las dos vías. */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaIndicador
          etiqueta="BRUTO CON VALES"
          valor={monedaCompacta(total.bruta)}
          nota={`Menos ${monedaCompacta(total.comision)} de comisiones`}
        />
        <TarjetaIndicador
          etiqueta="NETO CON VALES"
          valor={monedaCompacta(total.neta)}
          nota={`${numero(total.tickets)} ${total.tickets === 1 ? "compra" : "compras"} con vale`}
        />
        <TarjetaIndicador
          etiqueta="VENTAS NORMALES"
          valor={monedaCompacta(total.ventaNormal)}
          nota={`${numero(total.normales)} ${total.normales === 1 ? "venta" : "ventas"} sin vale`}
        />
        <TarjetaIndicador
          etiqueta="GRAN TOTAL"
          valor={monedaCompacta(total.granTotal)}
          nota={periodo}
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
                Venta por tienda: con vale (bruta, comisiones y neta), sin vale
                y gran total
              </caption>
              <thead>
                {/* Dos filas de cabecera: con siete columnas de cifras, saber
                    cuáles pertenecen a los vales y cuáles no es la mitad de
                    poder leer la tabla. */}
                <tr className="border-ink/6 border-b">
                  <th />
                  <th
                    colSpan={4}
                    scope="colgroup"
                    className="text-ink/35 border-ink/8 border-x px-3 pt-3 pb-1 text-center text-[9px] font-medium tracking-[0.18em]"
                  >
                    CON VALE
                  </th>
                  <th
                    colSpan={2}
                    scope="colgroup"
                    className="text-ink/35 px-3 pt-3 pb-1 text-center text-[9px] font-medium tracking-[0.18em]"
                  >
                    SIN VALE
                  </th>
                  <th />
                </tr>
                <tr className="border-ink/8 border-b">
                  <th
                    scope="col"
                    className="text-ink/42 px-5 py-3 text-left text-[9px] font-medium tracking-[0.18em]"
                  >
                    TIENDA
                  </th>
                  <th
                    scope="col"
                    className="text-ink/42 border-ink/8 border-l px-3 py-3 text-right text-[9px] font-medium tracking-[0.18em]"
                  >
                    COMPRAS
                  </th>
                  <th
                    scope="col"
                    className="text-ink/42 px-3 py-3 text-right text-[9px] font-medium tracking-[0.18em]"
                  >
                    BRUTO
                  </th>
                  <th
                    scope="col"
                    className="text-ink/42 px-3 py-3 text-right text-[9px] font-medium tracking-[0.18em]"
                  >
                    COMISIONES
                  </th>
                  <th
                    scope="col"
                    className="text-ink/42 border-ink/8 border-r px-3 py-3 text-right text-[9px] font-medium tracking-[0.18em]"
                  >
                    NETO
                  </th>
                  <th
                    scope="col"
                    className="text-ink/42 px-3 py-3 text-right text-[9px] font-medium tracking-[0.18em]"
                  >
                    VENTAS
                  </th>
                  <th
                    scope="col"
                    className="text-ink/42 px-3 py-3 text-right text-[9px] font-medium tracking-[0.18em]"
                  >
                    MONTO
                  </th>
                  <th
                    scope="col"
                    className="text-ink/42 px-5 py-3 text-right text-[9px] font-medium tracking-[0.18em]"
                  >
                    GRAN TOTAL
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
                    <td className="text-ink/55 border-ink/8 border-l px-3 py-[13px] text-right tabular-nums">
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
                    <td className="border-ink/8 border-r px-3 py-[13px] text-right tabular-nums">
                      {moneda(Number(f.neta))}
                    </td>
                    <td className="text-ink/55 px-3 py-[13px] text-right tabular-nums">
                      {f.ventas_normales > 0 ? numero(f.ventas_normales) : "—"}
                    </td>
                    <td className="px-3 py-[13px] text-right tabular-nums">
                      {f.ventas_normales > 0
                        ? moneda(Number(f.venta_normal))
                        : "—"}
                    </td>
                    <td className="px-5 py-[13px] text-right font-semibold tabular-nums">
                      {moneda(Number(f.gran_total))}
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
                  <td className="border-ink/8 border-l px-3 py-[15px] text-right font-semibold tabular-nums">
                    {numero(total.tickets)}
                  </td>
                  <td className="px-3 py-[15px] text-right font-semibold tabular-nums">
                    {moneda(total.bruta)}
                  </td>
                  <td className="text-clay px-3 py-[15px] text-right font-semibold tabular-nums">
                    −{moneda(total.comision)}
                  </td>
                  <td className="border-ink/8 border-r px-3 py-[15px] text-right font-semibold tabular-nums">
                    {moneda(total.neta)}
                  </td>
                  <td className="px-3 py-[15px] text-right font-semibold tabular-nums">
                    {numero(total.normales)}
                  </td>
                  <td className="px-3 py-[15px] text-right font-semibold tabular-nums">
                    {moneda(total.ventaNormal)}
                  </td>
                  <td className="px-5 py-[15px] text-right font-semibold tabular-nums">
                    {moneda(total.granTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Tarjeta>

      <p className="text-ink/45 m-0 text-[11.5px]">
        El bruto con vale es el precio de lista de lo vendido con vale; la
        comisión, el descuento que otorgó; el neto, lo que de esa vía entró en
        caja. La venta sin vale no lleva descuento. El gran total suma el neto
        con vales más la venta sin vale: es el dinero real de la tienda. Las
        fechas van en horario de Guatemala.
      </p>
    </>
  );
}
