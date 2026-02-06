export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      alerts: {
        Row: {
          acknowledged: boolean | null;
          alert_date: string;
          created_at: string | null;
          created_by: string | null;
          id: string;
          inventory_unit_id: string;
          kitchen_id: string;
          type: string;
        };
        Insert: {
          acknowledged?: boolean | null;
          alert_date: string;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          inventory_unit_id: string;
          kitchen_id: string;
          type: string;
        };
        Update: {
          acknowledged?: boolean | null;
          alert_date?: string;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          inventory_unit_id?: string;
          kitchen_id?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_inventory_unit_id_fkey";
            columns: ["inventory_unit_id"];
            isOneToOne: false;
            referencedRelation: "inventory";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_kitchen_id_fkey";
            columns: ["kitchen_id"];
            isOneToOne: false;
            referencedRelation: "kitchens";
            referencedColumns: ["id"];
          },
        ];
      };
      ingredients_catalog: {
        Row: {
          aisle: string | null;
          badges: Json | null;
          brand: string | null;
          category: string | null;
          id: string;
          image_url: string | null;
          last_synced_at: string | null;
          name: string;
          nutrition: Json | null;
          possible_units: string[] | null;
          raw: Json | null;
          spoonacular_id: number;
        };
        Insert: {
          aisle?: string | null;
          badges?: Json | null;
          brand?: string | null;
          category?: string | null;
          id?: string;
          image_url?: string | null;
          last_synced_at?: string | null;
          name: string;
          nutrition?: Json | null;
          possible_units?: string[] | null;
          raw?: Json | null;
          spoonacular_id: number;
        };
        Update: {
          aisle?: string | null;
          badges?: Json | null;
          brand?: string | null;
          category?: string | null;
          id?: string;
          image_url?: string | null;
          last_synced_at?: string | null;
          name?: string;
          nutrition?: Json | null;
          possible_units?: string[] | null;
          raw?: Json | null;
          spoonacular_id?: number;
        };
        Relationships: [];
      };
      inventory: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          expires_at: string | null;
          id: string;
          item_id: string;
          kitchen_id: string;
          line_total: number | null;
          location_id: string | null;
          notes: string | null;
          opened_at: string | null;
          purchased_at: string | null;
          quantity: number | null;
          receipt_item_id: string | null;
          source: string | null;
          unit_id: string | null;
          unit_price: number | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          item_id: string;
          kitchen_id: string;
          line_total?: number | null;
          location_id?: string | null;
          notes?: string | null;
          opened_at?: string | null;
          purchased_at?: string | null;
          quantity?: number | null;
          receipt_item_id?: string | null;
          source?: string | null;
          unit_id?: string | null;
          unit_price?: number | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          item_id?: string;
          kitchen_id?: string;
          line_total?: number | null;
          location_id?: string | null;
          notes?: string | null;
          opened_at?: string | null;
          purchased_at?: string | null;
          quantity?: number | null;
          receipt_item_id?: string | null;
          source?: string | null;
          unit_id?: string | null;
          unit_price?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_kitchen_id_fkey";
            columns: ["kitchen_id"];
            isOneToOne: false;
            referencedRelation: "kitchens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_receipt_item_id_fkey";
            columns: ["receipt_item_id"];
            isOneToOne: false;
            referencedRelation: "receipt_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
        ];
      };
      items: {
        Row: {
          aisle: string | null;
          barcode: string | null;
          brand: string | null;
          category: string | null;
          created_at: string | null;
          created_by: string | null;
          default_shelf_life_days: number | null;
          id: string;
          image_url: string | null;
          ingredient_catalog_id: string | null;
          is_archived: boolean | null;
          kitchen_id: string;
          name: string;
          notes: string | null;
          spoonacular_ingredient_id: number | null;
          updated_at: string;
        };
        Insert: {
          aisle?: string | null;
          barcode?: string | null;
          brand?: string | null;
          category?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          default_shelf_life_days?: number | null;
          id?: string;
          image_url?: string | null;
          ingredient_catalog_id?: string | null;
          is_archived?: boolean | null;
          kitchen_id: string;
          name: string;
          notes?: string | null;
          spoonacular_ingredient_id?: number | null;
          updated_at?: string;
        };
        Update: {
          aisle?: string | null;
          barcode?: string | null;
          brand?: string | null;
          category?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          default_shelf_life_days?: number | null;
          id?: string;
          image_url?: string | null;
          ingredient_catalog_id?: string | null;
          is_archived?: boolean | null;
          kitchen_id?: string;
          name?: string;
          notes?: string | null;
          spoonacular_ingredient_id?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "items_ingredient_catalog_id_fkey";
            columns: ["ingredient_catalog_id"];
            isOneToOne: false;
            referencedRelation: "ingredients_catalog";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "items_kitchen_id_fkey";
            columns: ["kitchen_id"];
            isOneToOne: false;
            referencedRelation: "kitchens";
            referencedColumns: ["id"];
          },
        ];
      };
      kitchen_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          kitchen_id: string;
          role: string;
          token: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by: string;
          kitchen_id: string;
          role?: string;
          token?: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          kitchen_id?: string;
          role?: string;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "household_invitations_household_id_fkey";
            columns: ["kitchen_id"];
            isOneToOne: false;
            referencedRelation: "kitchens";
            referencedColumns: ["id"];
          },
        ];
      };
      kitchen_members: {
        Row: {
          accepted_at: string | null;
          created_by: string | null;
          invited_at: string | null;
          invited_by: string | null;
          joined_at: string | null;
          kitchen_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_by?: string | null;
          invited_at?: string | null;
          invited_by?: string | null;
          joined_at?: string | null;
          kitchen_id: string;
          role?: string;
          user_id: string;
        };
        Update: {
          accepted_at?: string | null;
          created_by?: string | null;
          invited_at?: string | null;
          invited_by?: string | null;
          joined_at?: string | null;
          kitchen_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey";
            columns: ["kitchen_id"];
            isOneToOne: false;
            referencedRelation: "kitchens";
            referencedColumns: ["id"];
          },
        ];
      };
      kitchens: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          icon_key: string;
          id: string;
          name: string;
          owner_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          icon_key?: string;
          id?: string;
          name: string;
          owner_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          icon_key?: string;
          id?: string;
          name?: string;
          owner_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          created_at: string;
          icon: string | null;
          id: string;
          is_default: boolean | null;
          kitchen_id: string;
          name: string;
          sort_order: number | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          icon?: string | null;
          id?: string;
          is_default?: boolean | null;
          kitchen_id: string;
          name: string;
          sort_order?: number | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          icon?: string | null;
          id?: string;
          is_default?: boolean | null;
          kitchen_id?: string;
          name?: string;
          sort_order?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "locations_kitchen_id_fkey";
            columns: ["kitchen_id"];
            isOneToOne: false;
            referencedRelation: "kitchens";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string | null;
          first_name: string | null;
          full_name: string | null;
          id: string;
          last_name: string | null;
          onboarding_complete: boolean | null;
          sex: string | null;
          updated_at: string;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string | null;
          first_name?: string | null;
          full_name?: string | null;
          id: string;
          last_name?: string | null;
          onboarding_complete?: boolean | null;
          sex?: string | null;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string | null;
          first_name?: string | null;
          full_name?: string | null;
          id?: string;
          last_name?: string | null;
          onboarding_complete?: boolean | null;
          sex?: string | null;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      receipt_items: {
        Row: {
          barcode: string | null;
          brand: string | null;
          id: string;
          item_id: string | null;
          line_total: number | null;
          matched_item_id: string | null;
          name: string;
          parsed_confidence: number | null;
          quantity: number | null;
          receipt_id: string;
          unit_id: string | null;
          unit_price: number | null;
        };
        Insert: {
          barcode?: string | null;
          brand?: string | null;
          id?: string;
          item_id?: string | null;
          line_total?: number | null;
          matched_item_id?: string | null;
          name: string;
          parsed_confidence?: number | null;
          quantity?: number | null;
          receipt_id: string;
          unit_id?: string | null;
          unit_price?: number | null;
        };
        Update: {
          barcode?: string | null;
          brand?: string | null;
          id?: string;
          item_id?: string | null;
          line_total?: number | null;
          matched_item_id?: string | null;
          name?: string;
          parsed_confidence?: number | null;
          quantity?: number | null;
          receipt_id?: string;
          unit_id?: string | null;
          unit_price?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "receipt_items_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receipt_items_matched_item_id_fkey";
            columns: ["matched_item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receipt_items_receipt_id_fkey";
            columns: ["receipt_id"];
            isOneToOne: false;
            referencedRelation: "receipts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receipt_items_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
        ];
      };
      receipts: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          currency: string | null;
          external_id: string | null;
          id: string;
          kitchen_id: string;
          merchant_name: string | null;
          purchased_at: string | null;
          raw_upload_path: string | null;
          source: string | null;
          subtotal: number | null;
          tax: number | null;
          total: number | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          currency?: string | null;
          external_id?: string | null;
          id?: string;
          kitchen_id: string;
          merchant_name?: string | null;
          purchased_at?: string | null;
          raw_upload_path?: string | null;
          source?: string | null;
          subtotal?: number | null;
          tax?: number | null;
          total?: number | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          currency?: string | null;
          external_id?: string | null;
          id?: string;
          kitchen_id?: string;
          merchant_name?: string | null;
          purchased_at?: string | null;
          raw_upload_path?: string | null;
          source?: string | null;
          subtotal?: number | null;
          tax?: number | null;
          total?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "receipts_kitchen_id_fkey";
            columns: ["kitchen_id"];
            isOneToOne: false;
            referencedRelation: "kitchens";
            referencedColumns: ["id"];
          },
        ];
      };
      recipe_cache: {
        Row: {
          cache_key: string;
          created_at: string | null;
          expires_at: string | null;
          id: string;
          results: Json;
        };
        Insert: {
          cache_key: string;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          results: Json;
        };
        Update: {
          cache_key?: string;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          results?: Json;
        };
        Relationships: [];
      };
      recipes_catalog: {
        Row: {
          cuisines: string[] | null;
          diets: string[] | null;
          id: string;
          image_url: string | null;
          ingredients: Json | null;
          last_synced_at: string | null;
          nutrition: Json | null;
          raw: Json | null;
          ready_in_minutes: number | null;
          servings: number | null;
          source_url: string | null;
          spoonacular_id: number;
          summary: string | null;
          title: string;
        };
        Insert: {
          cuisines?: string[] | null;
          diets?: string[] | null;
          id?: string;
          image_url?: string | null;
          ingredients?: Json | null;
          last_synced_at?: string | null;
          nutrition?: Json | null;
          raw?: Json | null;
          ready_in_minutes?: number | null;
          servings?: number | null;
          source_url?: string | null;
          spoonacular_id: number;
          summary?: string | null;
          title: string;
        };
        Update: {
          cuisines?: string[] | null;
          diets?: string[] | null;
          id?: string;
          image_url?: string | null;
          ingredients?: Json | null;
          last_synced_at?: string | null;
          nutrition?: Json | null;
          raw?: Json | null;
          ready_in_minutes?: number | null;
          servings?: number | null;
          source_url?: string | null;
          spoonacular_id?: number;
          summary?: string | null;
          title?: string;
        };
        Relationships: [];
      };
      units: {
        Row: {
          abbreviation: string | null;
          id: string;
          name: string;
          type: string;
        };
        Insert: {
          abbreviation?: string | null;
          id?: string;
          name: string;
          type: string;
        };
        Update: {
          abbreviation?: string | null;
          id?: string;
          name?: string;
          type?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          allergens: string[] | null;
          cuisine_dislikes: string[] | null;
          cuisine_likes: string[] | null;
          default_kitchen_id: string | null;
          dietary_preferences: string[] | null;
          email_opt_in: boolean | null;
          locale: string | null;
          notification_prefs: Json | null;
          personalization_opt_in: boolean | null;
          push_opt_in: boolean | null;
          timezone: string | null;
          units_system: string | null;
          user_id: string;
        };
        Insert: {
          allergens?: string[] | null;
          cuisine_dislikes?: string[] | null;
          cuisine_likes?: string[] | null;
          default_kitchen_id?: string | null;
          dietary_preferences?: string[] | null;
          email_opt_in?: boolean | null;
          locale?: string | null;
          notification_prefs?: Json | null;
          personalization_opt_in?: boolean | null;
          push_opt_in?: boolean | null;
          timezone?: string | null;
          units_system?: string | null;
          user_id: string;
        };
        Update: {
          allergens?: string[] | null;
          cuisine_dislikes?: string[] | null;
          cuisine_likes?: string[] | null;
          default_kitchen_id?: string | null;
          dietary_preferences?: string[] | null;
          email_opt_in?: boolean | null;
          locale?: string | null;
          notification_prefs?: Json | null;
          personalization_opt_in?: boolean | null;
          push_opt_in?: boolean | null;
          timezone?: string | null;
          units_system?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_default_kitchen_id_fkey";
            columns: ["default_kitchen_id"];
            isOneToOne: false;
            referencedRelation: "kitchens";
            referencedColumns: ["id"];
          },
        ];
      };
      user_saved_recipes: {
        Row: {
          cooked: boolean | null;
          cooked_at: string | null;
          created_at: string | null;
          id: string;
          image_url: string | null;
          recipe_id: string;
          recipes_catalog_id: string | null;
          saved: boolean | null;
          source_url: string | null;
          spoonacular_recipe_id: number | null;
          title: string;
          user_id: string | null;
        };
        Insert: {
          cooked?: boolean | null;
          cooked_at?: string | null;
          created_at?: string | null;
          id?: string;
          image_url?: string | null;
          recipe_id: string;
          recipes_catalog_id?: string | null;
          saved?: boolean | null;
          source_url?: string | null;
          spoonacular_recipe_id?: number | null;
          title: string;
          user_id?: string | null;
        };
        Update: {
          cooked?: boolean | null;
          cooked_at?: string | null;
          created_at?: string | null;
          id?: string;
          image_url?: string | null;
          recipe_id?: string;
          recipes_catalog_id?: string | null;
          saved?: boolean | null;
          source_url?: string | null;
          spoonacular_recipe_id?: number | null;
          title?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_saved_recipes_recipes_catalog_id_fkey";
            columns: ["recipes_catalog_id"];
            isOneToOne: false;
            referencedRelation: "recipes_catalog";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      auth_is_kitchen_member: {
        Args: { p_kitchen_id: string };
        Returns: boolean;
      };
      cascade_delete_user_data: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      create_default_kitchen_for_user: {
        Args: { p_email: string; p_full_name: string; p_user_id: string };
        Returns: string;
      };
      flag_expired_inventory: { Args: never; Returns: undefined };
      flag_inventory_alerts: { Args: never; Returns: undefined };
      flag_soon_expiring_inventory: { Args: never; Returns: undefined };
      is_member_of: { Args: { k: string }; Returns: boolean };
      set_default_kitchen_if_missing: {
        Args: { p_kitchen_id: string; p_user_id: string };
        Returns: undefined;
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
      sync_profile_from_auth_for_user: {
        Args: { p_email: string; p_metadata: Json; p_user_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
