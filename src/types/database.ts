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
      aog_event: {
        Row: {
          active: boolean
          created_at: string
          id: string
          location: string
          matches: number
          part: string
          reg: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          location: string
          matches?: number
          part: string
          reg: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          location?: string
          matches?: number
          part?: string
          reg?: string
        }
        Relationships: []
      }
      audit_event: {
        Row: {
          actor_id: string | null
          created_at: string
          hash: string
          id: string
          payload: Json
          prev_hash: string | null
          seq: number
          subject_id: string
          type: Database["public"]["Enums"]["audit_event_type"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          hash: string
          id?: string
          payload?: Json
          prev_hash?: string | null
          seq: number
          subject_id: string
          type: Database["public"]["Enums"]["audit_event_type"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          hash?: string
          id?: string
          payload?: Json
          prev_hash?: string | null
          seq?: number
          subject_id?: string
          type?: Database["public"]["Enums"]["audit_event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "audit_event_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute: {
        Row: {
          amount: string
          buyer: string
          days: number
          id: string
          opened_at: string
          reason: string
          resolved_at: string | null
          resolver_id: string | null
          seller: string
          status: Database["public"]["Enums"]["dispute_status"]
          transaction_id: string
        }
        Insert: {
          amount: string
          buyer: string
          days?: number
          id: string
          opened_at?: string
          reason: string
          resolved_at?: string | null
          resolver_id?: string | null
          seller: string
          status?: Database["public"]["Enums"]["dispute_status"]
          transaction_id: string
        }
        Update: {
          amount?: string
          buyer?: string
          days?: number
          id?: string
          opened_at?: string
          reason?: string
          resolved_at?: string | null
          resolver_id?: string | null
          seller?: string
          status?: Database["public"]["Enums"]["dispute_status"]
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_resolver_id_fkey"
            columns: ["resolver_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transaction"
            referencedColumns: ["id"]
          },
        ]
      }
      document: {
        Row: {
          cert: string
          created_at: string
          expires: string | null
          id: string
          issued: string
          name: string
          part_id: string | null
          personnel_id: string | null
          ref_number: string
          status: Database["public"]["Enums"]["document_status"]
          storage_path: string | null
          type: Database["public"]["Enums"]["document_type"]
          updated_at: string
        }
        Insert: {
          cert: string
          created_at?: string
          expires?: string | null
          id?: string
          issued: string
          name: string
          part_id?: string | null
          personnel_id?: string | null
          ref_number: string
          status?: Database["public"]["Enums"]["document_status"]
          storage_path?: string | null
          type: Database["public"]["Enums"]["document_type"]
          updated_at?: string
        }
        Update: {
          cert?: string
          created_at?: string
          expires?: string | null
          id?: string
          issued?: string
          name?: string
          part_id?: string | null
          personnel_id?: string | null
          ref_number?: string
          status?: Database["public"]["Enums"]["document_status"]
          storage_path?: string | null
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "part"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel_public"
            referencedColumns: ["id"]
          },
        ]
      }
      job: {
        Row: {
          accepted: boolean
          accepted_at: string | null
          airline: string
          contractor_id: string | null
          created_at: string
          duration: string
          id: string
          location: string
          match: string
          rate: string
          rating_req: string
          title: string
          urgency: Database["public"]["Enums"]["job_urgency"]
        }
        Insert: {
          accepted?: boolean
          accepted_at?: string | null
          airline: string
          contractor_id?: string | null
          created_at?: string
          duration: string
          id: string
          location: string
          match: string
          rate: string
          rating_req: string
          title: string
          urgency?: Database["public"]["Enums"]["job_urgency"]
        }
        Update: {
          accepted?: boolean
          accepted_at?: string | null
          airline?: string
          contractor_id?: string | null
          created_at?: string
          duration?: string
          id?: string
          location?: string
          match?: string
          rate?: string
          rating_req?: string
          title?: string
          urgency?: Database["public"]["Enums"]["job_urgency"]
        }
        Relationships: [
          {
            foreignKeyName: "job_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "personnel_public"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_application: {
        Row: {
          applicant_id: string | null
          docs: string[]
          id: string
          license: string
          name: string
          reviewed_at: string | null
          reviewer_id: string | null
          risk: Database["public"]["Enums"]["kyc_risk"]
          status: Database["public"]["Enums"]["kyc_status"]
          submitted_at: string
          type: string
        }
        Insert: {
          applicant_id?: string | null
          docs?: string[]
          id: string
          license: string
          name: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          risk?: Database["public"]["Enums"]["kyc_risk"]
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string
          type: string
        }
        Update: {
          applicant_id?: string | null
          docs?: string[]
          id?: string
          license?: string
          name?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          risk?: Database["public"]["Enums"]["kyc_risk"]
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_application_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kyc_application_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      notification: {
        Row: {
          body: string
          created_at: string
          id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          unread: boolean
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          unread?: boolean
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          unread?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      part: {
        Row: {
          aog: boolean
          cert: string
          condition: Database["public"]["Enums"]["part_condition"]
          created_at: string
          id: string
          location: string
          name: string
          pn: string
          price: string
          status: Database["public"]["Enums"]["part_status"]
          supplier: string
          updated_at: string
        }
        Insert: {
          aog?: boolean
          cert: string
          condition?: Database["public"]["Enums"]["part_condition"]
          created_at?: string
          id?: string
          location: string
          name: string
          pn: string
          price: string
          status?: Database["public"]["Enums"]["part_status"]
          supplier: string
          updated_at?: string
        }
        Update: {
          aog?: boolean
          cert?: string
          condition?: Database["public"]["Enums"]["part_condition"]
          created_at?: string
          id?: string
          location?: string
          name?: string
          pn?: string
          price?: string
          status?: Database["public"]["Enums"]["part_status"]
          supplier?: string
          updated_at?: string
        }
        Relationships: []
      }
      personnel: {
        Row: {
          aircraft_category: Database["public"]["Enums"]["aircraft_category"]
          available: boolean
          created_at: string
          discipline: Database["public"]["Enums"]["sacaa_discipline"]
          endorsements: string[]
          expires: string | null
          id: string
          initials: string
          license: string | null
          licence_subtype: string | null
          location: string | null
          medical_class: Database["public"]["Enums"]["medical_class"]
          name: string
          non_licensed_role: string | null
          rate: string | null
          rating: string | null
          role: string | null
          sacaa_part: number | null
          status: Database["public"]["Enums"]["personnel_status"]
          types: string[]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          aircraft_category?: Database["public"]["Enums"]["aircraft_category"]
          available?: boolean
          created_at?: string
          discipline: Database["public"]["Enums"]["sacaa_discipline"]
          endorsements?: string[]
          expires?: string | null
          id?: string
          initials: string
          license?: string | null
          licence_subtype?: string | null
          location?: string | null
          medical_class?: Database["public"]["Enums"]["medical_class"]
          name: string
          non_licensed_role?: string | null
          rate?: string | null
          rating?: string | null
          role?: string | null
          sacaa_part?: number | null
          status?: Database["public"]["Enums"]["personnel_status"]
          types?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          aircraft_category?: Database["public"]["Enums"]["aircraft_category"]
          available?: boolean
          created_at?: string
          discipline?: Database["public"]["Enums"]["sacaa_discipline"]
          endorsements?: string[]
          expires?: string | null
          id?: string
          initials?: string
          license?: string | null
          licence_subtype?: string | null
          location?: string | null
          medical_class?: Database["public"]["Enums"]["medical_class"]
          name?: string
          non_licensed_role?: string | null
          rate?: string | null
          rating?: string | null
          role?: string | null
          sacaa_part?: number | null
          status?: Database["public"]["Enums"]["personnel_status"]
          types?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personnel_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      profile: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["role"]
          stripe_account_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          role?: Database["public"]["Enums"]["role"]
          stripe_account_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["role"]
          stripe_account_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      stripe_processed_event: {
        Row: {
          event_id: string
          event_type: string
          intent_id: string | null
          processed_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          intent_id?: string | null
          processed_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          intent_id?: string | null
          processed_at?: string
        }
        Relationships: []
      }
      transaction: {
        Row: {
          amount: string
          aog: boolean
          application_fee_cents: number | null
          buyer_id: string | null
          created_at: string
          id: string
          item: string
          part_id: string | null
          party: string
          personnel_id: string | null
          seller_id: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          stripe_intent_id: string | null
          stripe_refund_id: string | null
          stripe_transfer_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          amount: string
          aog?: boolean
          application_fee_cents?: number | null
          buyer_id?: string | null
          created_at?: string
          id: string
          item: string
          part_id?: string | null
          party: string
          personnel_id?: string | null
          seller_id?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          stripe_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_transfer_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          amount?: string
          aog?: boolean
          application_fee_cents?: number | null
          buyer_id?: string | null
          created_at?: string
          id?: string
          item?: string
          part_id?: string | null
          party?: string
          personnel_id?: string | null
          seller_id?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          stripe_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_transfer_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "part"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order: {
        Row: {
          aircraft: string
          airline: string
          contractor_id: string | null
          created_at: string
          id: string
          part_used: string
          payout: string
          reference: string
          signed: boolean
          signed_at: string | null
          task: string
        }
        Insert: {
          aircraft: string
          airline: string
          contractor_id?: string | null
          created_at?: string
          id?: string
          part_used: string
          payout: string
          reference: string
          signed?: boolean
          signed_at?: string | null
          task: string
        }
        Update: {
          aircraft?: string
          airline?: string
          contractor_id?: string | null
          created_at?: string
          id?: string
          part_used?: string
          payout?: string
          reference?: string
          signed?: boolean
          signed_at?: string | null
          task?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "personnel_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      personnel_public: {
        Row: {
          aircraft_category: Database["public"]["Enums"]["aircraft_category"] | null
          available: boolean | null
          created_at: string | null
          discipline: Database["public"]["Enums"]["sacaa_discipline"] | null
          endorsements: string[] | null
          id: string | null
          initials: string | null
          licence_subtype: string | null
          location: string | null
          medical_class: Database["public"]["Enums"]["medical_class"] | null
          name: string | null
          non_licensed_role: string | null
          rating: string | null
          role: string | null
          sacaa_part: number | null
          status: Database["public"]["Enums"]["personnel_status"] | null
          types: string[] | null
        }
        Insert: {
          aircraft_category?: Database["public"]["Enums"]["aircraft_category"] | null
          available?: boolean | null
          created_at?: string | null
          discipline?: Database["public"]["Enums"]["sacaa_discipline"] | null
          endorsements?: string[] | null
          id?: string | null
          initials?: string | null
          licence_subtype?: string | null
          location?: string | null
          medical_class?: Database["public"]["Enums"]["medical_class"] | null
          name?: string | null
          non_licensed_role?: string | null
          rating?: string | null
          role?: string | null
          sacaa_part?: number | null
          status?: Database["public"]["Enums"]["personnel_status"] | null
          types?: string[] | null
        }
        Update: {
          aircraft_category?: Database["public"]["Enums"]["aircraft_category"] | null
          available?: boolean | null
          created_at?: string | null
          discipline?: Database["public"]["Enums"]["sacaa_discipline"] | null
          endorsements?: string[] | null
          id?: string | null
          initials?: string | null
          licence_subtype?: string | null
          location?: string | null
          medical_class?: Database["public"]["Enums"]["medical_class"] | null
          name?: string | null
          non_licensed_role?: string | null
          rating?: string | null
          role?: string | null
          sacaa_part?: number | null
          status?: Database["public"]["Enums"]["personnel_status"] | null
          types?: string[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_job: { Args: { p_id: string }; Returns: Json }
      approve_kyc: { Args: { p_id: string }; Returns: Json }
      audit_append: {
        Args: {
          p_actor_id: string
          p_payload: Json
          p_subject_id: string
          p_type: Database["public"]["Enums"]["audit_event_type"]
        }
        Returns: {
          actor_id: string | null
          created_at: string
          hash: string
          id: string
          payload: Json
          prev_hash: string | null
          seq: number
          subject_id: string
          type: Database["public"]["Enums"]["audit_event_type"]
        }
        SetofOptions: {
          from: "*"
          to: "audit_event"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      canonical_jsonb: { Args: { j: Json }; Returns: string }
      compute_event_hash: {
        Args: {
          actor_id: string
          created_at: string
          event_type: string
          payload: Json
          prev_hash: string
          seq: number
          subject_id: string
        }
        Returns: string
      }
      current_app_role: { Args: never; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      invoke_scheduled_function: {
        Args: { p_function_name: string }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      record_transaction_event: {
        Args: {
          p_actor_id: string
          p_event_type: Database["public"]["Enums"]["audit_event_type"]
          p_new_status: Database["public"]["Enums"]["transaction_status"]
          p_payload: Json
          p_transaction_id: string
        }
        Returns: {
          actor_id: string | null
          created_at: string
          hash: string
          id: string
          payload: Json
          prev_hash: string | null
          seq: number
          subject_id: string
          type: Database["public"]["Enums"]["audit_event_type"]
        }
        SetofOptions: {
          from: "*"
          to: "audit_event"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_kyc: { Args: { p_id: string }; Returns: Json }
      resolve_dispute: {
        Args: { p_id: string; p_outcome: string }
        Returns: Json
      }
      sign_rts: { Args: { p_transaction_id: string }; Returns: Json }
      sign_work_order: { Args: { p_reference: string }; Returns: Json }
      verify_chain: {
        Args: never
        Returns: {
          broken_at: number
          reason: string
          total: number
          valid: boolean
        }[]
      }
    }
    Enums: {
      aircraft_category:
        | "aeroplane"
        | "helicopter"
        | "glider"
        | "balloon"
        | "microlight"
        | "gyroplane"
        | "lsa"
        | "rpas"
        | "none"
      audit_event_type:
        | "rts.signed"
        | "funds.released"
        | "funds.refunded"
        | "kyc.approved"
        | "kyc.rejected"
        | "dispute.opened"
        | "dispute.resolved"
      dispute_status: "open" | "released" | "refunded" | "docs"
      document_status: "verified" | "expiring" | "expired"
      document_type:
        | "Personnel Licence"
        | "Release Certificate"
        | "Organisation Cert"
        | "Medical Certificate"
        | "Release to Service"
        | "Import Clearance"
      job_urgency: "aog" | "normal"
      kyc_risk: "low" | "medium" | "high"
      kyc_status: "pending" | "approved" | "rejected"
      medical_class:
        | "class_1"
        | "class_2"
        | "class_3"
        | "class_4"
        | "none"
      notification_type: "aog" | "warning" | "success"
      part_condition: "New" | "Overhauled" | "Serviceable"
      part_status: "verified" | "expiring" | "expired"
      personnel_status: "verified" | "expiring" | "expired" | "pending"
      role: "AME" | "AMO" | "OPERATOR" | "SUPPLIER" | "ADMIN"
      sacaa_discipline:
        | "flight_crew"
        | "national_pilot"
        | "glider_pilot"
        | "balloon_pilot"
        | "rpas_pilot"
        | "flight_engineer"
        | "cabin_crew"
        | "atc"
        | "ame"
        | "aviation_medical"
        | "non_licensed"
      transaction_status: "rts-pending" | "in-escrow" | "completed" | "dispute"
      transaction_type: "Parts" | "Personnel" | "MRO"
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
      audit_event_type: [
        "rts.signed",
        "funds.released",
        "funds.refunded",
        "kyc.approved",
        "kyc.rejected",
        "dispute.opened",
        "dispute.resolved",
      ],
      dispute_status: ["open", "released", "refunded", "docs"],
      document_status: ["verified", "expiring", "expired"],
      document_type: [
        "Personnel Licence",
        "Release Certificate",
        "Organisation Cert",
        "Medical Certificate",
        "Release to Service",
        "Import Clearance",
      ],
      job_urgency: ["aog", "normal"],
      kyc_risk: ["low", "medium", "high"],
      kyc_status: ["pending", "approved", "rejected"],
      notification_type: ["aog", "warning", "success"],
      part_condition: ["New", "Overhauled", "Serviceable"],
      part_status: ["verified", "expiring", "expired"],
      personnel_status: ["verified", "expiring", "expired", "pending"],
      role: ["AME", "AMO", "OPERATOR", "SUPPLIER", "ADMIN"],
      transaction_status: ["rts-pending", "in-escrow", "completed", "dispute"],
      transaction_type: ["Parts", "Personnel", "MRO"],
    },
  },
} as const
