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
  gender?: string;
}

/** Extract a flight number like "MK015" or "MK028" from a free-text string */
function extractFlightNumber(text: string): string | null {
  const match = text.match(/\b([A-Z]{2}\d{3,4})\b/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * POST /api/whatsapp/apply-dossier-extraction
 * Applies validated AI-extracted fields to a client_file (dossier).
 * Creates real participant records from extracted participant data.
 *
 * Real column names on client_files:
 *   arrival_date   → sejour_start_date
 *   departure_date → sejour_end_date
 *   flight_inbound → flight_id_inbound (UUID lookup in reference_flights)
 *   flight_outbound → flight_id_outbound (UUID lookup in reference_flights)
 *   nb_chambres    → does NOT exist, ignored
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

  // Build update object — only real columns on client_files
  const update: Record<string, unknown> = {};

  if (fields.first_name) update.primary_contact_first_name = fields.first_name;
  if (fields.last_name)  update.primary_contact_last_name  = fields.last_name;
  if (fields.adults_count   != null) update.adults_count   = fields.adults_count;
  if (fields.children_count != null) update.children_count = fields.children_count;
  if (fields.babies_count   != null) update.babies_count   = fields.babies_count;
  // arrival_date / departure_date → sejour_start_date / sejour_end_date
  if (fields.arrival_date)   update.sejour_start_date = fields.arrival_date;
  if (fields.departure_date) update.sejour_end_date   = fields.departure_date;

  // When both dates change, recalculate quoted_price via event_room_pricing
  if (fields.arrival_date && fields.departure_date && !fields.budget && !fields.quoted_price) {
    const { data: dos } = await supabase
      .from('client_files')
      .select('selected_room_type_id, event_id')
      .eq('id', dossierId)
      .maybeSingle();
    const roomTypeId = (dos as any)?.selected_room_type_id;
    const eventId    = (dos as any)?.event_id;
    if (roomTypeId && eventId) {
      const { data: pricing } = await supabase
        .from('event_room_pricing')
        .select('price_per_night')
        .eq('event_id', eventId)
        .eq('room_type_id', roomTypeId)
        .maybeSingle();
      const ppn = (pricing as any)?.price_per_night;
      if (ppn) {
        const msNights = new Date(fields.departure_date as string).getTime() - new Date(fields.arrival_date as string).getTime();
        const nights = Math.max(0, Math.round(msNights / 86400000));
        if (nights > 0) {
          update.quoted_price = Math.round(ppn * nights * 100) / 100;
        }
      }
    }
  }
  // room type FK
  if (fields.room_type_id) update.selected_room_type_id = fields.room_type_id;
  // budget / quoted price
  if (fields.quoted_price != null || fields.budget != null)
    update.quoted_price = fields.quoted_price ?? fields.budget;
  // event FK
  if (fields.event_id) update.event_id = fields.event_id;
  // nb_chambres → column doesn't exist, skip

  // Flights: look up UUID in reference_flights by flight number
  if (fields.flight_inbound) {
    const flightNum = extractFlightNumber(String(fields.flight_inbound));
    if (flightNum) {
      const { data: flight } = await supabase
        .from('reference_flights')
        .select('id')
        .ilike('flight_number', flightNum)
        .maybeSingle();
      if (flight?.id) update.flight_id_inbound = flight.id;
    }
  }
  if (fields.flight_outbound) {
    const flightNum = extractFlightNumber(String(fields.flight_outbound));
    if (flightNum) {
      const { data: flight } = await supabase
        .from('reference_flights')
        .select('id')
        .ilike('flight_number', flightNum)
        .maybeSingle();
      if (flight?.id) update.flight_id_outbound = flight.id;
    }
  }

  const fieldErrors: string[] = [];

  if (Object.keys(update).length > 0) {
    const { error } = await supabase
      .from('client_files')
      .update(update)
      .eq('id', dossierId);
    if (error) {
      console.error('[apply-dossier-extraction] client_files update error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Participants
  const participantsCreated: number[] = [];
  const participantErrors: string[] = [];

  if (participants && participants.length > 0) {
    const { data: dos } = await supabase
      .from('client_files')
      .select('primary_contact_last_name')
      .eq('id', dossierId)
      .maybeSingle();
    const fallbackLastName = (dos as any)?.primary_contact_last_name || '';

    for (const p of participants) {
      const g = p.gender as string | undefined;
      let gender: string | null = null;
      if (g === 'M' || g === 'male')    gender = 'male';
      else if (g === 'F' || g === 'female') gender = 'female';

      const { error: partError } = await supabase.from('participants').insert({
        client_file_id: dossierId,
        first_name: p.first_name,
        last_name: p.last_name || fallbackLastName || '',
        date_of_birth: p.date_of_birth || null,
        participant_type: p.participant_type || 'adult',
        gender,
      });

      if (partError) {
        console.error('[apply-dossier-extraction] participant insert error:', partError.message);
        participantErrors.push(`${p.first_name}: ${partError.message}`);
      } else {
        participantsCreated.push(1);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    appliedFields: Object.keys(update),
    fieldErrors: fieldErrors.length > 0 ? fieldErrors : undefined,
    participantsCreated: participantsCreated.length,
    participantErrors: participantErrors.length > 0 ? participantErrors : undefined,
  });
}
