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
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          at: string
          id: string
          metadata: Json
          organization_id: string | null
          reseller_id: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          at?: string
          id?: string
          metadata?: Json
          organization_id?: string | null
          reseller_id?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          at?: string
          id?: string
          metadata?: Json
          organization_id?: string | null
          reseller_id?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      geographic_scopes: {
        Row: {
          created_at: string
          id: string
          level: string
          name: string
          organization_id: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          level: string
          name: string
          organization_id: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          name?: string
          organization_id?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "geographic_scopes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geographic_scopes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "geographic_scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string | null
          rejected_at: string | null
          reseller_id: string | null
          revoked_at: string | null
          role_key: string
          team_id: string | null
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          organization_id?: string | null
          rejected_at?: string | null
          reseller_id?: string | null
          revoked_at?: string | null
          role_key: string
          team_id?: string | null
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string | null
          rejected_at?: string | null
          reseller_id?: string | null
          revoked_at?: string | null
          role_key?: string
          team_id?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_role_key_fkey"
            columns: ["role_key"]
            isOneToOne: false
            referencedRelation: "role_definitions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          geographic_scope_id: string | null
          id: string
          organization_id: string
          role_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          geographic_scope_id?: string | null
          id?: string
          organization_id: string
          role_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          geographic_scope_id?: string | null
          id?: string
          organization_id?: string
          role_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_geographic_scope_id_fkey"
            columns: ["geographic_scope_id"]
            isOneToOne: false
            referencedRelation: "geographic_scopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_role_key_fkey"
            columns: ["role_key"]
            isOneToOne: false
            referencedRelation: "role_definitions"
            referencedColumns: ["key"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          geo_hierarchy_enabled: boolean
          id: string
          name: string
          reseller_id: string | null
          teams_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          geo_hierarchy_enabled?: boolean
          id?: string
          name: string
          reseller_id?: string | null
          teams_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          geo_hierarchy_enabled?: boolean
          id?: string
          name?: string
          reseller_id?: string | null
          teams_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          description: string
          key: string
        }
        Insert: {
          description: string
          key: string
        }
        Update: {
          description?: string
          key?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          organization: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          organization?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          organization?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reseller_client_assignments: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          reseller_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          reseller_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          reseller_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_client_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_client_assignments_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_memberships: {
        Row: {
          created_at: string
          id: string
          reseller_id: string
          role_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reseller_id: string
          role_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reseller_id?: string
          role_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_memberships_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_memberships_role_key_fkey"
            columns: ["role_key"]
            isOneToOne: false
            referencedRelation: "role_definitions"
            referencedColumns: ["key"]
          },
        ]
      }
      resellers: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_definitions: {
        Row: {
          created_at: string
          description: string | null
          key: string
          name: string
          scope: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          name: string
          scope: string
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          name?: string
          scope?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permission_key: string
          role_key: string
        }
        Insert: {
          permission_key: string
          role_key: string
        }
        Update: {
          permission_key?: string
          role_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "role_permissions_role_key_fkey"
            columns: ["role_key"]
            isOneToOne: false
            referencedRelation: "role_definitions"
            referencedColumns: ["key"]
          },
        ]
      }
      team_memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role_key: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role_key: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role_key?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_role_key_fkey"
            columns: ["role_key"]
            isOneToOne: false
            referencedRelation: "role_definitions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          geographic_scope_id: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          geographic_scope_id?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          geographic_scope_id?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_geographic_scope_id_fkey"
            columns: ["geographic_scope_id"]
            isOneToOne: false
            referencedRelation: "geographic_scopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_key_fkey"
            columns: ["role_key"]
            isOneToOne: false
            referencedRelation: "role_definitions"
            referencedColumns: ["key"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_org: { Args: { _org: string; _uid: string }; Returns: boolean }
      can_access_reseller: {
        Args: { _reseller: string; _uid: string }
        Returns: boolean
      }
      has_org_permission: {
        Args: { _org: string; _perm: string; _uid: string }
        Returns: boolean
      }
      has_platform_permission: {
        Args: { _perm: string; _uid: string }
        Returns: boolean
      }
      has_platform_role: {
        Args: { _role: string; _uid: string }
        Returns: boolean
      }
      rg_assign_reseller_staff: {
        Args: { _assign: boolean; _org: string; _user: string }
        Returns: undefined
      }
      rg_audit: {
        Args: {
          _action: string
          _meta?: Json
          _org: string
          _reseller: string
          _target: string
          _type: string
        }
        Returns: undefined
      }
      rg_audit_actions: { Args: never; Returns: string[] }
      rg_audit_list: {
        Args: {
          _action: string
          _from: string
          _limit: number
          _offset: number
          _org: string
          _search: string
          _to: string
        }
        Returns: {
          action: string
          actor_email: string
          actor_id: string
          at: string
          id: string
          metadata: Json
          org_name: string
          organization_id: string
          reseller_id: string
          target_id: string
          target_type: string
          total: number
        }[]
      }
      rg_create_geo: {
        Args: { _level: string; _name: string; _org: string; _parent: string }
        Returns: string
      }
      rg_create_invitation: {
        Args: {
          _email: string
          _org: string
          _reseller: string
          _role: string
          _team: string
        }
        Returns: string
      }
      rg_create_org: {
        Args: { _name: string; _reseller: string }
        Returns: string
      }
      rg_create_reseller: { Args: { _name: string }; Returns: string }
      rg_delete_geo: { Args: { _id: string }; Returns: undefined }
      rg_delete_org: { Args: { _id: string }; Returns: undefined }
      rg_delete_reseller: { Args: { _id: string }; Returns: undefined }
      rg_delete_team: { Args: { _id: string }; Returns: undefined }
      rg_invitation_by_token: {
        Args: { _token: string }
        Returns: {
          email: string
          email_matches: boolean
          id: string
          org_name: string
          reseller_name: string
          role_name: string
          status: string
          team_name: string
        }[]
      }
      rg_my_access: { Args: never; Returns: Json }
      rg_org_people: {
        Args: { _org: string }
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      rg_org_permissions: { Args: { _org: string }; Returns: string[] }
      rg_platform_people: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          platform_roles: string[]
          user_id: string
        }[]
      }
      rg_remove_member: {
        Args: { _org: string; _user: string }
        Returns: undefined
      }
      rg_remove_team_member: {
        Args: { _team: string; _user: string }
        Returns: undefined
      }
      rg_rename_geo: {
        Args: { _id: string; _name: string }
        Returns: undefined
      }
      rg_require: { Args: { _ok: boolean }; Returns: undefined }
      rg_reseller_people: {
        Args: { _reseller: string }
        Returns: {
          email: string
          full_name: string
          role_key: string
          user_id: string
        }[]
      }
      rg_respond_invitation: {
        Args: { _accept: boolean; _token: string }
        Returns: undefined
      }
      rg_revoke_invitation: { Args: { _id: string }; Returns: undefined }
      rg_save_team: {
        Args: { _geo: string; _id: string; _name: string; _org: string }
        Returns: string
      }
      rg_set_org_reseller: {
        Args: { _id: string; _reseller: string }
        Returns: undefined
      }
      rg_set_org_role: {
        Args: {
          _geo: string
          _org: string
          _remove: boolean
          _role: string
          _user: string
        }
        Returns: undefined
      }
      rg_set_platform_role: {
        Args: { _email: string; _remove: boolean; _role: string }
        Returns: undefined
      }
      rg_set_team_member: {
        Args: { _role: string; _team: string; _user: string }
        Returns: undefined
      }
      rg_update_org: {
        Args: { _geo: boolean; _id: string; _name: string; _teams: boolean }
        Returns: undefined
      }
      rg_update_reseller: {
        Args: { _id: string; _name: string }
        Returns: undefined
      }
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
