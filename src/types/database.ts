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
      comodos: {
        Row: {
          area_m2: number | null;
          descricao: string | null;
          geometria: Json;
          id: string;
          nome: string;
          ordem: number;
          tipo: Database["public"]["Enums"]["tipo_comodo"];
          tipologia_id: string;
        };
        Insert: {
          area_m2?: number | null;
          descricao?: string | null;
          geometria: Json;
          id?: string;
          nome: string;
          ordem?: number;
          tipo?: Database["public"]["Enums"]["tipo_comodo"];
          tipologia_id: string;
        };
        Update: {
          area_m2?: number | null;
          descricao?: string | null;
          geometria?: Json;
          id?: string;
          nome?: string;
          ordem?: number;
          tipo?: Database["public"]["Enums"]["tipo_comodo"];
          tipologia_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comodos_tipologia_id_fkey";
            columns: ["tipologia_id"];
            isOneToOne: false;
            referencedRelation: "tipologias";
            referencedColumns: ["id"];
          },
        ];
      };
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
      eventos: {
        Row: {
          comodo_id: string | null;
          criado_em: string;
          dados: Json;
          empreendimento_id: string;
          id: number;
          sessao_id: string;
          tipo: Database["public"]["Enums"]["tipo_evento"];
          unidade_id: string | null;
        };
        Insert: {
          comodo_id?: string | null;
          criado_em?: string;
          dados?: Json;
          empreendimento_id: string;
          id?: never;
          sessao_id: string;
          tipo: Database["public"]["Enums"]["tipo_evento"];
          unidade_id?: string | null;
        };
        Update: {
          comodo_id?: string | null;
          criado_em?: string;
          dados?: Json;
          empreendimento_id?: string;
          id?: never;
          sessao_id?: string;
          tipo?: Database["public"]["Enums"]["tipo_evento"];
          unidade_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "eventos_comodo_id_fkey";
            columns: ["comodo_id"];
            isOneToOne: false;
            referencedRelation: "comodos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "eventos_empreendimento_id_fkey";
            columns: ["empreendimento_id"];
            isOneToOne: false;
            referencedRelation: "empreendimentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "eventos_unidade_do_mesmo_empreendimento";
            columns: ["unidade_id", "empreendimento_id"];
            isOneToOne: false;
            referencedRelation: "unidades";
            referencedColumns: ["id", "empreendimento_id"];
          },
        ];
      };
      hotspots: {
        Row: {
          comodo_id: string;
          descricao: string | null;
          id: string;
          midia_id: string | null;
          posicao: Json;
          titulo: string;
        };
        Insert: {
          comodo_id: string;
          descricao?: string | null;
          id?: string;
          midia_id?: string | null;
          posicao: Json;
          titulo: string;
        };
        Update: {
          comodo_id?: string;
          descricao?: string | null;
          id?: string;
          midia_id?: string | null;
          posicao?: Json;
          titulo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hotspots_comodo_id_fkey";
            columns: ["comodo_id"];
            isOneToOne: false;
            referencedRelation: "comodos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hotspots_midia_id_fkey";
            columns: ["midia_id"];
            isOneToOne: false;
            referencedRelation: "midias";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          consentimento_em: string;
          consentimento_lgpd: boolean;
          criado_em: string;
          email: string | null;
          empreendimento_id: string;
          id: string;
          mensagem: string | null;
          nome: string;
          origem: string | null;
          sessao_id: string | null;
          status: Database["public"]["Enums"]["status_lead"];
          telefone: string | null;
          unidade_id: string | null;
        };
        Insert: {
          consentimento_em?: string;
          consentimento_lgpd: boolean;
          criado_em?: string;
          email?: string | null;
          empreendimento_id: string;
          id?: string;
          mensagem?: string | null;
          nome: string;
          origem?: string | null;
          sessao_id?: string | null;
          status?: Database["public"]["Enums"]["status_lead"];
          telefone?: string | null;
          unidade_id?: string | null;
        };
        Update: {
          consentimento_em?: string;
          consentimento_lgpd?: boolean;
          criado_em?: string;
          email?: string | null;
          empreendimento_id?: string;
          id?: string;
          mensagem?: string | null;
          nome?: string;
          origem?: string | null;
          sessao_id?: string | null;
          status?: Database["public"]["Enums"]["status_lead"];
          telefone?: string | null;
          unidade_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "leads_empreendimento_id_fkey";
            columns: ["empreendimento_id"];
            isOneToOne: false;
            referencedRelation: "empreendimentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_unidade_do_mesmo_empreendimento";
            columns: ["unidade_id", "empreendimento_id"];
            isOneToOne: false;
            referencedRelation: "unidades";
            referencedColumns: ["id", "empreendimento_id"];
          },
        ];
      };
      midias: {
        Row: {
          caminho_storage: string;
          comodo_id: string | null;
          criado_em: string;
          empreendimento_id: string;
          id: string;
          legenda: string | null;
          ordem: number;
          tipo: Database["public"]["Enums"]["tipo_midia"];
          unidade_id: string | null;
        };
        Insert: {
          caminho_storage: string;
          comodo_id?: string | null;
          criado_em?: string;
          empreendimento_id: string;
          id?: string;
          legenda?: string | null;
          ordem?: number;
          tipo?: Database["public"]["Enums"]["tipo_midia"];
          unidade_id?: string | null;
        };
        Update: {
          caminho_storage?: string;
          comodo_id?: string | null;
          criado_em?: string;
          empreendimento_id?: string;
          id?: string;
          legenda?: string | null;
          ordem?: number;
          tipo?: Database["public"]["Enums"]["tipo_midia"];
          unidade_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "midias_comodo_id_fkey";
            columns: ["comodo_id"];
            isOneToOne: false;
            referencedRelation: "comodos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "midias_empreendimento_id_fkey";
            columns: ["empreendimento_id"];
            isOneToOne: false;
            referencedRelation: "empreendimentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "midias_unidade_do_mesmo_empreendimento";
            columns: ["unidade_id", "empreendimento_id"];
            isOneToOne: false;
            referencedRelation: "unidades";
            referencedColumns: ["id", "empreendimento_id"];
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
      tipologias: {
        Row: {
          area_privativa_m2: number | null;
          atualizado_em: string;
          banheiros: number;
          criado_em: string;
          empreendimento_id: string;
          id: string;
          nome: string;
          planta: Json;
          planta_imagem_url: string | null;
          quartos: number;
          suites: number;
          vagas: number;
        };
        Insert: {
          area_privativa_m2?: number | null;
          atualizado_em?: string;
          banheiros?: number;
          criado_em?: string;
          empreendimento_id: string;
          id?: string;
          nome: string;
          planta?: Json;
          planta_imagem_url?: string | null;
          quartos?: number;
          suites?: number;
          vagas?: number;
        };
        Update: {
          area_privativa_m2?: number | null;
          atualizado_em?: string;
          banheiros?: number;
          criado_em?: string;
          empreendimento_id?: string;
          id?: string;
          nome?: string;
          planta?: Json;
          planta_imagem_url?: string | null;
          quartos?: number;
          suites?: number;
          vagas?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tipologias_empreendimento_id_fkey";
            columns: ["empreendimento_id"];
            isOneToOne: false;
            referencedRelation: "empreendimentos";
            referencedColumns: ["id"];
          },
        ];
      };
      unidades: {
        Row: {
          andar: number;
          atualizado_em: string;
          criado_em: string;
          empreendimento_id: string;
          exibir_preco: boolean;
          id: string;
          numero: string;
          observacoes: string | null;
          posicao_no_andar: number;
          preco: number | null;
          preco_publico: number | null;
          status: Database["public"]["Enums"]["status_unidade"];
          tipologia_id: string | null;
        };
        Insert: {
          andar: number;
          atualizado_em?: string;
          criado_em?: string;
          empreendimento_id: string;
          exibir_preco?: boolean;
          id?: string;
          numero: string;
          observacoes?: string | null;
          posicao_no_andar: number;
          preco?: number | null;
          preco_publico?: number | null;
          status?: Database["public"]["Enums"]["status_unidade"];
          tipologia_id?: string | null;
        };
        Update: {
          andar?: number;
          atualizado_em?: string;
          criado_em?: string;
          empreendimento_id?: string;
          exibir_preco?: boolean;
          id?: string;
          numero?: string;
          observacoes?: string | null;
          posicao_no_andar?: number;
          preco?: number | null;
          preco_publico?: number | null;
          status?: Database["public"]["Enums"]["status_unidade"];
          tipologia_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "unidades_empreendimento_id_fkey";
            columns: ["empreendimento_id"];
            isOneToOne: false;
            referencedRelation: "empreendimentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unidades_tipologia_do_mesmo_empreendimento";
            columns: ["tipologia_id", "empreendimento_id"];
            isOneToOne: false;
            referencedRelation: "tipologias";
            referencedColumns: ["id", "empreendimento_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      registrar_envio: {
        Args: {
          p_chave: string;
          p_escopo: string;
          p_janela_segundos: number;
          p_limite: number;
        };
        Returns: boolean;
      };
      resumo_visitas: { Args: { p_ate: string; p_de: string }; Returns: Json };
      salvar_comodos: {
        Args: { p_comodos: Json; p_tipologia_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      status_lead:
        "novo" | "em_contato" | "visita_agendada" | "ganho" | "perdido";
      status_publicacao: "rascunho" | "publicado" | "arquivado";
      status_unidade: "disponivel" | "reservado" | "vendido";
      tipo_comodo:
        | "sala"
        | "quarto"
        | "suite"
        | "cozinha"
        | "banheiro"
        | "varanda"
        | "lavanderia"
        | "outro";
      tipo_empreendimento: "predio" | "casa";
      tipo_evento:
        | "abriu_tour"
        | "abriu_unidade"
        | "viu_comodo"
        | "clicou_whatsapp"
        | "enviou_lead"
        | "caminhou"
        | "saiu";
      tipo_midia: "foto" | "panorama_360" | "video" | "splat";
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
      status_lead: [
        "novo",
        "em_contato",
        "visita_agendada",
        "ganho",
        "perdido",
      ],
      status_publicacao: ["rascunho", "publicado", "arquivado"],
      status_unidade: ["disponivel", "reservado", "vendido"],
      tipo_comodo: [
        "sala",
        "quarto",
        "suite",
        "cozinha",
        "banheiro",
        "varanda",
        "lavanderia",
        "outro",
      ],
      tipo_empreendimento: ["predio", "casa"],
      tipo_evento: [
        "abriu_tour",
        "abriu_unidade",
        "viu_comodo",
        "clicou_whatsapp",
        "enviou_lead",
        "caminhou",
        "saiu",
      ],
      tipo_midia: ["foto", "panorama_360", "video", "splat"],
    },
  },
} as const;
