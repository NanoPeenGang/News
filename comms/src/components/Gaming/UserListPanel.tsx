'use client';

import { useState } from 'react';
import { Crown, Shield, MessageSquare } from 'lucide-react';
import { GamingUser } from '@/types/gaming';

interface UserListPanelProps {
  users: GamingUser[];
  serverColor: string;
}

const STATUS_ORDER = ['online', 'idle', 'dnd', 'offline'] as const;
const STATUS_LABELS: Record<string, string> = {
  online: 'Online',
  idle: 'Idle',
  dnd: 'Do Not Disturb',
  offline: 'Offline',
};
const STATUS_COLORS: Record<string, string> = {
  online: '#10b981',
  idle: '#eab308',
  dnd: '#ef4444',
  offline: '#475569',
};

function UserCard({
  user,
  serverColor,
}: {
  user: GamingUser;
  serverColor: string;
}) {
  const [showCard, setShowCard] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowCard(true)}
      onMouseLeave={() => setShowCard(false)}
    >
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
        style={{}}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.background = 'transparent';
        }}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
            style={{
              background: user.avatarColor + '22',
              border: `2px solid ${user.avatarColor}44`,
              color: user.avatarColor,
            }}
          >
            {user.avatar}
          </div>
          <div
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
            style={{
              background: STATUS_COLORS[user.status],
              border: '2px solid #0a0e1a',
            }}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[13px] font-medium truncate" style={{ color: '#cbd5e1' }}>
              {user.name}
            </span>
            {user.role === 'owner' && (
              <Crown size={10} style={{ color: '#eab308', flexShrink: 0 }} />
            )}
            {user.role === 'admin' && (
              <Shield size={10} style={{ color: '#ef4444', flexShrink: 0 }} />
            )}
          </div>
          {user.game && (
            <div className="text-[10px] truncate" style={{ color: '#475569' }}>
              🎮 {user.game}
            </div>
          )}
        </div>
      </div>

      {/* Hover card */}
      {showCard && (
        <div
          className="absolute right-full top-0 mr-2 w-52 rounded-xl overflow-hidden z-50"
          style={{
            background: 'rgba(10,14,26,0.98)',
            border: '1px solid rgba(30,41,59,0.8)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {/* Banner */}
          <div
            className="h-12"
            style={{
              background: `linear-gradient(135deg, ${user.avatarColor}33, ${user.avatarColor}11)`,
            }}
          />
          {/* Avatar */}
          <div className="px-3 -mt-6 mb-2">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold"
              style={{
                background: user.avatarColor + '33',
                border: `3px solid #0a0e1a`,
                color: user.avatarColor,
              }}
            >
              {user.avatar}
            </div>
          </div>
          <div className="px-3 pb-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[14px] font-bold" style={{ color: '#e2e8f0' }}>{user.name}</span>
              {user.role === 'owner' && <Crown size={12} style={{ color: '#eab308' }} />}
              {user.role === 'admin' && <Shield size={12} style={{ color: '#ef4444' }} />}
            </div>
            <div
              className="flex items-center gap-1.5 text-[11px] mb-2"
              style={{ color: STATUS_COLORS[user.status] }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[user.status] }} />
              {STATUS_LABELS[user.status]}
            </div>
            {user.game && (
              <div
                className="px-2 py-1.5 rounded-lg mb-2"
                style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(30,41,59,0.8)' }}
              >
                <div className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: '#475569' }}>Playing</div>
                <div className="text-[12px]" style={{ color: '#94a3b8' }}>🎮 {user.game}</div>
              </div>
            )}
            <button
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:bg-opacity-30"
              style={{
                background: `${serverColor}22`,
                color: serverColor,
                border: `1px solid ${serverColor}33`,
              }}
            >
              <MessageSquare size={12} />
              Send Message
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserListPanel({ users, serverColor }: UserListPanelProps) {
  const grouped = STATUS_ORDER.reduce(
    (acc, status) => {
      const group = users.filter(u => u.status === status);
      if (group.length > 0) acc[status] = group;
      return acc;
    },
    {} as Record<string, GamingUser[]>
  );

  return (
    <div
      className="w-60 flex-shrink-0 flex flex-col overflow-hidden"
      style={{
        background: 'rgba(10,14,26,0.95)',
        borderLeft: '1px solid rgba(30,41,59,0.5)',
      }}
    >
      <div
        className="px-3 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(30,41,59,0.5)' }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
          Members — {users.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar py-2 px-1">
        {STATUS_ORDER.filter(s => grouped[s]).map(status => (
          <div key={status} className="mb-3">
            <div className="px-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
                {STATUS_LABELS[status]} — {grouped[status].length}
              </span>
            </div>
            {grouped[status].map(user => (
              <UserCard key={user.id} user={user} serverColor={serverColor} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
