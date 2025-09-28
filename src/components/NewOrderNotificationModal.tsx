import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneOff, Eye, CheckCircle, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProductActions } from '@/hooks/useProductActions';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total_price: number;
  image_url?: string;
  seller_id?: string;
}

interface NewOrderNotificationModalProps {
  order: {
    id: string;
    customer_name?: string;
    customer_phone?: string;
    total_amount?: number;
    items?: OrderItem[];
    delivery_address?: string;
    payment_method?: string;
    payment_status?: string;
    seller_id?: string;
  };
  onAccept: () => void;
  onDismiss: () => void;
  onViewOrder: () => void;
}

export const NewOrderNotificationModal: React.FC<NewOrderNotificationModalProps> = ({
  order,
  onAccept,
  onDismiss,
  onViewOrder
}) => {
  const { toast } = useToast();
  const { acceptProduct, rejectProduct, isProcessing } = useProductActions();
  const [acceptedProducts, setAcceptedProducts] = useState<Set<string>>(new Set());
  const [rejectedProducts, setRejectedProducts] = useState<Set<string>>(new Set());

  const handleAction = (action: () => void) => {
    action();
  };

  const formatAmount = (amount?: number) => {
    if (!amount) return '₹0';
    return `₹${amount.toFixed(2)}`;
  };

  const handleProductAccept = async (productId: string) => {
    if (!order.seller_id) return;
    
    const success = await acceptProduct(order.id, productId, order.seller_id);
    if (success) {
      setAcceptedProducts(prev => new Set([...prev, productId]));
      setRejectedProducts(prev => {
        const newSet = new Set([...prev]);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const handleProductReject = async (productId: string) => {
    if (!order.seller_id) return;
    
    const success = await rejectProduct(order.id, productId, order.seller_id);
    if (success) {
      setRejectedProducts(prev => new Set([...prev, productId]));
      setAcceptedProducts(prev => {
        const newSet = new Set([...prev]);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const getProductStatus = (productId: string) => {
    if (acceptedProducts.has(productId)) return 'accepted';
    if (rejectedProducts.has(productId)) return 'rejected';
    return 'pending';
  };

  const calculateSellerTotal = () => {
    return order.items?.reduce((total, item) => total + (item.total_price || 0), 0) || 0;
  };


  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <Card className="w-full max-w-md bg-background border-4 border-red-500 shadow-2xl"
            style={{
              boxShadow: '0 0 50px rgba(239, 68, 68, 0.5), inset 0 0 20px rgba(239, 68, 68, 0.1)'
            }}>
        <div className="p-6 space-y-4 relative">
          {/* Emergency Header */}
          <div className="flex items-center justify-between bg-red-100 dark:bg-red-900/20 p-3 rounded-lg border-2 border-red-500">
            <div className="flex items-center gap-2">
              <Phone className="h-8 w-8 text-red-600" />
              <div>
                <h2 className="text-2xl font-bold text-red-600">🚨 NEW ORDER!</h2>
                <p className="text-sm text-red-500 font-medium">IMMEDIATE ACTION REQUIRED</p>
              </div>
            </div>
            <Badge variant="destructive" className="text-lg px-4 py-2">
              EMERGENCY
            </Badge>
          </div>

          {/* Order Details */}
          <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
            <div className="flex justify-between">
              <span className="font-medium">Order ID:</span>
              <span className="text-primary font-mono">#{order.id.slice(-6)}</span>
            </div>
            
            {order.customer_name && (
              <div className="flex justify-between">
                <span className="font-medium">Customer:</span>
                <span>{order.customer_name}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="font-medium">Your Items Total:</span>
              <span className="text-primary font-bold text-lg">
                {formatAmount(calculateSellerTotal())}
              </span>
            </div>

            {order.customer_phone && (
              <div className="flex justify-between">
                <span className="font-medium">Phone:</span>
                <span className="font-mono">{order.customer_phone}</span>
              </div>
            )}

            {order.payment_method && (
              <div className="flex justify-between">
                <span className="font-medium">Payment:</span>
                <span>{order.payment_method}</span>
              </div>
            )}

            {order.delivery_address && (
              <div className="space-y-1">
                <span className="font-medium">Address:</span>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {order.delivery_address}
                </p>
              </div>
            )}
          </div>

          {/* Products Section */}
          {order.items && order.items.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg text-center border-b pb-2">
                Your Products ({order.items.length})
              </h3>
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {order.items.map((item) => {
                  const status = getProductStatus(item.id);
                  const isProcessingThisProduct = isProcessing === `${order.id}-${item.id}`;
                  
                  return (
                    <Card key={item.id} className={`p-3 border-2 ${
                      status === 'accepted' ? 'border-green-500 bg-green-50' :
                      status === 'rejected' ? 'border-red-500 bg-red-50' :
                      'border-orange-500 bg-orange-50'
                    }`}>
                      <div className="flex items-center gap-3">
                        {item.image_url && (
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity} × {formatAmount(item.price)} = {formatAmount(item.total_price)}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleProductAccept(item.id)}
                                disabled={isProcessingThisProduct}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <Check className="h-4 w-4" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleProductReject(item.id)}
                                disabled={isProcessingThisProduct}
                              >
                                <X className="h-4 w-4" />
                                Reject
                              </Button>
                            </>
                          )}
                          
                          {status === 'accepted' && (
                            <Badge variant="default" className="bg-green-600 text-white">
                              <Check className="h-3 w-3 mr-1" />
                              Accepted
                            </Badge>
                          )}
                          
                          {status === 'rejected' && (
                            <Badge variant="destructive">
                              <X className="h-3 w-3 mr-1" />
                              Rejected
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}


          {/* PRIMARY ACTION BUTTONS */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleAction(onViewOrder)}
              variant="outline"
              className="flex items-center gap-2 text-lg py-6 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-bold"
              type="button"
            >
              <Eye className="h-6 w-6" />
              VIEW FULL ORDER
            </Button>
            <Button
              onClick={() => handleAction(onDismiss)}
              className="bg-gray-600 hover:bg-gray-700 text-white flex items-center gap-2 text-lg py-6 font-bold"
              type="button"
            >
              <CheckCircle className="h-6 w-6" />
              DONE
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};