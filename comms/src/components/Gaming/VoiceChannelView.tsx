'use client';

import { useState } from 'react';
import {
  Mic, MicOff, Headphones, HeadphoneOff, Monitor, Video,
  VideoOff, PhoneOff, Lock, Signal
} from 'lucide-react';
import { Channel, GamingUser } from '@/types/gaming';
import ScreenShareView from './ScreenShareView';

interface VoiceChannelViewProps {
  channel: Channel;
  server: { name: string; color: string; members: GamingUser[] };
  currentUser: GamingUser;
  isMicMuted: boolean;
  isDeafened: boolean;
  isScreenSharing: boolean;
  onMicToggle: () => void;
  onDeafenToggle: () => void;
  onScreenShareToggle: () => void;
  onLeave: () => void;
}

export default function VoiceChannelView({
  channel,
  server,
  currentUser,
  isMicMuted,
  isDeafened,
  isScreenSharing,
  onMicToggle,
  onDeafenToggle,
  onScreenShareToggle,
  onLeave,
}: VoiceChannelViewProps) {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [speakingUserId] = useState<string>('u2'); // simulate someone speaking

  const participants = [
    currentUser,
    ...(channel.activeUserIds
      ?.map(id => server.members.find(m => m.id === id))
      .filter((u): u is GamingUser => !!u && u.id !== currentUser.id) ?? []),
  ];

  if (isScreenSharing) {
    return (
      <ScreenShareView
        sharerName={currentUser.name}
        serverColor={server.color}
        onStop={onScreenShareToggle}
      />
    );
  }

  return (
    <div
      className="flex-1 flex flex-col min-w-0"
      style={{ background: 'rgba(17,24,39,0.5)' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(30,41,59,0.5)', background: 'rgba(10,14,26,0.8)' }}
      >
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-[15px] font-bold" style={{ color: '#e2e8f0' }}>
          {channel.name}
        </span>
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}
        >
          <Lock size={10} style={{ color: '#10b981' }} />
          <span className="text-[10px] font-medium" style={{ color: '#10b981' }}>
            Voice E2E Encrypted · ECDH
          </span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-[11px]" style={{ color: '#10b981' }}>
          <Signal size={12} />
          <span>Connected</span>
        </div>
      </div>

      {/* Participant tiles */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className="grid gap-4 w-full"
          style={{
            gridTemplateColumns: `repeat(${Math.min(participants.length, 3)}, 1fr)`,
            maxWidth: participants.length === 1 ? 320 : participants.length === 2 ? 600 : 900,
          }}
        >
          {participants.map(user => {
            const isSpeaking = user.id === speakingUserId;
            const isCurrentUser = user.id === currentUser.id;
            const userMuted = isCurrentUser && isMicMuted;

            return (
              <div
                key={user.id}
                className="relative rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6 transition-all duration-300"
                style={{
                  background: 'rgba(17,24,39,0.8)',
                  border: isSpeaking
                    ? `2px solid ${server.color}`
                    : '2px solid rgba(30,41,59,0.6)',
                  boxShadow: isSpeaking
                    ? `0 0 20px ${server.color}44, 0 0 40px ${server.color}22`
                    : 'none',
                  minHeight: 180,
                }}
              >
                {/* Speaking animation ring */}
                {isSpeaking && (
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: `radial-gradient(ellipse at center, ${server.color}08 0%, transparent 70%)`,
                    }}
                  />
                )}

                {/* Avatar */}
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mb-3 relative"
                  style={{
                    background: user.avatarColor + '22',
                    border: isSpeaking
                      ? `3px solid ${server.color}`
                      : `3px solid ${user.avatarColor}44`,
                    color: user.avatarColor,
                    boxShadow: isSpeaking ? `0 0 15px ${server.color}66` : 'none',
                  }}
                >
                  {user.avatar}
                  {isSpeaking && (
                    <div
                      className="absolute -inset-1 rounded-full animate-pulse-ring"
                      style={{ border: `2px solid ${server.color}44` }}
                    />
                  )}
                </div>

                {/* Name */}
                <span className="text-[14px] font-semibold mb-1" style={{ color: '#e2e8f0' }}>
                  {user.name}
                  {isCurrentUser && <span className="text-[11px] ml-1" style={{ color: '#64748b' }}>(you)</span>}
                </span>

                {/* Game/status */}
                {user.game && (
                  <span className="text-[11px]" style={{ color: '#475569' }}>{user.game}</span>
                )}

                {/* Muted indicator */}
                {userMuted && (
                  <div
                    className="absolute top-3 right-3 p-1.5 rounded-full"
                    style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}
                  >
                    <MicOff size={12} style={{ color: '#ef4444' }} />
                  </div>
                )}

                {/* Speaking label */}
                {isSpeaking && (
                  <div
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{ background: `${server.color}22`, border: `1px solid ${server.color}44` }}
                  >
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="w-0.5 rounded-full"
                          style={{
                            height: 8 + i * 3,
                            background: server.color,
                            animation: `speaking-wave ${0.3 + i * 0.1}s ease-in-out infinite alternate`,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px]" style={{ color: server.color }}>Speaking</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Voice control bar */}
      <div
        className="px-6 py-4 flex items-center justify-center gap-3 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(30,41,59,0.5)', background: '#050810' }}
      >
        {/* Channel name pill */}
        <div
          className="mr-4 px-3 py-1.5 rounded-full flex items-center gap-2"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[12px]" style={{ color: '#10b981' }}>{channel.name}</span>
        </div>

        <ControlButton
          active={!isMicMuted}
          activeColor={server.color}
          inactiveColor="#ef4444"
          onClick={onMicToggle}
          title={isMicMuted ? 'Unmute' : 'Mute'}
          icon={isMicMuted ? <MicOff size={18} /> : <Mic size={18} />}
        />
        <ControlButton
          active={!isDeafened}
          activeColor={server.color}
          inactiveColor="#ef4444"
          onClick={onDeafenToggle}
          title={isDeafened ? 'Undeafen' : 'Deafen'}
          icon={isDeafened ? <HeadphoneOff size={18} /> : <Headphones size={18} />}
        />
        <ControlButton
          active={isCameraOn}
          activeColor={server.color}
          inactiveColor="#64748b"
          onClick={() => setIsCameraOn(v => !v)}
          title={isCameraOn ? 'Stop Camera' : 'Start Camera'}
          icon={isCameraOn ? <Video size={18} /> : <VideoOff size={18} />}
        />
        <ControlButton
          active={isScreenSharing}
          activeColor="#10b981"
          inactiveColor="#64748b"
          onClick={onScreenShareToggle}
          title={isScreenSharing ? 'Stop Share' : 'Share Screen'}
          icon={<Monitor size={18} />}
        />

        {/* Leave call */}
        <button
          onClick={onLeave}
          className="px-4 py-2.5 rounded-xl flex items-center gap-2 text-[13px] font-medium transition-all hover:bg-red-500/30"
          style={{
            background: 'rgba(239,68,68,0.15)',
            color: '#ef4444',
            border: '1px solid rgba(239,68,68,0.3)',
          }}
          title="Leave call"
        >
          <PhoneOff size={16} />
          Leave
        </button>
      </div>
    </div>
  );
}

function ControlButton({
  active,
  activeColor,
  inactiveColor,
  onClick,
  title,
  icon,
}: {
  active: boolean;
  activeColor: string;
  inactiveColor: string;
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-11 h-11 rounded-xl flex items-center justify-center transition-all hover:scale-110"
      style={{
        background: active ? `${activeColor}22` : `${inactiveColor}22`,
        border: `1px solid ${active ? activeColor : inactiveColor}44`,
        color: active ? activeColor : inactiveColor,
      }}
    >
      {icon}
    </button>
  );
}
