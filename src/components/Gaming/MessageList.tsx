'use client';

import { useEffect, useRef } from 'react';
import { Reply, MoreHorizontal } from 'lucide-react';
import { Message, GamingUser } from '@/types/gaming';

interface MessageListProps {
  messages: Message[];
  users: GamingUser[];
  currentUserId: string;
  serverColor: string;
  onReact: (messageId: string, emoji: string) => void;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function MessageList({
  messages,
  users,
  currentUserId,
  serverColor,
  onReact,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const getUserById = (id: string) => users.find(u => u.id === id);

  // Group messages by date
  const groups: { date: string; messages: Message[] }[] = [];
  messages.forEach(msg => {
    const date = formatDate(msg.timestamp);
    const last = groups[groups.length - 1];
    if (last && last.date === date) {
      last.messages.push(msg);
    } else {
      groups.push({ date, messages: [msg] });
    }
  });

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-2 space-y-1">
      {groups.map(group => (
        <div key={group.date}>
          {/* Date divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px" style={{ background: 'rgba(30,41,59,0.6)' }} />
            <span className="text-[11px] font-semibold px-2" style={{ color: '#475569' }}>
              {group.date}
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(30,41,59,0.6)' }} />
          </div>

          {group.messages.map((msg, idx) => {
            const user = getUserById(msg.userId);
            const prevMsg = group.messages[idx - 1];
            const isGrouped = prevMsg && prevMsg.userId === msg.userId &&
              new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() < 5 * 60 * 1000;
            const isOwn = msg.userId === currentUserId;
            const replyMsg = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : null;
            const replyUser = replyMsg ? getUserById(replyMsg.userId) : null;

            return (
              <div
                key={msg.id}
                className="group flex gap-3 rounded-md px-2 py-1 transition-colors duration-100"
                style={{ marginTop: isGrouped ? 1 : 8 }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }}
              >
                {/* Avatar column */}
                <div className="w-10 flex-shrink-0 flex justify-center">
                  {!isGrouped && user ? (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5"
                      style={{
                        background: user.avatarColor + '22',
                        border: `2px solid ${user.avatarColor}44`,
                        color: user.avatarColor,
                      }}
                    >
                      {user.avatar}
                    </div>
                  ) : (
                    <span
                      className="text-[10px] opacity-0 group-hover:opacity-100 pt-1 transition-opacity"
                      style={{ color: '#475569' }}
                    >
                      {formatTime(msg.timestamp).split(' ')[0]}
                    </span>
                  )}
                </div>

                {/* Message content */}
                <div className="flex-1 min-w-0">
                  {/* Reply reference */}
                  {replyMsg && replyUser && (
                    <div className="flex items-center gap-1.5 mb-1 ml-0.5">
                      <div className="w-4 h-3 rounded-tl-sm" style={{ borderLeft: `2px solid #475569`, borderTop: `2px solid #475569` }} />
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                        style={{ background: replyUser.avatarColor + '33', color: replyUser.avatarColor }}
                      >
                        {replyUser.avatar}
                      </div>
                      <span className="text-[11px] font-semibold" style={{ color: replyUser.avatarColor }}>
                        {replyUser.name}
                      </span>
                      <span className="text-[11px] truncate" style={{ color: '#475569' }}>
                        {replyMsg.content.substring(0, 60)}{replyMsg.content.length > 60 ? '…' : ''}
                      </span>
                    </div>
                  )}

                  {/* Header row */}
                  {!isGrouped && user && (
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span
                        className="text-[13px] font-semibold"
                        style={{ color: isOwn ? serverColor : user.avatarColor }}
                      >
                        {user.name}
                      </span>
                      {user.role === 'owner' && (
                        <span
                          className="text-[9px] px-1 py-0.5 rounded font-bold uppercase"
                          style={{ background: `${serverColor}22`, color: serverColor, border: `1px solid ${serverColor}44` }}
                        >
                          Owner
                        </span>
                      )}
                      {user.role === 'admin' && (
                        <span
                          className="text-[9px] px-1 py-0.5 rounded font-bold uppercase"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                        >
                          Admin
                        </span>
                      )}
                      <span className="text-[11px]" style={{ color: '#475569' }}>
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  )}

                  {/* Message text */}
                  <p className="text-[14px] leading-relaxed break-words" style={{ color: '#cbd5e1' }}>
                    {msg.content}
                  </p>

                  {/* Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {msg.reactions.map(reaction => (
                        <button
                          key={reaction.emoji}
                          onClick={() => onReact(msg.id, reaction.emoji)}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[12px] transition-all hover:scale-110"
                          style={{
                            background: reaction.reacted
                              ? `${serverColor}22`
                              : 'rgba(30,41,59,0.6)',
                            border: reaction.reacted
                              ? `1px solid ${serverColor}55`
                              : '1px solid rgba(30,41,59,0.8)',
                          }}
                        >
                          <span>{reaction.emoji}</span>
                          <span className="text-[11px]" style={{ color: reaction.reacted ? serverColor : '#64748b' }}>
                            {reaction.count}
                          </span>
                        </button>
                      ))}
                      <button
                        className="flex items-center justify-center w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(30,41,59,0.8)', color: '#64748b', fontSize: 12 }}
                        title="Add reaction"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                {/* Hover actions */}
                <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 pt-0.5">
                  <button
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    style={{ color: '#64748b' }}
                    title="Add reaction"
                  >
                    😊
                  </button>
                  <button
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    style={{ color: '#64748b' }}
                    title="Reply"
                  >
                    <Reply size={14} />
                  </button>
                  <button
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    style={{ color: '#64748b' }}
                    title="More options"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
