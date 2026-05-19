import axios from "axios";

export const AUTH_TOKEN_KEY = "mercearia_access_token";

const apiClient = axios.create({
  // Usa localhost em vez de 127.0.0.1
  baseURL:
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",

  headers: {
    "Content-Type": "application/json",
  },
});


// Interceptor para enviar JWT automaticamente
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);


// Tratamento de mensagens da API
export function getApiErrorMessage(error, fallbackMessage) {
  const data = error?.response?.data;
  const apiMessage = data?.detail ?? data?.message;

  if (typeof apiMessage === "string" && apiMessage.trim()) {
    return apiMessage;
  }

  if (error?.response?.status === 401) {
    return "Sessão expirada ou não autenticado. Faça login novamente.";
  }

  return fallbackMessage;
}


// Tratamento genérico de erro Axios
export function buildAxiosError(error, fallbackMessage) {
  if (axios.isAxiosError(error)) {
    return new Error(getApiErrorMessage(error, fallbackMessage));
  }

  return new Error(fallbackMessage);
}


export default apiClient;