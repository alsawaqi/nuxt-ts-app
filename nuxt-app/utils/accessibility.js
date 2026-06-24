const localeCopy = {
  en: {
    increase: 'Increase quantity for {name} to {quantity}',
    decrease: 'Decrease quantity for {name} to {quantity}',
  },
  ar: {
    increase: 'زيادة كمية {name} إلى {quantity}',
    decrease: 'تقليل كمية {name} إلى {quantity}',
  },
}

const interpolate = (template, params = {}) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ''))

export const quantityButtonLabel = (action, productName, nextQuantity, locale = 'en') => {
  const copy = localeCopy[locale] || localeCopy.en
  const template = copy[action] || localeCopy.en[action] || '{name}'
  return interpolate(template, {
    name: productName || 'item',
    quantity: Math.max(1, Number(nextQuantity || 1)),
  })
}

export const fieldA11y = ({ id, invalid = false, hint = false, describedBy = [] } = {}) => {
  const parts = [
    ...(hint && id ? [`${id}-hint`] : []),
    ...(Array.isArray(describedBy) ? describedBy : [describedBy]),
    ...(invalid && id ? [`${id}-error`] : []),
  ].filter(Boolean)

  return {
    ...(id ? { id } : {}),
    'aria-invalid': invalid ? 'true' : 'false',
    ...(parts.length ? { 'aria-describedby': parts.join(' ') } : {}),
  }
}

export const activeDescendantState = (expanded, controlsId) => ({
  'aria-expanded': expanded ? 'true' : 'false',
  ...(controlsId ? { 'aria-controls': controlsId } : {}),
})

export const buttonLabel = (...parts) =>
  parts
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(', ')
