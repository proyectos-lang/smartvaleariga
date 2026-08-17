"use client";

import { useActionState } from "react";

import {
  registrarVisitante,
  type EstadoRegistro,
} from "@/lib/acciones/autorregistro";
import type { Asesora } from "@/lib/datos/usuarios";

/**
 * Formulario que ve el cliente en su propio teléfono.
 *
 * Estilo aparte del panel a propósito: aquí no hay una vendedora conocedora
 * del sistema sino alguien de pie en una tienda, así que los campos son
 * grandes, el teclado numérico se abre solo y no se pide nada que no haga
 * falta. El correo va al final y es opcional.
 */
export function FormularioRegistro({
  token,
  clavePais,
  asesoras,
  tienda,
}: {
  token: string;
  clavePais: string;
  /** Las de esta tienda: es a quien tiene delante. */
  asesoras: Asesora[];
  tienda: string;
}) {
  const [estado, accion, enviando] = useActionState<EstadoRegistro, FormData>(
    registrarVisitante,
    null,
  );

  const campo = (n: string) => estado?.campos?.[n];

  const clases =
    "border-bone/15 bg-bone/5 text-bone placeholder:text-bone/30 rounded-field focus:border-gold w-full border px-4 py-4 text-[16px] transition-colors outline-none focus:shadow-[0_0_0_3px_rgba(198,161,91,0.18)]";

  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      {/* La clave viaja aparte y el servidor la antepone: guardar el número
          sin ella dejaba contactos duplicados y enlaces de WhatsApp rotos. */}
      <input type="hidden" name="clave" value={clavePais} />

      <label className="flex flex-col gap-2">
        <span className="text-bone/50 text-[11px] font-medium tracking-[0.16em]">
          TU NOMBRE
        </span>
        <input
          name="nombre"
          placeholder="Nombre y apellido"
          autoComplete="name"
          autoCapitalize="words"
          className={clases}
          required
        />
        {campo("nombre") ? (
          <span className="text-clay text-[12px]">{campo("nombre")}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-bone/50 text-[11px] font-medium tracking-[0.16em]">
          TU TELÉFONO
        </span>
        <div className="border-bone/15 bg-bone/5 rounded-field focus-within:border-gold flex items-stretch overflow-hidden border transition-colors focus-within:shadow-[0_0_0_3px_rgba(198,161,91,0.18)]">
          <span className="border-bone/12 text-bone/50 flex items-center border-r px-4 text-[16px]">
            +{clavePais}
          </span>
          <input
            name="telefono"
            type="tel"
            inputMode="numeric"
            placeholder="5512 3456"
            autoComplete="tel-national"
            className="text-bone placeholder:text-bone/30 min-w-0 flex-1 bg-transparent px-4 py-4 text-[16px] outline-none"
            required
          />
        </div>
        {campo("telefono") ? (
          <span className="text-clay text-[12px]">{campo("telefono")}</span>
        ) : (
          <span className="text-bone/35 text-[12px]">
            Ahí te llegará tu vale por WhatsApp.
          </span>
        )}
      </label>

      {/* Lo que acredita la venta. Obligatorio: sin esto el vale no queda a
          nombre de nadie. El punto de venta no se pregunta —sale del QR. */}
      <label className="flex flex-col gap-2">
        <span className="text-bone/50 text-[11px] font-medium tracking-[0.16em]">
          ¿QUIÉN TE ATENDIÓ?
        </span>
        {/*
          `invalid:` mantiene el rótulo apagado mientras no se elige nada: la
          opción vacía está deshabilitada y el campo es obligatorio, así que
          el select nace inválido y se ve como un marcador de posición y no
          como una respuesta ya dada.

          La flecha es un SVG encima, no una imagen de fondo: el valor
          arbitrario de Tailwind que usa el selector del panel lleva espacios
          literales, así que el navegador parte la clase y no llega a
          aplicarse. Sin flecha, el campo parecía de escritura.
        */}
        <div className="relative">
          <select
            name="asesora"
            defaultValue=""
            className={`${clases} invalid:text-bone/30 cursor-pointer appearance-none pr-11`}
            required
          >
            <option value="" disabled>
              Elige a tu asesora
            </option>
            {asesoras.map((a) => (
              <option key={a.id} value={a.id} className="text-ink">
                {a.nombre}
              </option>
            ))}
          </select>
          <svg
            className="text-bone/50 pointer-events-none absolute top-1/2 right-4 -translate-y-1/2"
            width={12}
            height={8}
            viewBox="0 0 10 6"
            fill="none"
            aria-hidden
          >
            <path
              d="M1 1l4 4 4-4"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {campo("asesora") ? (
          <span className="text-clay text-[12px]">{campo("asesora")}</span>
        ) : (
          <span className="text-bone/35 text-[12px]">
            Así le acreditamos tu visita a {tienda}.
          </span>
        )}
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-bone/50 text-[11px] font-medium tracking-[0.16em]">
          CORREO (OPCIONAL)
        </span>
        <input
          name="correo"
          type="email"
          placeholder="tucorreo@ejemplo.com"
          autoComplete="email"
          className={clases}
        />
        {campo("correo") ? (
          <span className="text-clay text-[12px]">{campo("correo")}</span>
        ) : null}
      </label>

      {estado?.error && !estado.campos ? (
        <p
          role="alert"
          className="border-clay/30 bg-clay/10 text-clay rounded-field m-0 border px-4 py-3 text-[13px] leading-relaxed"
        >
          {estado.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enviando}
        className="bg-gold text-ink rounded-field tracking-action mt-2 cursor-pointer px-6 py-[17px] text-[12px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {enviando ? "GENERANDO TU VALE…" : "OBTENER MI DESCUENTO"}
      </button>

      <p className="text-bone/30 m-0 text-center text-[11px] leading-relaxed">
        Al registrarte aceptas que ARIGA Joyería use tus datos para
        contactarte sobre este vale y sus promociones.
      </p>
    </form>
  );
}
