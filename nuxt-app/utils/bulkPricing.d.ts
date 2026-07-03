export interface BulkPriceTier {
  min_qty: number
  max_qty: number | null
  unit_price: number
}

export function normalizeBulkTiers(raw: unknown): BulkPriceTier[]
export function resolveBulkTier(tiers: unknown, qty: number): BulkPriceTier | null
export function resolveBulkUnitPrice(tiers: unknown, qty: number): number | null
export function formatBulkTierRange(tier: Record<string, any> | null | undefined): string
