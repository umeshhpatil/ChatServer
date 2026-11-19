import React from 'react';
import { Pin, X, Trash2 } from 'lucide-react';
import type { Message } from '../../types/database';

interface PinnedMessagesModalProps {
  isOpen: boolean;
  pinnedMessages: Message[];
  onClose: () => void;
  onUnpin: (messageId: string) => void;
}

export const PinnedMessagesModal: React.FC<PinnedMessagesModalProps> = ({
  isOpen,
  pinnedMessages,
  onClose,
  onUnpin,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-discord-side border border-discord-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="h-14 border-b border-discord-border px-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2 text-discord-text font-bold text-base">
            <Pin className="w-5 h-5 text-amber-400" />
            <span>Pinned Messages ({pinnedMessages.length})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-discord-muted hover:text-discord-text hover:bg-discord-input transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Pinned Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {pinnedMessages.length === 0 ? (
            <div className="text-center py-12 select-none">
              <div className="w-12 h-12 rounded-full bg-discord-input flex items-center justify-center text-amber-400 mx-auto mb-3">
                <Pin className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-discord-text mb-1">
                No pinned messages yet
              </h4>
              <p className="text-xs text-discord-muted max-w-xs mx-auto">
                Hover over important messages and click the pin icon to keep them easily accessible here.
              </p>
            </div>
          ) : (
            pinnedMessages.map((msg) => {
              const senderName = msg.sender?.username || 'User';
              const avatarUrl =
                msg.sender?.avatar_url ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${senderName}`;

              const timeStr = new Date(msg.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id}
                  className="bg-discord-bg/80 border border-discord-border/80 rounded-lg p-3 hover:border-discord-accent/40 transition-colors group relative"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <img
                        src={avatarUrl}
                        alt={senderName}
                        className="w-7 h-7 rounded-full bg-discord-rail flex-shrink-0"
                      />
                      <span className="font-semibold text-xs sm:text-sm text-discord-text">
                        {senderName}
                      </span>
                      <span className="text-[10px] text-discord-muted">{timeStr}</span>
                    </div>

                    <button
                      onClick={() => onUnpin(msg.id)}
                      className="p-1 text-discord-muted hover:text-amber-400 hover:bg-discord-side rounded transition-colors"
                      title="Unpin message"
                    >
                      <Pin className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  </div>

                  {msg.body && (
                    <div className="text-xs sm:text-sm text-discord-text mt-1.5 break-words whitespace-pre-wrap pl-9">
                      {msg.body}
                    </div>
                  )}

                  {msg.attachment_url && (
                    <div className="mt-2 pl-9">
                      <img
                        src={msg.attachment_url}
                        alt="Attachment"
                        className="max-h-40 rounded border border-discord-border object-contain"
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
