"use client";

import { useActionState, useEffect, useRef } from "react";

import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { crearTienda, type EstadoTienda } from "@/lib/acciones/tiendas";

export function FormularioTienda() {
  const formulario = useRef<HTMLFormElement>(null);
  const [estado, accion, enviando] = useActionState<EstadoTienda, FormData>(
    crearTienda,
    null,
  );

  // Al crear una tienda se limpia el formulario: lo normal es dar de alta
  // varias seguidas.
  useEffect(() => {
    if (estado?.ok) formulario.current?.reset();
  }, [estado]);

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-4">
      <Campo etiqueta="NOMBRE" name="nombre" placeholder="Sucursal Centro" required />
      <Campo
        etiqueta="DIRECCIÓN (OPCIONAL)"
        name="direccion"
        placeholder="Calle y número"
      />
      <Campo
        etiqueta="TELÉFONO (OPCIONAL)"
        name="telefono"
        placeholder="2345 6789"
      />

      {estado?.error ? (
        <p
          role="alert"
          className="border-clay/25 bg-clay/6 text-clay rounded-field m-0 border px-3 py-[10px] text-[12px]"
        >
          {estado.error}
        </p>
      ) : null}

      {estado?.ok ? (
        <p className="border-gold/30 bg-gold/8 text-gold-deep rounded-field m-0 border px-3 py-[10px] text-[12px]">
          {estado.ok}
        </p>
      ) : null}

      <Boton type="submit" disabled={enviando} className="py-[14px]">
        {enviando ? "GUARDANDO…" : "AGREGAR TIENDA"}
      </Boton>
    </form>
  );
}
