-- ============================================================
-- 015: Rendre event_id nullable sur leads
-- Un lead WhatsApp peut arriver sans événement connu.
-- L'IA le détecte ensuite depuis la conversation.
-- ============================================================
ALTER TABLE leads ALTER COLUMN event_id DROP NOT NULL;
