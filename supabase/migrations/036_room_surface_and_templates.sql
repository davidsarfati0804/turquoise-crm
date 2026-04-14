-- Ajouter surface_m2 aux types de chambres
ALTER TABLE room_types
  ADD COLUMN IF NOT EXISTS surface_m2 integer;

-- ── 4 nouveaux templates WhatsApp ───────────────────────────────────────────

-- Template 1 : Proposition tarifaire (FR)
INSERT INTO whatsapp_templates (name, category, content) VALUES (
  'Proposition tarifaire - Chambres',
  'devis',
  'Vous nous avez indiqué que vous souhaiteriez séjourner pour {{composition}} en {{mois_sejour}}

Nous vous proposons 1 {{type_chambre}} pour un montant en full board de {{prix_nuit}} par nuit.

Ce tarif comprend :
Hébergement en chambre {{type_chambre}} ({{surface_chambre}}m²).
Pension complète (hors boissons)
Mini club avec une nounou privée par famille pour les enfants de moins de 4 ans
Sports nautiques : (planche à voile, pédalo, plongée apnée….)
Fitness center, sauna hammam, jacuzzi.
Transfert aéroport/hotel/aéroport

{{options_chambres}}

Cordialement.
{{nom_agent}}
Club Turquoise, l''exception...tout simplement !'
);

-- Template 2 : Séjour exceptionnel FR
INSERT INTO whatsapp_templates (name, category, content) VALUES (
  'Invitation séjour exceptionnel - FR',
  'invitation',
  'Séjours d''Exception au Long Beach Hotel 5*, niché sur l''une des plus belles plages de sable blanc de l''île Maurice. Profitez d''une restauration haut de gamme, d''un Kids Club et d''une babysitter privée. Séjournez entre le {{date_debut}} et le {{date_fin}}. Choisissez la durée qui vous convient pendant cette période inoubliable.
Contact Whatsapp: {{nom_agent}}.'
);

-- Template 3 : Exceptional Stay EN
INSERT INTO whatsapp_templates (name, category, content) VALUES (
  'Invitation exceptional stay - EN',
  'invitation',
  'Exceptional stays at the 5-star Long Beach Hotel, nestled on one of Mauritius'' most beautiful white sand beaches. Enjoy fine dining, a Kids Club, and a private babysitter. Stay between {{date_debut}} and {{date_fin}}. Choose the length of your stay that suits you best during this unforgettable period.
Contact via WhatsApp: {{nom_agent}}'
);

-- Template 4 : Confirmation réservation mariage
INSERT INTO whatsapp_templates (name, category, content) VALUES (
  'Confirmation réservation mariage',
  'confirmation',
  'Chers invités,

Nous avons le plaisir de vous confirmer votre réservation pour le mariage de {{nom_maries}} à l''hôtel Long Beach Resort - Ile Maurice du {{date_debut}} au {{date_fin}} pour {{composition}} en chambre {{type_chambre}} pour un montant total de {{prix_total}}.

Je reste à votre disposition par WhatsApp pour toute autre demande.

Cordialement,

{{nom_agent}}'
);
