import { ArrowRight, UserPlus, Mail, Lock, Phone, Building, Upload, Camera, CheckCircle2, ChevronLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { registerSellerForPush } from "@/utils/pushNotifications";
import { PushNotifications } from '@capacitor/push-notifications';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';
import { compressImage } from "@/lib/imageCompression";

type DocKey = 'aadhaar_front' | 'aadhaar_back' | 'pan' | 'fssai' | 'selfie';

const docMeta: Record<DocKey, { label: string; column: string; capture?: 'user' }> = {
  aadhaar_front: { label: 'Aadhaar Card (Front)', column: 'aadhaar_front_url' },
  aadhaar_back: { label: 'Aadhaar Card (Back)', column: 'aadhaar_back_url' },
  pan: { label: 'PAN Card', column: 'pan_image_url' },
  fssai: { label: 'FSSAI License', column: 'fssai_license_url' },
  selfie: { label: 'Selfie / Live Photo', column: 'selfie_url', capture: 'user' },
};

export default function LoginPage() {
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [uploadingKey, setUploadingKey] = useState<DocKey | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    phone: "",
    businessName: "",
    // bank
    account_holder_name: "",
    account_number: "",
    ifsc_code: "",
    account_type: "savings",
    bank_name: "",
    bank_branch: "",
    // kyc numbers
    aadhaar_number: "",
    pan_number: "",
    fssai_number: "",
  });

  const [docUrls, setDocUrls] = useState<Record<DocKey, string>>({
    aadhaar_front: '', aadhaar_back: '', pan: '', fssai: '', selfie: '',
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading && !isSignUp) {
      navigate("/");
    }
  }, [user, authLoading, navigate, isSignUp]);

  const checkAndPromptNotificationPermission = async () => {
    try {
      const perm = await PushNotifications.checkPermissions();
      if (perm.receive !== 'granted') {
        await NativeSettings.open({
          optionAndroid: AndroidSettings.ApplicationDetails,
          optionIOS: IOSSettings.App,
        });
      }
    } catch (error) {
      console.log('Capacitor not available, skipping native permission check');
    }
  };

  const setField = (k: string, v: string) => setFormData(prev => ({ ...prev, [k]: v }));

  const validateStep1 = () => {
    if (!formData.email || !formData.password) {
      toast({ title: "Missing Information", description: "Enter email and password.", variant: "destructive" });
      return false;
    }
    if (formData.password.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return false;
    }
    if (!formData.phone || !formData.businessName) {
      toast({ title: "Missing Information", description: "Enter phone number and business name.", variant: "destructive" });
      return false;
    }
    if (!termsAccepted) {
      toast({ title: "Terms Required", description: "Please accept the Terms & Conditions and Privacy Policy.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const { account_holder_name, account_number, ifsc_code, bank_name } = formData;
    if (!account_holder_name || account_holder_name.length < 2) {
      toast({ title: "Invalid Account Holder Name", variant: "destructive" }); return false;
    }
    if (!account_number || account_number.length < 8) {
      toast({ title: "Invalid Account Number", description: "At least 8 digits.", variant: "destructive" }); return false;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc_code)) {
      toast({ title: "Invalid IFSC", description: "Format: ABCD0123456", variant: "destructive" }); return false;
    }
    if (!bank_name || bank_name.length < 2) {
      toast({ title: "Invalid Bank Name", variant: "destructive" }); return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!/^\d{12}$/.test(formData.aadhaar_number)) {
      toast({ title: "Invalid Aadhaar", description: "Must be 12 digits.", variant: "destructive" }); return false;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(formData.pan_number)) {
      toast({ title: "Invalid PAN", description: "Format: ABCDE1234F", variant: "destructive" }); return false;
    }
    if (!/^\d{14}$/.test(formData.fssai_number)) {
      toast({ title: "Invalid FSSAI", description: "Must be 14 digits.", variant: "destructive" }); return false;
    }
    for (const k of Object.keys(docMeta) as DocKey[]) {
      if (!docUrls[k]) {
        toast({ title: "Missing document", description: `Upload ${docMeta[k].label}.`, variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  // Upload to a temporary anon path; we'll move/copy after signup. Since RLS requires auth.uid in path,
  // we instead defer upload until after signUp succeeds. So keep files in memory here.
  const [docFiles, setDocFiles] = useState<Record<DocKey, File | null>>({
    aadhaar_front: null, aadhaar_back: null, pan: null, fssai: null, selfie: null,
  });

  const handlePickFile = async (k: DocKey, file: File) => {
    setUploadingKey(k);
    try {
      const compressed = await compressImage(file);
      setDocFiles(prev => ({ ...prev, [k]: compressed }));
      setDocUrls(prev => ({ ...prev, [k]: URL.createObjectURL(compressed) }));
    } catch (e: any) {
      toast({ title: "File error", description: e.message, variant: "destructive" });
    } finally {
      setUploadingKey(null);
    }
  };

  const uploadAllDocs = async (userId: string): Promise<Record<string, string>> => {
    const paths: Record<string, string> = {};
    for (const k of Object.keys(docMeta) as DocKey[]) {
      const file = docFiles[k];
      if (!file) continue;
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${userId}/${k}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('seller-kyc').upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      paths[docMeta[k].column] = path;
    }
    return paths;
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast({ title: "Missing Information", description: "Please enter both email and password.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await signIn(formData.email, formData.password);
      if (error) throw error;

      const { data: { user: loggedInUser } } = await supabase.auth.getUser();
      if (loggedInUser) {
        const { data: sellerData } = await supabase
          .from('sellers').select('is_deactivated').eq('user_id', loggedInUser.id).maybeSingle();
        if (sellerData?.is_deactivated) {
          await supabase.auth.signOut();
          toast({ title: "Account Deactivated", description: "Your account has been deactivated by admin.", variant: "destructive" });
          setLoading(false); return;
        }
      }

      toast({ title: "Welcome back!", description: "Logged in successfully." });
      await checkAndPromptNotificationPermission();
      try { await PushNotifications.register(); } catch (e) { console.warn("Push register failed:", e); }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await registerSellerForPush(user.id);
      setTimeout(() => navigate("/"), 100);
    } catch (error: any) {
      let msg = error.message;
      if (msg?.includes("Invalid login credentials")) msg = "Invalid email or password.";
      toast({ title: "Login Failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleFinalSignUp = async () => {
    if (!validateStep3()) return;
    setLoading(true);
    try {
      const acceptanceTimestamp = new Date().toISOString();
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
      if (authError) throw authError;

      const newUser = signUpData.user;
      const hasSession = !!signUpData.session;

      if (!newUser) throw new Error("Sign-up failed.");

      if (!hasSession) {
        // Email confirmation required — can't upload now.
        toast({
          title: "Verify your email",
          description: "We sent you a verification link. After verifying, sign in to complete bank & KYC.",
        });
        setIsSignUp(false);
        setStep(1);
        setLoading(false);
        return;
      }

      // Upload docs
      const paths = await uploadAllDocs(newUser.id);

      // Update sellers row (trigger usually creates it on signup; fall back to insert if missing)
      const updatePayload: any = {
        name: formData.account_holder_name || formData.businessName,
        phone: formData.phone,
        business_name: formData.businessName,
        bank_name: formData.bank_name,
        ifsc_code: formData.ifsc_code,
        account_number: formData.account_number,
        account_holder_name: formData.account_holder_name,
        bank_branch: formData.bank_branch,
        account_type: formData.account_type,
        aadhaar_number: formData.aadhaar_number,
        pan_number: formData.pan_number,
        fssai_number: formData.fssai_number,
        ...paths,
        kyc_submitted_at: new Date().toISOString(),
        kyc_status: 'pending',
      };

      const { data: existing } = await supabase
        .from('sellers').select('id').eq('user_id', newUser.id).maybeSingle();

      if (existing) {
        const { error: upErr } = await supabase.from('sellers').update(updatePayload).eq('user_id', newUser.id);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase.from('sellers').insert({ ...updatePayload, user_id: newUser.id, email: formData.email });
        if (insErr) throw insErr;
      }

      toast({ title: "Application Submitted", description: "Your bank and KYC details are under review." });
      navigate('/pending-approval');
    } catch (error: any) {
      console.error("Signup error:", error);
      let msg = error.message;
      if (msg?.includes("User already registered")) {
        msg = "This email is already registered. Try signing in instead.";
        setIsSignUp(false);
      }
      toast({ title: "Sign Up Failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full pl-12 pr-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-base";
  const plainInputCls = "w-full px-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-base";

  const DocUploader = ({ k }: { k: DocKey }) => {
    const uploaded = !!docUrls[k];
    const isUp = uploadingKey === k;
    const meta = docMeta[k];
    return (
      <div className="border border-zinc-700 rounded-xl p-3 bg-zinc-800/40 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white font-medium">{meta.label} *</span>
          {uploaded && <CheckCircle2 className="w-4 h-4 text-green-500" />}
        </div>
        {uploaded && (
          <img src={docUrls[k]} alt={meta.label} className="w-full h-24 object-cover rounded-md" />
        )}
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            capture={meta.capture}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handlePickFile(k, f);
              e.target.value = '';
            }}
          />
          <div className="flex items-center justify-center gap-2 py-2 px-3 border border-dashed border-zinc-600 rounded-md text-sm text-zinc-400 hover:bg-zinc-800 transition">
            {meta.capture === 'user' ? <Camera className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
            {isUp ? 'Processing…' : uploaded ? 'Replace' : meta.capture === 'user' ? 'Take selfie' : 'Choose file'}
          </div>
        </label>
      </div>
    );
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            step >= (s as 1|2|3) ? 'bg-green-500 text-white' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
          }`}>{s}</div>
          {s < 3 && <div className={`w-8 h-0.5 ${step > (s as 1|2|3) ? 'bg-green-500' : 'bg-zinc-700'}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-6">
              <div className="text-green-500">
                {isSignUp ? <UserPlus className="w-12 h-12" /> : <ArrowRight className="w-12 h-12" />}
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{isSignUp ? "Create Account" : "Welcome Back"}</h1>
            <p className="text-zinc-400 text-base">
              {isSignUp ? "Sign up for your Zaago Seller account" : "Sign in to your Zaago Seller account"}
            </p>
          </div>

          {isSignUp && <StepIndicator />}

          {!isSignUp && (
            <form onSubmit={handleSignInSubmit} className="space-y-6">
              <div>
                <label className="text-white text-base font-medium mb-3 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                  <input type="email" required value={formData.email}
                    onChange={(e) => setField('email', e.target.value)}
                    placeholder="Enter your email" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-white text-base font-medium mb-3 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                  <input type="password" required minLength={6} value={formData.password}
                    onChange={(e) => setField('password', e.target.value)}
                    placeholder="Enter your password" className={inputCls} />
                </div>
                <div className="mt-2 text-right">
                  <Link to="/forgot-password" className="text-green-500 hover:text-green-400 text-sm font-medium">Forgot Password?</Link>
                </div>
              </div>
              <button type="submit" disabled={loading || authLoading}
                className="w-full bg-green-500 text-white py-4 rounded-xl font-semibold text-base hover:bg-green-600 transition-all disabled:opacity-50">
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </form>
          )}

          {isSignUp && step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="text-white text-sm font-medium mb-2 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                  <input type="email" value={formData.email}
                    onChange={(e) => setField('email', e.target.value)} placeholder="Enter your email" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-white text-sm font-medium mb-2 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                  <input type="password" minLength={6} value={formData.password}
                    onChange={(e) => setField('password', e.target.value)} placeholder="Enter your password" className={inputCls} />
                </div>
                <p className="text-xs text-zinc-500 mt-2">Password must be at least 6 characters</p>
              </div>
              <div>
                <label className="text-white text-sm font-medium mb-2 block">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                  <input type="tel" value={formData.phone}
                    onChange={(e) => setField('phone', e.target.value)} placeholder="Enter your phone number" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-white text-sm font-medium mb-2 block">Business Name</label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                  <input type="text" value={formData.businessName}
                    onChange={(e) => setField('businessName', e.target.value)} placeholder="Enter your business name" className={inputCls} />
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox id="terms" checked={termsAccepted}
                  onCheckedChange={(c) => setTermsAccepted(c === true)}
                  className="mt-1 border-zinc-600 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" />
                <label htmlFor="terms" className="text-sm text-zinc-400 leading-relaxed">
                  I have read and agree to the{" "}
                  <Link to="/terms-conditions" target="_blank" className="text-green-500 underline">Terms & Conditions</Link>{" "}and{" "}
                  <Link to="/privacy-policy" target="_blank" className="text-green-500 underline">Privacy Policy</Link>
                </label>
              </div>
              <button type="button" onClick={handleNext}
                className="w-full bg-green-500 text-white py-4 rounded-xl font-semibold hover:bg-green-600 transition-all">
                Continue to Bank Details
              </button>
            </div>
          )}

          {isSignUp && step === 2 && (
            <div className="space-y-4">
              <h2 className="text-white font-semibold text-lg">Bank Account Details</h2>
              <div>
                <label className="text-white text-sm mb-2 block">Account Holder Name *</label>
                <input value={formData.account_holder_name}
                  onChange={(e) => setField('account_holder_name', e.target.value)}
                  placeholder="Full name as per bank" className={plainInputCls} />
              </div>
              <div>
                <label className="text-white text-sm mb-2 block">Account Number *</label>
                <input value={formData.account_number}
                  onChange={(e) => setField('account_number', e.target.value)}
                  placeholder="Account number" className={plainInputCls} />
              </div>
              <div>
                <label className="text-white text-sm mb-2 block">IFSC Code *</label>
                <input value={formData.ifsc_code} maxLength={11}
                  onChange={(e) => setField('ifsc_code', e.target.value.toUpperCase())}
                  placeholder="ABCD0123456" className={plainInputCls} />
              </div>
              <div>
                <label className="text-white text-sm mb-2 block">Account Type *</label>
                <select value={formData.account_type}
                  onChange={(e) => setField('account_type', e.target.value)} className={plainInputCls}>
                  <option value="savings">Savings</option>
                  <option value="current">Current</option>
                </select>
              </div>
              <div>
                <label className="text-white text-sm mb-2 block">Bank Name *</label>
                <input value={formData.bank_name}
                  onChange={(e) => setField('bank_name', e.target.value)}
                  placeholder="State Bank of India" className={plainInputCls} />
              </div>
              <div>
                <label className="text-white text-sm mb-2 block">Branch (optional)</label>
                <input value={formData.bank_branch}
                  onChange={(e) => setField('bank_branch', e.target.value)}
                  placeholder="Branch location" className={plainInputCls} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 bg-zinc-800 text-white py-4 rounded-xl font-semibold border border-zinc-700 hover:bg-zinc-700 flex items-center justify-center gap-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button type="button" onClick={handleNext}
                  className="flex-1 bg-green-500 text-white py-4 rounded-xl font-semibold hover:bg-green-600">
                  Continue to KYC
                </button>
              </div>
            </div>
          )}

          {isSignUp && step === 3 && (
            <div className="space-y-4">
              <h2 className="text-white font-semibold text-lg">KYC Verification</h2>
              <p className="text-xs text-zinc-500">All numbers and documents are required for admin approval.</p>

              <div>
                <label className="text-white text-sm mb-2 block">Aadhaar Number *</label>
                <input value={formData.aadhaar_number} maxLength={12} inputMode="numeric"
                  onChange={(e) => setField('aadhaar_number', e.target.value.replace(/\D/g, ''))}
                  placeholder="12-digit Aadhaar" className={plainInputCls} />
              </div>
              <div>
                <label className="text-white text-sm mb-2 block">PAN Number *</label>
                <input value={formData.pan_number} maxLength={10}
                  onChange={(e) => setField('pan_number', e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F" className={plainInputCls} />
              </div>
              <div>
                <label className="text-white text-sm mb-2 block">FSSAI License Number *</label>
                <input value={formData.fssai_number} maxLength={14} inputMode="numeric"
                  onChange={(e) => setField('fssai_number', e.target.value.replace(/\D/g, ''))}
                  placeholder="14-digit FSSAI" className={plainInputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <DocUploader k="aadhaar_front" />
                <DocUploader k="aadhaar_back" />
                <DocUploader k="pan" />
                <DocUploader k="fssai" />
                <div className="col-span-2">
                  <DocUploader k="selfie" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(2)} disabled={loading}
                  className="flex-1 bg-zinc-800 text-white py-4 rounded-xl font-semibold border border-zinc-700 hover:bg-zinc-700 flex items-center justify-center gap-2 disabled:opacity-50">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button type="button" onClick={handleFinalSignUp} disabled={loading || !!uploadingKey}
                  className="flex-1 bg-green-500 text-white py-4 rounded-xl font-semibold hover:bg-green-600 disabled:opacity-50">
                  {loading ? "Submitting…" : "Create Account & Submit"}
                </button>
              </div>
            </div>
          )}

          {/* Toggle Link */}
          <div className="text-center mt-8">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setStep(1);
                setTermsAccepted(false);
              }}
              className="text-green-500 hover:text-green-400 text-base font-medium"
            >
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>

          <div className="text-center mt-6 pt-6 border-t border-zinc-800">
            <div className="flex justify-center gap-4 text-sm">
              <Link to="/privacy-policy" className="text-zinc-500 hover:text-zinc-400">Privacy Policy</Link>
              <span className="text-zinc-700">•</span>
              <Link to="/terms-conditions" className="text-zinc-500 hover:text-zinc-400">Terms & Conditions</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
