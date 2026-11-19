import React, { useState } from 'react';
import { Users, UserPlus, MessageSquare, Check, X, Mail, Menu, Hash, Plus } from 'lucide-react';
import type { Friendship, Group, GroupInvite, Profile } from '../../types/database';
import type { UserStatus } from '../../hooks/usePresence';

interface FriendsViewProps {
  currentProfile: Profile | null;
  friends: Friendship[];
  pendingRequests: Friendship[];
  groupInvites: GroupInvite[];
  groups?: Group[];
  getUserStatus?: (userId: string) => UserStatus;
  onStartChat: (friendshipId: string) => void;
  onAcceptFriend: (friendshipId: string) => Promise<void>;
  onDeclineFriend: (friendshipId: string) => Promise<void>;
  onAcceptGroupInvite: (inviteId: string) => Promise<void>;
  onDeclineGroupInvite: (inviteId: string) => Promise<void>;
  onSendFriendRequest: (username: string) => Promise<void>;
  onToggleMobileSidebar?: () => void;
  onSelectGroup?: (groupId: string) => void;
  onOpenCreateGroup?: () => void;
}

type TabType = 'all' | 'pending' | 'invites' | 'add';

export const FriendsView: React.FC<FriendsViewProps> = ({
  currentProfile,
  friends,
  pendingRequests,
  groupInvites,
  groups = [],
  getUserStatus,
  onStartChat,
  onAcceptFriend,
  onDeclineFriend,
  onAcceptGroupInvite,
  onDeclineGroupInvite,
  onSendFriendRequest,
  onToggleMobileSidebar,
  onSelectGroup,
  onOpenCreateGroup,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [targetUsername, setTargetUsername] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        return 'Offline';
    }
  };

  const incomingFriendReqs = pendingRequests.filter(
    (f) => f.addressee_id === currentProfile?.id
  );
  const outgoingFriendReqs = pendingRequests.filter(
    (f) => f.requester_id === currentProfile?.id
  );

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUsername.trim() || submitting) return;
    setSubmitting(true);
    setStatusMsg(null);
    try {
      await onSendFriendRequest(targetUsername.trim());
      setStatusMsg({
        text: `Success! Your friend request to ${targetUsername} was sent.`,
        isError: false,
      });
      setTargetUsername('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send request';
      setStatusMsg({ text: msg, isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-discord-bg min-w-0 w-full overflow-hidden">
      {/* Top Header Bar */}
      <div className="h-12 border-b border-discord-border px-3 sm:px-4 flex items-center space-x-2 sm:space-x-4 shadow-sm bg-discord-bg flex-shrink-0 overflow-x-auto">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 -ml-1 rounded text-discord-muted hover:text-discord-text hover:bg-discord-input transition-colors flex-shrink-0"
          title="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-discord-text font-bold flex-shrink-0">
          <Users className="w-5 h-5 text-discord-muted" />
          <span className="hidden sm:inline">Friends</span>
        </div>

        <div className="w-[1px] h-5 bg-discord-border flex-shrink-0" />

        {/* Tab Buttons */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm font-medium flex-nowrap">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2 py-1 rounded transition-colors ${
              activeTab === 'all'
                ? 'bg-discord-input text-discord-text'
                : 'text-discord-muted hover:bg-discord-input/50 hover:text-discord-text'
            }`}
          >
            All ({friends.length})
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`px-2 py-1 rounded flex items-center space-x-1.5 transition-colors ${
              activeTab === 'pending'
                ? 'bg-discord-input text-discord-text'
                : 'text-discord-muted hover:bg-discord-input/50 hover:text-discord-text'
            }`}
          >
            <span>Pending</span>
            {pendingRequests.length > 0 && (
              <span className="bg-discord-danger text-white text-xs font-bold px-1.5 py-0.2 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('invites')}
            className={`px-2 py-1 rounded flex items-center space-x-1.5 transition-colors ${
              activeTab === 'invites'
                ? 'bg-discord-input text-discord-text'
                : 'text-discord-muted hover:bg-discord-input/50 hover:text-discord-text'
            }`}
          >
            <span>Group Invites</span>
            {groupInvites.length > 0 && (
              <span className="bg-discord-accent text-white text-xs font-bold px-1.5 py-0.2 rounded-full">
                {groupInvites.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeTab === 'add'
                ? 'bg-discord-online text-white'
                : 'bg-discord-online/20 text-discord-online hover:bg-discord-online hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Friend</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* ALL FRIENDS */}
        {activeTab === 'all' && (
          <div>
            <div className="text-xs font-semibold text-discord-muted uppercase tracking-wider mb-3">
              All Friends — {friends.length}
            </div>

            {friends.length === 0 ? (
              <div className="py-6 sm:py-10 max-w-lg mx-auto text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-discord-side/80 flex items-center justify-center text-discord-muted mx-auto">
                  <Users className="w-8 h-8 opacity-40" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-discord-text mb-1">
                    No friends connected yet
                  </h3>
                  <p className="text-xs sm:text-sm text-discord-muted">
                    Add friends with their username or jump straight into a server chat below!
                  </p>
                </div>

                {/* Quick Server Access Cards */}
                {groups.length > 0 && (
                  <div className="bg-discord-side/60 border border-discord-border rounded-xl p-3 sm:p-4 text-left space-y-3">
                    <div className="text-xs font-bold text-discord-muted uppercase tracking-wider">
                      Your Active Servers
                    </div>
                    <div className="space-y-2">
                      {groups.map((g) => (
                        <div
                          key={g.id}
                          className="flex items-center justify-between bg-discord-bg/90 p-3 rounded-lg border border-discord-border/50"
                        >
                          <div className="flex items-center space-x-3 min-w-0 pr-2">
                            <div className="w-9 h-9 rounded-xl bg-discord-accent text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                              {g.name[0]?.toUpperCase() || 'G'}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm text-discord-text truncate">{g.name}</div>
                              <div className="text-[11px] text-discord-muted flex items-center space-x-1">
                                <Hash className="w-3 h-3" />
                                <span>general</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => onSelectGroup?.(g.id)}
                            className="px-3.5 py-1.5 bg-discord-online hover:bg-discord-online/90 text-white rounded text-xs font-semibold transition-colors flex items-center space-x-1.5 shadow flex-shrink-0"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Open Chat</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setActiveTab('add')}
                    className="w-full sm:w-auto px-5 py-2.5 bg-discord-online hover:bg-discord-online/90 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center space-x-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add a Friend</span>
                  </button>

                  <button
                    onClick={onOpenCreateGroup}
                    className="w-full sm:w-auto px-5 py-2.5 bg-discord-accent hover:bg-discord-accent-hover text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create a Server</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-discord-border/50">
                {friends.map((f) => {
                  const friend =
                    f.requester_id === currentProfile?.id
                      ? f.addressee
                      : f.requester;
                  const friendStatus = friend && getUserStatus ? getUserStatus(friend.id) : 'offline';

                  return (
                    <div
                      key={f.id}
                      className="flex items-center justify-between py-3 hover:bg-[#2e3035]/60 px-3 rounded-lg group transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <img
                            src={
                              friend?.avatar_url ||
                              `https://api.dicebear.com/7.x/bottts/svg?seed=${friend?.username}`
                            }
                            alt="Avatar"
                            className="w-10 h-10 rounded-full bg-discord-rail"
                          />
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${getStatusColor(friendStatus)} border-2 border-discord-bg`} />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-discord-text">
                            {friend?.username || 'User'}
                          </div>
                          <div className="text-xs text-discord-muted capitalize">
                            {getStatusLabel(friendStatus)}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onStartChat(f.id)}
                        className="p-2 rounded-full bg-discord-input text-discord-muted hover:text-discord-text hover:bg-discord-side transition-colors"
                        title="Direct Message"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PENDING FRIEND REQUESTS */}
        {activeTab === 'pending' && (
          <div className="space-y-6">
            <div>
              <div className="text-xs font-semibold text-discord-muted uppercase tracking-wider mb-3">
                Incoming Requests — {incomingFriendReqs.length}
              </div>

              {incomingFriendReqs.length === 0 ? (
                <p className="text-xs text-discord-muted italic">
                  No incoming friend requests.
                </p>
              ) : (
                <div className="space-y-2">
                  {incomingFriendReqs.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between bg-discord-side/50 p-3 rounded-lg border border-discord-border"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={
                            req.requester?.avatar_url ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${req.requester?.username}`
                          }
                          alt="Avatar"
                          className="w-10 h-10 rounded-full bg-discord-rail"
                        />
                        <div>
                          <span className="font-semibold text-sm text-discord-text">
                            {req.requester?.username || 'User'}
                          </span>
                          <span className="block text-xs text-discord-muted">
                            Incoming Friend Request
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onAcceptFriend(req.id)}
                          className="p-2 bg-discord-online/20 text-discord-online hover:bg-discord-online hover:text-white rounded-full transition-colors"
                          title="Accept"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeclineFriend(req.id)}
                          className="p-2 bg-discord-danger/20 text-discord-danger hover:bg-discord-danger hover:text-white rounded-full transition-colors"
                          title="Decline"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs font-semibold text-discord-muted uppercase tracking-wider mb-3">
                Outgoing Requests — {outgoingFriendReqs.length}
              </div>

              {outgoingFriendReqs.length === 0 ? (
                <p className="text-xs text-discord-muted italic">
                  No outgoing friend requests.
                </p>
              ) : (
                <div className="space-y-2">
                  {outgoingFriendReqs.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between bg-discord-side/30 p-3 rounded-lg border border-discord-border/50"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={
                            req.addressee?.avatar_url ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${req.addressee?.username}`
                          }
                          alt="Avatar"
                          className="w-10 h-10 rounded-full bg-discord-rail"
                        />
                        <div>
                          <span className="font-semibold text-sm text-discord-text">
                            {req.addressee?.username || 'User'}
                          </span>
                          <span className="block text-xs text-discord-muted">
                            Outgoing Request Pending
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onDeclineFriend(req.id)}
                        className="p-2 text-discord-muted hover:text-discord-danger rounded-full transition-colors"
                        title="Cancel Request"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* GROUP INVITES */}
        {activeTab === 'invites' && (
          <div>
            <div className="text-xs font-semibold text-discord-muted uppercase tracking-wider mb-3">
              Group Invitations — {groupInvites.length}
            </div>

            {groupInvites.length === 0 ? (
              <div className="text-center py-16 text-discord-muted">
                <Mail className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="text-base font-semibold">No pending group invitations</p>
                <p className="text-xs mt-1">
                  When a friend invites you to a group, it will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {groupInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between bg-discord-side p-4 rounded-lg border border-discord-border"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-2xl bg-discord-accent text-white flex items-center justify-center font-bold text-lg">
                        {invite.group?.name[0]?.toUpperCase() || 'G'}
                      </div>
                      <div>
                        <div className="font-semibold text-base text-discord-text">
                          {invite.group?.name || 'Group'}
                        </div>
                        <div className="text-xs text-discord-muted">
                          Invited by{' '}
                          <span className="text-discord-text font-medium">
                            @{invite.inviter?.username || 'a friend'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onAcceptGroupInvite(invite.id)}
                        className="px-3 py-1.5 bg-discord-online text-white rounded text-xs font-semibold hover:bg-discord-online/90 transition-colors flex items-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Join</span>
                      </button>
                      <button
                        onClick={() => onDeclineGroupInvite(invite.id)}
                        className="px-3 py-1.5 bg-discord-input text-discord-text rounded text-xs font-semibold hover:bg-discord-side transition-colors flex items-center space-x-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ADD FRIEND TAB */}
        {activeTab === 'add' && (
          <div className="max-w-xl">
            <h3 className="text-lg font-bold text-discord-text mb-1">
              Add Friend
            </h3>
            <p className="text-xs text-discord-muted mb-4">
              You can add friends with their GhostText username. It's case-insensitive!
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  placeholder="You can add friends with their GhostText username"
                  className="w-full bg-[#1e1f22] border border-discord-border rounded-lg px-4 py-3 text-sm text-discord-text focus:outline-none focus:border-discord-accent"
                />
                <button
                  type="submit"
                  disabled={!targetUsername.trim() || submitting}
                  className={`absolute right-2 top-2 px-4 py-1.5 rounded text-xs font-semibold text-white transition-colors ${
                    targetUsername.trim() && !submitting
                      ? 'bg-discord-accent hover:bg-discord-accent-hover'
                      : 'bg-discord-accent/40 cursor-not-allowed'
                  }`}
                >
                  {submitting ? 'Sending...' : 'Send Friend Request'}
                </button>
              </div>

              {statusMsg && (
                <div
                  className={`text-xs px-3 py-2 rounded ${
                    statusMsg.isError
                      ? 'bg-discord-danger/20 text-discord-danger border border-discord-danger/30'
                      : 'bg-discord-online/20 text-discord-online border border-discord-online/30'
                  }`}
                >
                  {statusMsg.text}
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

