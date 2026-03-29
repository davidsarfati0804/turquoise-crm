'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface WhatsAppMessage {
  id: string;
  wa_phone_number: string;
  message_content: string;
  direction: 'inbound' | 'outbound';
  delivery_status: string;
  created_at: string;
}

interface WhatsAppConversation {
  id: string;
  wa_phone_number: string;
  lead_id?: string;
  client_file_id?: string;
  last_message_at: string;
  message_count: number;
  unread_count: number;
  status: string;
}

interface ResponseTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
}

export function WhatsAppInbox() {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [responseText, setResponseText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.wa_phone_number);
      loadTemplates();
    }
  }, [selectedConversation]);

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!selectedConversation) return;

    const subscription = supabase
      .channel(`whatsapp:${selectedConversation.wa_phone_number}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `wa_phone_number=eq.${selectedConversation.wa_phone_number}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as WhatsAppMessage]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('status', 'active')
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (phoneNumber: string) => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('wa_phone_number', phoneNumber)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark as read
      await supabase
        .from('whatsapp_conversations')
        .update({ unread_count: 0 })
        .eq('wa_phone_number', phoneNumber);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_response_templates')
        .select('*')
        .eq('active', true)
        .order('category', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation || !responseText.trim()) return;

    setSending(true);
    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: selectedConversation.wa_phone_number,
          message: responseText,
          leadId: selectedConversation.lead_id,
          clientFileId: selectedConversation.client_file_id,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      setResponseText('');
      // Messages will be loaded via real-time subscription
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Erreur lors de l\'envoi du message');
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (template: ResponseTemplate) => {
    setResponseText(template.content);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Chargement des conversations...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4">
      {/* Conversations List */}
      <div className="w-80 border-r overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Messages WhatsApp</h2>
          <p className="text-sm text-gray-500">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>

        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            Aucune conversation pour le moment
          </div>
        ) : (
          <div className="divide-y">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition ${
                  selectedConversation?.id === conv.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">+{conv.wa_phone_number}</span>
                  {conv.unread_count > 0 && (
                    <Badge variant="default">{conv.unread_count}</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(conv.last_message_at), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat View */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b">
              <h3 className="font-semibold">+{selectedConversation.wa_phone_number}</h3>
              <p className="text-xs text-gray-500">
                {selectedConversation.message_count} message
                {selectedConversation.message_count !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  Aucun message
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.direction === 'inbound' ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.direction === 'inbound'
                          ? 'bg-white border'
                          : 'bg-blue-500 text-white'
                      }`}
                    >
                      <p className="text-sm">{msg.message_content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.direction === 'inbound'
                            ? 'text-gray-500'
                            : 'text-blue-100'
                        }`}
                      >
                        {formatDistanceToNow(new Date(msg.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Templates */}
            {templates.length > 0 && (
              <div className="border-t p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase">
                  Réponses rapides
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {templates.map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate(template)}
                      className="text-xs h-auto py-1"
                    >
                      {template.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="border-t p-4 space-y-3">
              <Textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Écrivez votre réponse..."
                className="text-sm resize-none"
                rows={3}
              />
              <Button
                onClick={sendMessage}
                disabled={!responseText.trim() || sending}
                className="w-full"
              >
                {sending ? 'Envoi...' : 'Envoyer'}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Sélectionnez une conversation pour répondre
          </div>
        )}
      </div>
    </div>
  );
}
