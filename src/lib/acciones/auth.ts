"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const Credenciales = z.object({
  email: z.string().trim().pipe(z.email("Escribe un correo válido.")),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  redirect: z.string().optional(),
});

export type EstadoAuth = { error?: string } | null;

export async function iniciarSesion(
  _estadoPrevio: EstadoAuth,
  formData: FormData,
): Promise<EstadoAuth> {
  const analisis = Credenciales.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirect: formData.get("redirect") ?? undefined,
  });

  if (!analisis.success) {
    return { error: analisis.error.issues[0]?.message ?? "Datos inválidos." };
  }

  if (!hasSupabaseEnv()) {
    return {
      error:
        "Supabase todavía no está configurado. Copia .env.example a .env.local y agrega las credenciales del proyecto.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: analisis.data.email,
    password: analisis.data.password,
  });

  if (error) {
    return {
      error:
        error.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos."
          : error.message,
    };
  }

  const destino = analisis.data.redirect?.startsWith("/")
    ? analisis.data.redirect
    : "/panel";

  revalidatePath("/", "layout");
  redirect(destino);
}

export async function cerrarSesion() {
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
