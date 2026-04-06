'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Send, Loader2, MessageSquare, Trash2, Check, CheckCheck,
  Paperclip, Search, X, Image as ImageIcon, FileText, Video,
  Sparkles, RefreshCw,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WhatsAppMessage {
  id: string;
  wa_message_id?: string;
  wa_phone_number: string;
  wa_display_name: string | null;
  message_content: string;
  message_type: string;
  direction: 'inbound' | 'outbound';
  delivery_status: string;
  created_at: string;
}

interface Conversation {
  phone: string;
  displayName: string | null;
  lastMessage: string;
  lastMessageType: string;
  lastMessageAt: string;
  lastMessageDirection: 'inbound' | 'outbound';
  unreadCount: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  if (phone.startsWith('lid:')) return phone;
  return phone.startsWith('+') ? phone : '+' + phone;
}

function formatPhone(phone: string): string {
  if (phone.startsWith('lid:')) return 'Contact WhatsApp';
  const p = normalizePhone(phone);
  if (p.startsWith('+33') && p.length === 12) {
    // French format: +33 X XX XX XX XX (1 + 4×2 = 9 digits)
    const digits = p.slice(3);
    const first = digits[0];
    const rest = digits.slice(1).match(/.{2}/g) || [];
    return `+33\u00a0${first}\u00a0${rest.join('\u00a0')}`;
  }
  return p;
}

function getInitials(name: string | null, phone: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  if (phone.startsWith('lid:')) return 'WA';
  return normalizePhone(phone).replace(/^\+/, '').slice(-2);
}

function formatListTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Hier';
  return format(d, 'dd/MM/yy', { locale: fr });
}

function formatMsgTime(dateStr: string): string {
  return format(new Date(dateStr), 'HH:mm');
}

function previewLastMessage(content: string, type: string, dir: 'inbound' | 'outbound'): string {
  const pre = dir === 'outbound' ? 'Vous\u200a: ' : '';
  if (type === 'image') return pre + '📷 Photo';
  if (type === 'video') return pre + '🎥 Vidéo';
  if (type === 'document') return pre + '📄 Document';
  if (type === 'audio') return pre + '🎵 Audio';
  const t = content.length > 46 ? content.slice(0, 46) + '\u2026' : content;
  return pre + t;
}

const AVATAR_COLORS = [
  '#1abc9c', '#2ecc71', '#3498db', '#9b59b6',
  '#e74c3c', '#e67e22', '#16a085', '#2980b9',
];

