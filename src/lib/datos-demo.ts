import type { EstadoVale } from "@/components/ui/chip-estado";

/**
 * DATOS DE MUESTRA — provisionales.
 *
 * Reproducen las cifras del mockup para poder ver la interfaz completa antes
 * de que exista el esquema. Al conectar Supabase, este archivo se borra y las
 * páginas consultan la base de datos.
 */

export type ValeDemo = {
  folio: string;
  cliente: string;
  pieza: string;
  monto: number;
  vence: string;
  estado: EstadoVale;
};

export const VALES_DEMO: ValeDemo[] = [
  {
    folio: "AR-2451",
    cliente: "Regina Fuentes",
    pieza: "Anillo oro 14k · solitario",
    monto: 12400,
    vence: "2026-09-12",
    estado: "activo",
  },
  {
    folio: "AR-2450",
    cliente: "Jorge Medina",
    pieza: "Cadena plata 925",
    monto: 3150,
    vence: "2026-09-09",
    estado: "activo",
  },
  {
    folio: "AR-2449",
    cliente: "Luisa Ontiveros",
    pieza: "Arracadas oro 18k",
    monto: 6780,
    vence: "2026-09-02",
    estado: "canjeado",
  },
  {
    folio: "AR-2448",
    cliente: "Familia Rangel",
    pieza: "Juego de argollas",
    monto: 21900,
    vence: "2026-08-28",
    estado: "activo",
  },
  {
    folio: "AR-2447",
    cliente: "Ana Cristina Vega",
    pieza: "Pulsera tejido italiano",
    monto: 4320,
    vence: "2026-08-14",
    estado: "vencido",
  },
  {
    folio: "AR-2446",
    cliente: "Emilio Cárdenas",
    pieza: "Dije diamante 0.25ct",
    monto: 18050,
    vence: "2026-08-11",
    estado: "canjeado",
  },
];

export const INDICADORES_DEMO = [
  { etiqueta: "VALES ACTIVOS", valor: "24", nota: "+3 esta semana" },
  { etiqueta: "MONTO EN VALES", valor: "$186.4k", nota: "62% ya abonado" },
  { etiqueta: "CLIENTES NUEVOS", valor: "11", nota: "Agosto 2026" },
  { etiqueta: "POR VENCER", valor: "4", nota: "En los próximos 7 días" },
];

export const CLIENTES_DEMO = [
  { nombre: "Regina Fuentes", detalle: "81 2244 1190 · Centro", cuando: "Hoy" },
  { nombre: "Jorge Medina", detalle: "81 1902 3378 · Cumbres", cuando: "Ayer" },
  {
    nombre: "Ana Cristina Vega",
    detalle: "81 3311 4402 · Centro",
    cuando: "2 días",
  },
];

export const VALE_EN_CURSO_DEMO = {
  folio: "AR-2451",
  pieza: "Anillo oro 14k",
  total: 12400,
  abonado: 7700,
  pagosHechos: 3,
  pagosTotales: 5,
};
