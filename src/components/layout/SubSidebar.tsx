import React, { useState } from 'react';
import { Users, Hash, UserPlus, Link as LinkIcon, Settings, Trash2, LogOut, Check, Plus, Megaphone } from 'lucide-react';
import type { Friendship, Group, Profile, Channel } from '../../types/database';
import type { UserStatus } from '../../hooks/usePresence';

interface SubSidebarProps {
  activeMode: 'dm' | 'group';
  activeDmFriendshipId: string | null;
  activeGroupId: string | null;
  groups: Group[];
  friends: Friendship[];
  currentProfile: Profile | null;
  pendingTotal: number;
  userStatus?: UserStatus;
  channels?: Channel[];
  activeChannelId?: string | null;
  onSelectFriendsTab: () => void;
  onSelectFriendChat: (friendshipId: string) => void;
  onSelectChannel?: (channelId: string) => void;
  onOpenCreateChannel?: () => void;
  onDeleteChannel?: (channelId: string) => void;
  onOpenDirectInvite: () => void;
  onOpenInviteLink: () => void;
  onOpenSettings: () => void;
  onStatusChange?: (status: UserStatus) => void;
  onDeleteGroup?: (groupId: string) => Promise<void>;
  onLeaveGroup?: (groupId: string) => Promise<void>;
}

