import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, CreditCard, Shield } from 'lucide-react';

interface BankDetails {
  bank_name: string;
  ifsc_code: string;
  account_number: string;
  account_holder_name: string;
  bank_branch: string;
  account_type: string;
}

const BankDetails = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    bank_name: '',
    ifsc_code: '',
    account_number: '',
    account_holder_name: '',
    bank_branch: '',
    account_type: 'savings'
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Check if user already has bank details
    checkExistingBankDetails();
  }, [user, navigate]);

  const checkExistingBankDetails = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('bank_name, ifsc_code, account_number, account_holder_name, bank_branch, account_type')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking bank details:', error);
        return;
      }

      if (data && data.bank_name) {
        // User already has bank details, redirect to dashboard
        navigate('/products');
      }
    } catch (error) {
      console.error('Error checking bank details:', error);
    }
  };

  const handleInputChange = (field: keyof BankDetails, value: string) => {
    setBankDetails(prev => ({
      ...prev,
      [field]: value.toUpperCase()
    }));
  };

  const validateBankDetails = () => {
    if (!bankDetails.bank_name || bankDetails.bank_name.length < 2) {
      toast({
        title: "Invalid Bank Name",
        description: "Please enter a valid bank name",
        variant: "destructive"
      });
      return false;
    }

    if (!bankDetails.ifsc_code || bankDetails.ifsc_code.length !== 11) {
      toast({
        title: "Invalid IFSC Code",
        description: "IFSC code must be 11 characters long",
        variant: "destructive"
      });
      return false;
    }

    if (!bankDetails.account_number || bankDetails.account_number.length < 8) {
      toast({
        title: "Invalid Account Number",
        description: "Account number must be at least 8 characters long",
        variant: "destructive"
      });
      return false;
    }

    if (!bankDetails.account_holder_name || bankDetails.account_holder_name.length < 2) {
      toast({
        title: "Invalid Account Holder Name",
        description: "Please enter a valid account holder name",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !validateBankDetails()) return;

    setLoading(true);

    try {
      // Try to update existing record first
      const { data: existingSeller, error: fetchError } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingSeller) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('sellers')
          .update({
            ...bankDetails,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        // Insert new record with required fields
        const { error: insertError } = await supabase
          .from('sellers')
          .insert({
            user_id: user.id,
            email: user.email || '',
            name: user.email?.split('@')[0] || 'Seller',
            status: 'active',
            ...bankDetails
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Bank Details Saved",
        description: "Your bank details have been saved successfully!",
        variant: "default"
      });

      // Redirect to products page
      navigate('/products');
    } catch (error: any) {
      console.error('Error saving bank details:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save bank details. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const skipForNow = () => {
    navigate('/products');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border border-border bg-card">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">Bank Details</CardTitle>
              <CardDescription className="text-muted-foreground">
                Add your bank details to receive payments for your sales
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name" className="text-sm font-medium text-foreground">
                  Bank Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bank_name"
                  type="text"
                  placeholder="e.g., STATE BANK OF INDIA"
                  value={bankDetails.bank_name}
                  onChange={(e) => handleInputChange('bank_name', e.target.value)}
                  required
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ifsc_code" className="text-sm font-medium text-foreground">
                  IFSC Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ifsc_code"
                  type="text"
                  placeholder="e.g., SBIN0000123"
                  value={bankDetails.ifsc_code}
                  onChange={(e) => handleInputChange('ifsc_code', e.target.value)}
                  maxLength={11}
                  required
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_number" className="text-sm font-medium text-foreground">
                  Account Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="account_number"
                  type="text"
                  placeholder="Enter your account number"
                  value={bankDetails.account_number}
                  onChange={(e) => handleInputChange('account_number', e.target.value)}
                  required
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_holder_name" className="text-sm font-medium text-foreground">
                  Account Holder Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="account_holder_name"
                  type="text"
                  placeholder="Name as per bank account"
                  value={bankDetails.account_holder_name}
                  onChange={(e) => handleInputChange('account_holder_name', e.target.value)}
                  required
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_branch" className="text-sm font-medium text-foreground">
                  Bank Branch
                </Label>
                <Input
                  id="bank_branch"
                  type="text"
                  placeholder="Branch name/location"
                  value={bankDetails.bank_branch}
                  onChange={(e) => handleInputChange('bank_branch', e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_type" className="text-sm font-medium text-foreground">
                  Account Type
                </Label>
                <Select value={bankDetails.account_type} onValueChange={(value) => handleInputChange('account_type', value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="current">Current</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                <Shield className="w-4 h-4 text-primary" />
                <p className="text-xs text-muted-foreground">
                  Your bank details are encrypted and secure. They will only be used for processing payments.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Bank Details"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={skipForNow}
                >
                  Skip for Now
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default BankDetails;