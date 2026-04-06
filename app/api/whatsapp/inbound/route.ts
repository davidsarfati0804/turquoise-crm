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

async function findCustomer(phoneNumber: string) {
  const { data: lead } = await supabase
    .from('leads')
    .select('id')
    .eq('phone', phoneNumber)
    .limit(1)
    .maybeSingle();
  if (lead) return { leadId: lead.id as string, clientFileId: null as string | null };

  const { data: file } = await supabase
    .from('client_files')
    .select('id')
    .eq('primary_contact_phone', phoneNumber)
    .limit(1)
    .maybeSingle();
  if (file) return { leadId: null as string | null, clientFileId: file.id as string };

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

  // Check if message already exists (idempotency)
  const { data: existing } = await supabase
    .from('whatsapp_messages')
    .select('id')
    .eq('wa_message_id', id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, skipped: 'duplicate' });
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
