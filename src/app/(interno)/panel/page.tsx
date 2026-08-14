import Link from "next/link";

import { ChipEstado } from "@/components/ui/chip-estado";
import {
  Tarjeta,
  TarjetaEncabezado,
  TarjetaIndicador,
} from "@/components/ui/tarjeta";
import { fecha, iniciales, monedaCorta } from "@/lib/format";
import {
  CLIENTES_DEMO,
  INDICADORES_DEMO,
  VALES_DEMO,
  VALE_EN_CURSO_DEMO,
} from "@/lib/datos-demo";

/** Rejilla compartida por la cabecera y las filas de la tabla de vales. */
const COLUMNAS =
  "grid-cols-[minmax(74px,96px)_minmax(150px,1.4fr)_minmax(66px,90px)_minmax(76px,108px)_minmax(74px,90px)]";

export default function PaginaPanel() {
  const v = VALE_EN_CURSO_DEMO;
  const avance = Math.round((v.abonado / v.total) * 100);

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {INDICADORES_DEMO.map((i) => (
          <TarjetaIndicador
            key={i.etiqueta}
            etiqueta={i.etiqueta}
            valor={i.valor}
            nota={i.nota}
          />
        ))}
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(560px,1.62fr)_minmax(280px,1fr)]">
        {/* Vales recientes */}
        <Tarjeta className="min-w-0 overflow-x-auto">
          <TarjetaEncabezado titulo="Vales recientes">
            <div className="flex gap-[6px]">
              <span className="bg-ink text-gold-light rounded-field px-3 py-[6px] text-[10px] font-medium tracking-[0.12em]">
                TODOS
              </span>
              <span className="border-ink/12 text-ink/55 rounded-field border px-3 py-[6px] text-[10px] font-medium tracking-[0.12em]">
                ACTIVOS
              </span>
              <span className="border-ink/12 text-ink/55 rounded-field border px-3 py-[6px] text-[10px] font-medium tracking-[0.12em]">
                CANJEADOS
              </span>
            </div>
          </TarjetaEncabezado>

          <div
            className={`bg-ink/2 text-ink/42 grid ${COLUMNAS} gap-3 px-[22px] py-3 text-[9px] font-medium tracking-[0.18em]`}
          >
            <span>FOLIO</span>
            <span>CLIENTE</span>
            <span>MONTO</span>
            <span>VENCE</span>
            <span>ESTADO</span>
          </div>

          {VALES_DEMO.map((vale) => (
            <div
              key={vale.folio}
              className={`border-ink/6 hover:bg-gold/5 grid ${COLUMNAS} items-center gap-3 border-t px-[22px] py-[15px] text-[12.5px] transition-colors`}
            >
              <span className="text-gold-dark font-mono text-[11.5px] font-medium">
                {vale.folio}
              </span>
              <span className="flex flex-col gap-[2px]">
                <span className="font-medium">{vale.cliente}</span>
                <span className="text-ink/42 text-[11px]">{vale.pieza}</span>
              </span>
              <span className="font-semibold">{monedaCorta(vale.monto)}</span>
              <span className="text-ink/55">{fecha(vale.vence)}</span>
              <ChipEstado estado={vale.estado} />
            </div>
          ))}

          <div className="border-ink/6 text-ink/45 flex justify-between border-t px-[22px] py-[14px] text-[11px]">
            <span>Mostrando {VALES_DEMO.length} de 148 vales</span>
            <Link href="/panel/vales" className="text-gold-dark">
              Ver todos
            </Link>
          </div>
        </Tarjeta>

        <div className="flex flex-col gap-5">
          {/* Vale en curso */}
          <div className="bg-ink text-bone rounded-card relative overflow-hidden p-[22px]">
            <div className="border-gold/30 absolute top-[-90px] right-[-110px] size-[220px] rotate-45 border" />
            <span className="text-gold-light/70 tracking-label text-[9px] leading-none font-medium">
              VALE EN CURSO
            </span>
            <div className="mt-4 mb-[18px] flex flex-col gap-1">
              <span className="font-display text-gold-light text-[34px] leading-none">
                {monedaCorta(v.total)}
              </span>
              <span className="text-bone/50 text-xs">
                Folio {v.folio} · {v.pieza}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="bg-bone/14 h-[3px] rounded-sm">
                <div
                  className="bg-gold h-[3px] rounded-sm transition-[width] duration-500"
                  style={{ width: `${avance}%` }}
                />
              </div>
              <span className="text-bone/45 text-[11px]">
                {monedaCorta(v.abonado)} abonados · {v.pagosHechos} de{" "}
                {v.pagosTotales} pagos
              </span>
            </div>
            <button className="border-gold/45 text-gold-light hover:bg-gold/14 rounded-field tracking-action mt-5 w-full cursor-pointer border p-3 text-[10.5px] font-semibold transition-colors">
              REGISTRAR ABONO
            </button>
          </div>

          {/* Clientes nuevos */}
          <Tarjeta className="flex flex-col gap-4 px-[22px] py-5">
            <h3 className="font-display m-0 text-lg leading-none font-normal">
              Clientes nuevos
            </h3>
            {CLIENTES_DEMO.map((c) => (
              <div key={c.nombre} className="flex items-center gap-3">
                <span className="bg-gold/14 font-display text-gold-dark flex size-8 items-center justify-center rounded-full text-xs font-medium">
                  {iniciales(c.nombre)}
                </span>
                <span className="flex flex-1 flex-col gap-[2px]">
                  <span className="text-[12.5px] font-medium">{c.nombre}</span>
                  <span className="text-ink/42 text-[11px]">{c.detalle}</span>
                </span>
                <span className="text-ink/35 text-[11px]">{c.cuando}</span>
              </div>
            ))}
            <Link
              href="/panel/clientes"
              className="border-ink/14 text-ink/70 hover:border-gold hover:text-ink rounded-field tracking-field border p-[11px] text-center text-[10.5px] font-medium transition-colors"
            >
              REGISTRAR CLIENTE
            </Link>
          </Tarjeta>
        </div>
      </section>
    </>
  );
}
