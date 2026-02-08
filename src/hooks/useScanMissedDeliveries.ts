import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export interface ScanResult {
  success: boolean;
  date_range: string;
  orders_found: number;
  daily_orders_found: number;
  stale_pending_found: number;
  compensations_created: number;
  errors?: string[];
}

export const useScanMissedDeliveries = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const scan = async (daysBack = 30) => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to scan for missed deliveries',
        variant: 'destructive',
      });
      return;
    }

    setIsScanning(true);
    setScanResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('scan-missed-deliveries', {
        body: {
          seller_id: user.id,
          days_back: daysBack,
        },
      });

      if (error) throw error;

      const result = data as ScanResult;
      setScanResult(result);

      // Invalidate vacation data queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['all-vacation-data'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-compensations'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-dates-status'] });

      const totalFound = result.orders_found + result.daily_orders_found + result.stale_pending_found;

      toast({
        title: 'Scan Complete',
        description: `Found ${totalFound} undelivered orders. Created ${result.compensations_created} new compensations.`,
      });
    } catch (err: any) {
      console.error('Scan error:', err);
      toast({
        title: 'Scan Failed',
        description: err.message || 'Failed to scan for missed deliveries',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  return {
    scan,
    isScanning,
    scanResult,
    clearResult: () => setScanResult(null),
  };
};
