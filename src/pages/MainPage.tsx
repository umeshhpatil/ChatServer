import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSound } from '../hooks/useSound';
import { useSocial } from '../hooks/useSocial';
import { useChat } from '../hooks/useChat';
import { usePresence } from '../hooks/usePresence';
import { useChannels } from '../hooks/useChannels';
import { useVoice } from '../hooks/useVoice';
import { useNotifications } from '../hooks/useNotifications';
import { ServerRail } from '../components/layout/ServerRail';
import { SubSidebar } from '../components/layout/SubSidebar';
import { FriendsView } from '../components/friends/FriendsView';
import { ChatArea } from '../components/chat/ChatArea';
import { MemberListDrawer } from '../components/groups/MemberListDrawer';
import { AuthScreen } from '../components/auth/AuthScreen';
import { CreateGroupModal } from '../components/groups/CreateGroupModal';
import { CreateChannelModal } from '../components/groups/CreateChannelModal';
import { DirectInviteModal } from '../components/groups/DirectInviteModal';
import { InviteLinkModal } from '../components/groups/InviteLinkModal';
import { SettingsModal } from '../components/common/SettingsModal';
import { ExploreServersModal } from '../components/servers/ExploreServersModal';
import { VoiceChannelOverlay } from '../components/voice/VoiceChannelOverlay';

