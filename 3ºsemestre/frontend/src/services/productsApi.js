import apiClient, { buildAxiosError } from './apiClient'

/** Converte resposta da API Node (name, price, stockQty) para o formato da tela. */
export function mapearProdutoDaApi(produtoApi) {
  return {
    id: produtoApi.id,
    nome: produtoApi.name ?? produtoApi.nome ?? '',
    preco: Number(produtoApi.price ?? produtoApi.preco) || 0,
    quantidade: Number(produtoApi.stockQty ?? produtoApi.estoque) || 0,
  }
}

/** Converte dados do formulário para o corpo esperado pelo backend. */
function mapearProdutoParaApi({ nome, preco, quantidade, estoque }) {
  return {
    name: (nome || '').trim(),
    price: Number(preco) || 0,
    stockQty: Number(quantidade ?? estoque) || 0,
  }
}

export async function listarProdutosApi() {
  try {
    const { data } = await apiClient.request({
      method: 'GET',
      url: '/products',
    })
    const lista = Array.isArray(data) ? data : []
    return lista.map(mapearProdutoDaApi)
  } catch (error) {
    throw buildAxiosError(error, 'Erro ao listar produtos.')
  }
}

export async function criarProdutoApi(produto) {
  try {
    const { data } = await apiClient.request({
      method: 'POST',
      url: '/products',
      data: mapearProdutoParaApi(produto),
    })
    return mapearProdutoDaApi(data)
  } catch (error) {
    throw buildAxiosError(error, 'Erro ao criar produto.')
  }
}

export async function atualizarProdutoApi(produtoId, produto) {
  try {
    const { data } = await apiClient.request({
      method: 'PUT',
      url: `/products/${produtoId}`,
      data: mapearProdutoParaApi(produto),
    })
    return mapearProdutoDaApi(data)
  } catch (error) {
    throw buildAxiosError(error, 'Erro ao atualizar produto.')
  }
}

export async function removerProdutoApi(produtoId) {
  try {
    await apiClient.request({
      method: 'DELETE',
      url: `/products/${produtoId}`,
    })
    return true
  } catch (error) {
    throw buildAxiosError(error, 'Erro ao remover produto.')
  }
}
