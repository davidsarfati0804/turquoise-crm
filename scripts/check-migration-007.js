const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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
