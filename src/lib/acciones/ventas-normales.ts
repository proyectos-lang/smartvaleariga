"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requerirAdmin, requerirSesion } from "@/lib/auth/guardas";
import { db } from "@/lib/supabase/server";

/**
 * Registro de la venta de mostrador, la que no trae vale.
 *
 * No hay cliente ni vale: es una cifra de caja con su reparto por material.
 * Se separa de `redenciones.ts` a propósito —comparten la forma del dinero,
 * no las reglas—: aquella valida vigencia, referidos y cadena de contactos,
 * y nada de eso aplica aquí.
 */

/** Acepta "12,400.50", "Q12400" o "12400". */
const Monto = z
  .string()
  .trim()
  .transform((v) => v.replace(/[^\d.,]/g, "").replace(/,/g, ""))
  .refine((v) => v !== "" && !Number.isNaN(Number(v)), "Escribe un monto válido.")
  .transform(Number);

/** Igual, pero un campo en blanco vale cero. */
const MontoOpcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? "0" : v))
  .pipe(Monto)
  .refine((v) => v >= 0, "El monto no puede ser negativo.");

const EsquemaVenta = z.object({
  tiendaId: z.coerce.number().int().positive("Elige la tienda de la venta."),
  monto: Monto.refine((v) => v > 0, "El monto debe ser mayor que cero."),
  montoOro: MontoOpcional,
  montoPlata: MontoOpcional,
  ticket: z
    .string()
    .trim()
    .max(40, "El número de ticket es demasiado largo.")
    .transform((v) => (v === "" ? null : v)),
});

export type EstadoVenta = {
  error?: string;
  campos?: Record<string, string>;
} | null;

function leer(formData: FormData) {
  return {
    tiendaId: formData.get("tiendaId") ?? "",
    monto: formData.get("monto") ?? "",
    montoOro: formData.get("montoOro") ?? "",
    montoPlata: formData.get("montoPlata") ?? "",
    ticket: formData.get("ticket") ?? "",
  };
}

function errores(r: z.ZodError) {
  const campos: Record<string, string> = {};
  for (const issue of r.issues) {
    const campo = String(issue.path[0] ?? "");
    if (campo && !campos[campo]) campos[campo] = issue.message;
  }
  return { error: r.issues[0]?.message ?? "Revisa los datos.", campos };
}

/**
 * El reparto puede no llegar al total —hay piezas que no son ni oro ni
 * plata—, pero pasarse sí es un error de captura. La base lo vuelve a
 * comprobar con un `check`.
 */
function repartoValido(monto: number, oro: number, plata: number): EstadoVenta {
  if (oro + plata > monto) {
    return {
      error: "Lo de oro y lo de plata suman más que el total de la venta.",
      campos: { monto: "Menor que oro + plata" },
    };
  }
  return null;
}

export async function registrarVentaNormal(
  _previo: EstadoVenta,
  formData: FormData,
): Promise<EstadoVenta> {
  const sesion = await requerirSesion();

  const r = EsquemaVenta.safeParse(leer(formData));
  if (!r.success) return errores(r.error);

  const d = r.data;
  const mal = repartoValido(d.monto, d.montoOro, d.montoPlata);
  if (mal) return mal;

  const { error } = await db().rpc("fn_registrar_venta_normal", {
    p_usuario_id: sesion.usuarioId,
    p_tienda_id: d.tiendaId,
    p_monto: d.monto,
    p_oro: d.montoOro,
    p_plata: d.montoPlata,
    p_ticket: d.ticket,
    p_nota: null,
  });

  if (error) {
    if (["SV006", "SV007"].includes(error.code)) return { error: error.message };
    return { error: `No se pudo registrar la venta: ${error.message}` };
  }

  revalidatePath("/panel");
  revalidatePath("/panel/ventas");
  revalidatePath("/panel/reportes/tiendas");
  redirect("/panel/ventas?ok=1");
}

export async function editarVentaNormal(
  _previo: EstadoVenta,
  formData: FormData,
): Promise<EstadoVenta> {
  const sesion = await requerirAdmin();

  const id = Number(formData.get("id"));
  if (!id) return { error: "No se indicó qué venta editar." };

  const r = EsquemaVenta.safeParse(leer(formData));
  if (!r.success) return errores(r.error);

  const d = r.data;
  const mal = repartoValido(d.monto, d.montoOro, d.montoPlata);
  if (mal) return mal;

  const { error } = await db().rpc("fn_editar_venta_normal", {
    p_id: id,
    p_usuario_id: sesion.usuarioId,
    p_tienda_id: d.tiendaId,
    p_monto: d.monto,
    p_oro: d.montoOro,
    p_plata: d.montoPlata,
    p_ticket: d.ticket,
    p_nota: null,
  });

  if (error) {
    if (["SV006", "SV012", "SV014"].includes(error.code)) {
      return { error: error.message };
    }
    return { error: `No se pudo editar la venta: ${error.message}` };
  }

  revalidatePath("/panel/ventas");
  revalidatePath("/panel/reportes/tiendas");
  redirect("/panel/ventas?editada=1");
}

/**
 * Borra una venta. Solo administradores, y la base lo vuelve a comprobar.
 *
 * Se llama desde dos sitios —la ficha y cada línea del historial—, así que
 * vuelve a donde estaba quien la usó en vez de a una ruta fija: borrar la
 * cuarta línea de la página 3 no debería devolver a la página 1.
 */
export async function eliminarVentaNormal(formData: FormData) {
  const sesion = await requerirAdmin();

  const id = Number(formData.get("id"));
  if (!id) return;

  const { error } = await db().rpc("fn_eliminar_venta_normal", {
    p_id: id,
    p_usuario_id: sesion.usuarioId,
  });

  revalidatePath("/panel/ventas");
  revalidatePath("/panel/reportes/tiendas");

  // El destino viaja en el formulario. Se acota a una ruta interna: si
  // llegara de fuera manipulado, `redirect` sería un salto abierto a
  // cualquier dominio.
  const crudo = String(formData.get("volverA") ?? "");
  const volverA = crudo.startsWith("/panel/ventas") ? crudo : "/panel/ventas";

  const separador = volverA.includes("?") ? "&" : "?";

  if (error) {
    // Sin `throw`: una pantalla de error para un borrado fallido pierde el
    // contexto entero. El aviso viaja en la URL y la lista sigue en pie.
    return redirect(
      `${volverA}${separador}fallo=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(`${volverA}${separador}eliminada=1`);
}
