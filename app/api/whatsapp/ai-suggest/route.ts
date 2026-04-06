import { NextRequest, NextResponse } from 'next/server';
import { generateWhatsAppSuggestion } from '@/lib/services/whatsapp-ai.service';

export async function POST(req: NextRequest) {
  let body: { phoneNumber?: string; contactName?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { phoneNumber, contactName } = body;
  if (!phoneNumber) {
    return NextResponse.json({ error: 'phoneNumber requis' }, { status: 400 });
  }

  const result = await generateWhatsAppSuggestion(phoneNumber, contactName);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ suggestion: result.suggestion });
}
