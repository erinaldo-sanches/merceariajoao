<!--
  Dashboard.vue - Página inicial do Controle de Mercearia

  Exibe um resumo em cards (estoque, vendas do dia, alertas), um mini-resumo
  de clientes/produtos e uma tabela com os produtos em falta (quantidade abaixo
  do mínimo), além de uma lista dos últimos pedidos registrados.
  Todos os dados vêm do store Pinia (useMerceariaStore).
-->

<template>
  <div class="dashboard">
    <!-- Escreve aqui o que quiseres que apareça na página (passo a passo com os alunos) -->
    <header class="dashboard-header">
      <h2>Dashboard</h2>
      <p class="subtitle">Visão geral do controle da mercearia</p>
      <p class="data-atual">{{ dataAtual }}</p>
    </header>

    <!-- Mini-resumo de clientes e produtos -->
    <section class="resumo-extra" aria-label="Resumo de cadastros">
      <div class="item-resumo">
        <span class="label">Clientes cadastrados:</span>
        <span class="valor">{{ totalClientes }}</span>
      </div>
      <div class="item-resumo">
        <span class="label">Produtos cadastrados:</span>
        <span class="valor">{{ totalProdutos }}</span>
      </div>
    </section>

    <!-- Três cards de resumo (estoque, vendas do dia, alertas) -->
    <section class="cards" aria-label="Resumo">
      <article class="card card-estoque">
        <p class="valor">{{ resumo.estoque.total }}</p>
        <h3>Estoque</h3>
        <p class="label">{{ resumo.estoque.label }}</p>
      </article>
      <article class="card card-vendas">
        <p class="valor">{{ resumo.vendasHoje.total }}</p>
        <h3>Vendas do dia</h3>
        <p class="label">{{ resumo.vendasHoje.label }}</p>
      </article>
      <article class="card card-alertas">
        <p class="valor">{{ resumo.alertas.total }}</p>
        <h3>Alertas</h3>
        <p class="label">{{ resumo.alertas.label }}</p>
      </article>
    </section>

    <!-- Seção "Produtos em falta": tabela ou mensagem quando não há nenhum -->
    <section class="secao-alertas">
      <h3>Produtos em falta</h3>
      <div v-if="produtosEmFalta.length > 0" class="tabela-div">
        <table class="tabela">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Qtd. atual</th>
              <th>Qtd. mínima</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in produtosEmFalta" :key="index">
              <td>{{ item.nome }}</td>
              <td>{{ item.quantidade }}</td>
              <td>{{ item.minimo }}</td>
              <td>
                <span class="badge badge-falta">Repor</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="sem-alertas">Nenhum produto abaixo do estoque mínimo.</p>
    </section>

    <!-- Seção \"Últimos pedidos\" -->
    <section class="secao-pedidos">
      <h3>Últimas vendas</h3>

      <p v-if="pedidosRecentes.length === 0" class="sem-pedidos">
        Nenhuam venda registrada até o momento.
      </p>

      <div v-else class="tabela-div">
        <table class="tabela tabela-pedidos">
          <thead>
            <tr>
              <th>Nº pedido</th>
              <th>Data</th>
              <th>Cliente</th>
              <th>Qtd. itens</th>
              <th>Valor total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pedido in pedidosRecentes" :key="pedido.id">
              <td>{{ pedido.id }}</td>
              <td>{{ formatarData(pedido.data) }}</td>
              <td>{{ pedido.clienteNome }}</td>
              <td>{{ pedido.quantidadeTotal }}</td>
              <td>{{ formatarMoeda(pedido.valorTotal) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
// computed:
// Cria uma propriedade computada reativa.
// Ela depende de valores reativos (ref/reactive) e recalcula automaticamente
// quando essas dependências mudam. Possui cache, ou seja, só recalcula
// quando necessário. Ideal para estado derivado (ex: filtros, totais, formatações).

// onMounted:
// Hook de ciclo de vida da Composition API.
// Executa uma função quando o componente já foi montado no DOM.
// Usado para buscar dados, iniciar bibliotecas externas ou manipular elementos da tela.
import { useMerceariaStore } from '../stores/mercearia'

// Acesso ao store para ler getters (totalItensEstoque, vendasHoje, etc.)
const store = useMerceariaStore()

// Totais simples de clientes e produtos
const totalClientes = computed(() => store.clientes.length)
const totalProdutos = computed(() => store.produtos.length)

// Objeto reativo com os valores dos três cards; formatarMoeda formata vendas em R$
const resumo = computed(() => ({
  estoque: {
    // Total de itens no estoque (reativo)
    total: store.totalItensEstoque,
    label: 'Itens no estoque',
  },

  vendasHoje: {
    // Valor formatado como moeda
    total: formatarMoeda(store.vendasHoje),
    label: 'Vendas hoje',
  },

  alertas: {
    total: store.totalAlertas,
    label: 'Produtos em falta',
  },
}))


// =====================================================
// PRODUTOS EM FALTA (COMPUTED)
// =====================================================

/*
  Mapeia a lista original do store para
  um formato mais adequado para exibição na tabela.
*/
const produtosEmFalta = computed(() =>
  store.produtosEmFalta.map((p) => ({
    nome: p.nome,

    // Se for null ou undefined, retorna 0
    quantidade: p.quantidade ?? 0,

    minimo: p.quantidadeMinima ?? 0,
  }))
)


// =====================================================
// DATA ATUAL FORMATADA
// =====================================================

/*
  Retorna a data atual formatada em português.
*/
const dataAtual = computed(() => {
  const hoje = new Date()

  return hoje.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})


// =====================================================
// PEDIDOS RECENTES (COMPUTED)
// =====================================================

/*
  - Clona a lista para não mutar o store
  - Ordena por data (desc)
  - Em empate, ordena por ID (desc)
  - Limita aos 5 mais recentes
  - Enriquece os dados com nome do cliente e totais
*/
const pedidosRecentes = computed(() =>
  // Criando uma propriedade computada chamada 'pedidosRecentes'. Ela será automaticamente recalculada sempre que alguma dependência reativa mudar.
  [...store.pedidos] // Criamos uma cópia do array 'store.pedidos' para evitar mutar o estado diretamente

    .sort((a, b) => {
      // Ordena os pedidos por data (decrescente) e, em caso de empate, por ID (decrescente)
      const dataA = new Date(a.data || 0).getTime() // Converte a data de 'a' para timestamp numérico
      const dataB = new Date(b.data || 0).getTime() // Converte a data de 'b' para timestamp numérico

      if (dataA !== dataB) return dataB - dataA // Se as datas forem diferentes, ordena pela data mais recente
      return (b.id || 0) - (a.id || 0) // Se as datas forem iguais, ordena pelo ID mais recente
    })

    .slice(0, 5) // Pega apenas os 5 primeiros pedidos após a ordenação

    .map((pedido) => {
      // Transforma os pedidos para adicionar mais informações como o nome do cliente, a quantidade total de itens e o valor total

      const cliente = store.clientes.find(
        // Busca o cliente correspondente ao pedido baseado no 'clienteId'
        (c) => c.id === pedido.clienteId
      )

      const quantidadeTotal = (pedido.itens || []).reduce(
        // Calcula a quantidade total de itens no pedido
        (soma, item) => soma + (item.quantidade || 0),
        0
      )

      const valorTotal = (pedido.itens || []).reduce(
        // Calcula o valor total do pedido (quantidade * preço unitário de cada item)
        (soma, item) =>
          soma +
          (item.quantidade || 0) * (item.precoUnitario || 0),
        0
      )

      return {
        ...pedido, // Espalha as propriedades originais do pedido
        clienteNome:
          cliente?.nome || 'Cliente não encontrado', // Adiciona o nome do cliente ou um fallback caso não encontre
        quantidadeTotal, // Adiciona a quantidade total de itens
        valorTotal, // Adiciona o valor total do pedido
      }
    })
)


// =====================================================
// FUNÇÕES UTILITÁRIAS
// =====================================================

/*
  Formata número para moeda brasileira.
  Ex: 1240 -> "R$ 1.240,00"
*/
function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}


/*
  Converte data ISO (YYYY-MM-DD) para formato brasileiro.
*/
function formatarData(dataISO) {
  if (!dataISO) return '-'

  const data = new Date(dataISO)
  return data.toLocaleDateString('pt-BR')
}


// =====================================================
// CICLO DE VIDA
// =====================================================

/*
  onMounted:
  Executa após o componente ser montado no DOM.
  Ideal para logs, chamadas de API ou inicializações.
*/
onMounted(() => {
  console.log('[Dashboard] Dados recebidos:', {
    totalClientes: totalClientes.value,
    totalProdutos: totalProdutos.value,
    resumo: resumo.value,
    produtosEmFalta: produtosEmFalta.value,
    pedidosRecentes: pedidosRecentes.value,
    dataAtual: dataAtual.value,
  })
})
</script>

<style scoped>
.dashboard {
  padding: 1.5rem;
  max-width: var(--largura-max);
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 2rem;
}

.dashboard-header h2 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--cor-titulo);
}

