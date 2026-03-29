import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  try {
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { mergeWithId } = await req.json()

    if (!mergeWithId) {
      return NextResponse.json(
        { error: 'ID du dossier cible requis' },
        { status: 400 }
      )
    }

    // Get both client files
    const { data: sourceFile, error: sourceFetchError } = await supabase
      .from('client_files')
      .select('*')
      .eq('id', id)
      .single()

    const { data: targetFile, error: targetFetchError } = await supabase
      .from('client_files')
      .select('*')
      .eq('id', mergeWithId)
      .single()

    if (sourceFetchError || !sourceFile || targetFetchError || !targetFile) {
      return NextResponse.json(
        { error: 'Un ou plusieurs dossiers non trouvés' },
        { status: 404 }
      )
    }

    // Move all participants from source to target
    const { data: participants, error: participantsFetchError } = await supabase
      .from('participants')
      .select('id')
      .eq('client_file_id', id)

    if (!participantsFetchError && participants && participants.length > 0) {
      const { error: updateError } = await supabase
        .from('participants')
        .update({ client_file_id: mergeWithId })
        .eq('client_file_id', id)

      if (updateError) {
        return NextResponse.json(
          { error: 'Erreur lors du transfert des participants' },
          { status: 500 }
        )
      }
    }

    // Move all internal notes from source to target
    const { error: notesUpdateError } = await supabase
      .from('internal_notes')
      .update({ client_file_id: mergeWithId })
      .eq('client_file_id', id)

    if (notesUpdateError) {
      return NextResponse.json(
        { error: 'Erreur lors du transfert des notes' },
        { status: 500 }
      )
    }

    // Add merge note to target file
    await supabase
      .from('internal_notes')
      .insert({
        client_file_id: mergeWithId,
        content: `Fusion du dossier ${sourceFile.file_reference} (supprimé). Participants et notes transférés.`,
        author_id: user.id,
        author_name: user.email,
      })

    // Delete the source file
    const { error: deleteError } = await supabase
      .from('client_files')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du dossier source' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Dossier ${sourceFile.file_reference} fusionné avec ${targetFile.file_reference}`,
      targetFileId: mergeWithId,
    })
  } catch (error) {
    console.error('[MERGE Client Files] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