export const SubSidebar: React.FC<SubSidebarProps> = ({
  activeMode,
  activeDmFriendshipId,
  activeGroupId,
  groups,
  friends,
  currentProfile,
  pendingTotal,
  userStatus = 'online',
  channels = [],
  activeChannelId,
  onSelectFriendsTab,
  onSelectFriendChat,
  onSelectChannel,
  onOpenCreateChannel,
  onDeleteChannel,
  onOpenDirectInvite,
  onOpenInviteLink,
  onOpenSettings,
  onStatusChange,
  onDeleteGroup,
  onLeaveGroup,
}) => {
  const currentGroup = groups.find((g) => g.id === activeGroupId);
  const isOwner = currentGroup && currentProfile && currentGroup.owner_id === currentProfile.id;
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStatusPickerOpen, setIsStatusPickerOpen] = useState(false);

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'online':
        return 'bg-discord-online';
      case 'idle':
        return 'bg-discord-warn';
      case 'dnd':
        return 'bg-discord-danger';
      case 'offline':
      default:
        return 'bg-discord-muted';
    }
  };

  const getStatusLabel = (status: UserStatus) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'idle':
        return 'Idle';
      case 'dnd':
        return 'Do Not Disturb';
      case 'offline':
      default:
        return 'Invisible';
    }
  };

  const handleDelete = async () => {
    if (!currentGroup || !onDeleteGroup) return;
    if (window.confirm(`Are you sure you want to delete "${currentGroup.name}"? This cannot be undone.`)) {
      setIsDeleting(true);
      try {
        await onDeleteGroup(currentGroup.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleLeave = async () => {
    if (!currentGroup || !onLeaveGroup) return;
    if (window.confirm(`Are you sure you want to leave "${currentGroup.name}"?`)) {
      setIsDeleting(true);
      try {
        await onLeaveGroup(currentGroup.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="w-60 bg-discord-side flex flex-col h-full border-r border-discord-border flex-shrink-0">
      {/* Sidebar Header */}
      <div className="h-12 border-b border-discord-border px-4 flex items-center justify-between font-semibold text-discord-text shadow-sm">
        {activeMode === 'dm' ? (
          <span>Direct Messages</span>
        ) : (
          <div className="flex items-center justify-between w-full">
            <span className="truncate">{currentGroup?.name || 'Group Chat'}</span>
          </div>
        )}
      </div>

      {/* Navigation Content */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {activeMode === 'dm' ? (
          <div>
            {/* Friends Tab */}
            <button
              onClick={onSelectFriendsTab}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                activeDmFriendshipId === null
                  ? 'bg-discord-input text-white'
                  : 'text-discord-muted hover:bg-discord-input/60 hover:text-discord-text'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5" />
                <span className="font-medium text-sm">Friends</span>
              </div>
              {pendingTotal > 0 && (
                <span className="bg-discord-danger text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {pendingTotal}
                </span>
              )}
            </button>

            {/* Direct Messages List */}
            <div className="mt-5">
              <div className="px-3 text-xs font-semibold text-discord-muted uppercase tracking-wider mb-1">
                Direct Messages
              </div>
              {friends.length === 0 ? (
                <p className="px-3 py-2 text-xs text-discord-muted italic">
                  No friends added yet.
                </p>
              ) : (
                <div className="space-y-0.5">
                  {friends.map((f) => {
                    const friendProfile =
                      f.requester_id === currentProfile?.id
                        ? f.addressee
                        : f.requester;
                    const isSelected = activeDmFriendshipId === f.id;

                    return (
                      <button
                        key={f.id}
                        onClick={() => onSelectFriendChat(f.id)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors group ${
                          isSelected
                            ? 'bg-discord-input text-white'
                            : 'text-discord-muted hover:bg-discord-input/60 hover:text-discord-text'
                        }`}
                      >
                        <div className="relative">
                          <img
                            src={
                              friendProfile?.avatar_url ||
                              `https://api.dicebear.com/7.x/bottts/svg?seed=${friendProfile?.username}`
                            }
                            alt="Avatar"
                            className="w-8 h-8 rounded-full bg-discord-rail"
                          />
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-discord-online border-2 border-discord-side" />
                        </div>
                        <span className="text-sm font-medium truncate">
                          {friendProfile?.username || 'User'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* Text Channels Header with Add Button */}
            <div className="flex items-center justify-between px-2 mb-1.5">
              <span className="text-[11px] font-bold text-discord-muted uppercase tracking-wider">
                Text Channels
              </span>
              {isOwner && onOpenCreateChannel && (
                <button
                  type="button"
                  onClick={onOpenCreateChannel}
                  className="p-1 text-discord-muted hover:text-discord-text hover:bg-discord-input/60 rounded transition-colors"
                  title="Create Channel"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Channels List */}
            <div className="space-y-0.5">
              {channels.map((chan) => {
                const isSelected = activeChannelId === chan.id;
                const isAnnouncement = chan.type === 'announcement';

                return (
                  <div
                    key={chan.id}
                    onClick={() => onSelectChannel?.(chan.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-colors group ${
                      isSelected
                        ? 'bg-discord-input text-white'
                        : 'text-discord-muted hover:bg-discord-input/60 hover:text-discord-text'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      {isAnnouncement ? (
                        <Megaphone className="w-4 h-4 text-discord-muted flex-shrink-0" />
                      ) : (
                        <Hash className="w-4 h-4 text-discord-muted flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">{chan.name}</span>
                    </div>

                    {/* Delete Channel (for owners, cannot delete default general) */}
                    {isOwner && chan.name !== 'general' && onDeleteChannel && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete channel #${chan.name}?`)) {
                            onDeleteChannel(chan.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-discord-muted hover:text-discord-danger rounded transition-opacity"
                        title="Delete Channel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Group Actions */}
            <div className="mt-6 pt-4 border-t border-discord-border space-y-1">
              <button
                onClick={onOpenDirectInvite}
                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-md text-discord-muted hover:bg-discord-input/60 hover:text-discord-text text-sm transition-colors"
              >
                <UserPlus className="w-4 h-4 text-discord-accent" />
                <span>Invite Friends</span>
              </button>

              <button
                onClick={onOpenInviteLink}
                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-md text-discord-muted hover:bg-discord-input/60 hover:text-discord-text text-sm transition-colors"
              >
                <LinkIcon className="w-4 h-4 text-discord-online" />
                <span>Shareable Link</span>
              </button>

              {isOwner ? (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-md text-discord-danger/80 hover:bg-discord-danger/10 hover:text-discord-danger text-sm transition-colors pt-2"
                >
                  <Trash2 className="w-4 h-4 text-discord-danger" />
                  <span>{isDeleting ? 'Deleting...' : 'Delete Server'}</span>
                </button>
              ) : (
                <button
                  onClick={handleLeave}
                  disabled={isDeleting}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-md text-discord-danger/80 hover:bg-discord-danger/10 hover:text-discord-danger text-sm transition-colors pt-2"
                >
                  <LogOut className="w-4 h-4 text-discord-danger" />
                  <span>{isDeleting ? 'Leaving...' : 'Leave Server'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* User Footer Panel */}
      <div className="h-14 bg-[#232428] px-2 flex items-center justify-between relative">
        <div
          onClick={() => onStatusChange && setIsStatusPickerOpen((prev) => !prev)}
          className="flex items-center space-x-2 overflow-hidden px-1 rounded-md hover:bg-discord-input/60 p-1 cursor-pointer transition-colors flex-1 min-w-0"
          title="Click to change online status"
        >
          <div className="relative flex-shrink-0">
            <img
              src={
                currentProfile?.avatar_url ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${currentProfile?.username || 'me'}`
              }
              alt="My Avatar"
              className="w-8 h-8 rounded-full bg-discord-rail"
            />
            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${getStatusColor(userStatus)} border border-[#232428]`} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-discord-text truncate leading-tight">
              {currentProfile?.username || 'User'}
            </span>
            <span className="text-[11px] text-discord-muted truncate">
              {getStatusLabel(userStatus)}
            </span>
          </div>
        </div>

        {/* Status Picker Popover */}
        {isStatusPickerOpen && onStatusChange && (
          <div className="absolute bottom-16 left-2 w-48 bg-discord-side border border-discord-border rounded-lg shadow-xl py-1.5 z-50">
            <div className="px-3 py-1 text-[11px] font-bold text-discord-muted uppercase tracking-wider">
              Set Status
            </div>
            {(['online', 'idle', 'dnd', 'offline'] as UserStatus[]).map((st) => (
              <button
                key={st}
                onClick={() => {
                  onStatusChange(st);
                  setIsStatusPickerOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-discord-text hover:bg-discord-input transition-colors text-left"
              >
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${getStatusColor(st)}`} />
                  <span>{getStatusLabel(st)}</span>
                </div>
                {userStatus === st && <Check className="w-3.5 h-3.5 text-discord-accent" />}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onOpenSettings}
          className="p-1.5 text-discord-muted hover:text-discord-text hover:bg-discord-input rounded transition-colors ml-1"
          title="User Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

