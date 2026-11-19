import React from 'react';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import type { Message } from '../../types/database';

interface ChatAreaProps {
  title: string;
  isGroup: boolean;
  messages: Message[];
  currentUserId: string | null;
  loading: boolean;
  isOnline: boolean;
  isFlushingOutbox: boolean;
  typingUsers?: string[];
  isSelfTyping?: boolean;
  isMemberListOpen?: boolean;
  onSendMessage: (body: string) => void;
  onTyping?: () => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onFlushOutbox?: () => void;
  onToggleMobileSidebar?: () => void;
  onToggleMemberList?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  title,
  isGroup,
  messages,
  currentUserId,
  loading,
  isOnline,
  isFlushingOutbox,
  typingUsers = [],
  isSelfTyping = false,
  isMemberListOpen = false,
  onSendMessage,
  onTyping,
  onToggleReaction,
  onFlushOutbox,
  onToggleMobileSidebar,
  onToggleMemberList,
}) => {
  return (
    <div className="flex-1 flex flex-col h-[100dvh] max-h-[100dvh] min-h-0 bg-discord-bg min-w-0 w-full overflow-hidden relative">
      <ChatHeader
        title={title}
        isGroup={isGroup}
        isOnline={isOnline}
        isFlushingOutbox={isFlushingOutbox}
        isMemberListOpen={isMemberListOpen}
        onFlushOutbox={onFlushOutbox}
        onToggleMobileSidebar={onToggleMobileSidebar}
        onToggleMemberList={onToggleMemberList}
      />
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          loading={loading}
          onToggleReaction={onToggleReaction}
        />
      </div>

      {/* Typing Indicator Bar */}
      {(typingUsers.length > 0 || isSelfTyping) && (
        <div className="px-4 py-1 flex items-center space-x-1.5 text-xs text-discord-muted bg-discord-bg flex-shrink-0 animate-in fade-in duration-150">
          <div className="flex space-x-0.5 items-center mr-0.5">
            <span className="w-1.5 h-1.5 bg-discord-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-discord-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-discord-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          {typingUsers.length > 0 && isSelfTyping ? (
            <span>
              <strong className="text-discord-text">{typingUsers.join(', ')}</strong> and <strong className="text-discord-text">you</strong> are typing...
            </span>
          ) : typingUsers.length > 0 ? (
            <span>
              <strong className="text-discord-text">
                {typingUsers.length === 1
                  ? typingUsers[0]
                  : typingUsers.length === 2
                  ? `${typingUsers[0]} and ${typingUsers[1]}`
                  : `${typingUsers[0]} and ${typingUsers.length - 1} others`}
              </strong>{' '}
              {typingUsers.length === 1 ? 'is typing...' : 'are typing...'}
            </span>
          ) : (
            <span>
              <strong className="text-discord-text">You</strong> are typing...
            </span>
          )}
        </div>
      )}

      <MessageInput
        placeholder={isGroup ? `Message #${title}` : `Message @${title}`}
        onSendMessage={onSendMessage}
        onTyping={onTyping}
      />
    </div>
  );
};

