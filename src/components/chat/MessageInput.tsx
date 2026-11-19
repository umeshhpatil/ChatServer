import React, { useState, useRef, type KeyboardEvent } from 'react';
import { Send, Paperclip, X, Image as ImageIcon } from 'lucide-react';

interface MessageInputProps {
  placeholder: string;
  disabled?: boolean;
  onSendMessage: (body: string, attachment?: { url: string; type: string }) => void;
  onTyping?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  placeholder,
  disabled = false,
  onSendMessage,
  onTyping,
}) => {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<{ url: string; type: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSend = () => {
    if ((!text.trim() && !attachment) || disabled) return;
    onSendMessage(
      text,
      attachment ? { url: attachment.url, type: attachment.type } : undefined
    );
    setText('');
    setAttachment(null);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        url: reader.result as string,
        type: isImage ? 'image' : 'file',
        name: file.name,
      });
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  };

  return (
    <div className="w-full px-3 sm:px-4 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-discord-bg flex-shrink-0 z-30 border-t border-discord-border">
      {/* Attachment Preview Chip */}
      {attachment && (
        <div className="mb-2 flex items-center space-x-2 bg-discord-input border border-discord-border rounded-lg p-1.5 max-w-sm animate-in fade-in duration-150">
          {attachment.type === 'image' ? (
            <img
              src={attachment.url}
              alt="Attachment Preview"
              className="w-10 h-10 object-cover rounded bg-discord-side flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded bg-discord-side flex items-center justify-center text-discord-muted flex-shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <span className="text-xs text-discord-text truncate block font-medium">
              {attachment.name}
            </span>
            <span className="text-[10px] text-discord-muted">Ready to send</span>
          </div>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            className="p-1 text-discord-muted hover:text-discord-text hover:bg-discord-side rounded transition-colors"
            title="Remove Attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-discord-input hover:bg-[#3d3f45] rounded-xl flex items-center px-3 sm:px-4 py-2 sm:py-2.5 border border-discord-border/80 focus-within:border-discord-accent focus-within:ring-1 focus-within:ring-discord-accent transition-all shadow-md">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          className="hidden"
        />

        {/* Paperclip Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="mr-2 p-1.5 text-discord-muted hover:text-discord-text hover:bg-discord-side rounded-lg transition-colors flex-shrink-0"
          title="Attach Image or File"
        >
          <Paperclip className="w-4 h-4" />
        </button>

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
          disabled={(!text.trim() && !attachment) || disabled}
          className={`ml-2 p-2 sm:p-1.5 rounded-lg transition-all flex-shrink-0 ${
            (text.trim() || attachment) && !disabled
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

