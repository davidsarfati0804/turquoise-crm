-- Add payment_method column to client_files
ALTER TABLE client_files
  ADD COLUMN IF NOT EXISTS payment_method text
    CHECK (payment_method IN ('cb', 'virement', 'cheque', 'especes'));
