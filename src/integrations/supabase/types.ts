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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          target: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target?: string | null
        }
        Relationships: []
      }
      ai_feature_config: {
        Row: {
          active_model: string
          enabled: boolean
          fallback_models: string[]
          feature: string
          id: string
          label: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active_model: string
          enabled?: boolean
          fallback_models?: string[]
          feature: string
          id?: string
          label: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active_model?: string
          enabled?: boolean
          fallback_models?: string[]
          feature?: string
          id?: string
          label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_models: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          label: string
          model_id: string
          notes: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          label: string
          model_id: string
          notes?: string | null
          provider: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string
          model_id?: string
          notes?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          id: string
          key_description: string | null
          key_name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          key_description?: string | null
          key_name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          key_description?: string | null
          key_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      integration_configs: {
        Row: {
          category: string
          config: Json
          enabled: boolean
          id: string
          label: string
          last_tested_at: string | null
          provider_key: string
          secret_last_rotated: string | null
          secret_name: string | null
          secret_set: boolean
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          config?: Json
          enabled?: boolean
          id?: string
          label: string
          last_tested_at?: string | null
          provider_key: string
          secret_last_rotated?: string | null
          secret_name?: string | null
          secret_set?: boolean
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          config?: Json
          enabled?: boolean
          id?: string
          label?: string
          last_tested_at?: string | null
          provider_key?: string
          secret_last_rotated?: string | null
          secret_name?: string | null
          secret_set?: boolean
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      manual_market_rates: {
        Row: {
          id: string
          metal: string
          notes: string | null
          price_per_gram: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          metal: string
          notes?: string | null
          price_per_gram: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          metal?: string
          notes?: string | null
          price_per_gram?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      market_analysis: {
        Row: {
          analysis_text: string
          analysis_type: string
          created_at: string
          id: string
          key_factors: Json | null
          metal: string
          sentiment: string | null
          sources: Json | null
        }
        Insert: {
          analysis_text: string
          analysis_type: string
          created_at?: string
          id?: string
          key_factors?: Json | null
          metal: string
          sentiment?: string | null
          sources?: Json | null
        }
        Update: {
          analysis_text?: string
          analysis_type?: string
          created_at?: string
          id?: string
          key_factors?: Json | null
          metal?: string
          sentiment?: string | null
          sources?: Json | null
        }
        Relationships: []
      }
      metal_predictions: {
        Row: {
          confidence_high: number
          confidence_low: number
          confidence_score: number
          created_at: string
          id: string
          metal: string
          predicted_price: number
          prediction_date: string
          reasoning: string
          sources: Json | null
        }
        Insert: {
          confidence_high: number
          confidence_low: number
          confidence_score: number
          created_at?: string
          id?: string
          metal: string
          predicted_price: number
          prediction_date: string
          reasoning: string
          sources?: Json | null
        }
        Update: {
          confidence_high?: number
          confidence_low?: number
          confidence_score?: number
          created_at?: string
          id?: string
          metal?: string
          predicted_price?: number
          prediction_date?: string
          reasoning?: string
          sources?: Json | null
        }
        Relationships: []
      }
      metal_prices_history: {
        Row: {
          change_percent: number | null
          created_at: string
          id: string
          metal: string
          price_per_gram: number
          price_per_troy_oz: number
          recorded_at: string
        }
        Insert: {
          change_percent?: number | null
          created_at?: string
          id?: string
          metal: string
          price_per_gram: number
          price_per_troy_oz: number
          recorded_at?: string
        }
        Update: {
          change_percent?: number | null
          created_at?: string
          id?: string
          metal?: string
          price_per_gram?: number
          price_per_troy_oz?: number
          recorded_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          account_alerts: boolean
          price_alerts: boolean
          promotions: boolean
          push_enabled: boolean
          reminders: boolean
          security_alerts: boolean
          transaction_alerts: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          account_alerts?: boolean
          price_alerts?: boolean
          promotions?: boolean
          push_enabled?: boolean
          reminders?: boolean
          security_alerts?: boolean
          transaction_alerts?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          account_alerts?: boolean
          price_alerts?: boolean
          promotions?: boolean
          push_enabled?: boolean
          reminders?: boolean
          security_alerts?: boolean
          transaction_alerts?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prediction_learnings: {
        Row: {
          accuracy_percentage: number | null
          actual_price: number | null
          created_at: string
          id: string
          learning_notes: string | null
          match_reasons: string | null
          metal: string
          predicted_price: number
          prediction_date: string
          updated_at: string
        }
        Insert: {
          accuracy_percentage?: number | null
          actual_price?: number | null
          created_at?: string
          id?: string
          learning_notes?: string | null
          match_reasons?: string | null
          metal: string
          predicted_price: number
          prediction_date: string
          updated_at?: string
        }
        Update: {
          accuracy_percentage?: number | null
          actual_price?: number | null
          created_at?: string
          id?: string
          learning_notes?: string | null
          match_reasons?: string | null
          metal?: string
          predicted_price?: number
          prediction_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          condition: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          last_price: number | null
          metal: string
          note: string | null
          target_price: number
          triggered_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          condition: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          last_price?: number | null
          metal: string
          note?: string | null
          target_price: number
          triggered_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          condition?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          last_price?: number | null
          metal?: string
          note?: string | null
          target_price?: number
          triggered_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          referral_code: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          referral_code?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          referral_code?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referee_user_id: string
          referral_code: string
          referrer_user_id: string
          reward_granted_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referee_user_id: string
          referral_code: string
          referrer_user_id: string
          reward_granted_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referee_user_id?: string
          referral_code?: string
          referrer_user_id?: string
          reward_granted_at?: string | null
          status?: string
        }
        Relationships: []
      }
      storage_config: {
        Row: {
          config: Json
          id: string
          is_active: boolean
          label: string
          provider: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          id?: string
          is_active?: boolean
          label: string
          provider: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          id?: string
          is_active?: boolean
          label?: string
          provider?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number
          features_included: Json
          id: string
          is_active: boolean
          metals_included: Json
          name: string
          price_inr: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days: number
          features_included?: Json
          id?: string
          is_active?: boolean
          metals_included?: Json
          name: string
          price_inr?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number
          features_included?: Json
          id?: string
          is_active?: boolean
          metals_included?: Json
          name?: string
          price_inr?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_goals: {
        Row: {
          created_at: string
          goal_name: string
          id: string
          metal: string
          monthly_budget: number | null
          notes: string | null
          target_date: string
          target_grams: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_name: string
          id?: string
          metal: string
          monthly_budget?: number | null
          notes?: string | null
          target_date: string
          target_grams: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_name?: string
          id?: string
          metal?: string
          monthly_budget?: number | null
          notes?: string | null
          target_date?: string
          target_grams?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_holdings: {
        Row: {
          created_at: string
          id: string
          metal: string
          notes: string | null
          purchase_date: string
          purchase_price_per_gram: number
          quantity_grams: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metal: string
          notes?: string | null
          purchase_date?: string
          purchase_price_per_gram: number
          quantity_grams: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metal?: string
          notes?: string | null
          purchase_date?: string
          purchase_price_per_gram?: number
          quantity_grams?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_rewards: {
        Row: {
          created_at: string
          current_streak: number
          last_login_date: string | null
          last_share_at: string | null
          longest_streak: number
          referral_bonus_days: number
          share_bonus_days: number
          share_count: number
          streak_bonus_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          last_login_date?: string | null
          last_share_at?: string | null
          longest_streak?: number
          referral_bonus_days?: number
          share_bonus_days?: number
          share_count?: number
          streak_bonus_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          last_login_date?: string | null
          last_share_at?: string | null
          longest_streak?: number
          referral_bonus_days?: number
          share_bonus_days?: number
          share_count?: number
          streak_bonus_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          amount_paid: number
          created_at: string
          expires_at: string
          id: string
          plan_id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          starts_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          expires_at: string
          id?: string
          plan_id: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          expires_at?: string
          id?: string
          plan_id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_watchlist: {
        Row: {
          city: string | null
          created_at: string
          id: string
          metal: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          metal: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          metal?: string
          user_id?: string
        }
        Relationships: []
      }
      visitor_analytics: {
        Row: {
          device_type: string | null
          id: string
          ip_country: string | null
          page_visited: string
          session_id: string | null
          user_id: string | null
          visited_at: string
        }
        Insert: {
          device_type?: string | null
          id?: string
          ip_country?: string | null
          page_visited?: string
          session_id?: string | null
          user_id?: string | null
          visited_at?: string
        }
        Update: {
          device_type?: string | null
          id?: string
          ip_country?: string | null
          page_visited?: string
          session_id?: string | null
          user_id?: string | null
          visited_at?: string
        }
        Relationships: []
      }
      whatsapp_optins: {
        Row: {
          created_at: string
          last_sent_at: string | null
          metals: Json
          opted_in: boolean
          phone: string
          preferred_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          last_sent_at?: string | null
          metals?: Json
          opted_in?: boolean
          phone: string
          preferred_time?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          last_sent_at?: string | null
          metals?: Json
          opted_in?: boolean
          phone?: string
          preferred_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_revenue_summary: {
        Args: never
        Returns: {
          active_paid: number
          active_trials: number
          expired_users: number
          plan_name: string
          plan_revenue: number
          plan_subscribers: number
          revenue_30d: number
          total_revenue: number
          total_users: number
        }[]
      }
      admin_get_usage_activity: {
        Args: never
        Returns: {
          active_days_30d: number
          email: string
          last_activity_at: string
          last_sign_in_at: string
          page_views_30d: number
          user_id: string
        }[]
      }
      admin_get_user_activity: {
        Args: never
        Returns: {
          amount_paid: number
          days_remaining: number
          email: string
          expires_at: string
          full_name: string
          is_active: boolean
          is_trial: boolean
          plan_name: string
          plan_price: number
          role: string
          signed_up_at: string
          starts_at: string
          subscription_status: string
          user_id: string
        }[]
      }
      admin_platform_analytics: { Args: never; Returns: Json }
      admin_set_user_status: {
        Args: { _suspended: boolean; _user_id: string }
        Returns: boolean
      }
      apply_referral_code: { Args: { _code: string }; Returns: Json }
      claim_share_reward: { Args: never; Returns: Json }
      extend_subscription_days: {
        Args: { _days: number; _user_id: string }
        Returns: undefined
      }
      gen_ref_code: { Args: never; Returns: string }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      record_login_streak: { Args: never; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
