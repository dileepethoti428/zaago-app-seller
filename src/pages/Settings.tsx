import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { 
  User, 
  CreditCard, 
  Bell, 
  Shield, 
  Store,
  Save,
  Edit,
  MessageCircle,
  Mail,
  Smartphone,
  Palette,
  Monitor,
  Sun,
  Moon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { NotificationSoundSettings } from '@/components/NotificationSoundSettings';

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
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
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
        return;
      }

      // Fetch seller business info
      const { data: sellerData, error: sellerError } = await supabase
        .from('sellers')
        .select('business_name, business_description')
        .eq('user_id', user.id)
        .maybeSingle();

      if (sellerError && sellerError.code !== 'PGRST116') {
        console.error('Error fetching seller data:', sellerError);
      }

      setProfile({
        full_name: profileData?.full_name || '',
        phone: profileData?.phone || '',
        business_name: (sellerData as any)?.business_name || '',
        business_description: (sellerData as any)?.business_description || '',
        email: user.email || ''
      });
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
          business_name: profile.business_name,
          business_description: profile.business_description,
          bank_name: bankDetails.bank_name,
          account_number: bankDetails.account_number,
          ifsc_code: bankDetails.ifsc_code,
          account_holder_name: bankDetails.account_holder_name,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) {
        throw error;
      }

      toast({
        title: "Details Updated",
        description: "Your bank and business details have been updated successfully.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error updating details:', error);
      toast({
        title: "Error",
        description: "Failed to update details. Please try again.",
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
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zaago-green mb-2">
            Settings
          </h1>
          <p className="text-zaago-green-light text-sm sm:text-base">
            Manage your account settings and preferences
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Edit className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
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
              
              <Button onClick={saveBankDetails} disabled={loading} className="w-full">
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
                <Bell className="w-5 h-5 text-zaago-green" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Notifications Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="w-4 h-4 text-zaago-green" />
                  <h4 className="font-semibold text-foreground">Email Notifications</h4>
                </div>
                
                <div className="space-y-3 pl-6 border-l-2 border-zaago-green/20">
                  <div className="flex items-center justify-between gap-4 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">Order Updates</p>
                      <p className="text-xs text-muted-foreground">Get notified when your orders are processed, shipped, or delivered</p>
                    </div>
                    <Switch
                      checked={notifications.email_orders}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, email_orders: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between gap-4 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">Promotional Offers</p>
                      <p className="text-xs text-muted-foreground">Receive special deals, discounts, and new product announcements</p>
                    </div>
                    <Switch
                      checked={notifications.email_promotions}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, email_promotions: checked }))
                      }
                    />
                  </div>
                </div>
              </div>
              
              {/* Mobile Notifications Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <Smartphone className="w-4 h-4 text-zaago-green" />
                  <h4 className="font-semibold text-foreground">Mobile Notifications</h4>
                </div>
                
                <div className="space-y-3 pl-6 border-l-2 border-zaago-green/20">
                  <div className="flex items-center justify-between gap-4 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">SMS Alerts</p>
                      <p className="text-xs text-muted-foreground">Instant SMS updates for critical order status changes</p>
                    </div>
                    <Switch
                      checked={notifications.sms_orders}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, sms_orders: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between gap-4 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">Push Notifications</p>
                      <p className="text-xs text-muted-foreground">Real-time app notifications for orders and updates</p>
                    </div>
                    <Switch
                      checked={notifications.push_orders}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, push_orders: checked }))
                      }
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gradient-to-r from-zaago-green/5 to-zaago-green/10 border border-zaago-green/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-zaago-green mt-1.5 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-zaago-green-dark mb-1">Stay Connected</p>
                    <p className="text-xs text-muted-foreground">Configure your notification preferences to never miss important updates about your orders and account.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Theme Preferences */}
          <Card className="zaago-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-zaago-green" />
                Theme Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Choose your preferred color scheme for the app
                </p>
                
                <RadioGroup 
                  value={theme} 
                  onValueChange={setTheme}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Monitor className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground text-sm">System</p>
                        <p className="text-xs text-muted-foreground">Follow your device's theme setting</p>
                      </div>
                    </div>
                    <RadioGroupItem value="system" id="system" />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Sun className="w-5 h-5 text-amber-500" />
                      <div>
                        <p className="font-medium text-foreground text-sm">Light</p>
                        <p className="text-xs text-muted-foreground">Bright and clean interface</p>
                      </div>
                    </div>
                    <RadioGroupItem value="light" id="light" />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Moon className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="font-medium text-foreground text-sm">Dark</p>
                        <p className="text-xs text-muted-foreground">Easy on the eyes in low light</p>
                      </div>
                    </div>
                    <RadioGroupItem value="dark" id="dark" />
                  </div>
                </RadioGroup>
              </div>
              
              <div className="mt-6 p-4 bg-gradient-to-r from-zaago-green/5 to-zaago-green/10 border border-zaago-green/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-zaago-green mt-1.5 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-zaago-green-dark mb-1">Theme Changes</p>
                    <p className="text-xs text-muted-foreground">Your theme preference will be saved automatically and applied across the entire app.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Sound Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            <NotificationSoundSettings />
          </motion.div>
        </motion.div>
      </div>

      {/* Floating WhatsApp Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={() => window.open('https://wa.me/917842343642', '_blank')}
          className="w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20BA5A] text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          size="icon"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default Settings;