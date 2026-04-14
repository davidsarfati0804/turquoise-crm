-- Table des versements / lignes de paiement
CREATE TABLE IF NOT EXISTS payment_entries (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_file_id  uuid REFERENCES client_files(id) ON DELETE CASCADE NOT NULL,
  amount          numeric(10,2) NOT NULL CHECK (amount > 0),
  payment_method  text CHECK (payment_method IN ('cb', 'virement', 'cheque', 'especes')),
  payment_date    date NOT NULL DEFAULT CURRENT_DATE,
  notes           text,
  created_at      timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS payment_entries_client_file_idx ON payment_entries(client_file_id);

-- RLS
ALTER TABLE payment_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage payment_entries"
  ON payment_entries FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
