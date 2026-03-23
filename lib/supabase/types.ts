export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          name: string
          slug: string
          event_type: 'stay' | 'wedding' | 'other'
          status: 'draft' | 'active' | 'archived'
          start_date: string | null
          end_date: string | null
          hotel_name: string | null
          destination_label: string | null
          sales_open_at: string | null
          sales_close_at: string | null
          description: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['events']['Insert']>
      }
      // Add other tables as needed
    }
  }
}
