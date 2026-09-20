// Only the exact configured public-upload origin/path may map to the read-only media mount.
export function localImageSource(source, uploadsBase) {
  if (typeof source !== 'string' || !source.trim()) return ''
  const value = source.trim()
  if (value.startsWith('/') && !value.startsWith('//')) return value
  try {
    const url = new URL(value)
    const base = new URL(uploadsBase)
    const prefix = base.pathname.replace(/\/+$/, '') + '/'
    if (url.origin !== base.origin || !url.pathname.startsWith(prefix)) return ''
    const path = decodeURIComponent(url.pathname.slice(prefix.length))
    if (!path || path.split('/').some(p => p === '..' || p === '.') || path.includes('\\')) return ''
    return '/catalog/' + path.split('/').map(encodeURIComponent).join('/')
  } catch { return '' }
}

export function hasSessionCookie(cookie = '') {
  return cookie.split(';').some(part => /^\s*(token|refresh_token)=[^;\s]+/.test(part))
}
