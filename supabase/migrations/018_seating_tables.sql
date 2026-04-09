-- =====================================================
-- MIGRATION 018: MODULE ORGANISATION DES TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS event_seating_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'Table',
    table_type VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (table_type IN ('normal', 'safety')),
    tab_type VARCHAR(20) NOT NULL DEFAULT 'jour' CHECK (tab_type IN ('jour', 'chabbat')),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_seating_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID NOT NULL REFERENCES event_seating_tables(id) ON DELETE CASCADE,
    client_file_id UUID NOT NULL REFERENCES client_files(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(table_id, client_file_id, assigned_date)
);

CREATE INDEX IF NOT EXISTS idx_seating_tables_event ON event_seating_tables(event_id);
CREATE INDEX IF NOT EXISTS idx_seating_tables_tab ON event_seating_tables(event_id, tab_type);
CREATE INDEX IF NOT EXISTS idx_seating_assignments_table ON event_seating_assignments(table_id);
CREATE INDEX IF NOT EXISTS idx_seating_assignments_file ON event_seating_assignments(client_file_id);
CREATE INDEX IF NOT EXISTS idx_seating_assignments_date ON event_seating_assignments(assigned_date);

DROP TRIGGER IF EXISTS update_event_seating_tables_updated_at ON event_seating_tables;
CREATE TRIGGER update_event_seating_tables_updated_at BEFORE UPDATE ON event_seating_tables
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE event_seating_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_seating_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth users manage seating_tables" ON event_seating_tables;
CREATE POLICY "Auth users manage seating_tables" ON event_seating_tables
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth users manage seating_assignments" ON event_seating_assignments;
CREATE POLICY "Auth users manage seating_assignments" ON event_seating_assignments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
