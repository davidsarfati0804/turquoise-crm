import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function run() {
  console.log('Running migration 006: participant individual dates...')

  // Supabase REST API doesn't support ALTER TABLE directly
  // We use the Management API via fetch
  const projectRef = 'efeipwdpftgdeaemmkha'
  const sql = `
    ALTER TABLE participants
    ADD COLUMN IF NOT EXISTS arrival_date DATE,
    ADD COLUMN IF NOT EXISTS departure_date DATE,
    ADD COLUMN IF NOT EXISTS nights_count INTEGER,
    ADD COLUMN IF NOT EXISTS room_type_id UUID REFERENCES room_types(id);

    CREATE INDEX IF NOT EXISTS idx_participants_room_type ON participants(room_type_id);
  `

  const response = await fetch(
    `https://${projectRef}.supabase.co/rest/v1/rpc/exec_sql`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql }),
    }
  )

  if (!response.ok) {
    console.log('exec_sql not available, trying pg_query workaround...')
    
    // Alternative: use the Supabase dashboard SQL endpoint
    // Since we can't run DDL through PostgREST, we need to use the management API
    const mgmtResponse = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN || ''}`,
        },
        body: JSON.stringify({ query: sql }),
      }
    )

    if (!mgmtResponse.ok) {
      const text = await mgmtResponse.text()
      console.log('Management API also failed:', mgmtResponse.status, text)
      console.log('')
      console.log('=== MANUAL MIGRATION REQUIRED ===')
      console.log('Please run this SQL in the Supabase Dashboard SQL Editor:')
      console.log('https://supabase.com/dashboard/project/efeipwdpftgdeaemmkha/sql/new')
      console.log('')
      console.log(sql)
      return
    }

    console.log('✅ Migration applied via Management API')
  } else {
    console.log('✅ Migration applied via exec_sql')
  }

  // Verify
  const { error } = await supabase.from('participants').select('arrival_date').limit(1)
  if (error) {
    console.log('❌ Verification failed:', error.message)
  } else {
    console.log('✅ Verified: arrival_date column exists')
  }
}
run()
