import React, { useState, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface MessageInputProps {
  placeholder: string;
  disabled?: boolean;
  onSendMessage: (body: string) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  placeholder,
  disabled = false,
  onSendMessage,
}) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSendMessage(text);
    setText('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-3 sm:px-4 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-discord-bg flex-shrink-0 z-20 border-t border-discord-border/30">
      <div className="bg-discord-input rounded-lg flex items-center px-3 sm:px-4 py-2 sm:py-2.5 focus-within:ring-1 focus-within:ring-discord-accent/50 transition-all shadow-inner">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none text-discord-text text-base sm:text-sm focus:outline-none placeholder-discord-muted"
        />

        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className={`ml-2 p-2 sm:p-1.5 rounded-full transition-colors flex-shrink-0 ${
            text.trim() && !disabled
              ? 'text-discord-accent hover:bg-discord-bg hover:text-white'
              : 'text-discord-muted/40 cursor-not-allowed'
          }`}
          title="Send Message (Enter)"
        >
          <Send className="w-5 h-5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  );
};

