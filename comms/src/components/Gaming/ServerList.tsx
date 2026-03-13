'use client';

import { Plus } from 'lucide-react';
import { GamingServer } from '@/types/gaming';

interface ServerListProps {
  servers: GamingServer[];
  activeServerId: string;
  onServerSelect: (id: string) => void;
}

function ServerIcon({
  server,
  isActive,
  onClick,
}: {
  server: GamingServer;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <div className="relative group flex items-center">
      {/* Active indicator pill */}
      <div
        className="absolute -left-2 w-1 rounded-r-full transition-all duration-200"
        style={{
          height: isActive ? '36px' : '0px',
          background: server.color,
        }}
      />
      <button
        onClick={onClick}
        title={server.name}
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-200 hover:rounded-xl"
        style={{
          background: isActive
            ? `linear-gradient(135deg, ${server.color}33, ${server.color}22)`
            : 'rgba(30, 41, 59, 0.6)',
          border: isActive
            ? `2px solid ${server.color}66`
            : '2px solid transparent',
          boxShadow: isActive ? `0 0 12px ${server.color}44` : 'none',
        }}
      >
        {server.icon}
      </button>

      {/* Tooltip */}
      <div
        className="absolute left-14 px-2 py-1.5 rounded-md text-sm font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity duration-150"
        style={{
          background: 'rgba(10, 14, 26, 0.97)',
          border: '1px solid rgba(30,41,59,0.8)',
          color: '#e2e8f0',
        }}
      >
        {server.name}
        <div
          className="absolute right-full top-1/2 -translate-y-1/2 w-2 h-2 rotate-45"
          style={{ background: 'rgba(10, 14, 26, 0.97)', borderLeft: '1px solid rgba(30,41,59,0.8)', borderBottom: '1px solid rgba(30,41,59,0.8)' }}
        />
      </div>
    </div>
  );
}

export default function ServerList({ servers, activeServerId, onServerSelect }: ServerListProps) {
  return (
    <div
      className="w-[72px] flex-shrink-0 flex flex-col items-center py-3 gap-2"
      style={{ background: '#050810', borderRight: '1px solid rgba(30,41,59,0.5)' }}
    >
      {/* NEXUS logo mark */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1 select-none"
        style={{
          background: 'rgba(168,85,247,0.15)',
          border: '2px solid rgba(168,85,247,0.4)',
          boxShadow: '0 0 12px rgba(168,85,247,0.2)',
        }}
        title="NEXUS"
      >
        <span
          className="text-lg font-black tracking-tighter"
          style={{ color: '#a855f7', fontFamily: 'system-ui, sans-serif' }}
        >
          N
        </span>
      </div>

      {/* Divider */}
      <div className="w-8 h-px" style={{ background: 'rgba(30,41,59,0.8)' }} />

      {/* Server icons */}
      <div className="flex flex-col items-center gap-2 flex-1 overflow-y-auto w-full px-3" style={{ scrollbarWidth: 'none' }}>
        {servers.map(server => (
          <ServerIcon
            key={server.id}
            server={server}
            isActive={server.id === activeServerId}
            onClick={() => onServerSelect(server.id)}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="w-8 h-px" style={{ background: 'rgba(30,41,59,0.8)' }} />

      {/* Add server */}
      <button
        title="Add a Server"
        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 hover:rounded-xl hover:bg-green-500/20"
        style={{
          border: '2px dashed rgba(16,185,129,0.4)',
          color: '#10b981',
        }}
      >
        <Plus size={20} />
      </button>
    </div>
  );
}
