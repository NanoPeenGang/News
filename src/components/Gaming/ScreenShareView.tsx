'use client';

import { X, Monitor, Wifi, ChevronDown } from 'lucide-react';

interface ScreenShareViewProps {
  sharerName: string;
  serverColor: string;
  onStop: () => void;
}

export default function ScreenShareView({ sharerName, serverColor, onStop }: ScreenShareViewProps) {
  return (
    <div
      className="flex-1 flex flex-col min-w-0 items-center justify-center relative"
      style={{ background: '#050810' }}
    >
      {/* Header bar */}
      <div
        className="absolute top-0 left-0 right-0 px-4 py-2 flex items-center gap-3"
        style={{ background: 'rgba(10,14,26,0.9)', borderBottom: '1px solid rgba(30,41,59,0.5)' }}
      >
        <Monitor size={16} style={{ color: serverColor }} />
        <span className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>
          {sharerName}&apos;s Screen
        </span>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[11px]" style={{ color: '#10b981' }}>LIVE</span>
        </div>
        <div className="flex items-center gap-1 text-[11px]" style={{ color: '#64748b' }}>
          <Wifi size={12} />
          <span>1080p 60fps</span>
        </div>
        <div className="flex-1" />
        <button
          onClick={onStop}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium transition-colors hover:bg-red-500/20"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <X size={12} />
          Stop Sharing
        </button>
      </div>

      {/* Simulated screen content */}
      <div
        className="w-full max-w-4xl mx-auto rounded-xl overflow-hidden mt-14 mb-4 mx-4"
        style={{
          border: `2px solid ${serverColor}44`,
          boxShadow: `0 0 40px ${serverColor}22`,
          aspectRatio: '16/9',
          background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1117 50%, #0a0e1a 100%)',
        }}
      >
        {/* Mock game screen */}
        <div className="w-full h-full relative flex items-center justify-center">
          {/* Background grid */}
          <div className="absolute inset-0 grid-bg opacity-30" />

          {/* Mock HUD elements */}
          <div className="absolute top-4 left-4 flex items-center gap-3">
            <div className="px-2 py-1 rounded text-[11px] font-mono" style={{ background: 'rgba(0,0,0,0.7)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
              ❤️ 847 / 1200
            </div>
            <div className="px-2 py-1 rounded text-[11px] font-mono" style={{ background: 'rgba(0,0,0,0.7)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}>
              🔵 500 / 500
            </div>
          </div>

          <div className="absolute top-4 right-4 text-right">
            <div className="text-[11px] font-mono px-2 py-1 rounded" style={{ background: 'rgba(0,0,0,0.7)', color: '#eab308' }}>
              ⏱ 00:23:47
            </div>
          </div>

          {/* Center content */}
          <div className="text-center z-10">
            <div className="text-6xl mb-4">🎮</div>
            <div className="text-[18px] font-bold mb-2" style={{ color: serverColor }}>
              Screen Share Active
            </div>
            <div className="text-[13px]" style={{ color: '#64748b' }}>
              End-to-end encrypted · WebRTC P2P
            </div>
          </div>

          {/* Bottom HUD */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {['⚔️', '🛡️', '💊', '💣', '🔮'].map((item, i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{
                  background: i === 0 ? `${serverColor}33` : 'rgba(0,0,0,0.7)',
                  border: i === 0 ? `2px solid ${serverColor}88` : '2px solid rgba(30,41,59,0.6)',
                }}
              >
                {item}
              </div>
            ))}
          </div>

          {/* Minimap */}
          <div
            className="absolute bottom-4 right-4 w-24 h-24 rounded-lg overflow-hidden"
            style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(30,41,59,0.6)' }}
          >
            <div className="w-full h-full relative">
              <div className="absolute inset-0 grid-bg opacity-20" />
              <div className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2"
                style={{ background: serverColor }} />
            </div>
          </div>
        </div>
      </div>

      {/* Quality selector */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[11px]" style={{ color: '#475569' }}>Quality:</span>
        <button
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px]"
          style={{ background: 'rgba(30,41,59,0.6)', color: '#94a3b8', border: '1px solid rgba(30,41,59,0.8)' }}
        >
          1080p 60fps <ChevronDown size={10} />
        </button>
      </div>
    </div>
  );
}
