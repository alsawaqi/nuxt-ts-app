const INDEXABLE_METHODS = new Set(['GET', 'HEAD'])

const normalizeProtocol = (value) => {
  const protocol = String(value || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:$/, '')

  return protocol === 'http' || protocol === 'https' ? protocol : ''
}

const normalizeHost = (value, protocol = '') => {
  const host = String(value || '')
    .split(',')[0]
    .trim()
    .toLowerCase()

  if (!host) return ''

  try {
    const parsed = new URL(`${normalizeProtocol(protocol) || 'http'}://${host}`)
    const hostname = parsed.hostname.replace(/\.$/, '')
    const isDefaultPort = (parsed.protocol === 'http:' && parsed.port === '80')
      || (parsed.protocol === 'https:' && parsed.port === '443')

    return `${hostname}${parsed.port && !isDefaultPort ? `:${parsed.port}` : ''}`
  } catch {
    return host.replace(/\.$/, '')
  }
}

export const firstForwardedValue = (value) => String(value || '')
  .split(',')[0]
  .trim()

export const normalizeRedirectPathname = (value = '/') => {
  const raw = String(value || '/')
  const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`
  const collapsed = withLeadingSlash.replace(/\/{2,}/g, '/')

  return collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : '/'
}

export const canonicalRedirectLocation = ({
  method = 'GET',
  siteUrl = '',
  requestHost = '',
  requestProtocol = '',
  pathname = '/',
  search = '',
} = {}) => {
  if (!INDEXABLE_METHODS.has(String(method || '').toUpperCase())) return null

  let canonical
  try {
    canonical = new URL(String(siteUrl || ''))
  } catch {
    return null
  }

  const canonicalProtocol = normalizeProtocol(canonical.protocol)
  if (!canonicalProtocol || !canonical.hostname) return null

  const canonicalHost = normalizeHost(canonical.host, canonicalProtocol)
  const incomingProtocol = normalizeProtocol(requestProtocol)
  const incomingHost = normalizeHost(requestHost, incomingProtocol || canonicalProtocol)
  const incomingPath = String(pathname || '/')
  const canonicalPath = normalizeRedirectPathname(incomingPath)
  const protocolMismatch = Boolean(incomingProtocol) && incomingProtocol !== canonicalProtocol
  const hostMismatch = Boolean(incomingHost) && incomingHost !== canonicalHost
  const pathMismatch = canonicalPath !== incomingPath

  if (!protocolMismatch && !hostMismatch && !pathMismatch) return null

  const normalizedSearch = search
    ? (String(search).startsWith('?') ? String(search) : `?${String(search)}`)
    : ''

  return `${canonicalProtocol}://${canonicalHost}${canonicalPath}${normalizedSearch}`
}
