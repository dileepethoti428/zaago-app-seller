import { motion } from 'framer-motion';
import { Tag, Calendar, Percent, Trophy, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateOfferDialog } from '@/components/CreateOfferDialog';
import { useSellerOffers, useDeleteOffer, useUpdateOffer } from '@/hooks/useSpecialOffers';
import { formatDistance } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const SpecialOffers = () => {
  const { data: offers, isLoading } = useSellerOffers();
  const deleteOffer = useDeleteOffer();
  const updateOffer = useUpdateOffer();

  const activeOffers = offers?.filter(o => {
    const now = new Date();
    const validFrom = new Date(o.valid_from);
    const validUntil = new Date(o.valid_until);
    return o.is_active && validFrom <= now && validUntil >= now;
  }) || [];

  const upcomingOffers = offers?.filter(o => {
    const now = new Date();
    const validFrom = new Date(o.valid_from);
    return o.is_active && validFrom > now;
  }) || [];

  const expiredOffers = offers?.filter(o => {
    const now = new Date();
    const validUntil = new Date(o.valid_until);
    return !o.is_active || validUntil < now;
  }) || [];

  const getStatusBadge = (offer: any) => {
    const now = new Date();
    const validFrom = new Date(offer.valid_from);
    const validUntil = new Date(offer.valid_until);

    if (!offer.is_active || validUntil < now) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (validFrom > now) {
      return <Badge variant="secondary">Upcoming</Badge>;
    }
    return <Badge className="bg-zaago-green text-white">Active</Badge>;
  };

  const toggleOfferStatus = (offerId: string, currentStatus: boolean) => {
    updateOffer.mutate({
      id: offerId,
      updates: { is_active: !currentStatus },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zaago-green"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zaago-card/50 border border-zaago-border rounded-xl p-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Tag className="w-8 h-8 text-zaago-green" />
            Special Offers & Deals
          </h1>
          <p className="text-zaago-muted-foreground mt-2">
            Create and manage special offers for your products
          </p>
        </div>
        <CreateOfferDialog />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-zaago-card/50 border-zaago-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zaago-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Active Offers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{activeOffers.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-zaago-card/50 border-zaago-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zaago-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{upcomingOffers.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-zaago-card/50 border-zaago-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zaago-muted-foreground flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Total Offers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{offers?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Offers List */}
      <div className="space-y-4">
        {offers && offers.length > 0 ? (
          offers.map((offer, index) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-zaago-card/50 border-zaago-border hover:border-zaago-green/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Product Image */}
                    <div className="w-full sm:w-24 h-24 rounded-lg overflow-hidden bg-zaago-accent flex-shrink-0">
                      {offer.products?.image_url ? (
                        <img
                          src={offer.products.image_url}
                          alt={offer.products.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Tag className="w-8 h-8 text-zaago-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Offer Details */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {offer.offer_title}
                          </h3>
                          <p className="text-zaago-muted-foreground">
                            {offer.products?.name}
                          </p>
                        </div>
                        {getStatusBadge(offer)}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-zaago-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Percent className="w-4 h-4 text-zaago-green" />
                          <span>{offer.discount_percentage}% OFF</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="w-4 h-4 text-zaago-green" />
                          <span>Priority: {offer.priority_rank}</span>
                        </div>
                        <div>
                          ₹{offer.original_price.toFixed(2)} → 
                          <span className="text-zaago-green font-semibold ml-1">
                            ₹{offer.offer_price.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="text-sm text-zaago-muted-foreground">
                        <div>
                          Valid: {new Date(offer.valid_from).toLocaleDateString()} - {new Date(offer.valid_until).toLocaleDateString()}
                        </div>
                        <div>
                          {new Date(offer.valid_until) > new Date() 
                            ? `Expires ${formatDistance(new Date(offer.valid_until), new Date(), { addSuffix: true })}`
                            : 'Expired'
                          }
                        </div>
                      </div>

                      {offer.offer_description && (
                        <p className="text-sm text-zaago-muted-foreground">
                          {offer.offer_description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex sm:flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleOfferStatus(offer.id, offer.is_active)}
                        className="border-zaago-border text-foreground hover:bg-zaago-accent"
                      >
                        {offer.is_active ? 'Deactivate' : 'Activate'}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                          >
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-zaago-card border-zaago-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-foreground">Delete Offer</AlertDialogTitle>
                            <AlertDialogDescription className="text-zaago-muted-foreground">
                              Are you sure you want to delete this offer? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-zaago-border text-foreground hover:bg-zaago-accent">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteOffer.mutate(offer.id)}
                              className="bg-red-500 hover:bg-red-600 text-white"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <Card className="bg-zaago-card/50 border-zaago-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Tag className="w-16 h-16 text-zaago-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Offers Yet</h3>
              <p className="text-zaago-muted-foreground text-center mb-4">
                Create your first special offer to attract more customers
              </p>
              <CreateOfferDialog />
            </CardContent>
          </Card>
        )}
      </div>
    </motion.div>
  );
};

export default SpecialOffers;
