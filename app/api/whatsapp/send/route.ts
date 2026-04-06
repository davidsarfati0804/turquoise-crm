import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage, sendWhatsAppMedia, MediaType } from '@/lib/services/whatsapp.service';

/**
 * POST /api/whatsapp/send
 * Send a WhatsApp text message or media file from the CRM.
 * Body: { phoneNumber, message, [mediaUrl, mediaType, leadId, clientFileId] }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { phoneNumber, message, mediaUrl, mediaType, leadId, clientFileId } = body;

    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: 'Missing phoneNumber' }, { status: 400 });
    }

    // Media send path
    if (mediaUrl && mediaType) {
      const result = await sendWhatsAppMedia(
        phoneNumber,
        mediaUrl,
        mediaType as MediaType,
        message || undefined,
        leadId,
        clientFileId,
      );
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 500 });
      }
      return NextResponse.json({ success: true, messageId: result.messageId });
    }

    // Text send path
    if (!message) {
      return NextResponse.json({ success: false, error: 'Missing message' }, { status: 400 });
    }

    const result = await sendWhatsAppMessage(
      phoneNumber,
      message,
      leadId,
      clientFileId,
      { wa_phone_number: phoneNumber },
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: result.messageId, provider: result.provider });
  } catch (error) {
    console.error('[WhatsApp Send Error]:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

