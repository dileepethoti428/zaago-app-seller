import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Eye, CheckCircle, X, Check, Timer } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useProductActions } from '@/hooks/useProductActions';
import { stopContinuousRinging, stopAllSounds } from '@/utils/notificationSound';
import './ui/emergency-styles.css';

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
  const [timeLeft, setTimeLeft] = useState(30); // 30 second countdown
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      onDismiss();
      return;
    }
    
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onDismiss]);

  // Vibration on mount and escalating
  useEffect(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]); // Initial vibration
      
      const vibrationInterval = setInterval(() => {
        if (timeLeft > 0 && timeLeft % 10 === 0) {
          navigator.vibrate([300, 100, 300, 100, 300]); // Escalating pattern
        }
      }, 1000);

      return () => clearInterval(vibrationInterval);
    }
  }, [timeLeft]);

  // Swipe gesture handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isRightSwipe) {
      onAccept();
    }
    if (isLeftSwipe) {
      onDismiss();
    }
  };

  const handleAction = (action: () => void) => {
    // Stop all sounds when any primary action is taken
    stopContinuousRinging();
    stopAllSounds();
    action();
  };

  const formatAmount = (amount?: number) => {
    if (!amount) return '₹0';
    return `₹${amount.toFixed(2)}`;
  };

  const handleProductAccept = async (productId: string) => {
    if (!order.seller_id) return;
    
    // Stop all sounds immediately when user interacts
    stopContinuousRinging();
    stopAllSounds();
    
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
    
    // Stop all sounds immediately when user interacts
    stopContinuousRinging();
    stopAllSounds();
    
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

  const progressPercentage = (timeLeft / 30) * 100;
  const isUrgent = timeLeft <= 10;

  return (
    <div 
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-2 sm:p-4"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Card className={`w-full max-w-md bg-background border-4 border-red-500 shadow-2xl relative ${isUrgent ? 'border-red-600' : ''}`}
            style={{
              boxShadow: '0 0 50px rgba(239, 68, 68, 0.5)'
            }}>
        <div className="p-3 sm:p-6 space-y-3 sm:space-y-4 relative z-10">
          {/* Timer and Emergency Header */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-red-100 dark:bg-red-900/20 p-3 rounded-lg border-2 border-red-500">
              <div className="flex items-center gap-2">
                <Phone className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 flex-shrink-0" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-red-600">🚨 NEW ORDER!</h2>
                  <p className="text-xs sm:text-sm text-red-500 font-medium">Please respond to the order request</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
                  <Timer className="h-4 w-4" />
                  <span className={`font-bold text-lg ${isUrgent ? 'animate-pulse' : ''}`}>
                    {timeLeft}s
                  </span>
                </div>
                <Badge variant="destructive" className="text-xs px-2 py-0.5">
                  AUTO-CLOSE
                </Badge>
              </div>
            </div>
            <Progress value={progressPercentage} className="h-2 bg-red-100" />
            <p className="text-center text-xs text-muted-foreground">
              💡 Swipe right to accept • Swipe left to dismiss
            </p>
          </div>

          {/* Order Details */}
          <div className="space-y-2 sm:space-y-3 bg-muted/30 p-3 sm:p-4 rounded-lg text-sm sm:text-base">
            <div className="flex justify-between items-center">
              <span className="font-medium text-foreground">Order ID:</span>
              <span className="text-primary font-mono">#{order.id.slice(-6)}</span>
            </div>
            
            {order.customer_name && (
              <div className="flex justify-between items-center">
                <span className="font-medium text-foreground">Customer:</span>
                <span className="text-foreground">{order.customer_name}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="font-medium text-foreground">Your Items Total:</span>
              <span className="text-primary font-bold text-base sm:text-lg">
                {formatAmount(calculateSellerTotal())}
              </span>
            </div>

            {order.customer_phone && (
              <div className="flex justify-between items-center">
                <span className="font-medium text-foreground">Phone:</span>
                <span className="font-mono text-foreground">{order.customer_phone}</span>
              </div>
            )}

            {order.payment_method && (
              <div className="flex justify-between items-center">
                <span className="font-medium text-foreground">Payment:</span>
                <span className="text-foreground">{order.payment_method}</span>
              </div>
            )}

            {order.delivery_address && (
              <div className="space-y-1">
                <span className="font-medium text-foreground">Address:</span>
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                  {order.delivery_address}
                </p>
              </div>
            )}
          </div>

          {/* Products Section */}
          {order.items && order.items.length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              <h3 className="font-bold text-base sm:text-lg text-center text-foreground border-b pb-2">
                Your Products ({order.items.length})
              </h3>
              
              <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-60 overflow-y-auto">
                {order.items.map((item) => {
                  const status = getProductStatus(item.id);
                  const isProcessingThisProduct = isProcessing === `${order.id}-${item.id}`;
                  
                  return (
                    <Card key={item.id} className={`p-2 sm:p-3 border-2 ${
                      status === 'accepted' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
                      status === 'rejected' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' :
                      'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
                    }`}>
                      <div className="flex items-center gap-2 sm:gap-3">
                        {item.image_url && (
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm sm:text-base text-foreground truncate">{item.name}</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Qty: {item.quantity} × {formatAmount(item.price)} = {formatAmount(item.total_price)}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          {status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleProductAccept(item.id)}
                                disabled={isProcessingThisProduct}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8"
                              >
                                <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline ml-1">Accept</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleProductReject(item.id)}
                                disabled={isProcessingThisProduct}
                                className="text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8"
                              >
                                <X className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline ml-1">Reject</span>
                              </Button>
                            </>
                          )}
                          
                          {status === 'accepted' && (
                            <Badge variant="default" className="bg-green-600 text-white text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Accepted</span>
                            </Badge>
                          )}
                          
                          {status === 'rejected' && (
                            <Badge variant="destructive" className="text-xs">
                              <X className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Rejected</span>
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
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Button
              onClick={() => handleAction(onViewOrder)}
              variant="outline"
              className="flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-lg py-4 sm:py-6 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 font-bold"
              type="button"
            >
              <Eye className="h-4 w-4 sm:h-6 sm:w-6" />
              <span className="hidden sm:inline">VIEW FULL ORDER</span>
              <span className="sm:hidden">VIEW ORDER</span>
            </Button>
            <Button
              onClick={() => handleAction(onDismiss)}
              className="bg-gray-600 hover:bg-gray-700 text-white flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-lg py-4 sm:py-6 font-bold"
              type="button"
            >
              <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6" />
              DONE
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};