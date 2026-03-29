'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WhatsAppMessage {
  id: string;
  wa_phone_number: string;
  wa_display_name: string | null;
  message_content: string;
  direction: 'inbound' | 'outbound';
  delivery_status: string;
  created_at: string;
}

interface Conversation {
  phone: string;
  displayName: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export function WhatsAppInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load all messages and group by phone number into conversations
  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('wa_phone_number, wa_display_name, message_content, direction, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading messages:', error);
      setLoading(false);
      return;
    }

    // Group by phone number (first occurrence = most recent due to DESC order)
    const convMap = new Map<string, Conversation>();
    for (const msg of data || []) {
      if (!convMap.has(msg.wa_phone_number)) {
        convMap.set(msg.wa_phone_number, {
          phone: msg.wa_phone_number,
          displayName: msg.wa_display_name,
          lastMessage: msg.message_content,
          lastMessageAt: msg.created_at,
          unreadCount: 0,
        });
      }
    }

    setConversations(Array.from(convMap.values()));
    setLoading(false);
  };

  useEffect(() => {
    loadConversations();

    // Subscribe to refresh conversation list on new messages
    const supabaseClient = createClient();
    const channel = supabaseClient
      .channel('whatsapp_inbox_all')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Load messages for selected conversation
  const loadMessages = async (phone: string) => {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('wa_phone_number', phone)
      .order('created_at', { ascending: true });

    if (!error) {
      setMessages(data || []);
    }
  };

  useEffect(() => {
    if (!selectedPhone) return;
    loadMessages(selectedPhone);

    const supabaseClient = createClient();
    const channel = supabaseClient
      .channel(`whatsapp_conv_${selectedPhone}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `wa_phone_number=eq.${selectedPhone}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as WhatsAppMessage]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedPhone]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedPhone) return;

    setSending(true);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: selectedPhone,
          message: replyText,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setReplyText('');
      } else {
        alert('Erreur: ' + (result.error || 'Envoi impossible'));
      }
    } catch {
      alert('Erreur de connexion');
    } finally {
      setSending(false);
    }
  };

  const selectedConv = conversations.find((c) => c.phone === selectedPhone);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className="w-80 border-r bg-white flex flex-col">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-500" />
            Conversations
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {conversations.length} contact{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">
              Aucun message reçu
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.phone}
                onClick={() => setSelectedPhone(conv.phone)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                  selectedPhone === conv.phone
                    ? 'bg-green-50 border-r-2 border-green-500'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-gray-900 truncate">
                    {conv.displayName || `+${conv.phone}`}
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate">{conv.lastMessage}</p>
                <p className="text-xs text-gray-300 mt-0.5">
                  {formatDistanceToNow(new Date(conv.lastMessageAt), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedPhone ? (
          <>
            {/* Header */}
            <div className="p-4 bg-white border-b shadow-sm">
              <p className="font-semibold text-gray-900">
                {selectedConv?.displayName || `+${selectedPhone}`}
              </p>
              <p className="text-xs text-gray-400">+{selectedPhone}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-sm px-4 py-2 rounded-2xl text-sm shadow-sm ${
                      msg.direction === 'outbound'
                        ? 'bg-green-500 text-white rounded-br-sm'
                        : 'bg-white text-gray-900 rounded-bl-sm border'
                    }`}
                  >
                    <p>{msg.message_content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.direction === 'outbound'
                          ? 'text-green-100'
                          : 'text-gray-400'
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t p-4">
              <form onSubmit={handleSend} className="flex gap-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e as any);
                    }
                  }}
                  placeholder="Tapez votre message... (Entrée pour envoyer)"
                  rows={2}
                  disabled={sending}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sending}
                  className="px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
            <p>Sélectionnez une conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}
