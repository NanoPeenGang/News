export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';
export type ChannelType = 'text' | 'voice' | 'announcement';

export interface GamingUser {
  id: string;
  name: string;
  avatar: string; // initials
  avatarColor: string;
  status: UserStatus;
  game?: string;
  role: 'owner' | 'admin' | 'member';
}

export interface MessageReaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

export interface Message {
  id: string;
  userId: string;
  content: string;
  timestamp: string;
  encrypted: boolean;
  reactions?: MessageReaction[];
  replyToId?: string;
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  categoryId: string;
  locked?: boolean;
  activeUserIds?: string[];
  unread?: number;
  description?: string;
}

export interface ChannelCategory {
  id: string;
  name: string;
  channelIds: string[];
}

export interface GamingServer {
  id: string;
  name: string;
  icon: string; // emoji
  color: string;
  categories: ChannelCategory[];
  channels: Channel[];
  members: GamingUser[];
  encryptionEnabled: boolean;
}
