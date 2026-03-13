'use client';

import { Radio } from 'lucide-react';
import { IntelEvent, FilterState } from '@/types';
import { isWithinTimeRange } from '@/lib/utils';
import Filters from './Filters';
import EventCard from './EventCard';

interface EventFeedProps {
  events: IntelEvent[];
  selectedEventId: string | null;
  onEventSelect: (event: IntelEvent) => void;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export default function EventFeed({
  events,
  selectedEventId,
  onEventSelect,
  filters,
  onFilterChange,
}: EventFeedProps) {
  const filteredEvents = events
    .filter(e => filters.categories.includes(e.category))
    .filter(e => filters.severity === 'all' || e.severity === filters.severity)
    .filter(e => isWithinTimeRange(e.timestamp, filters.timeRange))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="glass-panel flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="w-3.5 h-3.5 text-red-500" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse-glow" />
          </div>
          <span className="text-xs font-bold tracking-widest text-gray-300 uppercase">
            Live Intelligence Feed
          </span>
        </div>
        <span className="text-[10px] font-mono text-gray-500">{filteredEvents.length} events</span>
      </div>

      {/* Filters */}
      <Filters filters={filters} onFilterChange={onFilterChange} />

      {/* Event List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-gray-800/50">
        {filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
            No events match current filters
          </div>
        ) : (
          filteredEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              isSelected={selectedEventId === event.id}
              onClick={() => onEventSelect(event)}
            />
          ))
        )}
      </div>
    </div>
  );
}
