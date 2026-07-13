type AmwalCallbackPayload = Record<string, unknown>

interface AmwalCheckout {
  configure: Record<string, unknown>
  showSmartBox: () => void
}

declare global {
  interface Window {
    SmartBox?: {
      Checkout?: AmwalCheckout
    }
  }
}

const sdkPromises = new Map<string, Promise<void>>()

const assertOfficialSdkUrl = (value: string) => {
  const url = new URL(value)
  const isExactScript = url.protocol === 'https:'
    && url.username === ''
    && url.password === ''
    && url.pathname === '/js/SmartBox.js'
    && url.search === '?v=1.1'
    && url.hash === ''
  const isUat = isExactScript
    && url.hostname === 'test.amwalpg.com'
    && url.port === '7443'
  const isProduction = isExactScript
    && url.hostname === 'checkout.amwalpg.com'
    && url.port === ''

  if (!isUat && !isProduction) {
    throw new Error('The SmartBox SDK URL is not an approved AmwalPay endpoint.')
  }

  return url.toString()
}

const loadSmartBox = async (scriptUrl: string) => {
  if (!import.meta.client) throw new Error('SmartBox is available only in the browser.')

  const url = assertOfficialSdkUrl(scriptUrl)
  if (window.SmartBox?.Checkout?.showSmartBox) return

  const existingPromise = sdkPromises.get(url)
  if (existingPromise) return existingPromise

  const promise = new Promise<void>((resolve, reject) => {
    const scriptId = 'amwal-smartbox-sdk'
    let script = document.getElementById(scriptId) as HTMLScriptElement | null

    // With no in-flight promise and no global API, an existing element has
    // already loaded incorrectly or failed. Recreate it so retries can recover.
    if (script) {
      script.remove()
      script = null
    }

    const timeout = window.setTimeout(() => {
      sdkPromises.delete(url)
      script?.remove()
      reject(new Error('AmwalPay took too long to load.'))
    }, 15000)

    const finish = () => {
      window.clearTimeout(timeout)
      if (!window.SmartBox?.Checkout?.showSmartBox) {
        sdkPromises.delete(url)
        script?.remove()
        reject(new Error('AmwalPay loaded without the SmartBox checkout API.'))
        return
      }
      sdkPromises.delete(url)
      resolve()
    }

    const fail = () => {
      window.clearTimeout(timeout)
      sdkPromises.delete(url)
      script?.remove()
      reject(new Error('Unable to load the AmwalPay checkout.'))
    }

    script = document.createElement('script')
    script.id = scriptId
    script.src = url
    script.async = true
    script.dataset.sdkUrl = url
    script.addEventListener('load', finish, { once: true })
    script.addEventListener('error', fail, { once: true })
    document.head.appendChild(script)
  })

  sdkPromises.set(url, promise)
  return promise
}

export const useAmwalSmartBox = () => {
  const open = async (
    scriptUrl: string,
    configuration: Record<string, unknown>,
    callbacks: {
      complete: (payload: AmwalCallbackPayload) => void
      error: (payload?: AmwalCallbackPayload) => void
      cancel: () => void
    },
  ) => {
    await loadSmartBox(scriptUrl)

    const checkout = window.SmartBox?.Checkout
    if (!checkout) throw new Error('AmwalPay checkout is unavailable.')

    checkout.configure = {
      ...configuration,
      completeCallback: callbacks.complete,
      errorCallback: callbacks.error,
      cancelCallback: callbacks.cancel,
      SmartBoxColorConfig: { PrimaryColor: '#00bfa5' },
    }
    checkout.showSmartBox()
  }

  return { open }
}
