'use client';

import { useState, useEffect } from 'react';
import { Shield, Radio, Globe, Activity } from 'lucide-react';
import { RegionPreset } from '@/types';
import { regionPresets } from '@/data/regions';

interface HeaderProps {
  eventCount: number;
  onRegionSelect: (region: RegionPreset) => void;
  threatLevel: number;
}

export default function Header({ eventCount, onRegionSelect, threatLevel }: HeaderProps) {
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setUtcTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const getThreatInfo = () => {
    if (threatLevel >= 80) return { label: 'CRITICAL', color: 'text-red-500', bg: 'bg-red-500/20', border: 'border-red-500/30', pulse: true };
    if (threatLevel >= 60) return { label: 'HIGH', color: 'text-orange-500', bg: 'bg-orange-500/20', border: 'border-orange-500/30', pulse: true };
    if (threatLevel >= 40) return { label: 'ELEVATED', color: 'text-yellow-500', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', pulse: false };
    return { label: 'MODERATE', color: 'text-green-500', bg: 'bg-green-500/20', border: 'border-green-500/30', pulse: false };
  };

  const threat = getThreatInfo();

  return (
    <header className="glass-panel flex items-center justify-between px-4 py-2 mx-2 mt-2 z-50">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-cyan-400" />
          <h1 className="text-lg font-bold tracking-wider text-white">
            AEGIS<span className="text-cyan-400"> MONITOR</span>
          </h1>
        </div>
        <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase hidden sm:block">
          Global OSINT Platform
        </span>
      </div>

      {/* Threat Level + Event Counter */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${threat.bg} ${threat.border}`}>
          <div className={`w-2 h-2 rounded-full ${threat.color.replace('text-', 'bg-')} ${threat.pulse ? 'animate-pulse-glow' : ''}`} />
          <span className={`text-xs font-bold font-mono tracking-wider ${threat.color}`}>
            THREAT: {threat.label}
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
          <Radio className="w-3 h-3 text-cyan-400 animate-pulse-glow" />
          <span className="text-xs font-mono text-cyan-400">{eventCount} EVENTS</span>
        </div>
      </div>

      {/* Region Buttons */}
      <div className="hidden lg:flex items-center gap-1">
        {regionPresets.map((region) => (
          <button
            key={region.name}
            onClick={() => onRegionSelect(region)}
            className="px-2 py-1 text-[11px] font-mono text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded transition-all"
          >
            {region.name}
          </button>
        ))}
      </div>

      {/* UTC Clock */}
      <div className="hidden md:flex items-center gap-2 text-gray-500">
        <Activity className="w-3 h-3" />
        <span className="text-[11px] font-mono tracking-wide">{utcTime}</span>
      </div>
    </header>
  );
}
