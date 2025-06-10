import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:83', // Laravel API
})

export default api
