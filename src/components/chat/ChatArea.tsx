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
  onSendMessage: (body: string) => void;
  onFlushOutbox?: () => void;
  onToggleMobileSidebar?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  title,
  isGroup,
  messages,
  currentUserId,
  loading,
  isOnline,
  isFlushingOutbox,
  onSendMessage,
  onFlushOutbox,
  onToggleMobileSidebar,
}) => {
  return (
    <div className="flex-1 flex flex-col h-[100dvh] max-h-[100dvh] min-h-0 bg-discord-bg min-w-0 w-full overflow-hidden relative">
      <ChatHeader
        title={title}
        isGroup={isGroup}
        isOnline={isOnline}
        isFlushingOutbox={isFlushingOutbox}
        onFlushOutbox={onFlushOutbox}
        onToggleMobileSidebar={onToggleMobileSidebar}
      />
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          loading={loading}
        />
      </div>
      <MessageInput
        placeholder={isGroup ? `Message #${title}` : `Message @${title}`}
        onSendMessage={onSendMessage}
      />
    </div>
  );
};

