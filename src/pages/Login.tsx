import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
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

    setLoading(true);

    try {
      const { error } = isSignUp 
        ? await signUp(formData.email, formData.password)
        : await signIn(formData.email, formData.password);

      if (error) {
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
        return;
      }

      if (isSignUp) {
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account, then sign in.",
        });
        setIsSignUp(false);
        setFormData({ email: '', password: '' });
      } else {
        toast({
          title: "Welcome back!",
          description: "Logged in successfully.",
        });
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
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
                setFormData({ email: '', password: '' });
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