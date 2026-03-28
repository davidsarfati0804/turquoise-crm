import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function run() {
  // Check current columns
  const { data, error } = await supabase.from('participants').select('*').limit(1)
  if (error) {
    console.log('Error:', error.message)
  } else {
    const cols = data && data[0] ? Object.keys(data[0]) : 'empty table'
    console.log('Current columns:', cols)
  }

  // Try to select the new columns
  const { error: err2 } = await supabase.from('participants').select('arrival_date').limit(1)
  console.log('arrival_date exists:', !err2)
  if (err2) console.log('  ', err2.message)
}
run()
