const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatLastSynced(updatedAt: number | undefined, now: number): string {
  if (!updatedAt) return 'Never synced';
  const diff = now - updatedAt;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
  const d = new Date(updatedAt);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
