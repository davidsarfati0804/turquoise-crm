import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { analyzeImageWithOCR } from '@/lib/services/whatsapp-ai.service';

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
  /** 'text' | 'image' | 'video' | 'document' | 'audio' | 'sticker' */
  message_type?: string;
  /** Public URL of the media (for image, video, document) */
  media_url?: string;
  /** Original filename for documents */
  media_filename?: string;
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

  const { id, chat_jid, sender_name, content, timestamp, is_from_me, message_type, media_url, media_filename } = payload;

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

  let { leadId, clientFileId } = await findCustomer(phoneNumber);

  // ── LID / phone merging ────────────────────────────────────────────────────
  // When a real phone arrives and we can link it to a client_file or lead,
  // check if there are LID messages stored for the same entity and merge them
  // under the real phone number so both sides appear in one conversation.
  if (!phoneNumber.startsWith('lid:') && (clientFileId || leadId)) {
    if (clientFileId) {
      const { data: lidRows } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('client_file_id', clientFileId)
        .like('wa_phone_number', 'lid:%')
        .limit(1);
      if (lidRows && lidRows.length > 0) {
        await supabase
          .from('whatsapp_messages')
          .update({ wa_phone_number: phoneNumber })
          .eq('client_file_id', clientFileId)
          .like('wa_phone_number', 'lid:%');
      }
    }
    if (leadId) {
      const { data: lidRows } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('lead_id', leadId)
        .like('wa_phone_number', 'lid:%')
        .limit(1);
      if (lidRows && lidRows.length > 0) {
        await supabase
          .from('whatsapp_messages')
          .update({ wa_phone_number: phoneNumber })
          .eq('lead_id', leadId)
          .like('wa_phone_number', 'lid:%');
      }
    }
  }

  // When a LID arrives and the entity already has real-phone messages,
  // store this LID message under the real phone to keep one conversation.
  if (phoneNumber.startsWith('lid:') && (clientFileId || leadId)) {
    const entityFilter = clientFileId
      ? supabase.from('whatsapp_messages').select('wa_phone_number').eq('client_file_id', clientFileId)
      : supabase.from('whatsapp_messages').select('wa_phone_number').eq('lead_id', leadId!);

    const { data: realPhoneRow } = await entityFilter
      .not('wa_phone_number', 'like', 'lid:%')
      .limit(1)
      .maybeSingle();

    if (realPhoneRow) {
      // Re-route this LID message to the real phone conversation
      phoneNumber = realPhoneRow.wa_phone_number as string;
    }
  }

  // is_from_me=true means the message was sent from the user's phone → store as outbound
  const direction = is_from_me ? 'outbound' : 'inbound';
  const delivery_status = is_from_me ? 'sent' : 'delivered';
  const msgType = message_type || 'text';

  // Build base metadata
  const metadata: Record<string, unknown> = {};
  if (media_url) metadata.media_url = media_url;
  if (media_filename) metadata.media_filename = media_filename;

  // ── OCR automatique pour les images inbound des clients ───────────────────
  // Analyse le document/photo dès réception pour extraire les infos (billets d'avion, passeports…)
  if (msgType === 'image' && media_url && !is_from_me) {
    try {
      const ocr = await analyzeImageWithOCR(media_url);
      if (ocr) metadata.ocr = ocr;
    } catch {
      // OCR non bloquant — on continue même en cas d'erreur
    }
  }

  const { error } = await supabase.from('whatsapp_messages').insert({
    wa_message_id: id,
    wa_phone_number: phoneNumber,
    wa_display_name: is_from_me ? null : (sender_name || null),
    message_content: content,
    message_type: msgType,
    direction,
    delivery_status,
    lead_id: leadId,
    client_file_id: clientFileId,
    processing_status: 'pending',
    created_at: timestamp,
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  });

  if (error) {
    console.error('[whatsapp/inbound] DB error:', error);
    return NextResponse.json({ error: 'DB error', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
