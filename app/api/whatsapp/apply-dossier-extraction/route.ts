import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/whatsapp/apply-dossier-extraction
 * Applies validated AI-extracted fields to a client_file (dossier).
 * Also creates participants if children_ages provided.
 */
export async function POST(req: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    dossierId: string;
    fields: Record<string, unknown>;
    childrenAges?: number[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { dossierId, fields, childrenAges } = body;
  if (!dossierId) return NextResponse.json({ error: 'dossierId requis' }, { status: 400 });

  // Build update object for client_files
  const update: Record<string, unknown> = {};

  if (fields.first_name) update.primary_contact_first_name = fields.first_name;
  if (fields.last_name) update.primary_contact_last_name = fields.last_name;
  if (fields.adults_count != null) update.adults_count = fields.adults_count;
  if (fields.children_count != null) update.children_count = fields.children_count;
  if (fields.babies_count != null) update.babies_count = fields.babies_count;
  if (fields.arrival_date) update.arrival_date = fields.arrival_date;
  if (fields.departure_date) update.departure_date = fields.departure_date;
  if (fields.room_type_id) update.selected_room_type_id = fields.room_type_id;
  if (fields.nb_chambres != null) update.nb_chambres = fields.nb_chambres;
  if (fields.quoted_price != null || fields.budget != null) update.quoted_price = fields.quoted_price ?? fields.budget;
  if (fields.event_id) update.event_id = fields.event_id;
  if (fields.notes) {
    // Append to existing notes
    const { data: existing } = await supabase
      .from('client_files')
      .select('internal_notes')
      .eq('id', dossierId)
      .maybeSingle();
    const prev = (existing as any)?.internal_notes || '';
    update.internal_notes = prev ? `${prev}\n\n[IA détecté]\n${fields.notes}` : `[IA détecté]\n${fields.notes}`;
  }

  if (Object.keys(update).length > 0) {
    const { error } = await supabase
      .from('client_files')
      .update(update)
      .eq('id', dossierId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create participants for children if ages provided
  if (childrenAges && childrenAges.length > 0) {
    // Get client names for participant name
    const { data: dos } = await supabase
      .from('client_files')
      .select('primary_contact_first_name, primary_contact_last_name')
      .eq('id', dossierId)
      .maybeSingle();

    const lastName = (dos as any)?.primary_contact_last_name || '';

    const today = new Date();
    const participantInserts = childrenAges.map((age, idx) => {
      const birthYear = today.getFullYear() - age;
      const dob = `${birthYear}-01-01`;
      const type = age < 2 ? 'baby' : 'child';
      return {
        client_file_id: dossierId,
        first_name: `Enfant ${idx + 1}`,
        last_name: lastName,
        participant_type: type,
        date_of_birth: dob,
      };
    });

    await supabase.from('participants').insert(participantInserts);
  }

  return NextResponse.json({ ok: true, appliedFields: Object.keys(update) });
}
