import React from 'react';
import { Compass, Users, Sparkles, X, Plus } from 'lucide-react';
import type { Group } from '../../types/database';

interface ExploreServersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinServer: (serverName: string) => Promise<void>;
  existingGroups: Group[];
}

const PUBLIC_COMMUNITIES = [
  {
    name: 'Developers & Code',
    description: 'A global community of full-stack engineers, designers, and open-source creators.',
    members: '1,420 members',
    icon: '💻',
    tag: 'Technology',
  },
  {
    name: 'Gaming & Chill',
    description: 'Find squad mates, discuss games, share clips, and hang out in voice lounges.',
    members: '2,890 members',
    icon: '🎮',
    tag: 'Gaming',
  },
  {
    name: 'Music & Lo-Fi Lounge',
    description: 'Share playlists, jam together, discuss synthesizers, and relax to chill beats.',
    members: '870 members',
    icon: '🎵',
    tag: 'Music',
  },
  {
    name: 'AI & Future Tech',
    description: 'Discussing neural networks, agentic workflows, automation, and tech news.',
    members: '3,150 members',
    tag: 'AI',
    icon: '🤖',
  },
];

export const ExploreServersModal: React.FC<ExploreServersModalProps> = ({
  isOpen,
  onClose,
  onJoinServer,
  existingGroups,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-discord-side border border-discord-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-discord-accent/40 via-[#5865F2]/20 to-discord-side p-6 border-b border-discord-border relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-discord-side/80 text-discord-muted hover:text-discord-text hover:bg-discord-input transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 text-discord-accent font-bold text-xs uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" />
            <span>Discover Communities</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-discord-text">
            Explore Public Servers
          </h2>
          <p className="text-xs sm:text-sm text-discord-muted mt-1 max-w-md">
            Join public spaces to chat with like-minded creators, gamers, and developers.
          </p>
        </div>

        {/* Server Cards List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {PUBLIC_COMMUNITIES.map((community) => {
            const alreadyJoined = existingGroups.some(
              (g) => g.name.toLowerCase() === community.name.toLowerCase()
            );

            return (
              <div
                key={community.name}
                className="bg-discord-bg/80 border border-discord-border/80 hover:border-discord-accent/50 rounded-xl p-4 flex items-center justify-between transition-all group shadow-sm"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-discord-side flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
                    {community.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-sm sm:text-base text-discord-text truncate group-hover:text-white">
                        {community.name}
                      </h4>
                      <span className="text-[10px] font-semibold bg-discord-side text-discord-muted px-2 py-0.5 rounded-full">
                        {community.tag}
                      </span>
                    </div>
                    <p className="text-xs text-discord-muted mt-0.5 line-clamp-1 max-w-md">
                      {community.description}
                    </p>
                    <div className="flex items-center space-x-1.5 text-[11px] text-discord-online mt-1 font-medium">
                      <Users className="w-3 h-3" />
                      <span>{community.members}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onJoinServer(community.name);
                    onClose();
                  }}
                  disabled={alreadyJoined}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow flex-shrink-0 ml-3 ${
                    alreadyJoined
                      ? 'bg-discord-input text-discord-muted cursor-default'
                      : 'bg-discord-accent hover:bg-discord-accent-hover text-white'
                  }`}
                >
                  {alreadyJoined ? 'Joined' : 'Join Server'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

