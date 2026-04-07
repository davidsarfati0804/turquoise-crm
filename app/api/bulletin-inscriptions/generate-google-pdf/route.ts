import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prepareBalisesForGoogleDoc, generateBIFromGoogleDoc } from '@/lib/services/google-docs.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bi_id } = body

    if (!bi_id) {
      return NextResponse.json({ error: 'bi_id requis' }, { status: 400 })
    }

    const supabase = await createClient()

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Récupérer le BI
    const { data: bi, error } = await supabase
      .from('bulletin_inscriptions')
      .select('*')
      .eq('id', bi_id)
      .maybeSingle()

    if (error || !bi) {
      return NextResponse.json({ error: 'BI non trouvé' }, { status: 404 })
    }

    const biData = bi.data
    const balises = prepareBalisesForGoogleDoc(biData)
    const fileName = `BI_${biData.file_reference || 'SANS_REF'}_${new Date().toISOString().slice(0, 10)}`

    const { pdfBuffer, docUrl, docId } = await generateBIFromGoogleDoc(balises, fileName)

    // Mettre à jour le BI avec le lien du document Google
    await supabase
      .from('bulletin_inscriptions')
      .update({
        google_doc_id: docId,
        google_doc_url: docUrl,
      })
      .eq('id', bi_id)

    // Retourner le PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}.pdf"`,
      },
    })
  } catch (err) {
    console.error('Error generating Google Docs PDF:', err)
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json(
      { error: `Erreur génération PDF: ${message}` },
      { status: 500 }
    )
  }
}
