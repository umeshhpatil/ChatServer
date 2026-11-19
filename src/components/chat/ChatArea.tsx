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
}) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-discord-bg min-w-0">
      <ChatHeader
        title={title}
        isGroup={isGroup}
        isOnline={isOnline}
        isFlushingOutbox={isFlushingOutbox}
        onFlushOutbox={onFlushOutbox}
      />
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        loading={loading}
      />
      <MessageInput
        placeholder={isGroup ? `Message #${title}` : `Message @${title}`}
        onSendMessage={onSendMessage}
      />
    </div>
  );
};

