'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Send, Loader2, MessageSquare, Check, CheckCheck,
  Paperclip, X, Image as ImageIcon, FileText, Video,
  Sparkles, RefreshCw, Zap,
} from 'lucide-react'

// ── Constantes visuelles WhatsApp (identiques à l'inbox) ──────────────────────
const WA_BG     = '#efeae2'
const WA_BUBBLE = '#d9fdd3'
const WA_DARK   = '#075e54'

interface Message {
  id: string
  wa_message_id?: string | null
  wa_phone_number: string
  message_content: string
  message_type: string
  direction: 'inbound' | 'outbound'
  created_at: string
  delivery_status: string
  wa_display_name?: string | null
  metadata?: { media_url?: string; [key: string]: unknown }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function formatMsgTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function DeliveryIcon({ status }: { status: string }) {
  if (status === 'queued') return <Check className="w-3.5 h-3.5 opacity-60" />
  if (status === 'failed') return <X className="w-3.5 h-3.5 text-red-400" />
  return <CheckCheck className={'w-3.5 h-3.5 ' + (status === 'read' ? 'text-sky-400' : 'opacity-60')} />
}

// ── Composant ─────────────────────────────────────────────────────────────────
export function WhatsAppConversation({ clientFile }: { clientFile: any }) {
  const supabase       = useRef(createClient()).current
  const router         = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef   = useRef<HTMLInputElement>(null)

  const phoneNumber     = clientFile?.primary_contact_phone
  const normalizedPhone = phoneNumber ? normalizePhone(phoneNumber) : null

  // ── State messages ──────────────────────────────────────────────────────────
  const [messages,  setMessages]  = useState<Message[]>([])
  const [loading,   setLoading]   = useState(true)
  const [sending,   setSending]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)

  // ── State templates ─────────────────────────────────────────────────────────
  const [showTemplates,    setShowTemplates]    = useState(false)
  const [templates,        setTemplates]        = useState<{ id: string; name: string; category: string; content: string }[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [resolvingTemplate, setResolvingTemplate] = useState(false)
  const [templateError,    setTemplateError]    = useState<string | null>(null)

  // ── State médiathèque ───────────────────────────────────────────────────────
  const [showMediaLib,  setShowMediaLib]  = useState(false)
  const [mediaFiles,    setMediaFiles]    = useState<{ name: string; path: string; url: string; type: string }[]>([])
  const [mediaFolder,   setMediaFolder]   = useState('')
  const [mediaFolders,  setMediaFolders]  = useState<string[]>([])
  const [mediaLoading,  setMediaLoading]  = useState(false)
  const [sendingMedia,  setSendingMedia]  = useState<string | null>(null)

  // ── State IA suggestion ──────────────────────────────────────────────────────
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)
  const [aiLoading,    setAiLoading]    = useState(false)
  const [aiError,      setAiError]      = useState<string | null>(null)

  // ── State auto-détection dossier ─────────────────────────────────────────────
  const [detection,          setDetection]          = useState<Record<string, unknown> | null>(null)
  const [detecting,          setDetecting]          = useState(false)
  const [detectionError,     setDetectionError]     = useState<string | null>(null)
  const [detectionSelection, setDetectionSelection] = useState<Set<string>>(new Set())
  const [applying,           setApplying]           = useState(false)
  const [applySuccess,       setApplySuccess]       = useState(false)

  // ── Scroll to bottom ────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Load messages ───────────────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!clientFile?.id && !phoneNumber) { setLoading(false); return }
    const variants = phoneNumber ? phoneVariants(phoneNumber) : []
    const conditions: string[] = []
    if (clientFile?.id) conditions.push(`client_file_id.eq.${clientFile.id}`)
    variants.forEach(v => conditions.push(`wa_phone_number.eq.${v}`))

    let query = supabase.from('whatsapp_messages').select('*').order('created_at', { ascending: true }).limit(200)
    if (conditions.length > 0) query = query.or(conditions.join(','))

