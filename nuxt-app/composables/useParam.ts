export const useParam = (key: string): string => {
  return useRoute().params[key]?.toString() ?? ''
}
