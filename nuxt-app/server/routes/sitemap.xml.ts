import { canonicalUrl, sitemapXml } from '~/utils/storefrontSeo.js'

type ApiCategory = {
  id: number
  Slug?: string
  slug?: string
}

type ApiProduct = {
  slug?: string
  Slug?: string
}

const uniqueEntries = (entries: Array<Record<string, any>>) => {
  const seen = new Set<string>()

  return entries.filter((entry) => {
    if (!entry.loc || seen.has(entry.loc)) return false
    seen.add(entry.loc)
    return true
  })
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'content-type', 'application/xml; charset=UTF-8')
  setHeader(event, 'cache-control', 'public, max-age=1800')

  const config = useRuntimeConfig(event)
  const siteUrl = String(config.public.siteUrl || '')
  const apiBase = String(config.public.apiBase || '').replace(/\/+$/, '')
  const today = new Date().toISOString().slice(0, 10)

  const entries: Array<Record<string, any>> = [
    { loc: canonicalUrl(siteUrl, '/'), changefreq: 'daily', priority: 1 },
    { loc: canonicalUrl(siteUrl, '/contact'), changefreq: 'monthly', priority: 0.5 },
    ...['shipping', 'returns', 'privacy', 'terms', 'warranty', 'faq'].map((slug) => ({
      loc: canonicalUrl(siteUrl, `/policies/${slug}`),
      changefreq: 'monthly',
      priority: 0.4,
    })),
  ]

  if (apiBase) {
    try {
      const departments = await $fetch<ApiCategory[]>(`${apiBase}/api/productdepartment`)

      for (const department of departments || []) {
        const subs = await $fetch<ApiCategory[]>(`${apiBase}/api/categories/${department.id}/subcategories`)

        for (const sub of subs || []) {
          const finalCategories = await $fetch<ApiCategory[]>(`${apiBase}/api/subcategories/${sub.id}/subsubcategories`)

          for (const category of finalCategories || []) {
            const slug = category.Slug || category.slug
            if (!slug) continue

            entries.push({
              loc: canonicalUrl(siteUrl, `/departments/${slug}`),
              lastmod: today,
              changefreq: 'weekly',
              priority: 0.8,
            })

            try {
              const listing = await $fetch<{ products?: ApiProduct[] }>(`${apiBase}/api/products/${slug}`)
              for (const product of listing.products || []) {
                const productSlug = product.slug || product.Slug
                if (!productSlug) continue

                entries.push({
                  loc: canonicalUrl(siteUrl, `/product/${productSlug}`),
                  lastmod: today,
                  changefreq: 'weekly',
                  priority: 0.7,
                })
              }
            } catch {
              // Keep the category in the sitemap even if one product listing fails.
            }
          }
        }
      }
    } catch {
      // Static pages are still useful when the API is not reachable.
    }
  }

  return sitemapXml(uniqueEntries(entries))
})
