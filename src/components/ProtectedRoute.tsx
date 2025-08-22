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
    if (!loading && !user && location.pathname !== '/login' && location.pathname !== '/bank-details') {
      navigate('/login');
    } else if (!loading && user && location.pathname === '/login') {
      // Check if user has bank details, if not redirect to bank details page
      checkBankDetailsAndRedirect();
    }
  }, [user, loading, navigate, location.pathname]);

  const checkBankDetailsAndRedirect = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('bank_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking bank details:', error);
        navigate('/products');
        return;
      }

      if (data && data.bank_name) {
        // User has bank details, go to products
        navigate('/products');
      } else {
        // User doesn't have bank details, show bank details page
        navigate('/bank-details');
      }
    } catch (error) {
      console.error('Error checking bank details:', error);
      navigate('/products');
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