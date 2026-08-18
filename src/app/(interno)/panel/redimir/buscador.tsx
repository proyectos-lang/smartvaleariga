"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Keyboard } from "lucide-react";

import { Boton } from "@/components/ui/boton";
import { EscanerQR } from "@/components/vales/escaner-qr";
import { extraerCodigo } from "@/lib/codigo-vale";

/**
 * Entrada al módulo de redención: cámara o teclado.
 *
 * En caja lo normal es escanear, pero un QR arrugado o una pantalla rota no
 * pueden dejar a la vendedora sin poder cobrar: por eso el campo manual
 * siempre está a la vista, no escondido tras un enlace.
 */
export function BuscadorVale() {
  const router = useRouter();
  const [modo, setModo] = useState<"camara" | "manual">("camara");
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ir = useCallback(
    (codigo: string) => {
      router.push(`/panel/redimir/${codigo}`);
    },
    [router],
  );

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const codigo = extraerCodigo(texto);
    if (!codigo) {
      // El ejemplo era solo el formato del bloque, que ya es el menos
      // frecuente: casi todos los vales llevan prefijo de vendedora o de
      // tienda. Enseñar los dos evita que parezca que el suyo está mal.
      setError(
        "Ese código no tiene el formato de un vale. Debe ser como AR-A4-V002-00005 o AR-A2-000125.",
      );
      return;
    }
    setError(null);
    ir(codigo);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border-ink/10 flex gap-1 self-start rounded-full border p-1">
        {(
          [
            ["camara", "Escanear", Camera],
            ["manual", "Escribir código", Keyboard],
          ] as const
        ).map(([valor, etiqueta, Icono]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setModo(valor)}
            className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-[12px] font-medium transition-colors ${
              modo === valor ? "bg-ink text-gold-light" : "text-ink/55 hover:text-ink"
            }`}
          >
            <Icono size={15} />
            {etiqueta}
          </button>
        ))}
      </div>

      {modo === "camara" ? (
        <EscanerQR onDetectado={ir} activo={modo === "camara"} />
      ) : null}

      <form onSubmit={enviar} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="AR-A4-V002-00005"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="border-ink/14 bg-paper text-ink rounded-field focus:border-gold min-w-0 flex-1 border px-4 py-[13px] font-mono text-[15px] tracking-[0.1em] transition-colors outline-none focus:shadow-[0_0_0_3px_rgba(198,161,91,0.16)]"
          />
          <Boton type="submit" className="shrink-0 px-5">
            VALIDAR
          </Boton>
        </div>
        {error ? (
          <span role="alert" className="text-clay text-[11.5px]">
            {error}
          </span>
        ) : null}
      </form>
    </div>
  );
}
