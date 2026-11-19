import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSound } from '../hooks/useSound';
import { useSocial } from '../hooks/useSocial';
import { useChat } from '../hooks/useChat';
import { ServerRail } from '../components/layout/ServerRail';
import { SubSidebar } from '../components/layout/SubSidebar';
import { FriendsView } from '../components/friends/FriendsView';
import { ChatArea } from '../components/chat/ChatArea';
import { AuthScreen } from '../components/auth/AuthScreen';
import { CreateGroupModal } from '../components/groups/CreateGroupModal';
import { DirectInviteModal } from '../components/groups/DirectInviteModal';
import { InviteLinkModal } from '../components/groups/InviteLinkModal';
import { SettingsModal } from '../components/common/SettingsModal';

export const MainPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  // Auth Hook
  const { user, profile, loading: authLoading, signUp, signIn, signOut } = useAuth();

  // Web Audio Sound Hook
  const { isMuted, toggleMute, playSendSound, playReceiveSound } = useSound();

  // Social & Groups Hook
  const {
    friends,
    pendingRequests,
    groups,
    groupInvites,
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
  } = useSocial({
    userId: profile?.id ?? null,
    playReceiveSound,
  });

  // UI Navigation State
  const [activeMode, setActiveMode] = useState<'dm' | 'group'>('dm');
  const [activeDmFriendshipId, setActiveDmFriendshipId] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  const handleDeleteGroup = async (groupId: string) => {
    await deleteGroup(groupId);
    if (activeGroupId === groupId) {
      setActiveMode('dm');
      setActiveGroupId(null);
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    await leaveGroup(groupId);
    if (activeGroupId === groupId) {
      setActiveMode('dm');
      setActiveGroupId(null);
    }
  };

  // Check URL query param e.g. /?group=xxx after join
  useEffect(() => {
    const groupParam = searchParams.get('group');
    if (groupParam) {
      setActiveMode('group');
      setActiveGroupId(groupParam);
    }
  }, [searchParams]);

  // Modal States
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isDirectInviteOpen, setIsDirectInviteOpen] = useState(false);
  const [isInviteLinkOpen, setIsInviteLinkOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Determine current active chat ID and type
  const activeChatId =
    activeMode === 'dm' ? activeDmFriendshipId : activeGroupId;
  const activeChatType = activeChatId ? activeMode : null;

  // Realtime Chat & Offline Dexie Outbox Hook
  const {
    messages,
    loading: chatLoading,
    isOnline,
    isFlushingOutbox,
    sendMessage,
    flushOutbox,
  } = useChat({
    chatId: activeChatId,
    chatType: activeChatType,
    currentUserId: profile?.id ?? null,
    playSendSound,
    playReceiveSound,
  });

  // Loading screen during initial session check
  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-[#1e1f22] flex items-center justify-center text-discord-muted text-sm">
        <div className="animate-pulse flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-discord-accent flex items-center justify-center text-white font-bold">
            G
          </div>
          <span>Loading GhostText...</span>
        </div>
      </div>
    );
  }

  // Not signed in -> Render Auth Screen
  if (!user) {
    return <AuthScreen onSignUp={signUp} onSignIn={signIn} />;
  }

  // Find active chat details
  let chatTitle = 'Chat';
  if (activeMode === 'dm') {
    const activeFriendship = friends.find((f) => f.id === activeDmFriendshipId);
    if (activeFriendship) {
      const friend =
        activeFriendship.requester_id === profile?.id
          ? activeFriendship.addressee
          : activeFriendship.requester;
      chatTitle = friend?.username || 'Friend';
    }
  } else {
    const currentGroup = groups.find((g) => g.id === activeGroupId);
    chatTitle = currentGroup?.name || 'general';
  }

  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const totalPendingNotifications = pendingRequests.length + groupInvites.length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-discord-bg">
      {/* 1. Left Rail (Group Icons + DM Home) */}
      <ServerRail
        groups={groups}
        activeMode={activeMode}
        activeGroupId={activeGroupId}
        pendingNotificationCount={totalPendingNotifications}
        isMuted={isMuted}
        onSelectDm={() => {
          setActiveMode('dm');
          setActiveDmFriendshipId(null); // Return to Friends dashboard
        }}
        onSelectGroup={(groupId) => {
          setActiveMode('group');
          setActiveGroupId(groupId);
        }}
        onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
        onToggleMute={toggleMute}
        onSignOut={signOut}
      />

      {/* 2. Sub-Sidebar (Friends List or Group Channels) */}
      <SubSidebar
        activeMode={activeMode}
        activeDmFriendshipId={activeDmFriendshipId}
        activeGroupId={activeGroupId}
        groups={groups}
        friends={friends}
        currentProfile={profile}
        pendingTotal={totalPendingNotifications}
        onSelectFriendsTab={() => setActiveDmFriendshipId(null)}
        onSelectFriendChat={(fId) => setActiveDmFriendshipId(fId)}
        onOpenDirectInvite={() => setIsDirectInviteOpen(true)}
        onOpenInviteLink={() => setIsInviteLinkOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onDeleteGroup={handleDeleteGroup}
        onLeaveGroup={handleLeaveGroup}
      />

      {/* 3. Main Center Area */}
      {activeMode === 'dm' && activeDmFriendshipId === null ? (
        // Friends Dashboard View
        <FriendsView
          currentProfile={profile}
          friends={friends}
          pendingRequests={pendingRequests}
          groupInvites={groupInvites}
          onStartChat={(fId) => setActiveDmFriendshipId(fId)}
          onAcceptFriend={acceptFriendRequest}
          onDeclineFriend={declineFriendRequest}
          onAcceptGroupInvite={acceptGroupInvite}
          onDeclineGroupInvite={declineGroupInvite}
          onSendFriendRequest={sendFriendRequest}
        />
      ) : (
        // Active Chat Area (Direct Message or Group Chat)
        <ChatArea
          title={chatTitle}
          isGroup={activeMode === 'group'}
          messages={messages}
          currentUserId={profile?.id ?? null}
          loading={chatLoading}
          isOnline={isOnline}
          isFlushingOutbox={isFlushingOutbox}
          onSendMessage={sendMessage}
          onFlushOutbox={flushOutbox}
        />
      )}

      {/* Modals */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onCreateGroup={createGroup}
        onGroupCreated={(newGroupId) => {
          setActiveMode('group');
          setActiveGroupId(newGroupId);
        }}
      />

      <DirectInviteModal
        isOpen={isDirectInviteOpen}
        groupId={activeGroupId}
        groupName={activeGroup?.name || 'Group'}
        currentProfile={profile}
        friends={friends}
        onClose={() => setIsDirectInviteOpen(false)}
        onDirectInvite={directInviteFriend}
      />

      <InviteLinkModal
        isOpen={isInviteLinkOpen}
        groupId={activeGroupId}
        groupName={activeGroup?.name || 'Group'}
        onClose={() => setIsInviteLinkOpen(false)}
        onCreateInviteLink={createInviteLink}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        currentProfile={profile}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onTestSendSound={playSendSound}
        onTestReceiveSound={() => playReceiveSound(true)}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

