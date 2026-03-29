import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/services/whatsapp.service';

/**
 * POST /api/whatsapp/send
 * Send a WhatsApp message from the CRM
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { phoneNumber, message, leadId, clientFileId } = await request.json();

    // Validate required fields
    if (!phoneNumber || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Send message via WhatsApp service
    const result = await sendWhatsAppMessage(
      phoneNumber,
      message,
      leadId,
      clientFileId,
      { wa_phone_number: phoneNumber }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('[WhatsApp Send Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
