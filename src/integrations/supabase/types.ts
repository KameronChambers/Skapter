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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agent_rules: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          text: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          text: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          text?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          checkout_url: string | null
          conversation_id: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          job_date: string | null
          job_kind: string | null
          job_time: string | null
          lat: number | null
          lng: number | null
          price: number | null
          reservation_id: string | null
          service_id: string | null
          size: string | null
          starts_at: string | null
          status: string
          title: string | null
          zip: string | null
        }
        Insert: {
          checkout_url?: string | null
          conversation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          job_date?: string | null
          job_kind?: string | null
          job_time?: string | null
          lat?: number | null
          lng?: number | null
          price?: number | null
          reservation_id?: string | null
          service_id?: string | null
          size?: string | null
          starts_at?: string | null
          status?: string
          title?: string | null
          zip?: string | null
        }
        Update: {
          checkout_url?: string | null
          conversation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          job_date?: string | null
          job_kind?: string | null
          job_time?: string | null
          lat?: number | null
          lng?: number | null
          price?: number | null
          reservation_id?: string | null
          service_id?: string | null
          size?: string | null
          starts_at?: string | null
          status?: string
          title?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          address: string | null
          agent_status: string | null
          agent_unread: boolean | null
          category: string
          channel: string
          created_at: string | null
          customer_id: string | null
          external_id: string | null
          flag_note: string | null
          flagged: boolean | null
          id: string
          last_message_at: string | null
          name: string | null
          preferred_contact: string | null
          purchases: Json | null
          tags: string[] | null
          unread: boolean | null
        }
        Insert: {
          address?: string | null
          agent_status?: string | null
          agent_unread?: boolean | null
          category?: string
          channel?: string
          created_at?: string | null
          customer_id?: string | null
          external_id?: string | null
          flag_note?: string | null
          flagged?: boolean | null
          id?: string
          last_message_at?: string | null
          name?: string | null
          preferred_contact?: string | null
          purchases?: Json | null
          tags?: string[] | null
          unread?: boolean | null
        }
        Update: {
          address?: string | null
          agent_status?: string | null
          agent_unread?: boolean | null
          category?: string
          channel?: string
          created_at?: string | null
          customer_id?: string | null
          external_id?: string | null
          flag_note?: string | null
          flagged?: boolean | null
          id?: string
          last_message_at?: string | null
          name?: string | null
          preferred_contact?: string | null
          purchases?: Json | null
          tags?: string[] | null
          unread?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          language: string | null
          name: string
          phone: string | null
          preferred_contact: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          language?: string | null
          name: string
          phone?: string | null
          preferred_contact?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          language?: string | null
          name?: string
          phone?: string | null
          preferred_contact?: string | null
        }
        Relationships: []
      }
      execution_log: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          provider: string
          reason: string | null
          status: string
          summary: string
          tool: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          provider?: string
          reason?: string | null
          status?: string
          summary: string
          tool: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          provider?: string
          reason?: string | null
          status?: string
          summary?: string
          tool?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_log_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          key: string
          label: string
          on_hand: number
          pack_name: string
          pack_price: number
          pack_size: number
          par_packs: number
          seed_on_hand: number
          unit: string
        }
        Insert: {
          key: string
          label: string
          on_hand: number
          pack_name: string
          pack_price?: number
          pack_size: number
          par_packs: number
          seed_on_hand: number
          unit: string
        }
        Update: {
          key?: string
          label?: string
          on_hand?: number
          pack_name?: string
          pack_price?: number
          pack_size?: number
          par_packs?: number
          seed_on_hand?: number
          unit?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string | null
          id: string
          language: string | null
          processed: boolean | null
          sender: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string | null
          id?: string
          language?: string | null
          processed?: boolean | null
          sender: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          language?: string | null
          processed?: boolean | null
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          expires_at: string
          id: string
          items: Json
          service_id: string | null
          size: string | null
          status: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          items: Json
          service_id?: string | null
          size?: string | null
          status?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          items?: Json
          service_id?: string | null
          size?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          duration_minutes: number | null
          id: string
          name: string
          price_l: number
          price_m: number
          price_s: number
          recipe: Json
        }
        Insert: {
          duration_minutes?: number | null
          id: string
          name: string
          price_l: number
          price_m: number
          price_s: number
          recipe: Json
        }
        Update: {
          duration_minutes?: number | null
          id?: string
          name?: string
          price_l?: number
          price_m?: number
          price_s?: number
          recipe?: Json
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string | null
          done: boolean | null
          due_at: string | null
          id: string
          source: string | null
          text: string
        }
        Insert: {
          created_at?: string | null
          done?: boolean | null
          due_at?: string | null
          id?: string
          source?: string | null
          text: string
        }
        Update: {
          created_at?: string | null
          done?: boolean | null
          due_at?: string | null
          id?: string
          source?: string | null
          text?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_reservation: { Args: { p_id: string }; Returns: Json }
      release_reservation: { Args: { p_id: string }; Returns: Json }
      reserve_booking: {
        Args: {
          p_conversation: string
          p_dry_run?: boolean
          p_service: string
          p_size: string
          p_ttl?: number
        }
        Returns: Json
      }
      reset_demo: { Args: never; Returns: undefined }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
