import { useState, useEffect, useCallback } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import type { Channel } from '../types/database';

export function useChannels(groupId: string | null) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchChannels = useCallback(async () => {
    if (!groupId || !isConfigured) {
      setChannels([]);
      setActiveChannelId(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error && error.code !== '42P01') {
        // Table doesn't exist yet or permission error
        console.warn('Error fetching channels, using default #general:', error);
      }

      if (data && data.length > 0) {
        setChannels(data as Channel[]);
        setActiveChannelId((prev) => {
          if (prev && data.some((c) => c.id === prev)) return prev;
          return data[0].id;
        });
      } else {
        // Default general channel linked to the group
        const defaultChannel: Channel = {
          id: groupId,
          group_id: groupId,
          name: 'general',
          type: 'text',
        };
        setChannels([defaultChannel]);
        setActiveChannelId(groupId);
      }
    } catch (err) {
      console.warn('Network error fetching channels, fallback to default:', err);
      const defaultChannel: Channel = {
        id: groupId,
        group_id: groupId,
        name: 'general',
        type: 'text',
      };
      setChannels([defaultChannel]);
      setActiveChannelId(groupId);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchChannels();

    if (!groupId || !isConfigured) return;

    // Realtime listener for new or deleted channels
    const channelSub = supabase
      .channel(`channels:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channels',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          fetchChannels();
        }
      )
      .subscribe();

    return () => {
      channelSub.unsubscribe();
    };
  }, [groupId, fetchChannels]);

  // Create new channel
  const createChannel = useCallback(
    async (name: string, type: 'text' | 'announcement' = 'text') => {
      if (!groupId || !name.trim() || !isConfigured) return null;

      const formattedName = name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-_]/g, '');

      try {
        const { data, error } = await supabase
          .from('channels')
          .insert({
            group_id: groupId,
            name: formattedName,
            type,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating channel:', error);
          throw error;
        }

        if (data) {
          const newChan = data as Channel;
          setChannels((prev) => [...prev, newChan]);
          setActiveChannelId(newChan.id);
          return newChan;
        }
      } catch (err) {
        console.error('Failed to create channel:', err);
        throw err;
      }
      return null;
    },
    [groupId]
  );

  // Delete channel
  const deleteChannel = useCallback(
    async (channelId: string) => {
      if (!groupId || !isConfigured || channelId === groupId) return;

      setChannels((prev) => prev.filter((c) => c.id !== channelId));
      setActiveChannelId((prev) => (prev === channelId ? groupId : prev));

      try {
        await supabase.from('channels').delete().eq('id', channelId);
      } catch (err) {
        console.error('Error deleting channel:', err);
      }
    },
    [groupId]
  );

  return {
    channels,
    activeChannelId,
    setActiveChannelId,
    createChannel,
    deleteChannel,
    loading,
  };
}
