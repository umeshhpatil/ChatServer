import React from 'react';
import { Mic, MicOff, PhoneOff, Headphones, Volume2, Menu, MessageSquare } from 'lucide-react';
import type { VoiceParticipant } from '../../hooks/useVoice';

interface VoiceChannelOverlayProps {
  channelName: string;
  participants: VoiceParticipant[];
  currentUserId: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  onDisconnect: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onToggleMobileSidebar?: () => void;
  onBackToChat?: () => void;
}

export const VoiceChannelOverlay: React.FC<VoiceChannelOverlayProps> = ({
  channelName,
  participants,
  currentUserId,
  isMuted,
  isDeafened,
  isSpeaking,
  onDisconnect,
  onToggleMute,
  onToggleDeafen,
  onToggleMobileSidebar,
  onBackToChat,
}) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1f22] relative overflow-hidden select-none">
      {/* Voice Header */}
      <div className="h-12 border-b border-discord-border px-4 flex items-center justify-between bg-discord-bg flex-shrink-0 shadow-sm">
        <div className="flex items-center space-x-2">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="md:hidden p-1.5 -ml-1 mr-1 rounded text-discord-muted hover:text-discord-text hover:bg-discord-input transition-colors flex-shrink-0"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <Volume2 className="w-5 h-5 text-discord-online animate-pulse" />
          <span className="font-bold text-discord-text text-base">{channelName}</span>
          <span className="text-xs text-discord-muted bg-discord-side px-2 py-0.5 rounded-full font-medium">
            {participants.length} connected
          </span>
        </div>

        {onBackToChat && (
          <button
            onClick={onBackToChat}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-discord-side hover:bg-discord-input text-discord-text text-xs font-semibold transition-colors"
            title="Switch back to text chat while staying in call"
          >
            <MessageSquare className="w-4 h-4 text-discord-accent" />
            <span className="hidden sm:inline">Text Chat</span>
          </button>
        )}
      </div>

      {/* Voice Participant Grid */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6 w-full max-w-4xl justify-items-center">
          {participants.map((p) => {
            const isMe = p.id === currentUserId;
            const speaking = isMe ? isSpeaking : p.isSpeaking;
            const muted = isMe ? isMuted : p.isMuted;
            const avatarUrl =
              p.avatar_url ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${p.username}`;

            return (
              <div
                key={p.id}
                className="flex flex-col items-center justify-center bg-discord-side/80 border border-discord-border/80 rounded-2xl p-4 sm:p-6 w-full aspect-square max-w-[200px] shadow-lg relative group transition-all"
              >
                {/* Avatar with dynamic glowing speaking ring */}
                <div className="relative mb-3">
                  <img
                    src={avatarUrl}
                    alt={p.username}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-discord-rail object-cover transition-all ${
                      speaking
                        ? 'ring-4 ring-discord-online ring-offset-2 ring-offset-discord-side scale-105 shadow-[0_0_15px_rgba(35,165,89,0.5)]'
                        : 'ring-2 ring-discord-border/60'
                    }`}
                  />

                  {/* Muted Icon Badge */}
                  {muted && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-discord-danger text-white flex items-center justify-center shadow-md">
                      <MicOff className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                {/* Username */}
                <span className="font-semibold text-xs sm:text-sm text-discord-text truncate max-w-[140px] text-center">
                  {p.username} {isMe && '(You)'}
                </span>

                {/* Speaking indicator label */}
                {speaking && (
                  <span className="text-[10px] text-discord-online font-bold mt-0.5 animate-pulse">
                    Speaking...
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Bottom Control Dock */}
      <div className="p-4 flex items-center justify-center bg-discord-bg/80 border-t border-discord-border backdrop-blur-md flex-shrink-0">
        <div className="flex items-center space-x-3 bg-discord-side px-4 py-2 rounded-2xl border border-discord-border shadow-2xl">
          <button
            onClick={onToggleMute}
            className={`p-3 rounded-full transition-all ${
              isMuted
                ? 'bg-discord-danger text-white hover:bg-discord-danger/90'
                : 'bg-discord-input text-discord-text hover:bg-discord-border'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={onToggleDeafen}
            className={`p-3 rounded-full transition-all ${
              isDeafened
                ? 'bg-discord-danger text-white hover:bg-discord-danger/90'
                : 'bg-discord-input text-discord-text hover:bg-discord-border'
            }`}
            title={isDeafened ? 'Undeafen' : 'Deafen'}
          >
            <Headphones className="w-5 h-5" />
          </button>

          <button
            onClick={onDisconnect}
            className="p-3 rounded-full bg-discord-danger text-white hover:bg-discord-danger/90 transition-all shadow-md"
            title="Disconnect Call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
