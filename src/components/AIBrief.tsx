'use client';

import { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, AlertTriangle, TrendingUp } from 'lucide-react';
import { IntelEvent, Hotspot } from '@/types';

interface AIBriefProps {
  events: IntelEvent[];
  hotspots: Hotspot[];
}

export default function AIBrief({ events, hotspots }: AIBriefProps) {
  const [expanded, setExpanded] = useState(false);

  const criticalCount = events.filter(e => e.severity === 'critical').length;
  const topHotspots = hotspots.sort((a, b) => b.intensity - a.intensity).slice(0, 3);
  const conflictEvents = events.filter(e => e.category === 'conflict');
  const cyberEvents = events.filter(e => e.category === 'cyber');

  // Generate dynamic brief based on actual data
  const generateBrief = () => {
    const lines: string[] = [];
    lines.push(`SITUATION OVERVIEW: Monitoring ${events.length} active events across ${new Set(events.map(e => e.location.split(',').pop()?.trim())).size} countries. ${criticalCount} events classified as CRITICAL.`);

    if (topHotspots.length > 0) {
      lines.push(`PRIORITY HOTSPOTS: ${topHotspots.map(h => `${h.name} (intensity: ${h.intensity}/100)`).join('; ')}.`);
    }

    if (conflictEvents.length > 0) {
      lines.push(`CONFLICT ANALYSIS: ${conflictEvents.length} active conflict events detected. Primary theaters include ${conflictEvents.slice(0, 3).map(e => e.location).join(', ')}.`);
    }

    if (cyberEvents.length > 0) {
      lines.push(`CYBER DOMAIN: ${cyberEvents.length} cyber incidents tracked. ${cyberEvents.filter(e => e.severity === 'critical').length} classified as critical infrastructure threats.`);
    }

    return lines;
  };

  const briefLines = generateBrief();

  return (
    <div className="glass-panel mx-2 mb-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-all"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold tracking-widest text-gray-300 uppercase">
            AI Intelligence Brief
          </span>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px] font-mono">
              <AlertTriangle className="w-2.5 h-2.5" />
              {criticalCount} CRITICAL
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-800">
          {briefLines.map((line, i) => (
            <p key={i} className="text-[12px] text-gray-400 leading-relaxed font-mono mt-2">
              {line}
            </p>
          ))}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-800">
            <TrendingUp className="w-3 h-3 text-cyan-500" />
            <span className="text-[10px] text-gray-600 font-mono">
              Analysis generated from {events.length} data points • Updated {new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
