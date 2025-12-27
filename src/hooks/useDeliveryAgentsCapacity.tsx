import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getCurrentISTTime, getTomorrowDateIST } from '@/utils/timeZone';
import { useAuth } from '@/context/AuthContext';

export interface AgentWithCapacity {
  id: string;
  agent_id: string;
  name: string;
  location_id: number | null;
  max_capacity: number;
  orders_tomorrow: number;
  orders_today: number;
  available_slots: number;
  is_online: boolean;
  is_active?: boolean;
  distance_km?: number;
  // Extended fields
  email?: string | null;
  phone?: string | null;
  vehicle_type?: string | null;
  vehicle_number?: string | null;
  total_deliveries?: number | null;
  average_rating?: number | null;
  performance_score?: number | null;
  verification_status?: string | null;
  profile_image?: string | null;
  created_at?: string | null;
  last_delivery_at?: string | null;
  last_status_change?: string | null;
}

interface NearbyAgent {
  id: string;
  agent_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  max_capacity: number;
  is_online: boolean;
  is_active: boolean;
  latitude: number;
  longitude: number;
  distance_km: number;
  vehicle_type: string | null;
  vehicle_number: string | null;
  total_deliveries: number | null;
  average_rating: number | null;
  performance_score: number | null;
  verification_status: string | null;
  profile_image: string | null;
  created_at: string | null;
  last_delivery_at: string | null;
  last_status_change: string | null;
}

// Seller-specific order counts using RPC (updated to not require locationId)
export const useSellerAgentOrderCountsGPS = (
  sellerUserId: string | undefined,
  dateStr: string
) => {
  return useQuery({
    queryKey: ['seller-agent-order-counts-gps', sellerUserId, dateStr],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!sellerUserId) return {};

      // Get order counts for all agents that have orders for this seller on this date
      const { data, error } = await supabase
        .from('daily_orders')
        .select(`
          assigned_agent_id,
          subscription:subscriptions!inner(
            product:products!inner(seller_id)
          )
        `)
        .eq('date', dateStr)
        .eq('subscription.product.seller_id', sellerUserId)
        .not('assigned_agent_id', 'is', null);

      if (error) {
        console.error('Error fetching seller agent order counts:', error);
        throw error;
      }

      // Count orders per agent
      const counts: Record<string, number> = {};
      (data || []).forEach((row: { assigned_agent_id: string | null }) => {
        if (row.assigned_agent_id) {
          counts[row.assigned_agent_id] = (counts[row.assigned_agent_id] || 0) + 1;
        }
      });

      return counts;
    },
    enabled: !!sellerUserId && !!dateStr,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
};

