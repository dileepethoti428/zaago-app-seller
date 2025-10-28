import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ProductSuggestion {
  id: string;
  user_id: string;
  product_name: string;
  description: string;
  category?: string;
  estimated_price_range?: string;
  additional_notes?: string;
  image_url?: string;
  suggested_images?: string[];
  status: 'pending' | 'reviewed' | 'approved' | 'rejected';
  admin_notes?: string;
  customer_latitude?: number;
  customer_longitude?: number;
  customer_location?: any;
  distance_km?: number;
  created_at: string;
  updated_at: string;
}

export const useProductSuggestions = () => {
  const [loading, setLoading] = useState(false);

  const fetchUserSuggestions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_suggestions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProductSuggestion[];
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }
  };

  const fetchAllSuggestions = async (status?: string) => {
    try {
      let query = supabase
        .from('product_suggestions')
        .select('*')
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProductSuggestion[];
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }
  };

  const fetchSuggestionsInRange = async (
    sellerLat: number,
    sellerLon: number,
    status?: string,
    maxDistance = 15
  ) => {
    try {
      const { data, error } = await supabase.rpc('get_suggestions_within_range', {
        seller_lat: sellerLat,
        seller_lon: sellerLon,
        range_km: maxDistance,
      });

      if (error) throw error;

      let filteredData = data as ProductSuggestion[];
      
      if (status && status !== 'all') {
        filteredData = filteredData.filter(s => s.status === status);
      }

      return filteredData;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }
  };

  const uploadImages = async (files: File[], userId: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('product-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      } catch (error: any) {
        console.error('Error uploading image:', error);
        toast({
          title: 'Image upload failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    }

    return uploadedUrls;
  };

  const submitSuggestion = async (
    suggestion: Omit<ProductSuggestion, 'id' | 'created_at' | 'updated_at' | 'status'>,
    images: File[]
  ) => {
    setLoading(true);
    try {
      // CRITICAL: Validate location data before submission
      if (!suggestion.customer_latitude || !suggestion.customer_longitude) {
        console.error('❌ Cannot submit suggestion without location data:', suggestion);
        toast({
          title: 'Location Required',
          description: 'Please enable location to submit suggestions',
          variant: 'destructive',
        });
        return false;
      }

      console.log('✅ Location validated:', {
        latitude: suggestion.customer_latitude,
        longitude: suggestion.customer_longitude,
        location: suggestion.customer_location,
      });

      let imageUrls: string[] = [];
      
      if (images.length > 0) {
        imageUrls = await uploadImages(images, suggestion.user_id);
      }

      const dataToInsert = {
        ...suggestion,
        suggested_images: imageUrls,
        status: 'pending' as const,
      };

      console.log('📤 Inserting suggestion into database:', dataToInsert);

      const { error } = await supabase
        .from('product_suggestions')
        .insert(dataToInsert);

      if (error) {
        console.error('❌ Database insert error:', error);
        throw error;
      }

      console.log('✅ Suggestion submitted successfully');

      toast({
        title: 'Success!',
        description: 'Your product suggestion has been submitted.',
      });

      return true;
    } catch (error: any) {
      console.error('❌ Submit suggestion error:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateSuggestionStatus = async (
    id: string,
    status: 'approved' | 'rejected' | 'reviewed',
    adminNotes?: string
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('product_suggestions')
        .update({
          status,
          admin_notes: adminNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Suggestion ${status}`,
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteSuggestion = async (id: string, imageUrls?: string[]) => {
    setLoading(true);
    try {
      if (imageUrls && imageUrls.length > 0) {
        for (const url of imageUrls) {
          const path = url.split('/product-images/')[1];
          if (path) {
            await supabase.storage.from('product-images').remove([path]);
          }
        }
      }

      const { error } = await supabase
        .from('product_suggestions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Suggestion deleted',
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    fetchUserSuggestions,
    fetchAllSuggestions,
    fetchSuggestionsInRange,
    submitSuggestion,
    updateSuggestionStatus,
    deleteSuggestion,
  };
};
