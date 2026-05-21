import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { compressImage } from '@/lib/imageCompression';
import { CreditCard, Building, Shield, Upload, CheckCircle2, Camera } from 'lucide-react';

interface BankDetails {
  bank_name: string;
  ifsc_code: string;
  account_number: string;
  account_holder_name: string;
  bank_branch: string;
  account_type: string;
  business_name?: string;
  phone?: string;
  aadhaar_number: string;
  pan_number: string;
  fssai_number: string;
}

type DocKey = 'aadhaar_front' | 'aadhaar_back' | 'pan' | 'selfie' | 'fssai';

const docMeta: Record<DocKey, { label: string; column: string; capture?: 'user' }> = {
  aadhaar_front: { label: 'Aadhaar Card (Front)', column: 'aadhaar_front_url' },
  aadhaar_back: { label: 'Aadhaar Card (Back)', column: 'aadhaar_back_url' },
  pan: { label: 'PAN Card', column: 'pan_image_url' },
  fssai: { label: 'FSSAI License', column: 'fssai_license_url' },
  selfie: { label: 'Selfie / Live Photo', column: 'selfie_url', capture: 'user' },
};

export default function BankDetails() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<DocKey | null>(null);
  const [formData, setFormData] = useState<BankDetails>({
    bank_name: '',
    ifsc_code: '',
    account_number: '',
    account_holder_name: '',
    bank_branch: '',
    account_type: 'savings',
    business_name: '',
    phone: '',
    aadhaar_number: '',
    pan_number: '',
    fssai_number: '',
  });
  const [docUrls, setDocUrls] = useState<Record<DocKey, string>>({
    aadhaar_front: '',
    aadhaar_back: '',
    pan: '',
    selfie: '',
    fssai: '',
  });

  useEffect(() => {
    if (!user) return;

    const fetchBankDetails = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('sellers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          const d: any = data;
          setFormData({
            bank_name: d.bank_name || '',
            ifsc_code: d.ifsc_code || '',
            account_number: d.account_number || '',
            account_holder_name: d.account_holder_name || '',
            bank_branch: d.bank_branch || '',
            account_type: d.account_type || 'savings',
            business_name: d.business_name || '',
            phone: d.phone || '',
            aadhaar_number: d.aadhaar_number || '',
            pan_number: d.pan_number || '',
            fssai_number: d.fssai_number || '',
          });
          setDocUrls({
            aadhaar_front: d.aadhaar_front_url || '',
            aadhaar_back: d.aadhaar_back_url || '',
            pan: d.pan_image_url || '',
            selfie: d.selfie_url || '',
            fssai: d.fssai_license_url || '',
          });

          // If already fully submitted and approved, send to products
          if (d.bank_name && d.kyc_submitted_at && d.approval_status === 'approved') {
            navigate('/products');
          }
        }
      } catch (error) {
        console.error('Error fetching bank details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBankDetails();
  }, [user, navigate]);

  const handleInputChange = (field: keyof BankDetails, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpload = async (key: DocKey, file: File) => {
    if (!user) return;
    setUploadingKey(key);
    try {
      const compressed = await compressImage(file);
      const ext = (compressed.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/${key}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('seller-kyc')
        .upload(path, compressed, { upsert: true, contentType: compressed.type });
      if (upErr) throw upErr;
      setDocUrls(prev => ({ ...prev, [key]: path }));
      toast({ title: 'Uploaded', description: `${docMeta[key].label} uploaded.` });
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Upload failed', description: e.message || 'Try again' });
    } finally {
      setUploadingKey(null);
    }
  };

  const validateForm = () => {
    const { bank_name, ifsc_code, account_number, account_holder_name, aadhaar_number, pan_number, fssai_number } = formData;

    if (!bank_name || bank_name.length < 2) {
      toast({ variant: 'destructive', title: 'Invalid Bank Name', description: 'Bank name must be at least 2 characters.' });
      return false;
    }
    if (!ifsc_code || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc_code)) {
      toast({ variant: 'destructive', title: 'Invalid IFSC Code', description: 'Enter a valid 11-character IFSC code.' });
      return false;
    }
    if (!account_number || account_number.length < 8) {
      toast({ variant: 'destructive', title: 'Invalid Account Number', description: 'Account number must be at least 8 digits.' });
      return false;
    }
    if (!account_holder_name || account_holder_name.length < 2) {
      toast({ variant: 'destructive', title: 'Invalid Account Holder Name', description: 'Enter the full name as on the bank account.' });
      return false;
    }
    if (!/^\d{12}$/.test(aadhaar_number)) {
      toast({ variant: 'destructive', title: 'Invalid Aadhaar', description: 'Aadhaar must be exactly 12 digits.' });
      return false;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan_number)) {
      toast({ variant: 'destructive', title: 'Invalid PAN', description: 'PAN must be in format ABCDE1234F.' });
      return false;
    }
    if (!/^\d{14}$/.test(fssai_number)) {
      toast({ variant: 'destructive', title: 'Invalid FSSAI', description: 'FSSAI license must be exactly 14 digits.' });
      return false;
    }
    const required: DocKey[] = ['aadhaar_front', 'aadhaar_back', 'pan', 'selfie', 'fssai'];
    for (const k of required) {
      if (!docUrls[k]) {
        toast({ variant: 'destructive', title: 'Missing document', description: `Please upload ${docMeta[k].label}.` });
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('sellers')
        .update({
          name: formData.account_holder_name || user.email?.split('@')[0] || 'Unknown',
          bank_name: formData.bank_name,
          ifsc_code: formData.ifsc_code,
          account_number: formData.account_number,
          account_holder_name: formData.account_holder_name,
          bank_branch: formData.bank_branch,
          account_type: formData.account_type,
          business_name: formData.business_name,
          phone: formData.phone,
          aadhaar_number: formData.aadhaar_number,
          pan_number: formData.pan_number,
          fssai_number: formData.fssai_number,
          aadhaar_front_url: docUrls.aadhaar_front,
          aadhaar_back_url: docUrls.aadhaar_back,
          pan_image_url: docUrls.pan,
          selfie_url: docUrls.selfie,
          fssai_license_url: docUrls.fssai,
          kyc_submitted_at: new Date().toISOString(),
          kyc_status: 'pending',
        } as any)
        .eq('user_id', user.id);

      if (error) throw error;

      const { data: sellerData } = await supabase
        .from('sellers')
        .select('approval_status')
        .eq('user_id', user.id)
        .single();

      toast({
        title: 'Details Submitted',
        description: sellerData?.approval_status === 'approved'
          ? 'Your details have been saved. You can now start selling!'
          : "Your application and KYC are under review. You'll be notified once approved.",
      });

      if (sellerData?.approval_status === 'approved') {
        navigate('/products');
      } else {
        navigate('/pending-approval');
      }
    } catch (error: any) {
      console.error('Error saving details:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to save details.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const DocUploader = ({ k }: { k: DocKey }) => {
    const uploaded = !!docUrls[k];
    const isUp = uploadingKey === k;
    const meta = docMeta[k];
    return (
      <div className="border border-border rounded-lg p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{meta.label} *</span>
          {uploaded && <CheckCircle2 className="w-4 h-4 text-green-600" />}
        </div>
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            capture={meta.capture}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(k, f);
              e.target.value = '';
            }}
          />
          <div className="flex items-center justify-center gap-2 py-3 px-3 border border-dashed border-border rounded-md text-sm text-muted-foreground hover:bg-muted/50 transition">
            {meta.capture === 'user' ? <Camera className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
            {isUp ? 'Uploading…' : uploaded ? 'Replace file' : meta.capture === 'user' ? 'Take selfie' : 'Choose file'}
          </div>
        </label>
        {uploaded && (
          <p className="text-xs text-muted-foreground truncate">Saved ✓</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="p-3 rounded-full bg-primary/10"><CreditCard className="h-6 w-6 text-primary" /></div>
              <div className="p-3 rounded-full bg-primary/10"><Building className="h-6 w-6 text-primary" /></div>
              <div className="p-3 rounded-full bg-primary/10"><Shield className="h-6 w-6 text-primary" /></div>
            </div>
            <CardTitle className="text-2xl text-foreground">Bank & KYC Details</CardTitle>
            <CardDescription className="text-muted-foreground">
              Complete your bank details and KYC verification. Your application will be reviewed by our team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Business Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Business Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="business_name">Business Name (Optional)</Label>
                    <Input id="business_name" value={formData.business_name}
                      onChange={(e) => handleInputChange('business_name', e.target.value)} placeholder="Your Business Name" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <Input id="phone" value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Bank Account Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="account_holder_name">Account Holder Name *</Label>
                    <Input id="account_holder_name" value={formData.account_holder_name}
                      onChange={(e) => handleInputChange('account_holder_name', e.target.value)}
                      placeholder="Full name as per bank records" required />
                  </div>
                  <div>
                    <Label htmlFor="account_number">Account Number *</Label>
                    <Input id="account_number" value={formData.account_number}
                      onChange={(e) => handleInputChange('account_number', e.target.value)}
                      placeholder="Account number" required />
                  </div>
                  <div>
                    <Label htmlFor="ifsc_code">IFSC Code *</Label>
                    <Input id="ifsc_code" value={formData.ifsc_code}
                      onChange={(e) => handleInputChange('ifsc_code', e.target.value.toUpperCase())}
                      placeholder="ABCD0123456" maxLength={11} required />
                  </div>
                  <div>
                    <Label htmlFor="account_type">Account Type *</Label>
                    <Select value={formData.account_type} onValueChange={(value) => handleInputChange('account_type', value)}>
                      <SelectTrigger><SelectValue placeholder="Select account type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="current">Current</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="bank_name">Bank Name *</Label>
                    <Input id="bank_name" value={formData.bank_name}
                      onChange={(e) => handleInputChange('bank_name', e.target.value)}
                      placeholder="State Bank of India" required />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="bank_branch">Branch Name/Address</Label>
                    <Input id="bank_branch" value={formData.bank_branch}
                      onChange={(e) => handleInputChange('bank_branch', e.target.value)}
                      placeholder="Branch location" />
                  </div>
                </div>
              </div>

              {/* KYC Verification */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">KYC Verification</h3>
                <p className="text-xs text-muted-foreground">All documents are required and will be reviewed by an admin.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="aadhaar_number">Aadhaar Number *</Label>
                    <Input id="aadhaar_number" value={formData.aadhaar_number}
                      onChange={(e) => handleInputChange('aadhaar_number', e.target.value.replace(/\D/g, ''))}
                      placeholder="12-digit Aadhaar" maxLength={12} inputMode="numeric" required />
                  </div>
                  <div>
                    <Label htmlFor="pan_number">PAN Number *</Label>
                    <Input id="pan_number" value={formData.pan_number}
                      onChange={(e) => handleInputChange('pan_number', e.target.value.toUpperCase())}
                      placeholder="ABCDE1234F" maxLength={10} required />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="fssai_number">FSSAI License Number *</Label>
                    <Input id="fssai_number" value={formData.fssai_number}
                      onChange={(e) => handleInputChange('fssai_number', e.target.value.replace(/\D/g, ''))}
                      placeholder="14-digit FSSAI" maxLength={14} inputMode="numeric" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <DocUploader k="aadhaar_front" />
                  <DocUploader k="aadhaar_back" />
                  <DocUploader k="pan" />
                  <DocUploader k="fssai" />
                  <div className="md:col-span-2">
                    <DocUploader k="selfie" />
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={submitting || !!uploadingKey} className="w-full">
                {submitting ? 'Submitting…' : 'Submit for Approval'}
              </Button>

              <div className="text-xs text-muted-foreground text-center">
                <Shield className="h-4 w-4 inline mr-2" />
                Your documents are stored privately and only used for verification and payouts.
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
