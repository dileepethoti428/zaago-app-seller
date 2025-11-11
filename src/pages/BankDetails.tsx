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
import { CreditCard, Building, Shield } from 'lucide-react';

interface BankDetails {
  bank_name: string;
  ifsc_code: string;
  account_number: string;
  account_holder_name: string;
  bank_branch: string;
  account_type: string;
  business_name?: string;
  phone?: string;
}

export default function BankDetails() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<BankDetails>({
    bank_name: '',
    ifsc_code: '',
    account_number: '',
    account_holder_name: '',
    bank_branch: '',
    account_type: 'savings',
    business_name: '',
    phone: ''
  });

  useEffect(() => {
    if (!user) return;
    
    // Check if bank details already exist
    const fetchBankDetails = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('sellers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setFormData({
            bank_name: data.bank_name || '',
            ifsc_code: data.ifsc_code || '',
            account_number: data.account_number || '',
            account_holder_name: data.account_holder_name || '',
            bank_branch: data.bank_branch || '',
            account_type: data.account_type || 'savings',
            business_name: data.business_name || '',
            phone: data.phone || ''
          });

          // If bank details are complete, redirect to products
          if (data.bank_name && data.ifsc_code && data.account_number && data.account_holder_name) {
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

  const validateForm = () => {
    const { bank_name, ifsc_code, account_number, account_holder_name } = formData;
    
    if (!bank_name || bank_name.length < 2) {
      toast({
        variant: "destructive",
        title: "Invalid Bank Name",
        description: "Bank name must be at least 2 characters long."
      });
      return false;
    }

    if (!ifsc_code || ifsc_code.length !== 11) {
      toast({
        variant: "destructive",
        title: "Invalid IFSC Code",
        description: "IFSC code must be exactly 11 characters long."
      });
      return false;
    }

    if (!account_number || account_number.length < 8) {
      toast({
        variant: "destructive",
        title: "Invalid Account Number",
        description: "Account number must be at least 8 characters long."
      });
      return false;
    }

    if (!account_holder_name || account_holder_name.length < 2) {
      toast({
        variant: "destructive",
        title: "Invalid Account Holder Name",
        description: "Account holder name must be at least 2 characters long."
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      // Update bank details without changing approval_status
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
          phone: formData.phone
          // DO NOT include approval_status here
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Check approval status before navigating
      const { data: sellerData } = await supabase
        .from('sellers')
        .select('approval_status')
        .eq('user_id', user.id)
        .single();

      toast({
        title: "Bank Details Saved",
        description: sellerData?.approval_status === 'approved' 
          ? "Your bank details have been saved successfully. You can now start selling!"
          : "Your application is under review. You'll be notified once approved."
      });

      if (sellerData?.approval_status === 'approved') {
        navigate('/products');
      } else {
        navigate('/pending-approval');
      }
    } catch (error) {
      console.error('Error saving bank details:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save bank details. Please try again."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    toast({
      title: "Bank Details Skipped",
      description: "You can add your bank details later in Settings to receive payouts."
    });
    navigate('/products');
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
              <div className="p-3 rounded-full bg-primary/10">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Building className="h-6 w-6 text-primary" />
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl text-foreground">Bank Details Setup</CardTitle>
            <CardDescription className="text-muted-foreground">
              Add your bank details to receive payouts from your sales. This information is encrypted and secure.
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
                    <Input
                      id="business_name"
                      value={formData.business_name}
                      onChange={(e) => handleInputChange('business_name', e.target.value)}
                      placeholder="Your Business Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Bank Account Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="account_holder_name">Account Holder Name *</Label>
                    <Input
                      id="account_holder_name"
                      value={formData.account_holder_name}
                      onChange={(e) => handleInputChange('account_holder_name', e.target.value)}
                      placeholder="Full name as per bank records"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="account_number">Account Number *</Label>
                    <Input
                      id="account_number"
                      value={formData.account_number}
                      onChange={(e) => handleInputChange('account_number', e.target.value)}
                      placeholder="Account number"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="ifsc_code">IFSC Code *</Label>
                    <Input
                      id="ifsc_code"
                      value={formData.ifsc_code}
                      onChange={(e) => handleInputChange('ifsc_code', e.target.value.toUpperCase())}
                      placeholder="ABCD0123456"
                      maxLength={11}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="account_type">Account Type *</Label>
                    <Select
                      value={formData.account_type}
                      onValueChange={(value) => handleInputChange('account_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="current">Current</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="bank_name">Bank Name *</Label>
                    <Input
                      id="bank_name"
                      value={formData.bank_name}
                      onChange={(e) => handleInputChange('bank_name', e.target.value)}
                      placeholder="State Bank of India"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="bank_branch">Branch Name/Address</Label>
                    <Input
                      id="bank_branch"
                      value={formData.bank_branch}
                      onChange={(e) => handleInputChange('bank_branch', e.target.value)}
                      placeholder="Branch location"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? 'Saving...' : 'Save Bank Details'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkip}
                  className="flex-1"
                >
                  Skip for Now
                </Button>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                <Shield className="h-4 w-4 inline mr-2" />
                Your bank details are encrypted and stored securely. We use this information only for processing payouts.
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}