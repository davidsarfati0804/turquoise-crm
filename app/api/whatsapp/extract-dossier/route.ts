import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface ExtractedDossierInfo {
  // Client
  first_name?: string;
  last_name?: string;
  // Dates séjour
  arrival_date?: string;       // YYYY-MM-DD
  departure_date?: string;     // YYYY-MM-DD
  // Composition
  adults_count?: number;
  children_count?: number;
  babies_count?: number;
  children_ages?: number[];    // âges des enfants en années
  // Vols
  flight_inbound?: string;     // ex: "MRU → CDG MK0027 12 Feb"
  flight_outbound?: string;    // ex: "CDG → MRU MK0028 5 Feb"
  // Hébergement
  room_type?: string;          // ex: "Suite Junior"
  nb_chambres?: number;
  // Financier
  budget?: number;
  // Notes libres
  notes?: string;
}

/**
 * POST /api/whatsapp/extract-dossier
 * Extracts all dossier fields from a WhatsApp conversation using Claude.
 * The front-end shows the extracted fields for validation before applying.
 */
export async function POST(req: NextRequest) {
  let body: { phone?: string; dossierId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { phone, dossierId } = body;
  if (!phone) return NextResponse.json({ error: 'phone requis' }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY non configuré' }, { status: 500 });
  const anthropic = new Anthropic({ apiKey });

  // Load conversation
  const { data: msgs } = await supabase
    .from('whatsapp_messages')
    .select('direction, message_content, message_type, created_at')
    .eq('wa_phone_number', phone)
    .order('created_at', { ascending: true })
    .limit(50);

  if (!msgs?.length) {
    return NextResponse.json({ extracted: {}, reason: 'Aucun message trouvé' });
  }

  // Load available events for matching
  const { data: events } = await supabase
    .from('events')
    .select('id, name, start_date, end_date')
    .limit(80);

  // Load room types
  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('id, name')
    .limit(50);

  // Load current dossier if provided (for context)
  let dossierContext = '';
  if (dossierId) {
    const { data: dos } = await supabase
      .from('client_files')
      .select('primary_contact_first_name, primary_contact_last_name, adults_count, children_count, babies_count')
      .eq('id', dossierId)
      .maybeSingle();
    if (dos) {
      dossierContext = `\nDossier actuel: ${dos.primary_contact_first_name} ${dos.primary_contact_last_name}, ${dos.adults_count} adultes, ${dos.children_count} enfants, ${dos.babies_count} bébés.`;
    }
  }

  const convText = msgs
    .map(m => `${m.direction === 'inbound' ? 'Client' : 'Agent'}: ${m.message_type !== 'text' ? `[${m.message_type}]` : m.message_content}`)
    .join('\n');

  const eventList = (events ?? []).map(e => `- ${e.name} (id: ${e.id}${e.start_date ? `, début: ${e.start_date}` : ''})`).join('\n');
  const roomList = (roomTypes ?? []).map(r => `- ${r.name} (id: ${r.id})`).join('\n');

  const prompt = `Conversation WhatsApp entre un agent de voyage (Turquoise) et un client:

${convText}
${dossierContext}

Événements disponibles:
${eventList || 'Aucun'}

Types de chambres disponibles:
${roomList || 'Aucun'}

Extrait TOUTES les informations du dossier mentionnées dans la conversation. Retourne UNIQUEMENT du JSON valide:
{
  "first_name": null,
  "last_name": null,
  "arrival_date": null,
  "departure_date": null,
  "adults_count": null,
  "children_count": null,
  "babies_count": null,
  "children_ages": null,
  "flight_inbound": null,
  "flight_outbound": null,
  "room_type_name": null,
  "room_type_id": null,
  "nb_chambres": null,
  "budget": null,
  "event_name": null,
  "event_id": null,
  "notes": null
}

Règles:
- dates: format YYYY-MM-DD uniquement
- children_ages: tableau d'entiers (âge en années), null si pas mentionné
- flight_inbound: sens ARRIVEE (vol qui arrive à destination), ex: "CDG→MRU MK028 le 15 jan"
- flight_outbound: sens DEPART (vol qui part de destination), ex: "MRU→CDG MK029 le 22 jan"
- budget: nombre entier en euros, null si pas mentionné
- notes: infos utiles non capturées ailleurs
- null pour tout champ non mentionné dans la conversation`;

  try {
    const response = await Promise.race([
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: 'Tu es un assistant qui extrait des informations de dossiers de voyage depuis des conversations WhatsApp. Retourne UNIQUEMENT du JSON valide, rien d\'autre.',
        messages: [{ role: 'user', content: prompt }],
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000)),
    ]);

    const text = response.content[0]?.type === 'text' ? response.content[0].text : null;
    if (!text) return NextResponse.json({ extracted: {} });

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ extracted: {} });

    const raw = JSON.parse(match[0]);
    // Filter nulls
    const extracted = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== null && v !== undefined));

    return NextResponse.json({ extracted });
  } catch (err) {
    console.error('[extract-dossier] Claude error:', err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Erreur Claude',
      extracted: {},
    }, { status: 500 });
  }
}
