import React, { useEffect, useRef } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import type { Message } from '../../types/database';

interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  loading: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  loading,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-discord-muted text-sm">
        Loading messages...
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-discord-side flex items-center justify-center text-discord-muted mb-4">
          💬
        </div>
        <h3 className="text-lg font-bold text-discord-text mb-1">
          Welcome to the beginning of this chat!
        </h3>
        <p className="text-sm text-discord-muted max-w-sm">
          Send a message below to start the conversation.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-4 select-text"
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

        // Grouping logic: check if previous message was from the same sender within 5 mins
        const prevMsg = messages[index - 1];
        const isSameSender =
          prevMsg &&
          prevMsg.sender_id === msg.sender_id &&
          new Date(msg.created_at).getTime() -
            new Date(prevMsg.created_at).getTime() <
            5 * 60 * 1000;

        return (
          <div
            key={msg.client_id || msg.id}
            className={`flex items-start space-x-3 group hover:bg-[#2e3035]/60 -mx-4 px-4 py-1 rounded transition-colors ${
              msg.status === 'queued' ? 'opacity-80' : ''
            }`}
          >
            {!isSameSender ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-10 h-10 rounded-full bg-discord-rail flex-shrink-0 mt-0.5"
              />
            ) : (
              <div className="w-10 flex-shrink-0 text-[10px] text-discord-muted opacity-0 group-hover:opacity-100 text-right pr-2 pt-1 select-none">
                {timeStr}
              </div>
            )}

            <div className="flex-1 min-w-0">
              {!isSameSender && (
                <div className="flex items-baseline space-x-2">
                  <span
                    className={`font-medium text-sm ${
                      isMe ? 'text-discord-accent' : 'text-discord-text'
                    }`}
                  >
                    {senderName}
                  </span>
                  <span className="text-[11px] text-discord-muted">
                    {timeStr}
                  </span>
                </div>
              )}

              <div className="text-discord-text text-sm break-words leading-relaxed whitespace-pre-wrap">
                {msg.body}
              </div>

              {/* Status Indicator (for offline outbox / pending retries) */}
              {msg.status === 'queued' && (
                <div className="flex items-center space-x-1 text-discord-warn text-[11px] mt-1 select-none">
                  <Clock className="w-3 h-3" />
                  <span>Queued offline • Will send when reconnected</span>
                </div>
              )}

              {msg.status === 'failed' && (
                <div className="flex items-center space-x-1 text-discord-danger text-[11px] mt-1 select-none">
                  <AlertCircle className="w-3 h-3" />
                  <span>Failed to send • Retrying automatically</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

