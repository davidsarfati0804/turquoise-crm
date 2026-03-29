'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Loader } from 'lucide-react'

interface Message {
  id: string
  wa_phone_number: string
  message_content: string
  direction: 'inbound' | 'outbound'
  created_at: string
  delivery_status: string
  wa_display_name?: string
}

export function WhatsAppConversation({ clientFile }: { clientFile: any }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [replyText, setReplyText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Get the phone number from client file
  const phoneNumber = clientFile?.primary_contact_phone

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load conversation messages
  useEffect(() => {
    if (!clientFile?.id) {
      setLoading(false)
      return
    }

    const loadMessages = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('client_file_id', clientFile.id)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setMessages(data)
      }
      setLoading(false)
    }

    loadMessages()

    // Subscribe to new messages
    const supabase = createClient()
    const channel = supabase
      .channel(`whatsapp_${clientFile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `client_file_id=eq.${clientFile.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [clientFile?.id])

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !phoneNumber) return

    setSending(true)

    try {
      // Send via WhatsApp API (this also stores the message in DB)
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          message: replyText,
          clientFileId: clientFile.id,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setReplyText('')
        // Message will appear via real-time subscription
      } else {
        console.error('Erreur envoi WhatsApp:', result.error)
        alert('Erreur lors de l\'envoi: ' + (result.error || 'Erreur inconnue'))
      }
    } catch (err) {
      console.error('Error sending message:', err)
      alert('Erreur de connexion lors de l\'envoi')
    }

    setSending(false)
  }

  if (!phoneNumber) {
    return (
      <div className="bg-white rounded-lg shadow p-6 h-full flex flex-col items-center justify-center">
        <p className="text-gray-500">Aucun numéro de téléphone pour ce dossier</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 bg-gray-50">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <span className="text-lg mr-2">💬</span>
          Conversation WhatsApp
        </h3>
        <p className="text-sm text-gray-600 mt-1">{phoneNumber}</p>
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Aucun message pour le moment</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.direction === 'outbound'
                    ? 'bg-turquoise-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{msg.message_content}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.direction === 'outbound'
                      ? 'text-turquoise-100'
                      : 'text-gray-500'
                  }`}
                >
                  {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <form onSubmit={handleSendReply} className="flex gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Tapez votre réponse..."
            rows={2}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent resize-none"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !replyText.trim()}
            className="px-4 py-2 bg-turquoise-600 hover:bg-turquoise-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {sending ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          💡 Note: Les messages seront stockés dans le CRM. L'envoi via WhatsApp API sera activé prochainement.
        </p>
      </div>
    </div>
  )
}
