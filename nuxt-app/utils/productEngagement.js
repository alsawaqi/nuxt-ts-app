export const formatRatingSummary = (summary) => {
  const averageNumber = Number(summary?.average_rating || 0)
  const count = Number(summary?.review_count || 0)
  const average = averageNumber.toFixed(1)

  return {
    average,
    count,
    label: count ? `${average} out of 5 from ${count} reviews` : 'No reviews yet',
  }
}

export const starStates = (rating) => {
  const value = Math.max(0, Math.min(5, Number(rating || 0)))

  return Array.from({ length: 5 }, (_, index) => {
    const threshold = index + 1
    if (value >= threshold) return 'full'
    if (value >= threshold - 0.5) return 'half'
    return 'empty'
  })
}

export const moderationBadgeClass = (status) => {
  const value = String(status || '').toLowerCase()

  if (value === 'approved') return 'badge-success'
  if (value === 'rejected' || value === 'reported') return 'badge-danger'
  return 'badge-warning'
}
