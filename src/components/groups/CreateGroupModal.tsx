import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (name: string) => Promise<string>;
  onGroupCreated: (newGroupId: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onCreateGroup,
  onGroupCreated,
}) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || loading) return;

    setLoading(true);
    setError(null);
    try {
      const newGroupId = await onCreateGroup(name.trim());
      setName('');
      onGroupCreated(newGroupId);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setLoading(false);
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

          <h2 className="text-xl font-bold text-discord-text text-center mb-1">
            Create Your Server
          </h2>
          <p className="text-xs text-discord-muted text-center mb-6">
            Your server is where you and your friends hang out. Make yours and start talking.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-discord-muted uppercase tracking-wider mb-2">
                Server Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. The Chill Zone"
                className="w-full bg-[#1e1f22] border border-discord-border rounded px-3 py-2.5 text-sm text-discord-text focus:outline-none focus:border-discord-accent"
                autoFocus
              />
            </div>

            {error && (
              <div className="text-xs text-discord-danger bg-discord-danger/10 p-2 rounded">
                {error}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-discord-text hover:underline px-3 py-2"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!name.trim() || loading}
                className={`px-6 py-2 rounded text-sm font-semibold text-white transition-colors ${
                  name.trim() && !loading
                    ? 'bg-discord-accent hover:bg-discord-accent-hover'
                    : 'bg-discord-accent/50 cursor-not-allowed'
                }`}
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

