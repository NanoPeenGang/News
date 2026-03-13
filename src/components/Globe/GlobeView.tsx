'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { IntelEvent, Hotspot, RegionPreset, CATEGORY_COLORS } from '@/types';
import { getPointSize } from '@/lib/utils';

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

interface GlobeViewProps {
  events: IntelEvent[];
  hotspots: Hotspot[];
  selectedEvent: IntelEvent | null;
  onEventSelect: (event: IntelEvent) => void;
  flyToRegion: RegionPreset | null;
}

export default function GlobeView({
  events,
  hotspots,
  selectedEvent,
  onEventSelect,
  flyToRegion,
}: GlobeViewProps) {
  const globeRef = useRef<any>(null);
  const [globeReady, setGlobeReady] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState<IntelEvent | null>(null);
  const autoRotateTimer = useRef<NodeJS.Timeout | null>(null);

  // Globe ready handler
  const handleGlobeReady = useCallback(() => {
    setGlobeReady(true);
    const globe = globeRef.current;
    if (globe) {
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.4;
      globe.controls().enableZoom = true;
      globe.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 0);
    }
  }, []);

  // Pause rotation on interaction, resume after 5s idle
  const handleInteraction = useCallback(() => {
    const globe = globeRef.current;
    if (globe) {
      globe.controls().autoRotate = false;
      if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
      autoRotateTimer.current = setTimeout(() => {
        if (globe.controls()) globe.controls().autoRotate = true;
      }, 5000);
    }
  }, []);

  // Fly to region
  useEffect(() => {
    if (flyToRegion && globeRef.current) {
      globeRef.current.pointOfView(
        { lat: flyToRegion.lat, lng: flyToRegion.lng, altitude: flyToRegion.altitude },
        1000
      );
      handleInteraction();
    }
  }, [flyToRegion, handleInteraction]);

  // Fly to selected event
  useEffect(() => {
    if (selectedEvent && globeRef.current) {
      globeRef.current.pointOfView(
        { lat: selectedEvent.lat, lng: selectedEvent.lng, altitude: 1.0 },
        1000
      );
      handleInteraction();
    }
  }, [selectedEvent, handleInteraction]);

  // Heatmap data from hotspots
  const heatmapData = useMemo(() =>
    hotspots.map(h => ({
      lat: h.lat,
      lng: h.lng,
      weight: h.intensity / 100,
    })),
    [hotspots]
  );

  // Ring data for critical events
  const ringsData = useMemo(() =>
    events
      .filter(e => e.severity === 'critical')
      .map(e => ({
        lat: e.lat,
        lng: e.lng,
        maxR: 3,
        propagationSpeed: 2,
        repeatPeriod: 1500,
        color: CATEGORY_COLORS[e.category],
      })),
    [events]
  );

  // Arc data connecting related events
  const arcsData = useMemo(() => {
    const arcs: any[] = [];
    events.forEach(e => {
      if (e.relatedEventIds) {
        e.relatedEventIds.forEach(relId => {
          const related = events.find(r => r.id === relId);
          if (related) {
            arcs.push({
              startLat: e.lat,
              startLng: e.lng,
              endLat: related.lat,
              endLng: related.lng,
              color: CATEGORY_COLORS[e.category],
            });
          }
        });
      }
    });
    return arcs;
  }, [events]);

  return (
    <div className="relative w-full h-full globe-container" onMouseDown={handleInteraction}>
      <Globe
        ref={globeRef}
        onGlobeReady={handleGlobeReady}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        atmosphereColor="#06b6d4"
        atmosphereAltitude={0.2}
        // Points layer - events
        pointsData={events}
        pointLat={(d: any) => d.lat}
        pointLng={(d: any) => d.lng}
        pointColor={(d: any) => CATEGORY_COLORS[d.category as keyof typeof CATEGORY_COLORS]}
        pointAltitude={(d: any) => getPointSize(d.severity) * 0.06}
        pointRadius={(d: any) => getPointSize(d.severity) * 0.4}
        pointLabel={(d: any) => `
          <div style="background: rgba(0,0,0,0.85); padding: 8px 12px; border-radius: 6px; border: 1px solid ${CATEGORY_COLORS[d.category as keyof typeof CATEGORY_COLORS]}40; max-width: 280px;">
            <div style="color: ${CATEGORY_COLORS[d.category as keyof typeof CATEGORY_COLORS]}; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">${d.category}</div>
            <div style="color: #e2e8f0; font-size: 13px; font-weight: 600; margin-bottom: 4px;">${d.title}</div>
            <div style="color: #94a3b8; font-size: 11px;">${d.location}</div>
            <div style="color: #64748b; font-size: 10px; margin-top: 4px;">${d.source}</div>
          </div>
        `}
        onPointClick={(point: any) => onEventSelect(point as IntelEvent)}
        // Arcs layer - related events
        arcsData={arcsData}
        arcStartLat={(d: any) => d.startLat}
        arcStartLng={(d: any) => d.startLng}
        arcEndLat={(d: any) => d.endLat}
        arcEndLng={(d: any) => d.endLng}
        arcColor={(d: any) => [`${d.color}60`, `${d.color}60`]}
        arcDashLength={0.5}
        arcDashGap={0.3}
        arcDashAnimateTime={2000}
        arcStroke={0.5}
        // Rings layer - critical events
        ringsData={ringsData}
        ringLat={(d: any) => d.lat}
        ringLng={(d: any) => d.lng}
        ringMaxRadius={(d: any) => d.maxR}
        ringPropagationSpeed={(d: any) => d.propagationSpeed}
        ringRepeatPeriod={(d: any) => d.repeatPeriod}
        ringColor={(d: any) => {
          const rgb = hexToRgb(d.color);
          return (t: number) => `rgba(${rgb}, ${1 - t})`;
        }}
        // Heatmap layer
        heatmapsData={[heatmapData]}
        heatmapPointLat="lat"
        heatmapPointLng="lng"
        heatmapPointWeight="weight"
        heatmapBandwidth={3.5}
        heatmapColorFn={(t: number) => `rgba(239, 68, 68, ${t * 0.6})`}
        heatmapTopAltitude={0.05}
        // Settings
        animateIn={true}
        width={typeof window !== 'undefined' ? window.innerWidth * 0.65 : 1000}
        height={typeof window !== 'undefined' ? window.innerHeight - 120 : 700}
      />

      {/* Hover tooltip handled by globe.gl labels */}
      {!globeReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-mono text-cyan-400 tracking-wider">INITIALIZING GLOBE...</span>
          </div>
        </div>
      )}
    </div>
  );
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '255, 255, 255';
}
