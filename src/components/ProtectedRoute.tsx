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

  const publicRoutes = ['/login', '/forgot-password', '/reset-password', '/privacy-policy', '/terms-conditions', '/account-deactivated'];
  const mfaRoute = '/mfa-challenge';

  useEffect(() => {
    if (!loading && !user && !publicRoutes.includes(location.pathname)) {
      navigate('/login');
    } else if (!loading && user) {
      checkMfaAndBank();
    }
  }, [user, loading, location.pathname]);

  const checkMfaAndBank = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!error && data?.currentLevel === 'aal1' && data?.nextLevel === 'aal2') {
        if (location.pathname !== mfaRoute) {
          navigate(mfaRoute, { replace: true });
          return;
        }
        return;
      }
      // If aal2 satisfied and user is on /mfa-challenge, send them home
      if (location.pathname === mfaRoute) {
        navigate('/', { replace: true });
        return;
      }
    } catch (e) {
      console.error('MFA check failed', e);
    }
    checkBankDetailsAndRedirect();
  };

  const checkBankDetailsAndRedirect = async () => {
    if (!user) return;

    // Whitelist of pages that don't need seller approval checks
    const publicRoutes = ['/login'];
    const approvalPages = ['/bank-details', '/pending-approval', '/application-rejected', '/account-deactivated'];
    const customerRoutes = ['/customer-orders', '/products-customer', '/cart', '/checkout'];
    const protectedRoutes = [...publicRoutes, ...approvalPages, ...customerRoutes];
    
    // Don't redirect if already on a protected route or customer-facing route
    if (protectedRoutes.includes(location.pathname)) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('bank_name, approval_status, is_deactivated, status')
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

      // Check if seller is deactivated
      if ((data as any).is_deactivated || (data as any).status === 'inactive') {
        if (location.pathname !== '/account-deactivated') {
          navigate('/account-deactivated');
        }
        return;
      }

      // Check approval status on any route (not just login)
      if (data.approval_status === 'pending') {
        // Don't redirect if already on approval pages
        if (!approvalPages.includes(location.pathname)) {
          navigate('/pending-approval');
          return;
        }
      }

      if (data.approval_status === 'rejected') {
        if (!approvalPages.includes(location.pathname)) {
          navigate('/application-rejected');
          return;
        }
      }

      // If approved, allow access to bank-details if needed
      if (data.approval_status === 'approved') {
        if (!data.bank_name && location.pathname !== '/bank-details') {
          navigate('/bank-details');
          return;
        }
        // If coming from login and bank details are complete, go to home
        if (location.pathname === '/login' && data.bank_name) {
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

  // Show public pages if not authenticated
  if (!user && !publicRoutes.includes(location.pathname)) {
    return null; // Will redirect in useEffect
  }

  // Show main app if authenticated and not on public page
  if (user && !publicRoutes.includes(location.pathname)) {
    return <>{children}</>;
  }

  // Show public pages (login, forgot-password, reset-password, etc.)
  return <>{children}</>;
}