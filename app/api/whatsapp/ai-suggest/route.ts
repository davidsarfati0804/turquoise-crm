import { NextRequest, NextResponse } from 'next/server';
import { generateWhatsAppSuggestion, saveApprovedExample } from '@/lib/services/whatsapp-ai.service';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    phoneNumber?: string;
    contactName?: string | null;
    action?: 'suggest' | 'approve';
    approvedResponse?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { phoneNumber, contactName, action, approvedResponse } = body;
  if (!phoneNumber) {
    return NextResponse.json({ error: 'phoneNumber requis' }, { status: 400 });
  }

  // Save approved example for future learning
  if (action === 'approve' && approvedResponse) {
    await saveApprovedExample(phoneNumber, approvedResponse, contactName);
    return NextResponse.json({ ok: true });
  }

  const result = await generateWhatsAppSuggestion(phoneNumber, contactName);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ suggestion: result.suggestion });
}
