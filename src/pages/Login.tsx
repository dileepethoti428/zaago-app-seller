import { motion } from 'framer-motion';
import { Truck, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        throw error;
      }
    } catch (error: any) {
      toast({
        title: "Google Sign In Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        throw error;
      }
    } catch (error: any) {
      toast({
        title: "Facebook Sign In Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Logo and Branding */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-2 bg-zaago-green rounded-lg">
              <Truck className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              <span className="text-zaago-green">Zaago</span> Agent
            </h1>
          </div>
          <p className="text-zaago-muted-foreground text-sm">
            Delivery Partner Platform
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-zaago-card/50 border border-zaago-border rounded-2xl p-8 backdrop-blur-sm"
        >
          {/* Welcome Message */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Welcome Back
            </h2>
            <p className="text-zaago-muted-foreground">
              Sign in to start delivering
            </p>
          </div>

          {/* Tabs */}
          <div className="flex mb-6">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-3 px-4 rounded-l-lg font-medium transition-all ${
                !isSignUp 
                  ? 'bg-zaago-green text-black' 
                  : 'bg-transparent text-zaago-muted-foreground hover:text-foreground'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-3 px-4 rounded-r-lg font-medium transition-all ${
                isSignUp 
                  ? 'bg-zaago-green text-black' 
                  : 'bg-transparent text-zaago-muted-foreground hover:text-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zaago-muted-foreground w-5 h-5" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Email address"
                  className="w-full pl-12 pr-4 py-4 bg-zaago-card border border-zaago-border rounded-lg text-foreground placeholder:text-zaago-muted-foreground focus:border-zaago-green focus:ring-1 focus:ring-zaago-green transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zaago-muted-foreground w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Password"
                  className="w-full pl-12 pr-12 py-4 bg-zaago-card border border-zaago-border rounded-lg text-foreground placeholder:text-zaago-muted-foreground focus:border-zaago-green focus:ring-1 focus:ring-zaago-green transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zaago-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Additional signup fields */}
            {isSignUp && (
              <>
                <div>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                    className="w-full px-4 py-4 bg-zaago-card border border-zaago-border rounded-lg text-foreground placeholder:text-zaago-muted-foreground focus:border-zaago-green focus:ring-1 focus:ring-zaago-green transition-all"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                    placeholder="Business name"
                    className="w-full px-4 py-4 bg-zaago-card border border-zaago-border rounded-lg text-foreground placeholder:text-zaago-muted-foreground focus:border-zaago-green focus:ring-1 focus:ring-zaago-green transition-all"
                  />
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zaago-green text-black py-4 rounded-lg font-semibold hover:bg-zaago-green-light transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading 
                ? (isSignUp ? 'Creating Account...' : 'Signing In...') 
                : (isSignUp ? 'Sign Up' : 'Sign In')
              }
            </button>
          </form>

          {/* Forgot Password */}
          {!isSignUp && (
            <div className="text-center mt-4">
              <button className="text-zaago-green hover:text-zaago-green-light text-sm">
                Forgot Password?
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-zaago-border"></div>
            <span className="px-4 text-zaago-muted-foreground text-sm">OR CONTINUE WITH</span>
            <div className="flex-1 border-t border-zaago-border"></div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleGoogleSignIn}
              className="flex items-center justify-center gap-2 py-3 px-4 border border-zaago-border rounded-lg text-foreground hover:bg-zaago-accent/50 transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button
              onClick={handleFacebookSignIn}
              className="flex items-center justify-center gap-2 py-3 px-4 border border-zaago-border rounded-lg text-foreground hover:bg-zaago-accent/50 transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
          </div>

          {/* Terms */}
          <div className="text-center mt-6">
            <p className="text-xs text-zaago-muted-foreground">
              By continuing, you agree to our{' '}
              <button className="text-zaago-green hover:underline">Terms of Service</button>
              {' '}and{' '}
              <button className="text-zaago-green hover:underline">Privacy Policy</button>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}