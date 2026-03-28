import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateBIHTML, prepareBIData } from '@/lib/templates/bi-template'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bi_id } = body

    if (!bi_id) {
      return NextResponse.json({ error: 'bi_id requis' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: bi, error } = await supabase
      .from('bulletin_inscriptions')
      .select('*')
      .eq('id', bi_id)
      .single()

    if (error || !bi) {
      return NextResponse.json({ error: 'BI non trouvé' }, { status: 404 })
    }

    const templateData = prepareBIData(bi.data)
    const html = generateBIHTML(templateData)

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Error generating BI HTML:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du BI' },
      { status: 500 }
    )
  }
}
