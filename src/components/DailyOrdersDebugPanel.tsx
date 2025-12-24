import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { getCurrentISTTime, getTomorrowDateIST } from '@/utils/timeZone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Bug } from 'lucide-react';

interface DailyOrdersDebugPanelProps {
  selectedLocationId: number | null;
}

interface GroupedCount {
  assigned_agent_id: string;
  count: number;
}

export function DailyOrdersDebugPanel({ selectedLocationId }: DailyOrdersDebugPanelProps) {
  const todayIST = getCurrentISTTime();
  const tomorrowIST = getTomorrowDateIST();
  const todayStr = format(todayIST, 'yyyy-MM-dd');
  const tomorrowStr = format(tomorrowIST, 'yyyy-MM-dd');

  // Query TODAY's orders directly - no caching
  const { 
    data: todayData, 
    isLoading: todayLoading, 
    refetch: refetchToday,
    dataUpdatedAt: todayUpdatedAt 
  } = useQuery({
    queryKey: ['debug-daily-orders-today', selectedLocationId, todayStr],
    queryFn: async () => {
      if (!selectedLocationId) return { rawRows: [], groupedCounts: [] };

      const { data, error } = await supabase
        .from('daily_orders')
        .select('assigned_agent_id')
        .eq('date', todayStr)
        .eq('location_id', selectedLocationId)
        .not('assigned_agent_id', 'is', null);

      if (error) throw error;

      // Group by assigned_agent_id
      const counts: Record<string, number> = {};
      (data || []).forEach(row => {
        if (row.assigned_agent_id) {
          counts[row.assigned_agent_id] = (counts[row.assigned_agent_id] || 0) + 1;
        }
      });

      const groupedCounts: GroupedCount[] = Object.entries(counts).map(([id, count]) => ({
        assigned_agent_id: id,
        count,
      }));

      return { rawRows: data || [], groupedCounts };
    },
    enabled: !!selectedLocationId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Query TOMORROW's orders directly - no caching
  const { 
    data: tomorrowData, 
    isLoading: tomorrowLoading, 
    refetch: refetchTomorrow,
    dataUpdatedAt: tomorrowUpdatedAt 
  } = useQuery({
    queryKey: ['debug-daily-orders-tomorrow', selectedLocationId, tomorrowStr],
    queryFn: async () => {
      if (!selectedLocationId) return { rawRows: [], groupedCounts: [] };

      const { data, error } = await supabase
        .from('daily_orders')
        .select('assigned_agent_id')
        .eq('date', tomorrowStr)
        .eq('location_id', selectedLocationId)
        .not('assigned_agent_id', 'is', null);

      if (error) throw error;

      // Group by assigned_agent_id
      const counts: Record<string, number> = {};
      (data || []).forEach(row => {
        if (row.assigned_agent_id) {
          counts[row.assigned_agent_id] = (counts[row.assigned_agent_id] || 0) + 1;
        }
      });

      const groupedCounts: GroupedCount[] = Object.entries(counts).map(([id, count]) => ({
        assigned_agent_id: id,
        count,
      }));

      return { rawRows: data || [], groupedCounts };
    },
    enabled: !!selectedLocationId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const handleRefetch = () => {
    refetchToday();
    refetchTomorrow();
  };

  const totalToday = todayData?.rawRows.length || 0;
  const totalTomorrow = tomorrowData?.rawRows.length || 0;

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-yellow-600">
            <Bug className="h-4 w-4" />
            DEBUG: Daily Orders Raw Query
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefetch}
            disabled={todayLoading || tomorrowLoading}
            className="h-7 text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${(todayLoading || tomorrowLoading) ? 'animate-spin' : ''}`} />
            Refetch
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        {/* Query Parameters */}
        <div className="p-2 bg-muted rounded-md">
          <p className="font-semibold mb-1">Query Parameters:</p>
          <pre className="text-xs overflow-auto">
{JSON.stringify({ 
  selectedLocationId, 
  todayStr, 
  tomorrowStr,
  filter: "assigned_agent_id IS NOT NULL"
}, null, 2)}
          </pre>
        </div>

        {/* TODAY's Results */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-500">TODAY ({todayStr})</Badge>
            <span className="text-muted-foreground">
              Total rows: <strong>{totalToday}</strong>
            </span>
            {todayUpdatedAt && (
              <span className="text-muted-foreground ml-auto">
                Last fetched: {new Date(todayUpdatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
          {todayLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <div className="p-2 bg-muted rounded-md">
              <p className="font-semibold mb-1">Grouped Counts (agent_id → count):</p>
              <pre className="text-xs overflow-auto max-h-32">
{JSON.stringify(todayData?.groupedCounts || [], null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* TOMORROW's Results */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-orange-500/10 text-orange-500">TOMORROW ({tomorrowStr})</Badge>
            <span className="text-muted-foreground">
              Total rows: <strong>{totalTomorrow}</strong>
            </span>
            {tomorrowUpdatedAt && (
              <span className="text-muted-foreground ml-auto">
                Last fetched: {new Date(tomorrowUpdatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
          {tomorrowLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <div className="p-2 bg-muted rounded-md">
              <p className="font-semibold mb-1">Grouped Counts (agent_id → count):</p>
              <pre className="text-xs overflow-auto max-h-32">
{JSON.stringify(tomorrowData?.groupedCounts || [], null, 2)}
              </pre>
            </div>
          )}
        </div>

        <p className="text-muted-foreground italic">
          Compare these counts with SQL: SELECT assigned_agent_id, COUNT(*) FROM daily_orders WHERE date = '{todayStr}' AND location_id = {selectedLocationId} GROUP BY assigned_agent_id;
        </p>
      </CardContent>
    </Card>
  );
}
