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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      apontamentos_os: {
        Row: {
          atualizado_em: string
          cliente_id: string
          config_id: string | null
          criado_em: string
          data_os: string
          envio_id: string | null
          executante: string
          hora_fim: string
          hora_inicio: string
          horas_executadas: number
          id: string
          observacoes: string | null
          status_os: string
          tarefa: string
          ticket: string | null
          usuario_id: string | null
        }
        Insert: {
          atualizado_em?: string
          cliente_id: string
          config_id?: string | null
          criado_em?: string
          data_os: string
          envio_id?: string | null
          executante: string
          hora_fim: string
          hora_inicio: string
          horas_executadas: number
          id?: string
          observacoes?: string | null
          status_os?: string
          tarefa: string
          ticket?: string | null
          usuario_id?: string | null
        }
        Update: {
          atualizado_em?: string
          cliente_id?: string
          config_id?: string | null
          criado_em?: string
          data_os?: string
          envio_id?: string | null
          executante?: string
          hora_fim?: string
          hora_inicio?: string
          horas_executadas?: number
          id?: string
          observacoes?: string | null
          status_os?: string
          tarefa?: string
          ticket?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apontamentos_os_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          atualizado_em: string
          cnpj: string | null
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          cnpj?: string | null
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          cnpj?: string | null
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      configuracoes_clientes: {
        Row: {
          atualizado_em: string
          cliente_id: string
          criado_em: string
          exp_senha: string
          exp_usuario: string
          id: string
          obs: string
          url_abertura_os: string
          url_saldo_horas: string
        }
        Insert: {
          atualizado_em?: string
          cliente_id: string
          criado_em?: string
          exp_senha?: string
          exp_usuario?: string
          id?: string
          obs?: string
          url_abertura_os?: string
          url_saldo_horas?: string
        }
        Update: {
          atualizado_em?: string
          cliente_id?: string
          criado_em?: string
          exp_senha?: string
          exp_usuario?: string
          id?: string
          obs?: string
          url_abertura_os?: string
          url_saldo_horas?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_gerais: {
        Row: {
          created_at: string
          exp_senha: string | null
          exp_url: string | null
          exp_usuario: string | null
          id: number
          pdf_cabecalho: string | null
          pdf_nome_empresa: string | null
          pdf_rodape: string | null
          smtp_de_nome: string | null
          smtp_host: string | null
          smtp_porta: number | null
          smtp_senha: string | null
          smtp_usar_tls: boolean | null
          smtp_usuario: string | null
          tenant_id: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          exp_senha?: string | null
          exp_url?: string | null
          exp_usuario?: string | null
          id?: number
          pdf_cabecalho?: string | null
          pdf_nome_empresa?: string | null
          pdf_rodape?: string | null
          smtp_de_nome?: string | null
          smtp_host?: string | null
          smtp_porta?: number | null
          smtp_senha?: string | null
          smtp_usar_tls?: boolean | null
          smtp_usuario?: string | null
          tenant_id?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          exp_senha?: string | null
          exp_url?: string | null
          exp_usuario?: string | null
          id?: number
          pdf_cabecalho?: string | null
          pdf_nome_empresa?: string | null
          pdf_rodape?: string | null
          smtp_de_nome?: string | null
          smtp_host?: string | null
          smtp_porta?: number | null
          smtp_senha?: string | null
          smtp_usar_tls?: boolean | null
          smtp_usuario?: string | null
          tenant_id?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      logs: {
        Row: {
          criado_em: string
          detalhe: string | null
          execucao_id: string | null
          id: string
          mensagem: string
          modulo: string
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          criado_em?: string
          detalhe?: string | null
          execucao_id?: string | null
          id?: string
          mensagem: string
          modulo: string
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          criado_em?: string
          detalhe?: string | null
          execucao_id?: string | null
          id?: string
          mensagem?: string
          modulo?: string
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      modelos_email: {
        Row: {
          assunto: string
          ativo: boolean
          atualizado_em: string
          corpo: string
          criado_em: string
          id: number
        }
        Insert: {
          assunto: string
          ativo?: boolean
          atualizado_em?: string
          corpo: string
          criado_em?: string
          id?: number
        }
        Update: {
          assunto?: string
          ativo?: boolean
          atualizado_em?: string
          corpo?: string
          criado_em?: string
          id?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sr_destinatarios: {
        Row: {
          ativo: boolean
          config_id: string
          email: string
          id: string
        }
        Insert: {
          ativo?: boolean
          config_id: string
          email: string
          id?: string
        }
        Update: {
          ativo?: boolean
          config_id?: string
          email?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sr_destinatarios_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "status_report_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      sr_envio_destinatarios: {
        Row: {
          email: string
          envio_id: string
          id: string
          status_entrega: string
        }
        Insert: {
          email: string
          envio_id: string
          id?: string
          status_entrega?: string
        }
        Update: {
          email?: string
          envio_id?: string
          id?: string
          status_entrega?: string
        }
        Relationships: [
          {
            foreignKeyName: "sr_envio_destinatarios_envio_id_fkey"
            columns: ["envio_id"]
            isOneToOne: false
            referencedRelation: "sr_envios"
            referencedColumns: ["id"]
          },
        ]
      }
      sr_envios: {
        Row: {
          config_id: string
          enviado_em: string
          erro_msg: string | null
          id: string
          pdf_path: string | null
          periodo_fim: string
          periodo_inicio: string
          status: string
        }
        Insert: {
          config_id: string
          enviado_em?: string
          erro_msg?: string | null
          id?: string
          pdf_path?: string | null
          periodo_fim: string
          periodo_inicio: string
          status?: string
        }
        Update: {
          config_id?: string
          enviado_em?: string
          erro_msg?: string | null
          id?: string
          pdf_path?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sr_envios_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "status_report_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      status_report_configs: {
        Row: {
          ativo: boolean
          atualizado_em: string
          cliente_id: string
          criado_em: string
          dia_envio: number
          enviar_sem_os: boolean
          fap: string | null
          id: string
          modelo_id: number | null
          periodo: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          cliente_id: string
          criado_em?: string
          dia_envio: number
          enviar_sem_os?: boolean
          fap?: string | null
          id?: string
          modelo_id?: number | null
          periodo?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          cliente_id?: string
          criado_em?: string
          dia_envio?: number
          enviar_sem_os?: boolean
          fap?: string | null
          id?: string
          modelo_id?: number | null
          periodo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "status_report_configs_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_report_configs_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos_email"
            referencedColumns: ["id"]
          },
        ]
      }
      user_module_access: {
        Row: {
          created_at: string
          has_access: boolean
          id: string
          module_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          has_access?: boolean
          id?: string
          module_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          has_access?: boolean
          id?: string
          module_key?: string
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
      is_admin: { Args: never; Returns: boolean }
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
