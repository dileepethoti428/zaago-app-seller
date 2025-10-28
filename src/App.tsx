import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import AddProduct from "./pages/AddProduct";
import EditProduct from "./pages/EditProduct";
import Payments from "./pages/Payments";
import PaymentDetail from "./pages/PaymentDetail";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Deliveries from "./pages/Deliveries";
import Profile from "./pages/Profile";
import BankDetails from "./pages/BankDetails";
import NotFound from "./pages/NotFound";
import PendingApproval from "./pages/PendingApproval";
import ApplicationRejected from "./pages/ApplicationRejected";
import SellerApprovals from "./pages/SellerApprovals";
import ProductsCustomer from "./pages/ProductsCustomer";
import CustomerProductDetail from "./pages/CustomerProductDetail";
import CustomerOrders from "./pages/CustomerOrders";
import DeliveryAgent from "./pages/DeliveryAgent";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import ProductSuggestions from "./pages/ProductSuggestions";
import { CustomerNotifications } from "@/components/CustomerNotifications";
import { AgentNotifications } from "@/components/AgentNotifications";
import { SellerNotifications } from "@/components/SellerNotifications";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useOneSignal } from "@/hooks/useOneSignal";

const AppContent = () => {
  useRealtimeSync();
  useOneSignal();
  
  return (
    <>
      <Toaster />
      <Sonner />
      <CustomerNotifications />
      <AgentNotifications />
      <HashRouter>
        <ProtectedRoute>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/bank-details" element={<BankDetails />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route path="/application-rejected" element={<ApplicationRejected />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Index />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="orders" element={<Orders />} />
              <Route path="customer-orders" element={<CustomerOrders />} />
              <Route path="orders/:id" element={<OrderDetail />} />
              <Route path="products" element={<Products />} />
              <Route path="products/:id" element={<ProductDetail />} />
              <Route path="products/new" element={<AddProduct />} />
              <Route path="products/:id/edit" element={<EditProduct />} />
              <Route path="deliveries" element={<Deliveries />} />
              <Route path="delivery-agent" element={<DeliveryAgent />} />
              <Route path="payments" element={<Payments />} />
              <Route path="payments/:id" element={<PaymentDetail />} />
              <Route path="settings" element={<Settings />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="profile" element={<Profile />} />
              <Route path="seller-approvals" element={<SellerApprovals />} />
              <Route path="products-customer" element={<ProductsCustomer />} />
              <Route path="customer-products/:id" element={<CustomerProductDetail />} />
              <Route path="cart" element={<Cart />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="product-suggestions" element={<ProductSuggestions />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ProtectedRoute>
      </HashRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;