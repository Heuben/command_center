export const REFERENCE_NOW = new Date('2026-08-19T14:52:00Z').getTime();

const MANILA: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Manila' };

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-PH', {
    ...MANILA,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    ...MANILA,
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} · ${formatClock(iso)}`;
}

/** Compact elapsed time, e.g. "04:21" or "1h 12m". */
export function elapsedSince(iso: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  if (h < 24) return `${h}h ${m}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

export function elapsedSeconds(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
}

/** Duration between two timestamps, e.g. "6m 24s". Returns "—" when incomplete. */
export function durationBetween(from: string | null, to: string | null): string {
  if (!from || !to) return '—';
  const seconds = Math.max(
    0,
    Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 1000)
  );
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const EARTH_KM = 6371;

export function distanceKm(
a: {lat: number;lng: number;},
b: {lat: number;lng: number;})
: number {
  const toRad = (v: number) => v * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
  Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}