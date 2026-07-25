import { canonicalUrl } from '~/utils/storefrontSeo.js'

const configuredSiteUrl = (value: unknown) => {
  try {
    const url = new URL(String(value || ''))
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString().replace(/\/+$/, '') : ''
  } catch {
    return ''
  }
}

export default defineCachedEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = configuredSiteUrl(config.public.siteUrl)

  if (!siteUrl) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Robots configuration is unavailable',
    })
  }

  setResponseHeaders(event, {
    'content-type': 'text/plain; charset=UTF-8',
    'cache-control': 'public, max-age=3600, s-maxage=3600',
  })

  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${canonicalUrl(siteUrl, '/sitemap.xml')}`,
    '',
  ].join('\n')
}, {
  name: 'storefront-robots-v2',
  maxAge: 3600,
  swr: true,
})
