import axios from 'axios'

export const useAxios = () => {
  const config = useRuntimeConfig()

  return axios.create({
    baseURL: config.public.apiBase,
    withCredentials: true,
  })
}

export default useAxios
