'use client';

import { useState } from 'react';
import {
  ChevronDown, ChevronRight, Hash, Volume2, Megaphone,
  Lock, Mic, MicOff, Headphones, Settings, Users
} from 'lucide-react';
import { GamingServer, GamingUser, Channel } from '@/types/gaming';
import EncryptionBadge from './EncryptionBadge';

interface ChannelSidebarProps {
  server: GamingServer;
  activeChannelId: string;
  activeVoiceChannelId: string | null;
  currentUser: GamingUser;
  isMicMuted: boolean;
  isDeafened: boolean;
  onChannelSelect: (id: string) => void;
  onVoiceChannelJoin: (id: string) => void;
  onMicToggle: () => void;
  onDeafenToggle: () => void;
}

function ChannelItem({
  channel,
  isActive,
  isVoiceActive,
  serverColor,
  server,
  onClick,
}: {
  channel: Channel;
  isActive: boolean;
  isVoiceActive: boolean;
  serverColor: string;
  server: GamingServer;
  onClick: () => void;
}) {
  const Icon = channel.type === 'voice' ? Volume2
    : channel.type === 'announcement' ? Megaphone
    : Hash;

  const voiceUsers = channel.activeUserIds
    ?.map(id => server.members.find(m => m.id === id))
    .filter(Boolean) as GamingUser[] | undefined;

  return (
    <div>
      <button
        onClick={onClick}
        className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-all duration-150 group"
        style={{
          background: isActive || isVoiceActive
            ? `rgba(${hexToRgb(serverColor)}, 0.15)`
            : 'transparent',
          color: isActive || isVoiceActive ? '#e2e8f0' : '#64748b',
        }}
        onMouseEnter={e => {
          if (!isActive && !isVoiceActive) {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
            (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
          }
        }}
        onMouseLeave={e => {
          if (!isActive && !isVoiceActive) {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
          }
        }}
      >
        <Icon size={14} style={{ flexShrink: 0, color: isActive || isVoiceActive ? serverColor : undefined }} />
        <span className="flex-1 text-left text-[13px] truncate">{channel.name}</span>
        {channel.locked && <Lock size={11} style={{ color: '#475569' }} />}
        {channel.unread && channel.unread > 0 && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: serverColor, color: '#fff', minWidth: 18, textAlign: 'center' }}
          >
            {channel.unread}
          </span>
        )}
        {channel.type === 'voice' && voiceUsers && voiceUsers.length > 0 && (
          <span className="text-[10px]" style={{ color: '#10b981' }}>{voiceUsers.length}</span>
        )}
      </button>

      {/* Voice channel participants */}
      {channel.type === 'voice' && voiceUsers && voiceUsers.length > 0 && (
        <div className="ml-7 mb-1 space-y-0.5">
          {voiceUsers.map(user => (
            <div key={user.id} className="flex items-center gap-1.5 py-0.5 px-1">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: user.avatarColor + '33', color: user.avatarColor, border: `1px solid ${user.avatarColor}44` }}
              >
                {user.avatar}
              </div>
              <span className="text-[11px] truncate" style={{ color: '#475569' }}>{user.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '168, 85, 247';
}

export default function ChannelSidebar({
  server,
  activeChannelId,
  activeVoiceChannelId,
  currentUser,
  isMicMuted,
  isDeafened,
  onChannelSelect,
  onVoiceChannelJoin,
  onMicToggle,
  onDeafenToggle,
}: ChannelSidebarProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (catId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  };

  const statusColor: Record<string, string> = {
    online: '#10b981', idle: '#eab308', dnd: '#ef4444', offline: '#475569',
  };

  return (
    <div
      className="w-60 flex-shrink-0 flex flex-col"
      style={{ background: 'rgba(10, 14, 26, 0.95)', borderRight: '1px solid rgba(30,41,59,0.5)' }}
    >
      {/* Server header */}
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        style={{ borderBottom: '1px solid rgba(30,41,59,0.5)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold truncate" style={{ color: '#e2e8f0' }}>{server.name}</span>
          {server.encryptionEnabled && <EncryptionBadge compact />}
        </div>
        <ChevronDown size={16} style={{ color: '#64748b', flexShrink: 0 }} />
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
        {server.categories.map(category => {
          const isCollapsed = collapsedCategories.has(category.id);
          const channels = category.channelIds
            .map(id => server.channels.find(c => c.id === id))
            .filter(Boolean) as Channel[];

          return (
            <div key={category.id} className="mb-2">
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center gap-1 px-2 py-1 mb-1 hover:text-slate-300 transition-colors"
                style={{ color: '#475569' }}
              >
                {isCollapsed
                  ? <ChevronRight size={12} />
                  : <ChevronDown size={12} />
                }
                <span className="text-[11px] font-semibold tracking-wider uppercase">{category.name}</span>
              </button>

              {!isCollapsed && (
                <div className="px-2 space-y-0.5">
                  {channels.map(channel => (
                    <ChannelItem
                      key={channel.id}
                      channel={channel}
                      isActive={activeChannelId === channel.id}
                      isVoiceActive={activeVoiceChannelId === channel.id}
                      serverColor={server.color}
                      server={server}
                      onClick={() =>
                        channel.type === 'voice'
                          ? onVoiceChannelJoin(channel.id)
                          : onChannelSelect(channel.id)
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* User info bar */}
      <div
        className="px-2 py-2 flex items-center gap-2"
        style={{ borderTop: '1px solid rgba(30,41,59,0.5)', background: '#050810' }}
      >
        {/* Avatar with status */}
        <div className="relative">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
            style={{
              background: currentUser.avatarColor + '33',
              border: `2px solid ${currentUser.avatarColor}55`,
              color: currentUser.avatarColor,
            }}
          >
            {currentUser.avatar}
          </div>
          <div
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
            style={{
              background: statusColor[currentUser.status],
              border: '2px solid #050810',
            }}
          />
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold truncate" style={{ color: '#e2e8f0' }}>
            {currentUser.name}
          </div>
          <div className="text-[10px] truncate" style={{ color: '#475569' }}>
            {currentUser.game ? `Playing ${currentUser.game}` : 'Online'}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={onMicToggle}
            title={isMicMuted ? 'Unmute' : 'Mute'}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            style={{ color: isMicMuted ? '#ef4444' : '#94a3b8' }}
          >
            {isMicMuted ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
          <button
            onClick={onDeafenToggle}
            title={isDeafened ? 'Undeafen' : 'Deafen'}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            style={{ color: isDeafened ? '#ef4444' : '#94a3b8' }}
          >
            <Headphones size={14} />
          </button>
          <button
            title="User Settings"
            className="p-1 rounded hover:bg-white/10 transition-colors"
            style={{ color: '#94a3b8' }}
          >
            <Settings size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
