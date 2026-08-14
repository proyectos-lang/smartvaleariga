import type { Metadata } from "next";

import { Tarjeta, TarjetaIndicador } from "@/components/ui/tarjeta";
import { Vacio } from "@/components/ui/vacio";
import { Barras } from "@/components/reportes/barras";
import { Medidor } from "@/components/reportes/medidor";
import { SerieTiempo } from "@/components/reportes/serie-tiempo";
import { PuntoTipo } from "@/components/vales/chip-tipo";
import { requerirAdmin } from "@/lib/auth/guardas";
import {
  actividadDiaria,
  metricasGenerales,
  metricasPorTipo,
  rankingTiendas,
  rankingVendedoras,
  viralidadA2,
} from "@/lib/datos/metricas";
import { moneda, monedaCompacta } from "@/lib/format";
import { ETIQUETA_TIPO, type TipoVale } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Inteligencia comercial" };

const COLOR_TIPO: Record<TipoVale, string> = {
  A1: "var(--color-serie-a1)",
  A2: "var(--color-serie-a2)",
  A3: "var(--color-serie-a3)",
};

export default async function PaginaReportes() {
  await requerirAdmin();

  const [general, porTipo, vendedoras, tiendas, viral, actividad] =
    await Promise.all([
      metricasGenerales(),
      metricasPorTipo(),
      rankingVendedoras(8),
      rankingTiendas(8),
      viralidadA2(),
      actividadDiaria(30),
    ]);

  if (general.vales_emitidos === 0) {
    return (
      <Tarjeta>
        <Vacio
          titulo="Todavía no hay nada que medir"
          descripcion="En cuanto se emitan los primeros vales y se registren compras, aquí aparecerán la conversión, los rankings y el alcance de cada campaña."
        />
      </Tarjeta>
    );
  }

  const tipos: TipoVale[] = ["A1", "A2", "A3"];
  const datosTipo = tipos.map((t) => {
    const fila = porTipo.find((p) => p.tipo === t);
    return {
      tipo: t,
      vales: fila?.vales ?? 0,
      redenciones: fila?.redenciones ?? 0,
      conversion: fila?.tasa_conversion ?? null,
      ingreso: Number(fila?.ingreso ?? 0),
    };
  });

  return (
    <>
      {/* Cifra principal: una sola por vista */}
      <Tarjeta className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-ink/42 text-[9px] font-medium tracking-[0.2em]">
            VENTA GENERADA POR VALES
          </span>
          {/* La guía de visualización desaconseja una serif en la cifra
              principal por leerse como adorno ajeno a la marca. Aquí es al
              revés: Cormorant es la marca y la usa cada cifra grande de la
              aplicación. Una cifra en sans junto a indicadores en serif
              parecería un error. */}
          <span className="font-display text-ink text-[56px] leading-none font-medium">
            {moneda(Number(general.ingreso_total))}
          </span>
          <span className="text-ink/50 text-[13px]">
            {general.redenciones}{" "}
            {general.redenciones === 1 ? "compra" : "compras"} ·{" "}
            {general.ticket_promedio
              ? `ticket promedio ${moneda(Number(general.ticket_promedio))}`
              : "sin compras aún"}
          </span>
        </div>

        <div className="grid shrink-0 gap-6 sm:grid-cols-2 lg:w-[420px]">
          <Medidor
            etiqueta="CONVERSIÓN"
            parte={general.vales_con_compra}
            total={general.vales_emitidos}
            nota="vales que generaron compra"
          />
          <Medidor
            etiqueta="DESCUENTO SOBRE VENTA"
            parte={Number(general.descuento_total)}
            total={Number(general.ingreso_total)}
            parteTexto={monedaCompacta(Number(general.descuento_total))}
            totalTexto={monedaCompacta(Number(general.ingreso_total))}
            nota="otorgado"
            color="var(--color-serie-a3)"
          />
        </div>
      </Tarjeta>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaIndicador
          etiqueta="VALES EMITIDOS"
          valor={general.vales_emitidos}
          nota={`${general.vales_activos} vigentes · ${general.vales_vencidos} vencidos`}
        />
        <TarjetaIndicador
          etiqueta="REDENCIONES"
          valor={general.redenciones}
          nota={`${general.vales_con_compra} vales distintos`}
        />
        <TarjetaIndicador
          etiqueta="DESCUENTO OTORGADO"
          valor={monedaCompacta(Number(general.descuento_total))}
          nota="Costo de la campaña"
        />
        <TarjetaIndicador
          etiqueta="ALCANCE VIRAL A2"
          valor={
            viral.redenciones_por_vale
              ? Number(viral.redenciones_por_vale).toFixed(1)
              : "—"
          }
          nota="Compras por vale compartido"
        />
      </section>

      <Tarjeta className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h3 className="font-display m-0 text-lg leading-none font-normal">
            Actividad de los últimos 30 días
          </h3>
          <p className="text-ink/45 m-0 text-[12px]">
            Emisión y uso, día a día.
          </p>
        </div>
        <SerieTiempo
          datos={actividad.map((d) => ({
            dia: d.dia,
            emitidos: d.vales_emitidos,
            redenciones: d.redenciones,
          }))}
        />
      </Tarjeta>

      <section className="grid gap-5 lg:grid-cols-2">
        <Tarjeta className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h3 className="font-display m-0 text-lg leading-none font-normal">
              Adquisición por puerta de entrada
            </h3>
            <p className="text-ink/45 m-0 text-[12px]">
              De dónde vienen los clientes captados.
            </p>
          </div>

          <Barras
            datos={datosTipo.map((d) => ({
              etiqueta: `${d.tipo} · ${ETIQUETA_TIPO[d.tipo]}`,
              valor: d.vales,
              valorTexto: `${d.vales} vales`,
              color: COLOR_TIPO[d.tipo],
            }))}
          />

          {/* En un teléfono estrecho las cuatro columnas se aprietan; el
              contenedor desplaza la tabla en vez de encoger las cifras. */}
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="border-ink/6 w-full min-w-[300px] border-collapse border-t text-[12px]">
              <thead>
                <tr className="text-ink/40 text-left">
                  <th className="py-[10px] font-medium">Tipo</th>
                  <th className="py-[10px] text-right font-medium">Compras</th>
                  <th className="py-[10px] text-right font-medium">Conversión</th>
                  <th className="py-[10px] text-right font-medium">Venta</th>
                </tr>
              </thead>
              <tbody>
                {datosTipo.map((d) => (
                  <tr key={d.tipo} className="border-ink/6 border-t">
                    <td className="py-[10px]">
                      <span className="flex items-center gap-2">
                        <PuntoTipo tipo={d.tipo} />
                        {d.tipo}
                      </span>
                    </td>
                    <td className="py-[10px] text-right tabular-nums">
                      {d.redenciones}
                    </td>
                    <td className="py-[10px] text-right tabular-nums">
                      {d.conversion === null ? "—" : `${d.conversion}%`}
                    </td>
                    <td className="py-[10px] text-right font-medium tabular-nums">
                      {d.ingreso > 0 ? monedaCompacta(d.ingreso) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tarjeta>

        <Tarjeta className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h3 className="font-display m-0 text-lg leading-none font-normal">
              Viralidad de los vales A2
            </h3>
            <p className="text-ink/45 m-0 text-[12px]">
              Los únicos pensados para compartirse.
            </p>
          </div>

          {viral.vales_a2 === 0 ? (
            <p className="text-ink/45 m-0 py-6 text-center text-[12.5px]">
              Todavía no se ha emitido ningún vale A2.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                {[
                  [
                    "COMPRAS POR VALE",
                    viral.redenciones_por_vale
                      ? Number(viral.redenciones_por_vale).toFixed(1)
                      : "0",
                    "Promedio de alcance",
                  ],
                  [
                    "ALCANCE MÁXIMO",
                    String(viral.alcance_maximo ?? 0),
                    "El vale que más circuló",
                  ],
                  [
                    "VALES COMPARTIDOS",
                    String(viral.vales_compartidos),
                    "Usados más de una vez",
                  ],
                  [
                    "VENTA A2",
                    monedaCompacta(Number(viral.ingreso_a2)),
                    "Generada en frío",
                  ],
                ].map(([etiqueta, valor, nota]) => (
                  <div key={etiqueta} className="flex flex-col gap-[6px]">
                    <span className="text-ink/42 text-[9px] font-medium tracking-[0.18em]">
                      {etiqueta}
                    </span>
                    <span className="text-ink text-[26px] leading-none font-semibold">
                      {valor}
                    </span>
                    <span className="text-ink/45 text-[11px]">{nota}</span>
                  </div>
                ))}
              </div>

              <Medidor
                etiqueta="VALES A2 QUE SE COMPARTIERON"
                parte={viral.vales_compartidos}
                total={viral.vales_a2}
                nota="usados por más de una persona"
                color="var(--color-serie-a2)"
                className="border-ink/6 border-t pt-5"
              />
            </>
          )}
        </Tarjeta>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Tarjeta className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h3 className="font-display m-0 text-lg leading-none font-normal">
              Ranking de vendedoras
            </h3>
            <p className="text-ink/45 m-0 text-[12px]">
              Venta generada por los vales que emitió cada una.
            </p>
          </div>

          {vendedoras.length === 0 ? (
            <p className="text-ink/45 m-0 py-6 text-center text-[12.5px]">
              Sin datos todavía.
            </p>
          ) : (
            <Barras
              datos={vendedoras.map((v) => ({
                etiqueta: v.emisora,
                detalle: `${v.vales_emitidos} vales · ${Math.round(Number(v.tasa_conversion ?? 0))}% conv.`,
                valor: Number(v.ingreso_generado),
                valorTexto:
                  Number(v.ingreso_generado) > 0
                    ? monedaCompacta(Number(v.ingreso_generado))
                    : "—",
              }))}
            />
          )}
        </Tarjeta>

        <Tarjeta className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h3 className="font-display m-0 text-lg leading-none font-normal">
              Ranking de tiendas
            </h3>
            <p className="text-ink/45 m-0 text-[12px]">
              Dónde se cobran las compras, no dónde se emitió el vale.
            </p>
          </div>

          {tiendas.length === 0 ? (
            <p className="text-ink/45 m-0 py-6 text-center text-[12.5px]">
              Sin datos todavía.
            </p>
          ) : (
            <Barras
              datos={tiendas.map((t) => ({
                etiqueta: t.tienda,
                detalle: `${t.redenciones} compras${
                  t.ticket_promedio
                    ? ` · ticket ${monedaCompacta(Number(t.ticket_promedio))}`
                    : ""
                }`,
                valor: Number(t.ingreso),
                valorTexto:
                  Number(t.ingreso) > 0 ? monedaCompacta(Number(t.ingreso)) : "—",
              }))}
            />
          )}
        </Tarjeta>
      </section>
    </>
  );
}
