/**
 * WhatsApp Business API Service
 * Handles incoming messages, outbound messaging, and conversation tracking
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const whatsappApiUrl = 'https://graph.facebook.com/v19.0';
const whatsappApiToken = process.env.WHATSAPP_API_TOKEN;
const whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const whatsappSendProvider = process.env.WHATSAPP_SEND_PROVIDER;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface WhatsAppBIData {
  phone: string
  clientName: string
  eventName: string
  biNumber: string
  fileReference: string
  biData: any
}

export interface WhatsAppResult {
  success: boolean
  messageId?: string
  error?: string
  whatsappUrl?: string
}

export interface WhatsAppMessageMetadata {
  wa_phone_number: string
  template_id?: string
  quick_reply_id?: string
}

/**
 * Envoie le Bulletin d'Inscription via WhatsApp
 * 
 * Méthode actuelle: wa.me (WhatsApp Web/App)
 * À IMPLÉMENTER: WhatsApp Business Cloud API ou Twilio
 */
export async function sendBIWhatsApp(data: WhatsAppBIData): Promise<WhatsAppResult> {
  try {
    // Nettoyer le numéro de téléphone
    const phone = cleanPhoneNumber(data.phone)
    
    // Générer le message
    const message = formatWhatsAppMessage(data)
    
    // Méthode actuelle: wa.me (ouvre WhatsApp avec message pré-rempli)
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    
    // TODO: Implémenter l'envoi via API
    // Option 1: WhatsApp Business Cloud API
    // const response = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     messaging_product: 'whatsapp',
    //     to: phone,
    //     type: 'text',
    //     text: { body: message }
    //   })
    // })
    
    // Option 2: Twilio
    // const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Basic ${Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString('base64')}`,
    //     'Content-Type': 'application/x-www-form-urlencoded'
    //   },
    //   body: new URLSearchParams({
    //     From: `whatsapp:${FROM_NUMBER}`,
    //     To: `whatsapp:${phone}`,
    //     Body: message
    //   })
    // })

    console.log('📱 WhatsApp BI préparé pour:', phone)
    console.log('URL:', whatsappUrl)

    return {
      success: true,
      whatsappUrl,
      messageId: `mock-wa-${Date.now()}`
    }
  } catch (error) {
    console.error('Erreur envoi WhatsApp:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Nettoie et formate le numéro de téléphone pour WhatsApp
 * Format attendu: 33612345678 (sans le +)
 */
export function cleanPhoneNumber(phone: string): string {
  // Retirer tous les caractères non-numériques
  let cleaned = phone.replace(/\D/g, '')
  
  // Si commence par +, retirer
  if (phone.startsWith('+')) {
    cleaned = phone.slice(1).replace(/\D/g, '')
  }
  
  // Si commence par 0 (France), remplacer par 33
  if (cleaned.startsWith('0')) {
    cleaned = '33' + cleaned.slice(1)
  }
  
  return cleaned
}

/**
 * Formate le message WhatsApp avec le contenu du BI
 */
export function formatWhatsAppMessage(data: WhatsAppBIData): string {
  const { biData, fileReference, biNumber } = data

  return `🏝️ *BULLETIN D'INSCRIPTION*

*Référence:* ${fileReference}
*N° BI:* ${biNumber}

*Client:* ${biData.client.first_name} ${biData.client.last_name}
*Téléphone:* ${biData.client.phone}
${biData.client.email ? `*Email:* ${biData.client.email}\n` : ''}
━━━━━━━━━━━━━━━━━━━━

🏝️ *DÉTAILS DU VOYAGE*

*Événement:* ${biData.event.name}
*Destination:* ${biData.event.destination}
*Hôtel:* ${biData.event.hotel}

━━━━━━━━━━━━━━━━━━━━

👥 *PARTICIPANTS* (${biData.total_participants} personnes)

• Adultes: ${biData.adults_count}
• Enfants: ${biData.children_count}
• Bébés: ${biData.babies_count}

${biData.participants && biData.participants.length > 0 ? `
*Liste:*
${biData.participants.map((p: any, idx: number) => `${idx + 1}. ${p.first_name} ${p.last_name} (${p.participant_type})`).join('\n')}
` : ''}
━━━━━━━━━━━━━━━━━━━━

💰 *TARIFICATION*

*Type de chambre:* ${biData.room_type.name}
*Prix par nuit:* ${biData.pricing.price_per_night} ${biData.pricing.currency}

━━━━━━━━━━━━━━━━━━━━

💵 *MONTANTS*

*TOTAL:* ${biData.quoted_price} ${biData.pricing.currency}
*Déjà payé:* ${biData.amount_paid} ${biData.pricing.currency}
*Solde restant:* ${biData.balance_due} ${biData.pricing.currency}

━━━━━━━━━━━━━━━━━━━━

Merci de votre confiance! 🙏

_Document généré le ${new Date().toLocaleDateString('fr-FR')}_`
}

/**
 * Valide un numéro de téléphone pour WhatsApp
 */
export function validatePhoneNumber(phone: string): {
  valid: boolean
  error?: string
  formatted?: string
} {
  if (!phone || phone.trim() === '') {
    return { valid: false, error: 'Numéro de téléphone manquant' }
  }

  const cleaned = cleanPhoneNumber(phone)

  // Vérifier la longueur (minimum 10 chiffres)
  if (cleaned.length < 10) {
    return { valid: false, error: 'Numéro de téléphone trop court' }
  }

  // Vérifier la longueur (maximum 15 chiffres selon E.164)
  if (cleaned.length > 15) {
    return { valid: false, error: 'Numéro de téléphone trop long' }
  }

  return {
    valid: true,
    formatted: cleaned
  }
}

/**
 * ============================================
 * WHATSAPP BUSINESS API - NEW INTEGRATION
 * ============================================
 */

/**
 * Send a text message via WhatsApp Business API
 */
export async function sendWhatsAppMessage(
  toPhoneNumber: string,
  messageContent: string,
  leadId?: string,
  clientFileId?: string,
  metadata?: WhatsAppMessageMetadata
): Promise<{
  success: boolean
  messageId?: string
  provider?: 'cloud-api' | 'nanoclaw-ipc'
  error?: string
}> {
  try {
    // Derive the target WhatsApp JID from the phone number stored in the DB.
    // Format "lid:XXXXXXXX" means the contact uses a @lid JID (unresolved LID).
    // Baileys 6.17+ can send directly to @lid JIDs.
    const cleanPhone = toPhoneNumber.startsWith('lid:') ? '' : toPhoneNumber.replace(/\D/g, '');
    let targetJid: string;
    if (toPhoneNumber.startsWith('lid:')) {
      targetJid = `${toPhoneNumber.slice(4)}@lid`;
    } else {
      targetJid = `${cleanPhone}@s.whatsapp.net`;
    }

    // Only try Cloud API when WHATSAPP_SEND_PROVIDER is not forced to nanoclaw-ipc.
    // Note: Cloud API cannot send to @lid JIDs — always use NanoClaw for those.
    const cloudConfigured = Boolean(whatsappApiToken && whatsappPhoneNumberId);
    const forceNanoclaw = whatsappSendProvider === 'nanoclaw-ipc' || targetJid.endsWith('@lid');
    const forceCloud = whatsappSendProvider === 'cloud-api' && !targetJid.endsWith('@lid');

    const queueViaNanoclaw = async (): Promise<{
      provider: 'nanoclaw-ipc';
      messageId: string;
    }> => {
      const ipcMessageId = `crm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const { error } = await supabase.from('whatsapp_send_queue').insert({
        chat_jid: targetJid,
        message_type: 'text',
        message_text: messageContent,
        status: 'pending',
      });

      if (error) {
        console.error('[WhatsApp Service] Failed to queue message in Supabase:', error);
        throw new Error(`Queue error: ${error.message}`);
      }

      console.log(`[WhatsApp Service] Queued via Supabase for ${targetJid}`);
      return { provider: 'nanoclaw-ipc', messageId: `nanoclaw-ipc-${ipcMessageId}` };
    };

    let provider: 'cloud-api' | 'nanoclaw-ipc';
    let messageId: string;

    if (!forceNanoclaw && cloudConfigured) {
      console.log(`[WhatsApp Service] Sending via Cloud API to ${cleanPhone}`);
      const response = await fetch(
        `${whatsappApiUrl}/${whatsappPhoneNumberId}/messages`,
        {
          method: 'POST',
          signal: AbortSignal.timeout(10000),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${whatsappApiToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'text',
            text: {
              body: messageContent,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[WhatsApp Service] API Error:', errorData);

        if (forceCloud) {
          return {
            success: false,
            error: `WhatsApp API error: ${errorData.error?.message || 'Unknown error'}`,
          };
        }

        console.warn(
          '[WhatsApp Service] Falling back to NanoClaw IPC because Cloud API failed.',
        );
        const nanoclawResult = await queueViaNanoclaw();
        provider = nanoclawResult.provider;
        messageId = nanoclawResult.messageId;
      } else {
        const data = await response.json();
        messageId = data.messages?.[0]?.id;
        if (!messageId) {
          if (forceCloud) {
            return { success: false, error: 'No message ID returned from API' };
          }
          const nanoclawResult = await queueViaNanoclaw();
          provider = nanoclawResult.provider;
          messageId = nanoclawResult.messageId;
        } else {
          provider = 'cloud-api';
        }
      }
    } else {
      if (forceCloud && !cloudConfigured) {
        return {
          success: false,
          error:
            'WHATSAPP_SEND_PROVIDER=cloud-api mais WHATSAPP_API_TOKEN/WHATSAPP_PHONE_NUMBER_ID manquants',
        };
      }

      const nanoclawResult = await queueViaNanoclaw();
      provider = nanoclawResult.provider;
      messageId = nanoclawResult.messageId;
    }

    // Store outbound message in database
    const { error: dbError } = await supabase
      .from('whatsapp_messages')
      .insert({
        wa_message_id: messageId,
        wa_phone_number: toPhoneNumber,
        message_content: messageContent,
        message_type: 'text',
        direction: 'outbound',
        delivery_status: provider === 'cloud-api' ? 'sent' : 'queued',
        lead_id: leadId || null,
        client_file_id: clientFileId || null,
        metadata: {
          ...(metadata || {}),
          provider,
          chat_jid: targetJid,
        },
      });

    if (dbError) {
      console.error('[WhatsApp Service] Database error storing message:', dbError);
      return {
        success: false,
        error: `Message sent but not recorded: ${dbError.message}`,
      };
    }

    console.log(
      `[WhatsApp Service] Message sent successfully: ${messageId} (provider=${provider})`,
    );

    return { success: true, messageId, provider };
  } catch (error) {
    console.error('[WhatsApp Service] Error sending message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export type MediaType = 'image' | 'video' | 'document' | 'audio';

/**
 * Send a media file (image, video, PDF, audio) via NanoClaw IPC.
 * The mediaUrl must be a publicly accessible URL (e.g. from Supabase Storage).
 * caption is optional (shown below the media on WhatsApp).
 */
export async function sendWhatsAppMedia(
  toPhoneNumber: string,
  mediaUrl: string,
  mediaType: MediaType,
  caption?: string,
  leadId?: string,
  clientFileId?: string,
  filename?: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const targetJid = toPhoneNumber.startsWith('lid:')
      ? `${toPhoneNumber.slice(4)}@lid`
      : `${toPhoneNumber.replace(/\D/g, '')}@s.whatsapp.net`;
    const ipcMessageId = `crm-media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const { error: queueError } = await supabase.from('whatsapp_send_queue').insert({
      chat_jid: targetJid,
      message_type: mediaType,
      media_url: mediaUrl,
      media_caption: caption || null,
      media_filename: filename || null,
      status: 'pending',
    });

    if (queueError) {
      console.error('[WhatsApp Service] Failed to queue media in Supabase:', queueError);
      return { success: false, error: `Queue error: ${queueError.message}` };
    }

    console.log(`[WhatsApp Service] Queued media via Supabase: ${targetJid} type=${mediaType}`);

    // Store in DB
    const { error: dbError } = await supabase
      .from('whatsapp_messages')
      .insert({
        wa_message_id: `nanoclaw-ipc-${ipcMessageId}`,
        wa_phone_number: toPhoneNumber,
        message_content: filename || caption || `[${mediaType}]`,
        message_type: mediaType,
        direction: 'outbound',
        delivery_status: 'queued',
        lead_id: leadId || null,
        client_file_id: clientFileId || null,
        metadata: { provider: 'nanoclaw-ipc', chat_jid: targetJid, media_url: mediaUrl },
      });

    if (dbError) {
      console.error('[WhatsApp Service] DB error storing media message:', dbError);
      return { success: false, error: `Sent but not recorded: ${dbError.message}` };
    }

    return { success: true, messageId: `nanoclaw-ipc-${ipcMessageId}`, provider: 'nanoclaw-ipc' } as any;
  } catch (error) {
    console.error('[WhatsApp Service] Error sending media:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get response templates for quick replies
 */
export async function getResponseTemplates(): Promise<
  Array<{
    id: string
    name: string
    content: string
    category: string
  }>
> {
  const { data, error } = await supabase
    .from('whatsapp_response_templates')
    .select('id, name, content, category')
    .eq('active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('[WhatsApp Service] Error fetching templates:', error);
    return [];
  }

  return data || [];
}

/**
 * Get conversation history for a phone number
 */
export async function getConversationHistory(
  phoneNumber: string,
  limit: number = 50
): Promise<
  Array<{
    id: string
    message_content: string
    direction: string
    delivery_status: string
    created_at: string
  }>
> {
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('id, message_content, direction, delivery_status, created_at')
    .eq('wa_phone_number', phoneNumber)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[WhatsApp Service] Error fetching history:', error);
    return [];
  }

  return (data || []).reverse(); // Return in chronological order
}

/**
 * Get all active conversations
 */
export async function getActiveConversations(): Promise<
  Array<{
    id: string
    wa_phone_number: string
    lead_id?: string
    client_file_id?: string
    last_message_at: string
    message_count: number
    unread_count: number
    status: string
  }>
> {
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('status', 'active')
    .order('last_message_at', { ascending: false });

  if (error) {
    console.error('[WhatsApp Service] Error fetching conversations:', error);
    return [];
  }

  return data || [];
}

/**
 * Mark conversation messages as read
 */
export async function markConversationAsRead(
  phoneNumber: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({ unread_count: 0 })
      .eq('wa_phone_number', phoneNumber);

    return !error;
  } catch (error) {
    console.error('[WhatsApp Service] Error marking as read:', error);
    return false;
  }
}
