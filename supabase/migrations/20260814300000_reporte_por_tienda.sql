-- ═══════════════════════════════════════════════════════════════════════════
-- Reporte por tienda: bruta, comisión y neta
-- ═══════════════════════════════════════════════════════════════════════════
--
-- El tablero de ventas enseña una sola cifra por tienda —`monto_compra`—, que
-- es el precio de lista: el descuento del vale se calcula sobre ella
-- (`fn_registrar_redencion` hace `monto_oro * pct_oro + monto_plata *
-- pct_plata`). Lo que de verdad entró en caja nunca se había mostrado.
--
-- Este reporte lo abre en tres columnas:
--
--   bruta    = sum(monto_compra)        el precio de lista de lo vendido
--   comision = sum(descuento_aplicado)  lo que la clienta dejó de pagar
--   neta     = bruta - comision         lo que entró en caja
--
-- La resta es legítima y no descuenta dos veces: `monto_compra` NO tiene el
-- descuento aplicado. Se comprobó contra los datos —359 de 400 redenciones
-- tienen un `descuento_aplicado` exactamente igual a la tarifa por material
-- sobre `monto_compra`; el resto son descuentos editados a mano, que la
-- función admite a propósito.
--
-- Se extiende la función que ya existe en vez de crear una paralela: el día
-- que cambie el filtrado de fechas, tiene que cambiar en un solo sitio.
-- ═══════════════════════════════════════════════════════════════════════════

-- En una transacción: entre el `drop` y el `create` la función no existe, y la
-- pestaña Ventas ya la usa. Si algo fallara a medio camino sin esto, el
-- tablero quedaría roto en producción hasta que alguien lo notara.
begin;

-- Cambia el tipo de retorno, así que hay que soltarla antes: Postgres no deja
-- redefinir las columnas de salida de una función con `create or replace`.
drop function if exists smartvale.fn_ventas_por_tienda(date, date, bigint, bigint);

create or replace function smartvale.fn_ventas_por_tienda(
  p_desde      date default null,
  p_hasta      date default null,
  p_tienda_id  bigint default null,
  p_usuario_id bigint default null
)
returns table (
  tienda_id       bigint,
  tienda          text,
  tickets         integer,
  venta           numeric,
  ticket_promedio numeric,
  comision        numeric,
  neta            numeric,
  clientes        integer
)
language sql
stable
set search_path = ''
as $$
  select
    v.tienda_id,
    v.tienda,
    count(*)::integer,
    coalesce(sum(v.monto_compra), 0)        as venta,
    round(coalesce(sum(v.monto_compra), 0) / nullif(count(*), 0), 2),
    coalesce(sum(v.descuento_aplicado), 0)  as comision,
    coalesce(sum(v.monto_compra), 0)
      - coalesce(sum(v.descuento_aplicado), 0) as neta,
    count(distinct v.contacto_id)::integer
  from smartvale.vw_ventas v
  where (p_desde      is null or v.dia >= p_desde)
    and (p_hasta      is null or v.dia <= p_hasta)
    and (p_tienda_id  is null or v.tienda_id = p_tienda_id)
    and (p_usuario_id is null or v.usuario_id = p_usuario_id)
  group by v.tienda_id, v.tienda
  -- Por venta bruta: es la columna por la que se compara una tienda con otra.
  order by 4 desc;
$$;

comment on function smartvale.fn_ventas_por_tienda(date, date, bigint, bigint) is
  'Venta por punto de venta: bruta (precio de lista), comisión (descuento '
  'otorgado) y neta (lo que entró en caja), en el rango de días dado.';

commit;
