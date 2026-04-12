'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Send, Loader2, MessageSquare, Trash2, Check, CheckCheck,
  Paperclip, Search, X, Image as ImageIcon, FileText, Video,
  Sparkles, RefreshCw, UserPlus, ChevronRight, ExternalLink,
  User, FolderOpen, AlertCircle, Pencil,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';

interface OcrResult {
  document_type: 'flight_ticket' | 'passport' | 'id_card' | 'hotel_voucher' | 'invoice' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  passenger_name?: string;
  flight_number?: string;
  flight_date?: string;
  departure_airport?: string;
  arrival_airport?: string;
  departure_time?: string;
  arrival_time?: string;
  booking_reference?: string;
  seat?: string;
  cabin_class?: string;
  doc_number?: string;
  nationality?: string;
  date_of_birth?: string;
  expiry_date?: string;
  summary?: string;
}

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
  metadata?: { media_url?: string; media_filename?: string; ocr?: OcrResult; [key: string]: unknown };
}

interface LeadRecord {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  crm_status: string;
  source: string;
  adults_count: number;
  children_count: number;
  babies_count: number;
  notes: string | null;
  created_at: string;
  converted_to_file_id: string | null;
  event_id: string | null;
  events: { name: string } | null;
}

interface DossierRecord {
  id: string;
  file_reference: string;
  primary_contact_first_name: string;
  primary_contact_last_name: string;
  crm_status: string;
  payment_status: string | null;
  quoted_price: number | null;
  amount_paid: number | null;
  created_at: string;
  event_id: string;
  events: { name: string; start_date: string } | null;
}

interface NameSuggestion {
  type: 'lead' | 'dossier';
  id: string;
  label: string;
  subLabel: string;
  score: number;
}

