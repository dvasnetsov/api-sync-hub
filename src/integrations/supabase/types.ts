export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      collections: {
        Row: {
          apidog_auto_publish: boolean;
          apidog_delete_unmatched_resources: boolean;
          apidog_endpoint_overwrite_behavior: Database["public"]["Enums"]["apidog_overwrite_behavior"];
          apidog_environment_ids: number[];
          apidog_last_publish_at: string | null;
          apidog_last_publish_message: string | null;
          apidog_last_publish_status: Database["public"]["Enums"]["sync_status"];
          apidog_module_id: number | null;
          apidog_project_id: string | null;
          apidog_publish_project_id: string | null;
          apidog_publish_token: string | null;
          apidog_schema_overwrite_behavior: Database["public"]["Enums"]["apidog_overwrite_behavior"];
          apidog_server_urls: string[];
          apidog_servers: Json;
          apidog_source_module_id: number | null;
          apidog_source_project_id: string | null;
          apidog_source_token: string | null;
          apidog_sync_environments: boolean;
          apidog_sync_markdowns: boolean;
          apidog_target_endpoint_folder_id: number | null;
          apidog_target_schema_folder_id: number | null;
          apidog_token: string | null;
          apidog_update_folder_of_changed_endpoint: boolean;
          bundle_md_size_bytes: number;
          bundle_md_uploaded_at: string | null;
          created_at: string;
          description: string | null;
          endpoints: number;
          export_format: Database["public"]["Enums"]["export_format"];
          id: string;
          last_sync_at: string | null;
          last_sync_status: Database["public"]["Enums"]["sync_status"];
          markdowns: Json;
          name: string;
          oas_version: Database["public"]["Enums"]["oas_version"];
          postman_api_key: string | null;
          postman_auto_publish: boolean;
          postman_collection_id: string | null;
          postman_last_publish_at: string | null;
          postman_last_publish_message: string | null;
          postman_last_publish_status: Database["public"]["Enums"]["sync_status"];
          postman_workspace_id: string | null;
          project_id: string;
          size_bytes: number;
          slug: string;
        };
        Insert: {
          apidog_auto_publish?: boolean;
          apidog_delete_unmatched_resources?: boolean;
          apidog_endpoint_overwrite_behavior?: Database["public"]["Enums"]["apidog_overwrite_behavior"];
          apidog_environment_ids?: number[];
          apidog_last_publish_at?: string | null;
          apidog_last_publish_message?: string | null;
          apidog_last_publish_status?: Database["public"]["Enums"]["sync_status"];
          apidog_module_id?: number | null;
          apidog_project_id?: string | null;
          apidog_publish_project_id?: string | null;
          apidog_publish_token?: string | null;
          apidog_schema_overwrite_behavior?: Database["public"]["Enums"]["apidog_overwrite_behavior"];
          apidog_server_urls?: string[];
          apidog_servers?: Json;
          apidog_source_module_id?: number | null;
          apidog_source_project_id?: string | null;
          apidog_source_token?: string | null;
          apidog_sync_environments?: boolean;
          apidog_sync_markdowns?: boolean;
          apidog_target_endpoint_folder_id?: number | null;
          apidog_target_schema_folder_id?: number | null;
          apidog_token?: string | null;
          apidog_update_folder_of_changed_endpoint?: boolean;
          bundle_md_size_bytes?: number;
          bundle_md_uploaded_at?: string | null;
          created_at?: string;
          description?: string | null;
          endpoints?: number;
          export_format?: Database["public"]["Enums"]["export_format"];
          id?: string;
          last_sync_at?: string | null;
          last_sync_status?: Database["public"]["Enums"]["sync_status"];
          markdowns?: Json;
          name: string;
          oas_version?: Database["public"]["Enums"]["oas_version"];
          postman_api_key?: string | null;
          postman_auto_publish?: boolean;
          postman_collection_id?: string | null;
          postman_last_publish_at?: string | null;
          postman_last_publish_message?: string | null;
          postman_last_publish_status?: Database["public"]["Enums"]["sync_status"];
          postman_workspace_id?: string | null;
          project_id: string;
          size_bytes?: number;
          slug: string;
        };
        Update: {
          apidog_auto_publish?: boolean;
          apidog_delete_unmatched_resources?: boolean;
          apidog_endpoint_overwrite_behavior?: Database["public"]["Enums"]["apidog_overwrite_behavior"];
          apidog_environment_ids?: number[];
          apidog_last_publish_at?: string | null;
          apidog_last_publish_message?: string | null;
          apidog_last_publish_status?: Database["public"]["Enums"]["sync_status"];
          apidog_module_id?: number | null;
          apidog_project_id?: string | null;
          apidog_publish_project_id?: string | null;
          apidog_publish_token?: string | null;
          apidog_schema_overwrite_behavior?: Database["public"]["Enums"]["apidog_overwrite_behavior"];
          apidog_server_urls?: string[];
          apidog_servers?: Json;
          apidog_source_module_id?: number | null;
          apidog_source_project_id?: string | null;
          apidog_source_token?: string | null;
          apidog_sync_environments?: boolean;
          apidog_sync_markdowns?: boolean;
          apidog_target_endpoint_folder_id?: number | null;
          apidog_target_schema_folder_id?: number | null;
          apidog_token?: string | null;
          apidog_update_folder_of_changed_endpoint?: boolean;
          bundle_md_size_bytes?: number;
          bundle_md_uploaded_at?: string | null;
          created_at?: string;
          description?: string | null;
          endpoints?: number;
          export_format?: Database["public"]["Enums"]["export_format"];
          id?: string;
          last_sync_at?: string | null;
          last_sync_status?: Database["public"]["Enums"]["sync_status"];
          markdowns?: Json;
          name?: string;
          oas_version?: Database["public"]["Enums"]["oas_version"];
          postman_api_key?: string | null;
          postman_auto_publish?: boolean;
          postman_collection_id?: string | null;
          postman_last_publish_at?: string | null;
          postman_last_publish_message?: string | null;
          postman_last_publish_status?: Database["public"]["Enums"]["sync_status"];
          postman_workspace_id?: string | null;
          project_id?: string;
          size_bytes?: number;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collections_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      pending_invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          id: string;
          invited_by: string | null;
          project_ids: string[];
          role: Database["public"]["Enums"]["app_role"];
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          invited_by?: string | null;
          project_ids?: string[];
          role?: Database["public"]["Enums"]["app_role"];
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          invited_by?: string | null;
          project_ids?: string[];
          role?: Database["public"]["Enums"]["app_role"];
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          email: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          email: string;
          id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          email?: string;
          id?: string;
        };
        Relationships: [];
      };
      project_members: {
        Row: {
          added_at: string;
          id: string;
          project_id: string;
          user_id: string;
        };
        Insert: {
          added_at?: string;
          id?: string;
          project_id: string;
          user_id: string;
        };
        Update: {
          added_at?: string;
          id?: string;
          project_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          owner_id: string | null;
          slug: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          owner_id?: string | null;
          slug: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string | null;
          slug?: string;
        };
        Relationships: [];
      };
      publish_history: {
        Row: {
          at: string;
          collection_id: string;
          id: string;
          message: string | null;
          status: Database["public"]["Enums"]["sync_status"];
          target: string;
        };
        Insert: {
          at?: string;
          collection_id: string;
          id?: string;
          message?: string | null;
          status: Database["public"]["Enums"]["sync_status"];
          target: string;
        };
        Update: {
          at?: string;
          collection_id?: string;
          id?: string;
          message?: string | null;
          status?: Database["public"]["Enums"]["sync_status"];
          target?: string;
        };
        Relationships: [
          {
            foreignKeyName: "publish_history_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
        ];
      };
      sync_history: {
        Row: {
          at: string;
          collection_id: string;
          endpoints: number;
          id: string;
          message: string | null;
          size_bytes: number;
          source: Database["public"]["Enums"]["sync_source"];
          status: Database["public"]["Enums"]["sync_status"];
        };
        Insert: {
          at?: string;
          collection_id: string;
          endpoints?: number;
          id?: string;
          message?: string | null;
          size_bytes?: number;
          source: Database["public"]["Enums"]["sync_source"];
          status: Database["public"]["Enums"]["sync_status"];
        };
        Update: {
          at?: string;
          collection_id?: string;
          endpoints?: number;
          id?: string;
          message?: string | null;
          size_bytes?: number;
          source?: Database["public"]["Enums"]["sync_source"];
          status?: Database["public"]["Enums"]["sync_status"];
        };
        Relationships: [
          {
            foreignKeyName: "sync_history_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_access_project: {
        Args: { _project_id: string; _user_id: string };
        Returns: boolean;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      apidog_overwrite_behavior:
        | "OVERWRITE_EXISTING"
        | "AUTO_MERGE"
        | "KEEP_EXISTING"
        | "CREATE_NEW";
      app_role: "admin" | "user";
      export_format: "json" | "yaml";
      oas_version: "3.1" | "3.0" | "2.0";
      sync_source: "apidog" | "upload" | "manual";
      sync_status: "idle" | "in_progress" | "success" | "error";
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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    Enums: {
      apidog_overwrite_behavior: [
        "OVERWRITE_EXISTING",
        "AUTO_MERGE",
        "KEEP_EXISTING",
        "CREATE_NEW",
      ],
      app_role: ["admin", "user"],
      export_format: ["json", "yaml"],
      oas_version: ["3.1", "3.0", "2.0"],
      sync_source: ["apidog", "upload", "manual"],
      sync_status: ["idle", "in_progress", "success", "error"],
    },
  },
} as const;
