import { useTodayCompensations } from '@/hooks/useTodayCompensations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, ArrowRight, User } from 'lucide-react';

export const TodayCompensationBanner = () => {
  const { data: compensations, isLoading } = useTodayCompensations();

  if (isLoading || !compensations || compensations.length === 0) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Gift className="w-5 h-5 text-amber-500" />
          Today's Compensation Handovers
          <Badge variant="secondary" className="ml-auto">{compensations.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {compensations.map((comp) => (
          <div
            key={comp.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {comp.product_name} x{comp.quantity}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Customer: {comp.customer_name}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-1.5 shrink-0">
              <User className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-medium text-primary">{comp.agent_name}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
