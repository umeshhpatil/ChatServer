import { useState, useEffect, useCallback } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import type { Friendship, Group, GroupInvite, Profile } from '../types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseSocialOptions {
  userId: string | null;
  playReceiveSound: (force?: boolean) => void;
}

export function useSocial({ userId, playReceiveSound }: UseSocialOptions) {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupInvites, setGroupInvites] = useState<GroupInvite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch friends and pending requests
  const fetchFriendships = useCallback(async () => {
    if (!userId || !isConfigured) return;

    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id, requester_id, addressee_id, status, created_at,
          requester:profiles!friendships_requester_id_fkey(id, username, avatar_url),
          addressee:profiles!friendships_addressee_id_fkey(id, username, avatar_url)
        `)
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      if (error) {
        console.error('Error fetching friendships:', error);
        return;
      }

      if (data) {
        const typedData = data as unknown as Friendship[];
        const accepted = typedData.filter((f) => f.status === 'accepted');
        const pending = typedData.filter((f) => f.status === 'pending');
        setFriends(accepted);
        setPendingRequests(pending);
      }
    } catch (err) {
      console.warn('Network error fetching friendships:', err);
    }
  }, [userId]);

  // Fetch user groups
  const fetchGroups = useCallback(async () => {
    if (!userId || !isConfigured) return;

    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups(id, name, owner_id, icon_url, created_at)
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching groups:', error);
        return;
      }

      if (data) {
        const userGroups: Group[] = (data as unknown as { groups: Group }[])
          .map((item) => item.groups)
          .filter(Boolean);
        setGroups(userGroups);
      }
    } catch (err) {
      console.warn('Network error fetching groups:', err);
    }
  }, [userId]);

  // Fetch pending group invites for this user
  const fetchGroupInvites = useCallback(async () => {
    if (!userId || !isConfigured) return;

    try {
      const { data, error } = await supabase
        .from('group_invites')
        .select(`
          id, group_id, inviter_id, invitee_id, status, created_at,
          group:groups(id, name, owner_id, icon_url),
          inviter:profiles!group_invites_inviter_id_fkey(id, username, avatar_url)
        `)
        .eq('invitee_id', userId)
        .eq('status', 'pending');

      if (error) {
        console.error('Error fetching group invites:', error);
        return;
      }

      if (data) {
        setGroupInvites(data as unknown as GroupInvite[]);
      }
    } catch (err) {
      console.warn('Network error fetching group invites:', err);
    }
  }, [userId]);

  // Initial load and Realtime setup
  useEffect(() => {
    if (!userId || !isConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([fetchFriendships(), fetchGroups(), fetchGroupInvites()]).finally(
      () => setLoading(false)
    );

    // Realtime listener for friendships
    const friendshipsChannel: RealtimeChannel = supabase
      .channel(`user-friendships:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
        },
        (payload) => {
          fetchFriendships();
          if (payload.eventType === 'INSERT') {
            const newF = payload.new as Friendship;
            if (newF.addressee_id === userId) {
              playReceiveSound(true);
            }
          }
        }
      )
      .subscribe();

    // Realtime listener for group invites
    const invitesChannel: RealtimeChannel = supabase
      .channel(`user-invites:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_invites',
          filter: `invitee_id=eq.${userId}`,
        },
        (payload) => {
          fetchGroupInvites();
          if (payload.eventType === 'INSERT') {
            playReceiveSound(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(friendshipsChannel);
      supabase.removeChannel(invitesChannel);
    };
  }, [userId, fetchFriendships, fetchGroups, fetchGroupInvites, playReceiveSound]);

  // Send friend request by username
  const sendFriendRequest = async (targetUsername: string) => {
    if (!userId || !isConfigured) throw new Error('Not logged in or configured');

    const cleanUsername = targetUsername.trim();
    if (!cleanUsername) throw new Error('Username cannot be empty');

    // 1. Find profile by username
    const { data: targetProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', cleanUsername)
      .single();

    if (profileErr || !targetProfile) {
      throw new Error(`User "${cleanUsername}" was not found.`);
    }

    if (targetProfile.id === userId) {
      throw new Error('You cannot send a friend request to yourself.');
    }

    // 2. Insert into friendships
    const { error: reqErr } = await supabase.from('friendships').insert({
      requester_id: userId,
      addressee_id: targetProfile.id,
      status: 'pending',
    });

    if (reqErr) {
      if (reqErr.code === '23505') {
        throw new Error('A friend request between you already exists.');
      }
      throw new Error(reqErr.message);
    }

    await fetchFriendships();
  };

  // Accept friend request
  const acceptFriendRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);

    if (error) throw new Error(error.message);
    await fetchFriendships();
  };

  // Decline friend request
  const declineFriendRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'declined' })
      .eq('id', friendshipId);

    if (error) throw new Error(error.message);
    await fetchFriendships();
  };

  // Create group
  const createGroup = async (groupName: string): Promise<string> => {
    if (!groupName.trim()) throw new Error('Group name cannot be empty');

    const { data, error } = await supabase.rpc('create_group_with_owner', {
      group_name: groupName.trim(),
    });

    if (error) throw new Error(error.message);
    await fetchGroups();
    return data as string;
  };

  // Direct invite friend to group
  const directInviteFriend = async (groupId: string, friendUserId: string) => {
    if (!userId) throw new Error('Not logged in');

    const { error } = await supabase.from('group_invites').insert({
      group_id: groupId,
      inviter_id: userId,
      invitee_id: friendUserId,
      status: 'pending',
    });

    if (error) {
      if (error.code === '23505') {
        throw new Error('An invite has already been sent to this friend.');
      }
      throw new Error(error.message);
    }
  };

  // Accept direct group invite
  const acceptGroupInvite = async (inviteId: string) => {
    const { error } = await supabase.rpc('accept_group_invite', {
      invite: inviteId,
    });

    if (error) throw new Error(error.message);
    await Promise.all([fetchGroupInvites(), fetchGroups()]);
  };

  // Decline direct group invite
  const declineGroupInvite = async (inviteId: string) => {
    const { error } = await supabase
      .from('group_invites')
      .update({ status: 'declined' })
      .eq('id', inviteId);

    if (error) throw new Error(error.message);
    await fetchGroupInvites();
  };

  // Create shareable invite link (Admins/Owners)
  const createInviteLink = async (
    groupId: string,
    maxUses: number = 25,
    daysValid: number = 7
  ): Promise<string> => {
    if (!userId) throw new Error('Not logged in');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysValid);

    const { data, error } = await supabase
      .from('group_invite_links')
      .insert({
        group_id: groupId,
        created_by: userId,
        max_uses: maxUses,
        expires_at: expiresAt.toISOString(),
      })
      .select('code')
      .single();

    if (error) throw new Error(error.message);
    return data.code;
  };

  // Delete group (Group Owner only)
  const deleteGroup = async (groupId: string) => {
    if (!userId) throw new Error('Not logged in');
    const { error } = await supabase.from('groups').delete().eq('id', groupId);
    if (error) throw new Error(error.message);
    await fetchGroups();
  };

  // Leave group (Non-owner members)
  const leaveGroup = async (groupId: string) => {
    if (!userId) throw new Error('Not logged in');
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    await fetchGroups();
  };

  return {
    friends,
    pendingRequests,
    groups,
    groupInvites,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    createGroup,
    directInviteFriend,
    acceptGroupInvite,
    declineGroupInvite,
    createInviteLink,
    deleteGroup,
    leaveGroup,
    refreshAll: () =>
      Promise.all([fetchFriendships(), fetchGroups(), fetchGroupInvites()]),
  };
}

