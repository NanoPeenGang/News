'use client';

import { useState, useCallback } from 'react';
import { GamingServer, Message, Channel } from '@/types/gaming';
import { servers, mockMessages, currentUser } from '@/data/gamingData';
import ServerList from '@/components/Gaming/ServerList';
import ChannelSidebar from '@/components/Gaming/ChannelSidebar';
import ChatArea from '@/components/Gaming/ChatArea';
import VoiceChannelView from '@/components/Gaming/VoiceChannelView';
import UserListPanel from '@/components/Gaming/UserListPanel';

export default function GamingPage() {
  const [activeServerId, setActiveServerId] = useState(servers[0].id);
  const [activeChannelId, setActiveChannelId] = useState('ch-general');
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>(mockMessages);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showUserList, setShowUserList] = useState(true);

  const activeServer: GamingServer = servers.find(s => s.id === activeServerId) ?? servers[0];
  const activeChannel: Channel | undefined =
    activeServer.channels.find(c => c.id === activeChannelId);
  const activeVoiceChannel: Channel | undefined = activeVoiceChannelId
    ? activeServer.channels.find(c => c.id === activeVoiceChannelId)
    : undefined;

  const handleServerSelect = useCallback((id: string) => {
    setActiveServerId(id);
    const server = servers.find(s => s.id === id);
    if (server) {
      // Select first text channel of new server
      const firstText = server.channels.find(c => c.type === 'text' || c.type === 'announcement');
      if (firstText) setActiveChannelId(firstText.id);
    }
    setActiveVoiceChannelId(null);
    setIsScreenSharing(false);
  }, []);

  const handleSendMessage = useCallback((content: string) => {
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      userId: currentUser.id,
      content,
      timestamp: new Date().toISOString(),
      encrypted: true,
    };
    setMessages(prev => ({
      ...prev,
      [activeChannelId]: [...(prev[activeChannelId] ?? []), newMsg],
    }));
  }, [activeChannelId]);

  const handleReact = useCallback((messageId: string, emoji: string) => {
    setMessages(prev => {
      const channelMsgs = [...(prev[activeChannelId] ?? [])];
      const idx = channelMsgs.findIndex(m => m.id === messageId);
      if (idx === -1) return prev;

      const msg = { ...channelMsgs[idx] };
      const reactions = [...(msg.reactions ?? [])];
      const reactionIdx = reactions.findIndex(r => r.emoji === emoji);

      if (reactionIdx >= 0) {
        const r = reactions[reactionIdx];
        reactions[reactionIdx] = {
          ...r,
          reacted: !r.reacted,
          count: r.reacted ? r.count - 1 : r.count + 1,
        };
      } else {
        reactions.push({ emoji, count: 1, reacted: true });
      }

      msg.reactions = reactions.filter(r => r.count > 0);
      channelMsgs[idx] = msg;

      return { ...prev, [activeChannelId]: channelMsgs };
    });
  }, [activeChannelId]);

  const handleVoiceJoin = useCallback((channelId: string) => {
    if (activeVoiceChannelId === channelId) {
      setActiveVoiceChannelId(null);
      setIsScreenSharing(false);
    } else {
      setActiveVoiceChannelId(channelId);
    }
  }, [activeVoiceChannelId]);

  const handleLeaveVoice = useCallback(() => {
    setActiveVoiceChannelId(null);
    setIsScreenSharing(false);
  }, []);

  const channelMessages = messages[activeChannelId] ?? [];

  return (
    <div className="h-screen w-screen flex overflow-hidden grid-bg" style={{ background: '#0a0e1a' }}>
      {/* Server list */}
      <ServerList
        servers={servers}
        activeServerId={activeServerId}
        onServerSelect={handleServerSelect}
      />

      {/* Channel sidebar */}
      <ChannelSidebar
        server={activeServer}
        activeChannelId={activeChannelId}
        activeVoiceChannelId={activeVoiceChannelId}
        currentUser={currentUser}
        isMicMuted={isMicMuted}
        isDeafened={isDeafened}
        onChannelSelect={setActiveChannelId}
        onVoiceChannelJoin={handleVoiceJoin}
        onMicToggle={() => setIsMicMuted(v => !v)}
        onDeafenToggle={() => setIsDeafened(v => !v)}
      />

      {/* Main area */}
      <div className="flex-1 flex min-w-0">
        {activeVoiceChannel ? (
          <VoiceChannelView
            channel={activeVoiceChannel}
            server={activeServer}
            currentUser={currentUser}
            isMicMuted={isMicMuted}
            isDeafened={isDeafened}
            isScreenSharing={isScreenSharing}
            onMicToggle={() => setIsMicMuted(v => !v)}
            onDeafenToggle={() => setIsDeafened(v => !v)}
            onScreenShareToggle={() => setIsScreenSharing(v => !v)}
            onLeave={handleLeaveVoice}
          />
        ) : activeChannel ? (
          <ChatArea
            channel={activeChannel}
            messages={channelMessages}
            users={activeServer.members}
            currentUser={currentUser}
            serverColor={activeServer.color}
            showUserList={showUserList}
            onToggleUserList={() => setShowUserList(v => !v)}
            onSendMessage={handleSendMessage}
            onReact={handleReact}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[14px]" style={{ color: '#475569' }}>Select a channel</span>
          </div>
        )}

        {/* User list (only in text channels) */}
        {!activeVoiceChannel && showUserList && (
          <UserListPanel
            users={activeServer.members}
            serverColor={activeServer.color}
          />
        )}
      </div>
    </div>
  );
}
