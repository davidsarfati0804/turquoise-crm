import { createClient } from '@supabase/supabase-js';

// Initialize OpenAI only in server context
let openai: any = null;

function getOpenAI() {
  if (!openai && typeof window === 'undefined') {
    try {
      const { default: OpenAI } = require('openai');
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } catch (e) {
      console.warn('[WhatsApp AI] OpenAI module not available - AI features disabled');
      return null;
    }
  }
  return openai;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Lean extraction format - only essential fields
 * Budget-optimized for GPT-3.5-turbo
 */
export interface ExtractedMessageData {
  person_count?: number;                         // Total adults + children
  names?: string[];                               // Extracted names
  event_name_mentioned?: string;                  // "mariage de Rudy", etc
  nights_requested?: number;                      // Duration
  budget?: number;                                // If mentioned
  missing_critical_fields: string[];              // What MUST ask next
  raw_extract: string;                            // What we found
  confidence_score?: number;                      // 0-1
}

export interface SuggestedResponse {
  response: string;                               // Short simple response
  questions_to_ask: string[];                     // What to ask next (2-3 questions max)
}

/**
 * Extract MINIMAL info from WhatsApp message using GPT-3.5-turbo
 * Budget-optimized: only extracts person_count, names, event, nights, missing fields
 * ~100 tokens per call = cheapest option
 */
export async function extractMessageData(
  messageContent: string,
  contactName?: string
): Promise<{
  success: boolean;
  data?: ExtractedMessageData;
  error?: string;
}> {
  try {
    const ai = getOpenAI();
    if (!ai) {
      return { success: false, error: 'OpenAI not configured' };
    }

    const response = await ai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature: 0.2,
      max_tokens: 150, // Keep it SHORT
      messages: [
        {
          role: 'system',
          content: `Extract minimal booking info from French messages. Return ONLY JSON:
{
  "person_count": number or null,
  "names": ["name1", "name2"] or [],
  "event_name_mentioned": "mariage de Rudy" or null,
  "nights_requested": number or null,
  "budget": number or null,
  "missing_critical_fields": ["prix", "chambre", "dates"] or [],
  "raw_extract": "what you found",
  "confidence_score": 0-1
}`,
        },
        {
          role: 'user',
          content: `Message: "${messageContent}"`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: 'No response from OpenAI' };
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: 'Could not parse JSON' };
    }

    const extractedData = JSON.parse(jsonMatch[0]) as ExtractedMessageData;
    console.log('[WhatsApp AI] Extracted:', extractedData);

    return { success: true, data: extractedData };
  } catch (error) {
    console.error('[WhatsApp AI] Extraction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Extraction failed',
    };
  }
}

/**
 * Generate SIMPLE response based on missing fields
 * Ultra-lightweight: just ask for what we need
 * Example: missing "prix, chambre" → "Quel est votre budget? Chambre simple ou double?"
 */
export async function generateResponseSuggestion(
  extractedData: ExtractedMessageData
): Promise<{
  success: boolean;
  suggestion?: SuggestedResponse;
  error?: string;
}> {
  try {
    const missingFields = extractedData.missing_critical_fields || [];
    
    // Map common missing fields to French questions
    const fieldToQuestion: Record<string, string> = {
      'prix': 'Quel est votre budget?',
      'price': 'Quel est votre budget?',
      'budget': 'Quel est votre budget?',
      'chambre': 'Chambre simple ou double?',
      'room': 'Chambre simple ou double?',
      'dates': 'Quelles sont vos dates?',
      'dates de voyage': 'Quelles sont vos dates?',
      'nuits': 'Combien de nuits?',
      'nights': 'Combien de nuits?',
      'type chambre': 'Quel type de chambre?',
      'room type': 'Quel type de chambre?',
      'email': 'Quel est votre email?',
      'email address': 'Quel est votre email?',
    };

    // Pick 2-3 most important questions
    const questions = missingFields
      .slice(0, 3)
      .map((field) => fieldToQuestion[field.toLowerCase()] || `Pouvez-vous me dire ${field}?`)
      .filter(Boolean);

    // Simple greeting response
    const response = `Bonjour${extractedData.names?.[0] ? ' ' + extractedData.names[0] : ''}! 👋\nMerci pour votre intérêt.`;

    const suggestion: SuggestedResponse = {
      response,
      questions_to_ask: questions.length > 0 ? questions : ['Pouvez-vous me donner plus de détails?'],
    };

    console.log('[WhatsApp AI] Generated simple suggestion:', suggestion);
    return { success: true, suggestion };
  } catch (error) {
    console.error('[WhatsApp AI] Response generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Generation failed',
    };
  }
}

/**
 * Detect event from message using simple fuzzy matching + GPT-3.5
 * Budget-optimized - only ask GPT if fuzzy match is high enough
 */
