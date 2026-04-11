-- Fonction RPC pour rattacher un numéro WhatsApp à un lead/dossier existant
-- Appelée après correction manuelle d'un numéro (ex: LID → vrai numéro)
CREATE OR REPLACE FUNCTION link_whatsapp_phone_to_crm(p_phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead_id uuid;
  v_client_file_id uuid;
  v_variants text[];
BEGIN
  -- Construire les variantes du numéro
  v_variants := ARRAY[
    p_phone,
    CASE WHEN p_phone LIKE '+33%' THEN '0' || substring(p_phone from 4) ELSE NULL END,
    CASE WHEN p_phone LIKE '+%' THEN substring(p_phone from 2) ELSE NULL END
  ];

  -- Chercher un lead correspondant
  SELECT id INTO v_lead_id
  FROM leads
  WHERE phone = ANY(v_variants)
  LIMIT 1;

  -- Chercher un dossier correspondant
  SELECT id INTO v_client_file_id
  FROM client_files
  WHERE primary_contact_phone = ANY(v_variants)
  LIMIT 1;

  -- Mettre à jour les messages orphelins avec ce numéro
  UPDATE whatsapp_messages
  SET
    lead_id = COALESCE(v_lead_id, lead_id),
    client_file_id = COALESCE(v_client_file_id, client_file_id)
  WHERE wa_phone_number = p_phone
    AND (lead_id IS NULL OR client_file_id IS NULL);
END;
$$;
