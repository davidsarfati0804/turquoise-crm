import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Initialize Supabase server client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const whatsappToken = process.env.WHATSAPP_API_TOKEN!;
const whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Types for WhatsApp API webhook payload
 */
interface WhatsAppMessage {
  from: string;
  type: string;
  timestamp: string;
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
  };
  document?: {
    id: string;
    mime_type: string;
    filename: string;
  };
  id: string;
}

interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        contacts?: WhatsAppContact[];
        messages?: WhatsAppMessage[];
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

/**
 * Search for existing lead or client file by phone number
 */
async function findExistingCustomer(phoneNumber: string) {
  // 1. Recherche par téléphone exact
  const { data: leadData } = await supabase
    .from('leads')
    .select('id, first_name, last_name, event_id')
    .eq('phone', phoneNumber)
    .limit(1)
    .maybeSingle();

  if (leadData) return { type: 'lead', data: leadData };

  const { data: fileData } = await supabase
    .from('client_files')
    .select('id, primary_contact_first_name, primary_contact_last_name')
    .eq('primary_contact_phone', phoneNumber)
    .limit(1)
    .maybeSingle();

  if (fileData) return { type: 'client_file', data: fileData };

  // 2. Recherche par whatsapp_lid — cas où le LID a été remplacé par un vrai numéro
  const { data: leadByLid } = await supabase
    .from('leads')
    .select('id, first_name, last_name, event_id')
    .eq('whatsapp_lid', phoneNumber)
    .limit(1)
    .maybeSingle();

  if (leadByLid) return { type: 'lead', data: leadByLid };

  const { data: fileByLid } = await supabase
    .from('client_files')
    .select('id, primary_contact_first_name, primary_contact_last_name')
    .eq('whatsapp_lid', phoneNumber)
    .limit(1)
    .maybeSingle();

  if (fileByLid) return { type: 'client_file', data: fileByLid };

  return null;
}

/**
 * Create a new lead from WhatsApp message
 */
async function createLeadFromMessage(
  phoneNumber: string,
  displayName: string | null,
  messageContent: string
) {
  const nameParts = displayName?.split(' ') || ['WhatsApp', 'User'];
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || nameParts[0];

  const { data, error } = await supabase
    .from('leads')
    .insert({
      phone: phoneNumber,
      first_name: firstName,
      last_name: lastName,
      source: 'whatsapp',
      crm_status: 'nouveau',
      notes: `Initial WhatsApp message: ${messageContent.substring(0, 200)}`,
    })
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Error creating lead:', error);
    return null;
  }

  return data;
}

/**
 * Store WhatsApp message in database with initial AI processing
 */
async function storeWhatsAppMessage(
  messageId: string,
  phoneNumber: string,
  displayName: string | null,
  messageContent: string,
  messageType: string,
  mediaUrl?: string,
  mediaType?: string,
  leadId: string | null = null,
  clientFileId: string | null = null
) {
  try {
    // Insert message first (will be updated with AI results)
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .insert({
        wa_message_id: messageId,
        wa_phone_number: phoneNumber,
        wa_display_name: displayName,
        message_content: messageContent,
        message_type: messageType,
        media_url: mediaUrl,
        media_mime_type: mediaType,
        direction: 'inbound',
        delivery_status: 'delivered',
        lead_id: leadId,
        client_file_id: clientFileId,
        processing_status: 'pending', // Mark for async processing
      })
      .select('id');

    if (error) {
      console.error('Error storing message:', error);
      return null;
    }

    const dbMessageId = data?.[0]?.id;
    if (!dbMessageId) return null;

    // AI processing can be triggered on-demand from the CRM inbox

    return dbMessageId;
  } catch (error) {
    console.error('Error in storeWhatsAppMessage:', error);
    return null;
  }
}

/**
 * Update or create conversation thread
 */
async function updateOrCreateConversation(
  phoneNumber: string,
  leadId: string | null,
  clientFileId: string | null
) {
  const { data: existing } = await supabase
    .from('whatsapp_conversations')
    .select('id, message_count, unread_count')
    .eq('wa_phone_number', phoneNumber)
    .maybeSingle();

  if (existing) {
    // Update existing conversation
    await supabase
      .from('whatsapp_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        message_count: (existing.message_count || 0) + 1,
        unread_count: (existing.unread_count || 0) + 1,
      })
      .eq('id', existing.id);
  } else {
    // Create new conversation
    await supabase
      .from('whatsapp_conversations')
      .insert({
        wa_phone_number: phoneNumber,
        lead_id: leadId,
        client_file_id: clientFileId,
        last_message_at: new Date().toISOString(),
        message_count: 1,
        unread_count: 1,
      });
  }
}

