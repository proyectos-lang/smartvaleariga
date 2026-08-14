"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Boton } from "@/components/ui/boton";
import { Campo, Selector } from "@/components/ui/campo";
import { crearUsuario, type EstadoUsuario } from "@/lib/acciones/usuarios";

/**
 * Alta de cuentas.
 *
 * La contraseña se muestra una sola vez, aquí mismo: no hay correo de
 * recuperación y en la base solo queda su derivado scrypt, así que si no se
 * copia en este momento no hay forma de recuperarla —solo restablecerla.
 */
export function FormularioUsuario({
  tiendas,
}: {
  tiendas: { id: number; nombre: string }[];
}) {
  const formulario = useRef<HTMLFormElement>(null);
  const [estado, accion, enviando] = useActionState<EstadoUsuario, FormData>(
    crearUsuario,
    null,
  );
  const [rol, setRol] = useState("vendedora");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (estado?.credencial) formulario.current?.reset();
  }, [estado]);

  const campo = (n: string) => estado?.campos?.[n];

  async function copiar(texto: string) {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  if (estado?.credencial) {
    const { nombre, correo, clave } = estado.credencial;
    return (
      <div className="flex flex-col gap-4">
        <div className="border-gold/35 bg-gold/8 rounded-card flex flex-col gap-3 border p-5">
          <span className="text-gold-deep flex items-center gap-2 text-[13px] font-medium">
            <Check size={16} />
            Cuenta creada para {nombre}
          </span>

          <dl className="m-0 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <dt className="text-ink/40 text-[9px] font-medium tracking-[0.18em]">
                ACCESO
              </dt>
              <dd className="text-ink m-0 font-mono text-[14px]">{correo}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-ink/40 text-[9px] font-medium tracking-[0.18em]">
                CONTRASEÑA
              </dt>
              <dd className="m-0 flex items-center gap-2">
                <span className="text-ink font-mono text-[16px] tracking-[0.08em]">
                  {clave}
                </span>
                <button
                  type="button"
                  onClick={() => copiar(`${correo} / ${clave}`)}
                  className="text-ink/45 hover:text-gold-dark cursor-pointer transition-colors"
                  aria-label="Copiar acceso y contraseña"
                >
                  {copiado ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </dd>
            </div>
          </dl>

          <p className="text-ink/55 m-0 text-[11.5px] leading-relaxed">
            Cópiala ahora: no se vuelve a mostrar. Si se pierde, hay que
            restablecerla desde la lista.
          </p>
        </div>

        {estado.error ? (
          <p className="border-clay/25 bg-clay/6 text-clay rounded-field m-0 border px-3 py-[10px] text-[12px]">
            {estado.error}
          </p>
        ) : null}

        <Boton
          variante="contorno"
          onClick={() => window.location.reload()}
          className="py-[14px]"
        >
          CREAR OTRA CUENTA
        </Boton>
      </div>
    );
  }

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-4">
      <Campo
        etiqueta="NOMBRE COMPLETO"
        name="nombre"
        placeholder="Nombre y apellidos"
        error={campo("nombre")}
        required
      />

      <Campo
        etiqueta="ACCESO"
        name="correo"
        placeholder="mariana o mariana@ariga.com"
        autoCapitalize="none"
        spellCheck={false}
        error={campo("correo")}
        required
      />

      <Selector
        etiqueta="ROL"
        name="rol"
        value={rol}
        onChange={(e) => setRol(e.target.value)}
        ayuda={
          rol === "admin"
            ? "Ve toda la operación y administra cuentas, rangos y configuración."
            : "Emite vales de su propio bloque y registra redenciones."
        }
      >
        <option value="vendedora">Vendedora</option>
        <option value="admin">Administrador</option>
      </Selector>

      <Selector etiqueta="TIENDA (OPCIONAL)" name="tiendaId" defaultValue="">
        <option value="">Sin tienda asignada</option>
        {tiendas.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nombre}
          </option>
        ))}
      </Selector>

      <Campo
        etiqueta="TELÉFONO (OPCIONAL)"
        name="telefono"
        placeholder="81 1234 5678"
      />

      <Campo
        etiqueta="CONTRASEÑA (OPCIONAL)"
        name="clave"
        type="text"
        autoComplete="off"
        placeholder="Se genera una si lo dejas vacío"
        error={campo("clave")}
      />

      {rol === "vendedora" ? (
        <label className="text-ink/65 flex cursor-pointer items-start gap-[10px] text-[12.5px] leading-relaxed">
          <input
            type="checkbox"
            name="asignarRango"
            defaultChecked
            className="accent-gold mt-[2px] size-[14px] cursor-pointer"
          />
          <span>
            Asignarle el siguiente bloque de correlativos.
            <span className="text-ink/40 block text-[11.5px]">
              Sin bloque no puede emitir vales.
            </span>
          </span>
        </label>
      ) : null}

      {estado?.error ? (
        <p
          role="alert"
          className="border-clay/25 bg-clay/6 text-clay rounded-field m-0 border px-3 py-[10px] text-[12px] leading-relaxed"
        >
          {estado.error}
        </p>
      ) : null}

      <Boton type="submit" disabled={enviando} className="py-[14px]">
        {enviando ? "CREANDO…" : "CREAR CUENTA"}
      </Boton>
    </form>
  );
}
