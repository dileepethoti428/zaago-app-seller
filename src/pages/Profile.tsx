import { motion } from 'framer-motion';
import { User, Building, Phone, MapPin, Mail, Camera, Save, Edit, Store, HelpCircle, MessageCircle, ChevronRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  default_address: any | null;
  notification_preferences: any | null;
  created_at: string;
  updated_at: string;
  // Optional extended fields that may not exist in all profiles
  business_name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  bio?: string | null;
  business_type?: string | null;
  gst_number?: string | null;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    business_name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    bio: '',
    business_type: 'grocery',
    gst_number: '',
  });

  const fetchProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Upsert seller profile to ensure it exists
      // Check if seller profile exists first by email (unique constraint)
      const { data: existingSeller } = await supabase
        .from('sellers')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      let sellerData;
      let upsertError;

      if (existingSeller) {
        // Update existing seller record
        const { data, error } = await supabase
          .from('sellers')
          .update({
            user_id: user.id, // Make sure user_id is set
            name: user.email?.split('@')[0] || 'User',
          })
          .eq('email', user.email)
          .select()
          .single();
        sellerData = data;
        upsertError = error;
      } else {
        // Insert new seller
        const { data, error } = await supabase
          .from('sellers')
          .insert({
            user_id: user.id,
            email: user.email || '',
            name: user.email?.split('@')[0] || 'User',
          })
          .select()
          .single();
        sellerData = data;
        upsertError = error;
      }

      if (upsertError) {
        console.error('Error upserting seller profile:', upsertError);
        toast({
          title: "Error",
          description: "Failed to create/fetch seller profile",
          variant: "destructive",
        });
        return;
      }

      // Also check regular profile for full_name
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      setProfile(sellerData as any);
      setFormData({
        full_name: profileData?.full_name || sellerData.name || '',
        business_name: sellerData.business_name || '',
        phone: sellerData.phone || '',
        address: typeof sellerData.address === 'string' ? sellerData.address : '',
        city: '',
        state: '',
        pincode: '',
        bio: '',
        business_type: 'grocery',
        gst_number: '',
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      // Update seller profile
      const { error: sellerError } = await supabase
        .from('sellers')
        .update({
          name: formData.full_name,
          business_name: formData.business_name,
          phone: formData.phone,
          address: formData.address,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (sellerError) {
        console.error('Error updating seller profile:', sellerError);
        toast({
          title: "Error",
          description: "Failed to update seller profile",
          variant: "destructive",
        });
        return;
      }

      // Also update regular profile for full_name
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: formData.full_name,
          phone: formData.phone,
        })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      setEditing(false);
      fetchProfile(); // Refresh profile data
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="zaago-card p-8">
          <div className="text-center">
            <p className="text-secondary">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold text-zaago-green flex items-center gap-3">
          <User className="w-8 h-8 text-zaago-green" />
          Seller Profile
        </h1>
        <p className="text-zaago-green-light mt-1">Manage your business information and settings</p>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="zaago-card"
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {formData.full_name || 'Your Name'}
                </h2>
                <p className="text-foreground/80 font-medium">{user?.email}</p>
                <p className="text-sm text-foreground/70 font-medium">
                  {formData.business_name || 'Business Name'}
                </p>
              </div>
            </div>
            <button
              onClick={() => editing ? saveProfile() : setEditing(true)}
              disabled={saving}
              className="zaago-button-primary px-4 py-2 text-sm flex items-center gap-2"
            >
              {editing ? (
                <>
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Personal Information</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Full Name</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <div className="px-4 py-3 bg-muted/30 rounded-2xl text-foreground">
                    {formData.full_name || 'Not set'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Phone Number</label>
                {editing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <div className="px-4 py-3 bg-muted/30 rounded-2xl text-foreground">
                    {formData.phone || 'Not set'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Bio</label>
                {editing ? (
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <div className="px-4 py-3 bg-muted/30 rounded-2xl text-foreground min-h-[80px]">
                    {formData.bio || 'Not set'}
                  </div>
                )}
              </div>
            </div>

            {/* Business Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Business Information</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Business Name</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.business_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                    className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="Enter your business name"
                  />
                ) : (
                  <div className="px-4 py-3 bg-muted/30 rounded-2xl text-foreground">
                    {formData.business_name || 'Not set'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Business Type</label>
                {editing ? (
                  <select
                    value={formData.business_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, business_type: e.target.value }))}
                    className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  >
                    <option value="grocery">Grocery Store</option>
                    <option value="dairy">Dairy Products</option>
                    <option value="vegetables">Vegetables & Fruits</option>
                    <option value="bakery">Bakery</option>
                    <option value="meat">Meat & Seafood</option>
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <div className="px-4 py-3 bg-muted/30 rounded-2xl text-foreground">
                    {formData.business_type || 'Not set'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">GST Number (Optional)</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.gst_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, gst_number: e.target.value }))}
                    className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="Enter GST number"
                  />
                ) : (
                  <div className="px-4 py-3 bg-muted/30 rounded-2xl text-foreground">
                    {formData.gst_number || 'Not set'}
                  </div>
                )}
              </div>
            </div>

            {/* Address Information */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Address Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Address</label>
                  {editing ? (
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      rows={2}
                      className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                      placeholder="Enter your address"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-muted/30 rounded-2xl text-foreground min-h-[60px]">
                      {formData.address || 'Not set'}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">City</label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        placeholder="Enter city"
                      />
                    ) : (
                      <div className="px-4 py-3 bg-muted/30 rounded-2xl text-foreground">
                        {formData.city || 'Not set'}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">State</label>
                      {editing ? (
                        <input
                          type="text"
                          value={formData.state}
                          onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                          className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          placeholder="State"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-muted/30 rounded-2xl text-foreground">
                          {formData.state || 'Not set'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Pincode</label>
                      {editing ? (
                        <input
                          type="text"
                          value={formData.pincode}
                          onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
                          className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          placeholder="Pincode"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-muted/30 rounded-2xl text-foreground">
                          {formData.pincode || 'Not set'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {editing && (
            <div className="mt-6 pt-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditing(false);
                  // Reset form data
                  if (profile) {
                    setFormData({
                      full_name: profile.full_name || '',
                      business_name: (profile as any).business_name || '',
                      phone: profile.phone || '',
                      address: (profile as any).address || '',
                      city: (profile as any).city || '',
                      state: (profile as any).state || '',
                      pincode: (profile as any).pincode || '',
                      bio: (profile as any).bio || '',
                      business_type: (profile as any).business_type || 'grocery',
                      gst_number: (profile as any).gst_number || '',
                    });
                  }
                }}
                className="zaago-button-ghost px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="zaago-button-primary px-6 py-2 text-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Help & Support */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="zaago-card p-6"
      >
        <div className="flex items-center gap-3 mb-1">
          <HelpCircle className="w-6 h-6 text-zaago-green" />
          <h2 className="text-xl font-bold text-foreground">Help & Support</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Get help and contact us</p>

        <div className="space-y-3">
          <a
            href="https://wa.me/917842343642"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-xl bg-zaago-green/10 border border-zaago-green/30 hover:bg-zaago-green/15 transition-colors"
          >
            <MessageCircle className="w-6 h-6 text-zaago-green flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">WhatsApp Support</p>
              <p className="text-sm text-muted-foreground">+91-7842343642</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </a>

          <a
            href="mailto:zaago.online@gmail.com"
            className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border hover:bg-muted/60 transition-colors"
          >
            <Mail className="w-6 h-6 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">Email Support</p>
              <p className="text-sm text-muted-foreground truncate">zaago.online@gmail.com</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </a>

          <a
            href="tel:+917842343642"
            className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border hover:bg-muted/60 transition-colors"
          >
            <Phone className="w-6 h-6 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">Call Support</p>
              <p className="text-sm text-muted-foreground">+91-7842343642</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}