import apiClient, { AUTH_TOKEN_KEY, buildAxiosError } from './apiClient'

const AUTH_USER_KEY = 'mercearia_auth_user'

export async function loginApi({ email, password }) {
  try {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)

    const { data } = await apiClient.request({
      method: 'POST',
      url: '/auth/login',
      data: formData,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    if (data?.access_token) {
      localStorage.setItem(AUTH_TOKEN_KEY, data.access_token)
      localStorage.setItem(AUTH_USER_KEY, email)
    }

    return data
  } catch (error) {
    throw buildAxiosError(error, 'Falha no login. Verifique email e senha.')
  }
}

export async function cadastrarUsuarioApi({ nome, email, password }) {
  try {
    const { data } = await apiClient.request({
      method: 'POST',
      url: '/users/',
      data: { nome, email, password },
    })
    return data
  } catch (error) {
    throw buildAxiosError(error, 'Falha ao cadastrar usuário.')
  }
}

export function logoutApi() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}
