'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Loader2 } from 'lucide-react'

export function DeleteLeadButton({ leadId }: { leadId: string }) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('Supprimer définitivement ce lead ?')) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('leads').delete().eq('id', leadId)
    if (error) {
      alert('Erreur lors de la suppression')
      setDeleting(false)
      return
    }
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-gray-400 hover:text-red-500 transition-colors p-1 disabled:opacity-50"
      title="Supprimer le lead"
    >
      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </button>
  )
}
