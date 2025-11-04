import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user && location.pathname !== '/login') {
      navigate('/login');
    } else if (!loading && user) {
      // Only check bank details on initial login, not on every route change
      checkBankDetailsAndRedirect();
    }
  }, [user, loading, location.pathname]);

  const checkBankDetailsAndRedirect = async () => {
    if (!user) return;

    // Whitelist of pages that don't need seller approval checks
    const publicRoutes = ['/login'];
    const approvalPages = ['/bank-details', '/pending-approval', '/application-rejected'];
    const customerRoutes = ['/customer-orders', '/products-customer', '/cart', '/checkout'];
    const protectedRoutes = [...publicRoutes, ...approvalPages, ...customerRoutes];
    
    // Don't redirect if already on a protected route or customer-facing route
    if (protectedRoutes.includes(location.pathname)) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('bank_name, approval_status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking seller details:', error);
        // Don't redirect on error - allow user to stay on current page
        return;
      }

      if (!data) {
        // Only redirect to bank details if coming from login
        if (location.pathname === '/login') {
          navigate('/bank-details');
        }
        return;
      }

      // Only enforce approval status for new sessions (from login)
      if (data.approval_status === 'pending' && location.pathname === '/login') {
        navigate('/pending-approval');
        return;
      }

      if (data.approval_status === 'rejected' && location.pathname === '/login') {
        navigate('/application-rejected');
        return;
      }

      if (data.approval_status === 'approved' && location.pathname === '/login') {
        if (!data.bank_name) {
          navigate('/bank-details');
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Error checking seller details:', error);
      // Fail open - allow access on error
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user && location.pathname !== '/login') {
    return null; // Will redirect in useEffect
  }

  // Show main app if authenticated and not on login page
  if (user && location.pathname !== '/login') {
    return <>{children}</>;
  }

  // Show login page
  return <>{children}</>;
}