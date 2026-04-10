'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'

type Status = 'checking' | 'online' | 'offline' | 'idle'

export function NanoclawStatus() {
  const [status, setStatus] = useState<Status>('checking')
  const [lastActivity, setLastActivity] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from('whatsapp_messages')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!data) {
        setStatus('offline')
        return
      }

      const last = new Date(data.created_at)
      const diffMin = (Date.now() - last.getTime()) / 60000
      setLastActivity(data.created_at)

      if (diffMin < 10) setStatus('online')
      else if (diffMin < 60) setStatus('idle')
      else setStatus('offline')
    }

    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [supabase])

  const diffLabel = () => {
    if (!lastActivity) return null
    const diff = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 60000)
    if (diff < 1) return 'à l\'instant'
    if (diff < 60) return `il y a ${diff} min`
    const h = Math.floor(diff / 60)
    return `il y a ${h}h`
  }

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-xs">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Vérification...</span>
      </div>
    )
  }

  if (status === 'online') {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <Wifi className="w-3.5 h-3.5 text-green-600" />
        <span className="text-xs font-medium text-green-700">Nanoclaw actif</span>
        <span className="text-xs text-green-500">{diffLabel()}</span>
      </div>
    )
  }

  if (status === 'idle') {
    return (
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        <Wifi className="w-3.5 h-3.5 text-amber-600" />
        <span className="text-xs font-medium text-amber-700">Nanoclaw inactif</span>
        <span className="text-xs text-amber-500">{diffLabel()}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-full px-3 py-1.5">
      <span className="w-2 h-2 rounded-full bg-red-400" />
      <WifiOff className="w-3.5 h-3.5 text-red-500" />
      <span className="text-xs font-medium text-red-600">Nanoclaw hors ligne</span>
    </div>
  )
}
