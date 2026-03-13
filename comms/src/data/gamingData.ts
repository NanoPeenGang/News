import { GamingServer, GamingUser, Message } from '@/types/gaming';

export const allUsers: GamingUser[] = [
  { id: 'u1', name: 'GhostByte', avatar: 'GB', avatarColor: '#a855f7', status: 'online', game: 'Cyberpunk 2077', role: 'owner' },
  { id: 'u2', name: 'NeonViper', avatar: 'NV', avatarColor: '#06b6d4', status: 'online', game: 'Valorant', role: 'admin' },
  { id: 'u3', name: 'PixelWitch', avatar: 'PW', avatarColor: '#10b981', status: 'online', game: 'Elden Ring', role: 'member' },
  { id: 'u4', name: 'ShadowFox', avatar: 'SF', avatarColor: '#f97316', status: 'idle', game: 'Apex Legends', role: 'member' },
  { id: 'u5', name: 'CryptoKnight', avatar: 'CK', avatarColor: '#eab308', status: 'online', game: 'Starfield', role: 'admin' },
  { id: 'u6', name: 'StormRider', avatar: 'SR', avatarColor: '#ef4444', status: 'dnd', game: 'Overwatch 2', role: 'member' },
  { id: 'u7', name: 'VoidWalker', avatar: 'VW', avatarColor: '#a855f7', status: 'online', game: 'League of Legends', role: 'member' },
  { id: 'u8', name: 'IronClad', avatar: 'IC', avatarColor: '#94a3b8', status: 'idle', role: 'member' },
  { id: 'u9', name: 'LunaStrike', avatar: 'LS', avatarColor: '#06b6d4', status: 'offline', role: 'member' },
  { id: 'u10', name: 'ArcReactor', avatar: 'AR', avatarColor: '#10b981', status: 'offline', role: 'member' },
];

