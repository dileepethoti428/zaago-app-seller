import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event);
        const nextUserId = session?.user?.id ?? null;

        // Clear cached per-user data whenever the signed-in user changes
        if (prevUserIdRef.current !== nextUserId) {
          queryClient.clear();
          prevUserIdRef.current = nextUserId;
        }

        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setSession(null);
          setUser(null);
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session with retry logic
    const getSessionWithRetry = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (!error) {
            // Check if seller is deactivated before restoring session
            if (session?.user) {
              const { data: seller } = await supabase
                .from('sellers')
                .select('is_deactivated, status')
                .eq('user_id', session.user.id)
                .maybeSingle();

              if (seller?.is_deactivated || seller?.status === 'inactive') {
                await supabase.auth.signOut();
                setSession(null);
                setUser(null);
                setLoading(false);
                return;
              }
            }
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            return;
          }
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (err) {
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      // All retries failed
      console.error('Failed to get session after retries');
      setSession(null);
      setUser(null);
      setLoading(false);
    };

    getSessionWithRetry();

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: error.message,
        });
        return { error };
      }

      // Check if seller account is deactivated
      const { data: seller } = await supabase
        .from('sellers')
        .select('is_deactivated, status')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (seller?.is_deactivated || seller?.status === 'inactive') {
        await supabase.auth.signOut();
        toast({
          variant: "destructive",
          title: "Account Deactivated",
          description: "Your account has been deactivated. Kindly contact customer care.",
        });
        return { error: { message: 'Account deactivated' } };
      }
      
      return { error };
    } catch (error) {
      console.error('Unexpected sign in error:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        toast({
          variant: "destructive",
          title: "Logout Error",
          description: error.message,
        });
      }
    } catch (error) {
      console.error('Unexpected sign out error:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};