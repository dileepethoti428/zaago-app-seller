import { ArrowRight, UserPlus, Mail, Lock, Phone, Building } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { registerSellerForPush } from "../utils/pushNotifications";

export default function LoginPage() {
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    phone: "",
    businessName: "",
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

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

    if (isSignUp && !termsAccepted) {
      toast({
        title: "Terms Required",
        description: "Please accept the Terms & Conditions and Privacy Policy to continue.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const acceptanceTimestamp = new Date().toISOString();

        // Create auth user with business data in metadata
        const { data: signUpData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/#/`,
            data: {
              phone: formData.phone,
              business_name: formData.businessName,
              full_name: formData.businessName,
              terms_accepted_at: acceptanceTimestamp,
              privacy_accepted_at: acceptanceTimestamp,
              terms_version: "1.0",
            },
          },
        });

        if (authError) {
          throw authError;
        }

        // If the user was created immediately (no email confirmation required)
        if (signUpData.user && !signUpData.user.email_confirmed_at) {
          toast({
            title: "Account Created!",
            description: "Please check your email to verify your account, then sign in.",
          });
        } else if (signUpData.user && signUpData.user.email_confirmed_at) {
          // User created and confirmed immediately
          toast({
            title: "Account Created!",
            description: "Your account has been created successfully.",
          });
        }

        console.log("Signup successful:", signUpData);

        setIsSignUp(false);
        setTermsAccepted(false);
        setFormData({ email: "", password: "", phone: "", businessName: "" });
      } else {
        const { error } = await signIn(formData.email, formData.password);

        if (error) {
          throw error;
        }

        toast({
          title: "Welcome back!",
          description: "Logged in successfully.",
        });

        // 🔔 STEP 2.1: Get current user from Supabase
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // 🔔 STEP 2.2: Trigger push notification permission + FCM token
        if (user) {
          await registerSellerForPush(user.id);
        }

        // 🔁 Small delay to ensure auth state is updated
        setTimeout(() => {
          navigate("/");
        }, 100);
      }
    } catch (error: any) {
      console.error("Auth error:", error);

      let errorMessage = error.message;

      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password. Please check your credentials.";
      } else if (error.message?.includes("User already registered")) {
        errorMessage = "This email is already registered. Try signing in instead.";
        setIsSignUp(false);
      } else if (error.message?.includes("signup")) {
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
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              {isSignUp ? (
                <div className="text-green-500">
                  <UserPlus className="w-12 h-12" />
                </div>
              ) : (
                <div className="text-green-500">
                  <ArrowRight className="w-12 h-12" />
                </div>
              )}
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{isSignUp ? "Create Account" : "Welcome Back"}</h1>
            <p className="text-zinc-400 text-base">
              {isSignUp ? "Sign up for your Zaago Seller account" : "Sign in to your Zaago Seller account"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="text-white text-base font-medium mb-3 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                  className="w-full pl-12 pr-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-base"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="text-white text-base font-medium mb-3 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter your password"
                  className="w-full pl-12 pr-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-base"
                />
              </div>
              {isSignUp && <p className="text-sm text-zinc-500 mt-2">Password must be at least 6 characters</p>}
            </div>

            {/* Additional signup fields */}
            {isSignUp && (
              <>
                <div>
                  <label className="text-white text-base font-medium mb-3 block">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter your phone number"
                      className="w-full pl-12 pr-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-white text-base font-medium mb-3 block">Business Name</label>
                  <div className="relative">
                    <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
                    <input
                      type="text"
                      required
                      value={formData.businessName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, businessName: e.target.value }))}
                      placeholder="Enter your business name"
                      className="w-full pl-12 pr-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-base"
                    />
                  </div>
                </div>

                {/* Terms Acceptance Checkbox */}
                <div className="flex items-start gap-3 mt-4">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    className="mt-1 border-zinc-600 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                  />
                  <label htmlFor="terms" className="text-sm text-zinc-400 leading-relaxed">
                    I have read and agree to the{" "}
                    <Link
                      to="/terms-conditions"
                      target="_blank"
                      className="text-green-500 hover:text-green-400 underline"
                    >
                      Terms & Conditions
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/privacy-policy"
                      target="_blank"
                      className="text-green-500 hover:text-green-400 underline"
                    >
                      Privacy Policy
                    </Link>
                  </label>
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || authLoading}
              className="w-full bg-green-500 text-white py-4 rounded-xl font-semibold text-base hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-8"
            >
              {loading || authLoading
                ? isSignUp
                  ? "Creating Account..."
                  : "Signing In..."
                : isSignUp
                  ? "Create Account"
                  : "Sign In"}
            </button>
          </form>

          {/* Toggle Link */}
          <div className="text-center mt-8">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setTermsAccepted(false);
              }}
              className="text-green-500 hover:text-green-400 text-base font-medium transition-colors"
            >
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
            {isSignUp && (
              <p className="text-sm text-zinc-500 mt-3">After signing up, check your email to verify your account</p>
            )}
            {!isSignUp && (
              <p className="text-sm text-zinc-500 mt-3">Use any email/password to create an account or sign in</p>
            )}
          </div>

          {/* Legal Links Footer */}
          <div className="text-center mt-6 pt-6 border-t border-zinc-800">
            <div className="flex justify-center gap-4 text-sm">
              <Link to="/privacy-policy" className="text-zinc-500 hover:text-zinc-400">
                Privacy Policy
              </Link>
              <span className="text-zinc-700">•</span>
              <Link to="/terms-conditions" className="text-zinc-500 hover:text-zinc-400">
                Terms & Conditions
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
