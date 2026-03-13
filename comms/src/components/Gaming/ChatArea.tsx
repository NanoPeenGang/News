'use client';

import { Hash, Megaphone, Users, Search, Bell, Pin } from 'lucide-react';
import { Channel, Message, GamingUser } from '@/types/gaming';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import EncryptionBadge from './EncryptionBadge';

interface ChatAreaProps {
  channel: Channel;
  messages: Message[];
  users: GamingUser[];
  currentUser: GamingUser;
  serverColor: string;
  showUserList: boolean;
  onToggleUserList: () => void;
  onSendMessage: (content: string) => void;
  onReact: (messageId: string, emoji: string) => void;
}

export default function ChatArea({
  channel,
  messages,
  users,
  currentUser,
  serverColor,
  showUserList,
  onToggleUserList,
  onSendMessage,
  onReact,
}: ChatAreaProps) {
  const Icon = channel.type === 'announcement' ? Megaphone : Hash;

  return (
    <div className="flex-1 flex flex-col min-w-0" style={{ background: 'rgba(17,24,39,0.5)' }}>
      {/* Channel header */}
      <div
        className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
        style={{
          borderBottom: '1px solid rgba(30,41,59,0.5)',
          background: 'rgba(10,14,26,0.8)',
        }}
      >
        <Icon size={18} style={{ color: serverColor, flexShrink: 0 }} />
        <span className="text-[15px] font-bold" style={{ color: '#e2e8f0' }}>
          {channel.name}
        </span>
        {channel.description && (
          <>
            <div className="w-px h-5" style={{ background: 'rgba(30,41,59,0.8)' }} />
            <span className="text-[13px] truncate" style={{ color: '#64748b' }}>
              {channel.description}
            </span>
          </>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <EncryptionBadge />
          <button className="p-1.5 rounded hover:bg-white/10 transition-colors" style={{ color: '#64748b' }} title="Pinned messages">
            <Pin size={16} />
          </button>
          <button className="p-1.5 rounded hover:bg-white/10 transition-colors" style={{ color: '#64748b' }} title="Notifications">
            <Bell size={16} />
          </button>
          <button className="p-1.5 rounded hover:bg-white/10 transition-colors" style={{ color: '#64748b' }} title="Search">
            <Search size={16} />
          </button>
          <button
            onClick={onToggleUserList}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: showUserList ? serverColor : '#64748b' }}
            title="Toggle member list"
          >
            <Users size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        users={users}
        currentUserId={currentUser.id}
        serverColor={serverColor}
        onReact={onReact}
      />

      {/* Message input */}
      <MessageInput
        channelName={channel.name}
        serverColor={serverColor}
        onSend={onSendMessage}
      />
    </div>
  );
}
