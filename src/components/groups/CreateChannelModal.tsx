import React, { useState } from 'react';
import { Hash, Megaphone, X } from 'lucide-react';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChannel: (name: string, type: 'text' | 'announcement') => Promise<unknown>;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
  onCreateChannel,
}) => {
  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState<'text' | 'announcement'>('text');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim() || loading) return;

    setLoading(true);
    setError(null);
    try {
      await onCreateChannel(channelName.trim(), channelType);
      setChannelName('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create channel');
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = e.target.value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '');
    setChannelName(formatted);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-discord-side border border-discord-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-2 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-discord-text">Create Channel</h3>
            <p className="text-xs text-discord-muted mt-0.5">in Text Channels</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-discord-muted hover:text-discord-text hover:bg-discord-input rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-discord-danger/10 border border-discord-danger/30 text-discord-danger text-xs">
              {error}
            </div>
          )}

          {/* Channel Type Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-discord-muted uppercase tracking-wider block">
              Channel Type
            </label>
            <div className="space-y-1.5">
              <label
                onClick={() => setChannelType('text')}
                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  channelType === 'text'
                    ? 'bg-discord-input border-discord-accent text-discord-text'
                    : 'bg-discord-bg/40 border-discord-border/60 text-discord-muted hover:bg-discord-input/40'
                }`}
              >
                <Hash className="w-5 h-5 text-discord-muted" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-discord-text">Text</div>
                  <div className="text-xs text-discord-muted">Post messages, images, and memes</div>
                </div>
              </label>

              <label
                onClick={() => setChannelType('announcement')}
                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  channelType === 'announcement'
                    ? 'bg-discord-input border-discord-accent text-discord-text'
                    : 'bg-discord-bg/40 border-discord-border/60 text-discord-muted hover:bg-discord-input/40'
                }`}
              >
                <Megaphone className="w-5 h-5 text-discord-muted" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-discord-text">Announcement</div>
                  <div className="text-xs text-discord-muted">Important news and updates</div>
                </div>
              </label>
            </div>
          </div>

          {/* Channel Name Input */}
          <div>
            <label className="text-[11px] font-bold text-discord-muted uppercase tracking-wider block mb-1.5">
              Channel Name
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-discord-muted text-base">#</span>
              <input
                type="text"
                value={channelName}
                onChange={handleNameChange}
                placeholder="new-channel"
                maxLength={30}
                required
                className="w-full bg-discord-bg pl-8 pr-3 py-2.5 rounded-lg text-discord-text text-sm border border-discord-border focus:border-discord-accent focus:outline-none placeholder-discord-muted"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-discord-muted hover:text-discord-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!channelName.trim() || loading}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow ${
                channelName.trim() && !loading
                  ? 'bg-discord-accent hover:bg-discord-accent-hover text-white'
                  : 'bg-discord-accent/40 text-white/50 cursor-not-allowed'
              }`}
            >
              {loading ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
