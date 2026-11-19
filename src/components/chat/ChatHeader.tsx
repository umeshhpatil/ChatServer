import React from 'react';
import { Hash, AtSign, Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface ChatHeaderProps {
  title: string;
  isGroup: boolean;
  isOnline: boolean;
  isFlushingOutbox: boolean;
  onFlushOutbox?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  isGroup,
  isOnline,
  isFlushingOutbox,
  onFlushOutbox,
}) => {
  return (
    <div className="h-12 border-b border-discord-border px-4 flex items-center justify-between shadow-sm bg-discord-bg flex-shrink-0">
      <div className="flex items-center space-x-2">
        {isGroup ? (
          <Hash className="w-6 h-6 text-discord-muted" />
        ) : (
          <AtSign className="w-5 h-5 text-discord-muted" />
        )}
        <span className="font-bold text-discord-text text-base">{title}</span>
      </div>

      <div className="flex items-center space-x-3">
        {/* Offline / Online connection status badge */}
        {!isOnline ? (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-discord-warn/20 border border-discord-warn/40 text-discord-warn text-xs font-medium">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Offline (Queuing msgs)</span>
          </div>
        ) : isFlushingOutbox ? (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-discord-accent/20 border border-discord-accent/40 text-discord-accent text-xs font-medium animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Syncing outbox...</span>
          </div>
        ) : (
          <button
            onClick={onFlushOutbox}
            className="flex items-center space-x-1.5 px-2 py-0.5 rounded text-discord-muted hover:text-discord-online text-xs font-medium transition-colors"
            title="Online and connected"
          >
            <Wifi className="w-3.5 h-3.5 text-discord-online" />
            <span className="text-discord-online text-xs">Connected</span>
          </button>
        )}
      </div>
    </div>
  );
};