export const mockMessages: Record<string, Message[]> = {
  'ch-general': [
    { id: 'm1', userId: 'u1', content: 'Welcome to Neon Raiders! This is a secure, encrypted space for our crew 🔐', timestamp: '2026-03-13T08:00:00Z', encrypted: true, reactions: [{ emoji: '🔥', count: 5, reacted: false }, { emoji: '👾', count: 3, reacted: true }] },
    { id: 'm2', userId: 'u2', content: 'Finally a platform with real E2E encryption. Tired of those "trust us" services lol', timestamp: '2026-03-13T08:05:00Z', encrypted: true, reactions: [{ emoji: '💯', count: 7, reacted: false }] },
    { id: 'm3', userId: 'u3', content: 'Did you all see the new Elden Ring DLC announcement? We need to plan a co-op run ASAP', timestamp: '2026-03-13T09:12:00Z', encrypted: true, reactions: [{ emoji: '⚔️', count: 4, reacted: true }, { emoji: '🎮', count: 6, reacted: false }] },
    { id: 'm4', userId: 'u4', content: 'I\'m in for the co-op! Can we schedule for Friday night? I\'ll set up a voice channel', timestamp: '2026-03-13T09:15:00Z', encrypted: true },
    { id: 'm5', userId: 'u5', content: 'Friday works. I just tested the screen share feature — works great for showing build guides', timestamp: '2026-03-13T09:20:00Z', encrypted: true, reactions: [{ emoji: '👍', count: 3, reacted: false }] },
    { id: 'm6', userId: 'u2', content: 'PSA: All voice channels now use ECDH key exchange for E2E encryption. Your conversations stay private 🔒', timestamp: '2026-03-13T10:00:00Z', encrypted: true, reactions: [{ emoji: '🔐', count: 9, reacted: true }, { emoji: '🛡️', count: 5, reacted: false }] },
    { id: 'm7', userId: 'u7', content: 'Just hit Diamond in League. GGs everyone who helped me grind ranked 🏆', timestamp: '2026-03-13T10:30:00Z', encrypted: true, reactions: [{ emoji: '🏆', count: 11, reacted: true }, { emoji: '🎉', count: 8, reacted: false }] },
    { id: 'm8', userId: 'u3', content: '@VoidWalker Congrats!! That grind was real 💪', timestamp: '2026-03-13T10:32:00Z', encrypted: true, replyToId: 'm7' },
    { id: 'm9', userId: 'u1', content: 'Server update: I\'ve enabled voice encryption for all channels. AES-256-GCM with rotating session keys every 10 minutes', timestamp: '2026-03-13T11:00:00Z', encrypted: true, reactions: [{ emoji: '🔐', count: 6, reacted: false }] },
    { id: 'm10', userId: 'u6', content: 'Anyone up for some Overwatch ranked? Need 2 more for a full team', timestamp: '2026-03-13T11:45:00Z', encrypted: true },
    { id: 'm11', userId: 'u4', content: 'I\'m in! Give me 5 mins to finish this Apex match', timestamp: '2026-03-13T11:47:00Z', encrypted: true, replyToId: 'm10' },
    { id: 'm12', userId: 'u2', content: 'Dropping in too. Let\'s hop in the Ranked voice channel', timestamp: '2026-03-13T11:48:00Z', encrypted: true },
  ],
  'ch-strategies': [
    { id: 's1', userId: 'u5', content: 'New meta strat for Valorant: stacking Viper + Brimstone smoke on A site has insane win rate right now', timestamp: '2026-03-13T07:00:00Z', encrypted: true, reactions: [{ emoji: '🧪', count: 4, reacted: false }] },
    { id: 's2', userId: 'u2', content: 'Confirmed, been running this for a week. 70% win rate on Bind and Ascent', timestamp: '2026-03-13T07:05:00Z', encrypted: true, reactions: [{ emoji: '📊', count: 3, reacted: true }] },
    { id: 's3', userId: 'u7', content: 'For anyone doing ranked LoL — Zeri + Lulu bot lane is broken right now post-patch 14.5', timestamp: '2026-03-13T08:30:00Z', encrypted: true },
    { id: 's4', userId: 'u1', content: 'Good call. I\'ve been using screen share to walk people through builds. Check the #resources channel for the stream recording', timestamp: '2026-03-13T09:00:00Z', encrypted: true, reactions: [{ emoji: '👀', count: 5, reacted: true }] },
  ],
  'ch-announcements': [
    { id: 'a1', userId: 'u1', content: '📢 **Server Update v2.0** — End-to-end encryption is now active for ALL channels including voice and screen share. Your privacy is our #1 priority.', timestamp: '2026-03-13T06:00:00Z', encrypted: true, reactions: [{ emoji: '🔐', count: 14, reacted: true }] },
    { id: 'a2', userId: 'u1', content: '🎮 **Game Night — Friday March 15th** — Elden Ring co-op starting at 8PM EST. Join the "Raid Party" voice channel 30 mins early for setup.', timestamp: '2026-03-13T06:30:00Z', encrypted: true, reactions: [{ emoji: '⚔️', count: 9, reacted: false }, { emoji: '🎉', count: 7, reacted: true }] },
  ],
  'ch-off-topic': [
    { id: 'ot1', userId: 'u8', content: 'Anyone watching the new Arcane season? That animation is just insane', timestamp: '2026-03-12T20:00:00Z', encrypted: true, reactions: [{ emoji: '😍', count: 6, reacted: false }] },
    { id: 'ot2', userId: 'u3', content: 'Yes!! Silco was such a good villain. Season 2 has some heavy moments', timestamp: '2026-03-12T20:05:00Z', encrypted: true },
    { id: 'ot3', userId: 'u9', content: 'No spoilers pls I\'m only on episode 4 😭', timestamp: '2026-03-12T20:10:00Z', encrypted: true, reactions: [{ emoji: '😂', count: 5, reacted: true }] },
    { id: 'ot4', userId: 'u5', content: 'Also — anyone got the new RTX 5090? Wondering if the performance uplift is worth it for 4K gaming', timestamp: '2026-03-12T21:00:00Z', encrypted: true },
    { id: 'ot5', userId: 'u2', content: 'Benchmarks look insane but the price... ouch. Waiting for the 5080 Ti tbh', timestamp: '2026-03-12T21:05:00Z', encrypted: true, reactions: [{ emoji: '💸', count: 8, reacted: true }] },
  ],
};

