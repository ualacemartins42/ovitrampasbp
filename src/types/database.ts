export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      neighborhoods: {
        Row: {
          id: number
          name: string
          zone: string
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          zone: string
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          zone?: string
          created_at?: string
        }
        Relationships: []
      }
      bairros: {
        Row: {
          id: string
          nome: string
          distrito: string
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          distrito: string
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          distrito?: string
          ativo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      trap_types: {
        Row: {
          id: number
          code: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: number
          code: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          code?: string
          name?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          registration_number: string | null
          role: 'ace' | 'lab' | 'supervisor' | 'admin'
          neighborhood_id: number | null
          zone: string | null
          username: string | null
          phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          registration_number?: string | null
          role?: 'ace' | 'lab' | 'supervisor' | 'admin'
          neighborhood_id?: number | null
          zone?: string | null
          username?: string | null
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          registration_number?: string | null
          role?: 'ace' | 'lab' | 'supervisor' | 'admin'
          neighborhood_id?: number | null
          zone?: string | null
          username?: string | null
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          id: number
          street: string
          number: string | null
          neighborhood_id: number
          complement: string | null
          reference_point: string | null
          latitude: number | null
          longitude: number | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          street: string
          number?: string | null
          neighborhood_id: number
          complement?: string | null
          reference_point?: string | null
          latitude?: number | null
          longitude?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['properties']['Insert']>
        Relationships: []
      }
      traps: {
        Row: {
          id: number
          code: string
          qr_code: string | null
          trap_type_id: number
          property_id: number | null
          status: 'instalada' | 'recolhida' | 'danificada' | 'perdida' | 'sem_alteracao'
          installed_at: string | null
          neighborhood_id: number | null
          district: string | null
          street: string | null
          number: string | null
          complement: string | null
          location_detail: string | null
          responsible: string | null
          block: string | null
          area_type: 'urbana' | 'periurbana' | 'rural' | null
          latitude: number | null
          longitude: number | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          code: string
          qr_code?: string | null
          trap_type_id: number
          property_id?: number | null
          status?: 'instalada' | 'recolhida' | 'danificada' | 'perdida' | 'sem_alteracao'
          installed_at?: string | null
          neighborhood_id?: number | null
          district?: string | null
          street?: string | null
          number?: string | null
          complement?: string | null
          location_detail?: string | null
          responsible?: string | null
          block?: string | null
          area_type?: 'urbana' | 'periurbana' | 'rural' | null
          latitude?: number | null
          longitude?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['traps']['Insert']>
        Relationships: []
      }
      cycles: {
        Row: {
          id: string
          trap_code: string
          trap_id: number | null
          neighborhood_name: string | null
          status: 'instalada' | 'trocada' | 'finalizada'
          install_at: string | null
          install_epi_week: number | null
          install_obs: string | null
          estrato_liraa: string | null
          swap_at: string | null
          swap_epi_week: number | null
          swap_situation: string | null
          swap_obs: string | null
          remove_at: string | null
          remove_epi_week: number | null
          remove_situation: string | null
          remove_obs: string | null
          agent_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trap_code: string
          trap_id?: number | null
          neighborhood_name?: string | null
          status: 'instalada' | 'trocada' | 'finalizada'
          install_at?: string | null
          install_epi_week?: number | null
          install_obs?: string | null
          estrato_liraa?: string | null
          swap_at?: string | null
          swap_epi_week?: number | null
          swap_situation?: string | null
          swap_obs?: string | null
          remove_at?: string | null
          remove_epi_week?: number | null
          remove_situation?: string | null
          remove_obs?: string | null
          agent_id: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['cycles']['Insert']>
        Relationships: []
      }
      collections: {
        Row: {
          id: string
          client_id: string
          trap_id: number | null
          trap_code: string
          trap_type_id: number | null
          agent_id: string
          kind: 'instalacao' | 'vistoria' | 'recolhimento'
          occurred_at: string
          trap_status: 'instalada' | 'recolhida' | 'danificada' | 'perdida' | 'sem_alteracao'
          paddle_code: string | null
          estimated_eggs: number | null
          observations: string | null
          photo_path: string | null
          latitude: number | null
          longitude: number | null
          street: string | null
          number: string | null
          neighborhood_id: number | null
          complement: string | null
          reference_point: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          trap_id?: number | null
          trap_code: string
          trap_type_id?: number | null
          agent_id: string
          kind: 'instalacao' | 'vistoria' | 'recolhimento'
          occurred_at: string
          trap_status: 'instalada' | 'recolhida' | 'danificada' | 'perdida' | 'sem_alteracao'
          paddle_code?: string | null
          estimated_eggs?: number | null
          observations?: string | null
          photo_path?: string | null
          latitude?: number | null
          longitude?: number | null
          street?: string | null
          number?: string | null
          neighborhood_id?: number | null
          complement?: string | null
          reference_point?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['collections']['Insert']>
        Relationships: []
      }
      lab_results: {
        Row: {
          id: number
          collection_id: string
          exact_egg_count: number | null
          species: 'aedes_aegypti' | 'aedes_albopictus' | 'culex' | 'outro' | 'nao_identificado' | null
          species_notes: string | null
          analyzed_at: string
          analyst_id: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          collection_id: string
          exact_egg_count?: number | null
          species?: 'aedes_aegypti' | 'aedes_albopictus' | 'culex' | 'outro' | 'nao_identificado' | null
          species_notes?: string | null
          analyzed_at?: string
          analyst_id: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['lab_results']['Insert']>
        Relationships: []
      }
      educacao_saude: {
        Row: {
          id: string
          trap_code: string
          trap_id: number | null
          street: string | null
          number: string | null
          neighborhood_name: string | null
          district: string | null
          action_date: string
          action_taken: string | null
          egg_count: number | null
          cycle_id: string | null
          photo_paths: string[]
          agent_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trap_code: string
          trap_id?: number | null
          street?: string | null
          number?: string | null
          neighborhood_name?: string | null
          district?: string | null
          action_date: string
          action_taken?: string | null
          egg_count?: number | null
          cycle_id?: string | null
          photo_paths?: string[]
          agent_id: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['educacao_saude']['Insert']>
        Relationships: []
      }
    }
    Views: {
      collections_with_lab: {
        Row: {
          id: string | null
          client_id: string | null
          trap_code: string | null
          kind: 'instalacao' | 'vistoria' | 'recolhimento' | null
          occurred_at: string | null
          trap_status: 'instalada' | 'recolhida' | 'danificada' | 'perdida' | 'sem_alteracao' | null
          paddle_code: string | null
          estimated_eggs: number | null
          observations: string | null
          photo_path: string | null
          latitude: number | null
          longitude: number | null
          street: string | null
          number: string | null
          neighborhood_id: number | null
          neighborhood_name: string | null
          neighborhood_zone: string | null
          agent_id: string | null
          agent_name: string | null
          agent_registration: string | null
          exact_egg_count: number | null
          species: 'aedes_aegypti' | 'aedes_albopictus' | 'culex' | 'outro' | 'nao_identificado' | null
          analyzed_at: string | null
          lab_notes: string | null
        }
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: {
      app_role: 'ace' | 'lab' | 'supervisor' | 'admin'
      trap_status: 'instalada' | 'recolhida' | 'danificada' | 'perdida' | 'sem_alteracao'
      collection_kind: 'instalacao' | 'vistoria' | 'recolhimento'
      mosquito_species: 'aedes_aegypti' | 'aedes_albopictus' | 'culex' | 'outro' | 'nao_identificado'
      trap_area_type: 'urbana' | 'periurbana' | 'rural'
      cycle_status: 'instalada' | 'trocada' | 'finalizada'
    }
    CompositeTypes: Record<string, never>
  }
}
