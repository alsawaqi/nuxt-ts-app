import {
  buildLocalizedSitemapEntries,
  isSeoSitemapPayload,
  localizedSitemapXml,
} from '~/utils/storefrontSitemap.js'
import type { SeoSitemapPayload } from '~/utils/storefrontSitemap.js'

const absoluteHttpUrl = (value: unknown) => {
  try {
    const url = new URL(String(value || ''))
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString().replace(/\/+$/, '') : ''
  } catch {
    return ''
  }
}

export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = absoluteHttpUrl(config.public.siteUrl)
  const apiBase = absoluteHttpUrl(config.public.apiBase)

  if (!siteUrl || !apiBase) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Sitemap configuration is unavailable',
    })
  }

  let payload: SeoSitemapPayload

  try {
    const response = await $fetch<unknown>(`${apiBase}/api/seo/sitemap`, {
      method: 'GET',
      retry: 1,
      timeout: 10_000,
    })

    if (!isSeoSitemapPayload(response)) {
      throw new TypeError('The SEO sitemap endpoint returned an invalid payload.')
    }

    payload = response
  } catch (error) {
    console.error('[sitemap] Unable to load the flattened SEO sitemap payload.', error)
    throw createError({
      statusCode: 502,
      statusMessage: 'Sitemap source is unavailable',
    })
  }

  const entries = buildLocalizedSitemapEntries({
    siteUrl,
    categories: payload.categories,
    products: payload.products,
  })

  setResponseHeaders(event, {
    'content-type': 'application/xml; charset=UTF-8',
    'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
  })

  return localizedSitemapXml(entries)
}, {
  name: 'storefront-sitemap-v2',
  maxAge: 3600,
  staleMaxAge: 86400,
  swr: true,
})
