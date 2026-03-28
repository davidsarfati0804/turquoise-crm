const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://efeipwdpftgdeaemmkha.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZWlwd2RwZnRnZGVhZW1ta2hhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI3OTI5OSwiZXhwIjoyMDg5ODU1Mjk5fQ.8QjUJghvMIFf3JANWUVtMt77g6SSdlnjshBmZY0K7_0'
);

async function run() {
  // Check if column already renamed
  const { data, error } = await supabase
    .from('event_room_pricing')
    .select('price_per_night')
    .limit(1);
  
  if (error) {
    console.log('Column price_per_night does NOT exist yet. Need to run migration.');
    console.log('Error:', error.message);
  } else {
    console.log('Column price_per_night already exists! Migration not needed.');
  }
}

run();