interface ClientInfo {
  leads: LeadRecord[];
  dossiers: DossierRecord[];
  isKnown: boolean;
  nameSuggestions?: NameSuggestion[];
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

function formatPhone(phone: string, displayName?: string | null): string {
  if (phone.startsWith('lid:')) return displayName || 'Contact WhatsApp';
  const p = normalizePhone(phone);
  if (p.startsWith('+33') && p.length === 12) {
    const digits = p.slice(3);
    const first = digits[0];
    const rest = digits.slice(1).match(/.{2}/g) || [];
    return `+33\u00a0${first}\u00a0${rest.join('\u00a0')}`;
  }
  return p;
}

/** Détecte si un pseudo WhatsApp ressemble à un vrai prénom/nom */
function isRealName(name: string | null): boolean {
  if (!name) return false;
  // Rejette les formats type username (underscores, chiffres dominants, trop court)
  if (name.includes('_')) return false;
  if (/\d{3,}/.test(name)) return false;
  if (name.length < 3) return false;
  return true;
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
  const router = useRouter();
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
  const [clientPanel, setClientPanel] = useState(false);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [clientInfoLoading, setClientInfoLoading] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);
  const [pendingExtraction, setPendingExtraction] = useState<Record<string, string | number>>({});
  const [validatingField, setValidatingField] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [validatedFields, setValidatedFields] = useState<Set<string>>(new Set());
  const [editingPhone, setEditingPhone] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkSearchResults, setLinkSearchResults] = useState<NameSuggestion[]>([]);
  const [linkSearching, setLinkSearching] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<{ id: string; name: string; category: string; content: string }[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [resolvingTemplate, setResolvingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [showMediaLib, setShowMediaLib] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<{ name: string; path: string; url: string; type: string }[]>([]);
  const [mediaFolder, setMediaFolder] = useState('');
  const [mediaFolders, setMediaFolders] = useState<string[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [sendingMedia, setSendingMedia] = useState<string | null>(null);
  const [editPhoneValue, setEditPhoneValue] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  // AI dossier extraction
  const [dossierExtraction, setDossierExtraction] = useState<Record<string, unknown> | null>(null);
  const [extractingDossier, setExtractingDossier] = useState(false);
  const [dossierExtractionError, setDossierExtractionError] = useState<string | null>(null);
  const [dossierFieldSelection, setDossierFieldSelection] = useState<Set<string>>(new Set());
  const [applyingDossier, setApplyingDossier] = useState(false);

  const selectedPhoneRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSeenMap = useRef<Record<string, string>>({});
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Ref to trigger progressive extraction without creating circular deps
  const progressiveExtractRef = useRef<(phone: string) => void>(() => {});
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
      .order('created_at', { ascending: false })
      .limit(1000);

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
      .order('created_at', { ascending: true })
      .limit(200);

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
          if (prev.some(m => m.id === msg.id)) return prev;
          if (msg.wa_message_id && prev.some(m => m.wa_message_id === msg.wa_message_id)) return prev;
          // Si c'est un message sortant, retire les optimistes avec le même contenu
          if (msg.direction === 'outbound') {
            return [...prev.filter(m => !(m.id.startsWith('opt_') && m.message_content === msg.message_content)), msg];
          }
          return [...prev, msg];
        });
        saveLastSeen(selectedPhone);
        // Progressive extraction: re-analyze on each new inbound message
        if (msg.direction === 'inbound') {
          progressiveExtractRef.current(selectedPhone);
        }
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [selectedPhone, loadMessages, saveLastSeen, supabase]);

  const selectConversation = useCallback((phone: string) => {
    setSelectedPhone(phone);
    setSendError(null);
    setAiSuggestion(null);
    setAiError(null);
    setClientPanel(false);
    setClientInfo(null);
    setPendingExtraction({});
    setEditingField(null);
    setValidatedFields(new Set());
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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!templateError) handleSend(); }
  }, [handleSend, templateError]);

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

  const loadClientInfo = useCallback(async (phone: string) => {
    setClientInfoLoading(true);
    setClientInfo(null);
    try {
      const conv = conversations.find(c => c.phone === phone);
      const dn = conv?.displayName ? `&displayName=${encodeURIComponent(conv.displayName)}` : '';
      const res = await fetch('/api/whatsapp/client-info?phone=' + encodeURIComponent(phone) + dn);
      const data = await res.json() as ClientInfo;
      setClientInfo(data);
    } catch {
      setClientInfo({ leads: [], dossiers: [], isKnown: false });
    } finally {
      setClientInfoLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPhone) loadClientInfo(selectedPhone);
  }, [selectedPhone, loadClientInfo]);

  // Keep the progressive extract ref up to date
  useEffect(() => {
    progressiveExtractRef.current = (phone: string) => {
      setClientInfo(prev => {
        if (!prev || prev.leads.length === 0) return prev;
        const conv = conversations.find(c => c.phone === phone);
        fetch('/api/whatsapp/extract-lead-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, displayName: conv?.displayName }),
        })
          .then(r => r.json())
          .then((data: { extracted?: Record<string, string | number> }) => {
            if (data.extracted && Object.keys(data.extracted).length > 0) {
              setPendingExtraction(prev => ({ ...prev, ...data.extracted }));
              setClientPanel(true); // auto-open panel to show pending
            }
            loadClientInfo(phone);
          })
          .catch(() => {});
        return prev;
      });
    };
  }, [conversations, loadClientInfo]);

  const handleCreateLead = useCallback(async () => {
    if (!selectedPhone || creatingLead) return;
    setCreatingLead(true);
    try {
      const conv = conversations.find(c => c.phone === selectedPhone);
      const res = await fetch('/api/whatsapp/client-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: selectedPhone, displayName: conv?.displayName }),
      });
      if (res.ok) {
        // Reload client info + trigger AI extraction in background
        await loadClientInfo(selectedPhone);
        // Trigger AI extraction to fill in details
        fetch('/api/whatsapp/extract-lead-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: selectedPhone, displayName: conv?.displayName }),
        }).catch(() => {});
      }
    } catch {
      // silent
    } finally {
      setCreatingLead(false);
    }
  }, [selectedPhone, creatingLead, conversations, loadClientInfo]);

  const handleSavePhone = useCallback(async () => {
    if (!selectedPhone || !editPhoneValue.trim() || savingPhone) return;
    const raw = editPhoneValue.trim();
    const newPhone = raw.startsWith('+') ? raw : '+' + raw.replace(/^00/, '').replace(/^0/, '33');
    const oldPhone = selectedPhone;
    setSavingPhone(true);
    try {
      if (oldPhone.startsWith('lid:')) {
        // ── Remplacement LID → vrai numéro ────────────────────────────────────
        // 1. Trouver l'entité liée (dossier ou lead) AVANT de migrer les messages
        const { data: linkedMsg } = await supabase
          .from('whatsapp_messages')
          .select('client_file_id, lead_id')
          .eq('wa_phone_number', oldPhone)
          .not('client_file_id', 'is', null)
          .limit(1)
          .maybeSingle();

        const { data: linkedMsgLead } = !linkedMsg ? await supabase
          .from('whatsapp_messages')
          .select('lead_id')
          .eq('wa_phone_number', oldPhone)
          .not('lead_id', 'is', null)
          .limit(1)
          .maybeSingle() : { data: null };

        const clientFileId = linkedMsg?.client_file_id;
        const leadId = linkedMsg?.lead_id ?? linkedMsgLead?.lead_id;

        // 2. Stocker le LID sur l'entité + mettre à jour le vrai numéro
        if (clientFileId) {
          await supabase.from('client_files')
            .update({ whatsapp_lid: oldPhone, primary_contact_phone: newPhone })
            .eq('id', clientFileId);
        }
        if (leadId) {
          await supabase.from('leads')
            .update({ whatsapp_lid: oldPhone, phone: newPhone })
            .eq('id', leadId);
        }

        // 3. Migrer tous les messages LID vers le vrai numéro
        await supabase.from('whatsapp_messages')
          .update({ wa_phone_number: newPhone })
          .eq('wa_phone_number', oldPhone);

      } else {
        // ── Correction d'un vrai numéro ───────────────────────────────────────
        await supabase.from('whatsapp_messages').update({ wa_phone_number: newPhone }).eq('wa_phone_number', oldPhone);
        await supabase.from('client_files').update({ primary_contact_phone: newPhone }).eq('primary_contact_phone', oldPhone);
        await supabase.from('leads').update({ phone: newPhone }).eq('phone', oldPhone);
      }

      // Mettre à jour la conversation dans l'état local
      setConversations(prev => prev.map(c => c.phone === oldPhone ? { ...c, phone: newPhone } : c));
      setSelectedPhone(newPhone);
      setEditingPhone(false);
      await loadClientInfo(newPhone);
    } finally {
      setSavingPhone(false);
    }
  }, [selectedPhone, editPhoneValue, savingPhone, supabase, loadClientInfo]);

  /** Lie le numéro WhatsApp à un lead ou dossier existant trouvé par nom */
  const handleLinkSuggestion = useCallback(async (suggestion: NameSuggestion) => {
    if (!selectedPhone || linkingId) return;
    setLinkingId(suggestion.id);
    const isLid = selectedPhone.startsWith('lid:');
    try {
      if (suggestion.type === 'dossier') {
        // Si c'est un LID : stocker le LID pour les futurs messages entrants
        // mais ne pas écraser le vrai numéro s'il existe déjà
        if (isLid) {
          await supabase.from('client_files')
            .update({ whatsapp_lid: selectedPhone })
            .eq('id', suggestion.id);
        } else {
          await supabase.from('client_files')
            .update({ primary_contact_phone: selectedPhone })
            .eq('id', suggestion.id);
        }
        await supabase.from('whatsapp_messages').update({ client_file_id: suggestion.id }).eq('wa_phone_number', selectedPhone);
        router.push(`/dashboard/dossiers/${suggestion.id}`);
      } else {
        if (isLid) {
          await supabase.from('leads')
            .update({ whatsapp_lid: selectedPhone })
            .eq('id', suggestion.id);
        } else {
          await supabase.from('leads')
            .update({ phone: selectedPhone })
            .eq('id', suggestion.id);
        }
        await supabase.from('whatsapp_messages').update({ lead_id: suggestion.id }).eq('wa_phone_number', selectedPhone);
        await loadClientInfo(selectedPhone);
      }
    } finally {
      setLinkingId(null);
    }
  }, [selectedPhone, linkingId, supabase, loadClientInfo, router]);

  /** Trigger AI extraction of all dossier fields from the conversation */
  const handleExtractDossier = useCallback(async (dossierId: string) => {
    if (!selectedPhone || extractingDossier) return;
    setExtractingDossier(true);
    setDossierExtraction(null);
    setDossierExtractionError(null);
    setDossierFieldSelection(new Set());
    try {
      const res = await fetch('/api/whatsapp/extract-dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: selectedPhone, dossierId }),
      });
      const data = await res.json();
      if (data.error) { setDossierExtractionError(data.error); return; }
      if (data.extracted && Object.keys(data.extracted).length > 0) {
        setDossierExtraction(data.extracted);
        // Pre-select all fields
        setDossierFieldSelection(new Set(Object.keys(data.extracted)));
      } else {
        setDossierExtractionError('Aucune information détectée dans la conversation.');
      }
    } catch {
      setDossierExtractionError('Erreur réseau');
    } finally {
      setExtractingDossier(false);
    }
  }, [selectedPhone, extractingDossier]);

  /** Apply validated fields to the dossier */
  const handleApplyDossierExtraction = useCallback(async (dossierId: string) => {
    if (!dossierExtraction || applyingDossier) return;
    setApplyingDossier(true);
    const selected = Object.fromEntries(
      Object.entries(dossierExtraction).filter(([k]) => dossierFieldSelection.has(k))
    );
    const childrenAges = dossierFieldSelection.has('children_ages') && Array.isArray(dossierExtraction.children_ages)
      ? dossierExtraction.children_ages as number[]
      : undefined;

    try {
      await fetch('/api/whatsapp/apply-dossier-extraction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossierId, fields: selected, childrenAges }),
      });
      setDossierExtraction(null);
      setDossierFieldSelection(new Set());
      await loadClientInfo(selectedPhone!);
    } finally {
      setApplyingDossier(false);
    }
  }, [dossierExtraction, applyingDossier, dossierFieldSelection, loadClientInfo, selectedPhone]);

  const loadTemplates = useCallback(async () => {
    if (templates.length > 0) { setShowTemplates(true); return; }
    setTemplatesLoading(true);
    const res = await fetch('/api/whatsapp/templates');
    const data = await res.json();
    setTemplates(data.templates ?? []);
    setTemplatesLoading(false);
    setShowTemplates(true);
  }, [templates.length]);

  const handleInsertTemplate = useCallback(async (templateId: string) => {
    if (!selectedPhone) return;
    setResolvingTemplate(true);
    setTemplateError(null);
    const res = await fetch('/api/whatsapp/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId, phone: selectedPhone }),
    });
    const data = await res.json();
    if (data.content) {
      setReplyText(data.content);
      setShowTemplates(false);
      if (data.unresolved && data.unresolved.length > 0) {
        setTemplateError(
          `Variables non remplies : ${data.unresolved.join(', ')} — complète-les manuellement ou lie ce contact à un dossier/événement.`
        );
      }
    }
    setResolvingTemplate(false);
  }, [selectedPhone]);

  const loadMediaLibrary = useCallback(async (folder = '') => {
    setMediaLoading(true);
    setMediaFolder(folder);
    try {
      const res = await fetch(`/api/whatsapp/media-library?folder=${encodeURIComponent(folder)}`);
      const data = await res.json();
      setMediaFiles(data.files ?? []);
      if (!folder) setMediaFolders(data.folders ?? []);
    } finally {
      setMediaLoading(false);
    }
  }, []);

  const handleSendFromLibrary = useCallback(async (file: { url: string; type: string; name: string }) => {
    if (!selectedPhone || sendingMedia) return;
    setSendingMedia(file.url);
    const mediaType = file.type === 'video' ? 'video' : file.type === 'document' ? 'document' : 'image';
    const optId = 'opt_' + Date.now();
    setMessages(prev => [...prev, {
      id: optId, wa_phone_number: selectedPhone,
      message_content: file.name, message_type: mediaType,
      direction: 'outbound', delivery_status: 'queued',
      created_at: new Date().toISOString(), wa_display_name: null,
    }]);
    try {
      await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: selectedPhone, message: file.name, mediaUrl: file.url, mediaType }),
      });
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optId));
    } finally {
      setSendingMedia(null);
      setShowMediaLib(false);
    }
  }, [selectedPhone, sendingMedia]);

  const handleLinkSearch = useCallback(async (q: string) => {
    setLinkSearch(q);
    if (q.trim().length < 2) { setLinkSearchResults([]); return; }
    setLinkSearching(true);
    try {
      const term = q.trim();
      const orLeads = `first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%`;
      const orDossiers = `primary_contact_first_name.ilike.%${term}%,primary_contact_last_name.ilike.%${term}%,file_reference.ilike.%${term}%`;
      const [{ data: leads }, { data: dossiers }] = await Promise.all([
        supabase.from('leads').select('id, first_name, last_name, crm_status, events(name)').or(orLeads).limit(5),
        supabase.from('client_files').select('id, file_reference, primary_contact_first_name, primary_contact_last_name, crm_status, events(name, start_date)').or(orDossiers).limit(5),
      ]);
      const results: NameSuggestion[] = [
        ...(dossiers ?? []).map(d => ({
          type: 'dossier' as const,
          id: d.id,
          label: `${d.primary_contact_first_name} ${d.primary_contact_last_name}`,
          subLabel: `${d.file_reference} · ${(d.events as any)?.name || d.crm_status}`,
          score: 0,
        })),
        ...(leads ?? []).map(l => ({
          type: 'lead' as const,
          id: l.id,
          label: `${l.first_name} ${l.last_name}`,
          subLabel: `Lead · ${(l.events as any)?.name || l.crm_status}`,
          score: 0,
        })),
      ];
      setLinkSearchResults(results);
    } finally {
      setLinkSearching(false);
    }
  }, [supabase]);

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

      {/* ── client panel ── */}
      {clientPanel && selectedPhone && (
        <div className="w-[300px] flex-shrink-0 flex flex-col bg-white border-l shadow-xl overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ backgroundColor: WA_DARK }}>
            <span className="text-white font-semibold text-sm">Fiche client</span>
            <button onClick={() => setClientPanel(false)} className="text-white opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>

          {clientInfoLoading && (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          )}

          {!clientInfoLoading && clientInfo && (
            <div className="flex flex-col gap-4 p-4">
              {/* Contact info */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                  style={{ backgroundColor: avatarColor(selectedPhone) }}>
                  {getInitials(selectedConv?.displayName || null, selectedPhone)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {isRealName(selectedConv?.displayName ?? null)
                      ? selectedConv!.displayName
                      : (clientInfo.leads[0] && clientInfo.leads[0].first_name !== 'Client'
                        ? `${clientInfo.leads[0].first_name} ${clientInfo.leads[0].last_name}`
                        : 'Nouveau contact')}
                  </p>
                  {editingPhone ? (
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        autoFocus
                        value={editPhoneValue}
                        onChange={e => setEditPhoneValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSavePhone(); if (e.key === 'Escape') setEditingPhone(false); }}
                        placeholder="0612345678 ou +33612345678"
                        className="text-xs border border-teal-400 rounded px-2 py-0.5 w-40 outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      <button onClick={handleSavePhone} disabled={savingPhone} className="text-teal-600 hover:text-teal-800 disabled:opacity-40">
                        {savingPhone ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setEditingPhone(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 group">
                      <p className="text-xs text-gray-500">
                        {selectedPhone.startsWith('lid:')
                          ? <span className="text-gray-400 italic">Numéro non renseigné</span>
                          : formatPhone(selectedPhone)}
                      </p>
                      <button
                        onClick={() => { setEditPhoneValue(''); setEditingPhone(true); }}
                        className="text-gray-400 hover:text-teal-600 transition-colors"
                        title={selectedPhone.startsWith('lid:') ? 'Ajouter le numéro de téléphone' : 'Modifier le numéro'}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Recherche manuelle pour lier */}
              <div className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-gray-600">Rechercher un dossier / lead</span>
                </div>
                <div className="relative">
                  <input
                    value={linkSearch}
                    onChange={e => handleLinkSearch(e.target.value)}
                    placeholder="Nom, prénom, référence..."
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 pr-8 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                  />
                  {linkSearching && <Loader2 className="w-3 h-3 animate-spin absolute right-2.5 top-2.5 text-gray-400" />}
                  {!linkSearching && linkSearch && (
                    <button onClick={() => { setLinkSearch(''); setLinkSearchResults([]); }} className="absolute right-2.5 top-2.5 text-gray-300 hover:text-gray-500">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {linkSearchResults.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {linkSearchResults.map(s => (
                      <div key={s.id} className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-100 px-2.5 py-2">
                        {s.type === 'dossier' ? <FolderOpen className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> : <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">{s.label}</p>
                          <p className="text-[10px] text-gray-400 truncate">{s.subLabel}</p>
                        </div>
                        <button
                          onClick={() => { handleLinkSuggestion(s); setLinkSearch(''); setLinkSearchResults([]); }}
                          disabled={linkingId === s.id}
                          className="flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-md text-white transition-colors disabled:opacity-50"
                          style={{ backgroundColor: WA_DARK }}
                        >
                          {linkingId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Lier'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {linkSearch.length >= 2 && !linkSearching && linkSearchResults.length === 0 && (
                  <p className="text-[10px] text-gray-400 mt-2 text-center">Aucun résultat</p>
                )}
              </div>

              {/* Suggestions par nom */}
              {!clientInfo.isKnown && (clientInfo.nameSuggestions ?? []).length > 0 && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-blue-800">Rapprochement possible</span>
                  </div>
                  <p className="text-xs text-blue-700 mb-2">Ce contact ressemble à :</p>
                  <div className="flex flex-col gap-2">
                    {(clientInfo.nameSuggestions ?? []).map(s => (
                      <div key={s.id} className="flex items-center gap-2 bg-white rounded-lg border border-blue-100 px-2.5 py-2">
                        {s.type === 'dossier' ? <FolderOpen className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> : <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">{s.label}</p>
                          <p className="text-[10px] text-gray-400 truncate">{s.subLabel}</p>
                        </div>
                        <button
                          onClick={() => handleLinkSuggestion(s)}
                          disabled={linkingId === s.id}
                          className="flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-md text-white transition-colors disabled:opacity-50"
                          style={{ backgroundColor: WA_DARK }}
                        >
                          {linkingId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Lier'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nouveau contact */}
              {!clientInfo.isKnown && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-amber-800">Nouveau contact</span>
                  </div>
                  <p className="text-xs text-amber-700 mb-3">Ce numéro n&apos;est pas encore dans le CRM.</p>
                  <button
                    onClick={handleCreateLead}
                    disabled={creatingLead}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: WA_DARK }}
                  >
                    {creatingLead ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    Créer un lead
                  </button>
                </div>
              )}

              {/* Progressive lead form */}
              {clientInfo.leads.length > 0 && clientInfo.leads[0].crm_status === 'nouveau' && (() => {
                const lead = clientInfo.leads[0];
                const fields = [
                  { key: 'first_name', label: 'Prénom', value: lead.first_name !== 'Client' ? lead.first_name : null, dbKey: 'first_name' },
                  { key: 'last_name', label: 'Nom', value: lead.last_name !== 'WhatsApp' ? lead.last_name : null, dbKey: 'last_name' },
                  { key: 'phone', label: 'Téléphone', value: selectedPhone.startsWith('lid:') ? null : formatPhone(selectedPhone), dbKey: null, readOnly: true, placeholder: 'Non renseigné' },
                  { key: 'event', label: 'Événement', value: lead.events?.name || null, dbKey: 'event_id', readOnly: false },
                  { key: 'travelers', label: 'Voyageurs', value: lead.adults_count > 1 || lead.children_count > 0 || lead.babies_count > 0
                    ? `${lead.adults_count} ad.${lead.children_count ? ` ${lead.children_count} enf.` : ''}${lead.babies_count ? ` ${lead.babies_count} bb.` : ''}`
                    : null, dbKey: null, readOnly: true },
                ];

                return (
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Fiche en cours</span>
                      {Object.keys(pendingExtraction).length > 0 && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                          {Object.keys(pendingExtraction).filter(k => !['event_id','sejour_start','sejour_end','notes'].includes(k)).length} détecté{Object.keys(pendingExtraction).length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-gray-100">
                      {fields.map(({ key, label, value, dbKey, readOnly }) => {
                        const pendingVal = pendingExtraction[key] ?? (key === 'event' ? pendingExtraction.event_name_detected : undefined);
                        const hasPending = pendingVal !== undefined && String(pendingVal) !== value;
                        const isValidated = validatedFields.has(key);
                        const isEditing = editingField === key;

                        return (
                          <div key={key} className={`px-3 py-2 ${hasPending ? 'bg-amber-50' : ''}`}>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-gray-400 w-18 flex-shrink-0">{label}</span>

                              {isEditing ? (
                                <div className="flex-1 flex items-center gap-1">
                                  <input
                                    autoFocus
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    onKeyDown={async e => {
                                      if (e.key === 'Escape') { setEditingField(null); return; }
                                      if (e.key === 'Enter' && dbKey) {
                                        setValidatingField(key);
                                        await fetch('/api/whatsapp/client-info', {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ leadId: lead.id, [dbKey]: editValue }),
                                        });
                                        setValidatedFields(prev => new Set([...prev, key]));
                                        setEditingField(null);
                                        await loadClientInfo(selectedPhone);
                                        setValidatingField(null);
                                      }
                                    }}
                                    className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-teal-500"
                                    placeholder={`Saisir ${label.toLowerCase()}...`}
                                  />
                                  <button
                                    onClick={async () => {
                                      if (!dbKey) { setEditingField(null); return; }
                                      setValidatingField(key);
                                      await fetch('/api/whatsapp/client-info', {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ leadId: lead.id, [dbKey]: editValue }),
                                      });
                                      setValidatedFields(prev => new Set([...prev, key]));
                                      setEditingField(null);
                                      await loadClientInfo(selectedPhone);
                                      setValidatingField(null);
                                    }}
                                    className="w-5 h-5 rounded bg-teal-600 text-white flex items-center justify-center flex-shrink-0"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setEditingField(null)}
                                    className="w-5 h-5 rounded bg-gray-200 text-gray-500 flex items-center justify-center flex-shrink-0"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span className={`text-xs flex-1 ${hasPending ? 'text-amber-800 font-medium' : value ? (isValidated ? 'text-green-700 font-medium' : 'text-gray-900') : 'text-gray-300 italic'}`}>
                                    {hasPending ? String(pendingVal) : (value || '—')}
                                  </span>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {isValidated && !hasPending && (
                                      <Check className="w-3 h-3 text-green-500" />
                                    )}
                                    {hasPending && (
                                      <>
                                        <button
                                          onClick={async () => {
                                            if (validatingField) return;
                                            setValidatingField(key);
                                            const update: Record<string, unknown> = {};
                                            if (key === 'first_name') update.first_name = pendingVal;
                                            if (key === 'last_name') update.last_name = pendingVal;
                                            if (key === 'event') update.event_id = pendingExtraction.event_id;
                                            if (key === 'travelers') {
                                              update.adults_count = pendingExtraction.adults_count;
                                              update.children_count = pendingExtraction.children_count ?? 0;
                                              update.babies_count = pendingExtraction.babies_count ?? 0;
                                            }
                                            await fetch('/api/whatsapp/client-info', {
                                              method: 'PATCH',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ leadId: lead.id, ...update }),
                                            });
                                            setValidatedFields(prev => new Set([...prev, key]));
                                            setPendingExtraction(prev => {
                                              const n = { ...prev };
                                              delete n[key]; delete n.event_name_detected; delete n.event_id;
                                              return n;
                                            });
                                            await loadClientInfo(selectedPhone);
                                            setValidatingField(null);
                                          }}
                                          disabled={!!validatingField}
                                          className="w-5 h-5 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center"
                                          title="Valider"
                                        >
                                          {validatingField === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                        </button>
                                        <button
                                          onClick={() => setPendingExtraction(prev => { const n = { ...prev }; delete n[key]; return n; })}
                                          className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 flex items-center justify-center"
                                          title="Ignorer"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </>
                                    )}
                                    {!hasPending && !readOnly && key === 'event' && value && (
                                      <button
                                        onClick={async () => {
                                          await fetch('/api/whatsapp/client-info', {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ leadId: lead.id, event_id: null }),
                                          });
                                          await loadClientInfo(selectedPhone!);
                                        }}
                                        className="w-5 h-5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center"
                                        title="Effacer l'événement"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                    {!hasPending && !readOnly && key !== 'event' && (
                                      <button
                                        onClick={() => { setEditingField(key); setEditValue(value || ''); }}
                                        className="w-5 h-5 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center"
                                        title="Modifier"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Leads */}
              {clientInfo.leads.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Lead{clientInfo.leads.length > 1 ? 's' : ''}</p>
                  <div className="flex flex-col gap-2">
                    {clientInfo.leads.map(lead => (
                      <a
                        key={lead.id}
                        href={`/dashboard/leads/${lead.id}/modifier`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors group"
                      >
                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{lead.first_name} {lead.last_name}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {lead.events?.name || 'Sans événement'} · {lead.adults_count}ad{lead.children_count > 0 ? ` ${lead.children_count}enf` : ''}{lead.babies_count > 0 ? ` ${lead.babies_count}bb` : ''}
                          </p>
                        </div>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                          lead.crm_status === 'nouveau' ? 'bg-blue-100 text-blue-700' :
                          lead.crm_status === 'en_cours' ? 'bg-amber-100 text-amber-700' :
                          lead.crm_status === 'converti' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>{lead.crm_status}</span>
                        <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Dossiers */}
              {clientInfo.dossiers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Dossier{clientInfo.dossiers.length > 1 ? 's' : ''} ({clientInfo.dossiers.length})
                  </p>
                  <div className="flex flex-col gap-2">
                    {clientInfo.dossiers.map(dos => (
                      <div key={dos.id} className="rounded-lg border border-gray-100 overflow-hidden">
                        <a
                          href={`/dashboard/dossiers/${dos.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2.5 hover:bg-gray-50 transition-colors group"
                        >
                          <FolderOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {dos.primary_contact_first_name} {dos.primary_contact_last_name}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {dos.events?.name || '—'}
                              {dos.events?.start_date ? ` · ${new Date(dos.events.start_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}` : ''}
                            </p>
                            {dos.quoted_price && (
                              <p className="text-xs text-gray-500">
                                {dos.amount_paid != null ? `${dos.amount_paid.toLocaleString('fr-FR')} / ` : ''}{dos.quoted_price.toLocaleString('fr-FR')} €
                              </p>
                            )}
                          </div>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                            dos.crm_status === 'confirme' ? 'bg-green-100 text-green-700' :
                            dos.crm_status === 'en_attente' ? 'bg-amber-100 text-amber-700' :
                            dos.crm_status === 'annule' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>{dos.crm_status}</span>
                          <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                        </a>
                        {/* AI detect button */}
                        <div className="border-t border-gray-100 px-2.5 py-2">
                          <button
                            onClick={() => {
                              if (dossierExtraction) { setDossierExtraction(null); setDossierFieldSelection(new Set()); }
                              else handleExtractDossier(dos.id);
                            }}
                            disabled={extractingDossier}
                            className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded-md py-1.5 transition-colors disabled:opacity-50"
                          >
                            {extractingDossier ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            {dossierExtraction ? 'Fermer la détection' : 'Détecter les infos depuis la conversation'}
                          </button>
                        </div>

                        {/* AI extraction results panel */}
                        {dossierExtraction && (
                          <div className="border-t border-teal-100 bg-teal-50 p-3">
                            {dossierExtractionError && (
                              <p className="text-xs text-red-600 mb-2">{dossierExtractionError}</p>
                            )}
                            <p className="text-[11px] font-semibold text-teal-800 mb-2">Infos détectées — coche ce que tu veux appliquer :</p>
                            <div className="flex flex-col gap-1.5">
                              {Object.entries(dossierExtraction).map(([key, val]) => {
                                const label: Record<string, string> = {
                                  first_name: 'Prénom', last_name: 'Nom',
                                  arrival_date: 'Date arrivée', departure_date: 'Date départ',
                                  adults_count: 'Adultes', children_count: 'Enfants', babies_count: 'Bébés',
                                  children_ages: 'Âges enfants', flight_inbound: 'Vol arrivée',
                                  flight_outbound: 'Vol départ', room_type_name: 'Chambre',
                                  room_type_id: null as unknown as string,
                                  nb_chambres: 'Nb chambres', budget: 'Budget (€)',
                                  event_name: 'Événement', event_id: null as unknown as string,
                                  notes: 'Notes',
                                };
                                if (!label[key]) return null; // skip hidden keys (ids)
                                const isChecked = dossierFieldSelection.has(key);
                                const displayVal = Array.isArray(val) ? val.join(', ') + ' ans' : String(val);
                                return (
                                  <label key={key} className="flex items-start gap-2 cursor-pointer group">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={e => {
                                        setDossierFieldSelection(prev => {
                                          const n = new Set(prev);
                                          if (e.target.checked) {
                                            n.add(key);
                                            // if checking room_type_name, also check room_type_id
                                            if (key === 'room_type_name' && dossierExtraction.room_type_id) n.add('room_type_id');
                                            if (key === 'event_name' && dossierExtraction.event_id) n.add('event_id');
                                          } else {
                                            n.delete(key);
                                            if (key === 'room_type_name') n.delete('room_type_id');
                                            if (key === 'event_name') n.delete('event_id');
                                          }
                                          return n;
                                        });
                                      }}
                                      className="mt-0.5 accent-teal-600 flex-shrink-0"
                                    />
                                    <div className="min-w-0">
                                      <span className="text-[10px] text-teal-700 font-medium">{label[key]}</span>
                                      <p className="text-xs text-gray-800 break-words leading-tight">{displayVal}</p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                            <button
                              onClick={() => handleApplyDossierExtraction(dos.id)}
                              disabled={applyingDossier || dossierFieldSelection.size === 0}
                              className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50"
                              style={{ backgroundColor: WA_DARK }}
                            >
                              {applyingDossier ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              Appliquer {dossierFieldSelection.size > 0 ? `(${dossierFieldSelection.size} champs)` : ''}
                            </button>
                          </div>
                        )}
                        {dossierExtractionError && !dossierExtraction && (
                          <p className="text-[10px] text-red-500 px-2.5 pb-2">{dossierExtractionError}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {clientInfo.isKnown && clientInfo.leads.length === 0 && clientInfo.dossiers.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Aucun enregistrement trouvé</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── chat area ── */}
      <div className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: WA_BG }}>
        {selectedPhone ? (
          <>
            {/* chat header */}
            <div className="flex items-center gap-3 px-4 h-[60px] flex-shrink-0 shadow-sm" style={{ backgroundColor: WA_DARK }}>
              <button
                onClick={() => setClientPanel(p => !p)}
                className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold text-xs select-none hover:opacity-80 transition-opacity"
                style={{ backgroundColor: avatarColor(selectedPhone) }}
                title="Voir la fiche client"
              >
                {getInitials(selectedConv?.displayName || null, selectedPhone)}
              </button>
              <button
                onClick={() => setClientPanel(p => !p)}
                className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                title="Voir la fiche client"
              >
                <p className="text-white font-semibold text-sm truncate">
                  {isRealName(selectedConv?.displayName ?? null) ? selectedConv!.displayName : formatPhone(selectedPhone, selectedConv?.displayName)}
                  {clientInfo && !clientInfo.isKnown && !clientInfoLoading && (
                    <span className="ml-2 text-xs font-normal opacity-70">· Nouveau contact</span>
                  )}
                  {clientInfo?.isKnown && (
                    <span className="ml-2 text-xs font-normal opacity-60">
                      · {clientInfo.dossiers.length > 0 ? `${clientInfo.dossiers.length} dossier${clientInfo.dossiers.length > 1 ? 's' : ''}` : 'Lead'}
                    </span>
                  )}
                </p>
                {selectedConv?.displayName && (
                  <p className="text-xs truncate" style={{ color: '#b2dfdb' }}>{formatPhone(selectedPhone)}</p>
                )}
              </button>
              <button
                onClick={() => setClientPanel(p => !p)}
                className="text-white opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
                title="Fiche client"
              >
                <User className="w-4 h-4" />
              </button>
            </div>

            {/* unknown contact banner */}
            {clientInfo && !clientInfo.isKnown && !clientInfoLoading && (
              <div className="flex-shrink-0 mx-4 mt-3 mb-1 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="text-sm text-amber-800 flex-1">Nouveau contact — pas encore dans le CRM</span>
                <button
                  onClick={() => { setClientPanel(true); }}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline whitespace-nowrap"
                >
                  Créer un lead →
                </button>
              </div>
            )}

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
                      className={'max-w-[65%] shadow-sm text-sm ' + (msg.id.startsWith('opt_') ? 'opacity-60' : '')}
                      style={{
                        backgroundColor: msg.direction === 'outbound' ? WA_BUBBLE : '#ffffff',
                        borderRadius: msg.direction === 'outbound' ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                      }}
                    >
                      {msg.message_type === 'document' ? (
                        <a
                          href={msg.metadata?.media_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-3 py-2.5 hover:opacity-80 transition-opacity"
                        >
                          <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-gray-900 font-medium text-xs break-all leading-tight">{msg.message_content}</p>
                            <p className="text-gray-400 text-[10px] mt-0.5">PDF · Appuyer pour ouvrir</p>
                          </div>
                        </a>
                      ) : msg.message_type === 'image' ? (
                        <div>
                          {msg.metadata?.media_url ? (
                            <a href={msg.metadata.media_url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={msg.metadata.media_url}
                                alt="Photo"
                                className="rounded-t-[6px] max-w-full block"
                                style={{ maxHeight: 260, objectFit: 'cover', width: '100%' }}
                              />
                            </a>
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-2 text-gray-400">
                              <ImageIcon className="w-5 h-5" />
                              <span className="text-xs">Photo</span>
                            </div>
                          )}
                          {msg.metadata?.ocr && (() => {
                            const ocr = msg.metadata.ocr as OcrResult;
                            const icons: Record<string, string> = {
                              flight_ticket: '✈️', passport: '🛂', id_card: '🪪',
                              hotel_voucher: '🏨', invoice: '🧾', unknown: '📄',
                            };
                            const labels: Record<string, string> = {
                              flight_ticket: 'Billet d\'avion', passport: 'Passeport', id_card: 'Carte d\'identité',
                              hotel_voucher: 'Bon hôtel', invoice: 'Facture', unknown: 'Document',
                            };
                            return (
                              <div className="mx-2 mb-2 mt-1.5 rounded-lg bg-blue-50 border border-blue-100 p-2.5">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <span className="text-sm">{icons[ocr.document_type] || '📄'}</span>
                                  <span className="text-[11px] font-bold text-blue-800">{labels[ocr.document_type] || 'Document'} détecté</span>
                                  <span className={`ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                                    ocr.confidence === 'high' ? 'bg-green-100 text-green-700' :
                                    ocr.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                                    'bg-gray-100 text-gray-500'
                                  }`}>{ocr.confidence === 'high' ? 'Fiable' : ocr.confidence === 'medium' ? 'Probable' : 'Incertain'}</span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  {ocr.passenger_name && <p className="text-[11px] text-gray-700"><span className="text-gray-400">Passager</span> {ocr.passenger_name}</p>}
                                  {ocr.flight_number && <p className="text-[11px] text-gray-700"><span className="text-gray-400">Vol</span> {ocr.flight_number}</p>}
                                  {ocr.flight_date && <p className="text-[11px] text-gray-700"><span className="text-gray-400">Date</span> {new Date(ocr.flight_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                                  {(ocr.departure_airport || ocr.arrival_airport) && (
                                    <p className="text-[11px] text-gray-700">
                                      <span className="text-gray-400">Trajet</span>{' '}
                                      {ocr.departure_airport || '?'} → {ocr.arrival_airport || '?'}
                                    </p>
                                  )}
                                  {(ocr.departure_time || ocr.arrival_time) && (
                                    <p className="text-[11px] text-gray-700">
                                      <span className="text-gray-400">Horaires</span>{' '}
                                      {ocr.departure_time || '—'} → {ocr.arrival_time || '—'}
                                    </p>
                                  )}
                                  {ocr.booking_reference && <p className="text-[11px] text-gray-700"><span className="text-gray-400">Réf.</span> {ocr.booking_reference}</p>}
                                  {ocr.seat && <p className="text-[11px] text-gray-700"><span className="text-gray-400">Siège</span> {ocr.seat}</p>}
                                  {ocr.cabin_class && <p className="text-[11px] text-gray-700"><span className="text-gray-400">Cabine</span> {ocr.cabin_class}</p>}
                                  {/* Passeport / CI */}
                                  {ocr.doc_number && <p className="text-[11px] text-gray-700"><span className="text-gray-400">N° doc.</span> {ocr.doc_number}</p>}
                                  {ocr.nationality && <p className="text-[11px] text-gray-700"><span className="text-gray-400">Nationalité</span> {ocr.nationality}</p>}
                                  {ocr.date_of_birth && <p className="text-[11px] text-gray-700"><span className="text-gray-400">Naissance</span> {new Date(ocr.date_of_birth).toLocaleDateString('fr-FR')}</p>}
                                  {ocr.expiry_date && <p className="text-[11px] text-gray-700"><span className="text-gray-400">Expiration</span> {new Date(ocr.expiry_date).toLocaleDateString('fr-FR')}</p>}
                                  {ocr.summary && !ocr.passenger_name && !ocr.flight_number && !ocr.doc_number && (
                                    <p className="text-[11px] text-gray-600 italic">{ocr.summary}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                          {msg.message_content && msg.message_content !== 'image' && (
                            <p className="px-3 py-1.5 text-gray-700 text-sm break-words whitespace-pre-wrap">{msg.message_content}</p>
                          )}
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
                            // Save as approved example for future learning (fire & forget)
                            fetch('/api/whatsapp/ai-suggest', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                phoneNumber: selectedPhone,
                                contactName: selectedConv?.displayName,
                                action: 'approve',
                                approvedResponse: text,
                              }),
                            }).catch(() => {});
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
              {templateError && (
                <div className="mb-2 flex items-start gap-2 text-xs text-orange-800 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                  <span className="text-orange-500 mt-0.5 flex-shrink-0">⚠️</span>
                  <span className="flex-1">{templateError}</span>
                  <button onClick={() => setTemplateError(null)} className="text-orange-400 hover:text-orange-600 ml-1 flex-shrink-0">
                    <X className="w-3 h-3" />
                  </button>
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
              {/* Templates panel */}
              {showTemplates && (
                <div className="flex-shrink-0 border-t border-gray-200 bg-white">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-600">Templates de message</span>
                    <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="p-3 max-h-52 overflow-y-auto">
                    {templatesLoading || resolvingTemplate ? (
                      <div className="flex items-center justify-center h-16 gap-2 text-gray-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs">{resolvingTemplate ? 'Remplissage des variables...' : 'Chargement...'}</span>
                      </div>
                    ) : templates.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">Aucun template — crée-en dans Réglages → Templates</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {templates.map(t => (
                          <button key={t.id} onClick={() => handleInsertTemplate(t.id)}
                            className="text-left px-3 py-2.5 rounded-lg border border-gray-100 hover:border-teal-300 hover:bg-teal-50 transition-colors group">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-gray-900">{t.name}</span>
                              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{t.category}</span>
                            </div>
                            <p className="text-[11px] text-gray-400 line-clamp-2">{t.content.slice(0, 100)}...</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Médiathèque panel */}
              {showMediaLib && (
                <div className="flex-shrink-0 border-t border-gray-200 bg-white">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      {mediaFolder && (
                        <button onClick={() => loadMediaLibrary('')} className="text-gray-400 hover:text-gray-600 text-xs">← Retour</button>
                      )}
                      <span className="text-xs font-semibold text-gray-600">{mediaFolder || 'Médiathèque'}</span>
                    </div>
                    <button onClick={() => setShowMediaLib(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="p-3 max-h-52 overflow-y-auto">
                    {mediaLoading ? (
                      <div className="flex items-center justify-center h-20"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                    ) : (
                      <>
                        {/* Sous-dossiers */}
                        {!mediaFolder && mediaFolders.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {mediaFolders.map(f => (
                              <button key={f} onClick={() => loadMediaLibrary(f)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors">
                                📁 {f}
                              </button>
                            ))}
                          </div>
                        )}
                        {/* Fichiers */}
                        {mediaFiles.length > 0 ? (
                          <div className="grid grid-cols-4 gap-2">
                            {mediaFiles.map(f => (
                              <button key={f.path} onClick={() => handleSendFromLibrary(f)}
                                disabled={sendingMedia === f.url}
                                className="relative group rounded-lg overflow-hidden border border-gray-200 hover:border-teal-400 transition-colors aspect-square bg-gray-50 disabled:opacity-50">
                                {f.type === 'video' ? (
                                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                    <Video className="w-6 h-6 text-white" />
                                    <span className="absolute bottom-1 left-1 right-1 text-[9px] text-white truncate bg-black/50 px-1 rounded">{f.name}</span>
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
                                <div className="absolute inset-0 bg-teal-600/0 group-hover:bg-teal-600/10 transition-colors" />
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
                <button
                  onClick={() => { setShowMediaLib(false); if (!showTemplates) loadTemplates(); else setShowTemplates(false); }}
                  disabled={sending || uploading}
                  title="Templates"
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors shadow-sm ${showTemplates ? 'bg-orange-100 text-orange-700' : 'bg-white hover:bg-gray-100 text-gray-500'}`}
                >
                  <FileText className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setShowTemplates(false); if (!showMediaLib) loadMediaLibrary(''); setShowMediaLib(p => !p); }}
                  disabled={sending || uploading}
                  title="Médiathèque"
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors shadow-sm ${showMediaLib ? 'bg-teal-100 text-teal-700' : 'bg-white hover:bg-gray-100 text-gray-500'}`}
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <textarea
                  value={replyText}
                  onChange={e => {
                    setReplyText(e.target.value);
                    if (templateError && !/{{[\w]+}}/.test(e.target.value)) setTemplateError(null);
                  }}
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
                  disabled={!replyText.trim() || sending || uploading || !!templateError}
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors text-white disabled:opacity-40 shadow-sm"
                  style={{ backgroundColor: WA_DARK }}
                  title={templateError ? 'Complète les variables avant d\'envoyer' : 'Envoyer (Entree)'}
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
