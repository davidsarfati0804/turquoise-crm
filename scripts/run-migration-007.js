const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://efeipwdpftgdeaemmkha.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZWlwd2RwZnRnZGVhZW1ta2hhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI3OTI5OSwiZXhwIjoyMDg5ODU1Mjk5fQ.8QjUJghvMIFf3JANWUVtMt77g6SSdlnjshBmZY0K7_0'
);

async function runMigration() {
  // Use fetch to call the Supabase SQL endpoint directly
  const response = await fetch('https://efeipwdpftgdeaemmkha.supabase.co/rest/v1/rpc/', {
    method: 'POST',
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZWlwd2RwZnRnZGVhZW1ta2hhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI3OTI5OSwiZXhwIjoyMDg5ODU1Mjk5fQ.8QjUJghvMIFf3JANWUVtMt77g6SSdlnjshBmZY0K7_0',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZWlwd2RwZnRnZGVhZW1ta2hhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI3OTI5OSwiZXhwIjoyMDg5ODU1Mjk5fQ.8QjUJghvMIFf3JANWUVtMt77g6SSdlnjshBmZY0K7_0',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  
  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response:', text.substring(0, 500));
}

runMigration();
