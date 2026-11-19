import React, { useState } from 'react';
import { Users, Hash, UserPlus, Link as LinkIcon, Settings, Trash2, LogOut } from 'lucide-react';
import type { Friendship, Group, Profile } from '../../types/database';

interface SubSidebarProps {
  activeMode: 'dm' | 'group';
  activeDmFriendshipId: string | null;
  activeGroupId: string | null;
  groups: Group[];
  friends: Friendship[];
  currentProfile: Profile | null;
  pendingTotal: number;
  onSelectFriendsTab: () => void;
  onSelectFriendChat: (friendshipId: string) => void;
  onOpenDirectInvite: () => void;
  onOpenInviteLink: () => void;
  onOpenSettings: () => void;
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
  onSelectFriendsTab,
  onSelectFriendChat,
  onOpenDirectInvite,
  onOpenInviteLink,
  onOpenSettings,
  onDeleteGroup,
  onLeaveGroup,
}) => {
  const currentGroup = groups.find((g) => g.id === activeGroupId);
  const isOwner = currentGroup && currentProfile && currentGroup.owner_id === currentProfile.id;
  const [isDeleting, setIsDeleting] = useState(false);

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
            {/* Group Channel #general */}
            <div className="space-y-1">
              <div className="w-full flex items-center space-x-2 px-3 py-2 rounded-md bg-discord-input text-white cursor-pointer">
                <Hash className="w-5 h-5 text-discord-muted" />
                <span className="text-sm font-medium">general</span>
              </div>
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
      <div className="h-14 bg-[#232428] px-2 flex items-center justify-between">
        <div className="flex items-center space-x-2 overflow-hidden px-1">
          <div className="relative flex-shrink-0">
            <img
              src={
                currentProfile?.avatar_url ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${currentProfile?.username || 'me'}`
              }
              alt="My Avatar"
              className="w-8 h-8 rounded-full bg-discord-rail"
            />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-discord-online border border-[#232428]" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-discord-text truncate leading-tight">
              {currentProfile?.username || 'User'}
            </span>
            <span className="text-[11px] text-discord-muted truncate">
              Online
            </span>
          </div>
        </div>

        <button
          onClick={onOpenSettings}
          className="p-1.5 text-discord-muted hover:text-discord-text hover:bg-discord-input rounded transition-colors"
          title="User Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

