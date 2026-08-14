"use client";

import { useActionState } from "react";

import { Boton } from "@/components/ui/boton";
import { Rotulo } from "@/components/ui/campo";
import {
  guardarConfiguracion,
  type EstadoConfig,
} from "@/lib/acciones/configuracion";

/** Campo numérico con sufijo (% o días). */
function CampoNumero({
  clave,
  etiqueta,
  ayuda,
  valor,
  sufijo,
  error,
  min = 0,
  max = 100,
  paso = "0.5",
}: {
  clave: string;
  etiqueta: string;
  ayuda?: string;
  valor: string;
  sufijo: string;
  error?: string;
  min?: number;
  max?: number;
  paso?: string;
}) {
  return (
    <label className="flex flex-col gap-[7px]">
      <Rotulo>{etiqueta}</Rotulo>
      <div
        className={`border-ink/14 bg-paper rounded-field flex items-stretch overflow-hidden border transition-[border-color,box-shadow] duration-150 focus-within:border-gold focus-within:shadow-[0_0_0_3px_rgba(198,161,91,0.16)] ${
          error ? "border-clay" : ""
        }`}
      >
        <input
          name={clave}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={paso}
          defaultValue={valor}
          className="text-ink min-w-0 flex-1 border-none bg-transparent px-[14px] py-[13px] text-sm outline-none"
          required
        />
        <span className="border-ink/10 text-ink/45 flex items-center border-l px-3 text-[12px]">
          {sufijo}
        </span>
      </div>
      {error ? (
        <span className="text-clay text-[11px]">{error}</span>
      ) : ayuda ? (
        <span className="text-ink/40 text-[11px]">{ayuda}</span>
      ) : null}
    </label>
  );
}

export function FormularioConfiguracion({
  valores,
}: {
  valores: Record<string, string>;
}) {
  const [estado, accion, enviando] = useActionState<EstadoConfig, FormData>(
    guardarConfiguracion,
    null,
  );

  const err = (c: string) => estado?.campos?.[c];
  const v = (c: string, defecto: string) => valores[c] ?? defecto;

  return (
    <form action={accion} className="flex flex-col gap-7">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-display m-0 text-[19px] leading-tight font-normal">
            Descuento por tipo de vale
          </h3>
          <p className="text-ink/50 m-0 text-[12.5px] leading-relaxed">
            Se aplica solo a los vales que se emitan de aquí en adelante. Los
            ya entregados conservan el porcentaje con el que se generaron.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoNumero
            clave="descuento_a1_30"
            etiqueta="A1 · COMPRÓ HACE 30 DÍAS"
            valor={v("descuento_a1_30", "15")}
            sufijo="%"
            error={err("descuento_a1_30")}
          />
          <CampoNumero
            clave="descuento_a1_60"
            etiqueta="A1 · COMPRÓ HACE 60 DÍAS"
            valor={v("descuento_a1_60", "20")}
            sufijo="%"
            error={err("descuento_a1_60")}
          />
          <CampoNumero
            clave="descuento_a1_90"
            etiqueta="A1 · COMPRÓ HACE 90 DÍAS"
            valor={v("descuento_a1_90", "25")}
            sufijo="%"
            error={err("descuento_a1_90")}
          />
          <CampoNumero
            clave="descuento_a1_vip"
            etiqueta="A1 · CLIENTE VIP"
            valor={v("descuento_a1_vip", "30")}
            sufijo="%"
            error={err("descuento_a1_vip")}
          />
          <CampoNumero
            clave="descuento_a2"
            etiqueta="A2 · EMPLEADOS Y REFERIDOS"
            valor={v("descuento_a2", "20")}
            sufijo="%"
            error={err("descuento_a2")}
          />
          <CampoNumero
            clave="descuento_a3"
            etiqueta="A3 · VISITANTE DE TIENDA"
            valor={v("descuento_a3", "10")}
            sufijo="%"
            error={err("descuento_a3")}
          />
        </div>
      </section>

      <section className="border-ink/8 flex flex-col gap-4 border-t pt-6">
        <h3 className="font-display m-0 text-[19px] leading-tight font-normal">
          Vigencia y cupos
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoNumero
            clave="dias_vigencia_vale"
            etiqueta="VIGENCIA DEL VALE"
            ayuda="Contados desde la emisión."
            valor={v("dias_vigencia_vale", "30")}
            sufijo="días"
            min={1}
            max={3650}
            paso="1"
            error={err("dias_vigencia_vale")}
          />
          <CampoNumero
            clave="vales_por_rango"
            etiqueta="TAMAÑO DEL BLOQUE"
            ayuda="Valor propuesto al asignar un rango nuevo."
            valor={v("vales_por_rango", "100")}
            sufijo="vales"
            min={1}
            max={10000}
            paso="1"
            error={err("vales_por_rango")}
          />
        </div>
      </section>

      {estado?.error ? (
        <p
          role="alert"
          className="border-clay/25 bg-clay/6 text-clay rounded-field m-0 border px-3 py-[10px] text-[12px] leading-relaxed"
        >
          {estado.error}
        </p>
      ) : null}

      {estado?.ok ? (
        <p className="border-gold/30 bg-gold/8 text-gold-deep rounded-field m-0 border px-3 py-[10px] text-[12px]">
          {estado.ok}
        </p>
      ) : null}

      <Boton type="submit" disabled={enviando} className="self-start px-6 py-[14px]">
        {enviando ? "GUARDANDO…" : "GUARDAR CAMBIOS"}
      </Boton>
    </form>
  );
}
