/**
 * WhatsApp Business API Service
 * Handles incoming messages, outbound messaging, and conversation tracking
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const whatsappApiUrl = 'https://graph.instagram.com/v18.0';
const whatsappApiToken = process.env.WHATSAPP_API_TOKEN!;
const whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;

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
  error?: string
}> {
  try {
    // Ensure phone number is in correct format (without +)
    const cleanPhone = toPhoneNumber.replace(/\D/g, '');

    console.log(`[WhatsApp Service] Sending message to ${cleanPhone}`);

    // Call WhatsApp API to send message
    const response = await fetch(
      `${whatsappApiUrl}/${whatsappPhoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${whatsappApiToken}`,
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
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[WhatsApp Service] API Error:', errorData);
      return {
        success: false,
        error: `WhatsApp API error: ${errorData.error?.message || 'Unknown error'}`,
      };
    }

    const data = await response.json();
    const messageId = data.messages?.[0]?.id;

    if (!messageId) {
      return { success: false, error: 'No message ID returned from API' };
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
        delivery_status: 'sent',
        lead_id: leadId || null,
        client_file_id: clientFileId || null,
        metadata: metadata || {},
      });

    if (dbError) {
      console.error('[WhatsApp Service] Database error storing message:', dbError);
      return {
        success: false,
        error: `Message sent but not recorded: ${dbError.message}`,
      };
    }

    console.log(`[WhatsApp Service] Message sent successfully: ${messageId}`);

    return { success: true, messageId };
  } catch (error) {
    console.error('[WhatsApp Service] Error sending message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
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
