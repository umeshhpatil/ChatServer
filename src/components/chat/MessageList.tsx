import React, { useEffect, useRef } from 'react';
import { Clock, AlertCircle, UserCheck } from 'lucide-react';
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

        return (
          <div
            key={msg.client_id || msg.id}
            className={`flex items-start space-x-2.5 sm:space-x-3 group hover:bg-[#2e3035]/60 -mx-2 sm:-mx-4 px-2 sm:px-4 py-1 rounded transition-colors ${
              msg.status === 'queued' ? 'opacity-80' : ''
            }`}
          >
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
                </div>
              )}

              <div className="text-discord-text text-sm break-words leading-relaxed whitespace-pre-wrap">
                {msg.body}
              </div>

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
    </div>
  );
};

