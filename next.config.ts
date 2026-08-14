import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * La raíz del proyecto es esta carpeta. Sin esto Turbopack sube por el
   * árbol buscando lockfiles y encuentra los del directorio del usuario.
   */
  turbopack: {
    root: path.join(__dirname),
  },

  /**
   * Se carga como módulo nativo de Node en el servidor en lugar de pasar por
   * el bundler: depende de APIs de Node que no deben empaquetarse.
   * (`sharp` no hace falta aquí: Next lo resuelve solo para optimizar
   * imágenes, y esta aplicación no lo importa de forma directa.)
   */
  serverExternalPackages: ["@react-pdf/renderer"],

  images: {
    // Dominios permitidos para <Image>. Al usar Supabase Storage, agregar aquí
    // el host del proyecto: <ref>.supabase.co
    remotePatterns: [],
  },
};

export default nextConfig;
