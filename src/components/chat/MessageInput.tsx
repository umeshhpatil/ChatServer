import React, { useState, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface MessageInputProps {
  placeholder: string;
  disabled?: boolean;
  onSendMessage: (body: string) => void;
  onTyping?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  placeholder,
  disabled = false,
  onSendMessage,
  onTyping,
}) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSendMessage(text);
    setText('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    if (onTyping && e.target.value.trim().length > 0) {
      onTyping();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full px-3 sm:px-4 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-discord-bg flex-shrink-0 z-30 border-t border-discord-border">
      <div className="bg-discord-input hover:bg-[#3d3f45] rounded-xl flex items-center px-3 sm:px-4 py-2 sm:py-2.5 border border-discord-border/80 focus-within:border-discord-accent focus-within:ring-1 focus-within:ring-discord-accent transition-all shadow-md">
        <input
          type="text"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none text-discord-text text-base sm:text-sm focus:outline-none placeholder-discord-muted"
        />

        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className={`ml-2 p-2 sm:p-1.5 rounded-lg transition-all flex-shrink-0 ${
            text.trim() && !disabled
              ? 'bg-discord-accent text-white hover:bg-discord-accent-hover shadow'
              : 'text-discord-muted/40 cursor-not-allowed'
          }`}
          title="Send Message (Enter)"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

