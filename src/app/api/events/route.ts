import { NextResponse } from 'next/server';
import { IntelEvent, Category, Severity } from '@/types';

// Fetch live earthquake data from USGS
async function fetchEarthquakes(): Promise<IntelEvent[]> {
  try {
    const res = await fetch(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.features.slice(0, 15).map((f: any) => {
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

// Fetch NASA EONET natural events
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
        description: `Natural event: ${catName}. Source: NASA EONET.`,
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

// Fetch GDELT events
async function fetchGdeltEvents(): Promise<IntelEvent[]> {
  try {
    const res = await fetch(
      'https://api.gdeltproject.org/api/v2/doc/doc?query=conflict%20OR%20protest%20OR%20military%20OR%20terrorism%20OR%20cyber&mode=ArtList&maxrecords=40&format=json&sort=DateDesc&timespan=1d',
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.articles) return [];

    const categorize = (title: string): { category: Category; severity: Severity } => {
      const t = title.toLowerCase();
      if (t.includes('terror') || t.includes('bombing') || t.includes('suicide') || t.includes('isis') || t.includes('al-qaeda'))
        return { category: 'terrorism', severity: 'critical' };
      if (t.includes('missile') || t.includes('military') || t.includes('navy') || t.includes('troops') || t.includes('nuclear') || t.includes('weapon') || t.includes('drone strike'))
        return { category: 'military', severity: 'high' };
      if (t.includes('war') || t.includes('conflict') || t.includes('airstrike') || t.includes('shell') || t.includes('combat') || t.includes('fighting') || t.includes('killed') || t.includes('casualties'))
        return { category: 'conflict', severity: 'high' };
      if (t.includes('protest') || t.includes('demonstrat') || t.includes('rally') || t.includes('riot') || t.includes('unrest') || t.includes('march'))
        return { category: 'protest', severity: 'medium' };
      if (t.includes('hack') || t.includes('cyber') || t.includes('ransomware') || t.includes('breach') || t.includes('malware'))
        return { category: 'cyber', severity: 'high' };
      if (t.includes('earthquake') || t.includes('flood') || t.includes('hurricane') || t.includes('typhoon') || t.includes('wildfire') || t.includes('tsunami'))
        return { category: 'disaster', severity: 'high' };
      return { category: 'conflict', severity: 'medium' };
    };

    // Known country coordinates for GDELT source countries
    const countryCoords: Record<string, { lat: number; lng: number }> = {
      'United States': { lat: 38.9, lng: -77.0 }, 'United Kingdom': { lat: 51.5, lng: -0.1 },
      'Russia': { lat: 55.75, lng: 37.62 }, 'China': { lat: 39.9, lng: 116.4 },
      'Ukraine': { lat: 50.45, lng: 30.52 }, 'Israel': { lat: 31.77, lng: 35.22 },
      'France': { lat: 48.86, lng: 2.35 }, 'Germany': { lat: 52.52, lng: 13.4 },
      'India': { lat: 28.61, lng: 77.21 }, 'Japan': { lat: 35.68, lng: 139.65 },
      'South Korea': { lat: 37.57, lng: 126.98 }, 'Iran': { lat: 35.69, lng: 51.39 },
      'Turkey': { lat: 39.93, lng: 32.86 }, 'Pakistan': { lat: 33.69, lng: 73.04 },
      'Nigeria': { lat: 9.06, lng: 7.49 }, 'Egypt': { lat: 30.04, lng: 31.24 },
      'Brazil': { lat: -15.79, lng: -47.88 }, 'Australia': { lat: -35.28, lng: 149.13 },
      'Canada': { lat: 45.42, lng: -75.7 }, 'Saudi Arabia': { lat: 24.71, lng: 46.68 },
      'Syria': { lat: 33.51, lng: 36.28 }, 'Iraq': { lat: 33.34, lng: 44.4 },
      'Yemen': { lat: 15.37, lng: 44.19 }, 'Taiwan': { lat: 25.03, lng: 121.57 },
      'Myanmar': { lat: 19.76, lng: 96.08 }, 'Sudan': { lat: 15.6, lng: 32.53 },
      'Lebanon': { lat: 33.89, lng: 35.5 }, 'Somalia': { lat: 2.05, lng: 45.32 },
      'Mexico': { lat: 19.43, lng: -99.13 }, 'Colombia': { lat: 4.71, lng: -74.07 },
      'Philippines': { lat: 14.6, lng: 120.98 }, 'Indonesia': { lat: -6.21, lng: 106.85 },
      'Poland': { lat: 52.23, lng: 21.01 }, 'Italy': { lat: 41.9, lng: 12.5 },
      'Spain': { lat: 40.42, lng: -3.7 }, 'Kenya': { lat: -1.29, lng: 36.82 },
      'Ethiopia': { lat: 9.02, lng: 38.75 }, 'Afghanistan': { lat: 34.53, lng: 69.17 },
      'North Korea': { lat: 39.04, lng: 125.76 }, 'Venezuela': { lat: 10.48, lng: -66.9 },
    };

    const seen = new Set<string>();
    return data.articles
      .filter((a: any) => {
        const key = a.title?.substring(0, 50)?.toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 25)
      .map((a: any, i: number) => {
        const { category, severity } = categorize(a.title || '');
        const country = a.sourcecountry || '';
        const coords = countryCoords[country];
        // Add small random offset so points don't stack
        const jitter = () => (Math.random() - 0.5) * 3;
        const lat = coords ? coords.lat + jitter() : null;
        const lng = coords ? coords.lng + jitter() : null;
        if (lat === null || lng === null) return null;
        return {
          id: `gdelt-${i}-${Date.now()}`,
          title: a.title || 'Untitled Event',
          description: `Source: ${a.domain || 'Unknown'}.`,
          lat,
          lng,
          category,
          severity,
          timestamp: a.seendate
            ? new Date(a.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')).toISOString()
            : new Date().toISOString(),
          source: a.domain || 'GDELT',
          location: country || 'Unknown',
        };
      })
      .filter(Boolean) as IntelEvent[];
  } catch {
    return [];
  }
}

export async function GET() {
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

  // Filter out invalid coordinates
  const validEvents = allEvents.filter(e =>
    Math.abs(e.lat) <= 90 && Math.abs(e.lng) <= 180
  );

  return NextResponse.json(validEvents);
}
