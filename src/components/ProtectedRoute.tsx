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
      // Always check approval status for authenticated users
      checkBankDetailsAndRedirect();
    }
  }, [user, loading, navigate, location.pathname]);

  const checkBankDetailsAndRedirect = async () => {
    if (!user) return;

    // Don't redirect if already on special approval pages
    const approvalPages = ['/bank-details', '/pending-approval', '/application-rejected'];
    if (approvalPages.includes(location.pathname)) {
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
        return;
      }

      if (!data) {
        // User doesn't have seller record, show bank details page
        navigate('/bank-details');
        return;
      }

      // Check approval status
      if (data.approval_status === 'pending') {
        navigate('/pending-approval');
        return;
      }

      if (data.approval_status === 'rejected') {
        navigate('/application-rejected');
        return;
      }

      if (data.approval_status === 'approved') {
        // User is approved, can access the app
        // Show bank details page only if they haven't seen it and don't have bank details
        if (!data.bank_name && location.pathname !== '/bank-details' && location.pathname === '/login') {
          navigate('/bank-details');
        } else if (location.pathname === '/login') {
          navigate('/products');
        }
      }
    } catch (error) {
      console.error('Error checking seller details:', error);
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