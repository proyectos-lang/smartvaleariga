"use client";

import { useState, type ReactNode } from "react";

import { BarraLateral, type UsuarioSesion } from "@/components/layout/barra-lateral";
import { Encabezado } from "@/components/layout/encabezado";
import { ModalNuevoVale } from "@/components/vales/modal-nuevo-vale";
import { cerrarSesion } from "@/lib/acciones/auth";

/**
 * Armazón del panel: sidebar fijo + cabecera pegajosa + contenido.
 * Concentra el estado de UI compartido (el diálogo de nuevo vale) para que
 * las páginas puedan seguir siendo Server Components.
 */
export function Shell({
  usuario,
  contadores,
  children,
}: {
  usuario: UsuarioSesion;
  contadores?: Record<string, number>;
  children: ReactNode;
}) {
  const [valeAbierto, setValeAbierto] = useState(false);

  return (
    <div className="bg-ink flex min-h-screen">
      <BarraLateral
        usuario={usuario}
        contadores={contadores}
        onNuevoVale={() => setValeAbierto(true)}
        onSalir={() => void cerrarSesion()}
      />

      <main className="bg-bone text-ink flex min-w-0 flex-1 flex-col">
        <Encabezado onEmitirVale={() => setValeAbierto(true)} />
        <div className="flex flex-col gap-[26px] px-[38px] pt-[30px] pb-[46px]">
          {children}
        </div>
      </main>

      <ModalNuevoVale
        abierto={valeAbierto}
        onCerrar={() => setValeAbierto(false)}
        folioSugerido="AR-2452"
      />
    </div>
  );
}
