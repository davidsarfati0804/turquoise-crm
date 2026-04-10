-- Migration 020: Support de 2 nannies par dossier
ALTER TABLE client_files ADD COLUMN IF NOT EXISTS nanny_name_2 VARCHAR(255);
