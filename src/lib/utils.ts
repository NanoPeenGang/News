import { Category, Severity, CATEGORY_COLORS, SEVERITY_COLORS } from '@/types';

export function getCategoryColor(category: Category): string {
  return CATEGORY_COLORS[category];
}

export function getSeverityColor(severity: Severity): string {
  return SEVERITY_COLORS[severity];
}

export function timeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function isWithinTimeRange(timestamp: string, range: string): boolean {
  if (range === 'all') return true;
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  switch (range) {
    case '1h': return diffHours <= 1;
    case '6h': return diffHours <= 6;
    case '24h': return diffHours <= 24;
    case '7d': return diffHours <= 168;
    default: return true;
  }
}

export function getPointSize(severity: Severity): number {
  switch (severity) {
    case 'critical': return 0.8;
    case 'high': return 0.6;
    case 'medium': return 0.4;
    case 'low': return 0.3;
  }
}
