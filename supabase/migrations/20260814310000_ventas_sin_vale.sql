-- ═══════════════════════════════════════════════════════════════════════════
-- Ventas sin vale
-- ═══════════════════════════════════════════════════════════════════════════
--
-- La venta de mostrador, la que no trae vale. No tiene nada que ver con la
-- campaña: sin vale, sin contacto, sin descuento y sin trazabilidad hacia un
-- referido. Va en su propia tabla y no como una redención con `vale_id` nulo,
-- porque media aplicación da por sentado que toda redención tiene vale —la
-- vista de detalle, la cadena de referidos, el directorio de contactos— y
-- aflojar esa garantía las rompería todas a la vez.
--
-- Lo que sí comparte con las redenciones es la forma del dinero: monto total
-- con el reparto en oro y plata, para que las dos vías se puedan sumar por
-- material sin traducir nada.
--
-- Con esto, el reporte por tienda enseña cuatro totales:
--
--   bruta con vales   precio de lista de lo vendido con vale
--   comisión          el descuento que otorgaron los vales
--   neta con vales    bruta − comisión, lo que entró en caja por esa vía
--   venta normal      lo vendido sin vale
--   GRAN TOTAL        neta con vales + venta normal, el dinero real del día
--
-- ORDEN: esta migración redefine `fn_ventas_por_tienda`, que la anterior
-- (20260814300000) ya había ampliado. Las dos son idempotentes y aplicarlas
-- en orden funciona —esta sobrescribe a aquella—. Si la 300000 quedó sin
-- correr, se puede aplicar solo esta: el resultado es el mismo.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ═══ Tabla ═══════════════════════════════════════════════════════════════

create table if not exists smartvale.ventas_normales (
  id             bigint generated always as identity primary key,
  usuario_id     bigint not null references smartvale.usuarios (id),
  tienda_id      bigint not null references smartvale.tiendas (id),

  monto          numeric(12, 2) not null check (monto > 0),
  -- El reparto por material, igual que en las redenciones. Lo que no sea oro
  -- ni plata se deduce restando: `monto - monto_oro - monto_plata`.
  monto_oro      numeric(12, 2) not null default 0 check (monto_oro >= 0),
  monto_plata    numeric(12, 2) not null default 0 check (monto_plata >= 0),

  ticket         text,
  nota           text,

  -- Quién corrigió y cuándo, igual que en redenciones: una cifra que alguien
  -- editó a mano tiene que poder distinguirse de la que se capturó en caja.
  editada_por    bigint references smartvale.usuarios (id),
  fecha_edicion  timestamptz,

  fecha_creacion timestamptz not null default now(),

  -- El reparto no puede superar el total. Sin esto, un dedazo en oro deja una
  -- tienda con más venta en metales que venta a secas y nadie lo nota.
  constraint ventas_normales_materiales_coherentes
    check (monto_oro + monto_plata <= monto)
);

create index if not exists ventas_normales_tienda_idx
  on smartvale.ventas_normales (tienda_id, fecha_creacion desc);
create index if not exists ventas_normales_usuario_idx
  on smartvale.ventas_normales (usuario_id, fecha_creacion desc);

-- Por día local, como en redenciones: el reporte agrupa por el día de
-- Guatemala, no por el de UTC.
create index if not exists ventas_normales_dia_local_idx
  on smartvale.ventas_normales
     (((fecha_creacion at time zone 'America/Guatemala')::date));

comment on table smartvale.ventas_normales is
  'Venta de mostrador, sin vale ni descuento. Anónima: no crea contacto.';

alter table smartvale.ventas_normales enable row level security;

-- ═══ Vista ═══════════════════════════════════════════════════════════════
-- El gemelo de `vw_ventas`, con el día ya traído a Guatemala.

create or replace view smartvale.vw_ventas_normales as
select
  n.id,
  n.tienda_id,
  n.usuario_id,
  n.monto,
  n.monto_oro,
  n.monto_plata,
  n.ticket,
  n.nota,
  n.fecha_creacion,
  n.editada_por,
  n.fecha_edicion,

  (n.fecha_creacion at time zone 'America/Guatemala')::date as dia,

  t.nombre as tienda,
  u.nombre as vendedora,
  e.nombre as editada_por_nombre
