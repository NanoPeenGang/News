'use client';

import { Flame, AlertTriangle, Shield, Radio, Globe, Zap } from 'lucide-react';
import { IntelEvent, Hotspot, Category, CATEGORY_COLORS, CATEGORY_LABELS } from '@/types';

interface StatsPanelProps {
  events: IntelEvent[];
  hotspots: Hotspot[];
}

export default function StatsPanel({ events, hotspots }: StatsPanelProps) {
  const activeHotspots = hotspots.filter(h => h.intensity > 60).length;
  const criticalEvents = events.filter(e => e.severity === 'critical').length;

  const categoryCounts: Record<Category, number> = {
    conflict: 0, protest: 0, disaster: 0, cyber: 0, military: 0, terrorism: 0,
  };
  events.forEach(e => categoryCounts[e.category]++);

  const maxCount = Math.max(...Object.values(categoryCounts), 1);

  // Find most critical region
  const regionCounts: Record<string, number> = {};
  events.filter(e => e.severity === 'critical' || e.severity === 'high').forEach(e => {
    const region = e.location.split(',').pop()?.trim() || 'Unknown';
    regionCounts[region] = (regionCounts[region] || 0) + 1;
  });
  const topRegion = Object.entries(regionCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="glass-panel flex items-center gap-6 px-4 py-2 mx-2 mb-2">
      {/* Active Hotspots */}
      <div className="flex items-center gap-2">
        <Flame className="w-4 h-4 text-red-500" />
        <div>
          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Hotspots</p>
          <p className="text-lg font-bold font-mono text-red-400">{activeHotspots}</p>
        </div>
      </div>

      {/* Critical Events */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-orange-500" />
        <div>
          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Critical</p>
          <p className="text-lg font-bold font-mono text-orange-400">{criticalEvents}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-gray-800" />

      {/* Category Breakdown */}
      <div className="flex items-end gap-1.5 flex-1">
        {(Object.entries(categoryCounts) as [Category, number][]).map(([cat, count]) => (
          <div key={cat} className="flex flex-col items-center gap-0.5 flex-1">
            <span className="text-[9px] font-mono text-gray-500">{count}</span>
            <div className="w-full rounded-sm" style={{
              backgroundColor: `${CATEGORY_COLORS[cat]}60`,
              height: `${Math.max((count / maxCount) * 28, 3)}px`,
            }} />
            <span className="text-[8px] text-gray-600 truncate w-full text-center">
              {CATEGORY_LABELS[cat].substring(0, 4)}
            </span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-gray-800 hidden md:block" />

      {/* Top Region */}
      {topRegion && (
        <div className="hidden md:flex items-center gap-2">
          <Globe className="w-4 h-4 text-yellow-500" />
          <div>
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Critical Region</p>
            <p className="text-xs font-bold text-yellow-400">{topRegion[0]}</p>
          </div>
        </div>
      )}

      {/* Sources */}
      <div className="hidden lg:flex items-center gap-2">
        <Radio className="w-4 h-4 text-emerald-500" />
        <div>
          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Sources</p>
          <p className="text-lg font-bold font-mono text-emerald-400">
            {new Set(events.map(e => e.source)).size}
          </p>
        </div>
      </div>
    </div>
  );
}
