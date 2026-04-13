import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface ParticipantInput {
  first_name: string;
  last_name?: string;
  date_of_birth?: string;
  participant_type: 'adult' | 'child' | 'baby';
  gender?: 'M' | 'F';
}

/**
 * POST /api/whatsapp/apply-dossier-extraction
 * Applies validated AI-extracted fields to a client_file (dossier).
 * Creates real participant records from extracted participant data.
 */
export async function POST(req: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    dossierId: string;
    fields: Record<string, unknown>;
    participants?: ParticipantInput[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { dossierId, fields, participants } = body;
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
  // Note: flight_inbound / flight_outbound are text descriptions — FK lookup would be needed to set flight_id_inbound/outbound

  if (Object.keys(update).length > 0) {
    const { error } = await supabase
      .from('client_files')
      .update(update)
      .eq('id', dossierId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create participant records from extracted participant data
  if (participants && participants.length > 0) {
    const participantInserts = participants.map(p => ({
      client_file_id: dossierId,
      first_name: p.first_name,
      last_name: p.last_name || null,
      date_of_birth: p.date_of_birth || null,
      participant_type: p.participant_type,
      gender: p.gender || null,
    }));

    const { error: partError } = await supabase.from('participants').insert(participantInserts);
    if (partError) {
      console.error('[apply-dossier-extraction] participants insert error:', partError);
    }
  }

  return NextResponse.json({ ok: true, appliedFields: Object.keys(update), participantsCreated: participants?.length ?? 0 });
}
