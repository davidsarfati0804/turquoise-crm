import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
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

    // Get the client file
    const { data: clientFile, error: fetchError } = await supabase
      .from('client_files')
      .select('id, file_reference')
      .eq('id', id)
      .single()

    if (fetchError || !clientFile) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    // Delete the client file (cascades to participants, activity_logs, etc.)
    const { error: deleteError } = await supabase
      .from('client_files')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[DELETE Client File] Error:', deleteError)
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du dossier' },
        { status: 500 }
      )
    }

    // Log the action
    await supabase
      .from('activity_logs')
      .insert({
        client_file_id: null,
        action_type: 'file_deleted',
        description: `Dossier ${clientFile.file_reference} supprimé`,
        user_id: user.id,
        user_email: user.email,
      })

    return NextResponse.json({
      success: true,
      message: `Dossier ${clientFile.file_reference} supprimé`,
    })
  } catch (error) {
    console.error('[DELETE Client File] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