export const MainPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  // Auth Hook
  const { user, profile, loading: authLoading, signUp, signIn, signOut } = useAuth();

  // Web Audio Sound Hook
  const {
    isMuted,
    toggleMute,
    playSendSound,
    playReceiveSound,
    playVoiceConnectSound,
    playVoiceDisconnectSound,
    playToggleMicSound,
  } = useSound();

  // Native Browser Notifications Hook
  const { requestPermission, notifyMessage } = useNotifications();

  // WebRTC Voice Channels Hook
  const {
    activeVoiceChannelId,
    activeVoiceChannelName,
    participants: voiceParticipants,
    isMuted: isVoiceMuted,
    isDeafened: isVoiceDeafened,
    isSpeaking: isVoiceSpeaking,
    ping: voicePing,
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMute: toggleVoiceMute,
    toggleDeafen: toggleVoiceDeafen,
  } = useVoice({
    currentUserId: profile?.id ?? null,
    currentUsername: profile?.username ?? null,
    currentAvatarUrl: profile?.avatar_url ?? null,
    playVoiceConnectSound,
    playVoiceDisconnectSound,
    playToggleMicSound,
  });

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

  // Global Realtime Presence (Online, Idle, DND, Offline)
  const { myStatus, updateStatus, getUserStatus } = usePresence(
    profile?.id ?? null,
    profile?.username ?? null
  );

  // UI Navigation State
  const [activeMode, setActiveMode] = useState<'dm' | 'group'>('dm');
  const [activeDmFriendshipId, setActiveDmFriendshipId] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isViewingVoice, setIsViewingVoice] = useState<boolean>(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [isMemberListOpen, setIsMemberListOpen] = useState<boolean>(true);

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

  // If user has groups, auto-select the first server so chat & typing box are open immediately
  useEffect(() => {
    if (groups.length > 0 && !activeGroupId && !activeDmFriendshipId) {
      setActiveMode('group');
      setActiveGroupId(groups[0].id);
    }
  }, [groups, activeGroupId, activeDmFriendshipId]);

  // If user is brand new with 0 servers and 0 friends, automatically initialize a starter server
  const autoCreatedStarterGroup = useRef(false);
  useEffect(() => {
    if (profile && !authLoading && groups.length === 0 && !autoCreatedStarterGroup.current) {
      autoCreatedStarterGroup.current = true;
      createGroup('General Lounge')
        .then((newId) => {
          if (newId) {
            setActiveMode('group');
            setActiveGroupId(newId);
          }
        })
        .catch((err) => console.log('Starter group init:', err));
    }
  }, [profile, authLoading, groups.length, createGroup]);

  // Modal States
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isDirectInviteOpen, setIsDirectInviteOpen] = useState(false);
  const [isInviteLinkOpen, setIsInviteLinkOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);

  // Channels Hook for Active Server
  const {
    channels,
    activeChannelId,
    setActiveChannelId,
    createChannel,
    deleteChannel,
  } = useChannels(activeGroupId);

  // Determine current active chat ID and type
  const activeChatId =
    activeMode === 'dm'
      ? activeDmFriendshipId
      : activeChannelId || activeGroupId;
  const activeChatType = activeChatId ? activeMode : null;

  // Realtime Chat & Offline Dexie Outbox Hook
  const {
    messages,
    loading: chatLoading,
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
  } = useChat({
    chatId: activeChatId,
    chatType: activeChatType,
    currentUserId: profile?.id ?? null,
    currentUsername: profile?.username ?? null,
    playSendSound,
    playReceiveSound,
    onIncomingMessage: (sender, body, avatar) => {
      notifyMessage(`${sender} on GhostText`, body, avatar);
    },
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
    const currentChannel = channels.find((c) => c.id === activeChannelId);
    chatTitle = currentChannel?.name || 'general';
  }

  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const isOwner = Boolean(
    activeGroup && profile && activeGroup.owner_id === profile.id
  );
  const totalPendingNotifications = pendingRequests.length + groupInvites.length;

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] min-h-[100dvh] w-screen overflow-hidden bg-discord-bg relative">
      {/* Mobile Backdrop Overlay */}
      {isMobileNavOpen && (
        <div
          onClick={() => setIsMobileNavOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 md:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Navigation Bars (Server Rail + Sub-Sidebar) */}
      <div
        className={`fixed inset-y-0 left-0 z-40 flex shadow-2xl md:shadow-none transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* 1. Left Rail (Group Icons + DM Home) */}
        <ServerRail
          groups={groups}
          activeMode={activeMode}
          activeGroupId={activeGroupId}
          pendingNotificationCount={totalPendingNotifications}
          isMuted={isMuted}
          onSelectDm={() => {
            setActiveMode('dm');
            setActiveDmFriendshipId(null);
            setIsViewingVoice(false);
            setIsMobileNavOpen(false);
          }}
          onSelectGroup={(groupId) => {
            setActiveMode('group');
            setActiveGroupId(groupId);
            setIsViewingVoice(false);
          }}
          onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
          onOpenExplore={() => setIsExploreOpen(true)}
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
          userStatus={myStatus}
          channels={channels}
          activeChannelId={activeChannelId}
          activeVoiceChannelId={activeVoiceChannelId}
          activeVoiceChannelName={activeVoiceChannelName}
          voicePing={voicePing}
          isVoiceMuted={isVoiceMuted}
          isVoiceDeafened={isVoiceDeafened}
          onSelectFriendsTab={() => {
            setActiveDmFriendshipId(null);
            setIsViewingVoice(false);
            setIsMobileNavOpen(false);
          }}
          onSelectFriendChat={(fId) => {
            setActiveDmFriendshipId(fId);
            setIsViewingVoice(false);
            setIsMobileNavOpen(false);
          }}
          onSelectChannel={(cId) => {
            setActiveChannelId(cId);
            setIsViewingVoice(false);
            setIsMobileNavOpen(false);
          }}
          onOpenCreateChannel={() => setIsCreateChannelOpen(true)}
          onDeleteChannel={deleteChannel}
          onJoinVoiceChannel={(channelId, channelName) => {
            joinVoiceChannel(channelId, channelName);
            setIsViewingVoice(true);
            setIsMobileNavOpen(false);
          }}
          onLeaveVoiceChannel={() => {
            leaveVoiceChannel();
            setIsViewingVoice(false);
          }}
          onToggleVoiceMute={toggleVoiceMute}
          onToggleVoiceDeafen={toggleVoiceDeafen}
          onOpenDirectInvite={() => setIsDirectInviteOpen(true)}
          onOpenInviteLink={() => setIsInviteLinkOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onStatusChange={updateStatus}
          onDeleteGroup={handleDeleteGroup}
          onLeaveGroup={handleLeaveGroup}
        />
      </div>

      {/* 3. Main Center Area */}
      {isViewingVoice && activeVoiceChannelId ? (
        // Voice Channel Overlay Grid
        <VoiceChannelOverlay
          channelName={activeVoiceChannelName || 'Voice Lounge'}
          participants={Array.from(voiceParticipants.values())}
          currentUserId={profile?.id ?? null}
          isMuted={isVoiceMuted}
          isDeafened={isVoiceDeafened}
          isSpeaking={isVoiceSpeaking}
          onDisconnect={() => {
            leaveVoiceChannel();
            setIsViewingVoice(false);
          }}
          onToggleMute={toggleVoiceMute}
          onToggleDeafen={toggleVoiceDeafen}
          onToggleMobileSidebar={() => setIsMobileNavOpen((prev) => !prev)}
          onBackToChat={() => setIsViewingVoice(false)}
        />
      ) : activeMode === 'dm' && activeDmFriendshipId === null ? (
        // Friends Dashboard View
        <FriendsView
          currentProfile={profile}
          friends={friends}
          pendingRequests={pendingRequests}
          groupInvites={groupInvites}
          groups={groups}
          getUserStatus={getUserStatus}
          onStartChat={(fId) => {
            setActiveDmFriendshipId(fId);
            setIsMobileNavOpen(false);
          }}
          onAcceptFriend={acceptFriendRequest}
          onDeclineFriend={declineFriendRequest}
          onAcceptGroupInvite={acceptGroupInvite}
          onDeclineGroupInvite={declineGroupInvite}
          onSendFriendRequest={sendFriendRequest}
          onToggleMobileSidebar={() => setIsMobileNavOpen((prev) => !prev)}
          onSelectGroup={(groupId) => {
            setActiveMode('group');
            setActiveGroupId(groupId);
            setIsMobileNavOpen(false);
          }}
          onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
        />
      ) : (
        // Active Chat Area + Server Member List (when in group mode)
        <div className="flex-1 flex h-[100dvh] max-h-[100dvh] min-h-0 min-w-0 overflow-hidden relative">
          <ChatArea
            title={chatTitle}
            isGroup={activeMode === 'group'}
            messages={messages}
            currentUserId={profile?.id ?? null}
            currentUsername={profile?.username ?? null}
            loading={chatLoading}
            isOnline={isOnline}
            isFlushingOutbox={isFlushingOutbox}
            isAdmin={isOwner}
            typingUsers={typingUsers}
            isSelfTyping={isSelfTyping}
            isMemberListOpen={isMemberListOpen}
            onSendMessage={sendMessage}
            onEditMessage={editMessage}
            onDeleteMessage={deleteMessage}
            onTogglePin={togglePin}
            onTyping={sendTyping}
            onToggleReaction={toggleReaction}
            onFlushOutbox={flushOutbox}
            onToggleMobileSidebar={() => setIsMobileNavOpen((prev) => !prev)}
            onToggleMemberList={() => setIsMemberListOpen((prev) => !prev)}
          />
          {activeMode === 'group' && (
            <MemberListDrawer
              groupId={activeGroupId}
              isOpen={isMemberListOpen}
              onClose={() => setIsMemberListOpen(false)}
              getUserStatus={getUserStatus}
            />
          )}
        </div>
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

      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        onCreateChannel={createChannel}
      />

      <ExploreServersModal
        isOpen={isExploreOpen}
        onClose={() => setIsExploreOpen(false)}
        onJoinServer={async (serverName) => {
          const newId = await createGroup(serverName);
          if (newId) {
            setActiveMode('group');
            setActiveGroupId(newId);
          }
          setIsExploreOpen(false);
        }}
        existingGroups={groups}
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

