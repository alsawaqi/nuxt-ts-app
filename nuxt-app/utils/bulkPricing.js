// Quantity-tier bulk pricing helpers (client mirror of the server-side resolver).
// Tier shape: { min_qty: number, max_qty: number|null, unit_price: number }
// - null max_qty = open-ended ("and above")
// - Sets are validated server-side (no overlaps), so at most one tier matches a quantity.
// - Pricing rule (must match the server): when a tier matches the line quantity the tier
//   unit price WINS and product discounts do NOT stack; otherwise normal pricing applies.

const toNullableInt = (value) => {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? Math.floor(n) : null
}

export const normalizeBulkTiers = (raw) => {
  if (!Array.isArray(raw)) return []

  return raw
    .map((tier) => {
      if (!tier || typeof tier !== 'object') return null
      const minQty = toNullableInt(tier.min_qty ?? tier.Min_Qty)
      const maxQty = toNullableInt(tier.max_qty ?? tier.Max_Qty)
      const unitPrice = Number(tier.unit_price ?? tier.Unit_Price)
      if (!minQty || minQty < 1 || !Number.isFinite(unitPrice) || unitPrice <= 0) return null
      return { min_qty: minQty, max_qty: maxQty, unit_price: unitPrice }
    })
    .filter(Boolean)
    .sort((a, b) => a.min_qty - b.min_qty)
}

export const resolveBulkTier = (tiers, qty) => {
  const quantity = Math.floor(Number(qty) || 0)
  if (quantity < 1) return null

  return normalizeBulkTiers(tiers)
    .find((tier) => quantity >= tier.min_qty && (tier.max_qty === null || quantity <= tier.max_qty)) || null
}

export const resolveBulkUnitPrice = (tiers, qty) => {
  const tier = resolveBulkTier(tiers, qty)
  return tier ? tier.unit_price : null
}

// "5–10" for closed ranges, "51+" for open-ended tiers.
export const formatBulkTierRange = (tier) => {
  if (!tier || typeof tier !== 'object') return ''
  const min = toNullableInt(tier.min_qty ?? tier.Min_Qty)
  const max = toNullableInt(tier.max_qty ?? tier.Max_Qty)
  if (!min) return ''
  return max === null ? `${min}+` : `${min}–${max}`
}
