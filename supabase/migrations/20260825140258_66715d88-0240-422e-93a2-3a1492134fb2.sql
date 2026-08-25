CREATE OR REPLACE FUNCTION public.get_seller_stats_for_range(seller_uuid uuid, start_ts timestamptz, end_ts timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  WITH filtered_orders AS (
    SELECT
      o.id,
      o.status,
      o.created_at,
      o.subscription_id,
      COALESCE(
        (
          SELECT SUM(
            COALESCE((item->>'quantity')::numeric, 0) *
            COALESCE((item->>'price')::numeric, 0) *
            (1 - COALESCE(
              NULLIF(item->>'discount_percentage', '')::numeric,
              p.discount_percentage,
              0
            ) / 100)
          )
          FROM jsonb_array_elements(COALESCE(o.items::jsonb, '[]'::jsonb)) AS item
          LEFT JOIN public.products p
            ON (item->>'id') ~* '^[0-9a-f-]{36}$'
           AND p.id = (item->>'id')::uuid
        ),
        0
      ) AS item_revenue
    FROM public.orders o
    WHERE o.seller_id = seller_uuid
      AND o.created_at >= start_ts
      AND o.created_at < end_ts
  ),
  subscription_stats AS (
    SELECT COUNT(*) AS active_subscriptions
    FROM public.subscriptions sub
    JOIN public.products p ON p.id = sub.product_id
    WHERE p.seller_id = seller_uuid
      AND (sub.status = 'active' OR COALESCE(sub.is_active, false) = true)
  )
  SELECT jsonb_build_object(
    'total_products', COALESCE((SELECT COUNT(*) FROM public.products p WHERE p.seller_id = seller_uuid), 0),
    'products_added', COALESCE((SELECT COUNT(*) FROM public.products p WHERE p.seller_id = seller_uuid AND p.created_at >= start_ts AND p.created_at < end_ts), 0),
    'active_orders', COALESCE((SELECT COUNT(*) FROM filtered_orders WHERE status IN ('placed', 'confirmed', 'out_for_delivery')), 0),
    'delivered_count', COALESCE((SELECT COUNT(*) FROM filtered_orders WHERE status = 'delivered'), 0),
    'regular_revenue', COALESCE((SELECT SUM(item_revenue) FROM filtered_orders WHERE subscription_id IS NULL AND status = 'delivered'), 0),
    'subscription_revenue', COALESCE((SELECT SUM(item_revenue) FROM filtered_orders WHERE subscription_id IS NOT NULL AND status = 'delivered'), 0),
    'total_revenue', COALESCE((SELECT SUM(item_revenue) FROM filtered_orders WHERE status = 'delivered'), 0),
    'active_subscriptions', COALESCE((SELECT active_subscriptions FROM subscription_stats), 0),
    'pending_revenue', COALESCE((SELECT SUM(item_revenue) FROM filtered_orders WHERE subscription_id IS NULL AND status IN ('placed', 'confirmed', 'out_for_delivery')), 0),
    'pending_subscription_revenue', COALESCE((SELECT SUM(item_revenue) FROM filtered_orders WHERE subscription_id IS NOT NULL AND status IN ('placed', 'confirmed', 'out_for_delivery')), 0),
    'projected_daily_subscription', COALESCE((
      SELECT SUM(item_revenue) / GREATEST(COUNT(DISTINCT (created_at AT TIME ZONE 'Asia/Kolkata')::date), 1)
      FROM filtered_orders
      WHERE subscription_id IS NOT NULL AND status = 'delivered'
    ), 0)
  ) INTO result;

  RETURN result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_seller_stats_for_range(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_seller_stats_for_range(uuid, timestamptz, timestamptz) TO service_role;