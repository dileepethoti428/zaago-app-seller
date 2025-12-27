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
  Moon,
  MapPin,
  AlertCircle,
  FileText,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { TestOrderNotification } from '@/components/TestOrderNotification';
import { MapSelector } from '@/components/MapSelector';
import { Link } from 'react-router-dom';


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
  const [sellerLocation, setSellerLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
    address: string;
  }>({ latitude: null, longitude: null, address: '' });
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [hasProducts, setHasProducts] = useState(false);
  const [showLocationWarning, setShowLocationWarning] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchBankDetails();
      fetchSellerLocation();
      checkProducts();
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

  const fetchSellerLocation = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('latitude, longitude, address')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching seller location:', error);
        return;
      }

      if (data) {
        const addressData = data.address as any;
        setSellerLocation({
          latitude: data.latitude,
          longitude: data.longitude,
          address: addressData?.address || ''
        });
      }
    } catch (error) {
      console.error('Error fetching seller location:', error);
    }
  };

  const checkProducts = async () => {
    if (!user?.id) return;

    try {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', user.id);

      if (error) {
        console.error('Error checking products:', error);
        return;
      }

      setHasProducts((count ?? 0) > 0);
    } catch (error) {
      console.error('Error checking products:', error);
    }
  };

  const handleLocationUpdate = async (location: { latitude: number; longitude: number; address: string }) => {
    // If seller has products, show warning first
    if (hasProducts) {
      setPendingLocation(location);
      setShowLocationWarning(true);
      setShowMapSelector(false);
      return;
    }

    // No products, update directly
    await updateLocation(location);
  };

  const updateLocation = async (location: { latitude: number; longitude: number; address: string }) => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('sellers')
        .update({
          latitude: location.latitude,
          longitude: location.longitude,
          address: {
            address: location.address,
            city: '',
            state: '',
            pincode: ''
          },
          location_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setSellerLocation(location);
      setShowMapSelector(false);
      setPendingLocation(null);
      
      toast({
        title: 'Location Updated',
        description: 'Your store location has been updated successfully.',
      });
    } catch (error) {
      console.error('Error updating location:', error);
      toast({
        title: 'Error',
        description: 'Failed to update location. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmLocationChange = async () => {
    if (pendingLocation) {
      await updateLocation(pendingLocation);
      setShowLocationWarning(false);
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

          {/* Store Location */}
          <Card className="zaago-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Store Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Current Location</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {sellerLocation.address || 'No location set'}
                    </p>
                    {sellerLocation.latitude && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Coordinates: {sellerLocation.latitude.toFixed(4)}, {sellerLocation.longitude.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {hasProducts && (
                <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <AlertCircle className="w-4 h-4 mt-0.5 text-orange-600" />
                  <p className="text-xs text-orange-800 dark:text-orange-200">
                    Changing your location will affect which customers can see your products
                  </p>
                </div>
              )}

              <Button 
                onClick={() => setShowMapSelector(true)}
                variant="outline"
                className="w-full"
              >
                <MapPin className="w-4 h-4 mr-2" />
                {sellerLocation.latitude ? 'Change Location' : 'Set Location'}
              </Button>

              <p className="text-xs text-muted-foreground">
                Your products are visible to customers within 15km of your store location
              </p>
            </CardContent>
          </Card>

          {/* Legal Section */}
          <Card className="zaago-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Legal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link 
                to="/privacy-policy" 
                className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Privacy Policy</span>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </Link>
              <Link 
                to="/terms-conditions" 
                className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Terms & Conditions</span>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </Link>
              <p className="text-xs text-muted-foreground mt-2">
                Version 1.0 • Last updated December 27, 2024
              </p>
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
                
                <div className="space-y-3 pl-3 md:pl-6 border-l-2 border-zaago-green/20">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">Order Updates</p>
                      <p className="text-xs text-muted-foreground">Get notified when your orders are processed, shipped, or delivered</p>
                    </div>
                    <div className="flex justify-end sm:justify-start">
                      <Switch
                        checked={notifications.email_orders}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, email_orders: checked }))
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">Promotional Offers</p>
                      <p className="text-xs text-muted-foreground">Receive special deals, discounts, and new product announcements</p>
                    </div>
                    <div className="flex justify-end sm:justify-start">
                      <Switch
                        checked={notifications.email_promotions}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, email_promotions: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mobile Notifications Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <Smartphone className="w-4 h-4 text-zaago-green" />
                  <h4 className="font-semibold text-foreground">Mobile Notifications</h4>
                </div>
                
                <div className="space-y-3 pl-3 md:pl-6 border-l-2 border-zaago-green/20">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">SMS Alerts</p>
                      <p className="text-xs text-muted-foreground">Instant SMS updates for critical order status changes</p>
                    </div>
                    <div className="flex justify-end sm:justify-start">
                      <Switch
                        checked={notifications.sms_orders}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, sms_orders: checked }))
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">Push Notifications</p>
                      <p className="text-xs text-muted-foreground">Real-time app notifications for orders and updates</p>
                    </div>
                    <div className="flex justify-end sm:justify-start">
                      <Switch
                        checked={notifications.push_orders}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, push_orders: checked }))
                        }
                      />
                    </div>
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
                
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <Monitor className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground text-sm">System</p>
                        <p className="text-xs text-muted-foreground">Follow your device's theme setting</p>
                      </div>
                    </div>
                    <div className="flex justify-end sm:justify-start">
                      <button
                        type="button"
                        onClick={() => setTheme("system")}
                        className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${
                          theme === "system"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {theme === "system" ? "Selected" : "Select"}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <Sun className="w-5 h-5 text-amber-500" />
                      <div>
                        <p className="font-medium text-foreground text-sm">Light</p>
                        <p className="text-xs text-muted-foreground">Bright and clean interface</p>
                      </div>
                    </div>
                    <div className="flex justify-end sm:justify-start">
                      <button
                        type="button"
                        onClick={() => setTheme("light")}
                        className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${
                          theme === "light"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {theme === "light" ? "Selected" : "Select"}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <Moon className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="font-medium text-foreground text-sm">Dark</p>
                        <p className="text-xs text-muted-foreground">Easy on the eyes in low light</p>
                      </div>
                    </div>
                    <div className="flex justify-end sm:justify-start">
                      <button
                        type="button"
                        onClick={() => setTheme("dark")}
                        className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${
                          theme === "dark"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {theme === "dark" ? "Selected" : "Select"}
                      </button>
                    </div>
                  </div>
                </div>
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

          {/* Test Order Notification - Admin/Seller Only */}
          <Card className="zaago-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-zaago-green" />
                Developer Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TestOrderNotification />
            </CardContent>
          </Card>

        </motion.div>
      </div>

      {/* Map Selector Dialog */}
      <Dialog open={showMapSelector} onOpenChange={setShowMapSelector}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Select Store Location</DialogTitle>
            <DialogDescription>
              Click on the map to select your store's exact location
            </DialogDescription>
          </DialogHeader>
          <MapSelector
            initialLocation={sellerLocation.latitude && sellerLocation.longitude ? {
              latitude: sellerLocation.latitude,
              longitude: sellerLocation.longitude
            } : undefined}
            onLocationSelect={handleLocationUpdate}
            onClose={() => setShowMapSelector(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Location Change Warning Dialog */}
      <AlertDialog open={showLocationWarning} onOpenChange={setShowLocationWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Location Change</AlertDialogTitle>
            <AlertDialogDescription>
              You have products listed in your store. Changing your location will affect which customers can see your products. 
              Only customers within 15km of your new location will be able to view your products. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingLocation(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLocationChange}>
              Yes, Change Location
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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