from smartvale.ventas_normales n
join smartvale.tiendas  t on t.id = n.tienda_id
join smartvale.usuarios u on u.id = n.usuario_id
-- `left`: casi ninguna está editada, y un `join` a secas las borraría todas.
left join smartvale.usuarios e on e.id = n.editada_por;

comment on view smartvale.vw_ventas_normales is
  'Una fila por venta sin vale, con su día en horario de Guatemala.';

-- ═══ Registrar ═══════════════════════════════════════════════════════════

create or replace function smartvale.fn_registrar_venta_normal(
  p_usuario_id bigint,
  p_tienda_id  bigint,
  p_monto      numeric,
  p_oro        numeric default 0,
  p_plata      numeric default 0,
  p_ticket     text    default null,
  p_nota       text    default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_oro   numeric := coalesce(p_oro, 0);
  v_plata numeric := coalesce(p_plata, 0);
  v_id    bigint;
begin
  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto de la venta tiene que ser mayor que cero.'
      using errcode = 'SV006';
  end if;

  if v_oro < 0 or v_plata < 0 then
    raise exception 'Los montos por material no pueden ser negativos.'
      using errcode = 'SV006';
  end if;

  if v_oro + v_plata > p_monto then
    raise exception 'El oro y la plata suman más que el total de la venta.'
      using errcode = 'SV006';
  end if;

  if not exists (
    select 1 from smartvale.tiendas where id = p_tienda_id and activo
  ) then
    raise exception 'Esa tienda no existe o está inactiva.'
      using errcode = 'SV007';
  end if;

  insert into smartvale.ventas_normales (
    usuario_id, tienda_id, monto, monto_oro, monto_plata, ticket, nota
  )
  values (
    p_usuario_id, p_tienda_id, p_monto, v_oro, v_plata,
    nullif(btrim(p_ticket), ''), nullif(btrim(p_nota), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function smartvale.fn_registrar_venta_normal is
  'Registra una venta de mostrador. Valida que el reparto por material no '
  'supere el total.';

-- ═══ Editar y eliminar ═══════════════════════════════════════════════════
-- Solo administradores, igual que en redenciones.

create or replace function smartvale.fn_editar_venta_normal(
  p_id         bigint,
  p_usuario_id bigint,
  p_tienda_id  bigint,
  p_monto      numeric,
  p_oro        numeric default 0,
  p_plata      numeric default 0,
  p_ticket     text    default null,
  p_nota       text    default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_oro   numeric := coalesce(p_oro, 0);
  v_plata numeric := coalesce(p_plata, 0);
begin
  if not smartvale.fn_es_admin(p_usuario_id) then
    raise exception 'Solo un administrador puede editar una venta.'
      using errcode = 'SV012';
  end if;

  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto de la venta tiene que ser mayor que cero.'
      using errcode = 'SV006';
  end if;

  if v_oro + v_plata > p_monto then
    raise exception 'El oro y la plata suman más que el total de la venta.'
      using errcode = 'SV006';
  end if;

  update smartvale.ventas_normales
     set tienda_id     = coalesce(p_tienda_id, tienda_id),
         monto         = p_monto,
         monto_oro     = v_oro,
         monto_plata   = v_plata,
         ticket        = nullif(btrim(p_ticket), ''),
         nota          = nullif(btrim(p_nota), ''),
         editada_por   = p_usuario_id,
         fecha_edicion = now()
   where id = p_id;

  if not found then
    raise exception 'Esa venta no existe.' using errcode = 'SV014';
  end if;
end;
$$;

create or replace function smartvale.fn_eliminar_venta_normal(
  p_id         bigint,
  p_usuario_id bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not smartvale.fn_es_admin(p_usuario_id) then
    raise exception 'Solo un administrador puede eliminar una venta.'
      using errcode = 'SV012';
  end if;

  delete from smartvale.ventas_normales where id = p_id;

  if not found then
    raise exception 'Esa venta no existe.' using errcode = 'SV014';
  end if;
end;
$$;

-- ═══ Reporte por tienda, con los cuatro totales ══════════════════════════
--
-- Cambia el tipo de retorno, así que hay que soltarla antes. Va en la misma
-- transacción que todo lo demás: entre el `drop` y el `create` la función no
-- existe, y el tablero de ventas ya la usa.

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
  clientes        integer,
  ventas_normales integer,
  venta_normal    numeric,
  gran_total      numeric
)
language sql
stable
set search_path = ''
as $$
  -- Las dos vías se agregan por separado y se cruzan por tienda con un `full
  -- join`: una tienda puede tener venta normal sin ninguna redención, o al
  -- revés, y con un `join` a secas desaparecería del reporte.
  with vales as (
    select
      v.tienda_id,
      v.tienda,
      count(*)::integer                       as tickets,
      coalesce(sum(v.monto_compra), 0)        as bruta,
      coalesce(sum(v.descuento_aplicado), 0)  as comision,
      count(distinct v.contacto_id)::integer  as clientes
    from smartvale.vw_ventas v
    where (p_desde      is null or v.dia >= p_desde)
      and (p_hasta      is null or v.dia <= p_hasta)
      and (p_tienda_id  is null or v.tienda_id = p_tienda_id)
      and (p_usuario_id is null or v.usuario_id = p_usuario_id)
    group by v.tienda_id, v.tienda
  ),
  normales as (
    select
      n.tienda_id,
      n.tienda,
      count(*)::integer            as ventas,
      coalesce(sum(n.monto), 0)    as monto
    from smartvale.vw_ventas_normales n
    where (p_desde      is null or n.dia >= p_desde)
      and (p_hasta      is null or n.dia <= p_hasta)
      and (p_tienda_id  is null or n.tienda_id = p_tienda_id)
      and (p_usuario_id is null or n.usuario_id = p_usuario_id)
    group by n.tienda_id, n.tienda
  )
  select
    coalesce(v.tienda_id, n.tienda_id),
    coalesce(v.tienda,    n.tienda),
    coalesce(v.tickets, 0),
    coalesce(v.bruta, 0),
    round(coalesce(v.bruta, 0) / nullif(v.tickets, 0), 2),
    coalesce(v.comision, 0),
    coalesce(v.bruta, 0) - coalesce(v.comision, 0)   as neta,
    coalesce(v.clientes, 0),
    coalesce(n.ventas, 0),
    coalesce(n.monto, 0),
    -- El gran total es dinero real: lo que entró en caja por las dos vías.
    -- Por eso lleva la NETA de los vales y no la bruta, que incluye lo que
    -- la clienta nunca llegó a pagar.
    (coalesce(v.bruta, 0) - coalesce(v.comision, 0)) + coalesce(n.monto, 0)
      as gran_total
  from vales v
  full join normales n on n.tienda_id = v.tienda_id
  order by 11 desc;
$$;

comment on function smartvale.fn_ventas_por_tienda(date, date, bigint, bigint) is
  'Venta por punto de venta por las dos vías: con vale (bruta, comisión y '
  'neta) y sin vale, más el gran total, que es la neta con vales más la '
  'venta normal.';

-- ═══ Resumen de ventas normales, para el tablero ═════════════════════════

create or replace function smartvale.fn_ventas_normales_resumen(
  p_desde      date default null,
  p_hasta      date default null,
  p_tienda_id  bigint default null,
  p_usuario_id bigint default null
)
returns table (
  ventas       integer,
  monto        numeric,
  monto_oro    numeric,
  monto_plata  numeric,
  monto_otros  numeric,
  promedio     numeric
)
language sql
stable
set search_path = ''
as $$
  select
    count(*)::integer,
    coalesce(sum(n.monto), 0),
    coalesce(sum(n.monto_oro), 0),
    coalesce(sum(n.monto_plata), 0),
    coalesce(sum(n.monto - n.monto_oro - n.monto_plata), 0),
    round(coalesce(sum(n.monto), 0) / nullif(count(*), 0), 2)
  from smartvale.vw_ventas_normales n
  where (p_desde      is null or n.dia >= p_desde)
    and (p_hasta      is null or n.dia <= p_hasta)
    and (p_tienda_id  is null or n.tienda_id = p_tienda_id)
    and (p_usuario_id is null or n.usuario_id = p_usuario_id);
$$;

commit;
