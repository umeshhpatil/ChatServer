import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { localDb, type LocalOutboxMessage } from '../lib/db';
import type { Message, ChatType, MessageReaction, ReactionGroup } from '../types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseChatOptions {
  chatId: string | null;
  chatType: ChatType | null;
  currentUserId: string | null;
  currentUsername?: string | null;
  playSendSound: () => void;
  playReceiveSound: (force?: boolean) => void;
}

export function useChat({
  chatId,
  chatType,
  currentUserId,
  currentUsername,
  playSendSound,
  playReceiveSound,
}: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isFlushingOutbox, setIsFlushingOutbox] = useState<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isSelfTyping, setIsSelfTyping] = useState<boolean>(false);
  const selfTypingTimeoutRef = useRef<number | null>(null);

  const activeChatRef = useRef<{ id: string | null; type: ChatType | null }>({
    id: chatId,
    type: chatType,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const typingTimeoutsRef = useRef<Map<string, number>>(new Map());

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
            await localDb.outbox.delete(item.client_id);
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
          break;
        }
      }
    } finally {
      setIsFlushingOutbox(false);
    }
  }, []);

  // Helper to group reactions by emoji
  const processReactions = useCallback(
    (rawReactions: MessageReaction[]): Map<string, ReactionGroup[]> => {
      const grouped = new Map<string, Map<string, { count: number; hasReacted: boolean; users: string[] }>>();

      rawReactions.forEach((r) => {
        if (!grouped.has(r.message_id)) {
          grouped.set(r.message_id, new Map());
        }
        const msgMap = grouped.get(r.message_id)!;
        if (!msgMap.has(r.emoji)) {
          msgMap.set(r.emoji, { count: 0, hasReacted: false, users: [] });
        }
        const emojiData = msgMap.get(r.emoji)!;
        emojiData.count += 1;
        emojiData.users.push(r.user_id);
        if (r.user_id === currentUserId) {
          emojiData.hasReacted = true;
        }
      });

      const result = new Map<string, ReactionGroup[]>();
      grouped.forEach((emojis, msgId) => {
        const list: ReactionGroup[] = [];
        emojis.forEach((data, emoji) => {
          list.push({
            emoji,
            count: data.count,
            hasReacted: data.hasReacted,
            users: data.users,
          });
        });
        result.set(msgId, list);
      });

      return result;
    },
    [currentUserId]
  );

  // Load cached messages and fetch remote
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      setTypingUsers([]);
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

    // 2. Fetch fresh messages & reactions from Supabase
    const fetchRemote = async () => {
      try {
        const { data: msgs, error } = await supabase
          .from('messages')
          .select('*, sender:profiles(id, username, avatar_url)')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) {
          console.error('Error fetching messages:', error);
          return;
        }

        if (msgs && isMounted) {
          // Fetch reactions for these messages
          const msgIds = msgs.map((m) => m.id);
          let reactionsMap = new Map<string, ReactionGroup[]>();

          if (msgIds.length > 0) {
            const { data: rawReactions } = await supabase
              .from('message_reactions')
              .select('*')
              .in('message_id', msgIds);

            if (rawReactions) {
              reactionsMap = processReactions(rawReactions as MessageReaction[]);
            }
          }

          const decoratedMsgs = msgs.map((m) => ({
            ...m,
            status: 'sent' as const,
            reactions: reactionsMap.get(m.id) || [],
          }));

          await localDb.messages.bulkPut(
            decoratedMsgs.map((m) => ({
              ...m,
              status: 'sent',
            }))
          );

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

          const all = [...decoratedMsgs, ...pendingMessages].sort(
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

    // 3. Supabase Realtime Channel (Messages, Reactions, & Live Typing Broadcast)
    let channel: RealtimeChannel | null = null;
    try {
      channel = supabase
        .channel(`chat-room:${chatId}`, {
          config: {
            broadcast: { self: false, ack: false },
          },
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`,
          },
          async (payload) => {
            if (payload.eventType === 'INSERT') {
              const newMsg = payload.new as Message;

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

              await localDb.messages.put({
                ...newMsg,
                status: 'sent',
              });

              setMessages((prev) => {
                const existingIndex = prev.findIndex(
                  (m) =>
                    (newMsg.client_id && m.client_id === newMsg.client_id) ||
                    m.id === newMsg.id
                );
                if (existingIndex !== -1) {
                  const next = [...prev];
                  next[existingIndex] = { ...newMsg, status: 'sent', reactions: prev[existingIndex].reactions || [] };
                  return next;
                }
                return [...prev, { ...newMsg, status: 'sent', reactions: [] }];
              });

              if (newMsg.sender_id !== currentUserId) {
                const isLookingAtChat =
                  document.visibilityState === 'visible' &&
                  document.hasFocus() &&
                  activeChatRef.current.id === chatId;

                if (!isLookingAtChat) {
                  playReceiveSound();
                }
              }
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as Message;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === updated.id
                    ? {
                        ...m,
                        body: updated.body,
                        edited_at: updated.edited_at,
                        is_pinned: updated.is_pinned,
                        attachment_url: updated.attachment_url,
                        attachment_type: updated.attachment_type,
                      }
                    : m
                )
              );
              localDb.messages.update(updated.id, {
                body: updated.body,
                edited_at: updated.edited_at,
                is_pinned: updated.is_pinned,
              }).catch(() => {});
            } else if (payload.eventType === 'DELETE') {
              const oldMsg = payload.old as { id: string };
              setMessages((prev) => prev.filter((m) => m.id !== oldMsg.id));
              localDb.messages.delete(oldMsg.id).catch(() => {});
            }
          }
        )
        // Realtime Reactions
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'message_reactions',
          },
          async () => {
            // Refresh reactions for current messages
            setMessages((prev) => {
              const currentIds = prev.map((m) => m.id);
              if (currentIds.length === 0) return prev;

              supabase
                .from('message_reactions')
                .select('*')
                .in('message_id', currentIds)
                .then(({ data: rawReactions }) => {
                  if (rawReactions) {
                    const rMap = processReactions(rawReactions as MessageReaction[]);
                    setMessages((curr) =>
                      curr.map((m) => ({
                        ...m,
                        reactions: rMap.get(m.id) || [],
                      }))
                    );
                  }
                });

              return prev;
            });
          }
        )
        // Realtime Broadcast: Typing Indicator
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          const { userId, username: typingUsername } = payload as {
            userId: string;
            username: string;
          };

          if (userId === currentUserId) return;

          // Add to typing users
          setTypingUsers((prev) => {
            if (!prev.includes(typingUsername)) {
              return [...prev, typingUsername];
            }
            return prev;
          });

          // Reset clear timeout (auto-clear after 2.5s)
          if (typingTimeoutsRef.current.has(userId)) {
            window.clearTimeout(typingTimeoutsRef.current.get(userId));
          }

          const timeoutId = window.setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u !== typingUsername));
            typingTimeoutsRef.current.delete(userId);
          }, 2500);

          typingTimeoutsRef.current.set(userId, timeoutId);
        })
        .subscribe();

      channelRef.current = channel;
    } catch (realtimeErr) {
      console.warn('Realtime subscription error:', realtimeErr);
    }

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (selfTypingTimeoutRef.current) {
        window.clearTimeout(selfTypingTimeoutRef.current);
      }
      typingTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
      typingTimeoutsRef.current.clear();
      setTypingUsers([]);
      setIsSelfTyping(false);
    };
  }, [chatId, currentUserId, playReceiveSound, processReactions]);

  // Send broadcast typing event with immediate local feedback
  const sendTyping = useCallback(() => {
    if (!currentUserId) return;

    // 1. Immediate local feedback for the typing user
    setIsSelfTyping(true);
    if (selfTypingTimeoutRef.current) {
      window.clearTimeout(selfTypingTimeoutRef.current);
    }
    selfTypingTimeoutRef.current = window.setTimeout(() => {
      setIsSelfTyping(false);
    }, 2500);

    // 2. Broadcast to other room participants
    if (!channelRef.current) return;

    const now = Date.now();
    // Throttle typing broadcasts to once every 1.2 seconds
    if (now - lastTypingSentRef.current > 1200) {
      lastTypingSentRef.current = now;
      channelRef.current
        .send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            userId: currentUserId,
            username: currentUsername || 'Someone',
          },
        })
        .catch((err) => {
          console.warn('Realtime typing broadcast error:', err);
        });
    }
  }, [currentUserId, currentUsername]);

  // Send message function with instant whoosh sound & offline queue
  const sendMessage = useCallback(
    async (body: string, attachment?: { url: string; type: string }) => {
      if (!chatId || !chatType || !currentUserId || (!body.trim() && !attachment?.url)) return;

      const clientId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      playSendSound();

      setIsSelfTyping(false);
      if (selfTypingTimeoutRef.current) {
        window.clearTimeout(selfTypingTimeoutRef.current);
      }

      const optimisticMsg: Message = {
        id: clientId,
        chat_id: chatId,
        chat_type: chatType,
        sender_id: currentUserId,
        body: body.trim(),
        attachment_url: attachment?.url,
        attachment_type: attachment?.type,
        client_id: clientId,
        created_at: timestamp,
        status: navigator.onLine ? 'sending' : 'queued',
        reactions: [],
      };

      setMessages((prev) => [...prev, optimisticMsg]);

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

      if (!navigator.onLine || !isConfigured) {
        return;
      }

      try {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            chat_id: chatId,
            chat_type: chatType,
            sender_id: currentUserId,
            body: body.trim(),
            attachment_url: attachment?.url,
            attachment_type: attachment?.type,
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
          await localDb.outbox.delete(clientId);
          if (data) {
            await localDb.messages.put({ ...data, status: 'sent' });
            setMessages((prev) =>
              prev.map((m) =>
                m.client_id === clientId ? { ...data, status: 'sent', reactions: [] } : m
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

  // Edit an existing message
  const editMessage = useCallback(
    async (messageId: string, newBody: string) => {
      if (!newBody.trim() || !currentUserId || !isConfigured) return;
      const editedAt = new Date().toISOString();

      // Optimistic update
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId || m.client_id === messageId
            ? { ...m, body: newBody.trim(), edited_at: editedAt }
            : m
        )
      );

      try {
        await supabase
          .from('messages')
          .update({
            body: newBody.trim(),
            edited_at: editedAt,
          })
          .eq('id', messageId);
      } catch (err) {
        console.error('Error editing message:', err);
      }
    },
    [currentUserId]
  );

  // Delete a message
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!currentUserId || !isConfigured) return;

      // Optimistic delete
      setMessages((prev) =>
        prev.filter((m) => m.id !== messageId && m.client_id !== messageId)
      );
      localDb.messages.delete(messageId).catch(() => {});

      try {
        await supabase.from('messages').delete().eq('id', messageId);
      } catch (err) {
        console.error('Error deleting message:', err);
      }
    },
    [currentUserId]
  );

  // Toggle message pin status
  const togglePin = useCallback(
    async (messageId: string) => {
      if (!currentUserId || !isConfigured) return;
      const target = messages.find((m) => m.id === messageId || m.client_id === messageId);
      if (!target) return;

      const nextPinned = !target.is_pinned;

      // Optimistic update
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId || m.client_id === messageId
            ? { ...m, is_pinned: nextPinned }
            : m
        )
      );

      try {
        await supabase
          .from('messages')
          .update({ is_pinned: nextPinned })
          .eq('id', messageId);
      } catch (err) {
        console.error('Error pinning message:', err);
      }
    },
    [currentUserId, messages]
  );

  // Toggle emoji reaction (add or remove)
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!currentUserId || !isConfigured) return;

      // Find current message
      const msg = messages.find((m) => m.id === messageId || m.client_id === messageId);
      if (!msg) return;

      const existingReaction = msg.reactions?.find((r) => r.emoji === emoji);
      const hasReacted = existingReaction?.hasReacted;

      // Optimistic UI update
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId && m.client_id !== messageId) return m;

          const currentReactions = m.reactions || [];
          let updated: ReactionGroup[];

          if (hasReacted) {
            // Remove
            updated = currentReactions
              .map((r) =>
                r.emoji === emoji
                  ? {
                      ...r,
                      count: r.count - 1,
                      hasReacted: false,
                      users: r.users.filter((u) => u !== currentUserId),
                    }
                  : r
              )
              .filter((r) => r.count > 0);
          } else {
            // Add
            const found = currentReactions.find((r) => r.emoji === emoji);
            if (found) {
              updated = currentReactions.map((r) =>
                r.emoji === emoji
                  ? {
                      ...r,
                      count: r.count + 1,
                      hasReacted: true,
                      users: [...r.users, currentUserId],
                    }
                  : r
              );
            } else {
              updated = [
                ...currentReactions,
                { emoji, count: 1, hasReacted: true, users: [currentUserId] },
              ];
            }
          }

          return { ...m, reactions: updated };
        })
      );

      try {
        if (hasReacted) {
          await supabase
            .from('message_reactions')
            .delete()
            .match({ message_id: messageId, user_id: currentUserId, emoji });
        } else {
          await supabase.from('message_reactions').insert({
            message_id: messageId,
            user_id: currentUserId,
            emoji,
          });
        }
      } catch (err) {
        console.error('Error toggling reaction:', err);
      }
    },
    [currentUserId, messages]
  );

  return {
    messages,
    pinnedMessages: messages.filter((m) => m.is_pinned),
    loading,
    isOnline,
    isFlushingOutbox,
    typingUsers,
    isSelfTyping,
    sendMessage,
    editMessage,
    deleteMessage,
    togglePin,
    sendTyping,
    toggleReaction,
    flushOutbox,
  };
}
