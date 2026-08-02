import { useEffect, useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DailyOperations from "./pages/DailyOperations";
import Insights from "./pages/Insights";

import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import AddProduct from "./pages/AddProduct";
import EditProduct from "./pages/EditProduct";
import EditCategory from "./pages/EditCategory";
import ManageCategories from "./pages/ManageCategories";
import Subscriptions from "./pages/Subscriptions";

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
import DeliveryAgents from "./pages/DeliveryAgents";
import UnassignedOrders from "./pages/UnassignedOrders";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import ProductSuggestions from "./pages/ProductSuggestions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";
import ForgotPassword from "./pages/ForgotPassword";
import AccountDeactivated from "./pages/AccountDeactivated";
import SalesReport from "./pages/SalesReport";
import CodSettlements from "./pages/CodSettlements";
import ResetPassword from "./pages/ResetPassword";
import Security from "./pages/Security";
import MfaChallenge from "./pages/MfaChallenge";
import { CustomerNotifications } from "@/components/CustomerNotifications";
import { AgentNotifications } from "@/components/AgentNotifications";
import { SellerNotifications } from "@/components/SellerNotifications";
import { OfflinePage } from "@/components/OfflinePage";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useOneSignal } from "@/hooks/useOneSignal";
import { useNetworkStatus } from "@/lib/network";
import { queryClient } from "@/lib/queryClient";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AppContent = () => {
  useRealtimeSync();
  useOneSignal();
  const navigate = useNavigate();
  
  const isOnline = useNetworkStatus();
  const [showOfflinePage, setShowOfflinePage] = useState(!navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);

  // Detect password recovery flow from Supabase email link
  // Supabase redirects to root with #type=recovery hash — we intercept and redirect
  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      try { sessionStorage.setItem('pendingPasswordRecovery', '1'); } catch {}
      navigate('/reset-password');
    }
  }, [navigate]);

  // Auto-restore when back online
  useEffect(() => {
    if (isOnline) {
      setShowOfflinePage(false);
      // Trigger data refetch when coming back online
      queryClient.invalidateQueries();
    } else {
      setShowOfflinePage(true);
    }
  }, [isOnline]);

  const handleRetry = async () => {
    setIsRetrying(true);
    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (navigator.onLine) {
      await queryClient.invalidateQueries();
      setShowOfflinePage(false);
    } else {
      toast.error("Still offline. Please check your connection.");
    }
    setIsRetrying(false);
  };
  
  // Push notification listeners are now handled in pushNotifications.ts

  // Listen for FCM token from native Android
  useEffect(() => {
    const handler = async (event: any) => {
      const token = event.detail?.token;
      if (!token) return;

      console.log("🔥 FCM TOKEN RECEIVED:", token);

      const { data } = await supabase.auth.getUser();
      if (!data?.user) return;

      const { error } = await supabase.from("seller_push_tokens").upsert(
        {
          seller_id: data.user.id,
          fcm_token: token,
          device: "android",
        },
        { onConflict: "seller_id" }
      );

      if (error) {
        console.error("❌ Failed to save seller push token:", error);
      } else {
        console.log("✅ Seller push token saved");
      }
    };

    window.addEventListener("fcm-token", handler);
    return () => window.removeEventListener("fcm-token", handler);
  }, []);

  // Show offline page when offline
  if (showOfflinePage) {
    return (
      <>
        <Toaster />
        <Sonner />
        <OfflinePage onRetry={handleRetry} isRetrying={isRetrying} />
      </>
    );
  }
  
  return (
    <>
      <Toaster />
      <Sonner />
      <CustomerNotifications />
      <AgentNotifications />
      <SellerNotifications />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/bank-details" element={<BankDetails />} />
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/application-rejected" element={<ApplicationRejected />} />
        <Route path="/account-deactivated" element={<AccountDeactivated />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-conditions" element={<TermsConditions />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/mfa-challenge" element={<MfaChallenge />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Index />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="daily-operations" element={<DailyOperations />} />
          <Route path="insights" element={<Insights />} />

          <Route path="orders" element={<Orders />} />
          <Route path="customer-orders" element={<CustomerOrders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="products/new" element={<AddProduct />} />
          <Route path="products/:id/edit" element={<EditProduct />} />
          <Route path="categories" element={<ManageCategories />} />
          <Route path="categories/:id/edit" element={<EditCategory />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          
          <Route path="deliveries" element={<Deliveries />} />
          <Route path="delivery-agent" element={<DeliveryAgent />} />
          <Route path="delivery-agents" element={<DeliveryAgents />} />
          <Route path="unassigned-orders" element={<UnassignedOrders />} />
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
          <Route path="sales-report" element={<SalesReport />} />
          <Route path="cod-settlements" element={<CodSettlements />} />
          <Route path="profile/security" element={<Security />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <TooltipProvider>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ErrorBoundary>
            <ProtectedRoute>
              <AppContent />
            </ProtectedRoute>
          </ErrorBoundary>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;