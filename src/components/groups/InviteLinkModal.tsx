import React, { useState } from 'react';
import { X, Copy, Check, Link as LinkIcon } from 'lucide-react';

interface InviteLinkModalProps {
  isOpen: boolean;
  groupId: string | null;
  groupName: string;
  onClose: () => void;
  onCreateInviteLink: (groupId: string) => Promise<string>;
}

export const InviteLinkModal: React.FC<InviteLinkModalProps> = ({
  isOpen,
  groupId,
  groupName,
  onClose,
  onCreateInviteLink,
}) => {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !groupId) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const code = await onCreateInviteLink(groupId);
      setInviteCode(code);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate link. Note: Only Group Admins and Owners can generate links.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inviteUrl = inviteCode
    ? `${window.location.origin}/join/${inviteCode}`
    : '';

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            Shareable Invite Link
          </h2>
          <p className="text-xs text-discord-muted mb-4">
            Invite anyone to join <span className="text-discord-text font-semibold">{groupName}</span> with a shareable URL.
          </p>

          {error && (
            <div className="text-xs text-discord-danger bg-discord-danger/10 p-2 rounded mb-3">
              {error}
            </div>
          )}

          {!inviteCode ? (
            <div className="text-center py-4">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-5 py-2.5 bg-discord-accent hover:bg-discord-accent-hover text-white rounded text-sm font-semibold transition-colors flex items-center justify-center space-x-2 mx-auto"
              >
                <LinkIcon className="w-4 h-4" />
                <span>{loading ? 'Generating...' : 'Generate New Link'}</span>
              </button>
              <p className="text-[11px] text-discord-muted mt-2">
                Links are valid for 7 days with up to 25 uses.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-discord-muted uppercase tracking-wider">
                Send a server invite link to a friend
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="flex-1 bg-[#1e1f22] border border-discord-border rounded px-3 py-2 text-xs text-discord-text focus:outline-none select-all"
                />
                <button
                  onClick={handleCopy}
                  className={`px-4 py-2 rounded text-xs font-semibold text-white transition-colors flex items-center space-x-1 ${
                    copied
                      ? 'bg-discord-online'
                      : 'bg-discord-accent hover:bg-discord-accent-hover'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-discord-muted">
                Your invite link expires in 7 days or after 25 uses.
              </p>
            </div>
          )}

          <div className="mt-5 pt-3 border-t border-discord-border flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-discord-input text-discord-text hover:bg-discord-border rounded text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

