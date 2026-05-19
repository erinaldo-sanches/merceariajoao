import apiClient, { buildAxiosError } from './apiClient'

export async function listarProdutosApi() {
  try {
    const { data } = await apiClient.request({
      method: 'GET',
      url: '/produtos/',
    })
    return data
  } catch (error) {
    throw buildAxiosError(error, 'Erro ao listar produtos.')
  }
}

export async function criarProdutoApi(produto) {
  try {
    const { data } = await apiClient.request({
      method: 'POST',
      url: '/produtos/',
      data: produto,
    })
    return data
  } catch (error) {
    throw buildAxiosError(error, 'Erro ao criar produto.')
  }
}

export async function atualizarProdutoApi(produtoId, produto) {
  try {
    const { data } = await apiClient.request({
      method: 'PUT',
      url: `/produtos/${produtoId}`,
      data: produto,
    })
    return data
  } catch (error) {
    throw buildAxiosError(error, 'Erro ao atualizar produto.')
  }
}

export async function removerProdutoApi(produtoId) {
  try {
    await apiClient.request({
      method: 'DELETE',
      url: `/produtos/${produtoId}`,
    })
    return true
  } catch (error) {
    throw buildAxiosError(error, 'Erro ao remover produto.')
  }
}
