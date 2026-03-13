'use client';

import { useState, useRef } from 'react';
import { Paperclip, Smile, Send, Lock } from 'lucide-react';

interface MessageInputProps {
  channelName: string;
  serverColor: string;
  onSend: (content: string) => void;
}

const EMOJI_GRID = [
  '😂', '🔥', '👾', '🎮', '⚔️', '🏆', '💯', '👍',
  '🎉', '🤔', '😎', '💀', '🚀', '⚡', '🔐', '🛡️',
  '😤', '🤯', '👀', '💥', '✨', '🎯', '🧠', '💪',
];

export default function MessageInput({ channelName, serverColor, onSend }: MessageInputProps) {
  const [value, setValue] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-4 pb-4 pt-2 flex-shrink-0">
      {/* Emoji picker */}
      {showEmoji && (
        <div
          className="mb-2 p-3 rounded-xl"
          style={{ background: 'rgba(17,24,39,0.97)', border: '1px solid rgba(30,41,59,0.8)' }}
        >
          <div className="grid grid-cols-8 gap-1">
            {EMOJI_GRID.map(emoji => (
              <button
                key={emoji}
                onClick={() => {
                  setValue(v => v + emoji);
                  inputRef.current?.focus();
                }}
                className="text-xl hover:scale-125 transition-transform p-1 rounded"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input container */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
        style={{
          background: 'rgba(30, 41, 59, 0.6)',
          border: `1px solid rgba(30,41,59,0.8)`,
        }}
        onFocusCapture={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = serverColor + '44';
          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 1px ${serverColor}22`;
        }}
        onBlurCapture={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(30,41,59,0.8)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        }}
      >
        {/* Left actions */}
        <button
          className="p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
          style={{ color: '#64748b' }}
          title="Attach file"
        >
          <Paperclip size={18} />
        </button>

        {/* Input */}
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName}`}
          className="flex-1 bg-transparent outline-none text-[14px] placeholder-slate-500"
          style={{ color: '#e2e8f0' }}
        />

        {/* Right actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setShowEmoji(v => !v)}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            style={{ color: showEmoji ? serverColor : '#64748b' }}
            title="Emoji picker"
          >
            <Smile size={18} />
          </button>
          <button
            onClick={handleSend}
            disabled={!value.trim()}
            className="p-1.5 rounded-lg transition-all"
            style={{
              background: value.trim() ? serverColor : 'rgba(30,41,59,0.6)',
              color: value.trim() ? '#fff' : '#475569',
            }}
            title="Send message"
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      {/* Encryption hint */}
      <div className="flex items-center justify-center gap-1.5 mt-1.5">
        <Lock size={10} style={{ color: '#10b981' }} />
        <span className="text-[10px]" style={{ color: '#475569' }}>
          Messages are end-to-end encrypted with AES-256-GCM
        </span>
      </div>
    </div>
  );
}