function avatarColor(phone: string): string {
  let h = 0;
  for (const c of phone) h = ((h * 31) + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function MediaPreviewIcon({ type }: { type: string }) {
  if (type === 'image') return <ImageIcon className="inline w-3.5 h-3.5 mr-0.5 opacity-60" />;
  if (type === 'video') return <Video className="inline w-3.5 h-3.5 mr-0.5 opacity-60" />;
  if (type === 'document') return <FileText className="inline w-3.5 h-3.5 mr-0.5 opacity-60" />;
  return null;
}

function DeliveryIcon({ status }: { status: string }) {
  if (status === 'queued') return <Check className="w-3.5 h-3.5 opacity-60" />;
  if (status === 'failed') return <X className="w-3.5 h-3.5 text-red-400" />;
  return <CheckCheck className={'w-3.5 h-3.5 ' + (status === 'read' ? 'text-sky-400' : 'opacity-60')} />;
}

const WA_BG = '#efeae2';
const WA_DARK = '#075E54';
const WA_GREEN = '#25D366';
const WA_BUBBLE = '#DCF8C6';

// ─── main component ───────────────────────────────────────────────────────────

export function WhatsAppInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filtered, setFiltered] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [unreadSepIdx, setUnreadSepIdx] = useState<number | null>(null);
  const [toast, setToast] = useState<{ name: string; content: string; phone: string } | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const selectedPhoneRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSeenMap = useRef<Record<string, string>>({});
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Singleton Supabase client — createClient() must NOT be called on every render
  // because @supabase/ssr creates a new object each time, which causes loadMessages
  // and loadConversations to be recreated every render, triggering an infinite loop.
  const supabase = useRef(createClient()).current;

  // init
  useEffect(() => {
    try {
      const s = localStorage.getItem('wa_lastSeen');
      if (s) lastSeenMap.current = JSON.parse(s);
    } catch {}
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => { selectedPhoneRef.current = selectedPhone; }, [selectedPhone]);

  // filter search
  useEffect(() => {
    if (!searchQuery.trim()) { setFiltered(conversations); return; }
    const q = searchQuery.toLowerCase();
    setFiltered(conversations.filter(c =>
      (c.displayName || '').toLowerCase().includes(q) ||
      normalizePhone(c.phone).includes(q)
    ));
  }, [conversations, searchQuery]);

  const saveLastSeen = useCallback((phone: string) => {
    lastSeenMap.current[phone] = new Date().toISOString();
    try { localStorage.setItem('wa_lastSeen', JSON.stringify(lastSeenMap.current)); } catch {}
  }, []);

  const showBrowserNotif = useCallback((name: string, body: string, phone: string) => {
    if (typeof document !== 'undefined' && !document.hidden) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const n = new Notification('💬 ' + name, { body: body.slice(0, 120), icon: '/favicon.ico', tag: 'wa_' + phone });
    n.onclick = () => { window.focus(); setSelectedPhone(phone); n.close(); };
  }, []);

  const showToast = useCallback((name: string, content: string, phone: string) => {
    setToast({ name, content, phone });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadConversations = useCallback(async () => {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('wa_phone_number, wa_display_name, message_content, message_type, direction, created_at')
      .order('created_at', { ascending: false });

    if (error) { console.error('loadConversations:', error); setLoading(false); return; }

    const convMap = new Map<string, Conversation>();
    const unreadCount = new Map<string, number>();

    for (const msg of (data || [])) {
      const phone = normalizePhone(msg.wa_phone_number);
      if (!convMap.has(phone)) {
        convMap.set(phone, {
          phone,
          displayName: msg.wa_display_name,
          lastMessage: msg.message_content,
          lastMessageType: msg.message_type || 'text',
          lastMessageAt: msg.created_at,
          lastMessageDirection: msg.direction,
          unreadCount: 0,
        });
      }
      if (msg.direction === 'inbound') {
        const lastSeen = lastSeenMap.current[phone];
        if (!lastSeen || msg.created_at > lastSeen) {
          unreadCount.set(phone, (unreadCount.get(phone) || 0) + 1);
        }
      }
    }

    const convArr = Array.from(convMap.values())
      .map(c => ({ ...c, unreadCount: unreadCount.get(c.phone) || 0 }))
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));

    setConversations(convArr);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadConversations();

    const channel = supabase
      .channel('wa_inbox_v2')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, (payload) => {
        const msg = payload.new as WhatsAppMessage;
        loadConversations();
        if (msg.direction === 'inbound') {
          const phone = normalizePhone(msg.wa_phone_number);
          if (phone !== selectedPhoneRef.current) {
            const name = msg.wa_display_name || formatPhone(phone);
            showBrowserNotif(name, msg.message_content, phone);
            showToast(name, msg.message_content, phone);
          }
        }
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [loadConversations, showBrowserNotif, showToast, supabase]);

  const loadMessages = useCallback(async (phone: string) => {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('wa_phone_number', phone)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const lastSeen = lastSeenMap.current[phone];
      let sepIdx: number | null = null;
      if (lastSeen) {
        const fi = data.findIndex(m => m.direction === 'inbound' && m.created_at > lastSeen);
        if (fi > 0) sepIdx = fi;
      }
      setUnreadSepIdx(sepIdx);
      setMessages(data);
    }
    saveLastSeen(phone);
  }, [supabase, saveLastSeen]);

  useEffect(() => {
    if (!selectedPhone) return;
    loadMessages(selectedPhone);

    const channel = supabase
      .channel('wa_conv_' + selectedPhone)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'whatsapp_messages',
        filter: 'wa_phone_number=eq.' + selectedPhone,
      }, (payload) => {
        const msg = payload.new as WhatsAppMessage;
        setMessages(prev => {
          if (msg.wa_message_id && prev.some(m => m.wa_message_id === msg.wa_message_id)) return prev;
          return [...prev.filter(m => !m.id.startsWith('opt_')), msg];
        });
        saveLastSeen(selectedPhone);
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [selectedPhone, loadMessages, saveLastSeen, supabase]);

  const selectConversation = useCallback((phone: string) => {
    setSelectedPhone(phone);
    setSendError(null);
    setAiSuggestion(null);
    setAiError(null);
    setConversations(prev => prev.map(c => c.phone === phone ? { ...c, unreadCount: 0 } : c));
  }, []);

  const handleAiSuggest = useCallback(async () => {
    if (!selectedPhone || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    setAiSuggestion(null);
    try {
      const conv = conversations.find(c => c.phone === selectedPhone);
      const res = await fetch('/api/whatsapp/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: selectedPhone, contactName: conv?.displayName }),
      });
      const data = await res.json() as { suggestion?: string; error?: string };
      if (!res.ok || !data.suggestion) {
        setAiError(data.error || 'Erreur IA');
      } else {
        setAiSuggestion(data.suggestion);
      }
    } catch {
      setAiError('Erreur de connexion');
    } finally {
      setAiLoading(false);
    }
  }, [selectedPhone, aiLoading, conversations]);

  const handleSend = useCallback(async () => {
    if (!replyText.trim() || !selectedPhone || sending) return;
    const text = replyText.trim();
    const optId = 'opt_' + Date.now();
    const opt: WhatsAppMessage = {
      id: optId, wa_phone_number: selectedPhone, wa_display_name: null,
      message_content: text, message_type: 'text', direction: 'outbound',
      delivery_status: 'queued', created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, opt]);
    setReplyText('');
    setSendError(null);
    setSending(true);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: selectedPhone, message: text }),
      });
      const result = await res.json();
      if (!result.success) {
        setMessages(prev => prev.filter(m => m.id !== optId));
        setReplyText(text);
        setSendError(result.error || "Impossible d'envoyer le message");
      }
      // On success: the Realtime subscription receives the DB INSERT and replaces
      // the optimistic message automatically. Calling loadMessages() here would race
      // against the DB write and wipe the optimistic message before it's committed.
    } catch {
      setSendError('Erreur de connexion');
      setMessages(prev => prev.filter(m => m.id !== optId));
      setReplyText(text);
    } finally {
      setSending(false);
    }
  }, [replyText, selectedPhone, sending]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPhone) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    setUploading(true);
    setSendError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const upRes = await fetch('/api/whatsapp/upload', { method: 'POST', body: form });
      if (!upRes.ok) {
        const err = await upRes.json().catch(() => ({})) as Record<string, string>;
        setSendError(err.error || "Echec de l'envoi du fichier");
        return;
      }
      const { url, mediaType } = await upRes.json() as { url: string; mediaType: string };
      const optId = 'opt_' + Date.now();
      const opt: WhatsAppMessage = {
        id: optId, wa_phone_number: selectedPhone, wa_display_name: null,
        message_content: replyText.trim() || file.name,
        message_type: mediaType, direction: 'outbound',
        delivery_status: 'queued', created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, opt]);
      const caption = replyText.trim() || undefined;
      setReplyText('');
      const sendRes = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: selectedPhone, message: caption || file.name, mediaUrl: url, mediaType }),
      });
      const result = await sendRes.json();
      if (!result.success) {
        setMessages(prev => prev.filter(m => m.id !== optId));
        setSendError(result.error || "Impossible d'envoyer le fichier");
      }
      // On success: Realtime handles the message appearing (same as text send)
    } catch {
      setSendError('Erreur de connexion');
    } finally {
      setUploading(false);
    }
  }, [selectedPhone, replyText]);

  const handleDelete = useCallback(async (phone: string) => {
    setDeleting(true);
    try {
      const res = await fetch('/api/whatsapp/conversations?phone=' + encodeURIComponent(phone), { method: 'DELETE' });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.phone !== phone));
        if (selectedPhone === phone) { setSelectedPhone(null); setMessages([]); }
      } else {
        const err = await res.json().catch(() => ({})) as Record<string, string>;
        setSendError(err.error || 'Suppression impossible');
      }
    } catch {
      setSendError('Erreur de connexion');
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  }, [selectedPhone]);

  const selectedConv = conversations.find(c => c.phone === selectedPhone);
  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500 text-sm">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full relative overflow-hidden" style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* ── sidebar ── */}
      <div className="w-[360px] flex-shrink-0 flex flex-col border-r bg-white">

        {/* header */}
        <div className="flex items-center px-4 h-[60px] flex-shrink-0" style={{ backgroundColor: WA_DARK }}>
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center mr-3">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold flex-1 text-sm">WhatsApp</span>
          {totalUnread > 0 && (
            <span className="text-xs font-bold text-white rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5"
              style={{ backgroundColor: WA_GREEN }}>
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </div>

        {/* search */}
        <div className="px-2 py-2 border-b" style={{ backgroundColor: '#F0F2F5' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher une conversation"
              className="w-full pl-9 pr-8 py-2 rounded-full text-sm outline-none bg-white"
            />
            {searchQuery && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setSearchQuery('')}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* list */}
        <div className="flex-1 overflow-y-auto bg-white">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm gap-2">
              <MessageSquare className="w-8 h-8 opacity-30" />
              {conversations.length === 0 ? 'Aucune conversation' : 'Aucun resultat'}
            </div>
          ) : filtered.map(conv => (
            <div
              key={conv.phone}
              onClick={() => selectConversation(conv.phone)}
              className="relative flex items-center gap-3 px-4 py-3 cursor-pointer group border-b border-gray-100 transition-colors hover:bg-gray-50"
              style={{ backgroundColor: selectedPhone === conv.phone ? '#F0F2F5' : undefined }}
            >
              <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold text-sm select-none"
                style={{ backgroundColor: avatarColor(conv.phone) }}>
                {getInitials(conv.displayName, conv.phone)}
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-baseline justify-between mb-0.5">
                  <span className={'text-sm truncate ' + (conv.unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-800')}>
                    {conv.displayName || formatPhone(conv.phone)}
                  </span>
                  <span className={'text-[11px] flex-shrink-0 ml-2 ' + (conv.unreadCount > 0 ? 'font-semibold' : 'text-gray-400')}
                    style={{ color: conv.unreadCount > 0 ? WA_GREEN : undefined }}>
                    {formatListTime(conv.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs truncate text-gray-400">
                    <MediaPreviewIcon type={conv.lastMessageType} />
                    {previewLastMessage(conv.lastMessage, conv.lastMessageType, conv.lastMessageDirection)}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="flex-shrink-0 ml-2 text-[10px] font-bold text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                      style={{ backgroundColor: WA_GREEN }}>
                      {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); setDeleteConfirm(conv.phone); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 text-red-500 hidden group-hover:flex items-center justify-center transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── chat area ── */}
      <div className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: WA_BG }}>
        {selectedPhone ? (
          <>
            {/* chat header */}
            <div className="flex items-center gap-3 px-4 h-[60px] flex-shrink-0 shadow-sm" style={{ backgroundColor: WA_DARK }}>
              <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold text-xs select-none"
                style={{ backgroundColor: avatarColor(selectedPhone) }}>
                {getInitials(selectedConv?.displayName || null, selectedPhone)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">
                  {selectedConv?.displayName || formatPhone(selectedPhone)}
                </p>
                {selectedConv?.displayName && (
                  <p className="text-xs truncate" style={{ color: '#b2dfdb' }}>{formatPhone(selectedPhone)}</p>
                )}
              </div>
            </div>

            {/* messages */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
              {messages.map((msg, idx) => (
                <div key={msg.id}>
                  {unreadSepIdx === idx && (
                    <div className="flex items-center gap-3 py-3 my-1">
                      <div className="flex-1 h-px bg-amber-300/50" />
                      <span className="text-xs font-medium px-3 py-1 rounded-full shadow-sm whitespace-nowrap"
                        style={{ backgroundColor: '#FFF9C4', color: '#7a6515' }}>
                        Nouveaux messages
                      </span>
                      <div className="flex-1 h-px bg-amber-300/50" />
                    </div>
                  )}
                  <div className={'flex mb-1 ' + (msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={'max-w-[65%] px-3 py-2 shadow-sm text-sm ' + (msg.id.startsWith('opt_') ? 'opacity-60' : '')}
                      style={{
                        backgroundColor: msg.direction === 'outbound' ? WA_BUBBLE : '#ffffff',
                        borderRadius: msg.direction === 'outbound' ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                      }}
                    >
                      <p className="text-gray-900 break-words whitespace-pre-wrap leading-relaxed">{msg.message_content}</p>
                      <div className={'flex items-center gap-1 mt-0.5 ' + (msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                        <span className="text-[10px] text-gray-400">{formatMsgTime(msg.created_at)}</span>
                        {msg.direction === 'outbound' && <DeliveryIcon status={msg.delivery_status} />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* input */}
            <div className="flex-shrink-0 px-4 py-3" style={{ backgroundColor: '#F0F2F5' }}>
              {/* AI suggestion panel */}
              {(aiSuggestion || aiLoading || aiError) && (
                <div className="mb-2 rounded-xl border border-purple-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-purple-100" style={{ backgroundColor: '#f5f0ff' }}>
                    <Sparkles className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-purple-700 flex-1">Suggestion IA</span>
                    {aiSuggestion && (
                      <button
                        onClick={handleAiSuggest}
                        disabled={aiLoading}
                        title="Régénérer"
                        className="text-purple-400 hover:text-purple-600 disabled:opacity-40"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => { setAiSuggestion(null); setAiError(null); }}
                      className="text-gray-400 hover:text-gray-600 ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {aiLoading && (
                    <div className="flex items-center gap-2 px-3 py-3 text-xs text-gray-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                      Génération en cours…
                    </div>
                  )}
                  {aiError && !aiLoading && (
                    <div className="px-3 py-2 text-xs text-red-600">{aiError}</div>
                  )}
                  {aiSuggestion && !aiLoading && (
                    <div className="px-3 py-2">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{aiSuggestion}</p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            setReplyText(aiSuggestion);
                            setAiSuggestion(null);
                            setAiError(null);
                          }}
                          className="text-xs px-3 py-1.5 rounded-full font-medium text-white transition-colors"
                          style={{ backgroundColor: '#7c3aed' }}
                        >
                          Modifier
                        </button>
                        <button
                          onClick={async () => {
                            const text = aiSuggestion;
                            setAiSuggestion(null);
                            setAiError(null);
                            // Inject into reply box then send
                            setReplyText(text);
                          }}
                          className="text-xs px-3 py-1.5 rounded-full font-medium border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors"
                        >
                          Copier
                        </button>
                        <button
                          onClick={async () => {
                            if (!selectedPhone || sending) return;
                            const text = aiSuggestion;
                            setAiSuggestion(null);
                            setAiError(null);
                            const optId = 'opt_' + Date.now();
                            const opt: WhatsAppMessage = {
                              id: optId, wa_phone_number: selectedPhone, wa_display_name: null,
                              message_content: text, message_type: 'text', direction: 'outbound',
                              delivery_status: 'queued', created_at: new Date().toISOString(),
                            };
                            setMessages(prev => [...prev, opt]);
                            setSending(true);
                            setSendError(null);
                            try {
                              const res = await fetch('/api/whatsapp/send', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ phoneNumber: selectedPhone, message: text }),
                              });
                              const result = await res.json();
                              if (!result.success) {
                                setMessages(prev => prev.filter(m => m.id !== optId));
                                setSendError(result.error || "Impossible d'envoyer le message");
                              }
                            } catch {
                              setSendError('Erreur de connexion');
                              setMessages(prev => prev.filter(m => m.id !== optId));
                            } finally {
                              setSending(false);
                            }
                          }}
                          disabled={sending}
                          className="text-xs px-3 py-1.5 rounded-full font-medium text-white transition-colors disabled:opacity-40 flex items-center gap-1"
                          style={{ backgroundColor: WA_DARK }}
                        >
                          {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          Envoyer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {sendError && (
                <div className="mb-2 flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <X className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1">{sendError}</span>
                  <button onClick={() => setSendError(null)} className="text-red-400 hover:text-red-600 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <input type="file" ref={fileInputRef} className="hidden"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={handleFileSelect} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || sending}
                  title="Joindre un fichier"
                  className="w-10 h-10 rounded-full bg-white hover:bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40 shadow-sm"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                </button>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tapez un message"
                  rows={1}
                  disabled={sending || uploading}
                  className="flex-1 px-4 py-2.5 bg-white rounded-3xl text-sm outline-none resize-none leading-relaxed shadow-sm"
                  style={{ minHeight: '42px', maxHeight: '120px', overflowY: 'auto' }}
                />
                <button
                  onClick={handleAiSuggest}
                  disabled={aiLoading || sending || uploading}
                  title="Suggestion IA"
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40 shadow-sm border"
                  style={{ backgroundColor: aiLoading ? '#f5f0ff' : '#ede9fe', borderColor: '#c4b5fd', color: '#7c3aed' }}
                >
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleSend}
                  disabled={!replyText.trim() || sending || uploading}
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors text-white disabled:opacity-40 shadow-sm"
                  style={{ backgroundColor: WA_DARK }}
                  title="Envoyer (Entree)"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 select-none" style={{ backgroundColor: WA_BG }}>
            <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(7,94,84,0.08)' }}>
              <MessageSquare className="w-14 h-14" style={{ color: WA_DARK }} />
            </div>
            <div className="text-center">
              <p className="text-2xl font-light tracking-tight" style={{ color: WA_DARK }}>WhatsApp Web</p>
              <p className="text-sm text-gray-400 mt-1">Selectionnez une conversation pour commencer</p>
            </div>
          </div>
        )}
      </div>

      {/* ── delete modal ── */}
      {deleteConfirm && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => !deleting && setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-2">Supprimer la conversation ?</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Tous les messages avec{' '}
              <span className="font-medium text-gray-700">
                {conversations.find(c => c.phone === deleteConfirm)?.displayName || formatPhone(deleteConfirm)}
              </span>{' '}
              seront definitvement supprimes du CRM.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-40">
                Annuler
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={deleting}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── new message toast ── */}
      {toast && (
        <div
          className="absolute bottom-5 left-5 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 flex items-center gap-3 max-w-[300px] cursor-pointer z-40"
          onClick={() => { selectConversation(toast.phone); setToast(null); }}
        >
          <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold"
            style={{ backgroundColor: avatarColor(toast.phone) }}>
            {getInitials(toast.name, toast.phone)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{toast.name || formatPhone(toast.phone)}</p>
            <p className="text-xs text-gray-500 truncate mt-0.5">{toast.content}</p>
          </div>
          <button onClick={e => { e.stopPropagation(); setToast(null); }} className="text-gray-300 hover:text-gray-500 ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
