import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { localDb, type LocalOutboxMessage } from '../lib/db';
import type { Message, ChatType } from '../types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseChatOptions {
  chatId: string | null;
  chatType: ChatType | null;
  currentUserId: string | null;
  playSendSound: () => void;
  playReceiveSound: (force?: boolean) => void;
}

export function useChat({
  chatId,
  chatType,
  currentUserId,
  playSendSound,
  playReceiveSound,
}: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isFlushingOutbox, setIsFlushingOutbox] = useState<boolean>(false);

  const activeChatRef = useRef<{ id: string | null; type: ChatType | null }>({
    id: chatId,
    type: chatType,
  });

  useEffect(() => {
    activeChatRef.current = { id: chatId, type: chatType };
  }, [chatId, chatType]);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      flushOutbox();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Flush offline outbox queue
  const flushOutbox = useCallback(async () => {
    if (!isConfigured || !navigator.onLine) return;
    setIsFlushingOutbox(true);

    try {
      const queued = await localDb.outbox.orderBy('created_at').toArray();
      for (const item of queued) {
        try {
          const { error } = await supabase.from('messages').insert({
            chat_id: item.chat_id,
            chat_type: item.chat_type,
            sender_id: item.sender_id,
            body: item.body,
            client_id: item.client_id,
            created_at: item.created_at,
          });

          if (!error || error.code === '23505') {
            // Success or duplicate already recorded
            await localDb.outbox.delete(item.client_id);
            // Update local message status
            setMessages((prev) =>
              prev.map((m) =>
                m.client_id === item.client_id ? { ...m, status: 'sent' } : m
              )
            );
          } else {
            console.error('Failed to flush message:', error);
            await localDb.outbox.update(item.client_id, {
              status: 'failed',
              last_error: error.message,
              retry_count: item.retry_count + 1,
            });
          }
        } catch (err: unknown) {
          console.error('Network error during outbox flush:', err);
          break; // Stop flushing until connection is fully stable
        }
      }
    } finally {
      setIsFlushingOutbox(false);
    }
  }, []);

  // Load cached messages and fetch remote
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    // 1. Read IndexedDB cache immediately
    const loadCache = async () => {
      try {
        const cached = await localDb.messages
          .where('chat_id')
          .equals(chatId)
          .sortBy('created_at');

        // Also check if there are pending outbox messages for this chat
        const outboxItems = await localDb.outbox
          .where('chat_id')
          .equals(chatId)
          .toArray();

        const pendingMessages: Message[] = outboxItems.map((o) => ({
          id: o.client_id,
          chat_id: o.chat_id,
          chat_type: o.chat_type,
          sender_id: o.sender_id,
          body: o.body,
          client_id: o.client_id,
          created_at: o.created_at,
          status: o.status,
        }));

        if (isMounted) {
          const combined = [...cached, ...pendingMessages].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          setMessages(combined);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Error reading from IndexedDB:', err);
      }
    };

    loadCache();

    if (!isConfigured) {
      setLoading(false);
      return;
    }

    // 2. Fetch fresh messages from Supabase
    const fetchRemote = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*, sender:profiles(id, username, avatar_url)')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) {
          console.error('Error fetching messages:', error);
          return;
        }

        if (data && isMounted) {
          // Persist remote messages to IndexedDB
          await localDb.messages.bulkPut(
            data.map((m) => ({
              ...m,
              status: 'sent',
            }))
          );

          // Merge with any still-queued outbox items
          const outboxItems = await localDb.outbox
            .where('chat_id')
            .equals(chatId)
            .toArray();

          const pendingMessages: Message[] = outboxItems.map((o) => ({
            id: o.client_id,
            chat_id: o.chat_id,
            chat_type: o.chat_type,
            sender_id: o.sender_id,
            body: o.body,
            client_id: o.client_id,
            created_at: o.created_at,
            status: o.status,
          }));

          const all = [...data, ...pendingMessages].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          setMessages(all);
        }
      } catch (err) {
        console.warn('Network error fetching messages:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRemote();

    // 3. Supabase Realtime Subscription
    let channel: RealtimeChannel | null = null;
    try {
      channel = supabase
        .channel(`messages:${chatId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`,
          },
          async (payload) => {
            const newMsg = payload.new as Message;

            // Fetch sender profile if not already included
            if (!newMsg.sender && newMsg.sender_id) {
              const { data: senderData } = await supabase
                .from('profiles')
                .select('id, username, avatar_url')
                .eq('id', newMsg.sender_id)
                .maybeSingle();
              if (senderData) {
                newMsg.sender = senderData;
              }
            }

            // Save to IndexedDB
            await localDb.messages.put({
              ...newMsg,
              status: 'sent',
            });

            // Update UI state
            setMessages((prev) => {
              // Deduplicate if client_id exists
              const existingIndex = prev.findIndex(
                (m) =>
                  (newMsg.client_id && m.client_id === newMsg.client_id) ||
                  m.id === newMsg.id
              );
              if (existingIndex !== -1) {
                const next = [...prev];
                next[existingIndex] = { ...newMsg, status: 'sent' };
                return next;
              }
              return [...prev, { ...newMsg, status: 'sent' }];
            });

            // If incoming from someone else:
            if (newMsg.sender_id !== currentUserId) {
              // Spec: Skip sound when user is already looking at that chat in a visible tab
              const isLookingAtChat =
                document.visibilityState === 'visible' &&
                document.hasFocus() &&
                activeChatRef.current.id === chatId;

              if (!isLookingAtChat) {
                playReceiveSound();
              }
            }
          }
        )
        .subscribe();
    } catch (realtimeErr) {
      console.warn('Realtime subscription error:', realtimeErr);
    }

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [chatId, currentUserId, playReceiveSound]);

  // Send message function with instant whoosh sound & offline queue
  const sendMessage = useCallback(
    async (body: string) => {
      if (!chatId || !chatType || !currentUserId || !body.trim()) return;

      const clientId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      // Play outgoing whoosh immediately (even offline)
      playSendSound();

      const optimisticMsg: Message = {
        id: clientId,
        chat_id: chatId,
        chat_type: chatType,
        sender_id: currentUserId,
        body: body.trim(),
        client_id: clientId,
        created_at: timestamp,
        status: navigator.onLine ? 'sending' : 'queued',
      };

      // 1. Optimistic UI update
      setMessages((prev) => [...prev, optimisticMsg]);

      // 2. Put in local Dexie outbox
      const outboxEntry: LocalOutboxMessage = {
        client_id: clientId,
        chat_id: chatId,
        chat_type: chatType,
        sender_id: currentUserId,
        body: body.trim(),
        created_at: timestamp,
        status: navigator.onLine ? 'sending' : 'queued',
        retry_count: 0,
      };
      await localDb.outbox.put(outboxEntry);

      // 3. If offline, keep in outbox
      if (!navigator.onLine || !isConfigured) {
        return;
      }

      // 4. Send to Supabase
      try {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            chat_id: chatId,
            chat_type: chatType,
            sender_id: currentUserId,
            body: body.trim(),
            client_id: clientId,
            created_at: timestamp,
          })
          .select('*, sender:profiles(id, username, avatar_url)')
          .single();

        if (error) {
          console.error('Error inserting message:', error);
          await localDb.outbox.update(clientId, {
            status: 'failed',
            last_error: error.message,
          });
          setMessages((prev) =>
            prev.map((m) =>
              m.client_id === clientId ? { ...m, status: 'failed' } : m
            )
          );
        } else {
          // Success! Clean up outbox & update message
          await localDb.outbox.delete(clientId);
          if (data) {
            await localDb.messages.put({ ...data, status: 'sent' });
            setMessages((prev) =>
              prev.map((m) =>
                m.client_id === clientId ? { ...data, status: 'sent' } : m
              )
            );
          }
        }
      } catch (err: unknown) {
        console.warn('Network error sending message, queued in outbox:', err);
        await localDb.outbox.update(clientId, {
          status: 'queued',
          last_error: err instanceof Error ? err.message : 'Network error',
        });
        setMessages((prev) =>
          prev.map((m) =>
            m.client_id === clientId ? { ...m, status: 'queued' } : m
          )
        );
      }
    },
    [chatId, chatType, currentUserId, playSendSound]
  );

  return {
    messages,
    loading,
    isOnline,
    isFlushingOutbox,
    sendMessage,
    flushOutbox,
  };
}

