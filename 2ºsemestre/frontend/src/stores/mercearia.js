/**
 * stores/mercearia.js - Store Pinia do Controle de Mercearia
 *
 * Este arquivo centraliza **todos os dados importantes** da aplicação:
 * - produtos da mercearia
 * - clientes
 * - pedidos de venda
 *
 * Ele também:
 * - salva esses dados no localStorage (para não perder quando recarrega a página)
 * - calcula totais (estoque, vendas do dia, alertas)
 * - expõe actions para atualizar produtos e registrar pedidos
 */

// Importa a função que cria stores do Pinia
import { defineStore } from 'pinia'

// -----------------------------------------------------------------------------
//  CONSTANTES E ESTADO INICIAL
// -----------------------------------------------------------------------------

// Nome da chave usada no localStorage para guardar o JSON com os dados
const STORAGE_KEY = 'mercearia-vue-dados'

/**
 * dadosIniciais
 *
 * Retorna um objeto com o formato completo do estado esperado pelo store
 * quando ainda **não existe nada** salvo no localStorage.
 *
 * É aqui que definimos os dados "mock" (de exemplo) que aparecem no
 * dashboard logo que o projeto é aberto pela primeira vez.
 */
const dadosIniciais = () => ({
  // Lista de produtos da mercearia
  produtos: [
    // Cada produto tem:
    // - id: identificador numérico único
    // - nome: descrição do produto
    // - preco: preço unitário
    // - quantidade: quantidade atual em estoque
    // - quantidadeMinima: mínimo desejado para não entrar em alerta
    { id: 1, nome: 'Arroz 5kg', preco: 22.9, quantidade: 0, quantidadeMinima: 20 },
    { id: 2, nome: 'Óleo 900ml', preco: 8.5, quantidade: 5, quantidadeMinima: 15 },
    { id: 3, nome: 'Feijão 1kg', preco: 7.9, quantidade: 2, quantidadeMinima: 25 },
    { id: 4, nome: 'Açúcar 1kg', preco: 4.2, quantidade: 50, quantidadeMinima: 10 },
    { id: 5, nome: 'Café 500g', preco: 18.0, quantidade: 30, quantidadeMinima: 15 },
  ],

  // Lista de clientes cadastrados (simplificada para o exemplo)
  clientes: [
    { id: 1, nome: 'Maria Silva', telefone: '(11) 99999-1111', endereco: 'Rua A, 100' },
    { id: 2, nome: 'João Santos', telefone: '(11) 98888-2222', endereco: 'Rua B, 200' },
  ],

  // Lista de pedidos de venda já registrados
  pedidos: [
    {
      // id do pedido (número interno simples)
      id: 1,
      // cliente associado ao pedido (relaciona com clientes.id)
      clienteId: 1,
      // data do pedido no formato AAAA-MM-DD (ex.: 2026-02-20)
      data: new Date().toISOString().slice(0, 10),
      // itens do pedido: produto, quantidade e preço unitário
      itens: [
        { produtoId: 1, quantidade: 2, precoUnitario: 22.9 },
        { produtoId: 3, quantidade: 3, precoUnitario: 7.9 },
      ],
    },
  ],
})

// -----------------------------------------------------------------------------
//  FUNÇÕES AUXILIARES: CARREGAR / SALVAR NO LOCALSTORAGE
// -----------------------------------------------------------------------------

/**
 * carregarDoStorage()
 *
 * Tenta ler os dados salvos no localStorage usando a chave STORAGE_KEY.
 *
 * Fluxo:
 * 1. Lê a string JSON do localStorage.
 * 2. Se existir, faz `JSON.parse` para transformar em objeto.
 * 3. Confere se existe pelo menos 1 produto (para evitar arquivos vazios/quebrados).
 * 4. Se algo der errado (erro de parse, dados faltando), cai no `catch` e volta
 *    para os `dadosIniciais()`.
 */
