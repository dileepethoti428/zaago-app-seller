import { motion } from 'framer-motion';
import { LogIn, UserPlus, Mail, Lock, Phone, Building } from 'lucide-react';
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
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              {isSignUp ? (
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-primary-foreground" />
                </div>
              ) : (
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <LogIn className="w-6 h-6 text-primary-foreground" />
                </div>
              )}
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isSignUp ? 'Sign up for your Zaago Seller account' : 'Sign in to your Zaago Seller account'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              {isSignUp && (
                <p className="text-xs text-muted-foreground mt-1">Password must be at least 6 characters</p>
              )}
            </div>

            {/* Additional signup fields */}
            {isSignUp && (
              <>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter your phone number"
                      className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Business Name</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                      type="text"
                      required
                      value={formData.businessName}
                      onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                      placeholder="Enter your business name"
                      className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading 
                ? (isSignUp ? 'Creating Account...' : 'Signing In...') 
                : (isSignUp ? 'Create Account' : 'Sign In')
              }
            </button>
          </form>

          {/* Toggle Link */}
          <div className="text-center mt-6">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
            >
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
            {isSignUp && (
              <p className="text-xs text-muted-foreground mt-2">
                After signing up, check your email to verify your account
              </p>
            )}
            {!isSignUp && (
              <p className="text-xs text-muted-foreground mt-2">
                Use any email/password to create an account or sign in
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}