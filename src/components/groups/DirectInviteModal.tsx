import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import type { Friendship, Profile } from '../../types/database';

interface DirectInviteModalProps {
  isOpen: boolean;
  groupId: string | null;
  groupName: string;
  currentProfile: Profile | null;
  friends: Friendship[];
  onClose: () => void;
  onDirectInvite: (groupId: string, friendUserId: string) => Promise<void>;
}

export const DirectInviteModal: React.FC<DirectInviteModalProps> = ({
  isOpen,
  groupId,
  groupName,
  currentProfile,
  friends,
  onClose,
  onDirectInvite,
}) => {
  const [invitedMap, setInvitedMap] = useState<Record<string, boolean>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !groupId) return null;

  const handleInvite = async (friendUserId: string) => {
    setLoadingMap((prev) => ({ ...prev, [friendUserId]: true }));
    setError(null);
    try {
      await onDirectInvite(groupId, friendUserId);
      setInvitedMap((prev) => ({ ...prev, [friendUserId]: true }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setLoadingMap((prev) => ({ ...prev, [friendUserId]: false }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-discord-side w-full max-w-md rounded-lg overflow-hidden shadow-2xl border border-discord-border animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-discord-muted hover:text-discord-text p-1"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-lg font-bold text-discord-text mb-1">
            Invite friends to {groupName}
          </h2>
          <p className="text-xs text-discord-muted mb-4">
            Select from your friends list to send an instant direct invite.
          </p>

          {error && (
            <div className="text-xs text-discord-danger bg-discord-danger/10 p-2 rounded mb-3">
              {error}
            </div>
          )}

          {friends.length === 0 ? (
            <p className="text-xs text-discord-muted py-6 text-center italic">
              You haven't added any friends yet. Add friends first to invite them directly!
            </p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {friends.map((f) => {
                const friend =
                  f.requester_id === currentProfile?.id
                    ? f.addressee
                    : f.requester;
                if (!friend) return null;

                const isInvited = Boolean(invitedMap[friend.id]);
                const isLoading = Boolean(loadingMap[friend.id]);

                return (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-discord-input/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={
                          friend.avatar_url ||
                          `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.username}`
                        }
                        alt="Avatar"
                        className="w-8 h-8 rounded-full bg-discord-rail"
                      />
                      <span className="text-sm font-medium text-discord-text">
                        {friend.username}
                      </span>
                    </div>

                    <button
                      onClick={() => handleInvite(friend.id)}
                      disabled={isInvited || isLoading}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-colors flex items-center space-x-1 ${
                        isInvited
                          ? 'border border-discord-online text-discord-online'
                          : 'bg-discord-accent text-white hover:bg-discord-accent-hover'
                      }`}
                    >
                      {isInvited ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Sent</span>
                        </>
                      ) : isLoading ? (
                        <span>Inviting...</span>
                      ) : (
                        <span>Invite</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5 pt-3 border-t border-discord-border flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-discord-input text-discord-text hover:bg-discord-border rounded text-xs font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

