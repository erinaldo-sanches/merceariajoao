import axios from 'axios'

export const AUTH_TOKEN_KEY = 'mercearia_access_token'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export function getApiErrorMessage(error, fallbackMessage) {
  const apiMessage = error?.response?.data?.detail
  if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage
  return fallbackMessage
}

export function buildAxiosError(error, fallbackMessage) {
  if (axios.isAxiosError(error)) {
    return new Error(getApiErrorMessage(error, fallbackMessage))
  }
  return new Error(fallbackMessage)
}

export default apiClient
