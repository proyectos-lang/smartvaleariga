"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { iniciarSesion, type EstadoAuth } from "@/lib/acciones/auth";

export function FormularioAcceso() {
  const parametros = useSearchParams();
  const redireccion = parametros.get("redirect") ?? "/panel";

  const [estado, accion, enviando] = useActionState<EstadoAuth, FormData>(
    iniciarSesion,
    null,
  );

  return (
    <form
      action={accion}
      className="animate-rise flex w-full max-w-[378px] flex-col gap-[30px]"
    >
      <input type="hidden" name="redirect" value={redireccion} />

      <div className="flex flex-col gap-2">
        <span className="text-gold-dark tracking-eyebrow text-[10px] leading-none font-medium">
          ACCESO INTERNO
        </span>
        <h1 className="font-display m-0 text-[34px] leading-[1.15] font-normal">
          Iniciar sesión
        </h1>
      </div>

      <div className="flex flex-col gap-[18px]">
        <Campo
          etiqueta="CORREO"
          name="correo"
          type="email"
          autoComplete="email"
          placeholder="nombre@ariga.com"
          required
        />
        <Campo
          etiqueta="CONTRASEÑA"
          name="contrasena"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className="tracking-[0.14em]"
          required
        />

        {estado?.error ? (
          <p
            role="alert"
            className="border-clay/25 bg-clay/6 text-clay rounded-field m-0 border px-3 py-[10px] text-[12px] leading-relaxed"
          >
            {estado.error}
          </p>
        ) : null}
      </div>

      <Boton type="submit" tamano="lg" disabled={enviando}>
        {enviando ? "VERIFICANDO…" : "ENTRAR AL PANEL"}
      </Boton>

      <p className="text-ink/38 m-0 text-[11px] leading-[1.6]">
        Uso exclusivo del personal de ARIGA Joyería. Cada vale emitido queda
        registrado con tu nombre. Si olvidaste tu contraseña, el administrador
        la restablece.
      </p>
    </form>
  );
}
