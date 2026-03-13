'use client';

import { Crosshair, Flame, CloudLightning, ShieldAlert, Swords, Megaphone, Bug } from 'lucide-react';
import { IntelEvent, Category, CATEGORY_COLORS } from '@/types';
import { timeAgo } from '@/lib/utils';

interface EventCardProps {
  event: IntelEvent;
  isSelected: boolean;
  onClick: () => void;
}

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  conflict: <Swords className="w-3.5 h-3.5" />,
  protest: <Megaphone className="w-3.5 h-3.5" />,
  disaster: <CloudLightning className="w-3.5 h-3.5" />,
  cyber: <Bug className="w-3.5 h-3.5" />,
  military: <ShieldAlert className="w-3.5 h-3.5" />,
  terrorism: <Flame className="w-3.5 h-3.5" />,
};

export default function EventCard({ event, isSelected, onClick }: EventCardProps) {
  const color = CATEGORY_COLORS[event.category];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 border-l-2 transition-all hover:bg-white/5 ${
        isSelected ? 'bg-white/5 border-opacity-100' : 'border-opacity-40 hover:border-opacity-70'
      }`}
      style={{ borderLeftColor: color }}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5" style={{ color }}>{CATEGORY_ICONS[event.category]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-gray-100 leading-tight truncate">
            {event.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-gray-500 font-mono">{event.location}</span>
            <span className={`badge-${event.severity} text-[9px] px-1.5 py-0 rounded font-bold uppercase tracking-wider`}>
              {event.severity}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-gray-600 font-mono">{event.source}</span>
            <span className="text-[10px] text-gray-600 font-mono">{timeAgo(event.timestamp)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
