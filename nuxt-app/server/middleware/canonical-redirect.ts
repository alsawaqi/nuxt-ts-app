import {
  getHeader,
  getMethod,
  getRequestURL,
  sendRedirect,
} from 'h3'
import {
  canonicalRedirectLocation,
  firstForwardedValue,
} from '~/utils/seoRouting.js'

const forwardedProtocol = (event: Parameters<typeof getHeader>[0], fallback: string) => {
  const cfVisitor = getHeader(event, 'cf-visitor')
  if (cfVisitor) {
    try {
      const scheme = JSON.parse(cfVisitor)?.scheme
      if (scheme) return String(scheme)
    } catch {
      // Ignore malformed optional proxy metadata.
    }
  }

  const forwarded = getHeader(event, 'forwarded')
  const forwardedMatch = forwarded?.match(/(?:^|[;,]\s*)proto=(?:"([^"]+)"|([^;,\s]+))/i)
  if (forwardedMatch) return forwardedMatch[1] || forwardedMatch[2] || fallback

  const xForwardedProtocol = firstForwardedValue(getHeader(event, 'x-forwarded-proto'))
  if (xForwardedProtocol) return xForwardedProtocol

  const forwardedSsl = String(getHeader(event, 'x-forwarded-ssl') || '').toLowerCase()
  if (forwardedSsl === 'on') return 'https'

  return fallback
}

export default defineEventHandler((event) => {
  if (import.meta.dev) return

  const requestUrl = getRequestURL(event)
  const runtimeConfig = useRuntimeConfig(event)
  const location = canonicalRedirectLocation({
    method: getMethod(event),
    siteUrl: String(runtimeConfig.public.siteUrl || ''),
    requestHost: firstForwardedValue(getHeader(event, 'x-forwarded-host'))
      || String(getHeader(event, 'host') || requestUrl.host),
    requestProtocol: forwardedProtocol(event, requestUrl.protocol),
    pathname: requestUrl.pathname,
    search: requestUrl.search,
  })

  if (location) return sendRedirect(event, location, 308)
})
