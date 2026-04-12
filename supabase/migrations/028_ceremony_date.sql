-- Ajouter la date de cérémonie sur les événements de type mariage
ALTER TABLE events ADD COLUMN IF NOT EXISTS ceremony_date DATE;

COMMENT ON COLUMN events.ceremony_date IS 'Date de la cérémonie (uniquement pour les mariages)';
