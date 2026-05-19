 Guia de Requisições com Axios

Este documento explica como o frontend `Mercearia-ceep` está fazendo as requisições HTTP para o backend `Back-End-FastAPI`.

Visão Geral

Todas as requisições do frontend são feitas usando a biblioteca [Axios](https://axios.rest/pages/getting-started/first-steps.html) através do método `apiClient.request({...})`, que é o equivalente direto de `axios.request(...)` aplicado a uma instância configurada.

A organização foi pensada para:

- centralizar a configuração da API em um único lugar;
- padronizar as chamadas (todas usam `request({...})`);
- centralizar o tratamento de erros vindos da API;
- enviar automaticamente o token de autenticação em todas as chamadas.

Estrutura de Pastas

```
Mercearia-ceep/
└── src/
    └── services/
        ├── apiClient.js     -> instância central do Axios + helpers
        ├── productsApi.js   -> CRUD de produtos
        └── authApi.js       -> login, cadastro e logout
```

1. Cliente Axios Central — `apiClient.js`

Arquivo: `src/services/apiClient.js`

Aqui criamos a instância do Axios usada por todo o app:

```js
import axios from 'axios'

export const AUTH_TOKEN_KEY = 'mercearia_access_token'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})
```

Pontos importantes

- **`baseURL`**: usa a variável de ambiente `VITE_API_BASE_URL`. Se não houver, cai no padrão local `http://127.0.0.1:8000` (FastAPI rodando na máquina).
- **`Content-Type` padrão**: `application/json` — pode ser sobrescrito por requisição (ex.: login usa `application/x-www-form-urlencoded`).

Interceptor de Request (token automático)

```js
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

Toda requisição que sair do `apiClient` é interceptada e, se houver token salvo, ele é anexado no cabeçalho `Authorization: Bearer <token>`. Não é preciso lembrar de mandar o token em cada chamada.

Helpers de Erro

```js
export function getApiErrorMessage(error, fallbackMessage) { ... }
export function buildAxiosError(error, fallbackMessage) { ... }
```

- `getApiErrorMessage`: lê `error.response.data.detail` (padrão usado pelo FastAPI). Se não existir, devolve a mensagem padrão.
- `buildAxiosError`: usa `axios.isAxiosError` para confirmar que é erro de rede/HTTP do Axios e devolve um `Error` com mensagem amigável. Caso seja outro tipo de erro, devolve um genérico.

Os services usam `buildAxiosError` no `catch` para padronizar o tipo de erro lançado.

2. Padrão das Requisições — `axios.request({...})`

Em vez de `apiClient.get(...)`, `apiClient.post(...)` etc., todas as chamadas seguem o formato unificado:

```js
const { data } = await apiClient.request({
  method: 'POST',
  url: '/recurso/',
  data: payload,
  headers: { /* opcional */ },
})
```

Vantagens:

- todo método HTTP cabe no mesmo formato;
- fica fácil ler e replicar;
- simples de adicionar headers, params, timeout, etc.

3. CRUD de Produtos — `productsApi.js`

Arquivo: `src/services/productsApi.js`

Mapeamento direto com o backend (`/produtos/`):

| Função do front          | Método HTTP | Endpoint                    | Descrição                |
|--------------------------|-------------|-----------------------------|--------------------------|
| `listarProdutosApi()`    | GET         | `/produtos/`                | Lista todos os produtos  |
| `criarProdutoApi(p)`     | POST        | `/produtos/`                | Cria um novo produto     |
| `atualizarProdutoApi(id, p)` | PUT     | `/produtos/{id}`            | Atualiza um produto      |
| `removerProdutoApi(id)`  | DELETE      | `/produtos/{id}`            | Remove um produto        |

Exemplo (criar produto):

```js
const { data } = await apiClient.request({
  method: 'POST',
  url: '/produtos/',
  data: produto,
})
```

Os payloads usam os nomes do backend:

```ts
// payload esperado
{
  nome: string,
  preco: number,
  estoque: number,   // o front usa "quantidade" e mapeia para "estoque"
  descricao?: string
}
```

A tela `Produtos.vue` faz:

1. Carrega a lista no `onMounted` chamando `listarProdutosApi`.
2. No submit do formulário decide entre `criarProdutoApi` ou `atualizarProdutoApi`.
3. No botão remover chama `removerProdutoApi` e recarrega a lista.
4. Exibe estado de carregamento e mensagem de erro vinda da API.

4. Autenticação — `authApi.js`

Arquivo: `src/services/authApi.js`

Mapeamento com o backend:

| Função do front              | Método | Endpoint        | Descrição                       |
|------------------------------|--------|-----------------|---------------------------------|
| `loginApi({email, password})`| POST   | `/auth/login`   | Faz login (OAuth2 password flow)|
| `cadastrarUsuarioApi(...)`   | POST   | `/users/`       | Cria um novo usuário            |
| `logoutApi()`                | -      | -               | Limpa token e dados locais      |

Login

O endpoint `/auth/login` do FastAPI espera `application/x-www-form-urlencoded`, então o front monta um `URLSearchParams`:

```js
const formData = new URLSearchParams()
formData.append('username', email)
formData.append('password', password)

const { data } = await apiClient.request({
  method: 'POST',
  url: '/auth/login',
  data: formData,
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
})
```

Em caso de sucesso:

- `data.access_token` é salvo em `localStorage.mercearia_access_token`;
- o email do usuário é guardado em `localStorage.mercearia_auth_user`;
- a partir daí, **toda** chamada do `apiClient` envia o `Authorization: Bearer ...` automaticamente.

Cadastro

O endpoint `/users/` espera JSON com `nome`, `email`, `password`:

```js
const { data } = await apiClient.request({
  method: 'POST',
  url: '/users/',
  data: { nome, email, password },
})
```

Logout

Não há endpoint no backend; basta apagar o que está no `localStorage`:

```js
localStorage.removeItem(AUTH_TOKEN_KEY)
localStorage.removeItem(AUTH_USER_KEY)
```

O botão "Sair" no `App.vue` chama `logoutApi()` antes de redirecionar para a tela de login.

5. Tratamento de Erros

Padrão usado em todos os services:

```js
try {
  const { data } = await apiClient.request({ ... })
  return data
} catch (error) {
  throw buildAxiosError(error, 'Mensagem amigável para o usuário.')
}
```

O componente que chama o service só precisa fazer:

```js
try {
  await criarProdutoApi(payload)
} catch (e) {
  mensagemErro.value = e.message
}
```

A mensagem que aparece para o usuário vem:

1. do campo `detail` retornado pelo FastAPI (quando existir);
2. ou da mensagem padrão definida no service.

6. Como Mudar a URL da API

Crie um arquivo `.env` (ou `.env.local`) na raiz do projeto `Mercearia-ceep`:

```
VITE_API_BASE_URL=http://localhost:8000
```

O Vite expõe essa variável em `import.meta.env.VITE_API_BASE_URL` e ela é usada como `baseURL` do Axios. Se não for definida, o front usa `http://127.0.0.1:8000`.

7. Como Adicionar uma Nova Rota

Para criar uma nova chamada (exemplo, listar pedidos):

1. Criar um novo service, ex.: `src/services/ordersApi.js`.
2. Importar o cliente:

   ```js
   import apiClient, { buildAxiosError } from './apiClient'
   ```

3. Implementar a função usando `apiClient.request({...})`:

   ```js
   export async function listarPedidosApi() {
     try {
       const { data } = await apiClient.request({
         method: 'GET',
         url: '/pedidos/',
       })
       return data
     } catch (error) {
       throw buildAxiosError(error, 'Erro ao listar pedidos.')
     }
   }
   ```

4. Importar e usar nos componentes Vue.

Como o token é injetado automaticamente pelo interceptor, rotas autenticadas (como `/pedidos/`) já funcionam sem ajuste extra após o login.

Resumo

- A biblioteca usada é o **Axios** ([documentação](https://axios.rest/pages/getting-started/first-steps.html)).
- Todas as requisições passam por uma instância única (`apiClient`).
- O método padrão usado é `apiClient.request({ method, url, data, headers })`.
- O token é injetado automaticamente em toda chamada.
- Erros são padronizados via `buildAxiosError` para mostrar mensagens claras na UI.
