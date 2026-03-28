-- =====================================================
-- MIGRATION 008: YOUSIGN SIGNATURE COLUMNS
-- =====================================================
-- Date: 2026-03-28
-- Description: Add Yousign-specific columns for e-signature tracking

ALTER TABLE bulletin_inscriptions
ADD COLUMN IF NOT EXISTS yousign_signature_request_id TEXT,
ADD COLUMN IF NOT EXISTS yousign_document_id TEXT,
ADD COLUMN IF NOT EXISTS yousign_signer_url TEXT,
ADD COLUMN IF NOT EXISTS signed_pdf_url TEXT;

COMMENT ON COLUMN bulletin_inscriptions.yousign_signature_request_id IS 'ID de la demande de signature Yousign';
COMMENT ON COLUMN bulletin_inscriptions.yousign_document_id IS 'ID du document uploadé sur Yousign';
COMMENT ON COLUMN bulletin_inscriptions.yousign_signer_url IS 'URL de signature pour le client';
COMMENT ON COLUMN bulletin_inscriptions.signed_pdf_url IS 'URL du PDF signé (stocké dans Supabase Storage)';