/**
 * Extract message content based on type
 */
function extractMessageContent(message: WhatsAppMessage): {
  content: string;
  type: string;
  mediaUrl?: string;
  mediaMimeType?: string;
} {
  if (message.text) {
    return { content: message.text.body, type: 'text' };
  }
  if (message.image) {
    return {
      content: `[Image: ${message.image.id}]`,
      type: 'image',
      mediaUrl: message.image.id, // WhatsApp returns the media ID, need to fetch via API
      mediaMimeType: message.image.mime_type,
    };
  }
  if (message.document) {
    return {
      content: `[Document: ${message.document.filename}]`,
      type: 'document',
      mediaUrl: message.document.id,
      mediaMimeType: message.document.mime_type,
    };
  }
  return { content: '[Unsupported message type]', type: 'media' };
}

/**
 * POST /api/webhooks/whatsapp
 * Webhook endpoint for WhatsApp Business API
 */
export async function POST(request: NextRequest) {
  try {
    // Read raw body once for HMAC validation + JSON parsing
    const rawBody = await request.text();

    // Validate Meta HMAC-SHA256 signature if APP_SECRET is configured
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (appSecret) {
      const signature = request.headers.get('x-hub-signature-256');
      if (!signature) {
        console.warn('[WhatsApp Webhook] Missing X-Hub-Signature-256 header');
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }
      const expectedSig = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
      if (signature !== expectedSig) {
        console.warn('[WhatsApp Webhook] Invalid HMAC signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload: WhatsAppWebhookPayload = JSON.parse(rawBody);

    // Validate it's actually from WhatsApp
    if (payload.object !== 'whatsapp_business_account') {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // Process each change
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;

        const messages = change.value.messages || [];
        const contacts = change.value.contacts || [];

        // Process each message
        for (const message of messages) {
          // Skip status updates and other non-message events
          if (!message.from) continue;

          const phoneNumber = message.from;
          const contactInfo = contacts.find((c) => c.wa_id === phoneNumber);
          const displayName = contactInfo?.profile?.name || null;

          // Extract message content and media info
          const {
            content: messageContent,
            type: messageType,
            mediaUrl,
            mediaMimeType,
          } = extractMessageContent(message);

          console.log(`[WhatsApp] Received ${messageType} from ${phoneNumber}:`, messageContent);

          // Deduplication: skip if wa_message_id already processed
          const { data: dupCheck } = await supabase
            .from('whatsapp_messages')
            .select('id')
            .eq('wa_message_id', message.id)
            .maybeSingle();
          if (dupCheck) {
            console.log(`[WhatsApp] Duplicate message ignored: ${message.id}`);
            continue;
          }

          // 1. Search for existing customer
          let leadId = null;
          let clientFileId = null;
          let shouldPromptCreation = false;

          const existingCustomer = await findExistingCustomer(phoneNumber);

          if (existingCustomer?.type === 'lead') {
            leadId = existingCustomer.data.id;
            console.log(`[WhatsApp] Linked to existing lead: ${leadId}`);
          } else if (existingCustomer?.type === 'client_file') {
            clientFileId = existingCustomer.data.id;
            console.log(`[WhatsApp] Linked to existing client file: ${clientFileId}`);
          } else {
            // New customer - will need UI confirmation to create lead
            shouldPromptCreation = true;
            console.log(
              `[WhatsApp] New customer - will prompt for lead creation`
            );
          }

          // 2. Store message in database (triggers async AI processing)
          const messageId = await storeWhatsAppMessage(
            message.id,
            phoneNumber,
            displayName,
            messageContent,
            messageType,
            mediaUrl,
            mediaMimeType,
            leadId,
            clientFileId
          );

          if (!messageId) {
            console.error('Failed to store message');
            continue;
          }

          // 3. Update conversation thread
          await updateOrCreateConversation(phoneNumber, leadId, clientFileId);

          // 4. If new customer, return flag for UI to handle creation prompt
          if (shouldPromptCreation) {
            console.log(
              `[WhatsApp] New conversation requires lead creation confirmation`
            );
            // TODO: Send notification to CRM dashboard or store pending action
          }
        }

        // Handle status updates (delivery receipts)
        const statuses = change.value.statuses || [];
        for (const status of statuses) {
          await supabase
            .from('whatsapp_messages')
            .update({ delivery_status: status.status })
            .eq('wa_message_id', status.id);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[WhatsApp Webhook Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/whatsapp
 * Webhook verification endpoint (required by WhatsApp)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verify token matches
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'turquoise2026';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[WhatsApp] Webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('[WhatsApp] Webhook verification failed');
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}
