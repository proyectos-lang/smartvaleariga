"use server";

import { revalidatePath } from "next/cache";

import { requerirAdmin } from "@/lib/auth/guardas";
import { db } from "@/lib/supabase/server";

/**
 * Panel de configuración de vales.
 *
 * Cambiar un porcentaje afecta solo a los vales que se emitan a partir de
 * ese momento: el descuento queda congelado en cada vale al generarlo, así
 * que lo ya entregado a un cliente no se altera nunca.
 */

export type EstadoConfig = {
  error?: string;
  ok?: string;
  campos?: Record<string, string>;
} | null;

/** Límites por clave. Evita guardar un 900% de descuento por un dedazo. */
const LIMITES: Record<string, { min: number; max: number; etiqueta: string }> = {
  descuento_oro: { min: 0, max: 100, etiqueta: "Descuento en oro" },
  descuento_plata: { min: 0, max: 100, etiqueta: "Descuento en plata" },
  dias_vigencia_vale: { min: 1, max: 3650, etiqueta: "Días de vigencia" },
  vales_por_rango: { min: 1, max: 10000, etiqueta: "Vales por bloque" },
};

export async function guardarConfiguracion(
  _previo: EstadoConfig,
  formData: FormData,
): Promise<EstadoConfig> {
  await requerirAdmin();

  const campos: Record<string, string> = {};
  const cambios: { clave: string; valor: string }[] = [];

  for (const [clave, limite] of Object.entries(LIMITES)) {
    const crudo = formData.get(clave);
    if (crudo === null) continue;

    const texto = String(crudo).trim().replace(",", ".");
    const numero = Number(texto);

    if (texto === "" || Number.isNaN(numero)) {
      campos[clave] = `${limite.etiqueta}: escribe un número.`;
      continue;
    }
    if (numero < limite.min || numero > limite.max) {
      campos[clave] = `Debe estar entre ${limite.min} y ${limite.max}.`;
      continue;
    }

    cambios.push({ clave, valor: String(numero) });
  }

  if (Object.keys(campos).length) {
    return { error: Object.values(campos)[0], campos };
  }

  // Se actualiza clave por clave en lugar de con un upsert masivo: así una
  // clave desconocida no puede colarse en la tabla.
  for (const { clave, valor } of cambios) {
    const { error } = await db()
      .from("configuracion")
      .update({ valor })
      .eq("clave", clave);

    if (error) {
      return { error: `No se pudo guardar ${clave}: ${error.message}` };
    }
  }

  revalidatePath("/panel/configuracion");
  revalidatePath("/panel/emitir");

  return { ok: "Configuración guardada." };
}
