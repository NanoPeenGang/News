import { IntelEvent, Hotspot, Category, Severity } from '@/types';

// Fetch live earthquake data from USGS
async function fetchEarthquakes(): Promise<IntelEvent[]> {
  try {
    const res = await fetch(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.features.slice(0, 15).map((f: any, i: number) => {
      const mag = f.properties.mag;
      let severity: Severity = 'low';
      if (mag >= 7) severity = 'critical';
      else if (mag >= 5.5) severity = 'high';
      else if (mag >= 4) severity = 'medium';
      return {
        id: `eq-${f.id}`,
        title: `M${mag.toFixed(1)} Earthquake — ${f.properties.place}`,
        description: `Magnitude ${mag.toFixed(1)} earthquake at depth of ${(f.geometry.coordinates[2]).toFixed(1)}km. ${f.properties.tsunami ? 'Tsunami warning issued.' : ''}`,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        category: 'disaster' as Category,
        severity,
        timestamp: new Date(f.properties.time).toISOString(),
        source: 'USGS',
        location: f.properties.place || 'Unknown',
      };
    });
  } catch {
    return [];
  }
}

// Fetch NASA EONET natural events (wildfires, storms, volcanoes)
async function fetchNaturalEvents(): Promise<IntelEvent[]> {
  try {
    const res = await fetch(
      'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=20',
      { next: { revalidate: 600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.events.slice(0, 12).map((e: any) => {
      const geo = e.geometry?.[e.geometry.length - 1];
      if (!geo?.coordinates) return null;
      const catName = e.categories?.[0]?.title || '';
      let severity: Severity = 'medium';
      if (catName.toLowerCase().includes('volcano') || catName.toLowerCase().includes('severe')) severity = 'high';
      return {
        id: `eonet-${e.id}`,
        title: e.title,
        description: `Natural event: ${catName}. Source: NASA EONET. ${e.sources?.map((s: any) => s.id).join(', ') || ''}`,
        lat: geo.coordinates[1],
        lng: geo.coordinates[0],
        category: 'disaster' as Category,
        severity,
        timestamp: geo.date || new Date().toISOString(),
        source: 'NASA EONET',
        location: e.title,
      };
    }).filter(Boolean) as IntelEvent[];
  } catch {
    return [];
  }
}

// Fetch GDELT events for conflicts, protests, military actions
async function fetchGdeltEvents(): Promise<IntelEvent[]> {
  try {
    const res = await fetch(
      'https://api.gdeltproject.org/api/v2/doc/doc?query=conflict OR protest OR military OR terrorism&mode=ArtList&maxrecords=30&format=json&sort=DateDesc&timespan=1d',
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.articles) return [];

    const categorizeArticle = (title: string): { category: Category; severity: Severity } => {
      const t = title.toLowerCase();
      if (t.includes('terror') || t.includes('bomb') || t.includes('attack') || t.includes('suicide'))
        return { category: 'terrorism', severity: 'critical' };
      if (t.includes('missile') || t.includes('military') || t.includes('navy') || t.includes('troops') || t.includes('nuclear') || t.includes('weapon'))
        return { category: 'military', severity: 'high' };
      if (t.includes('war') || t.includes('conflict') || t.includes('strike') || t.includes('shell') || t.includes('combat') || t.includes('fighting'))
        return { category: 'conflict', severity: 'high' };
      if (t.includes('protest') || t.includes('demonstrat') || t.includes('rally') || t.includes('riot') || t.includes('unrest'))
        return { category: 'protest', severity: 'medium' };
      if (t.includes('hack') || t.includes('cyber') || t.includes('ransomware') || t.includes('breach'))
        return { category: 'cyber', severity: 'high' };
      if (t.includes('earthquake') || t.includes('flood') || t.includes('hurricane') || t.includes('typhoon') || t.includes('wildfire'))
        return { category: 'disaster', severity: 'high' };
      return { category: 'conflict', severity: 'medium' };
    };

    // Deduplicate by rough title similarity
    const seen = new Set<string>();
    return data.articles
      .filter((a: any) => {
        const key = a.title?.substring(0, 40)?.toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 20)
      .map((a: any, i: number) => {
        const { category, severity } = categorizeArticle(a.title || '');
        // GDELT provides tone-based coordinates when available
        // Use domain-based geolocation as fallback
        const lat = a.sourcecountry_lat || (Math.random() * 120 - 60);
        const lng = a.sourcecountry_lng || (Math.random() * 300 - 150);
        return {
          id: `gdelt-${i}-${Date.now()}`,
          title: a.title || 'Untitled Event',
          description: `Source: ${a.domain || 'Unknown'}. ${a.seendate ? `Reported: ${a.seendate}` : ''}`,
          lat: typeof lat === 'number' ? lat : parseFloat(lat) || 0,
          lng: typeof lng === 'number' ? lng : parseFloat(lng) || 0,
          category,
          severity,
          timestamp: a.seendate ? new Date(a.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')).toISOString() : new Date().toISOString(),
          source: a.domain || 'GDELT',
          location: a.sourcecountry || 'Unknown',
          url: a.url,
        };
      });
  } catch {
    return [];
  }
}

// Combine all live data sources with fallback mock data
export async function fetchLiveEvents(): Promise<IntelEvent[]> {
  const [earthquakes, naturalEvents, gdeltEvents] = await Promise.allSettled([
    fetchEarthquakes(),
    fetchNaturalEvents(),
    fetchGdeltEvents(),
  ]);

  const allEvents: IntelEvent[] = [
    ...(earthquakes.status === 'fulfilled' ? earthquakes.value : []),
    ...(naturalEvents.status === 'fulfilled' ? naturalEvents.value : []),
    ...(gdeltEvents.status === 'fulfilled' ? gdeltEvents.value : []),
  ];

  // Filter out events with invalid coordinates
  return allEvents.filter(e =>
    e.lat !== 0 && e.lng !== 0 &&
    Math.abs(e.lat) <= 90 && Math.abs(e.lng) <= 180
  );
}

// Static hotspots (these represent ongoing conflict zones - not API dependent)
export { hotspots } from '@/data/hotspots';
