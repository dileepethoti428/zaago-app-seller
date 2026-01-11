import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CalendarOff, 
  Calendar, 
  User, 
  Package, 
  Truck, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  MapPin,
  Star,
  Circle
} from 'lucide-react';
import { useAllVacationData } from '@/hooks/useAllVacationData';
import { format, parseISO } from 'date-fns';

const VacationCompensations = () => {
  const { data, isLoading, error } = useAllVacationData();

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card className="border-destructive">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">Failed to load vacation data</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { vacationPeriods, compensations, summary } = data || {
    vacationPeriods: [],
    compensations: [],
    summary: {
      totalActiveVacations: 0,
      totalVacationDays: 0,
      pendingCompensations: 0,
      assignedCompensations: 0,
      deliveredCompensations: 0,
    }
  };

  const pendingCompensations = compensations.filter(c => c.status === 'pending');
  const assignedCompensations = compensations.filter(c => c.status === 'assigned');
  const deliveredCompensations = compensations.filter(c => c.status === 'delivered');

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <CalendarOff className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold">Vacation Compensations</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <CalendarOff className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Vacations</p>
                <p className="text-2xl font-bold">{summary.totalActiveVacations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{summary.pendingCompensations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-500/10">
                <Truck className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assigned</p>
                <p className="text-2xl font-bold">{summary.assignedCompensations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold">{summary.deliveredCompensations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Vacation Periods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Active Vacation Periods
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vacationPeriods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active vacation periods</p>
            </div>
          ) : (
            <div className="space-y-4">
              {vacationPeriods.map((period) => (
                <div
                  key={period.id}
                  className="p-4 border rounded-lg gap-4"
                >
                  {/* Customer Details */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-semibold">
                          {period.subscription?.customer?.full_name || 'Unknown Customer'}
                        </span>
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                          Active
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {period.subscription?.customer?.phone && (
                          <a 
                            href={`tel:${period.subscription.customer.phone}`}
                            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Phone className="h-4 w-4" />
                            <span>{period.subscription.customer.phone}</span>
                          </a>
                        )}
                        {period.subscription?.customer?.address && (
                          <div className="flex items-start gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">
                              {period.subscription.customer.address}
                              {period.subscription.customer.city && `, ${period.subscription.customer.city}`}
                              {period.subscription.customer.pincode && ` - ${period.subscription.customer.pincode}`}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm border-t pt-3 mt-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span className="font-medium">{period.subscription?.product?.name || 'Unknown Product'}</span>
                          <Badge variant="secondary" className="ml-1">
                            {period.subscription?.quantity || 1} units
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {format(parseISO(period.start_date), 'MMM d')} - {format(parseISO(period.end_date), 'MMM d, yyyy')}
                          </span>
                          <Badge variant="secondary">{period.total_days} days</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Compensations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Pending Compensation Deliveries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingCompensations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending compensations</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingCompensations.map((comp) => (
                <div
                  key={comp.id}
                  className="p-4 border rounded-lg border-orange-500/20 bg-orange-500/5"
                >
                  {/* Customer Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-semibold">
                          {comp.subscription?.customer?.full_name || 'Unknown Customer'}
                        </span>
                      </div>
                      <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                        Pending Agent
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {comp.subscription?.customer?.phone && (
                        <a 
                          href={`tel:${comp.subscription.customer.phone}`}
                          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Phone className="h-4 w-4" />
                          <span>{comp.subscription.customer.phone}</span>
                        </a>
                      )}
                      {comp.subscription?.customer?.address && (
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                          <span className="line-clamp-1">
                            {comp.subscription.customer.city || comp.subscription.customer.address}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm border-t pt-3 mt-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Package className="h-4 w-4" />
                        <span>{comp.subscription?.product?.name || 'Unknown Product'}</span>
                        <Badge variant="secondary" className="ml-1">
                          {comp.subscription?.quantity || 1} units
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-muted-foreground">Vacation:</span>
                        <Badge variant="outline">
                          {format(parseISO(comp.original_vacation_date), 'MMM d, yyyy')}
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-muted-foreground">Compensation:</span>
                        <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">
                          {format(parseISO(comp.compensation_delivery_date), 'MMM d, yyyy')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Compensations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-purple-500" />
            Assigned Compensation Deliveries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignedCompensations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No assigned compensations</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignedCompensations.map((comp) => (
                <div
                  key={comp.id}
                  className="p-4 border rounded-lg border-purple-500/20 bg-purple-500/5"
                >
                  <div className="space-y-4">
                    {/* Customer Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          <span className="font-semibold">
                            {comp.subscription?.customer?.full_name || 'Unknown Customer'}
                          </span>
                        </div>
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                          Assigned
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {comp.subscription?.customer?.phone && (
                          <a 
                            href={`tel:${comp.subscription.customer.phone}`}
                            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Phone className="h-4 w-4" />
                            <span>{comp.subscription.customer.phone}</span>
                          </a>
                        )}
                        {comp.subscription?.customer?.address && (
                          <div className="flex items-start gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                            <span className="line-clamp-1">
                              {comp.subscription.customer.city || comp.subscription.customer.address}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Agent Section */}
                    {comp.delivery_agent && (
                      <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Truck className="h-4 w-4 text-purple-500" />
                          <span className="font-medium text-sm">Assigned Agent</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{comp.delivery_agent.name}</span>
                            {comp.delivery_agent.is_online && (
                              <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                            )}
                          </div>
                          {comp.delivery_agent.phone && (
                            <a 
                              href={`tel:${comp.delivery_agent.phone}`}
                              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Phone className="h-4 w-4" />
                              <span>{comp.delivery_agent.phone}</span>
                            </a>
                          )}
                          {comp.delivery_agent.average_rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              <span>{comp.delivery_agent.average_rating.toFixed(1)}</span>
                            </div>
                          )}
                          {comp.delivery_agent.vehicle_type && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <span className="capitalize">{comp.delivery_agent.vehicle_type}</span>
                              {comp.delivery_agent.vehicle_number && (
                                <span>({comp.delivery_agent.vehicle_number})</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Delivery Info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm border-t pt-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Package className="h-4 w-4" />
                        <span>{comp.subscription?.product?.name || 'Unknown Product'}</span>
                        <Badge variant="secondary" className="ml-1">
                          {comp.subscription?.quantity || 1} units
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="secondary" className="bg-purple-500/10 text-purple-600">
                          {format(parseISO(comp.compensation_delivery_date), 'MMM d, yyyy')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivered Compensations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Completed Compensations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deliveredCompensations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No completed compensations yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deliveredCompensations.map((comp) => (
                <div
                  key={comp.id}
                  className="p-4 border rounded-lg border-green-500/20 bg-green-500/5"
                >
                  <div className="space-y-3">
                    {/* Customer Section */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-semibold">
                          {comp.subscription?.customer?.full_name || 'Unknown Customer'}
                        </span>
                      </div>
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                        Delivered
                      </Badge>
                    </div>

                    {/* Agent Info (if available) */}
                    {comp.delivery_agent && (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-green-500" />
                          <span className="font-medium">{comp.delivery_agent.name}</span>
                        </div>
                        {comp.delivery_agent.average_rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span>{comp.delivery_agent.average_rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Delivery Info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm border-t pt-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Package className="h-4 w-4" />
                        <span>{comp.subscription?.product?.name || 'Unknown Product'}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-muted-foreground">Delivered:</span>
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                          {format(parseISO(comp.compensation_delivery_date), 'MMM d, yyyy')}
                        </Badge>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">For vacation:</span>
                        <span>{format(parseISO(comp.original_vacation_date), 'MMM d')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default VacationCompensations;