export const servers: GamingServer[] = [
  {
    id: 'server-1',
    name: 'Neon Raiders',
    icon: '⚡',
    color: '#a855f7',
    encryptionEnabled: true,
    categories: [
      {
        id: 'cat-1', name: 'TEXT CHANNELS',
        channelIds: ['ch-announcements', 'ch-general', 'ch-strategies', 'ch-off-topic'],
      },
      {
        id: 'cat-2', name: 'VOICE CHANNELS',
        channelIds: ['vc-general', 'vc-ranked', 'vc-chill'],
      },
    ],
    channels: [
      { id: 'ch-announcements', name: 'announcements', type: 'announcement', categoryId: 'cat-1', locked: true, unread: 2, description: 'Important server updates and announcements' },
      { id: 'ch-general', name: 'general', type: 'text', categoryId: 'cat-1', unread: 5, description: 'General gaming chat for everyone' },
      { id: 'ch-strategies', name: 'strategies', type: 'text', categoryId: 'cat-1', description: 'Meta builds, tips and strategies' },
      { id: 'ch-off-topic', name: 'off-topic', type: 'text', categoryId: 'cat-1', description: 'Anything goes' },
      { id: 'vc-general', name: 'General', type: 'voice', categoryId: 'cat-2', activeUserIds: ['u1', 'u3'] },
      { id: 'vc-ranked', name: 'Ranked Grind', type: 'voice', categoryId: 'cat-2', activeUserIds: ['u2', 'u6', 'u7'] },
      { id: 'vc-chill', name: 'Chill Zone', type: 'voice', categoryId: 'cat-2', activeUserIds: [] },
    ],
    members: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8'].map(id => allUsers.find(u => u.id === id)!),
  },
  {
    id: 'server-2',
    name: 'Pixel Legends',
    icon: '🎮',
    color: '#06b6d4',
    encryptionEnabled: true,
    categories: [
      { id: 'cat-3', name: 'TEXT CHANNELS', channelIds: ['ch-general-2', 'ch-clips'] },
      { id: 'cat-4', name: 'VOICE CHANNELS', channelIds: ['vc-lobby', 'vc-stream'] },
    ],
    channels: [
      { id: 'ch-general-2', name: 'general', type: 'text', categoryId: 'cat-3', unread: 1 },
      { id: 'ch-clips', name: 'clips-and-highlights', type: 'text', categoryId: 'cat-3' },
      { id: 'vc-lobby', name: 'Lobby', type: 'voice', categoryId: 'cat-4', activeUserIds: ['u5'] },
      { id: 'vc-stream', name: 'Stream Watch Party', type: 'voice', categoryId: 'cat-4', activeUserIds: [] },
    ],
    members: ['u2', 'u3', 'u5', 'u8', 'u9', 'u10'].map(id => allUsers.find(u => u.id === id)!),
  },
  {
    id: 'server-3',
    name: 'Shadow Protocol',
    icon: '🕶️',
    color: '#10b981',
    encryptionEnabled: true,
    categories: [
      { id: 'cat-5', name: 'SECURE CHANNELS', channelIds: ['ch-ops', 'ch-intel'] },
      { id: 'cat-6', name: 'VOICE OPS', channelIds: ['vc-ops-1', 'vc-ops-2'] },
    ],
    channels: [
      { id: 'ch-ops', name: 'operations', type: 'text', categoryId: 'cat-5', unread: 3 },
      { id: 'ch-intel', name: 'intel-sharing', type: 'text', categoryId: 'cat-5' },
      { id: 'vc-ops-1', name: 'Op Alpha', type: 'voice', categoryId: 'cat-6', activeUserIds: ['u4', 'u6'] },
      { id: 'vc-ops-2', name: 'Op Bravo', type: 'voice', categoryId: 'cat-6', activeUserIds: [] },
    ],
    members: ['u1', 'u4', 'u6', 'u7', 'u8'].map(id => allUsers.find(u => u.id === id)!),
  },
  {
    id: 'server-4',
    name: 'Cosmic Drift',
    icon: '🚀',
    color: '#f97316',
    encryptionEnabled: true,
    categories: [
      { id: 'cat-7', name: 'TEXT CHANNELS', channelIds: ['ch-space-general', 'ch-fleet'] },
      { id: 'cat-8', name: 'VOICE CHANNELS', channelIds: ['vc-bridge', 'vc-hangar'] },
    ],
    channels: [
      { id: 'ch-space-general', name: 'general', type: 'text', categoryId: 'cat-7' },
      { id: 'ch-fleet', name: 'fleet-coordination', type: 'text', categoryId: 'cat-7', unread: 2 },
      { id: 'vc-bridge', name: 'Ship Bridge', type: 'voice', categoryId: 'cat-8', activeUserIds: ['u9'] },
      { id: 'vc-hangar', name: 'Hangar Bay', type: 'voice', categoryId: 'cat-8', activeUserIds: [] },
    ],
    members: ['u3', 'u5', 'u7', 'u9', 'u10'].map(id => allUsers.find(u => u.id === id)!),
  },
  {
    id: 'server-5',
    name: 'Iron Forge',
    icon: '⚔️',
    color: '#ef4444',
    encryptionEnabled: true,
    categories: [
      { id: 'cat-9', name: 'TEXT CHANNELS', channelIds: ['ch-forge-general', 'ch-crafting'] },
      { id: 'cat-10', name: 'VOICE CHANNELS', channelIds: ['vc-dungeon', 'vc-forge'] },
    ],
    channels: [
      { id: 'ch-forge-general', name: 'general', type: 'text', categoryId: 'cat-9', unread: 7 },
      { id: 'ch-crafting', name: 'crafting-builds', type: 'text', categoryId: 'cat-9' },
      { id: 'vc-dungeon', name: 'Dungeon Run', type: 'voice', categoryId: 'cat-10', activeUserIds: ['u2', 'u4', 'u8'] },
      { id: 'vc-forge', name: 'The Forge', type: 'voice', categoryId: 'cat-10', activeUserIds: [] },
    ],
    members: ['u1', 'u2', 'u4', 'u6', 'u8', 'u10'].map(id => allUsers.find(u => u.id === id)!),
  },
];

// Current logged-in user
export const currentUser: GamingUser = allUsers[0]; // GhostByte
