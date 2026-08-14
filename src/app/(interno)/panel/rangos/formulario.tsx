"use client";

import { useActionState } from "react";

import { Boton } from "@/components/ui/boton";
import { Campo, Selector } from "@/components/ui/campo";
import { asignarRango, type EstadoRango } from "@/lib/acciones/rangos";

export function FormularioRango({
  candidatos,
  tamanoPredeterminado,
  siguienteInicio,
}: {
  candidatos: { id: number; nombre: string; restantes: number }[];
  tamanoPredeterminado: number;
  siguienteInicio: number;
}) {
  const [estado, accion, enviando] = useActionState<EstadoRango, FormData>(
    asignarRango,
    null,
  );

  return (
    <form action={accion} className="flex flex-col gap-4">
      <Selector etiqueta="VENDEDORA" name="usuarioId" defaultValue="" required>
        <option value="" disabled>
          Elige a quién asignarle el bloque…
        </option>
        {candidatos.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
            {c.restantes > 0 ? ` — le quedan ${c.restantes}` : " — sin cupo"}
          </option>
        ))}
      </Selector>

      <Campo
        etiqueta="TAMAÑO DEL BLOQUE"
        name="tamano"
        type="number"
        min={1}
        max={10000}
        defaultValue={tamanoPredeterminado}
      />

      <Campo etiqueta="NOTA (OPCIONAL)" name="nota" placeholder="Motivo o campaña" />

      <p className="border-ink/8 text-ink/45 m-0 border-t pt-3 text-[11.5px] leading-relaxed">
        El siguiente bloque libre arranca en{" "}
        <span className="text-ink font-mono font-medium">{siguienteInicio}</span>
        . Los bloques nunca se solapan, así que cada correlativo es único en
        todo el sistema.
      </p>

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

      <Boton
        type="submit"
        disabled={enviando || candidatos.length === 0}
        className="py-[14px]"
      >
        {enviando ? "ASIGNANDO…" : "ASIGNAR BLOQUE"}
      </Boton>
    </form>
  );
}
