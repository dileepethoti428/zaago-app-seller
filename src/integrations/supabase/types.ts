export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      agent_work_sessions: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          session_end: string | null
          session_start: string
          total_hours: number | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          session_end?: string | null
          session_start?: string
          total_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          session_end?: string | null
          session_start?: string
          total_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_work_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "delivery_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      app_ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          review: string | null
          updated_at: string
          user_id: string
          version: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          review?: string | null
          updated_at?: string
          user_id: string
          version?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          review?: string | null
          updated_at?: string
          user_id?: string
          version?: string | null
        }
        Relationships: []
      }
      app_shares: {
        Row: {
          created_at: string
          id: string
          referral_code: string | null
          share_method: string
          shared_to: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code?: string | null
          share_method: string
          shared_to?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string | null
          share_method?: string
          shared_to?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          phone: string | null
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          phone?: string | null
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          phone?: string | null
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      delivery_addresses: {
        Row: {
          city: string
          coordinates: Json
          created_at: string
          full_address: string
          id: string
          is_default: boolean | null
          label: string
          landmark: string | null
          pincode: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city: string
          coordinates: Json
          created_at?: string
          full_address: string
          id?: string
          is_default?: boolean | null
          label: string
          landmark?: string | null
          pincode: string
          state: string
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string
          coordinates?: Json
          created_at?: string
          full_address?: string
          id?: string
          is_default?: boolean | null
          label?: string
          landmark?: string | null
          pincode?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      delivery_agents: {
        Row: {
          agent_id: string
          average_rating: number | null
          created_at: string | null
          deliveries_today: number | null
          email: string
          id: string
          is_active: boolean | null
          is_online: boolean | null
          last_delivery_at: string | null
          last_status_change: string | null
          name: string
          performance_score: number | null
          phone: string | null
          total_deliveries: number | null
          total_earnings: number | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          average_rating?: number | null
          created_at?: string | null
          deliveries_today?: number | null
          email: string
          id?: string
          is_active?: boolean | null
          is_online?: boolean | null
          last_delivery_at?: string | null
          last_status_change?: string | null
          name: string
          performance_score?: number | null
          phone?: string | null
          total_deliveries?: number | null
          total_earnings?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          average_rating?: number | null
          created_at?: string | null
          deliveries_today?: number | null
          email?: string
          id?: string
          is_active?: boolean | null
          is_online?: boolean | null
          last_delivery_at?: string | null
          last_status_change?: string | null
          name?: string
          performance_score?: number | null
          phone?: string | null
          total_deliveries?: number | null
          total_earnings?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_history: {
        Row: {
          agent_id: string
          completed_at: string
          created_at: string
          customer_name: string
          customer_phone: string | null
          customer_rating: number | null
          delivery_address: Json
          delivery_date: string
          delivery_duration: number | null
          delivery_notes: string | null
          delivery_proof: Json | null
          delivery_time_slot: string | null
          distance_traveled: number | null
          id: string
          items: Json
          order_id: string
          payment_method: string | null
          payment_status: string
          special_instructions: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          completed_at?: string
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          customer_rating?: number | null
          delivery_address: Json
          delivery_date: string
          delivery_duration?: number | null
          delivery_notes?: string | null
          delivery_proof?: Json | null
          delivery_time_slot?: string | null
          distance_traveled?: number | null
          id?: string
          items: Json
          order_id: string
          payment_method?: string | null
          payment_status?: string
          special_instructions?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          completed_at?: string
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          customer_rating?: number | null
          delivery_address?: Json
          delivery_date?: string
          delivery_duration?: number | null
          delivery_notes?: string | null
          delivery_proof?: Json | null
          delivery_time_slot?: string | null
          distance_traveled?: number | null
          id?: string
          items?: Json
          order_id?: string
          payment_method?: string | null
          payment_status?: string
          special_instructions?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      delivery_metrics: {
        Row: {
          agent_id: string
          average_delivery_time: number | null
          created_at: string
          customer_rating: number | null
          id: string
          metric_date: string
          successful_deliveries: number
          total_deliveries: number
          total_distance: number
          total_time: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          average_delivery_time?: number | null
          created_at?: string
          customer_rating?: number | null
          id?: string
          metric_date?: string
          successful_deliveries?: number
          total_deliveries?: number
          total_distance?: number
          total_time?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          average_delivery_time?: number | null
          created_at?: string
          customer_rating?: number | null
          id?: string
          metric_date?: string
          successful_deliveries?: number
          total_deliveries?: number
          total_distance?: number
          total_time?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_metrics_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "delivery_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_routes: {
        Row: {
          agent_id: string
          created_at: string
          estimated_duration: number | null
          id: string
          route_data: Json
          route_date: string
          status: string
          total_distance: number | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          estimated_duration?: number | null
          id?: string
          route_data: Json
          route_date?: string
          status?: string
          total_distance?: number | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          estimated_duration?: number | null
          id?: string
          route_data?: Json
          route_date?: string
          status?: string
          total_distance?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_routes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "delivery_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_slots: {
        Row: {
          capacity: number | null
          created_at: string
          end_time: string
          id: string
          is_active: boolean
          slot_name: string
          start_time: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          end_time: string
          id?: string
          is_active?: boolean
          slot_name: string
          start_time: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          slot_name?: string
          start_time?: string
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          created_at: string
          delivery_fee: number
          id: string
          is_active: boolean
          min_order_amount: number
          name: string
          polygon: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_fee?: number
          id?: string
          is_active?: boolean
          min_order_amount?: number
          name: string
          polygon: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_fee?: number
          id?: string
          is_active?: boolean
          min_order_amount?: number
          name?: string
          polygon?: Json
          updated_at?: string
        }
        Relationships: []
      }
      driver_locations: {
        Row: {
          accuracy: number | null
          agent_id: string
          created_at: string
          heading: number | null
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          recorded_at: string
          speed: number | null
        }
        Insert: {
          accuracy?: number | null
          agent_id: string
          created_at?: string
          heading?: number | null
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          recorded_at?: string
          speed?: number | null
        }
        Update: {
          accuracy?: number | null
          agent_id?: string
          created_at?: string
          heading?: number | null
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          recorded_at?: string
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "delivery_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          question: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          order_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          order_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          order_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_qr_codes: {
        Row: {
          created_at: string
          id: string
          is_scanned: boolean
          order_id: string
          qr_code_data: string
          qr_image_url: string | null
          scanned_at: string | null
          scanned_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_scanned?: boolean
          order_id: string
          qr_code_data: string
          qr_image_url?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_scanned?: boolean
          order_id?: string
          qr_code_data?: string
          qr_image_url?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_qr_codes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_qr_codes_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "delivery_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      order_tracking: {
        Row: {
          created_by: string | null
          id: string
          location: Json | null
          notes: string | null
          order_id: string
          status: string
          timestamp: string
        }
        Insert: {
          created_by?: string | null
          id?: string
          location?: Json | null
          notes?: string | null
          order_id: string
          status: string
          timestamp?: string
        }
        Update: {
          created_by?: string | null
          id?: string
          location?: Json | null
          notes?: string | null
          order_id?: string
          status?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_tracking_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "delivery_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: Json
          agent_id: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          delivered: boolean | null
          delivery_date: string | null
          delivery_time_slot: string | null
          id: string
          items: Json
          payment_id: string
          payment_status: string | null
          special_instructions: string | null
          status: string
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address: Json
          agent_id?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          delivered?: boolean | null
          delivery_date?: string | null
          delivery_time_slot?: string | null
          id?: string
          items: Json
          payment_id: string
          payment_status?: string | null
          special_instructions?: string | null
          status?: string
          total: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: Json
          agent_id?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          delivered?: boolean | null
          delivery_date?: string | null
          delivery_time_slot?: string | null
          id?: string
          items?: Json
          payment_id?: string
          payment_status?: string | null
          special_instructions?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "delivery_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_logs: {
        Row: {
          created_at: string
          delivered_at: string | null
          email: string
          error: string | null
          event_type: string
          id: string
          metadata: Json | null
          requested_at: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          email: string
          error?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          requested_at?: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          email?: string
          error?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          requested_at?: string
        }
        Relationships: []
      }
      password_reset_requests: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          is_used: boolean
          reset_key: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          is_used?: boolean
          reset_key: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          reset_key?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          brand: string | null
          created_at: string
          expiry_month: number | null
          expiry_year: number | null
          holder_name: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          last_four: string | null
          metadata: Json | null
          provider: string | null
          provider_payment_method_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          expiry_month?: number | null
          expiry_year?: number | null
          holder_name?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_four?: string | null
          metadata?: Json | null
          provider?: string | null
          provider_payment_method_id?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          expiry_month?: number | null
          expiry_year?: number | null
          holder_name?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_four?: string | null
          metadata?: Json | null
          provider?: string | null
          provider_payment_method_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          benefits: string[] | null
          category_id: string | null
          created_at: string
          description: string | null
          discount_percentage: number | null
          id: string
          image_url: string | null
          images: string[] | null
          ingredients: string[] | null
          is_active: boolean
          name: string
          nutritional_info: Json | null
          price: number
          stock_quantity: number | null
          type: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          benefits?: string[] | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          ingredients?: string[] | null
          is_active?: boolean
          name: string
          nutritional_info?: Json | null
          price: number
          stock_quantity?: number | null
          type?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          benefits?: string[] | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          ingredients?: string[] | null
          is_active?: boolean
          name?: string
          nutritional_info?: Json | null
          price?: number
          stock_quantity?: number | null
          type?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_address: Json | null
          full_name: string | null
          id: string
          notification_preferences: Json | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_address?: Json | null
          full_name?: string | null
          id?: string
          notification_preferences?: Json | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_address?: Json | null
          full_name?: string | null
          id?: string
          notification_preferences?: Json | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string | null
          product_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          product_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          product_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          delivery_days: string[] | null
          end_date: string | null
          id: string
          is_active: boolean
          product_id: string
          quantity: number
          start_date: string
          subscription_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_days?: string[] | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          product_id: string
          quantity?: number
          start_date?: string
          subscription_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_days?: string[] | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          product_id?: string
          quantity?: number
          start_date?: string
          subscription_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          id: string
          message: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          analytics: boolean
          camera_access: boolean
          created_at: string
          data_sharing: string
          delivery_updates: boolean
          id: string
          language: string
          location_services: boolean
          push_notifications: boolean
          route_changes: boolean
          theme: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analytics?: boolean
          camera_access?: boolean
          created_at?: string
          data_sharing?: string
          delivery_updates?: boolean
          id?: string
          language?: string
          location_services?: boolean
          push_notifications?: boolean
          route_changes?: boolean
          theme?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analytics?: boolean
          camera_access?: boolean
          created_at?: string
          data_sharing?: string
          delivery_updates?: boolean
          id?: string
          language?: string
          location_services?: boolean
          push_notifications?: boolean
          route_changes?: boolean
          theme?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_interactions: {
        Row: {
          contact_phone: string
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          message: string
          source_page: string | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          contact_phone?: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          message: string
          source_page?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          contact_phone?: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          message?: string
          source_page?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clear_user_cart: {
        Args: { cart_user_id: string }
        Returns: undefined
      }
      generate_order_qr_code: {
        Args: { order_uuid: string }
        Returns: string
      }
      get_agent_hours_today: {
        Args: { agent_uuid: string }
        Returns: number
      }
      get_agent_profile_with_metrics: {
        Args: { agent_email: string }
        Returns: Json
      }
      get_agent_work_stats: {
        Args: { agent_uuid: string }
        Returns: Json
      }
      get_cart_total: {
        Args: { cart_user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: { user_email: string }
        Returns: boolean
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_admin_v2: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      reset_daily_delivery_counts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      scan_qr_and_deliver_order: {
        Args: { agent_id: string; order_id: string; qr_code_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "agent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "agent"],
    },
  },
} as const
