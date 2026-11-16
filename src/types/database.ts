export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      empreendimentos: {
        Row: {
          atualizado_em: string;
          capa_url: string | null;
          cidade: string | null;
          construtora: string | null;
          criado_em: string;
          descricao: string | null;
          dono_id: string;
          endereco: string | null;
          id: string;
          informacoes_conferidas_em: string | null;
          latitude: number | null;
          longitude: number | null;
          nome: string;
          numero_andares: number | null;
          previsao_entrega: string | null;
          registro_incorporacao: string | null;
          slug: string;
          status: Database["public"]["Enums"]["status_publicacao"];
          tipo: Database["public"]["Enums"]["tipo_empreendimento"];
          uf: string | null;
          unidades_por_andar: number | null;
        };
        Insert: {
          atualizado_em?: string;
          capa_url?: string | null;
          cidade?: string | null;
          construtora?: string | null;
          criado_em?: string;
          descricao?: string | null;
          dono_id: string;
          endereco?: string | null;
          id?: string;
          informacoes_conferidas_em?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          nome: string;
          numero_andares?: number | null;
          previsao_entrega?: string | null;
          registro_incorporacao?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["status_publicacao"];
          tipo?: Database["public"]["Enums"]["tipo_empreendimento"];
          uf?: string | null;
          unidades_por_andar?: number | null;
        };
        Update: {
          atualizado_em?: string;
          capa_url?: string | null;
          cidade?: string | null;
          construtora?: string | null;
          criado_em?: string;
          descricao?: string | null;
          dono_id?: string;
          endereco?: string | null;
          id?: string;
          informacoes_conferidas_em?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          nome?: string;
          numero_andares?: number | null;
          previsao_entrega?: string | null;
          registro_incorporacao?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["status_publicacao"];
          tipo?: Database["public"]["Enums"]["tipo_empreendimento"];
          uf?: string | null;
          unidades_por_andar?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "empreendimentos_dono_id_fkey";
            columns: ["dono_id"];
            isOneToOne: false;
            referencedRelation: "perfis";
            referencedColumns: ["id"];
          },
        ];
      };
      perfis: {
        Row: {
          avatar_url: string | null;
          cor_marca: string | null;
          creci: string | null;
          criado_em: string;
          id: string;
          logo_url: string | null;
          nome: string;
          notificar_leads_email: boolean;
          whatsapp: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          cor_marca?: string | null;
          creci?: string | null;
          criado_em?: string;
          id: string;
          logo_url?: string | null;
          nome?: string;
          notificar_leads_email?: boolean;
          whatsapp?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          cor_marca?: string | null;
          creci?: string | null;
          criado_em?: string;
          id?: string;
          logo_url?: string | null;
          nome?: string;
          notificar_leads_email?: boolean;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      saude: {
        Row: {
          criado_em: string;
          id: number;
          mensagem: string;
        };
        Insert: {
          criado_em?: string;
          id?: never;
          mensagem: string;
        };
        Update: {
          criado_em?: string;
          id?: never;
          mensagem?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      status_publicacao: "rascunho" | "publicado" | "arquivado";
      tipo_empreendimento: "predio" | "casa";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      status_publicacao: ["rascunho", "publicado", "arquivado"],
      tipo_empreendimento: ["predio", "casa"],
    },
  },
} as const;
