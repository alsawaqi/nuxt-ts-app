export function productSearchText(product: Record<string, any>): string
export function filterAndSortProducts<T extends Record<string, any>>(products: T[], options?: {
  query?: string
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'rating_desc' | 'newest' | string
  inStockOnly?: boolean
  onSaleOnly?: boolean
}): T[]
export function updateRecentlyViewed<T extends Record<string, any>>(items: T[], product: Record<string, any>, max?: number): T[]
export function readRecentlyViewed(storage: Storage | null | undefined, key?: string): Array<Record<string, any>>
export function writeRecentlyViewed(storage: Storage | null | undefined, items: Array<Record<string, any>>, key?: string): void
