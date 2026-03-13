'use client';

import { Category, FilterState, CATEGORY_COLORS, CATEGORY_LABELS, Severity } from '@/types';

interface FiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

const TIME_RANGES = [
  { value: '1h', label: '1H' },
  { value: '6h', label: '6H' },
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: 'all', label: 'ALL' },
] as const;

const SEVERITIES: { value: Severity | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const ALL_CATEGORIES: Category[] = ['conflict', 'protest', 'disaster', 'cyber', 'military', 'terrorism'];

export default function Filters({ filters, onFilterChange }: FiltersProps) {
  const toggleCategory = (cat: Category) => {
    const cats = filters.categories.includes(cat)
      ? filters.categories.filter(c => c !== cat)
      : [...filters.categories, cat];
    onFilterChange({ ...filters, categories: cats.length > 0 ? cats : ALL_CATEGORIES });
  };

  return (
    <div className="space-y-3 px-3 py-2">
      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5">
        {ALL_CATEGORIES.map(cat => {
          const active = filters.categories.includes(cat);
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all border ${
                active
                  ? 'border-opacity-50 opacity-100'
                  : 'border-transparent opacity-40 hover:opacity-70'
              }`}
              style={{
                backgroundColor: active ? `${CATEGORY_COLORS[cat]}20` : 'transparent',
                borderColor: active ? `${CATEGORY_COLORS[cat]}50` : 'transparent',
                color: CATEGORY_COLORS[cat],
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[cat] }}
              />
              {CATEGORY_LABELS[cat]}
            </button>
          );
        })}
      </div>

      {/* Severity + Time Range */}
      <div className="flex items-center gap-2">
        <select
          value={filters.severity}
          onChange={(e) => onFilterChange({ ...filters, severity: e.target.value as Severity | 'all' })}
          className="bg-gray-800/50 border border-gray-700 rounded text-[11px] text-gray-300 px-2 py-1 outline-none focus:border-cyan-500/50"
        >
          {SEVERITIES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <div className="flex rounded overflow-hidden border border-gray-700">
          {TIME_RANGES.map(t => (
            <button
              key={t.value}
              onClick={() => onFilterChange({ ...filters, timeRange: t.value })}
              className={`px-2 py-0.5 text-[10px] font-mono transition-all ${
                filters.timeRange === t.value
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
