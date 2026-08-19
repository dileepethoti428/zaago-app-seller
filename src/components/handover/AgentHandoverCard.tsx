import { useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Package,
  Phone,
  Check,
  Undo2,
  Loader2,
  User,
  Users,
} from 'lucide-react';
import type { HandoverAgent } from '@/hooks/useSubscriptionHandover';
import type { HandoverConfirmation } from '@/hooks/useHandoverConfirmation';
import { cn } from '@/lib/utils';


function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface AgentHandoverCardProps {
  agent: HandoverAgent;
  confirmation: HandoverConfirmation | undefined;
  onConfirmClick: () => void;
  onUndoClick: () => void;
  isConfirming: boolean;
  isUndoing: boolean;
}

export function AgentHandoverCard({
  agent,
  confirmation,
  onConfirmClick,
  onUndoClick,
  isConfirming,
  isUndoing,
}: AgentHandoverCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const isConfirmed = !!confirmation;

  const toggleProduct = (productId: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };


  return (
    <div
      className={cn(
        'rounded-lg border transition-colors',
        isConfirmed && 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20'
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div
            className={cn(
              'flex items-center justify-between p-3 cursor-pointer transition-colors',
              'hover:bg-muted/50 rounded-t-lg',
              !isOpen && 'rounded-b-lg'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={agent.agentProfileImage || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {getInitials(agent.agentName)}
                  </AvatarFallback>
                </Avatar>
                {isConfirmed && (
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{agent.agentName}</span>
                </div>
                {agent.agentPhone && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{agent.agentPhone}</span>
                  </div>
                )}
                {isConfirmed && confirmation && (
                  <div className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                    Handed over at {format(confirmation.confirmedAt, 'h:mm a')}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {agent.totalOrders} {agent.totalOrders === 1 ? 'order' : 'orders'}
              </Badge>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            <div className="ml-4 space-y-2">
              {agent.products.map((product) => (
                <div
                  key={product.productId}
                  className="rounded-md bg-muted/30 border border-border/50 overflow-hidden"
                >
                  <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-3">
                      {product.productImage ? (
                        <img
                          src={product.productImage}
                          alt={product.productName}
                          className="h-8 w-8 rounded object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="text-sm font-medium">
                        {product.productName}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono">
                      {product.totalQuantity} {product.productUnit}
                    </Badge>
                  </div>
                  {/* Customer breakdown */}
                  {product.customers && product.customers.length > 0 && (
                    <div className="px-2 pb-2 pt-0">
                      <div className="ml-11 space-y-0.5">
                        {product.customers.map((customer, idx) => (
                          <div
                            key={`${customer.customerName}-${idx}`}
                            className="flex items-center justify-between text-xs text-muted-foreground"
                          >
                            <div className="flex items-center gap-1.5">
                              <User className="h-3 w-3" />
                              <span>{customer.customerName}</span>
                            </div>
                            <span className="font-mono">
                              {customer.quantity} {product.productUnit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Action button */}
            <div className="ml-4 pt-2">
              {isConfirmed ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUndoClick();
                  }}
                  disabled={isUndoing}
                  className="w-full text-muted-foreground"
                >
                  {isUndoing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Undoing...
                    </>
                  ) : (
                    <>
                      <Undo2 className="mr-2 h-4 w-4" />
                      Undo Confirmation
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfirmClick();
                  }}
                  disabled={isConfirming}
                  className="w-full"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Confirm Handover
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
