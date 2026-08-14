import type { RolUsuario } from "@/lib/supabase/types";

/**
 * Estructura del menú. Es la única fuente de verdad: el sidebar, la barra
 * inferior móvil y el título de la cabecera se derivan de aquí.
 */

export type ItemNav = {
  nombre: string;
  href: string;
  /** Título de la cabecera si difiere del nombre del menú. */
  titulo?: string;
  /** Nombre del icono de lucide-react usado en la barra inferior móvil. */
  icono?: "inicio" | "emitir" | "redimir" | "vales" | "redenciones";
  /** Aparece en la barra inferior del móvil. */
  destacado?: boolean;
};

export type GrupoNav = {
  etiqueta: string;
  soloAdmin?: boolean;
  plegadoPorDefecto?: boolean;
  items: ItemNav[];
};

export const NAVEGACION: GrupoNav[] = [
  {
    etiqueta: "OPERACIÓN",
    items: [
      {
        nombre: "Inicio",
        href: "/panel",
        titulo: "Resumen del día",
        icono: "inicio",
        destacado: true,
      },
      {
        nombre: "Emitir vale",
        href: "/panel/emitir",
        icono: "emitir",
        destacado: true,
      },
      {
        nombre: "Redimir",
        href: "/panel/redimir",
        titulo: "Redimir vale",
        icono: "redimir",
        destacado: true,
      },
      { nombre: "Vales", href: "/panel/vales", icono: "vales", destacado: true },
      {
        nombre: "Redenciones",
        href: "/panel/redenciones",
        icono: "redenciones",
      },
    ],
  },
  {
    etiqueta: "ADMINISTRACIÓN",
    soloAdmin: true,
    items: [
      { nombre: "Vendedoras", href: "/panel/vendedoras" },
      { nombre: "Rangos", href: "/panel/rangos", titulo: "Rangos correlativos" },
      { nombre: "Tiendas", href: "/panel/tiendas", titulo: "Puntos de venta" },
      {
        nombre: "Configuración",
        href: "/panel/configuracion",
        titulo: "Configuración de vales",
      },
      {
        nombre: "Inteligencia comercial",
        href: "/panel/reportes",
        titulo: "Inteligencia comercial",
      },
    ],
  },
];

/** El menú que corresponde a un rol. */
export function navegacionDe(rol: RolUsuario): GrupoNav[] {
  return NAVEGACION.filter((g) => !g.soloAdmin || rol === "admin");
}

/** Accesos rápidos de la barra inferior en móvil. */
export function accesosMoviles(rol: RolUsuario): ItemNav[] {
  return navegacionDe(rol)
    .flatMap((g) => g.items)
    .filter((i) => i.destacado);
}

/** Item activo para una ruta. Prefiere la coincidencia más específica. */
export function itemActivo(pathname: string): ItemNav | undefined {
  return NAVEGACION.flatMap((g) => g.items)
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

/** Migaja y título de la cabecera para una ruta. */
export function encabezadoDeRuta(pathname: string) {
  const item = itemActivo(pathname);
  return {
    migaja: `SMART VALE / ${(item?.nombre ?? "Panel").toUpperCase()}`,
    titulo: item?.titulo ?? item?.nombre ?? "Panel",
  };
}

/** ¿Esta ruta es exclusiva del administrador? */
export function rutaEsDeAdmin(pathname: string) {
  return NAVEGACION.filter((g) => g.soloAdmin)
    .flatMap((g) => g.items)
    .some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
}
