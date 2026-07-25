import { isNoIndexPath } from '~/utils/storefrontSeo.js'

export default defineNuxtPlugin(() => {
  const route = useRoute()

  useHead(() => ({
    meta: isNoIndexPath(route.path)
      ? [{
          key: 'private-route-robots',
          name: 'robots',
          content: 'noindex, nofollow',
        }]
      : [],
  }))
})
