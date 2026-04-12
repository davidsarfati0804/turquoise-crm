import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function getAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es l'assistant commercial de Turquoise, une agence de voyages spécialisée dans les voyages de groupe (pèlerinages, mariages, séjours organisés).

Ton rôle : lire toute la conversation et rédiger LA réponse la plus pertinente possible, prête à être envoyée par l'agent.

Comment raisonner avant de répondre :
1. Lis toute la conversation et identifie ce que tu sais déjà : prénom/nom du client, l'événement mentionné, le nombre de personnes, les dates.
2. Identifie ce qui manque encore pour pouvoir avancer (faire un devis, envoyer un formulaire).
3. Réponds d'abord au message du client, puis si pertinent, glisse naturellement UNE question pour obtenir l'info manquante la plus importante.
4. Ne pose JAMAIS plusieurs questions d'un coup. Une seule, intégrée naturellement dans la réponse.
5. Si le client a déjà donné son nom, ne le redemande pas. Si l'événement est clair, confirme-le.

Style :
- Français naturel, chaleureux, pas trop formel
- 2-4 lignes maximum
- Pas d'émojis sauf si le client en utilise
- Jamais de liste à puces, jamais de "1. 2. 3."
- Ne mentionne pas que tu es une IA
- Ne donne pas de tarif précis si tu ne l'as pas