function carregarDoStorage() {
  try {
    const json = localStorage.getItem(STORAGE_KEY)

    // Se achou algo salvo, tenta converter de JSON para objeto
    if (json) {
      const data = JSON.parse(json)

      // Confirma se veio uma lista de produtos válida; se sim, usa esses dados
      if (data.produtos?.length) return data
    }
  } catch (e) {
    // Se der qualquer erro (JSON inválido, etc.), apenas loga no console
    console.warn('Erro ao carregar dados do localStorage:', e)
  }

  // Se não achou nada ou deu erro, volta pro estado inicial "de fábrica"
  return dadosIniciais()
}

/**
 * salvarNoStorage(estado)
 *
 * Recebe um objeto com { produtos, clientes, pedidos } e grava como JSON
 * no localStorage, para persistir os dados entre recargas.
 */
function salvarNoStorage(estado) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado))
  } catch (e) {
    console.warn('Erro ao salvar no localStorage:', e)
  }
}

// -----------------------------------------------------------------------------
//  DEFINIÇÃO DO STORE PINIA
// -----------------------------------------------------------------------------

/**
 * useMerceariaStore
 *
 * Define o store "mercearia" com:
 * - state: dados principais (produtos, clientes, pedidos)
 * - getters: cálculos em cima do state (totais, filtros)
 * - actions: funções para mudar o state e salvar no localStorage
 *
 * Uso nos componentes:
 *   const store = useMerceariaStore()
 *   store.produtos / store.clientes / store.pedidos
 *   store.totalItensEstoque / store.vendasHoje / store.produtosEmFalta / store.totalAlertas
 */
