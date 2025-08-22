import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { 
  User, 
  CreditCard, 
  Bell, 
  Shield, 
  Store,
  Save,
  Edit
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    business_name: '',
    business_description: '',
    email: ''
  });
  const [bankDetails, setBankDetails] = useState({
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    account_holder_name: ''
  });
  const [notifications, setNotifications] = useState({
    email_orders: true,
    sms_orders: false,
    push_orders: true,
    email_promotions: false
  });

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchBankDetails();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          phone: data.phone || '',
          business_name: '', // Business info stored in sellers table
          business_description: '', // Business info stored in sellers table
          email: user.email || ''
        });
      } else {
        setProfile(prev => ({ ...prev, email: user.email || '' }));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchBankDetails = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('bank_name, account_number, ifsc_code, account_holder_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching bank details:', error);
        return;
      }

      if (data) {
        setBankDetails({
          bank_name: data.bank_name || '',
          account_number: data.account_number || '',
          ifsc_code: data.ifsc_code || '',
          account_holder_name: data.account_holder_name || ''
        });
      }
    } catch (error) {
      console.error('Error fetching bank details:', error);
    }
  };

  const saveProfile = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: profile.full_name,
          phone: profile.phone,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveBankDetails = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('sellers')
        .upsert({
          user_id: user.id,
          email: user.email || '',
          name: profile.full_name || 'Seller',
          bank_name: bankDetails.bank_name,
          account_number: bankDetails.account_number,
          ifsc_code: bankDetails.ifsc_code,
          account_holder_name: bankDetails.account_holder_name,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Bank Details Updated",
        description: "Your bank details have been updated successfully.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error updating bank details:', error);
      toast({
        title: "Error",
        description: "Failed to update bank details. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Settings
        </h1>
        <p className="text-secondary text-sm sm:text-base">
          Manage your account settings and preferences
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="space-y-6"
        >
          {/* Personal Info */}
          <Card className="zaago-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter your phone number"
                />
              </div>
              
              <Button onClick={saveProfile} disabled={loading} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>

          {/* Business Info */}
          <Card className="zaago-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business_name">Business Name</Label>
                <Input
                  id="business_name"
                  value={profile.business_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, business_name: e.target.value }))}
                  placeholder="Enter your business name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="business_description">Business Description</Label>
                <Textarea
                  id="business_description"
                  value={profile.business_description}
                  onChange={(e) => setProfile(prev => ({ ...prev, business_description: e.target.value }))}
                  placeholder="Describe your business"
                  rows={3}
                />
              </div>
              
              <Button onClick={saveProfile} disabled={loading} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Business Info'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Bank Details & Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="space-y-6"
        >
          {/* Bank Details */}
          <Card className="zaago-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Bank Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  value={bankDetails.bank_name}
                  onChange={(e) => setBankDetails(prev => ({ ...prev, bank_name: e.target.value }))}
                  placeholder="Enter bank name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="account_holder_name">Account Holder Name</Label>
                <Input
                  id="account_holder_name"
                  value={bankDetails.account_holder_name}
                  onChange={(e) => setBankDetails(prev => ({ ...prev, account_holder_name: e.target.value }))}
                  placeholder="Enter account holder name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number</Label>
                <Input
                  id="account_number"
                  value={bankDetails.account_number}
                  onChange={(e) => setBankDetails(prev => ({ ...prev, account_number: e.target.value }))}
                  placeholder="Enter account number"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ifsc_code">IFSC Code</Label>
                <Input
                  id="ifsc_code"
                  value={bankDetails.ifsc_code}
                  onChange={(e) => setBankDetails(prev => ({ ...prev, ifsc_code: e.target.value }))}
                  placeholder="Enter IFSC code"
                />
              </div>
              
              <Button onClick={saveBankDetails} disabled={loading} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Bank Details'}
              </Button>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card className="zaago-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Email Notifications</p>
                  <p className="text-sm text-secondary">Receive order updates via email</p>
                </div>
                <Switch
                  checked={notifications.email_orders}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, email_orders: checked }))
                  }
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">SMS Notifications</p>
                  <p className="text-sm text-secondary">Receive order updates via SMS</p>
                </div>
                <Switch
                  checked={notifications.sms_orders}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, sms_orders: checked }))
                  }
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Push Notifications</p>
                  <p className="text-sm text-secondary">Receive push notifications in the app</p>
                </div>
                <Switch
                  checked={notifications.push_orders}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, push_orders: checked }))
                  }
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Promotional Emails</p>
                  <p className="text-sm text-secondary">Receive promotional offers and updates</p>
                </div>
                <Switch
                  checked={notifications.email_promotions}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, email_promotions: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Settings;