Format : texte brut uniquement, sans guillemets ni markdown.`;

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ConversationMessage {
  direction: 'inbound' | 'outbound';
  content: string;
  createdAt: string;
}

export interface AISuggestionResult {
  success: boolean;
  suggestion?: string;
  error?: string;
}

export interface ExtractedLeadInfo {
  first_name?: string;
  last_name?: string;
  adults_count?: number;
  children_count?: number;
  babies_count?: number;
  event_id?: string;
  event_name_detected?: string;
  sejour_start?: string;
  sejour_end?: string;
  notes?: string;
}

export type OcrDocumentType = 'flight_ticket' | 'passport' | 'id_card' | 'hotel_voucher' | 'invoice' | 'unknown';

export interface OcrResult {
  document_type: OcrDocumentType;
  confidence: 'high' | 'medium' | 'low';
  // Vol (billet d'avion)
  passenger_name?: string;
  flight_number?: string;
  flight_date?: string;        // YYYY-MM-DD
  departure_airport?: string;  // ex: "CDG - Paris Charles de Gaulle"
  arrival_airport?: string;    // ex: "MRU - Île Maurice"
  departure_time?: string;     // ex: "14:35"
  arrival_time?: string;       // ex: "06:10"
  booking_reference?: string;
  seat?: string;
  cabin_class?: string;        // Économique, Affaires, Première
  // Passeport / CI
  doc_number?: string;
  nationality?: string;
  date_of_birth?: string;      // YYYY-MM-DD
  expiry_date?: string;        // YYYY-MM-DD
  // Résumé libre
  summary?: string;
}

// ─── Core functions ────────────────────────────────────────────────────────────

/**
 * Extract lead info from a WhatsApp conversation.
 * Called when a new lead is created from an unknown number.
 * Detects: name, voyageurs, event, dates.
 */
export async function extractLeadInfoFromConversation(
  phoneNumber: string,
  displayName?: string | null,
): Promise<ExtractedLeadInfo> {
  const anthropic = getAnthropic();
  if (!anthropic) return {};

  // Load messages
  const { data: msgs } = await supabase
    .from('whatsapp_messages')
    .select('direction, message_content, message_type')
    .eq('wa_phone_number', phoneNumber)
    .order('created_at', { ascending: true })
    .limit(20);

  if (!msgs?.length) return {};

  // Load events for matching
  const { data: events } = await supabase
    .from('events')
    .select('id, name')
    .limit(50);

  const eventList = (events ?? []).map((e) => `- ${e.name} (id: ${e.id})`).join('\n');
  // Only use displayName if it looks like a real name
  const isRealName = displayName && !displayName.includes('_') && !/\d{3,}/.test(displayName) && displayName.length >= 3;
  const clientLabel = isRealName ? displayName! : 'Client';
  const convText = msgs
    .map((m) => `${m.direction === 'inbound' ? clientLabel : 'Agent'}: ${m.message_type !== 'text' ? `[${m.message_type}]` : m.message_content}`)
    .join('\n');

  try {
    const response = await Promise.race([
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: `Extrait les informations d'un client depuis une conversation WhatsApp. Retourne UNIQUEMENT du JSON valide, rien d'autre.`,
        messages: [{
          role: 'user',
          content: `Conversation:\n${convText}\n\nÉvénements disponibles:\n${eventList || 'Aucun'}\n\nExtrait et retourne ce JSON (null si pas trouvé):\n{"first_name":null,"last_name":null,"adults_count":null,"children_count":null,"babies_count":null,"event_id":null,"event_name_detected":null,"sejour_start":null,"sejour_end":null,"notes":null}`,
        }],
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
    ]);

    const text = response.content[0]?.type === 'text' ? response.content[0].text : null;
    if (!text) return {};

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return {};

    const extracted = JSON.parse(match[0]) as ExtractedLeadInfo;
    // Filter out nulls
    return Object.fromEntries(Object.entries(extracted).filter(([, v]) => v !== null && v !== undefined)) as ExtractedLeadInfo;
  } catch {
    return {};
  }
}

/**
 * Save an approved AI response as a few-shot example for future learning.
 */
export async function saveApprovedExample(
  phoneNumber: string,
  approvedResponse: string,
  contactName?: string | null,
): Promise<void> {
  try {
    // Fetch last 5 messages as context snapshot
    const { data: msgs } = await supabase
      .from('whatsapp_messages')
      .select('direction, message_content, message_type')
      .eq('wa_phone_number', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(5);

    const clientLabel = contactName || 'le client';
    const context = (msgs ?? [])
      .reverse()
      .map((m) => {
        const who = m.direction === 'inbound' ? clientLabel : 'Agent';
        const content = m.message_type !== 'text' ? `[${m.message_type}]` : m.message_content;
        return `${who}: ${content}`;
      })
      .join('\n');

    await supabase.from('whatsapp_ai_examples').insert({
      conversation_context: context,
      good_response: approvedResponse,
      contact_name: contactName || null,
    });

    console.log('[WhatsApp AI] Exemple approuvé sauvegardé');
  } catch (err) {
    console.error('[WhatsApp AI] Erreur sauvegarde exemple:', err);
  }
}

/**
 * Generate a suggested WhatsApp response for a given conversation.
 * Reads the last N messages from DB and asks Claude to write the next reply.
 * Injects few-shot examples from past approved responses.
 */
export async function generateWhatsAppSuggestion(
  phoneNumber: string,
  contactName?: string | null,
): Promise<AISuggestionResult> {
  const anthropic = getAnthropic();
  if (!anthropic) {
    return { success: false, error: 'ANTHROPIC_API_KEY non configuré' };
  }

  // Load last 30 messages for context
  const { data: rawMessages, error: dbError } = await supabase
    .from('whatsapp_messages')
    .select('direction, message_content, message_type, created_at')
    .eq('wa_phone_number', phoneNumber)
    .order('created_at', { ascending: true })
    .limit(30);

  if (dbError) {
    return { success: false, error: 'Erreur de chargement des messages' };
  }

  if (!rawMessages?.length) {
    return { success: false, error: 'Aucun message trouvé pour ce contact' };
  }

  // Load last 6 approved examples for few-shot learning
  const { data: examples } = await supabase
    .from('whatsapp_ai_examples')
    .select('conversation_context, good_response')
    .order('created_at', { ascending: false })
    .limit(6);

  // Build conversation context
  const clientLabel = contactName ? contactName : 'le client';
  const conversationText = rawMessages
    .map((m) => {
      const who = m.direction === 'inbound' ? clientLabel : 'Turquoise (agent)';
      const content = m.message_type !== 'text' ? `[${m.message_type}]` : m.message_content;
      return `${who}: ${content}`;
    })
    .join('\n');

  // Build few-shot block from approved examples
  let fewShotBlock = '';
  if (examples?.length) {
    const examplesText = examples
      .map((e, i) =>
        `--- Exemple ${i + 1} ---\nContexte:\n${e.conversation_context}\nRéponse envoyée:\n${e.good_response}`,
      )
      .join('\n\n');
    fewShotBlock = `\n\nExemples de bonnes réponses déjà validées par l'équipe (inspire-toi du style et du ton) :\n\n${examplesText}`;
  }
  const systemPrompt = SYSTEM_PROMPT + fewShotBlock;

  try {
    const response = await Promise.race([
      anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Voici la conversation WhatsApp avec ${clientLabel}:\n\n${conversationText}\n\nRédige la prochaine réponse de l'agent Turquoise.`,
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Claude timeout après 20s')), 20000),
      ),
    ]);

    const suggestion =
      response.content[0]?.type === 'text' ? response.content[0].text.trim() : null;

    if (!suggestion) {
      return { success: false, error: 'Pas de réponse générée' };
    }

    return { success: true, suggestion };
  } catch (err) {
    console.error('[WhatsApp AI] Claude error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur Claude',
    };
  }
}

