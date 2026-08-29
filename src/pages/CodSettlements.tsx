import { useState, useEffect } from 'react';
import { Search, DollarSign, CheckCircle, Clock, IndianRupee } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCodSettlements, type TimePeriod, type StatusFilter, type AgentSettlement } from '@/hooks/useCodSettlements';
import { Skeleton } from '@/components/ui/skeleton';
import AgentCodDetailDialog from '@/components/AgentCodDetailDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const periodOptions: { value: TimePeriod; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: '1week', label: '1 Week' },
  { value: '1month', label: '1 Month' },
  { value: '6months', label: '6 Months' },
];

export default function CodSettlements() {
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<TimePeriod>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedAgent, setSelectedAgent] = useState<AgentSettlement | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);
  const [confirmSettleAgent, setConfirmSettleAgent] = useState<AgentSettlement | null>(null);

  const { data: agents, isLoading, settle, isSettling } = useCodSettlements(period, statusFilter, search);

  useEffect(() => {
    setVisibleCount(5);
  }, [period, statusFilter, search]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <IndianRupee className="h-6 w-6 text-primary" />
          COD Settlements
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track and confirm cash collected by delivery partners
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search delivery partner..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="settled">Settled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Period chips */}
        <div className="flex gap-2 flex-wrap">
          {periodOptions.map(opt => (
            <Button
              key={opt.value}
              variant={period === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(opt.value)}
              className="rounded-full"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : !agents || agents.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No COD settlements found</p>
              <p className="text-sm mt-1">Settlements are auto-created when COD orders are delivered</p>
            </CardContent>
          </Card>
        ) : (
          <>
          {agents.slice(0, visibleCount).map(agent => (
            <Card
              key={agent.agent_id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedAgent(agent)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={agent.profile_image || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {agent.agent_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground truncate">{agent.agent_name}</p>
                      {agent.pending_count > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {agent.pending_count} pending
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {agent.total_count} deliveries
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        {agent.settled_count} settled
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="font-bold text-lg text-foreground">₹{agent.total_amount.toFixed(0)}</p>
                    {agent.pending_count > 0 && (
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); settle(agent.agent_id); }}
                        disabled={isSettling}
                        className="rounded-full"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Settle All
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* View More / View Less */}
          {agents.length > visibleCount && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setVisibleCount(prev => prev + 5)}
              >
                View More ({agents.length - visibleCount} remaining)
              </Button>
            </div>
          )}
          {visibleCount > 5 && agents.length <= visibleCount && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <Button variant="outline" onClick={() => setVisibleCount(5)}>
                View Less
              </Button>
            </div>
          )}
          </>
        )}
      </div>

      <AgentCodDetailDialog
        open={!!selectedAgent}
        onOpenChange={(open) => { if (!open) setSelectedAgent(null); }}
        agentId={selectedAgent?.agent_id || null}
        agentName={selectedAgent?.agent_name || ''}
        profileImage={selectedAgent?.profile_image || null}
        phone={selectedAgent?.phone || null}
        vehicleType={selectedAgent?.vehicle_type || null}
        vehicleNumber={selectedAgent?.vehicle_number || null}
        isOnline={selectedAgent?.is_online || false}
        joinedAt={selectedAgent?.joined_at || null}
        totalDeliveries={selectedAgent?.total_deliveries}
        period={period}
        statusFilter={statusFilter}
      />
    </div>
  );
}