export const useMerceariaStore = defineStore('mercearia', {
  // STATE ---------------------------------------------------------------
  // Estado inicial: ou vem do localStorage (se já havia dados),
  // ou volta para dadosIniciais() na primeira vez.
  state: () => carregarDoStorage(),

  // GETTERS ------------------------------------------------------------
  // Getters são como "campos calculados":
  // não guardam informação nova, apenas calculam algo em cima do state atual.
  getters: {
    /**
     * totalItensEstoque
     * Soma a quantidade de todos os produtos cadastrados.
     * Resultado usado no card "Estoque" do dashboard.
     */
    totalItensEstoque(state) {
      // reduce começa com s = 0 e vai somando p.quantidade de cada produto
      return state.produtos.reduce((s, p) => s + (p.quantidade || 0), 0)
    },

    /**
     * vendasHoje
     * Calcula o valor total de todos os pedidos cuja data é **hoje**.
     * Resultado é um número (ex.: 1240.5) que depois é formatado em R$ no componente.
     */
    vendasHoje(state) {
      // Data de hoje no mesmo formato salvo em pedidos (AAAA-MM-DD)
      const hoje = new Date().toISOString().slice(0, 10)

      return state.pedidos
        // 1) Filtra só os pedidos da data de hoje
        .filter((p) => p.data === hoje)
        // 2) Para cada pedido, soma o valor de todos os itens
        .reduce((total, pedido) => {
          const valorPedido = (pedido.itens || []).reduce(
            (s, i) => s + (i.quantidade || 0) * (i.precoUnitario || 0),
            0
          )
          // 3) Soma o valor de cada pedido ao acumulador total
          return total + valorPedido
        }, 0)
    },

    /**
     * produtosEmFalta
     * Retorna apenas os produtos cujo estoque atual está **abaixo** da quantidade mínima.
     * Usado para montar a tabela "Produtos em falta" e o card de alertas.
     */
    produtosEmFalta(state) {
      return state.produtos.filter(
        (p) => (p.quantidade || 0) < (p.quantidadeMinima || 0)
      )
    },

    /**
     * totalAlertas
     * Conta quantos produtos estão em falta (abaixo do mínimo).
     * É basicamente o tamanho da lista retornada por produtosEmFalta.
     */
    totalAlertas(state) {
      return state.produtos.filter(
        (p) => (p.quantidade || 0) < (p.quantidadeMinima || 0)
      ).length
    },
  },

  // ACTIONS ------------------------------------------------------------
  // Actions são funções que **alteram** o state. Depois de mudar os dados,
  // sempre chamamos this.salvar() para persistir no localStorage.
  actions: {
    /**
     * salvar
     *
     * Monta um objeto com os pedaços importantes do estado e chama
     * salvarNoStorage() para gravar no localStorage.
     */
    salvar() {
      salvarNoStorage({
        produtos: this.produtos,
        clientes: this.clientes,
        pedidos: this.pedidos,
      })
    },

    /**
     * adicionarCliente(dados)
     *
     * Cria um novo cliente com um id numérico simples (Date.now())
     * e adiciona na lista de clientes, salvando em seguida.
     *
     * Exemplo de `dados`:
     * { nome: 'Fulano', telefone: '(11) 99999-0000', endereco: 'Rua X, 123' }
     */
    adicionarCliente(dados) {
      const novo = {
        id: Date.now(),
        ...dados,
      }

      this.clientes.push(novo)
      this.salvar()
    },

    /**
     * atualizarCliente(id, dados)
     *
     * Localiza um cliente pelo id e atualiza os campos enviados em `dados`.
     * Pode ser usado para alterar nome, telefone ou endereço.
     */
    atualizarCliente(id, dados) {
      const cliente = this.clientes.find((c) => c.id === id)
      if (cliente) {
        Object.assign(cliente, dados)
        this.salvar()
      }
    },

    /**
     * removerCliente(id)
     *
     * Remove um cliente da lista com base no id informado.
     * (Neste exemplo simples, não há validação de pedidos ligados ao cliente.)
     */
    removerCliente(id) {
      this.clientes = this.clientes.filter((c) => c.id !== id)
      this.salvar()
    },

    /**
     * adicionarProduto(dados)
     *
     * Cria um novo produto com id gerado por Date.now() e adiciona na lista.
     * Exemplo de `dados`:
     * { nome, preco, quantidade, quantidadeMinima }
     */
    adicionarProduto(dados) {
      const novo = {
        id: Date.now(),
        ...dados,
      }

      this.produtos.push(novo)
      this.salvar()
    },

    /**
     * atualizarProduto(id, dados)
     *
     * Localiza um produto pelo id e aplica os campos enviados em `dados`.
     * Exemplo de uso: atualizar preço, quantidade ou nome de um produto.
     */
    atualizarProduto(id, dados) {
      // Procura o produto com o id informado
      const p = this.produtos.find((x) => x.id === id)

      // Se encontrou, sobrescreve as propriedades com Object.assign
      if (p) Object.assign(p, dados)

      // Depois de alterar, salva o estado completo no localStorage
      this.salvar()
    },

    /**
     * removerProduto(id)
     *
     * Remove um produto da lista com base no id informado.
     * (Neste exemplo simples, não há validação de pedidos que possam usar esse produto.) 
     */
    removerProduto(id) {
      this.produtos = this.produtos.filter((p) => p.id !== id)
      this.salvar()
    },

    /**
     * adicionarPedido(pedido)
     *
     * Recebe um objeto com os dados do novo pedido (clienteId, itens, etc.),
     * gera um id único simples com Date.now() e define a data como hoje.
     * Em seguida:
     *   1. adiciona o pedido à lista
     *   2. desconta do estoque a quantidade de cada produto envolvido
     *   3. salva tudo no localStorage
     */
    adicionarPedido(pedido) {
      const novo = {
        id: Date.now(), // gera um id numérico baseado no timestamp atual
        data: new Date().toISOString().slice(0, 10), // data atual (AAAA-MM-DD)
        ...pedido, // espalha os demais campos enviados (clienteId, itens, etc.)
      }

      // 1) Inclui o novo pedido na lista existente
      this.pedidos.push(novo)

      // 2) Desconta do estoque a quantidade de cada produto vendido
      for (const item of novo.itens || []) {
        const produto = this.produtos.find((p) => p.id === item.produtoId)
        if (!produto) continue

        const qtdAtual = produto.quantidade || 0
        const qtdVendida = item.quantidade || 0

        // Permite que o estoque fique negativo neste exemplo simples;
        // em um sistema real poderíamos bloquear ou avisar.
        produto.quantidade = qtdAtual - qtdVendida
      }

      // 3) Persiste a alteração (pedidos + produtos atualizados)
      this.salvar()
    },
  },
})