/**
 * Analyse une image envoyée par un client (billet d'avion, passeport, CI…)
 * via Claude Vision et retourne les données structurées extraites.
 */
export async function analyzeImageWithOCR(imageUrl: string): Promise<OcrResult | null> {
  const anthropic = getAnthropic();
  if (!anthropic) return null;

  // Fetch image and convert to base64 (Claude Vision requires base64 or specific URL schemes)
  let imageBase64: string;
  let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  try {
    const resp = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return null;
    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    mediaType = (
      contentType.includes('png') ? 'image/png' :
      contentType.includes('webp') ? 'image/webp' :
      contentType.includes('gif') ? 'image/gif' :
      'image/jpeg'
    ) as typeof mediaType;
    const buffer = await resp.arrayBuffer();
    imageBase64 = Buffer.from(buffer).toString('base64');
  } catch {
    return null;
  }

  const prompt = `Analyse ce document envoyé par un client d'une agence de voyage.

Identifie le type de document et extrais toutes les informations visibles.
Retourne UNIQUEMENT du JSON valide, rien d'autre :

{
  "document_type": "flight_ticket|passport|id_card|hotel_voucher|invoice|unknown",
  "confidence": "high|medium|low",
  "passenger_name": null,
  "flight_number": null,
  "flight_date": null,
  "departure_airport": null,
  "arrival_airport": null,
  "departure_time": null,
  "arrival_time": null,
  "booking_reference": null,
  "seat": null,
  "cabin_class": null,
  "doc_number": null,
  "nationality": null,
  "date_of_birth": null,
  "expiry_date": null,
  "summary": null
}

Règles :
- flight_date : format YYYY-MM-DD
- date_of_birth / expiry_date : format YYYY-MM-DD
- departure_airport / arrival_airport : inclure le code IATA si visible, ex: "CDG - Paris Charles de Gaulle" ou "MRU - Maurice"
- summary : résumé en 1 ligne de ce que tu vois (toujours rempli)
- null pour les champs non visibles ou non applicables`;

  try {
    const response = await Promise.race([
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageBase64 },
            },
            { type: 'text', text: prompt },
          ],
        }],
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 20000)),
    ]);

    const text = response.content[0]?.type === 'text' ? response.content[0].text : null;
    if (!text) return null;

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const raw = JSON.parse(match[0]) as OcrResult;
    // Filter nulls for cleanliness but keep document_type and confidence
    return {
      ...Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== null && v !== undefined)),
      document_type: raw.document_type || 'unknown',
      confidence: raw.confidence || 'low',
    } as OcrResult;
  } catch (err) {
    console.error('[OCR] Claude error:', err);
    return null;
  }
}

// ─── Dossier auto-fill ─────────────────────────────────────────────────────────

