import React, { useEffect, useState, useCallback } from 'react';
import { Crown, Shield, X } from 'lucide-react';
import { supabase, isConfigured } from '../../lib/supabase';
import type { GroupMember } from '../../types/database';
import type { UserStatus } from '../../hooks/usePresence';

interface MemberListDrawerProps {
  groupId: string | null;
  isOpen: boolean;
  onClose: () => void;
  getUserStatus: (userId: string) => UserStatus;
}

export const MemberListDrawer: React.FC<MemberListDrawerProps> = ({
  groupId,
  isOpen,
  onClose,
  getUserStatus,
}) => {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchMembers = useCallback(async () => {
    if (!groupId || !isConfigured) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          id,
          group_id,
          user_id,
          role,
          created_at,
          profile:profiles(id, username, avatar_url, status)
        `)
        .eq('group_id', groupId);

      if (error) {
        console.error('Error fetching group members:', error);
      } else if (data) {
        setMembers(data as unknown as GroupMember[]);
      }
    } catch (err) {
      console.error('Network error fetching group members:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchMembers();

    if (!groupId || !isConfigured) return;

    // Listen to real-time changes in group members (new joins / role changes)
    const channel = supabase
      .channel(`group-members-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          fetchMembers();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [groupId, fetchMembers]);

  // Group members into categories
  const owners = members.filter((m) => m.role === 'owner');
  const admins = members.filter((m) => m.role === 'admin');
  const regularMembers = members.filter((m) => m.role === 'member');

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'online':
        return <span className="w-2.5 h-2.5 rounded-full bg-discord-online border border-discord-side" title="Online" />;
      case 'idle':
        return <span className="w-2.5 h-2.5 rounded-full bg-discord-warn border border-discord-side" title="Idle" />;
      case 'dnd':
        return <span className="w-2.5 h-2.5 rounded-full bg-discord-danger border border-discord-side" title="Do Not Disturb" />;
      case 'offline':
      default:
        return <span className="w-2.5 h-2.5 rounded-full bg-discord-muted/60 border border-discord-side" title="Offline" />;
    }
  };

  const renderMemberRow = (member: GroupMember) => {
    const status = getUserStatus(member.user_id);
    const username = member.profile?.username || 'Member';
    const avatarUrl =
      member.profile?.avatar_url ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

    return (
      <div
        key={member.id}
        className="flex items-center space-x-2.5 px-2 py-1.5 rounded-md hover:bg-discord-input/50 transition-colors group cursor-default"
      >
        <div className="relative flex-shrink-0">
          <img
            src={avatarUrl}
            alt={username}
            className="w-8 h-8 rounded-full bg-discord-rail object-cover"
          />
          <div className="absolute -bottom-0.5 -right-0.5">
            {getStatusBadge(status)}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex items-center justify-between">
          <span className="text-sm font-medium text-discord-text truncate group-hover:text-white">
            {username}
          </span>

          {member.role === 'owner' && (
            <span title="Server Owner" className="flex-shrink-0 ml-1.5">
              <Crown className="w-4 h-4 text-amber-400" />
            </span>
          )}
          {member.role === 'admin' && (
            <span title="Admin" className="flex-shrink-0 ml-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
            </span>
          )}
        </div>
      </div>
    );
  };

  const content = (
    <div className="h-full flex flex-col bg-discord-side w-60 border-l border-discord-border select-none">
      {/* Header */}
      <div className="h-12 border-b border-discord-border px-4 flex items-center justify-between flex-shrink-0 font-semibold text-discord-text text-sm">
        <span>Server Members ({members.length})</span>
        <button
          onClick={onClose}
          className="p-1 rounded text-discord-muted hover:text-discord-text hover:bg-discord-input transition-colors md:hidden"
          title="Close Member List"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Member Categories */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {loading && members.length === 0 ? (
          <div className="text-xs text-discord-muted text-center py-4">Loading members...</div>
        ) : null}

        {owners.length > 0 && (
          <div>
            <h4 className="px-2 text-[11px] font-bold uppercase tracking-wider text-discord-muted mb-1 flex items-center space-x-1">
              <span>Owner — {owners.length}</span>
            </h4>
            <div className="space-y-0.5">{owners.map(renderMemberRow)}</div>
          </div>
        )}

        {admins.length > 0 && (
          <div>
            <h4 className="px-2 text-[11px] font-bold uppercase tracking-wider text-discord-muted mb-1 flex items-center space-x-1">
              <span>Admins — {admins.length}</span>
            </h4>
            <div className="space-y-0.5">{admins.map(renderMemberRow)}</div>
          </div>
        )}

        {regularMembers.length > 0 && (
          <div>
            <h4 className="px-2 text-[11px] font-bold uppercase tracking-wider text-discord-muted mb-1 flex items-center space-x-1">
              <span>Members — {regularMembers.length}</span>
            </h4>
            <div className="space-y-0.5">{regularMembers.map(renderMemberRow)}</div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop view (collapsible side panel) */}
      {isOpen && (
        <aside className="hidden md:flex h-full flex-shrink-0">
          {content}
        </aside>
      )}

      {/* Mobile view (drawer overlay with backdrop) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          <div
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />
          <div className="relative z-10 h-full shadow-2xl animate-in slide-in-from-right duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
