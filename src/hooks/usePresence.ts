import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';

interface PresenceState {
  user_id: string;
  username: string;
  status: UserStatus;
  online_at: string;
}

export function usePresence(userId: string | null, username: string | null) {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, PresenceState>>(new Map());
  const [myStatus, setMyStatus] = useState<UserStatus>('online');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const idleTimerRef = useRef<number | null>(null);

  // Sync presence with Supabase Realtime
  useEffect(() => {
    if (!userId || !isConfigured) return;

    const channel = supabase.channel('global-presence', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>();
        const newMap = new Map<string, PresenceState>();

        Object.entries(state).forEach(([key, presences]) => {
          if (presences && presences.length > 0) {
            newMap.set(key, presences[0]);
          }
        });

        setOnlineUsers(newMap);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setOnlineUsers((prev) => {
          const next = new Map(prev);
          if (newPresences && newPresences.length > 0) {
            next.set(key, newPresences[0] as unknown as PresenceState);
          }
          return next;
        });
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            username: username || 'User',
            status: myStatus,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [userId, username, myStatus]);

  // Update status (online, idle, dnd, offline)
  const updateStatus = useCallback(
    async (newStatus: UserStatus) => {
      setMyStatus(newStatus);
      if (channelRef.current && userId) {
        await channelRef.current.track({
          user_id: userId,
          username: username || 'User',
          status: newStatus,
          online_at: new Date().toISOString(),
        });
      }
    },
    [userId, username]
  );

  // Auto-detect idle after 5 minutes of inactivity
  useEffect(() => {
    const resetIdleTimer = () => {
      if (myStatus === 'idle') {
        updateStatus('online');
      }
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = window.setTimeout(() => {
        if (myStatus === 'online') {
          updateStatus('idle');
        }
      }, 5 * 60 * 1000); // 5 minutes
    };

    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    window.addEventListener('touchstart', resetIdleTimer);

    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('touchstart', resetIdleTimer);
    };
  }, [myStatus, updateStatus]);

  const getUserStatus = useCallback(
    (targetUserId: string): UserStatus => {
      const presence = onlineUsers.get(targetUserId);
      return presence ? presence.status : 'offline';
    },
    [onlineUsers]
  );

  return {
    onlineUsers,
    myStatus,
    updateStatus,
    getUserStatus,
    isUserOnline: (targetUserId: string) => onlineUsers.has(targetUserId),
  };
}
