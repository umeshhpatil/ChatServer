import React from 'react';
import { Hash, AtSign, Wifi, WifiOff, RefreshCw, Menu, Users, Pin } from 'lucide-react';

interface ChatHeaderProps {
  title: string;
  isGroup: boolean;
  isOnline: boolean;
  isFlushingOutbox: boolean;
  isMemberListOpen?: boolean;
  pinnedCount?: number;
  onFlushOutbox?: () => void;
  onToggleMobileSidebar?: () => void;
  onToggleMemberList?: () => void;
  onOpenPinned?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  isGroup,
  isOnline,
  isFlushingOutbox,
  isMemberListOpen = false,
  pinnedCount = 0,
  onFlushOutbox,
  onToggleMobileSidebar,
  onToggleMemberList,
  onOpenPinned,
}) => {
  return (
    <div className="h-12 border-b border-discord-border px-3 sm:px-4 flex items-center justify-between shadow-sm bg-discord-bg flex-shrink-0">
      <div className="flex items-center space-x-2 min-w-0">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 -ml-1 mr-1.5 rounded-lg text-discord-text bg-discord-side/80 hover:bg-discord-input border border-discord-border/60 transition-colors flex-shrink-0 active:scale-95 shadow-sm"
          title="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {isGroup ? (
          <Hash className="w-5 h-5 sm:w-6 sm:h-6 text-discord-muted flex-shrink-0" />
        ) : (
          <AtSign className="w-4 h-4 sm:w-5 sm:h-5 text-discord-muted flex-shrink-0" />
        )}
        <span className="font-bold text-discord-text text-sm sm:text-base truncate">{title}</span>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
        {/* Offline / Online connection status badge */}
        {!isOnline ? (
          <div className="flex items-center space-x-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-discord-warn/20 border border-discord-warn/40 text-discord-warn text-[11px] sm:text-xs font-medium">
            <WifiOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden xs:inline sm:inline">Offline (Queued)</span>
            <span className="inline sm:hidden">Offline</span>
          </div>
        ) : isFlushingOutbox ? (
          <div className="flex items-center space-x-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-discord-accent/20 border border-discord-accent/40 text-discord-accent text-[11px] sm:text-xs font-medium animate-pulse">
            <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
            <span className="hidden sm:inline">Syncing...</span>
          </div>
        ) : (
          <button
            onClick={onFlushOutbox}
            className="flex items-center space-x-1.5 px-1.5 py-0.5 rounded text-discord-muted hover:text-discord-online text-xs font-medium transition-colors"
            title="Online and connected"
          >
            <Wifi className="w-3.5 h-3.5 text-discord-online" />
            <span className="text-discord-online text-[11px] sm:text-xs hidden sm:inline">Connected</span>
          </button>
        )}
        {/* Pinned Messages Button */}
        {onOpenPinned && (
          <button
            onClick={onOpenPinned}
            className={`p-1.5 rounded transition-colors relative ${
              pinnedCount > 0
                ? 'text-amber-400 hover:bg-amber-400/10'
                : 'text-discord-muted hover:text-discord-text hover:bg-discord-input/60'
            }`}
            title={`Pinned Messages (${pinnedCount})`}
          >
            <Pin className="w-4 h-4 sm:w-5 sm:h-5" />
            {pinnedCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-400 text-black text-[9px] font-bold px-1 rounded-full">
                {pinnedCount}
              </span>
            )}
          </button>
        )}

        {/* Server Member List Drawer Toggle (only for groups) */}
        {isGroup && onToggleMemberList && (
          <button
            onClick={onToggleMemberList}
            className={`p-1.5 rounded transition-colors ${
              isMemberListOpen
                ? 'bg-discord-input text-discord-text'
                : 'text-discord-muted hover:text-discord-text hover:bg-discord-input/60'
            }`}
            title="Toggle Member List"
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

