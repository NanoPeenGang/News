export type Category = 'conflict' | 'protest' | 'disaster' | 'cyber' | 'military' | 'terrorism';
export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface IntelEvent {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  category: Category;
  severity: Severity;
  timestamp: string;
  source: string;
  location: string;
  relatedEventIds?: string[];
}

export interface Hotspot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  intensity: number; // 0-100
  description: string;
  countries: string[];
}

export interface CountryRisk {
  code: string;
  name: string;
  score: number; // 0-100
}

export interface RegionPreset {
  name: string;
  lat: number;
  lng: number;
  altitude: number;
}

export interface FilterState {
  categories: Category[];
  severity: Severity | 'all';
  timeRange: '1h' | '6h' | '24h' | '7d' | 'all';
}

export const CATEGORY_COLORS: Record<Category, string> = {
  conflict: '#ef4444',
  protest: '#f97316',
  disaster: '#eab308',
  cyber: '#06b6d4',
  military: '#a855f7',
  terrorism: '#dc2626',
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  conflict: 'Conflict',
  protest: 'Protest',
  disaster: 'Disaster',
  cyber: 'Cyber',
  military: 'Military',
  terrorism: 'Terrorism',
};
