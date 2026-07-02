import type { GameProjectSnapshot } from '@ellipse/shared';

export function summarizeTaskStatuses(statuses: GameProjectSnapshot['tasks'][number]['status'][]): string {
  if (statuses.length === 0) return 'No assigned tasks yet';
  const counts = new Map<string, number>();
  for (const status of statuses) {
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return [...counts.entries()].map(([status, count]) => `${count} ${status}`).join(' | ');
}
