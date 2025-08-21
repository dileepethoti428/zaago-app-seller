import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, UserPlus, Phone, Building } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    businessName: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    if (isSignUp && (!formData.phone || !formData.businessName)) {
      toast({
        title: "Missing Information",
        description: "Please enter phone number and business name for registration.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // Create auth user first
        const { error: authError } = await signUp(formData.email, formData.password);
        
        if (authError) {
          throw authError;
        }

        // Since the signup was successful, we can try to create seller profile
        // We'll handle this in a separate step since we need the user_id from auth
        try {
          // Get the current user after signup
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            // Create seller profile with additional data
            const { error: sellerError } = await supabase
              .from('sellers')
              .insert({
                user_id: user.id,
                email: formData.email,
                name: formData.businessName,
                phone: formData.phone,
                business_name: formData.businessName,
              });

            if (sellerError) {
              console.error('Error creating seller profile:', sellerError);
              // Don't fail the signup if seller creation fails, just log it
            }

            // Create admin notification
            const { error: notificationError } = await supabase
              .from('admin_notifications')
              .insert({
                type: 'new_seller_signup',
                title: 'New Seller Registration',
                message: `New seller "${formData.businessName}" has registered with email ${formData.email}`,
                metadata: {
                  seller_email: formData.email,
                  business_name: formData.businessName,
                  phone: formData.phone,
                  signup_date: new Date().toISOString()
                }
              });

            if (notificationError) {
              console.error('Error creating admin notification:', notificationError);
            }
          }
        } catch (profileError) {
          console.error('Error creating seller profile after signup:', profileError);
          // Continue with signup success even if profile creation fails
        }

        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account, then sign in.",
        });
        setIsSignUp(false);
        setFormData({ email: '', password: '', phone: '', businessName: '' });
      } else {
        const { error } = await signIn(formData.email, formData.password);
        
        if (error) {
          throw error;
        }

        toast({
          title: "Welcome back!",
          description: "Logged in successfully.",
        });
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      // Handle specific error cases
      let errorMessage = error.message;
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = "Invalid email or password. Please check your credentials.";
      } else if (error.message?.includes('User already registered')) {
        errorMessage = "This email is already registered. Try signing in instead.";
        setIsSignUp(false);
      } else if (error.message?.includes('signup')) {
        errorMessage = "Account creation failed. Please try again.";
      }

      toast({
        title: isSignUp ? "Sign Up Failed" : "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="zaago-card p-8 w-full max-w-md"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="text-center mb-8"
        >
          {isSignUp ? (
            <UserPlus className="w-16 h-16 text-primary mx-auto mb-4" />
          ) : (
            <LogIn className="w-16 h-16 text-primary mx-auto mb-4" />
          )}
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-secondary">
            {isSignUp 
              ? 'Sign up for your Zaago Seller account' 
              : 'Sign in to your Zaago Seller account'
            }
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              {isSignUp && (
                <p className="text-xs text-secondary">Password must be at least 6 characters</p>
              )}
            </div>

            {isSignUp && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter your phone number"
                      className="w-full pl-10 pr-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Business Name</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
                    <input
                      type="text"
                      required
                      value={formData.businessName}
                      onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                      placeholder="Enter your business name"
                      className="w-full pl-10 pr-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full zaago-button-primary py-3 font-semibold disabled:opacity-50"
            >
              {loading 
                ? (isSignUp ? 'Creating Account...' : 'Signing In...') 
                : (isSignUp ? 'Create Account' : 'Sign In')
              }
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setFormData({ email: '', password: '', phone: '', businessName: '' });
              }}
              className="text-primary hover:text-primary/80 transition-colors"
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-secondary">
              {isSignUp 
                ? 'After signing up, check your email to verify your account'
                : 'Use any email/password to create an account or sign in'
              }
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}