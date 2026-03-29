import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  try {
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const eventId = searchParams.get('event_id')
    const exclude = searchParams.get('exclude')

    let query = supabase
      .from('client_files')
      .select('id, file_reference, primary_contact_first_name, primary_contact_last_name')

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    const { data, error } = await query

    if (error) {
      console.error('[GET Client Files] Error:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des dossiers' },
        { status: 500 }
      )
    }

    // Filter out the excluded file
    const filteredData = exclude
      ? data.filter((file: any) => file.id !== exclude)
      : data

    return NextResponse.json({ data: filteredData })
  } catch (error) {
    console.error('[GET Client Files] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
