import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/whatsapp/client-info?phone=+336...
 * Returns lead + all client_files (dossiers) for a given phone number.
 */
function phoneVariants(phone: string): string[] {
  if (phone.startsWith('lid:')) return [phone];
  const digits = phone.replace(/[\s.\-()]/g, '');
  const norm = digits.startsWith('+') ? digits
    : digits.startsWith('0') && digits.length === 10 ? '+33' + digits.slice(1)
    : digits.startsWith('33') && digits.length === 11 ? '+' + digits
    : '+' + digits;
  const variants = new Set([phone, norm]);
  if (norm.startsWith('+')) variants.add(norm.slice(1));
  if (norm.startsWith('+33') && norm.length === 12) variants.add('0' + norm.slice(3));
  return Array.from(variants);
}

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone');
  if (!phone) return NextResponse.json({ error: 'phone requis' }, { status: 400 });

  const variants = phoneVariants(phone);
  const orPhone = variants.map(v => `phone.eq.${v}`).join(',');
  const orCfPhone = variants.map(v => `primary_contact_phone.eq.${v}`).join(',');

  const [leadResult, dossiersResult] = await Promise.all([
    supabase
      .from('leads')
      .select('id, first_name, last_name, phone, crm_status, source, adults_count, children_count, babies_count, notes, created_at, converted_to_file_id, event_id, events(name)')
      .or(orPhone)
      .order('created_at', { ascending: false })
      .limit(10),

    supabase
      .from('client_files')
      .select('id, file_reference, primary_contact_first_name, primary_contact_last_name, crm_status, payment_status, quoted_price, amount_paid, created_at, event_id, events(name, start_date)')
      .or(orCfPhone)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return NextResponse.json({
    leads: leadResult.data ?? [],
    dossiers: dossiersResult.data ?? [],
    isKnown: (leadResult.data?.length ?? 0) > 0 || (dossiersResult.data?.length ?? 0) > 0,
  });
}

/**
 * POST /api/whatsapp/client-info
 * Create a new lead from a WhatsApp contact.
 * Body: { phone, displayName?, messages? }
 */
export async function POST(req: NextRequest) {
  let body: { phone?: string; displayName?: string | null; extractedInfo?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { phone, displayName, extractedInfo } = body;
  if (!phone) return NextResponse.json({ error: 'phone requis' }, { status: 400 });

  // Parse name from displayName only if it looks like a real name (not a username)
  const isRealDisplayName = displayName && !displayName.includes('_') && !/\d{3,}/.test(displayName) && displayName.length >= 3;
  const nameParts = isRealDisplayName ? displayName!.trim().split(/\s+/) : [];
  const firstName = (extractedInfo?.first_name as string) || nameParts[0] || 'Client';
  const lastName = (extractedInfo?.last_name as string) || nameParts.slice(1).join(' ') || 'WhatsApp';

  const { data, error } = await supabase
    .from('leads')
    .insert({
      phone,
      first_name: firstName,
      last_name: lastName,
      source: 'whatsapp',
      crm_status: 'nouveau',
      event_id: (extractedInfo?.event_id as string) || null,
      adults_count: (extractedInfo?.adults_count as number) || 1,
      children_count: (extractedInfo?.children_count as number) || 0,
      babies_count: (extractedInfo?.babies_count as number) || 0,
      notes: (extractedInfo?.notes as string) || null,
    })
    .select('id')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leadId: data?.id });
}

/**
 * PATCH /api/whatsapp/client-info
 * Update lead info after AI extraction.
 * Body: { leadId, ...fields }
 */
export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { leadId, ...fields } = body;
  if (!leadId) return NextResponse.json({ error: 'leadId requis' }, { status: 400 });

  const allowed = ['first_name', 'last_name', 'event_id', 'adults_count', 'children_count', 'babies_count', 'notes', 'crm_status'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) update[key] = fields[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, skipped: 'no fields' });
  }

  const { error } = await supabase.from('leads').update(update).eq('id', leadId as string);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