.subtitle {
  margin: 0.25rem 0 0;
  color: var(--cor-texto-leve);
  font-size: 0.95rem;
}

.data-atual {
  margin: 0.4rem 0 0;
  font-size: 0.875rem;
  color: var(--cor-texto-leve);
  text-transform: capitalize;
}

/* Mini-resumo de cadastros */
.resumo-extra {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.25rem;
  margin-bottom: 1.5rem;
  padding: 0.75rem 1rem;
  background: var(--cor-superficie);
  border-radius: var(--raio);
  border: 1px solid var(--cor-borda);
  box-shadow: var(--sombra);
}

.item-resumo {
  display: flex;
  gap: 0.35rem;
  font-size: 0.9rem;
  align-items: center;
}

.item-resumo .label {
  color: var(--cor-texto-leve);
}

.item-resumo .valor {
  font-weight: 700;
  color: var(--cor-titulo);
}

/* Cards de resumo */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.card {
  background: var(--cor-superficie);
  border-radius: var(--raio);
  padding: 1.25rem;
  box-shadow: var(--sombra);
  border: 1px solid var(--cor-borda);
}

.card h3 {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--cor-texto-leve);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.card .valor {
  margin: 0 0 0.25rem;
  font-size: 1.5rem;
  font-weight: 700;
}

