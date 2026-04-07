-- ============================================================
-- 014: Activer Realtime sur whatsapp_messages
-- Sans ça, les subscriptions postgres_changes ne reçoivent
-- aucun event INSERT/UPDATE — les messages n'apparaissent
-- pas en temps réel dans l'inbox.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;
