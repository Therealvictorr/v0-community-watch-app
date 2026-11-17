export function validPoint(lat: unknown, lng: unknown): boolean {
  return typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const radians = (v: number) => v * Math.PI / 180
  const x = Math.sin(radians(b.lat-a.lat)/2)**2 + Math.cos(radians(a.lat))*Math.cos(radians(b.lat))*Math.sin(radians(b.lng-a.lng)/2)**2
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0,1-x)))
}
export function normalizeArea(value?: string): string {
  return value?.trim().replace(/\s+/g,' ').toLocaleLowerCase('en') || 'area not specified'
}