export async function detectEventFromMessage(
  messageContent: string
): Promise<{
  success: boolean;
  eventId?: string;
  eventName?: string;
  confidence?: number;
  error?: string;
}> {
  try {
    // Get all events and aliases from DB
    const { data: events } = await supabase.from('events').select('id, name');
    const { data: aliases } = await supabase.from('event_name_aliases').select('event_id, alias_name');

    if (!events?.length) {
      return { success: true }; // No events
    }

    // Build searchable list
    const eventMap = new Map();
    events.forEach((e) => eventMap.set(e.name.toLowerCase(), { id: e.id, name: e.name }));
    aliases?.forEach((a) => eventMap.set(a.alias_name.toLowerCase(), { id: a.event_id, name: a.alias_name }));

    // Simple fuzzy match first
    const msgLower = messageContent.toLowerCase();
    for (const [eventKey, eventData] of eventMap) {
      if (msgLower.includes(eventKey)) {
        console.log('[Event Detection] Fuzzy match found:', eventData.name);
        return {
          success: true,
          eventId: eventData.id,
          eventName: eventData.name,
          confidence: 0.9,
        };
      }
    }

    // No exact match found
    return { success: true };
  } catch (error) {
    console.error('[Event Detection] Error:', error);
    return { success: true }; // Silent fail on events
  }
}

/**
 * LEAN pipeline - extract + detect event + suggest response
 * Budget optimized, ~200 tokens total per message
 */
export async function processMessageIntelligence(
  messageId: string,
  messageContent: string,
  contactName?: string
): Promise<{
  success: boolean;
  extractedData?: ExtractedMessageData;
  suggestedResponse?: SuggestedResponse;
  detectedEventId?: string;
  detectedEventName?: string;
  error?: string;
}> {
  try {
    console.log('[WhatsApp AI] Processing:', messageId);

    // Step 1: Extract (50 tokens)
    const extractionResult = await extractMessageData(messageContent, contactName);
    if (!extractionResult.success) {
      console.warn('[WhatsApp AI] Extraction failed, using empty data');
    }

    const extractedData = extractionResult.data || {
      person_count: undefined,
      names: [],
      event_name_mentioned: undefined,
      nights_requested: undefined,
      budget: undefined,
      missing_critical_fields: ['prix', 'chambre', 'dates'],
      raw_extract: messageContent,
      confidence_score: 0.3,
    };

    // Step 2: Detect event (fuzzy, no API cost)
    const eventDetection = await detectEventFromMessage(messageContent);

    // Step 3: Generate response (50 tokens - mostly template)
    const responseResult = await generateResponseSuggestion(extractedData);

    // Update DB
    const { error: updateError } = await supabase
      .from('whatsapp_messages')
      .update({
        extracted_data: extractedData,
        suggested_response: responseResult.suggestion?.response,
        suggested_response_questions: responseResult.suggestion?.questions_to_ask,
        detected_event_id: eventDetection.eventId,
        event_detection_confidence: eventDetection.confidence || 0,
        processing_status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    if (updateError) {
      console.error('[WhatsApp AI] DB update error:', updateError);
    }

    return {
      success: true,
      extractedData,
      suggestedResponse: responseResult.suggestion,
      detectedEventId: eventDetection.eventId,
      detectedEventName: eventDetection.eventName,
    };
  } catch (error) {
    console.error('[WhatsApp AI] Pipeline error:', error);

    // Update error status (ignore if fails)
    try {
      await supabase
        .from('whatsapp_messages')
        .update({
          processing_status: 'failed',
          processing_error: error instanceof Error ? error.message : 'Unknown',
        })
        .eq('id', messageId);
    } catch (dbErr) {
      console.error('[WhatsApp AI] DB error update failed:', dbErr);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed',
    };
  }
}

/**
 * Record feedback for learning (future use)
 * For now just log what was corrected
 */
export async function recordExtractionFeedback(
  messageId: string,
  originalExtraction: ExtractedMessageData,
  correctedExtraction: ExtractedMessageData,
  notes?: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Find differences
    const corrections: Record<string, any> = {};
    Object.keys(originalExtraction).forEach((key) => {
      const orig = JSON.stringify((originalExtraction as any)[key]);
      const corr = JSON.stringify((correctedExtraction as any)[key]);
      if (orig !== corr) {
        corrections[key] = {
          original: (originalExtraction as any)[key],
          corrected: (correctedExtraction as any)[key],
        };
      }
    });

    const { error } = await supabase
      .from('whatsapp_extraction_feedback')
      .insert({
        message_id: messageId,
        original_extraction: originalExtraction,
        corrected_extraction: correctedExtraction,
        corrections,
        extraction_accuracy_score: Object.keys(corrections).length === 0 ? 5 : 3,
        notes,
        feedback_type: Object.keys(corrections).length > 0 ? 'correction' : 'validation',
      });

    if (error) {
      console.error('[WhatsApp AI] Feedback error:', error);
      return { success: false, error: error.message };
    }

    console.log('[WhatsApp AI] Feedback recorded:', messageId);
    return { success: true };
  } catch (error) {
    console.error('[WhatsApp AI] Feedback error:', error);
    return { success: false, error: 'Feedback failed' };
  }
}
