import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface ParsedMessage {
  sender: 'agent' | 'client';
  content: string;
  senderName: string;
}

const AGENT_NAMES = ['Club Turquoise', 'Turquoise', 'club turquoise'];

function isAgent(name: string): boolean {
  return AGENT_NAMES.some(a => name.toLowerCase().includes(a.toLowerCase()));
}

function parseWhatsAppTxt(text: string, fileName: string): ParsedMessage[] {
  const lines = text.split('\n');
  const messages: ParsedMessage[] = [];
  // Format: [DD/MM/YYYY HH:MM:SS] Name: content
  const msgRegex = /^\[(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2})\] ([^:]+): (.+)$/;
  let current: ParsedMessage | null = null;

  for (const line of lines) {
    const match = line.match(msgRegex);
    if (match) {
      if (current) messages.push(current);
      const senderName = match[2].trim();
      const content = match[3].trim();
      // Skip system messages, media placeholders
      if (
        content.includes('absente') ||
        content.includes('supprimé') ||
        content.includes('<joint') ||
        content.length < 3
      ) {
        current = null;
        continue;
      }
      current = {
        sender: isAgent(senderName) ? 'agent' : 'client',
        content,
        senderName,
      };
    } else if (current && line.trim()) {
      // Continuation of previous message
      current.content += '\n' + line.trim();
    }
  }
  if (current) messages.push(current);
  return messages;
}

/**
 * Extrait des paires (contexte → réponse agent) depuis une liste de messages.
 * Contexte = 3 messages précédant chaque réponse agent substantielle (> 30 chars).
 */
function extractExamples(messages: ParsedMessage[], clientName: string, sourceFile: string) {
  const examples: {
    client_name: string;
    context: string;
    agent_response: string;
    topic: string | null;
    source_file: string;
  }[] = [];

  for (let i = 1; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.sender !== 'agent') continue;
    if (msg.content.length < 40) continue; // réponses trop courtes = peu utiles

    // Fenêtre de contexte : jusqu'à 5 messages précédents
    const windowStart = Math.max(0, i - 5);
    const context = messages
      .slice(windowStart, i)
      .map(m => `${m.sender === 'agent' ? 'Turquoise' : clientName}: ${m.content}`)
      .join('\n');

    // Détecter le sujet
    const combined = (context + msg.content).toLowerCase();
    let topic: string | null = null;
    if (combined.includes('devis') || combined.includes('tarif') || combined.includes('prix')) topic = 'devis';
    else if (combined.includes('nounous') || combined.includes('baby') || combined.includes('enfant')) topic = 'nounous';
    else if (combined.includes('chambre') || combined.includes('suite') || combined.includes('room')) topic = 'chambre';
    else if (combined.includes('vol') || combined.includes('billet') || combined.includes('transfert')) topic = 'vols';
    else if (combined.includes('merci') || combined.includes('parfait') || combined.includes('ok')) topic = 'confirmation';

    examples.push({
      client_name: clientName,
      context,
      agent_response: msg.content,
      topic,
      source_file: sourceFile,
    });
  }

  return examples;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });

    const fileName = file.name;
    // Extraire le nom du client depuis le nom de fichier
    // Ex: "WhatsApp Chat - M26 Chekroun Carla.zip" → "Chekroun Carla"
    const clientName = fileName
      .replace(/^WhatsApp Chat - /i, '')
      .replace(/\.zip$/i, '')
      .replace(/^M\d+ /i, '')
      .trim() || 'Client';

    const buffer = await file.arrayBuffer();
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(buffer);

    // Trouver _chat.txt dans le ZIP
    const chatFile = zip.file('_chat.txt');
    if (!chatFile) {
      return NextResponse.json({ error: 'Fichier _chat.txt introuvable dans le ZIP' }, { status: 400 });
    }

    const text = await chatFile.async('string');
    const messages = parseWhatsAppTxt(text, fileName);
    const examples = extractExamples(messages, clientName, fileName);

    if (examples.length === 0) {
      return NextResponse.json({ ok: true, imported: 0, message: 'Aucun exemple extrait' });
    }

    // Supprimer les anciens exemples de ce fichier pour éviter les doublons
    await supabase.from('whatsapp_training_examples').delete().eq('source_file', fileName);

    const { error } = await supabase.from('whatsapp_training_examples').insert(examples);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Aussi injecter dans whatsapp_ai_examples (déjà utilisé par l'IA)
    const aiExamples = examples.slice(0, 20).map(e => ({
      conversation_context: e.context,
      good_response: e.agent_response,
      contact_name: e.client_name,
    }));
    await supabase.from('whatsapp_ai_examples').delete().eq('contact_name', clientName);
    await supabase.from('whatsapp_ai_examples').insert(aiExamples);

    return NextResponse.json({
      ok: true,
      imported: examples.length,
      clientName,
      messages: messages.length,
    });
  } catch (err) {
    console.error('[import-training]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
