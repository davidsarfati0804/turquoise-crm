-- ============================================================
-- Migration 033 — Security & Performance Fixes
-- Apply in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. PostgreSQL SEQUENCE for file reference (replaces race-prone function)
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS file_reference_seq_2026 START 1;

-- Drop old function and replace with sequence-based version (atomic, no race condition)
CREATE OR REPLACE FUNCTION generate_file_reference()
RETURNS TEXT AS $$
DECLARE
  seq_val BIGINT;
  year_short TEXT;
BEGIN
  seq_val := nextval('file_reference_seq_2026');
  year_short := to_char(NOW(), 'YY');
  RETURN 'MAU-' || year_short || '-' || lpad(seq_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. Idempotence & retry columns on whatsapp_send_queue
-- ============================================================
ALTER TABLE whatsapp_send_queue
  ADD COLUMN IF NOT EXISTS retry_count     INT          DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries     INT          DEFAULT 3,
  ADD COLUMN IF NOT EXISTS last_error_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS expires_at      TIMESTAMPTZ  DEFAULT (now() + interval '7 days');

-- Unique constraint on idempotency_key (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_send_queue_idempotency
  ON whatsapp_send_queue(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ============================================================
-- 3. Missing performance indexes
-- ============================================================

-- WhatsApp templates
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_category
  ON whatsapp_templates(category);

CREATE INDEX IF NOT EXISTS idx_whatsapp_response_templates_category
  ON whatsapp_response_templates(category);

-- WhatsApp messages — for processing queue lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_processing
  ON whatsapp_messages(processing_status, created_at DESC);

-- WhatsApp messages — deduplication on wa_message_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_messages_wa_id_unique
  ON whatsapp_messages(wa_message_id)
  WHERE wa_message_id IS NOT NULL;

-- Activity logs — for time-ordered queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_desc
  ON activity_logs(created_at DESC);

-- Leads — for WhatsApp LID lookup (if not already created by migration 011)
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_lid
  ON leads(whatsapp_lid)
  WHERE whatsapp_lid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_files_whatsapp_lid
  ON client_files(whatsapp_lid)
  WHERE whatsapp_lid IS NOT NULL;

-- ============================================================
-- 4. RPC: apply_extraction_with_participants (atomic UPDATE + INSERT)
-- ============================================================
CREATE OR REPLACE FUNCTION apply_extraction_with_participants(
  p_dossier_id     UUID,
  p_fields         JSONB,
  p_children_ages  INT[]  DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_update       JSONB := '{}';
  v_applied      TEXT[] := '{}';
  v_existing     client_files%ROWTYPE;
  v_last_name    TEXT;
  v_today        DATE := CURRENT_DATE;
  v_age          INT;
  v_birth_year   INT;
  v_type         TEXT;
  v_prev_notes   TEXT;
BEGIN
  -- Lock the row
  SELECT * INTO v_existing FROM client_files WHERE id = p_dossier_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'dossier not found');
  END IF;

  -- Build update fields
  IF (p_fields->>'first_name') IS NOT NULL THEN
    UPDATE client_files SET primary_contact_first_name = p_fields->>'first_name' WHERE id = p_dossier_id;
    v_applied := array_append(v_applied, 'first_name');
  END IF;

  IF (p_fields->>'last_name') IS NOT NULL THEN
    UPDATE client_files SET primary_contact_last_name = p_fields->>'last_name' WHERE id = p_dossier_id;
    v_applied := array_append(v_applied, 'last_name');
  END IF;

  IF (p_fields->'adults_count') IS NOT NULL THEN
    UPDATE client_files SET adults_count = (p_fields->>'adults_count')::INT WHERE id = p_dossier_id;
    v_applied := array_append(v_applied, 'adults_count');
  END IF;

  IF (p_fields->'children_count') IS NOT NULL THEN
    UPDATE client_files SET children_count = (p_fields->>'children_count')::INT WHERE id = p_dossier_id;
    v_applied := array_append(v_applied, 'children_count');
  END IF;

  IF (p_fields->'babies_count') IS NOT NULL THEN
    UPDATE client_files SET babies_count = (p_fields->>'babies_count')::INT WHERE id = p_dossier_id;
    v_applied := array_append(v_applied, 'babies_count');
  END IF;

  IF (p_fields->>'arrival_date') IS NOT NULL THEN
    UPDATE client_files SET arrival_date = (p_fields->>'arrival_date')::DATE WHERE id = p_dossier_id;
    v_applied := array_append(v_applied, 'arrival_date');
  END IF;

  IF (p_fields->>'departure_date') IS NOT NULL THEN
    UPDATE client_files SET departure_date = (p_fields->>'departure_date')::DATE WHERE id = p_dossier_id;
    v_applied := array_append(v_applied, 'departure_date');
  END IF;

  IF (p_fields->>'room_type_id') IS NOT NULL THEN
    UPDATE client_files SET selected_room_type_id = (p_fields->>'room_type_id')::UUID WHERE id = p_dossier_id;
    v_applied := array_append(v_applied, 'room_type_id');
  END IF;

  IF (p_fields->'nb_chambres') IS NOT NULL THEN
    UPDATE client_files SET nb_chambres = (p_fields->>'nb_chambres')::INT WHERE id = p_dossier_id;
    v_applied := array_append(v_applied, 'nb_chambres');
  END IF;

  IF (p_fields->'quoted_price') IS NOT NULL OR (p_fields->'budget') IS NOT NULL THEN
    UPDATE client_files
      SET quoted_price = COALESCE((p_fields->>'quoted_price')::NUMERIC, (p_fields->>'budget')::NUMERIC)
      WHERE id = p_dossier_id;
    v_applied := array_append(v_applied, 'quoted_price');
  END IF;

  IF (p_fields->>'event_id') IS NOT NULL THEN
    UPDATE client_files SET event_id = (p_fields->>'event_id')::UUID WHERE id = p_dossier_id;
    v_applied := array_append(v_applied, 'event_id');
  END IF;

  IF (p_fields->>'notes') IS NOT NULL THEN
    SELECT internal_notes INTO v_prev_notes FROM client_files WHERE id = p_dossier_id;
    UPDATE client_files
      SET internal_notes = CASE
        WHEN v_prev_notes IS NULL OR v_prev_notes = '' THEN '[IA détecté]' || E'\n' || (p_fields->>'notes')
        ELSE v_prev_notes || E'\n\n[IA détecté]\n' || (p_fields->>'notes')
      END
      WHERE id = p_dossier_id;
    v_applied := array_append(v_applied, 'notes');
  END IF;

  -- Insert participants for children if ages provided
  IF p_children_ages IS NOT NULL AND array_length(p_children_ages, 1) > 0 THEN
    SELECT primary_contact_last_name INTO v_last_name FROM client_files WHERE id = p_dossier_id;

    FOR i IN 1..array_length(p_children_ages, 1) LOOP
      v_age := p_children_ages[i];
      v_birth_year := EXTRACT(YEAR FROM v_today) - v_age;
      v_type := CASE WHEN v_age < 2 THEN 'baby' ELSE 'child' END;

      INSERT INTO participants (client_file_id, first_name, last_name, participant_type, date_of_birth)
      VALUES (
        p_dossier_id,
        'Enfant ' || i,
        COALESCE(v_last_name, ''),
        v_type,
        (v_birth_year::TEXT || '-01-01')::DATE
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object('ok', true, 'appliedFields', to_jsonb(v_applied));
END;
$$;

-- ============================================================
-- 5. whatsapp_lid columns (idempotent — may already exist from migration 011)
-- ============================================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS whatsapp_lid VARCHAR(100);
ALTER TABLE client_files ADD COLUMN IF NOT EXISTS whatsapp_lid VARCHAR(100);

-- Triggers to preserve LID when phone is updated to a real number
CREATE OR REPLACE FUNCTION preserve_whatsapp_lid_leads()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.phone LIKE 'lid:%' AND (NEW.phone IS NULL OR NEW.phone NOT LIKE 'lid:%') THEN
    NEW.whatsapp_lid := OLD.phone;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_preserve_lid ON leads;
CREATE TRIGGER trg_leads_preserve_lid
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION preserve_whatsapp_lid_leads();

CREATE OR REPLACE FUNCTION preserve_whatsapp_lid_files()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.primary_contact_phone LIKE 'lid:%' AND (NEW.primary_contact_phone IS NULL OR NEW.primary_contact_phone NOT LIKE 'lid:%') THEN
    NEW.whatsapp_lid := OLD.primary_contact_phone;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_client_files_preserve_lid ON client_files;
CREATE TRIGGER trg_client_files_preserve_lid
  BEFORE UPDATE ON client_files
  FOR EACH ROW EXECUTE FUNCTION preserve_whatsapp_lid_files();
