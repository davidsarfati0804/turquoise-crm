require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

console.log('Vérification des messages WhatsApp dans Supabase...')

async function check() {
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('id, wa_phone_number, wa_display_name, message_content, direction, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) { console.error('Erreur:', error.message); return; }

  if (data && data.length > 0) {
    console.log('\n✅ Messages dans Supabase:')
    data.forEach(m => console.log(
      ' ', m.direction.padEnd(8),
      '|', (m.wa_display_name || '?').padEnd(15),
      '|', m.wa_phone_number.padEnd(14),
      '|', m.message_content?.substring(0, 50),
      '|', new Date(m.created_at).toLocaleTimeString('fr-FR')
    ))
  } else {
    console.log('Aucun message en base. Envoie un message au +33 6 56 68 65 10')
  }
}

check()
