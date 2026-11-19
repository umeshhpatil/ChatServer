import React from 'react';
import { MessageSquare, Plus, Volume2, VolumeX, LogOut, Compass } from 'lucide-react';
import type { Group } from '../../types/database';

interface ServerRailProps {
  groups: Group[];
  activeMode: 'dm' | 'group';
  activeGroupId: string | null;
  pendingNotificationCount: number;
  isMuted: boolean;
  onSelectDm: () => void;
  onSelectGroup: (groupId: string) => void;
  onOpenCreateGroup: () => void;
  onOpenExplore?: () => void;
  onToggleMute: () => void;
  onSignOut: () => void;
}

export const ServerRail: React.FC<ServerRailProps> = ({
  groups,
  activeMode,
  activeGroupId,
  pendingNotificationCount,
  isMuted,
  onSelectDm,
  onSelectGroup,
  onOpenCreateGroup,
  onOpenExplore,
  onToggleMute,
  onSignOut,
}) => {
  return (
    <div className="w-[72px] bg-discord-rail flex flex-col items-center py-3 select-none flex-shrink-0 z-20">
      {/* DM Home Button */}
      <div className="relative group flex items-center justify-center w-full mb-2">
        {/* Pill indicator */}
        <div
          className={`absolute left-0 w-1 bg-white rounded-r transition-all duration-200 ${
            activeMode === 'dm'
              ? 'h-10'
              : 'h-2 group-hover:h-5 opacity-0 group-hover:opacity-100'
          }`}
        />
        <button
          onClick={onSelectDm}
          className={`w-12 h-12 flex items-center justify-center transition-all duration-200 ${
            activeMode === 'dm'
              ? 'bg-discord-accent text-white rounded-2xl'
              : 'bg-discord-side text-discord-text hover:bg-discord-accent hover:text-white rounded-3xl hover:rounded-2xl'
          }`}
          title="Direct Messages"
        >
          <MessageSquare className="w-6 h-6" />
        </button>

        {pendingNotificationCount > 0 && (
          <span className="absolute -top-1 right-2 bg-discord-danger text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full border-2 border-discord-rail">
            {pendingNotificationCount}
          </span>
        )}
      </div>

      <div className="w-8 h-[2px] bg-discord-border rounded my-1" />

      {/* Groups List */}
      <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center space-y-2 py-2">
        {groups.map((group) => {
          const isActive = activeMode === 'group' && activeGroupId === group.id;
          const initials = group.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 3)
            .toUpperCase();

          return (
            <div
              key={group.id}
              className="relative group flex items-center justify-center w-full"
            >
              <div
                className={`absolute left-0 w-1 bg-white rounded-r transition-all duration-200 ${
                  isActive
                    ? 'h-10'
                    : 'h-2 group-hover:h-5 opacity-0 group-hover:opacity-100'
                }`}
              />
              <button
                onClick={() => onSelectGroup(group.id)}
                className={`w-12 h-12 flex items-center justify-center font-semibold text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-discord-accent text-white rounded-2xl'
                    : 'bg-discord-side text-discord-text hover:bg-discord-accent hover:text-white rounded-3xl hover:rounded-2xl'
                }`}
                title={group.name}
              >
                {initials || 'G'}
              </button>
            </div>
          );
        })}

        {/* Add Group Button */}
        <div className="group flex items-center justify-center w-full">
          <button
            onClick={onOpenCreateGroup}
            className="w-12 h-12 bg-discord-side text-discord-online hover:bg-discord-online hover:text-white rounded-3xl hover:rounded-2xl flex items-center justify-center transition-all duration-200 shadow"
            title="Create a Server"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Explore Public Communities Button */}
        {onOpenExplore && (
          <div className="group flex items-center justify-center w-full pt-1">
            <button
              onClick={onOpenExplore}
              className="w-12 h-12 bg-discord-side text-discord-accent hover:bg-discord-accent hover:text-white rounded-3xl hover:rounded-2xl flex items-center justify-center transition-all duration-200 shadow"
              title="Explore Public Servers"
            >
              <Compass className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom utility buttons */}
      <div className="flex flex-col items-center space-y-3 pt-2">
        {/* Mute/Unmute audio button */}
        <button
          onClick={onToggleMute}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            isMuted
              ? 'text-discord-danger hover:bg-discord-input'
              : 'text-discord-muted hover:text-discord-text hover:bg-discord-input'
          }`}
          title={isMuted ? 'Sound Muted (Click to Unmute)' : 'Sound Enabled (Click to Mute)'}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* Logout */}
        <button
          onClick={onSignOut}
          className="w-10 h-10 rounded-full text-discord-muted hover:text-discord-danger hover:bg-discord-input flex items-center justify-center transition-colors"
          title="Log Out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

