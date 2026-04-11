-- Dates de séjour personnalisées par dossier (peuvent différer des dates de l'événement)
ALTER TABLE client_files
  ADD COLUMN IF NOT EXISTS sejour_start_date DATE,
  ADD COLUMN IF NOT EXISTS sejour_end_date DATE;
