export function formatRatingSummary(summary?: { average_rating?: string | number; review_count?: string | number } | null): {
  average: string
  count: number
  label: string
}
export function starStates(rating?: string | number | null): Array<'full' | 'half' | 'empty'>
export function moderationBadgeClass(status?: string | null): string