.card .label {
  margin: 0.1rem 0 0;
  font-size: 0.78rem;
  color: var(--cor-texto-muito-leve);
}

.card-estoque .valor { color: var(--cor-primaria); }
.card-vendas .valor  { color: var(--cor-sucesso); }
.card-alertas .valor { color: var(--cor-perigo); }

/* Seções com tabela */
.secao-alertas,
.secao-pedidos {
  background: var(--cor-superficie);
  border-radius: var(--raio);
  padding: 1.25rem;
  box-shadow: var(--sombra);
  border: 1px solid var(--cor-borda);
  margin-bottom: 1.5rem;
}

.secao-alertas h3,
.secao-pedidos h3 {
  margin: 0 0 1rem;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--cor-titulo);
}

.tabela-div {
  overflow-x: auto;
}

.tabela {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.tabela th,
.tabela td {
  padding: 0.6rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--cor-borda);
}

.tabela th {
  background: var(--cor-fundo-suave);
  font-weight: 600;
  color: var(--cor-texto);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.tabela tbody tr:hover {
  background: var(--cor-fundo-suave);
}

.badge {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: var(--raio-pill);
  font-size: 0.78rem;
  font-weight: 600;
  background: var(--cor-perigo-fundo);
  color: var(--cor-perigo);
}

.sem-alertas,
.sem-pedidos {
  margin: 0;
  color: var(--cor-texto-leve);
  font-size: 0.9rem;
}

@media (max-width: 600px) {
  .dashboard {
    padding: 1rem;
  }

  .tabela th,
  .tabela td {
    padding: 0.5rem;
  }
}
</style>
