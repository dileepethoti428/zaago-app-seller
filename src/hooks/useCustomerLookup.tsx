import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrderInfo {
  tracking_id: string;
  order_id: string;
  status: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  delivery_date: string;
  delivery_time_slot: string;
  special_instructions: string;
  items: any;
}

interface CustomerInfo {
  name: string;
  phone: string;
  delivery_address: any;
}

interface SellerInfo {
  name: string;
  phone: string;
  email: string;
  pickup_address: string;
  pickup_location: any;
}

interface AgentInfo {
  name: string | null;
  phone: string | null;
  email: string | null;
  is_online: boolean | null;
  assigned: boolean;
}

export interface LookupResult {
  order_info: OrderInfo;
  customer_info: CustomerInfo;
  seller_info: SellerInfo;
  agent_info: AgentInfo;
}

export const useCustomerLookup = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookupOrder = async (trackingId: string) => {
    if (!trackingId.trim()) {
      toast.error('Please enter a tracking ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('lookup_order_by_tracking_id', {
        tracking_id_input: trackingId.trim(),
      });

      if (rpcError) {
        throw rpcError;
      }

      // Type guard to check if data is an error object
      if (data && typeof data === 'object' && 'error' in data) {
        const errorMsg = (data as any).error;
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      setResult(data as unknown as LookupResult);
      toast.success('Order details retrieved successfully');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to lookup order';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return {
    loading,
    result,
    error,
    lookupOrder,
    reset,
  };
};
