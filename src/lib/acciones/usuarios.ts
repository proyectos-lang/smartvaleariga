"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requerirAdmin } from "@/lib/auth/guardas";
import {
  generarContrasena,
  hashearContrasena,
  revisarFortaleza,
} from "@/lib/auth/contrasena";
import {
  esIdentificadorValido,
  MENSAJE_IDENTIFICADOR,
  normalizarIdentificador,
} from "@/lib/auth/identificador";
import { revocarSesionesDe } from "@/lib/auth/sesion";
import { db } from "@/lib/supabase/server";

/** Alta y mantenimiento de cuentas. Solo administradores. */

const EsquemaUsuario = z.object({
  nombre: z.string().trim().min(3, "Escribe el nombre completo.").max(120),
  correo: z
    .string()
    .transform(normalizarIdentificador)
    .refine(esIdentificadorValido, MENSAJE_IDENTIFICADOR),
  telefono: z
    .string()
    .trim()
    .max(40)
    .transform((v) => (v === "" ? null : v)),
  rol: z.enum(["admin", "vendedora"]),
  tiendaId: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || Number.isInteger(v), "Tienda inválida."),
  clave: z.string(),
  asignarRango: z.string().optional(),
});

export type EstadoUsuario = {
  error?: string;
  campos?: Record<string, string>;
  /** Se muestra una sola vez: no queda guardada en ningún sitio en claro. */
  credencial?: { nombre: string; correo: string; clave: string };
} | null;

export async function crearUsuario(
  _previo: EstadoUsuario,
  formData: FormData,
): Promise<EstadoUsuario> {
  const sesion = await requerirAdmin();

  const r = EsquemaUsuario.safeParse({
    nombre: formData.get("nombre") ?? "",
    correo: formData.get("correo") ?? "",
    telefono: formData.get("telefono") ?? "",
    rol: formData.get("rol") ?? "vendedora",
    tiendaId: formData.get("tiendaId") ?? "",
    clave: String(formData.get("clave") ?? ""),
    asignarRango: String(formData.get("asignarRango") ?? ""),
  });

  if (!r.success) {
    const campos: Record<string, string> = {};
    for (const i of r.error.issues) {
      const c = String(i.path[0] ?? "");
      if (c && !campos[c]) campos[c] = i.message;
    }
    return { error: r.error.issues[0]?.message ?? "Revisa los datos.", campos };
  }

  const d = r.data;
  const generada = d.clave.trim() === "";
  const clave = generada ? generarContrasena() : d.clave.trim();

  if (!generada) {
    const problema = revisarFortaleza(clave);
    if (problema) return { error: problema, campos: { clave: problema } };
  }

  const { data: creado, error } = await db()
    .from("usuarios")
    .insert({
      nombre: d.nombre,
      correo: d.correo,
      telefono: d.telefono,
      rol: d.rol,
      tienda_id: d.tiendaId,
      contrasena_hash: await hashearContrasena(clave),
    })
    .select("id, nombre, correo")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        error: `Ya existe una cuenta con el acceso "${d.correo}".`,
        campos: { correo: "Acceso ocupado" },
      };
    }
    return { error: `No se pudo crear la cuenta: ${error.message}` };
  }

  // Una vendedora sin rango no puede emitir nada, así que por defecto se le
  // asigna el siguiente bloque libre al darla de alta.
  if (d.asignarRango === "on" && d.rol === "vendedora") {
    const { error: errorRango } = await db().rpc("fn_asignar_rango", {
      p_usuario_id: creado.id,
      p_asignado_por: sesion.usuarioId,
      p_tamano: null,
      p_nota: "Asignado al crear la cuenta",
    });

    if (errorRango) {
      revalidatePath("/panel/vendedoras");
      return {
        error: `La cuenta se creó, pero no se le pudo asignar el bloque: ${errorRango.message}`,
        credencial: { ...creado, clave },
      };
    }
  }

  revalidatePath("/panel/vendedoras");
  revalidatePath("/panel/rangos");

  return { credencial: { nombre: creado.nombre, correo: creado.correo, clave } };
}

/**
 * Activa o desactiva una cuenta. Al desactivarla se revocan sus sesiones:
 * de lo contrario seguiría dentro hasta que caducara la cookie.
 */
export async function alternarUsuario(formData: FormData) {
  const sesion = await requerirAdmin();

  const id = Number(formData.get("id"));
  const activo = formData.get("activo") === "true";
  if (!Number.isInteger(id) || id <= 0) return;

  // Desactivarse a uno mismo dejaría el panel sin acceso.
  if (id === sesion.usuarioId) return;

  await db().from("usuarios").update({ activo: !activo }).eq("id", id);
  if (activo) await revocarSesionesDe(id);

  revalidatePath("/panel/vendedoras");
}

export type EstadoClave = {
  error?: string;
  credencial?: { nombre: string; correo: string; clave: string };
} | null;

/**
 * Restablece la contraseña y devuelve la nueva una sola vez.
 * No hay correo de recuperación: el administrador se la entrega en persona.
 */
export async function restablecerClave(
  _previo: EstadoClave,
  formData: FormData,
): Promise<EstadoClave> {
  await requerirAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { error: "Cuenta inválida." };

  const clave = generarContrasena();

  const { data, error } = await db()
    .from("usuarios")
    .update({ contrasena_hash: await hashearContrasena(clave) })
    .eq("id", id)
    .select("nombre, correo")
    .single();

  if (error || !data) {
    return { error: `No se pudo restablecer la contraseña: ${error?.message}` };
  }

  // Las sesiones abiertas con la clave anterior dejan de valer.
  await revocarSesionesDe(id);

  revalidatePath("/panel/vendedoras");
  return { credencial: { nombre: data.nombre, correo: data.correo, clave } };
}
