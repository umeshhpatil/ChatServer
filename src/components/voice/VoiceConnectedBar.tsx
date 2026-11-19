import React from 'react';
import { Wifi, PhoneOff, Mic, MicOff, Headphones } from 'lucide-react';

interface VoiceConnectedBarProps {
  channelName: string;
  ping: number;
  isMuted: boolean;
  isDeafened: boolean;
  onDisconnect: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
}

export const VoiceConnectedBar: React.FC<VoiceConnectedBarProps> = ({
  channelName,
  ping,
  isMuted,
  isDeafened,
  onDisconnect,
  onToggleMute,
  onToggleDeafen,
}) => {
  return (
    <div className="bg-[#111214] border-t border-discord-border/60 px-3 py-2 flex flex-col space-y-1.5 flex-shrink-0">
      {/* Status & Channel */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5 min-w-0">
          <Wifi className="w-3.5 h-3.5 text-discord-online flex-shrink-0 animate-pulse" />
          <div className="flex flex-col min-w-0">
            <span className="text-discord-online font-semibold text-[11px] leading-tight truncate">
              Voice Connected
            </span>
            <span className="text-discord-muted text-[10px] leading-tight truncate">
              {channelName} / {ping}ms
            </span>
          </div>
        </div>

        {/* Disconnect Call Button */}
        <button
          onClick={onDisconnect}
          className="p-1 rounded text-discord-muted hover:text-discord-danger hover:bg-discord-input/60 transition-colors"
          title="Disconnect from voice"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>

      {/* Voice Controls: Mic Mute & Deafen */}
      <div className="flex items-center justify-around pt-0.5 border-t border-discord-border/30">
        <button
          onClick={onToggleMute}
          className={`p-1.5 rounded transition-colors flex items-center justify-center flex-1 mx-0.5 ${
            isMuted
              ? 'text-discord-danger bg-discord-danger/10 hover:bg-discord-danger/20'
              : 'text-discord-muted hover:text-discord-text hover:bg-discord-input/60'
          }`}
          title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <button
          onClick={onToggleDeafen}
          className={`p-1.5 rounded transition-colors flex items-center justify-center flex-1 mx-0.5 ${
            isDeafened
              ? 'text-discord-danger bg-discord-danger/10 hover:bg-discord-danger/20'
              : 'text-discord-muted hover:text-discord-text hover:bg-discord-input/60'
          }`}
          title={isDeafened ? 'Undeafen Audio' : 'Deafen Audio'}
        >
          <Headphones className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
