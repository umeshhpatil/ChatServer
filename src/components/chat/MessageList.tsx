import React, { useEffect, useRef, useState } from 'react';
import { Clock, AlertCircle, UserCheck, Smile, Pencil, Trash2, Pin, X } from 'lucide-react';
import type { Message } from '../../types/database';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉'];

interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  currentUsername?: string | null;
  loading: boolean;
  isAdmin?: boolean;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string, newBody: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onTogglePin?: (messageId: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  currentUsername,
  loading,
  isAdmin = false,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
  onTogglePin,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleStartEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditText(msg.body);
  };

  const handleSaveEdit = (messageId: string) => {
    if (!editText.trim()) return;
    onEditMessage?.(messageId, editText.trim());
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-discord-muted text-sm">
        Loading messages...
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-discord-side flex items-center justify-center text-discord-muted mb-3 text-2xl">
          💬
        </div>
        <h3 className="text-base sm:text-lg font-bold text-discord-text mb-1">
          Welcome to the beginning of this chat!
        </h3>
        <p className="text-xs sm:text-sm text-discord-muted max-w-sm">
          Send a message below to start the conversation.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4 select-text"
    >
      {messages.map((msg, index) => {
        const isMe = msg.sender_id === currentUserId;
        const senderName = msg.sender?.username || (isMe ? 'You' : 'User');
        const avatarUrl =
          msg.sender?.avatar_url ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${senderName}`;

        const timeStr = new Date(msg.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        // Check if this is a real-time server join message
        const isJoinEvent = msg.body.includes('joined the server');

        if (isJoinEvent) {
          return (
            <div
              key={msg.client_id || msg.id}
              className="flex items-center space-x-2.5 py-2 px-3 rounded-lg bg-discord-side/50 border border-discord-border/60 my-1 text-xs sm:text-sm animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-discord-online/20 text-discord-online flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-discord-online mr-1.5">
                  {senderName}
                </span>
                <span className="text-discord-text">{msg.body}</span>
              </div>
              <span className="text-[10px] text-discord-muted flex-shrink-0">{timeStr}</span>
            </div>
          );
        }

        // Grouping logic: check if previous message was from the same sender within 5 mins
        const prevMsg = messages[index - 1];
        const isSameSender =
          prevMsg &&
          !prevMsg.body.includes('joined the server') &&
          prevMsg.sender_id === msg.sender_id &&
          new Date(msg.created_at).getTime() -
            new Date(prevMsg.created_at).getTime() <
            5 * 60 * 1000;

        const isMentioned = currentUsername && msg.body.includes(`@${currentUsername}`);
        const canModerate = isMe || isAdmin;

        return (
          <div
            key={msg.client_id || msg.id}
            className={`relative flex items-start space-x-2.5 sm:space-x-3 group hover:bg-[#2e3035]/60 -mx-2 sm:-mx-4 px-2 sm:px-4 py-1.5 rounded transition-colors ${
              isMentioned ? 'bg-amber-500/10 border-l-2 border-amber-500' : ''
            } ${msg.status === 'queued' ? 'opacity-80' : ''}`}
          >
            {/* Desktop Action Bar on Hover */}
            <div className="absolute right-3 -top-3.5 hidden group-hover:flex items-center bg-discord-side border border-discord-border rounded-lg shadow-lg px-1.5 py-0.5 space-x-1 z-20 transition-all">
              {/* Quick Emojis */}
              {onToggleReaction &&
                QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onToggleReaction(msg.id, emoji)}
                    className="hover:bg-discord-input p-1 rounded text-sm transition-transform hover:scale-125"
                    title={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}

              <div className="w-[1px] h-4 bg-discord-border mx-0.5" />

              {/* Pin Message Button */}
              {onTogglePin && (
                <button
                  type="button"
                  onClick={() => onTogglePin(msg.id)}
                  className={`p-1 rounded transition-colors ${
                    msg.is_pinned
                      ? 'text-amber-400 bg-amber-400/10'
                      : 'text-discord-muted hover:text-discord-text hover:bg-discord-input'
                  }`}
                  title={msg.is_pinned ? 'Unpin message' : 'Pin message'}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Edit Message Button (only author) */}
              {isMe && onEditMessage && (
                <button
                  type="button"
                  onClick={() => handleStartEdit(msg)}
                  className="p-1 text-discord-muted hover:text-discord-text hover:bg-discord-input rounded transition-colors"
                  title="Edit message"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Delete Message Button (author or admin) */}
              {canModerate && onDeleteMessage && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this message?')) {
                      onDeleteMessage(msg.id);
                    }
                  }}
                  className="p-1 text-discord-muted hover:text-discord-danger hover:bg-discord-danger/10 rounded transition-colors"
                  title="Delete message"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {!isSameSender ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-discord-rail flex-shrink-0 mt-0.5"
              />
            ) : (
              <div className="w-8 sm:w-10 flex-shrink-0 text-[10px] text-discord-muted opacity-0 group-hover:opacity-100 text-right pr-2 pt-1 select-none">
                {timeStr}
              </div>
            )}

            <div className="flex-1 min-w-0">
              {/* Pinned Indicator Banner */}
              {msg.is_pinned && (
                <div className="flex items-center space-x-1 text-[11px] text-amber-400 font-semibold mb-0.5">
                  <Pin className="w-3 h-3" />
                  <span>Pinned</span>
                </div>
              )}

              {!isSameSender && (
                <div className="flex items-baseline space-x-2">
                  <span
                    className={`font-semibold text-xs sm:text-sm ${
                      isMe ? 'text-discord-accent' : 'text-discord-text'
                    }`}
                  >
                    {senderName}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-discord-muted">
                    {timeStr}
                  </span>
                  {msg.edited_at && (
                    <span className="text-[10px] text-discord-muted italic">
                      (edited)
                    </span>
                  )}
                </div>
              )}

              {/* Message Content: Normal vs Editing Mode */}
              {editingId === msg.id ? (
                <div className="mt-1 space-y-1.5">
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(msg.id);
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    autoFocus
                    className="w-full bg-discord-input text-discord-text text-sm rounded-lg px-3 py-1.5 border border-discord-accent focus:outline-none"
                  />
                  <div className="text-[11px] text-discord-muted flex items-center space-x-2">
                    <span>
                      escape to{' '}
                      <button
                        onClick={handleCancelEdit}
                        className="text-discord-accent hover:underline"
                      >
                        cancel
                      </button>
                    </span>
                    <span>•</span>
                    <span>
                      enter to{' '}
                      <button
                        onClick={() => handleSaveEdit(msg.id)}
                        className="text-discord-accent hover:underline font-semibold"
                      >
                        save
                      </button>
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {msg.body && (
                    <div className="text-discord-text text-sm break-words leading-relaxed whitespace-pre-wrap">
                      {msg.body}
                    </div>
                  )}

                  {/* Image Attachment Preview */}
                  {msg.attachment_url && (
                    <div className="mt-2">
                      <img
                        src={msg.attachment_url}
                        alt="Attachment"
                        onClick={() => setLightboxImage(msg.attachment_url ?? null)}
                        className="max-h-60 sm:max-h-80 max-w-full rounded-lg border border-discord-border object-contain cursor-zoom-in hover:opacity-95 transition-opacity bg-black/20"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Emoji Reaction Chips */}
              {((msg.reactions && msg.reactions.length > 0) || onToggleReaction) && (
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {msg.reactions?.map((reaction) => (
                    <button
                      key={reaction.emoji}
                      type="button"
                      onClick={() => onToggleReaction?.(msg.id, reaction.emoji)}
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-medium border transition-colors ${
                        reaction.hasReacted
                          ? 'bg-discord-accent/20 border-discord-accent text-discord-accent'
                          : 'bg-discord-input/80 hover:bg-discord-input border-discord-border text-discord-text'
                      }`}
                      title={`${reaction.count} reacted with ${reaction.emoji}`}
                    >
                      <span className="text-sm leading-none">{reaction.emoji}</span>
                      <span className="text-[11px] font-semibold">{reaction.count}</span>
                    </button>
                  ))}

                  {/* Add reaction button (+ smile icon) */}
                  {onToggleReaction && (
                    <div className="relative inline-block">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveReactionMenu(
                            activeReactionMenu === (msg.client_id || msg.id)
                              ? null
                              : msg.client_id || msg.id
                          )
                        }
                        className={`inline-flex items-center justify-center p-1 rounded-md text-discord-muted hover:text-discord-text hover:bg-discord-input border border-transparent hover:border-discord-border transition-colors ${
                          msg.reactions && msg.reactions.length > 0 ? '' : 'sm:opacity-0 group-hover:opacity-100'
                        }`}
                        title="Add reaction"
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown Menu for Mobile or Quick Click */}
                      {activeReactionMenu === (msg.client_id || msg.id) && (
                        <div
                          className="absolute left-0 bottom-full mb-1 flex items-center bg-discord-side border border-discord-border rounded-lg shadow-xl px-1.5 py-1 space-x-1.5 z-30 animate-in fade-in zoom-in-95 duration-150"
                        >
                          {QUICK_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                onToggleReaction(msg.id, emoji);
                                setActiveReactionMenu(null);
                              }}
                              className="hover:bg-discord-input p-1 rounded text-base transition-transform hover:scale-125"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Status Indicator (for offline outbox / pending retries) */}
              {msg.status === 'queued' && (
                <div className="flex items-center space-x-1 text-discord-warn text-[10px] sm:text-[11px] mt-1 select-none">
                  <Clock className="w-3 h-3" />
                  <span>Queued offline • Will send when reconnected</span>
                </div>
              )}

              {msg.status === 'failed' && (
                <div className="flex items-center space-x-1 text-discord-danger text-[10px] sm:text-[11px] mt-1 select-none">
                  <AlertCircle className="w-3 h-3" />
                  <span>Failed to send • Retrying automatically</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Lightbox Modal for Fullscreen Image View */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-discord-side text-white hover:bg-discord-input transition-colors"
              title="Close (Click anywhere)"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage}
              alt="Fullscreen preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

