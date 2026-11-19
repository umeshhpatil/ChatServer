import React, { useState } from 'react';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { PinnedMessagesModal } from './PinnedMessagesModal';
import type { Message } from '../../types/database';

interface ChatAreaProps {
  title: string;
  isGroup: boolean;
  messages: Message[];
  currentUserId: string | null;
  currentUsername?: string | null;
  loading: boolean;
  isOnline: boolean;
  isFlushingOutbox: boolean;
  isAdmin?: boolean;
  typingUsers?: string[];
  isSelfTyping?: boolean;
  isMemberListOpen?: boolean;
  onSendMessage: (body: string, attachment?: { url: string; type: string }) => void;
  onEditMessage?: (messageId: string, newBody: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onTogglePin?: (messageId: string) => void;
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
  currentUsername,
  loading,
  isOnline,
  isFlushingOutbox,
  isAdmin = false,
  typingUsers = [],
  isSelfTyping = false,
  isMemberListOpen = false,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onTogglePin,
  onTyping,
  onToggleReaction,
  onFlushOutbox,
  onToggleMobileSidebar,
  onToggleMemberList,
}) => {
  const [isPinnedModalOpen, setIsPinnedModalOpen] = useState(false);
  const pinnedMessages = messages.filter((m) => m.is_pinned);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-discord-bg min-w-0 w-full overflow-hidden relative">
      <ChatHeader
        title={title}
        isGroup={isGroup}
        isOnline={isOnline}
        isFlushingOutbox={isFlushingOutbox}
        isMemberListOpen={isMemberListOpen}
        pinnedCount={pinnedMessages.length}
        onFlushOutbox={onFlushOutbox}
        onToggleMobileSidebar={onToggleMobileSidebar}
        onToggleMemberList={onToggleMemberList}
        onOpenPinned={() => setIsPinnedModalOpen(true)}
      />
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          currentUsername={currentUsername}
          loading={loading}
          isAdmin={isAdmin}
          onToggleReaction={onToggleReaction}
          onEditMessage={onEditMessage}
          onDeleteMessage={onDeleteMessage}
          onTogglePin={onTogglePin}
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

      {/* Pinned Messages Modal */}
      <PinnedMessagesModal
        isOpen={isPinnedModalOpen}
        pinnedMessages={pinnedMessages}
        onClose={() => setIsPinnedModalOpen(false)}
        onUnpin={(messageId) => {
          onTogglePin?.(messageId);
        }}
      />
    </div>
  );
};