    const { data, error } = await query
    if (!error && data) {
      const seen = new Set<string>()
      setMessages(data.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true }))
    }
    setLoading(false)
  }, [clientFile?.id, phoneNumber, supabase])

  // ── Realtime ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadMessages()
    const channels: ReturnType<typeof supabase.channel>[] = []

    const addMessage = (payload: { new: Record<string, unknown> }) => {
      const msg = payload.new as unknown as Message
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        if (msg.wa_message_id && prev.some(m => m.wa_message_id === msg.wa_message_id)) return prev
        if (msg.direction === 'outbound') {
          return [...prev.filter(m => !(m.id.startsWith('opt_') && m.message_content === msg.message_content)), msg]
        }
        return [...prev, msg]
      })
    }

    if (clientFile?.id) {
      channels.push(
        supabase.channel(`wa_dossier_${clientFile.id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages', filter: `client_file_id=eq.${clientFile.id}` }, addMessage)
          .subscribe()
      )
    }
    if (normalizedPhone) {
      channels.push(
        supabase.channel(`wa_phone_dossier_${normalizedPhone.replace(/\+/g, '')}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages', filter: `wa_phone_number=eq.${normalizedPhone}` }, addMessage)
          .subscribe()
      )
    }
    return () => { channels.forEach(c => c.unsubscribe()) }
  }, [clientFile?.id, normalizedPhone, loadMessages, supabase])

  // ── Envoyer un message texte ────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!replyText.trim() || !normalizedPhone || sending) return
    const text = replyText.trim()
    const optId = 'opt_' + Date.now()
    setMessages(prev => [...prev, {
      id: optId, wa_phone_number: normalizedPhone, wa_display_name: null,
      message_content: text, message_type: 'text', direction: 'outbound',
      delivery_status: 'queued', created_at: new Date().toISOString(),
    }])
    setReplyText('')
    setSendError(null)
    setSending(true)
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: normalizedPhone, message: text, clientFileId: clientFile?.id }),
      })
      const result = await res.json()
      if (!result.success) {
        setMessages(prev => prev.filter(m => m.id !== optId))
        setReplyText(text)
        setSendError(result.error || "Erreur d'envoi")
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optId))
      setReplyText(text)
      setSendError('Erreur de connexion')
    } finally {
      setSending(false)
    }
  }, [replyText, normalizedPhone, sending, clientFile?.id])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!templateError) handleSend() }
  }, [handleSend, templateError])

  // ── Upload fichier direct ───────────────────────────────────────────────────
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !normalizedPhone) return
    if (fileInputRef.current) fileInputRef.current.value = ''
    setUploading(true)
    setSendError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('phoneNumber', normalizedPhone)
      if (clientFile?.id) form.append('clientFileId', clientFile.id)
      const res = await fetch('/api/whatsapp/send-media', { method: 'POST', body: form })
      const result = await res.json()
      if (!result.success) setSendError(result.error || 'Erreur upload')
      else {
        const mediaType = file.type.startsWith('video') ? 'video' : file.type === 'application/pdf' ? 'document' : 'image'
        setMessages(prev => [...prev, {
          id: 'opt_' + Date.now(), wa_phone_number: normalizedPhone, wa_display_name: null,
          message_content: file.name, message_type: mediaType, direction: 'outbound',
          delivery_status: 'queued', created_at: new Date().toISOString(),
        }])
      }
    } catch {
      setSendError('Erreur de connexion')
    } finally {
      setUploading(false)
    }
  }, [normalizedPhone, clientFile?.id])

  // ── Templates ───────────────────────────────────────────────────────────────
  const loadTemplates = useCallback(async () => {
    if (templates.length > 0) { setShowTemplates(true); return }
    setTemplatesLoading(true)
    const res = await fetch('/api/whatsapp/templates')
    const data = await res.json()
    setTemplates(data.templates ?? [])
    setTemplatesLoading(false)
    setShowTemplates(true)
  }, [templates.length])

  const handleInsertTemplate = useCallback(async (templateId: string) => {
    if (!normalizedPhone) return
    setResolvingTemplate(true)
    setTemplateError(null)
    const res = await fetch('/api/whatsapp/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId, phone: normalizedPhone }),
    })
    const data = await res.json()
    if (data.content) {
      setReplyText(data.content)
      setShowTemplates(false)
      if (data.unresolved?.length > 0) {
        setTemplateError(`Variables non remplies : ${data.unresolved.join(', ')} — complète-les manuellement.`)
      }
    }
    setResolvingTemplate(false)
  }, [normalizedPhone])

  // ── Médiathèque ─────────────────────────────────────────────────────────────
  const loadMediaLibrary = useCallback(async (folder = '') => {
    setMediaLoading(true)
    setMediaFolder(folder)
    try {
      const res = await fetch(`/api/whatsapp/media-library?folder=${encodeURIComponent(folder)}`)
      const data = await res.json()
      setMediaFiles(data.files ?? [])
      if (!folder) setMediaFolders(data.folders ?? [])
    } finally {
      setMediaLoading(false)
    }
  }, [])

  const handleSendFromLibrary = useCallback(async (file: { url: string; type: string; name: string }) => {
    if (!normalizedPhone || sendingMedia) return
    setSendingMedia(file.url)
    setSendError(null)
    try {
      const res = await fetch('/api/whatsapp/send-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: normalizedPhone,
          mediaUrl: file.url,
          mediaType: file.type,
          caption: file.name,
          clientFileId: clientFile?.id,
        }),
      })
      const result = await res.json()
      if (!result.success) setSendError(result.error || 'Erreur envoi média')
      else {
        setMessages(prev => [...prev, {
          id: 'opt_' + Date.now(), wa_phone_number: normalizedPhone, wa_display_name: null,
          message_content: file.name, message_type: file.type, direction: 'outbound',
          delivery_status: 'queued', created_at: new Date().toISOString(),
          metadata: { media_url: file.url },
        }])
        setShowMediaLib(false)
      }
    } catch {
      setSendError('Erreur de connexion')
    } finally {
      setSendingMedia(null)
    }
  }, [normalizedPhone, sendingMedia, clientFile?.id])

  // ── IA ───────────────────────────────────────────────────────────────────────
  const handleAiSuggest = useCallback(async () => {
    if (!normalizedPhone) return
    setAiLoading(true)
    setAiError(null)
    setAiSuggestion(null)
    try {
      const lastMsgs = messages.slice(-6).map(m => `${m.direction === 'inbound' ? 'Client' : 'Agent'}: ${m.message_content}`).join('\n')
      const res = await fetch('/api/whatsapp/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: normalizedPhone, recentMessages: lastMsgs }),
      })
      const data = await res.json()
      if (data.suggestion) setAiSuggestion(data.suggestion)
      else setAiError(data.error || 'Aucune suggestion générée')
    } catch {
      setAiError('Erreur de connexion')
    } finally {
      setAiLoading(false)
    }
  }, [normalizedPhone, messages])

  // ── Auto-détection dossier ───────────────────────────────────────────────────
  const handleDetect = useCallback(async () => {
    if (!normalizedPhone || detecting) return
    setDetecting(true)
    setDetection(null)
    setDetectionError(null)
    setDetectionSelection(new Set())
    setApplySuccess(false)
    try {
      const res = await fetch('/api/whatsapp/extract-dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone, dossierId: clientFile?.id }),
      })
      const data = await res.json()
      if (data.error) { setDetectionError(data.error); return }
      if (Object.keys(data.extracted ?? {}).length === 0) {
        setDetectionError('Aucune information détectée dans la conversation')
        return
      }
      setDetection(data.extracted)
      // Pre-select all fields
      const allKeys = new Set<string>()
      Object.entries(data.extracted).forEach(([k, v]) => {
        if (k === 'participants' && Array.isArray(v)) {
          (v as unknown[]).forEach((_, i) => allKeys.add(`participant_${i}`))
        } else if (k !== 'room_type_id' && k !== 'event_id') {
          allKeys.add(k)
        }
      })
      setDetectionSelection(allKeys)
    } catch {
      setDetectionError('Erreur de connexion')
    } finally {
      setDetecting(false)
    }
  }, [normalizedPhone, detecting, clientFile?.id])

  const handleApply = useCallback(async () => {
    if (!detection || applying || !clientFile?.id) return
    setApplying(true)
    const fields = Object.fromEntries(
      Object.entries(detection).filter(([k]) => detectionSelection.has(k) && k !== 'participants')
    )
    const allParticipants = Array.isArray(detection.participants)
      ? detection.participants as Record<string, unknown>[]
      : []
    const participants = allParticipants.filter((_, i) => detectionSelection.has(`participant_${i}`))
    try {
      const res = await fetch('/api/whatsapp/apply-dossier-extraction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossierId: clientFile.id, fields, participants }),
      })
      const result = await res.json()
      if (!res.ok) {
        setDetectionError(result.error || 'Erreur lors de l\'application')
        return
      }
      if (result.participantErrors?.length) {
        setDetectionError(`Certains participants n'ont pas pu être créés : ${result.participantErrors.join(', ')}`)
      }
      setDetection(null)
      setDetectionSelection(new Set())
      setApplySuccess(true)
      router.refresh()
      setTimeout(() => setApplySuccess(false), 3000)
    } catch {
      setDetectionError('Erreur de connexion')
    } finally {
      setApplying(false)
    }
  }, [detection, applying, clientFile?.id, detectionSelection])

  // ── Pas de téléphone ─────────────────────────────────────────────────────────
  if (!phoneNumber) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center gap-2 text-gray-400" style={{ height: '560px' }}>
        <MessageSquare className="w-8 h-8 opacity-30" />
        <p className="text-sm">Aucun numéro de téléphone dans ce dossier</p>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl shadow-sm flex flex-col overflow-hidden" style={{ height: '600px', border: '1px solid #e5e7eb' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ backgroundColor: WA_DARK }}>
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">
            {clientFile?.primary_contact_first_name
              ? `${clientFile.primary_contact_first_name} ${clientFile.primary_contact_last_name || ''}`
              : normalizedPhone}
          </p>
          <p className="text-xs truncate" style={{ color: '#b2dfdb' }}>
            {!normalizedPhone?.startsWith('lid:') ? normalizedPhone : ''}
          </p>
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/10 text-white/80">
          {messages.length} msg
        </span>
        {/* Bouton auto-détection */}
        <button
          onClick={() => detection ? (setDetection(null), setDetectionSelection(new Set())) : handleDetect()}
          disabled={detecting}
          title={detection ? 'Fermer la détection' : 'Détecter les infos du dossier'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
            detection ? 'bg-amber-400 text-amber-900' : 'bg-white/15 hover:bg-white/25 text-white'
          }`}
        >
          {detecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          {detecting ? 'Détection…' : detection ? 'Fermer' : 'Auto-fill'}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3" style={{ backgroundColor: WA_BG }}>
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Chargement…</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
            <MessageSquare className="w-8 h-8 opacity-30" />
            <p className="text-sm">Aucun message</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={'flex mb-1 ' + (msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
              <div
                className={'max-w-[65%] shadow-sm text-sm ' + (msg.id.startsWith('opt_') ? 'opacity-60' : '')}
                style={{
                  backgroundColor: msg.direction === 'outbound' ? WA_BUBBLE : '#ffffff',
                  borderRadius: msg.direction === 'outbound' ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                }}
              >
                {msg.message_type === 'document' ? (
                  <a href={msg.metadata?.media_url || '#'} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 hover:opacity-80 transition-opacity">
                    <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-900 font-medium text-xs break-all leading-tight">{msg.message_content}</p>
                      <p className="text-gray-400 text-[10px] mt-0.5">PDF · Appuyer pour ouvrir</p>
                    </div>
                  </a>
                ) : msg.message_type === 'image' ? (
                  <a href={msg.metadata?.media_url || '#'} target="_blank" rel="noopener noreferrer">
                    <img src={msg.metadata?.media_url as string || ''} alt="" className="rounded-lg max-w-full" style={{ maxHeight: 200 }} />
                  </a>
                ) : msg.message_type === 'video' ? (
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <Video className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-700 text-xs">{msg.message_content || 'Vidéo'}</span>
                  </div>
                ) : (
                  <p className="px-3 py-2 text-gray-900 break-words whitespace-pre-wrap leading-relaxed">{msg.message_content}</p>
                )}
                <div className={'flex items-center gap-1 px-3 pb-1.5 ' + (msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                  <span className="text-[10px] text-gray-400">{formatMsgTime(msg.created_at)}</span>
                  {msg.direction === 'outbound' && <DeliveryIcon status={msg.delivery_status} />}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Zone de saisie */}
      <div className="flex-shrink-0 px-3 py-2" style={{ backgroundColor: '#F0F2F5' }}>

        {/* Panel auto-détection dossier */}
        {(detection || detectionError || applySuccess) && (
          <div className="mb-2 rounded-xl border border-amber-200 bg-white shadow-sm overflow-hidden" style={{ maxHeight: '260px', display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-100 flex-shrink-0" style={{ backgroundColor: '#fffbeb' }}>
              <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="text-xs font-semibold text-amber-800 flex-1">Auto-remplissage dossier</span>
              <button onClick={() => { setDetection(null); setDetectionError(null); setDetectionSelection(new Set()) }} className="text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {applySuccess && (
              <div className="px-3 py-2 flex items-center gap-2 text-xs text-green-700">
                <Check className="w-3.5 h-3.5 text-green-500" />
                Dossier mis à jour avec succès !
              </div>
            )}
            {detectionError && <div className="px-3 py-2 text-xs text-red-600">{detectionError}</div>}
            {detection && (
              <div className="px-3 py-3 overflow-y-auto flex-1">
                <p className="text-[11px] font-semibold text-amber-800 mb-2">Coche les éléments à appliquer :</p>
                <div className="flex flex-col gap-1.5">
                  {Object.entries(detection).map(([key, val]) => {
                    if (key === 'participants') return null
                    const label: Record<string, string> = {
                      first_name: 'Prénom', last_name: 'Nom',
                      arrival_date: 'Date arrivée', departure_date: 'Date départ',
                      adults_count: 'Adultes', children_count: 'Enfants', babies_count: 'Bébés',
                      flight_inbound: 'Vol arrivée', flight_outbound: 'Vol départ',
                      room_type_name: 'Chambre', room_type_id: null as unknown as string,
                      nb_chambres: 'Nb chambres', budget: 'Budget (€)',
                      event_name: 'Événement', event_id: null as unknown as string,
                    }
                    if (!label[key]) return null
                    const isChecked = detectionSelection.has(key)
                    const displayVal = Array.isArray(val) ? val.join(', ') : String(val)
                    return (
                      <label key={key} className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            setDetectionSelection(prev => {
                              const n = new Set(prev)
                              if (e.target.checked) {
                                n.add(key)
                                if (key === 'room_type_name' && detection.room_type_id) n.add('room_type_id')
                                if (key === 'event_name' && detection.event_id) n.add('event_id')
                              } else {
                                n.delete(key)
                                if (key === 'room_type_name') n.delete('room_type_id')
                                if (key === 'event_name') n.delete('event_id')
                              }
                              return n
                            })
                          }}
                          className="mt-0.5 accent-amber-600 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-[10px] text-amber-700 font-medium">{label[key]}</span>
                          <p className="text-xs text-gray-800 break-words leading-tight">{displayVal}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>

                {/* Participants */}
                {Array.isArray(detection.participants) && detection.participants.length > 0 && (
                  <div className="mt-2.5">
                    <p className="text-[11px] font-semibold text-amber-800 mb-1.5">Participants :</p>
                    <div className="flex flex-col gap-1.5">
                      {(detection.participants as Record<string, unknown>[]).map((p, i) => {
                        const pKey = `participant_${i}`
                        const isChecked = detectionSelection.has(pKey)
                        const typeLabel = p.participant_type === 'adult' ? 'Adulte' : p.participant_type === 'baby' ? 'Bébé' : 'Enfant'
                        const name = [p.first_name, p.last_name].filter(Boolean).join(' ')
                        const dob = p.date_of_birth ? ` · ${p.date_of_birth}` : ''
                        return (
                          <label key={pKey} className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                setDetectionSelection(prev => {
                                  const n = new Set(prev)
                                  if (e.target.checked) n.add(pKey)
                                  else n.delete(pKey)
                                  return n
                                })
                              }}
                              className="mt-0.5 accent-amber-600 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="text-[10px] text-amber-700 font-medium">{typeLabel}</span>
                              <p className="text-xs text-gray-800 break-words leading-tight">{name}{dob}</p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleApply}
                  disabled={applying || detectionSelection.size === 0}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#d97706' }}
                >
                  {applying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Appliquer au dossier {detectionSelection.size > 0 ? `(${detectionSelection.size} éléments)` : ''}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Panel IA */}
        {(aiSuggestion || aiLoading || aiError) && (
          <div className="mb-2 rounded-xl border border-purple-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-purple-100" style={{ backgroundColor: '#f5f0ff' }}>
              <Sparkles className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
              <span className="text-xs font-semibold text-purple-700 flex-1">Suggestion IA</span>
              {aiSuggestion && (
                <button onClick={handleAiSuggest} disabled={aiLoading} title="Régénérer" className="text-purple-400 hover:text-purple-600 disabled:opacity-40">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => { setAiSuggestion(null); setAiError(null) }} className="text-gray-400 hover:text-gray-600 ml-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {aiLoading && <div className="flex items-center gap-2 px-3 py-3 text-xs text-gray-500"><Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />Génération…</div>}
            {aiError && !aiLoading && <div className="px-3 py-2 text-xs text-red-600">{aiError}</div>}
            {aiSuggestion && !aiLoading && (
              <div className="px-3 py-2">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{aiSuggestion}</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { setReplyText(aiSuggestion); setAiSuggestion(null) }}
                    className="text-xs px-3 py-1.5 rounded-full font-medium text-white" style={{ backgroundColor: '#7c3aed' }}>Modifier</button>
                  <button onClick={() => { setReplyText(aiSuggestion); setAiSuggestion(null) }}
                    className="text-xs px-3 py-1.5 rounded-full font-medium border border-purple-200 text-purple-700 hover:bg-purple-50">Copier</button>
                  <button onClick={async () => {
                    const text = aiSuggestion; setAiSuggestion(null); setAiError(null)
                    setReplyText(text); setTimeout(() => handleSend(), 50)
                  }} disabled={sending}
                    className="text-xs px-3 py-1.5 rounded-full font-medium text-white disabled:opacity-40 flex items-center gap-1"
                    style={{ backgroundColor: WA_DARK }}>
                    {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Envoyer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Erreur template */}
        {templateError && (
          <div className="mb-2 flex items-start gap-2 text-xs text-orange-800 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            <span className="text-orange-500 mt-0.5 flex-shrink-0">⚠️</span>
            <span className="flex-1">{templateError}</span>
            <button onClick={() => setTemplateError(null)} className="text-orange-400 hover:text-orange-600 ml-1 flex-shrink-0"><X className="w-3 h-3" /></button>
          </div>
        )}

        {/* Erreur envoi */}
        {sendError && (
          <div className="mb-2 flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <X className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1">{sendError}</span>
            <button onClick={() => setSendError(null)} className="text-red-400 hover:text-red-600 ml-1"><X className="w-3 h-3" /></button>
          </div>
        )}

        {/* Panel Templates */}
        {showTemplates && (
          <div className="mb-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-600">Templates</span>
              <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-3 max-h-48 overflow-y-auto">
              {templatesLoading || resolvingTemplate ? (
                <div className="flex items-center justify-center h-16 gap-2 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">{resolvingTemplate ? 'Remplissage des variables…' : 'Chargement…'}</span>
                </div>
              ) : templates.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Aucun template — créer dans Réglages → Templates</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {templates.map(t => (
                    <button key={t.id} onClick={() => handleInsertTemplate(t.id)}
                      className="text-left px-3 py-2.5 rounded-lg border border-gray-100 hover:border-teal-300 hover:bg-teal-50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-900">{t.name}</span>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{t.category}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-2">{t.content.slice(0, 100)}…</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Panel Médiathèque */}
        {showMediaLib && (
          <div className="mb-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {mediaFolder && <button onClick={() => loadMediaLibrary('')} className="text-gray-400 hover:text-gray-600 text-xs">← Retour</button>}
                <span className="text-xs font-semibold text-gray-600">{mediaFolder || 'Médiathèque'}</span>
              </div>
              <button onClick={() => setShowMediaLib(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-3 max-h-48 overflow-y-auto">
              {mediaLoading ? (
                <div className="flex items-center justify-center h-20"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
              ) : (
                <>
                  {!mediaFolder && mediaFolders.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {mediaFolders.map(f => (
                        <button key={f} onClick={() => loadMediaLibrary(f)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700">
                          📁 {f}
                        </button>
                      ))}
                    </div>
                  )}
                  {mediaFiles.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {mediaFiles.map(f => (
                        <button key={f.path} onClick={() => handleSendFromLibrary(f)}
                          disabled={sendingMedia === f.url}
                          className="relative group rounded-lg overflow-hidden border border-gray-200 hover:border-teal-400 transition-colors aspect-square bg-gray-50 disabled:opacity-50">
                          {f.type === 'video' ? (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800">
                              <Video className="w-6 h-6 text-white" />
                            </div>
                          ) : f.type === 'document' ? (
                            <div className="w-full h-full flex items-center justify-center flex-col gap-1">
                              <FileText className="w-6 h-6 text-gray-400" />
                              <span className="text-[9px] text-gray-500 truncate px-1 w-full text-center">{f.name}</span>
                            </div>
                          ) : (
                            <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                          )}
                          {sendingMedia === f.url && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Loader2 className="w-4 h-4 text-white animate-spin" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-4">
                      {mediaFolder ? 'Dossier vide' : 'Médiathèque vide — ajoute des fichiers dans Réglages → Médiathèque'}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Barre de saisie */}
        <div className="flex items-end gap-2">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,.pdf,.doc,.docx" onChange={handleFileSelect} />

          {/* Joindre */}
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading || sending} title="Joindre un fichier"
            className="w-10 h-10 rounded-full bg-white hover:bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0 shadow-sm disabled:opacity-40">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-5 h-5" />}
          </button>

          {/* Templates */}
          <button
            onClick={() => { setShowMediaLib(false); if (!showTemplates) loadTemplates(); else setShowTemplates(false) }}
            disabled={sending || uploading} title="Templates"
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-colors ${showTemplates ? 'bg-orange-100 text-orange-700' : 'bg-white hover:bg-gray-100 text-gray-500'}`}>
            <FileText className="w-5 h-5" />
          </button>

          {/* Médiathèque */}
          <button
            onClick={() => { setShowTemplates(false); if (!showMediaLib) loadMediaLibrary(''); setShowMediaLib(p => !p) }}
            disabled={sending || uploading} title="Médiathèque"
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-colors ${showMediaLib ? 'bg-teal-100 text-teal-700' : 'bg-white hover:bg-gray-100 text-gray-500'}`}>
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Textarea */}
          <textarea
            value={replyText}
            onChange={e => { setReplyText(e.target.value); if (templateError && !/{{[\w]+}}/.test(e.target.value)) setTemplateError(null) }}
            onKeyDown={handleKeyDown}
            placeholder="Tapez un message"
            rows={1}
            disabled={sending || uploading}
            className="flex-1 px-4 py-2.5 bg-white rounded-3xl text-sm outline-none resize-none leading-relaxed shadow-sm"
            style={{ minHeight: '42px', maxHeight: '120px', overflowY: 'auto' }}
          />

          {/* IA */}
          <button onClick={handleAiSuggest} disabled={aiLoading || sending || uploading} title="Suggestion IA"
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border disabled:opacity-40"
            style={{ backgroundColor: aiLoading ? '#f5f0ff' : '#ede9fe', borderColor: '#c4b5fd', color: '#7c3aed' }}>
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </button>

          {/* Envoyer */}
          <button onClick={handleSend} disabled={!replyText.trim() || sending || uploading || !!templateError}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white shadow-sm disabled:opacity-40"
            style={{ backgroundColor: WA_DARK }}
            title={templateError ? "Complète les variables avant d'envoyer" : 'Envoyer'}>
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
          </button>
        </div>
      </div>
    </div>
  )
}
