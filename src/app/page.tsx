'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import GlobeView from '@/components/Globe/GlobeView';
import EventFeed from '@/components/Sidebar/EventFeed';
import StatsPanel from '@/components/StatsPanel';
import AIBrief from '@/components/AIBrief';
import { IntelEvent, FilterState, RegionPreset } from '@/types';
import { events as fallbackEvents } from '@/data/events';
import { hotspots } from '@/data/hotspots';

const ALL_CATEGORIES = ['conflict', 'protest', 'disaster', 'cyber', 'military', 'terrorism'] as const;

export default function Dashboard() {
  const [events, setEvents] = useState<IntelEvent[]>(fallbackEvents);
  const [selectedEvent, setSelectedEvent] = useState<IntelEvent | null>(null);
  const [flyToRegion, setFlyToRegion] = useState<RegionPreset | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    categories: [...ALL_CATEGORIES],
    severity: 'all',
    timeRange: 'all',
  });
  const [loading, setLoading] = useState(true);

  // Fetch live data on mount and every 5 minutes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/events');
        if (res.ok) {
          const liveEvents: IntelEvent[] = await res.json();
          if (liveEvents.length > 0) {
            // Merge live events with fallback static events for comprehensive coverage
            const liveIds = new Set(liveEvents.map(e => e.id));
            const combined = [
              ...liveEvents,
              ...fallbackEvents.filter(e => !liveIds.has(e.id)),
            ];
            setEvents(combined);
          }
        }
      } catch {
        // Keep fallback events
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredEvents = events
    .filter(e => filters.categories.includes(e.category))
    .filter(e => filters.severity === 'all' || e.severity === filters.severity);

  const handleEventSelect = useCallback((event: IntelEvent) => {
    setSelectedEvent(event);
  }, []);

  const handleRegionSelect = useCallback((region: RegionPreset) => {
    setFlyToRegion(region);
    // Reset after animation
    setTimeout(() => setFlyToRegion(null), 1500);
  }, []);

  // Global threat level based on event severity distribution
  const threatLevel = Math.min(100, Math.round(
    (events.filter(e => e.severity === 'critical').length * 10 +
     events.filter(e => e.severity === 'high').length * 5 +
     events.filter(e => e.severity === 'medium').length * 2) /
    Math.max(events.length, 1) * 20
  ));

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden grid-bg">
      {/* Scan line overlay */}
      <div className="fixed inset-0 scan-overlay z-[1] pointer-events-none" />

      {/* Header */}
      <Header
        eventCount={events.length}
        onRegionSelect={handleRegionSelect}
        threatLevel={threatLevel}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Globe */}
        <div className="flex-1 relative">
          <GlobeView
            events={filteredEvents}
            hotspots={hotspots}
            selectedEvent={selectedEvent}
            onEventSelect={handleEventSelect}
            flyToRegion={flyToRegion}
          />

          {/* Loading overlay */}
          {loading && (
            <div className="absolute top-4 left-4 flex items-center gap-2 glass-panel px-3 py-2">
              <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] font-mono text-cyan-400">Fetching live data...</span>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-[380px] flex-shrink-0 p-2 pl-0">
          <EventFeed
            events={events}
            selectedEventId={selectedEvent?.id || null}
            onEventSelect={handleEventSelect}
            filters={filters}
            onFilterChange={setFilters}
          />
        </div>
      </div>

      {/* Bottom panels */}
      <AIBrief events={events} hotspots={hotspots} />
      <StatsPanel events={events} hotspots={hotspots} />
    </div>
  );
}
