import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image_url?: string;
  price: number;
  quantity: number;
  seller_id: string;
  seller_name?: string;
  stock_quantity: number;
  variant_id?: string;
  variant_name?: string;
  gst_percentage?: number;
  discount_percentage?: number;
}

interface CartContextType {
  cartItems: CartItem[];
  cartTotal: number;
  itemCount: number;
  addToCart: (product: any, quantity?: number, variant?: any) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load cart items on user change
  const loadCartItems = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          products:product_id (
            name,
            image_url,
            seller_id,
            stock_quantity,
            gst_percentage
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const formattedItems: CartItem[] = (data || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.products?.name || 'Unknown Product',
        product_image_url: item.products?.image_url,
        price: item.unit_price,
        quantity: item.quantity,
        seller_id: item.products?.seller_id,
        stock_quantity: item.products?.stock_quantity || 0,
        variant_id: item.variant_id,
        variant_name: item.variant_name,
        gst_percentage: item.products?.gst_percentage || 0
      }));

      setCartItems(formattedItems);
    } catch (error) {
      console.error('Error loading cart:', error);
      toast({
        title: "Error",
        description: "Failed to load cart items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      loadCartItems();
    } else {
      setCartItems([]);
    }
  }, [user, loadCartItems]);

  const addToCart = async (product: any, quantity = 1, variant?: any) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to add items to cart",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check if item already exists in cart
      const existingItem = cartItems.find(item => 
        item.product_id === product.id && 
        item.variant_id === variant?.id
      );

      if (existingItem) {
        // Update quantity
        await updateQuantity(existingItem.id, existingItem.quantity + quantity);
      } else {
        // Add new item
        const { data, error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: product.id,
            quantity,
            unit_price: variant?.price || product.price,
            total_price: (variant?.price || product.price) * quantity
          })
          .select()
          .single();

        if (error) throw error;

        const newItem: CartItem = {
          id: data.id,
          product_id: product.id,
          product_name: product.name,
          product_image_url: product.image_url,
          price: variant?.price || product.price,
          quantity,
          seller_id: product.seller_id,
          stock_quantity: product.stock_quantity,
          variant_id: variant?.id,
          variant_name: variant?.name,
          discount_percentage: product.discount_percentage || 0
        };

        setCartItems(prev => [...prev, newItem]);
      }

      toast({
        title: "Added to Cart",
        description: `${product.name}${variant ? ` (${variant.name})` : ''} added to cart`,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive"
      });
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

      if (error) throw error;

      setCartItems(prev => prev.filter(item => item.id !== cartItemId));
      
      toast({
        title: "Removed from Cart",
        description: "Item removed from cart",
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast({
        title: "Error",
        description: "Failed to remove item from cart",
        variant: "destructive"
      });
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (quantity < 1) {
      await removeFromCart(cartItemId);
      return;
    }

    try {
      const item = cartItems.find(i => i.id === cartItemId);
      if (!item) return;

      const totalPrice = item.price * quantity;

      const { error } = await supabase
        .from('cart_items')
        .update({ quantity, total_price: totalPrice })
        .eq('id', cartItemId);

      if (error) throw error;

      setCartItems(prev => prev.map(item => 
        item.id === cartItemId 
          ? { ...item, quantity }
          : item
      ));
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive"
      });
    }
  };

  const clearCart = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setCartItems([]);
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast({
        title: "Error",
        description: "Failed to clear cart",
        variant: "destructive"
      });
    }
  };

  const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  const itemCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      cartTotal,
      itemCount,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      loading
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};