// GPS-based agent matching - finds agents within 10km of seller
export const useDeliveryAgentsNearSeller = () => {
  const { user } = useAuth();
  
  // Compute date strings using IST
  const todayIST = getCurrentISTTime();
  const tomorrowIST = getTomorrowDateIST();
  const todayStr = format(todayIST, 'yyyy-MM-dd');
  const tomorrowStr = format(tomorrowIST, 'yyyy-MM-dd');

  // Fetch order counts for this seller
  const { data: todayCounts } = useSellerAgentOrderCountsGPS(user?.id, todayStr);
  const { data: tomorrowCounts } = useSellerAgentOrderCountsGPS(user?.id, tomorrowStr);

  // Fetch nearby agents using the new RPC (10km radius from seller)
  const { data: agents, isLoading: agentsLoading, refetch } = useQuery({
    queryKey: ['delivery-agents-near-seller', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase.rpc('get_delivery_agents_near_seller' as any, {
        p_seller_user_id: user.id,
        p_radius_km: 10
      });

      if (error) {
        console.error('Error fetching nearby agents:', error);
        throw error;
      }
      
      return (data || []) as NearbyAgent[];
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const safeTodayCounts = todayCounts ?? {};
  const safeTomorrowCounts = tomorrowCounts ?? {};

  const agentsWithCapacity: AgentWithCapacity[] | undefined = 
    agents && agents.length > 0
      ? agents.map(agent => {
          // Convert agent_id to string in case it comes as UUID from RPC
          const agentIdStr = String(agent.agent_id);
          const ordersToday = safeTodayCounts[agentIdStr] ?? 0;
          const ordersTomorrow = safeTomorrowCounts[agentIdStr] ?? 0;
          const maxCapacity = agent.max_capacity || 30;

          return {
            id: String(agent.id),
            agent_id: agentIdStr,
            name: agent.name,
            location_id: null, // Not using location_id anymore
            max_capacity: maxCapacity,
            orders_tomorrow: ordersTomorrow,
            orders_today: ordersToday,
            available_slots: maxCapacity - ordersToday,
            is_online: agent.is_online ?? true,
            is_active: agent.is_active ?? true,
            distance_km: Number(agent.distance_km),
            // Extended fields from GPS RPC
            email: agent.email,
            phone: agent.phone,
            vehicle_type: agent.vehicle_type,
            vehicle_number: agent.vehicle_number,
            total_deliveries: agent.total_deliveries,
            average_rating: agent.average_rating,
            performance_score: agent.performance_score,
            verification_status: agent.verification_status,
            profile_image: agent.profile_image,
            created_at: agent.created_at,
            last_delivery_at: agent.last_delivery_at,
            last_status_change: agent.last_status_change,
          };
        })
      : undefined;

  return {
    data: agentsWithCapacity,
    isLoading: agentsLoading,
    refetch,
  };
};

// Legacy location-based hook (kept for backwards compatibility)
export const useSellerAgentOrderCounts = (
  sellerUserId: string | undefined,
  locationId: number | null,
  dateStr: string
) => {
  return useQuery({
    queryKey: ['seller-agent-order-counts', sellerUserId, locationId, dateStr],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!sellerUserId || !locationId) return {};

      const { data, error } = await supabase.rpc('get_seller_agent_order_counts' as any, {
        p_seller_user_id: sellerUserId,
        p_date: dateStr,
        p_location_id: locationId
      });

      if (error) {
        console.error('Error fetching seller agent order counts:', error);
        throw error;
      }

      const counts: Record<string, number> = {};
      (data || []).forEach((row: { agent_id: string; order_count: number }) => {
        counts[row.agent_id] = row.order_count;
      });

      return counts;
    },
    enabled: !!sellerUserId && !!locationId && !!dateStr,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
};

// Legacy location-based hook
export const useDeliveryAgentsWithCapacity = (selectedLocationId: number | null) => {
  const { user } = useAuth();
  
  const todayIST = getCurrentISTTime();
  const tomorrowIST = getTomorrowDateIST();
  const todayStr = format(todayIST, 'yyyy-MM-dd');
  const tomorrowStr = format(tomorrowIST, 'yyyy-MM-dd');

  const { data: todayCounts } = useSellerAgentOrderCounts(
    user?.id,
    selectedLocationId,
    todayStr
  );
  const { data: tomorrowCounts } = useSellerAgentOrderCounts(
    user?.id,
    selectedLocationId,
    tomorrowStr
  );

  const { data: agents, isLoading: agentsLoading, refetch } = useQuery({
    queryKey: ['delivery-agents-list', selectedLocationId],
    queryFn: async () => {
      if (!selectedLocationId) return [];

      const { data, error } = await supabase
        .from('delivery_agents')
        .select('id, agent_id, name, location_id, max_capacity, is_online')
        .eq('location_id', selectedLocationId)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedLocationId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const safeTodayCounts = todayCounts ?? {};
  const safeTomorrowCounts = tomorrowCounts ?? {};

  const isLoading = agentsLoading;
  
  const agentsWithCapacity: AgentWithCapacity[] | undefined = 
    agents && agents.length > 0
      ? agents.map(agent => {
          const ordersToday = safeTodayCounts[agent.agent_id] ?? 0;
          const ordersTomorrow = safeTomorrowCounts[agent.agent_id] ?? 0;
          const maxCapacity = agent.max_capacity || 30;

          return {
            id: agent.id,
            agent_id: agent.agent_id,
            name: agent.name,
            location_id: agent.location_id,
            max_capacity: maxCapacity,
            orders_tomorrow: ordersTomorrow,
            orders_today: ordersToday,
            available_slots: maxCapacity - ordersToday,
            is_online: agent.is_online ?? true,
          };
        })
      : undefined;

  return {
    data: agentsWithCapacity,
    isLoading,
    refetch,
  };
};

// Hook for updating capacity - supports both location-based and GPS-based agents
export const useUpdateAgentCapacity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      agentId, 
      newCapacity, 
      isGPSAgent = false 
    }: { 
      agentId: string; 
      newCapacity: number; 
      isGPSAgent?: boolean;
    }) => {
      console.log('🔧 Updating agent capacity:', { agentId, newCapacity, isGPSAgent });
      
      if (isGPSAgent) {
        // Use the secure RPC for GPS-discovered agents
        console.log('📡 Calling seller_update_nearby_agent_capacity RPC...');
        const { data, error } = await supabase.rpc('seller_update_nearby_agent_capacity' as any, {
          p_agent_row_id: agentId,
          p_new_capacity: newCapacity,
          p_radius_km: 10
        });

        console.log('📡 RPC Response:', { data, error });

        if (error) {
          console.error('❌ RPC Error:', error);
          throw error;
        }

        // Check RPC response for errors
        const result = data as { success: boolean; error?: string; new_capacity?: number };
        console.log('📡 RPC Result:', result);
        
        if (!result.success) {
          const errorMessage = result.error || 'Failed to update capacity';
          console.error('❌ RPC returned error:', errorMessage);
          
          // Provide user-friendly error messages
          if (errorMessage.includes('Seller GPS coordinates not set')) {
            throw new Error('Please set your seller location first. Go to Settings → Location to set your GPS coordinates.');
          } else if (errorMessage.includes('Agent is no longer within')) {
            throw new Error('This agent has moved out of your 10km radius and can no longer be updated.');
          } else if (errorMessage.includes('Agent GPS coordinates not available')) {
            throw new Error('This agent does not have GPS coordinates set. They need to update their location.');
          }
          
          throw new Error(errorMessage);
        }

        console.log('✅ GPS agent capacity updated successfully');
        return result;
      } else {
        // Use direct update for location-based agents (existing RLS policy applies)
        console.log('📝 Direct update for location-based agent...');
        const { data, error } = await supabase
          .from('delivery_agents')
          .update({ max_capacity: newCapacity })
          .eq('id', agentId)
          .select('id')
          .single();

        if (error) {
          console.error('❌ Direct update error:', error);
          throw error;
        }
        if (!data) throw new Error('No rows updated - agent may not be in your location');

        console.log('✅ Location-based agent capacity updated successfully');
        return { success: true, new_capacity: newCapacity };
      }
    },
    onSuccess: () => {
      // Invalidate all related queries including GPS-based
      queryClient.invalidateQueries({ queryKey: ['delivery-agents-list'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-agents-capacity'] });
      queryClient.invalidateQueries({ queryKey: ['seller-agent-order-counts'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-agents-near-seller'] });
      queryClient.invalidateQueries({ queryKey: ['seller-agent-order-counts-gps'] });
      toast({
        title: 'Capacity Updated',
        description: 'Agent capacity has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      console.error('❌ Capacity update failed:', error.message);
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useSellerLocationId = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['seller-location-id', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('sellers')
        .select('location_id')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data?.location_id || null;
    },
    enabled: !!userId,
  });
};
