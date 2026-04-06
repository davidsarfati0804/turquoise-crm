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

Ton rôle : lire la conversation WhatsApp d'un client et rédiger UNE réponse naturelle, chaleureuse et professionnelle, prête à être envoyée par l'agent.

Règles de rédaction :
- Réponds toujours en français, de façon naturelle et conversationnelle
- Sois chaleureux mais professionnel (pas trop formel, pas trop familier)
- Réponds directement à ce que le client a dit/demandé
- Si le client cherche des infos sur un séjour : demande ce qui manque (nombre de personnes, dates, type de chambre)
- Si le client donne des infos : confirme-les et avance vers l'étape suivante (proposition de prix, formulaire d'inscription)
- Reste concis : 2-4 lignes maximum, jamais de longs paragraphes
- N'utilise pas d'émojis sauf si le client en utilise lui-même
- Ne mentionne JAMAIS que tu es une IA ou un assistant automatique
- Ne promets pas de tarifs précis si tu n'as pas l'info
- Si le client demande un tarif et que tu n'as pas l'info : dis que tu vas revenir vers lui avec une proposition

Format de ta réponse : texte brut uniquement, sans guillemets ni formatage markdown.`;

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

// ─── Core function ─────────────────────────────────────────────────────────────

/**
 * Generate a suggested WhatsApp response for a given conversation.
 * Reads the last N messages from DB and asks Claude to write the next reply.
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

  // Build conversation context for Claude
  const clientLabel = contactName ? contactName : 'le client';
  const conversationText = rawMessages
    .map((m) => {
      const who = m.direction === 'inbound' ? clientLabel : 'Turquoise (agent)';
      const content =
        m.message_type !== 'text' ? `[${m.message_type}]` : m.message_content;
      return `${who}: ${content}`;
    })
    .join('\n');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Voici la conversation WhatsApp avec ${clientLabel}:\n\n${conversationText}\n\nRédige la prochaine réponse de l'agent Turquoise.`,
        },
      ],
    });

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
