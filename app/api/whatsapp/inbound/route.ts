import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const INBOUND_SECRET = process.env.NANOCLAW_INBOUND_SECRET;

interface NanoclawInboundPayload {
  id: string;
  chat_jid: string;
  /** Original @lid JID before phone resolution (present when LID couldn't be resolved to a phone) */
  original_jid?: string;
  sender: string;
  sender_name: string;
  content: string;
  timestamp: string;
  is_from_me: boolean;
}

/** Normalise un numéro vers +33XXXXXXXXX (ou autre indicatif).
 *  Gère : 0612345678 / 33612345678 / +33612345678 / +33 6 12 34 56 78 */
function normalizePhone(raw: string): string {
  // Déjà au format lid:
  if (raw.startsWith('lid:')) return raw;
  // Supprimer tout sauf chiffres et +
  let digits = raw.replace(/[\s.\-()]/g, '');
  if (digits.startsWith('+')) return digits;
  // 0XXXXXXXXX → +33XXXXXXXXX (France)
  if (digits.startsWith('0') && digits.length === 10) return '+33' + digits.slice(1);
  // 33XXXXXXXXX → +33XXXXXXXXX
  if (digits.startsWith('33') && digits.length === 11) return '+' + digits;
  return '+' + digits;
}

/** Retourne toutes les variantes possibles d'un numéro pour la recherche */
function phoneVariants(phone: string): string[] {
  const norm = normalizePhone(phone);
  const variants = new Set<string>([phone, norm]);
  // Sans le +
  if (norm.startsWith('+')) variants.add(norm.slice(1));
  // Format 0X si France
  if (norm.startsWith('+33') && norm.length === 12) variants.add('0' + norm.slice(3));
  return Array.from(variants);
}

async function findCustomer(phoneNumber: string) {
  const variants = phoneVariants(phoneNumber);

  // Chercher dans leads (essayer chaque variante)
  for (const v of variants) {
    const { data: lead } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', v)
      .limit(1)
      .maybeSingle();
    if (lead) return { leadId: lead.id as string, clientFileId: null as string | null };
  }

  // Chercher dans client_files
  for (const v of variants) {
    const { data: file } = await supabase
      .from('client_files')
      .select('id')
      .eq('primary_contact_phone', v)
      .limit(1)
      .maybeSingle();
    if (file) return { leadId: null as string | null, clientFileId: file.id as string };
  }

  return { leadId: null, clientFileId: null };
}

export async function POST(req: NextRequest) {
  // Verify shared secret
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!INBOUND_SECRET || token !== INBOUND_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: NanoclawInboundPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { id, chat_jid, sender_name, content, timestamp, is_from_me } = payload;

  if (!id || !chat_jid || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Derive a stable phone/identifier from the JID.
  // If the JID is a @lid (unresolved LID), store it as "lid:XXXXXXXX" so the
  // CRM can later use it to send replies via Baileys' native @lid support.
  let phoneNumber: string;
  if (chat_jid.endsWith('@lid')) {
    const lidUser = chat_jid.split('@')[0].split(':')[0];
    phoneNumber = `lid:${lidUser}`;
  } else {
    const rawPhone = chat_jid.split('@')[0];
    phoneNumber = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;
  }

  // Check if message already exists (idempotency by wa_message_id)
  const { data: existing } = await supabase
    .from('whatsapp_messages')
    .select('id')
    .eq('wa_message_id', id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, skipped: 'duplicate' });
  }

  // is_from_me=true means the message was sent from the CRM → check for duplicate
  // by content+phone+direction within the last 2 minutes (avoids double insert
  // when whatsapp.service.ts already stored it and Nanoclaw fires is_from_me callback)
  if (is_from_me) {
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: crmDup } = await supabase
      .from('whatsapp_messages')
      .select('id')
      .eq('wa_phone_number', phoneNumber)
      .eq('message_content', content)
      .eq('direction', 'outbound')
      .gte('created_at', twoMinAgo)
      .limit(1)
      .maybeSingle();
    if (crmDup) {
      return NextResponse.json({ ok: true, skipped: 'crm-duplicate' });
    }
  }

  const { leadId, clientFileId } = await findCustomer(phoneNumber);

  // is_from_me=true means the message was sent from the user's phone → store as outbound
  const direction = is_from_me ? 'outbound' : 'inbound';
  const delivery_status = is_from_me ? 'sent' : 'delivered';

  const { error } = await supabase.from('whatsapp_messages').insert({
    wa_message_id: id,
    wa_phone_number: phoneNumber,
    wa_display_name: is_from_me ? null : (sender_name || null),
    message_content: content,
    message_type: 'text',
    direction,
    delivery_status,
    lead_id: leadId,
    client_file_id: clientFileId,
    processing_status: 'pending',
    created_at: timestamp,
  });

  if (error) {
    console.error('[whatsapp/inbound] DB error:', error);
    return NextResponse.json({ error: 'DB error', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
