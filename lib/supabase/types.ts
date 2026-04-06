export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          name: string
          slug: string
          event_type: 'sejour' | 'mariage'
          status: 'draft' | 'upcoming' | 'active' | 'completed' | 'cancelled'
          start_date: string | null
          end_date: string | null
          destination_label: string | null
          sales_open_at: string | null
          sales_close_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['events']['Insert']>
      }
      leads: {
        Row: {
          id: string
          source: 'whatsapp' | 'phone' | 'email' | 'manual' | 'other'
          first_name: string
          last_name: string
          phone: string | null
          email: string | null
          adults_count: number
          children_count: number
          babies_count: number
          notes: string | null
          event_id: string | null
          converted_to_file_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['leads']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['leads']['Insert']>
      }
      client_files: {
        Row: {
          id: string
          file_reference: string
          lead_id: string | null
          event_id: string
          crm_status: 'lead' | 'inscription_en_cours' | 'bulletin_pret' | 'valide' | 'paiement_en_attente' | 'paye' | 'annule'
          payment_status: 'pending' | 'partial' | 'paid' | 'refunded'
          invoice_status: 'not_sent' | 'sent' | 'paid'
          quoted_price: number | null
          notes: string | null
          bi_google_doc_id: string | null
          bi_pdf_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['client_files']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['client_files']['Insert']>
      }
      participants: {
        Row: {
          id: string
          client_file_id: string
          first_name: string
          last_name: string
          date_of_birth: string | null
          passport_number: string | null
          passport_expiry: string | null
          nationality: string | null
          participant_type: 'adult' | 'child' | 'baby'
          arrival_date: string | null
          departure_date: string | null
          nights_count: number | null
          room_type_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['participants']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['participants']['Insert']>
      }
      room_types: {
        Row: {
          id: string
          name: string
          description: string | null
          price_per_night: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['room_types']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['room_types']['Insert']>
      }
      profils_utilisateurs: {
        Row: {
          id: string
          nom_complet: string | null
          poste: string | null
          telephone: string | null
          avatar_url: string | null
          role: 'admin' | 'commercial' | 'manager' | 'utilisateur'
          equipe: string | null
          actif: boolean
          date_creation: string
          date_derniere_connexion: string | null
        }
        Insert: Omit<Database['public']['Tables']['profils_utilisateurs']['Row'], 'date_creation'>
        Update: Partial<Database['public']['Tables']['profils_utilisateurs']['Insert']>
      }
    }
  }
}
