import { NextRequest, NextResponse } from 'next/server';
import { generateWhatsAppSuggestion, saveApprovedExample } from '@/lib/services/whatsapp-ai.service';

export async function POST(req: NextRequest) {
  let body: {
    phoneNumber?: string;
    contactName?: string | null;
    action?: 'suggest' | 'approve';
    approvedResponse?: string;
    leadContext?: {
      isNewContact: boolean;
      hasName: boolean;
      hasEvent: boolean;
      hasTravelers: boolean;
      hasDates: boolean;
    };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { phoneNumber, contactName, action, approvedResponse, leadContext } = body;
  if (!phoneNumber) {
    return NextResponse.json({ error: 'phoneNumber requis' }, { status: 400 });
  }

  // Save approved example for future learning
  if (action === 'approve' && approvedResponse) {
    await saveApprovedExample(phoneNumber, approvedResponse, contactName);
    return NextResponse.json({ ok: true });
  }

  const result = await generateWhatsAppSuggestion(phoneNumber, contactName, leadContext);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ suggestion: result.suggestion });
}
