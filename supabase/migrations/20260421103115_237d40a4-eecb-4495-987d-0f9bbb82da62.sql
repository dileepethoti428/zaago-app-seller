
-- Add cancellation tracking columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS requires_partner_return boolean NOT NULL DEFAULT false;

-- Function: seller cancels an order after acceptance (up to and including out_for_delivery)
CREATE OR REPLACE FUNCTION public.cancel_accepted_order(
  p_order_id uuid,
  p_seller_user_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_item record;
  v_is_late boolean := false;
  v_now timestamptz := now();
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cancellation reason is required');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.seller_id IS DISTINCT FROM p_seller_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to cancel this order');
  END IF;

  IF v_order.status NOT IN ('accepted', 'packed', 'assigned', 'out_for_delivery') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order cannot be cancelled in its current status: ' || v_order.status
    );
  END IF;

  v_is_late := v_order.status IN ('assigned', 'out_for_delivery');

  -- Update order
  UPDATE public.orders
  SET
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_by = p_seller_user_id,
    cancelled_at = v_now,
    requires_partner_return = v_is_late,
    updated_at = v_now
  WHERE id = p_order_id;

  -- Restore stock for each order item (best-effort; ignore if products lack stock tracking)
  BEGIN
    FOR v_item IN
      SELECT product_id, quantity FROM public.order_items WHERE order_id = p_order_id
    LOOP
      UPDATE public.products
      SET stock_quantity = COALESCE(stock_quantity, 0) + v_item.quantity,
          updated_at = v_now
      WHERE id = v_item.product_id;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    -- swallow stock restore errors so cancellation still succeeds
    NULL;
  END;

  -- Audit log
  BEGIN
    INSERT INTO public.order_visibility_logs (
      order_id, event_type, status_before, status_after, metadata
    ) VALUES (
      p_order_id,
      CASE WHEN v_is_late THEN 'late_cancellation' ELSE 'cancelled_by_seller' END,
      v_order.status,
      'cancelled',
      jsonb_build_object(
        'reason', p_reason,
        'cancelled_by', p_seller_user_id,
        'is_late', v_is_late,
        'assigned_agent_id', v_order.assigned_agent_id
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Late-stage notifications
  IF v_is_late THEN
    BEGIN
      INSERT INTO public.admin_notifications (title, message, type, metadata)
      VALUES (
        'Late Order Cancellation',
        'Order ' || p_order_id || ' was cancelled by seller after handover. Reason: ' || p_reason,
        'late_cancellation',
        jsonb_build_object(
          'order_id', p_order_id,
          'previous_status', v_order.status,
          'reason', p_reason,
          'assigned_agent_id', v_order.assigned_agent_id,
          'cancelled_at', v_now
        )
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    IF v_order.assigned_agent_id IS NOT NULL THEN
      BEGIN
        INSERT INTO public.agent_notifications (
          agent_id, title, message, type, source_type, source_id, metadata
        ) VALUES (
          v_order.assigned_agent_id,
          'Order Cancelled — Please Return',
          'Order cancelled by seller. Please return the parcel. Reason: ' || p_reason,
          'order_cancelled',
          'order',
          p_order_id,
          jsonb_build_object('reason', p_reason, 'requires_return', true)
        );
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Order cancelled successfully',
    'is_late', v_is_late,
    'requires_partner_return', v_is_late
  );
END;
$$;
