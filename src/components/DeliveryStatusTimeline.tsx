import { format } from 'date-fns';
import { Clock, CheckCircle, Package, TruckIcon, BadgeCheck, XCircle, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineItem {
  status: string;
  timestamp: string;
  label: string;
}

interface DeliveryStatusTimelineProps {
  timeline: TimelineItem[];
  currentStatus: string;
}

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'created':
      return <Clock className="h-5 w-5" />;
    case 'confirmed':
      return <CheckCircle className="h-5 w-5" />;
    case 'ready':
    case 'preparing':
      return <Package className="h-5 w-5" />;
    case 'agent_assigned':
      return <Bell className="h-5 w-5" />;
    case 'picked':
    case 'out_for_delivery':
      return <TruckIcon className="h-5 w-5" />;
    case 'delivered':
      return <BadgeCheck className="h-5 w-5" />;
    case 'cancelled':
      return <XCircle className="h-5 w-5" />;
    default:
      return <Clock className="h-5 w-5" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'created':
    case 'pending':
      return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    case 'confirmed':
      return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    case 'ready':
    case 'preparing':
      return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
    case 'agent_assigned':
      return 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20';
    case 'picked':
    case 'out_for_delivery':
      return 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20';
    case 'delivered':
      return 'text-green-500 bg-green-500/10 border-green-500/20';
    case 'cancelled':
      return 'text-red-500 bg-red-500/10 border-red-500/20';
    default:
      return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
  }
};

export const DeliveryStatusTimeline = ({ timeline, currentStatus }: DeliveryStatusTimelineProps) => {
  // Filter out any null or invalid items
  const validTimeline = timeline.filter(item => item && item.status && item.timestamp && item.label);

  if (validTimeline.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No delivery status information available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {validTimeline.map((item, index) => {
        const isActive = item.status === currentStatus.toLowerCase().replace(/ /g, '_');
        const colorClass = getStatusColor(item.status);
        
        return (
          <div key={index} className="flex gap-4 items-start relative">
            {/* Connector line */}
            {index < validTimeline.length - 1 && (
              <div className="absolute left-[18px] top-10 w-0.5 h-8 bg-border" />
            )}
            
            {/* Icon */}
            <div
              className={cn(
                'flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all',
                colorClass,
                isActive && 'ring-2 ring-offset-2 ring-current'
              )}
            >
              {getStatusIcon(item.status)}
            </div>
            
            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <h4 className={cn(
                  'font-medium',
                  isActive && 'text-foreground font-semibold'
                )}>
                  {item.label}
                </h4>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(item.timestamp), 'MMM dd, HH:mm')}
                </span>
              </div>
              {isActive && (
                <span className="text-xs font-medium text-primary">Current Status</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