/**
 * Remplit automatiquement les champs VIDES d'un lead ou d'un dossier
 * depuis les données extraites d'un message WhatsApp.
 * Règle : on ne remplace jamais un champ déjà renseigné.
 * Pour les participants : on ajoute ceux qui manquent, jamais les existants.
 */
export async function matchExtractedDataToDossier(
  messageId: string,
  extracted: ExtractedLeadInfo,
  detectedEventId?: string,
): Promise<{ success: boolean; updatedLeadFields?: string[]; updatedFileFields?: string[] }> {
  try {
    const { data: message } = await supabase
      .from('whatsapp_messages')
      .select('lead_id, client_file_id')
      .eq('id', messageId)
      .single();

    if (!message) return { success: false };

    const updatedLeadFields: string[] = [];
    const updatedFileFields: string[] = [];

    const isBlank = (v: string | null | undefined) =>
      !v || ['inconnu', 'unknown', ''].includes(v.toLowerCase().trim());

    // ── LEAD ──────────────────────────────────────────────────────────────────
    if (message.lead_id) {
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', message.lead_id)
        .single();

      if (lead) {
        const u: Record<string, unknown> = {};

        if (isBlank(lead.first_name) && extracted.first_name) {
          u.first_name = extracted.first_name;
          updatedLeadFields.push('first_name');
        }
        if (isBlank(lead.last_name) && extracted.last_name) {
          u.last_name = extracted.last_name;
          updatedLeadFields.push('last_name');
        }
        if (!lead.event_id && (detectedEventId || extracted.event_id)) {
          u.event_id = detectedEventId ?? extracted.event_id;
          updatedLeadFields.push('event_id');
        }
        if (extracted.adults_count && lead.adults_count === 1 && lead.children_count === 0) {
          u.adults_count = extracted.adults_count;
          updatedLeadFields.push('adults_count');
        }
        if (extracted.children_count && lead.children_count === 0) {
          u.children_count = extracted.children_count;
          updatedLeadFields.push('children_count');
        }

        if (Object.keys(u).length > 0) {
          u.updated_at = new Date().toISOString();
          await supabase.from('leads').update(u).eq('id', message.lead_id);
        }
      }
    }

    // ── CLIENT FILE ───────────────────────────────────────────────────────────
    if (message.client_file_id) {
      const { data: file } = await supabase
        .from('client_files')
        .select('*')
        .eq('id', message.client_file_id)
        .single();

      if (file) {
        const u: Record<string, unknown> = {};

        if (isBlank(file.primary_contact_first_name) && extracted.first_name) {
          u.primary_contact_first_name = extracted.first_name;
          updatedFileFields.push('primary_contact_first_name');
        }
        if (isBlank(file.primary_contact_last_name) && extracted.last_name) {
          u.primary_contact_last_name = extracted.last_name;
          updatedFileFields.push('primary_contact_last_name');
        }
        if (!file.event_id && (detectedEventId || extracted.event_id)) {
          u.event_id = detectedEventId ?? extracted.event_id;
          updatedFileFields.push('event_id');
        }
        if (extracted.adults_count && file.adults_count === 1 && file.children_count === 0) {
          u.adults_count = extracted.adults_count;
          u.total_participants = extracted.adults_count;
          updatedFileFields.push('adults_count', 'total_participants');
        }

        if (Object.keys(u).length > 0) {
          u.updated_at = new Date().toISOString();
          await supabase.from('client_files').update(u).eq('id', message.client_file_id);
        }

        // ── PARTICIPANTS — ajoute ceux qui manquent ─────────────────────────
        // (logique basée sur les noms extraits, pas sur ExtractedLeadInfo qui
        //  n'a pas de tableau de noms — à enrichir si besoin)
      }
    }

    console.log('[AI] Dossier matched:', { updatedLeadFields, updatedFileFields });
    return { success: true, updatedLeadFields, updatedFileFields };
  } catch (err) {
    console.error('[AI] matchExtractedDataToDossier error:', err);
    return { success: false };
  }
}
