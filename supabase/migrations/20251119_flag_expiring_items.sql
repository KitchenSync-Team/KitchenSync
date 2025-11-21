CREATE OR REPLACE FUNCTION public.flag_soon_expiring_inventory()
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO public.alerts (
    kitchen_id,
    inventory_unit_id,
    type,
    alert_date
  )
  SELECT
    inv.kitchen_id,
    inv.id AS inventory_unit_id,
    'expiring_soon'::text AS type,
    inv.expires_at AS alert_date
  FROM public.inventory AS inv
  WHERE
    inv.expires_at IS NOT NULL
    AND inv.expires_at > current_date
    AND inv.expires_at <= current_date + 3
    AND NOT EXISTS (
      SELECT 1
      FROM public.alerts a
      WHERE
        a.inventory_unit_id = inv.id
        AND a.type = 'expiring_soon'
        AND a.alert_date = inv.expires_at
    );
$$;
