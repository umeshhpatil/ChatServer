import React from 'react';
import { X, Volume2, VolumeX, Moon, Shield, Database } from 'lucide-react';
import type { Profile } from '../../types/database';

interface SettingsModalProps {
  isOpen: boolean;
  currentProfile: Profile | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onTestSendSound: () => void;
  onTestReceiveSound: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  currentProfile,
  isMuted,
  onToggleMute,
  onTestSendSound,
  onTestReceiveSound,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4">
      <div className="bg-discord-side w-full max-w-lg rounded-lg overflow-hidden shadow-2xl border border-discord-border animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        <div className="p-4 sm:p-6 relative overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-discord-muted hover:text-discord-text p-1"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-xl font-bold text-discord-text mb-4">
            User Settings
          </h2>

          <div className="space-y-6">
            {/* User Profile Card */}
            <div className="bg-discord-bg p-4 rounded-lg flex items-center space-x-4 border border-discord-border">
              <img
                src={
                  currentProfile?.avatar_url ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${currentProfile?.username || 'me'}`
                }
                alt="Avatar"
                className="w-14 h-14 rounded-full bg-discord-rail"
              />
              <div>
                <h3 className="font-bold text-base text-discord-text">
                  {currentProfile?.username || 'User'}
                </h3>
                <p className="text-xs text-discord-muted font-mono mt-0.5">
                  ID: {currentProfile?.id || '—'}
                </p>
                <div className="flex items-center space-x-1.5 mt-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-discord-online" />
                  <span className="text-xs text-discord-online font-medium">Online</span>
                </div>
              </div>
            </div>

            {/* Sound & Notifications Settings */}
            <div>
              <h4 className="text-xs font-bold text-discord-muted uppercase tracking-wider mb-3">
                Sound Effects (Web Audio API)
              </h4>
              <div className="bg-discord-bg p-4 rounded-lg border border-discord-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {isMuted ? (
                      <VolumeX className="w-5 h-5 text-discord-danger" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-discord-accent" />
                    )}
                    <div>
                      <div className="text-sm font-semibold text-discord-text">
                        App Sounds
                      </div>
                      <div className="text-xs text-discord-muted">
                        Incoming Ping (880Hz-1320Hz) & Outgoing Whoosh (500Hz-900Hz)
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={onToggleMute}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      !isMuted ? 'bg-discord-online' : 'bg-discord-input'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        !isMuted ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex space-x-2 pt-2 border-t border-discord-border">
                  <button
                    onClick={onTestSendSound}
                    className="px-3 py-1.5 bg-discord-input hover:bg-discord-border text-discord-text text-xs font-medium rounded transition-colors"
                  >
                    Test Send Sound (Whoosh)
                  </button>
                  <button
                    onClick={onTestReceiveSound}
                    className="px-3 py-1.5 bg-discord-input hover:bg-discord-border text-discord-text text-xs font-medium rounded transition-colors"
                  >
                    Test Receive Sound (Ping)
                  </button>
                </div>
              </div>
            </div>

            {/* Offline & Caching Status */}
            <div>
              <h4 className="text-xs font-bold text-discord-muted uppercase tracking-wider mb-3">
                Offline Resilience & Theme
              </h4>
              <div className="bg-discord-bg p-4 rounded-lg border border-discord-border space-y-3 text-xs text-discord-muted">
                <div className="flex items-center space-x-2 text-discord-text">
                  <Database className="w-4 h-4 text-discord-online" />
                  <span className="font-semibold">IndexedDB Outbox & Cache Active (Dexie)</span>
                </div>
                <p>
                  Messages are saved locally and queued if your internet drops. Flushes automatically upon reconnection.
                </p>

                <div className="flex items-center space-x-2 text-discord-text pt-2 border-t border-discord-border">
                  <Moon className="w-4 h-4 text-discord-accent" />
                  <span className="font-semibold">Discord Dark Theme Default</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-discord-border flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-discord-accent hover:bg-discord-accent-hover text-white rounded text-xs font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

