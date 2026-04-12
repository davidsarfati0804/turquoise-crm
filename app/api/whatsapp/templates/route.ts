import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function formatDate(d: string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function phoneVariants(phone: string): string[] {
  const variants = new Set<string>();
  variants.add(phone);
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('33') && digits.length === 11) {
    variants.add('+33' + digits.slice(2));
    variants.add('0' + digits.slice(2));
    variants.add('33' + digits.slice(2));
  } else if (digits.startsWith('0') && digits.length === 10) {
    variants.add('0' + digits.slice(1));
    variants.add('+33' + digits.slice(1));
    variants.add('33' + digits.slice(1));
  } else if (!digits.startsWith('0') && !digits.startsWith('33') && digits.length >= 8) {
    variants.add('+' + digits);
    variants.add(digits);
  }
  if (phone.startsWith('+')) {
    variants.add(phone.slice(1));
    variants.add(phone);
  } else if (!phone.startsWith('+') && !phone.startsWith('00')) {
    variants.add('+' + phone);
  }
  return Array.from(variants);
}

/** GET /api/whatsapp/templates — liste tous les templates */
export async function GET() {
  const { data, error } = await supabase
    .from('whatsapp_templates')
    .select('*')
    .order('category')
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

/** POST /api/whatsapp/templates/resolve — résout les variables d'un template */
export async function POST(req: NextRequest) {
  const body = await req.json() as { templateId: string; phone: string };
  const { templateId, phone } = body;

  const { data: template } = await supabase
    .from('whatsapp_templates')
    .select('content')
    .eq('id', templateId)
    .maybeSingle();

  if (!template) return NextResponse.json({ error: 'Template introuvable' }, { status: 404 });

  let content = template.content;

  // Chercher un dossier lié au numéro pour remplir les variables (tous formats de téléphone)
  const variants = phoneVariants(phone);
  const orFilter = variants.map(v => `primary_contact_phone.eq.${v}`).join(',');

  const { data: cf } = await supabase
    .from('client_files')
    .select(`
      *,
      events (
        id, name, arrival_date, departure_date, ceremony_date,
        event_room_pricing (
          price_per_night,
          room_types ( code, name )
        )
      )
    `)
    .or(orFilter)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const event = (cf as any)?.events;

  // Résoudre {{nom_maries}}
  if (event?.name) {
    content = content.replace(/{{nom_maries}}/g, event.name);
  }

  // Résoudre {{date_debut}}
  content = content.replace(/{{date_debut}}/g, formatDate(event?.arrival_date ?? cf?.sejour_start_date ?? null));

  // Résoudre {{date_fin}}
  content = content.replace(/{{date_fin}}/g, formatDate(event?.departure_date ?? cf?.sejour_end_date ?? null));

  // Résoudre {{date_ceremonie}}
  content = content.replace(/{{date_ceremonie}}/g, formatDate(event?.ceremony_date ?? null));

  // Résoudre {{liste_chambres}} depuis event_room_pricing
  const pricing = event?.event_room_pricing ?? [];
  if (pricing.length > 0) {
    const lines = pricing.map((p: any) => {
      const room = p.room_types;
      const name = room?.name || room?.code || 'Chambre';
      const price = p.price_per_night ? `${p.price_per_night}€/nuit` : '';
      return `• ${name}${price ? ` - ${price}` : ''}`;
    });
    content = content.replace(/{{liste_chambres}}/g, lines.join('\n'));
  } else {
    content = content.replace(/{{liste_chambres}}/g, '• [Ajoute les chambres dans l\'événement]');
  }

  // Résoudre {{composition}} — ex: "2 adultes" ou "2 adultes et 1 enfant"
  const adults = (cf as any)?.adults_count ?? 2;
  const children = (cf as any)?.children_count ?? 0;
  const babies = (cf as any)?.babies_count ?? 0;
  const compParts = [`${adults} adulte${adults > 1 ? 's' : ''}`];
  if (children > 0) compParts.push(`${children} enfant${children > 1 ? 's' : ''}`);
  if (babies > 0) compParts.push(`${babies} bébé${babies > 1 ? 's' : ''}`);
  content = content.replace(/{{composition}}/g, compParts.join(' et '));

  // Résoudre {{mois_sejour}} — ex: "Février 2026"
  const sejourDate = event?.arrival_date ?? (cf as any)?.sejour_start_date ?? null;
  if (sejourDate) {
    const mois = new Date(sejourDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    content = content.replace(/{{mois_sejour}}/g, mois.charAt(0).toUpperCase() + mois.slice(1));
  } else {
    content = content.replace(/{{mois_sejour}}/g, '[mois à préciser]');
  }

  // Résoudre {{prix_nuit}} — prix de la chambre sélectionnée du dossier
  const selectedPricing = pricing.find((p: any) => p.room_types?.code === (cf as any)?.selected_room_type?.code) ?? pricing[0];
  content = content.replace(/{{prix_nuit}}/g, selectedPricing?.price_per_night ? `${selectedPricing.price_per_night}€` : '[prix à définir]');

  // Résoudre {{type_chambre}} — nom de la chambre sélectionnée
  const selectedRoom = selectedPricing?.room_types;
  content = content.replace(/{{type_chambre}}/g, selectedRoom?.name || '[chambre à définir]');

  // Résoudre {{options_chambres}} — les autres chambres comme options
  if (pricing.length > 1) {
    const options = pricing.slice(1).map((p: any) => {
      const room = p.room_types;
      const name = room?.name || room?.code || 'Option';
      const diff = selectedPricing?.price_per_night && p.price_per_night
        ? `+${p.price_per_night - selectedPricing.price_per_night}€/nuit`
        : p.price_per_night ? `${p.price_per_night}€/nuit` : '';
      return `Option ${name} : ${diff}`;
    });
    content = content.replace(/{{options_chambres}}/g, options.join('\n'));
  } else {
    content = content.replace(/{{options_chambres}}/g, '');
  }

  // Résoudre {{nom_agent}} — depuis le profil utilisateur
  content = content.replace(/{{nom_agent}}/g, 'Aurélia');

  // Détecter les variables encore non résolues
  const unresolved = Array.from(new Set(
    [...content.matchAll(/{{(\w+)}}/g)].map(m => `{{${m[1]}}}`)
  ));

  return NextResponse.json({ content, unresolved });
}

/** PUT /api/whatsapp/templates — créer ou modifier un template */
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, name, category, content } = body;

  if (id) {
    const { error } = await supabase.from('whatsapp_templates')
      .update({ name, category, content, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase.from('whatsapp_templates').insert({ name, category, content });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE /api/whatsapp/templates?id=xxx */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });
  const { error } = await supabase.from('whatsapp_templates').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
