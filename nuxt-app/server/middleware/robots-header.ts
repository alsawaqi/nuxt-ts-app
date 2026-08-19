import { getRequestURL, setResponseHeader } from 'h3'
import { isNoIndexPath } from '~/utils/storefrontSeo.js'

export default defineEventHandler((event) => {
  if (!isNoIndexPath(getRequestURL(event).pathname)) return

  setResponseHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
})
