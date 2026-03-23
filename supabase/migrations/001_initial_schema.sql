-- =====================================================
-- TURQUOISE CRM - Initial Schema
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE event_type AS ENUM ('stay', 'wedding', 'other');
CREATE TYPE event_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE lead_source AS ENUM ('whatsapp', 'phone', 'email', 'manual', 'other');
CREATE TYPE lead_status AS ENUM ('new', 'qualified', 'converted', 'lost');
CREATE TYPE crm_status AS ENUM (
  'new_lead',
  'qualification_in_progress',
  'inscription_in_progress',
  'bulletin_ready',
  'waiting_internal_validation',
  'validated',
  'completed',
  'cancelled'
);
CREATE TYPE payment_status AS ENUM ('not_sent', 'pending', 'partially_paid', 'paid', 'failed', 'refunded');
CREATE TYPE invoice_status AS ENUM ('not_created', 'pending', 'created', 'sent', 'paid');
CREATE TYPE participant_type AS ENUM ('adult', 'child', 'baby');
CREATE TYPE payment_link_status AS ENUM ('draft', 'sent', 'paid', 'expired', 'cancelled');
CREATE TYPE currency_type AS ENUM ('EUR', 'USD', 'GBP');

-- =====================================================
-- USERS & PERMISSIONS
-- =====================================================

-- Roles
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(100) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  module VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role Permissions (many-to-many)
CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- Users (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL,
  role_id UUID REFERENCES roles(id),
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- EVENTS
-- =====================================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  event_type event_type DEFAULT 'stay',
  status event_status DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  hotel_name VARCHAR(200),
  destination_label VARCHAR(200),
  sales_open_at TIMESTAMPTZ,
  sales_close_at TIMESTAMPTZ,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ROOM TYPES & PRICING
-- =====================================================

CREATE TABLE room_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  base_capacity INTEGER DEFAULT 2,
  max_capacity INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, code)
);

CREATE TABLE event_room_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  room_type_id UUID REFERENCES room_types(id) ON DELETE CASCADE,
  label VARCHAR(200),
  price_amount DECIMAL(10, 2) NOT NULL,
  currency currency_type DEFAULT 'EUR',
  deposit_amount DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, room_type_id)
);

-- =====================================================
-- LEADS
-- =====================================================

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  source lead_source DEFAULT 'manual',
  status lead_status DEFAULT 'new',
  primary_contact_name VARCHAR(200),
  primary_contact_phone VARCHAR(50),
  primary_contact_email VARCHAR(255),
  raw_message TEXT,
  internal_summary TEXT,
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  converted_to_client_file_id UUID, -- Added later with FK
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CLIENT FILES (Dossiers)
-- =====================================================

CREATE TABLE client_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE RESTRICT,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  file_reference VARCHAR(50) UNIQUE NOT NULL,
  
  -- Status
  crm_status crm_status DEFAULT 'new_lead',
  payment_status payment_status DEFAULT 'not_sent',
  invoice_status invoice_status DEFAULT 'not_created',
  
  -- Contact principal
  primary_contact_first_name VARCHAR(100),
  primary_contact_last_name VARCHAR(100),
  primary_contact_phone VARCHAR(50),
  primary_contact_email VARCHAR(255),
  
  -- Commercial
  total_participants INTEGER DEFAULT 0,
  adults_count INTEGER DEFAULT 0,
  children_count INTEGER DEFAULT 0,
  babies_count INTEGER DEFAULT 0,
  
  selected_room_type_id UUID REFERENCES room_types(id) ON DELETE SET NULL,
  quoted_price DECIMAL(10, 2),
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  balance_due DECIMAL(10, 2),
  
  notes TEXT,
  
  -- Tracking
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from leads to client_files
ALTER TABLE leads
  ADD CONSTRAINT fk_leads_client_file
  FOREIGN KEY (converted_to_client_file_id)
  REFERENCES client_files(id) ON DELETE SET NULL;

-- =====================================================
-- PARTICIPANTS
-- =====================================================

CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_file_id UUID REFERENCES client_files(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  age INTEGER,
  participant_type participant_type DEFAULT 'adult',
  birth_date DATE,
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PAYMENT LINKS
-- =====================================================

CREATE TABLE payment_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_file_id UUID REFERENCES client_files(id) ON DELETE CASCADE,
  provider VARCHAR(50) DEFAULT 'bred_manual',
  url TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  currency currency_type DEFAULT 'EUR',
  status payment_link_status DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  external_reference VARCHAR(200),
  notes TEXT,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INVOICES
-- =====================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_file_id UUID REFERENCES client_files(id) ON DELETE CASCADE,
  provider VARCHAR(50) DEFAULT 'pennylane_future',
  status invoice_status DEFAULT 'not_created',
  external_invoice_id VARCHAR(200),
  invoice_number VARCHAR(100),
  amount DECIMAL(10, 2),
  currency currency_type DEFAULT 'EUR',
  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ACTIVITY LOG
-- =====================================================

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  action_label VARCHAR(200),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- =====================================================
-- INTERNAL NOTES
-- =====================================================

CREATE TABLE internal_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_internal_notes_entity ON internal_notes(entity_type, entity_id);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_event_id ON leads(event_id);
CREATE INDEX idx_client_files_crm_status ON client_files(crm_status);
CREATE INDEX idx_client_files_event_id ON client_files(event_id);
CREATE INDEX idx_client_files_file_reference ON client_files(file_reference);
CREATE INDEX idx_participants_client_file_id ON participants(client_file_id);
CREATE INDEX idx_payment_links_client_file_id ON payment_links(client_file_id);
CREATE INDEX idx_invoices_client_file_id ON invoices(client_file_id);

-- =====================================================
-- TRIGGERS: updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_room_types_updated_at BEFORE UPDATE ON room_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_room_pricing_updated_at BEFORE UPDATE ON event_room_pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_files_updated_at BEFORE UPDATE ON client_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_links_updated_at BEFORE UPDATE ON payment_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_internal_notes_updated_at BEFORE UPDATE ON internal_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTIONS: Generate file reference
-- =====================================================

CREATE OR REPLACE FUNCTION generate_file_reference(p_event_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  event_slug VARCHAR;
  event_year INTEGER;
  next_number INTEGER;
  reference VARCHAR;
BEGIN
  -- Get event info
  SELECT 
    UPPER(SUBSTRING(slug FROM 1 FOR 3)),
    EXTRACT(YEAR FROM start_date)::INTEGER
  INTO event_slug, event_year
  FROM events
  WHERE id = p_event_id;
  
  -- Get next number for this event
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(
      SUBSTRING(file_reference FROM '\d+$'), 
      '[^0-9]', 
      '', 
      'g'
    ), '')::INTEGER
  ), 0) + 1
  INTO next_number
  FROM client_files
  WHERE event_id = p_event_id;
  
  -- Format: MAU-2026-0001
  reference := event_slug || '-' || event_year || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN reference;
END;
$$ LANGUAGE plpgsql;
