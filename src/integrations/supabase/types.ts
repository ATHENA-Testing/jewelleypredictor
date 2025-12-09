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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
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
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
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
