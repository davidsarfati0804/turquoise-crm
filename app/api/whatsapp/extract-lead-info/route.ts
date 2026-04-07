import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { extractLeadInfoFromConversation } from '@/lib/services/whatsapp-ai.service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/whatsapp/extract-lead-info
 * Triggered after a lead is created from an unknown WhatsApp number.
 * Uses Claude to extract lead info from the conversation and update the lead.
 */
export async function POST(req: NextRequest) {
  let body: { phone?: string; displayName?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { phone, displayName } = body;
  if (!phone) return NextResponse.json({ error: 'phone requis' }, { status: 400 });

  // Find the most recent lead for this phone
  const { data: lead } = await supabase
    .from('leads')
    .select('id')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lead) return NextResponse.json({ ok: true, skipped: 'no lead found' });

  // Extract info from conversation
  const extracted = await extractLeadInfoFromConversation(phone, displayName);

  if (Object.keys(extracted).length === 0) {
    return NextResponse.json({ ok: true, skipped: 'nothing extracted' });
  }

  // Build update — only update name if it's not "Inconnu"
  const update: Record<string, unknown> = {};
  if (extracted.first_name && extracted.first_name !== 'Inconnu') update.first_name = extracted.first_name;
  if (extracted.last_name && extracted.last_name !== 'WhatsApp') update.last_name = extracted.last_name;
  if (extracted.event_id) update.event_id = extracted.event_id;
  if (extracted.adults_count != null) update.adults_count = extracted.adults_count;
  if (extracted.children_count != null) update.children_count = extracted.children_count;
  if (extracted.babies_count != null) update.babies_count = extracted.babies_count;

  // Build notes with detected info
  const noteParts: string[] = [];
  if (extracted.event_name_detected) noteParts.push(`Événement mentionné: ${extracted.event_name_detected}`);
  if (extracted.sejour_start) noteParts.push(`Dates: ${extracted.sejour_start}${extracted.sejour_end ? ` → ${extracted.sejour_end}` : ''}`);
  if (extracted.notes) noteParts.push(extracted.notes);
  if (noteParts.length > 0) update.notes = noteParts.join('\n');

  if (Object.keys(update).length > 0) {
    await supabase.from('leads').update(update).eq('id', lead.id);
  }

  return NextResponse.json({ ok: true, extracted, updated: update });
}
