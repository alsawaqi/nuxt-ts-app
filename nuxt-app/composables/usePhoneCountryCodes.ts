export type PhoneCountryCode = {
  code: string
  country: string
}

export const usePhoneCountryCodes = () => {
  const phoneCountryCodes: PhoneCountryCode[] = [
    { code: '+968', country: 'Oman' },
    { code: '+971', country: 'United Arab Emirates' },
    { code: '+966', country: 'Saudi Arabia' },
    { code: '+974', country: 'Qatar' },
    { code: '+965', country: 'Kuwait' },
    { code: '+973', country: 'Bahrain' },
    { code: '+91', country: 'India' },
    { code: '+92', country: 'Pakistan' },
    { code: '+880', country: 'Bangladesh' },
    { code: '+94', country: 'Sri Lanka' },
    { code: '+20', country: 'Egypt' },
    { code: '+44', country: 'United Kingdom' },
    { code: '+1', country: 'United States / Canada' },
  ]

  const digitsOnly = (value: string | number | null | undefined) =>
    String(value ?? '').replace(/\D/g, '')

  const normalizePhoneCode = (value: string | null | undefined, fallback = '+968') => {
    const raw = String(value || '').trim()
    if (!raw) return fallback
    const withPlus = raw.startsWith('+') ? raw : `+${raw.replace(/\D/g, '')}`
    return /^\+\d{1,4}$/.test(withPlus) ? withPlus : fallback
  }

  const formatPhone = (code?: string | null, phone?: string | null) => {
    const cleanPhone = digitsOnly(phone)
    if (!cleanPhone) return ''
    return `${normalizePhoneCode(code)} ${cleanPhone}`
  }

  return {
    phoneCountryCodes,
    digitsOnly,
    normalizePhoneCode,
    formatPhone,
  }
}
