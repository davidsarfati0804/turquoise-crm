'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Loader2, MessageSquare, CheckCheck, Check } from 'lucide-react'

interface Message {
  id: string
  wa_phone_number: string
  message_content: string
  direction: 'inbound' | 'outbound'
  created_at: string
  delivery_status: string
  wa_display_name?: string | null
}

/** Normalise un numéro pour la recherche (même logique que le webhook inbound) */
function normalizePhone(raw: string): string {
  if (!raw || raw.startsWith('lid:')) return raw
  const digits = raw.replace(/[\s.\-()]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('0') && digits.length === 10) return '+33' + digits.slice(1)
  if (digits.startsWith('33') && digits.length === 11) return '+' + digits
  return '+' + digits
}

function phoneVariants(phone: string): string[] {
  const norm = normalizePhone(phone)
  const variants = new Set<string>([phone, norm])
  if (norm.startsWith('+')) variants.add(norm.slice(1))
  if (norm.startsWith('+33') && norm.length === 12) variants.add('0' + norm.slice(3))
  return Array.from(variants)
}

export function WhatsAppConversation({ clientFile }: { clientFile: any }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = useRef(createClient()).current

  const phoneNumber = clientFile?.primary_contact_phone
  const normalizedPhone = phoneNumber ? normalizePhone(phoneNumber) : null

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = useCallback(async () => {
    if (!clientFile?.id && !phoneNumber) { setLoading(false); return }

    const variants = phoneNumber ? phoneVariants(phoneNumber) : []

    // Requête par client_file_id OU par toutes les variantes de téléphone
    let query = supabase
      .from('whatsapp_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(200)

    // Construire le filtre OR
    const conditions: string[] = []
    if (clientFile?.id) conditions.push(`client_file_id.eq.${clientFile.id}`)
    variants.forEach(v => conditions.push(`wa_phone_number.eq.${v}`))

    if (conditions.length > 0) {
      query = query.or(conditions.join(','))
    }

    const { data, error } = await query

    if (!error && data) {
      // Dédupliquer par id
      const seen = new Set<string>()
      const unique = data.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true })
      setMessages(unique)
    }
    setLoading(false)
  }, [clientFile?.id, phoneNumber, supabase])

  useEffect(() => {
    loadMessages()

    // Realtime — écouter sur client_file_id ET wa_phone_number
    const channels: ReturnType<typeof supabase.channel>[] = []

    if (clientFile?.id) {
      channels.push(
        supabase.channel(`wa_dossier_${clientFile.id}`)
          .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'whatsapp_messages',
            filter: `client_file_id=eq.${clientFile.id}`,
          }, (payload) => {
            setMessages(prev => {
              if (prev.some(m => m.id === payload.new.id)) return prev
              return [...prev, payload.new as Message]
            })
          })
          .subscribe()
      )
    }

    if (normalizedPhone) {
      channels.push(
        supabase.channel(`wa_phone_${normalizedPhone.replace(/\+/g, '')}`)
          .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'whatsapp_messages',
            filter: `wa_phone_number=eq.${normalizedPhone}`,
          }, (payload) => {
            setMessages(prev => {
              if (prev.some(m => m.id === payload.new.id)) return prev
              return [...prev, payload.new as Message]
            })
          })
          .subscribe()
      )
    }

    return () => { channels.forEach(c => c.unsubscribe()) }
  }, [clientFile?.id, normalizedPhone, loadMessages, supabase])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !normalizedPhone || sending) return
    const text = replyText.trim()
    setSending(true)
    setSendError(null)
    setReplyText('')

    // Message optimiste
    const optId = 'opt_' + Date.now()
    setMessages(prev => [...prev, {
      id: optId, wa_phone_number: normalizedPhone,
      message_content: text, direction: 'outbound',
      delivery_status: 'queued', created_at: new Date().toISOString(),
    }])

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: normalizedPhone, message: text, clientFileId: clientFile.id }),
      })
      const result = await res.json()
      if (!result.success) {
        setMessages(prev => prev.filter(m => m.id !== optId))
        setReplyText(text)
        setSendError(result.error || 'Erreur envoi')
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optId))
      setReplyText(text)
      setSendError('Erreur de connexion')
    } finally {
      setSending(false)
    }
  }

  if (!phoneNumber) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center gap-2 text-gray-400">
        <MessageSquare className="w-8 h-8 opacity-30" />
        <p className="text-sm">Aucun numéro de téléphone dans ce dossier</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow flex flex-col" style={{ height: '480px' }}>
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 bg-gray-50 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-teal-600" />
          <span className="font-semibold text-gray-900 text-sm">WhatsApp</span>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">{normalizedPhone}</p>
          {messages.length > 0 && (
            <p className="text-xs text-gray-400">{messages.length} message{messages.length > 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ backgroundColor: '#f0f2f5' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Chargement...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
            <MessageSquare className="w-8 h-8 opacity-30" />
            <p className="text-sm">Aucun message pour ce client</p>
            <p className="text-xs text-gray-300">{normalizedPhone}</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-xl shadow-sm text-sm ${
                msg.direction === 'outbound'
                  ? 'bg-[#dcf8c6] text-gray-900 rounded-br-sm'
                  : 'bg-white text-gray-900 rounded-bl-sm'
              }`}>
                {msg.wa_display_name && msg.direction === 'inbound' && (
                  <p className="text-xs font-semibold text-teal-600 mb-0.5">{msg.wa_display_name}</p>
                )}
                <p className="leading-snug whitespace-pre-wrap break-words">{msg.message_content}</p>
                <div className={`flex items-center gap-1 mt-1 ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[10px] text-gray-400">
                    {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.direction === 'outbound' && (
                    msg.delivery_status === 'read'
                      ? <CheckCheck className="w-3 h-3 text-blue-400" />
                      : msg.delivery_status === 'queued'
                      ? <Check className="w-3 h-3 text-gray-300" />
                      : <CheckCheck className="w-3 h-3 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Send */}
      <div className="border-t border-gray-200 p-3 bg-white rounded-b-lg">
        {sendError && (
          <p className="text-xs text-red-500 mb-2">{sendError}</p>
        )}
        <form onSubmit={handleSend} className="flex gap-2">
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
            placeholder="Message..."
            rows={2}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none text-sm"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !replyText.trim()}
            className="self-end px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors disabled:opacity-40"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  )
}
