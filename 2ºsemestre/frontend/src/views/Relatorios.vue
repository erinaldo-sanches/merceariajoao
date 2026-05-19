<template>
  <div class="relatorios">
    <header class="relatorios-header">
      <h2>Relatórios</h2>
      <p class="subtitle">Visão geral de vendas e estoque da mercearia.</p>
    </header>

    <section class="secao">
      <h3>Gráficos</h3>
      <div class="grid-graficos">
        <article class="card-grafico">
          <h4>Vendas por dia</h4>
          <p v-if="!temPedidos" class="msg-vazia">Registre pedidos em <strong>Vendas</strong> para ver o gráfico.</p>
          <div v-else class="chart-wrap">
            <Line :data="graficoVendasDia" :options="optsLinha" />
          </div>
        </article>

        <article class="card-grafico">
          <h4>Receita por cliente</h4>
          <p v-if="!temPedidos" class="msg-vazia">Sem pedidos para agrupar por cliente.</p>
          <div v-else class="chart-wrap">
            <Bar :data="graficoReceitaCliente" :options="optsBarraH" />
          </div>
        </article>

        <article class="card-grafico">
          <h4>Estoque (OK × abaixo do mínimo)</h4>
          <p v-if="!temProdutos" class="msg-vazia">Cadastre produtos para ver a distribuição.</p>
          <div v-else class="chart-wrap chart-wrap--rosca">
            <Doughnut :data="graficoEstoque" :options="optsRosca" />
          </div>
        </article>
      </div>
    </section>

    <section class="secao">
      <h3>Vendas</h3>
      <p v-if="!temPedidos" class="msg-vazia">Nenhum pedido registrado.</p>
      <template v-else>
        <div class="resumo">
          <div class="resumo-linha">
            <span class="label">Pedidos</span>
            <span class="valor">{{ pedidosLista.length }}</span>
          </div>
          <div class="resumo-linha">
            <span class="label">Total</span>
            <span class="valor ok">{{ fmtMoeda(totalVendas) }}</span>
          </div>
        </div>
        <div class="tabela-wrap">
          <table class="tabela">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Itens</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in pedidosLista" :key="p.id">
                <td>{{ p.id }}</td>
                <td>{{ fmtData(p.data) }}</td>
                <td>{{ p.clienteNome }}</td>
                <td>{{ p.qtdItens }}</td>
                <td>{{ fmtMoeda(p.valorTotal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>

    <section class="secao">
      <h3>Estoque</h3>
      <div class="resumo">
        <div class="resumo-linha">
          <span class="label">Itens no estoque</span>
          <span class="valor">{{ totalQtdEstoque }}</span>
        </div>
        <div class="resumo-linha">
          <span class="label">Abaixo do mínimo</span>
          <span class="valor alerta">{{ qtdAbaixoMinimo }}</span>
        </div>
      </div>
      <div class="tabela-wrap">
        <table class="tabela">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Estoque</th>
              <th>Mínimo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pr in produtosOrdenados" :key="pr.id">
              <td>{{ pr.nome }}</td>
              <td>{{ pr.quantidade }}</td>
              <td>{{ pr.quantidadeMinima }}</td>
              <td>
                <span class="badge" :class="abaixoMinimo(pr) ? 'badge-alerta' : 'badge-ok'">
                  {{ abaixoMinimo(pr) ? 'Abaixo do mínimo' : 'OK' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Line, Bar, Doughnut } from '../utils/chartRegistroRelatorios'
import { useMerceariaStore } from '../stores/mercearia'

const store = useMerceariaStore()

const pedidosLista = computed(() =>
  store.pedidos.map((pedido) => {
    const cliente = store.clientes.find((c) => c.id === pedido.clienteId)
    const itens = pedido.itens || []
    const qtdItens = itens.reduce((s, i) => s + (i.quantidade || 0), 0)
    const valorTotal = itens.reduce(
      (s, i) => s + (i.quantidade || 0) * (i.precoUnitario || 0),
      0,
    )
    return {
      ...pedido,
      clienteNome: cliente?.nome || '—',
      qtdItens,
      valorTotal,
    }
  }),
)

const temPedidos = computed(() => pedidosLista.value.length > 0)
const temProdutos = computed(() => store.produtos.length > 0)

const totalVendas = computed(() =>
  pedidosLista.value.reduce((s, p) => s + p.valorTotal, 0),
)

const produtosOrdenados = computed(() =>
  [...store.produtos].sort((a, b) =>
    (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }),
  ),
)

const totalQtdEstoque = computed(() =>
  store.produtos.reduce((s, p) => s + (p.quantidade || 0), 0),
)

const qtdAbaixoMinimo = computed(() =>
  store.produtos.filter((p) => (p.quantidade || 0) < (p.quantidadeMinima || 0)).length,
)

function abaixoMinimo(p) {
  return (p.quantidade || 0) < (p.quantidadeMinima || 0)
}

function fmtMoeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function fmtMoedaCurta(v) {
  const n = Number(v) || 0
  if (n >= 1000) return `R$ ${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtData(s) {
  if (!s) return '—'
  const d = new Date(`${s}T12:00:00`)
  return Number.isNaN(d.getTime()) ? String(s) : d.toLocaleDateString('pt-BR')
}

function tooltipMoeda(eixo) {
  return {
    callbacks: {
      label(ctx) {
        const v = ctx.parsed?.[eixo]
        return ` ${fmtMoeda(typeof v === 'number' ? v : 0)}`
      },
    },
  }
}

const graficoVendasDia = computed(() => {
  const mapa = new Map()
  for (const p of pedidosLista.value) {
    const dia = p.data || ''
    mapa.set(dia, (mapa.get(dia) || 0) + p.valorTotal)
  }
  const linhas = [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b))
  return {
    labels: linhas.map(([data]) => fmtData(data)),
    datasets: [
      {
        label: 'R$',
        data: linhas.map(([, v]) => v),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
        fill: true,
        tension: 0.25,
        pointRadius: 4,
        pointBackgroundColor: '#2563eb',
      },
    ],
  }
})

const optsLinha = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: tooltipMoeda('y') },
  scales: {
    x: { grid: { display: false } },
    y: {
      beginAtZero: true,
      ticks: { callback: (v) => fmtMoedaCurta(v) },
    },
  },
}

const graficoReceitaCliente = computed(() => {
  const mapa = new Map()
  for (const p of pedidosLista.value) {
    const nome = p.clienteNome || '—'
    mapa.set(nome, (mapa.get(nome) || 0) + p.valorTotal)
  }
  const linhas = [...mapa.entries()].sort((a, b) => b[1] - a[1])
  return {
    labels: linhas.map(([n]) => n),
    datasets: [
      {
        label: 'Receita',
        data: linhas.map(([, v]) => v),
        backgroundColor: 'rgba(124, 58, 237, 0.65)',
        borderColor: '#7c3aed',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  }
})

const optsBarraH = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: tooltipMoeda('x') },
  scales: {
    x: { beginAtZero: true, ticks: { callback: (v) => fmtMoedaCurta(v) } },
    y: { grid: { display: false } },
  },
}

const graficoEstoque = computed(() => {
  let ok = 0
  let alerta = 0
  for (const p of store.produtos) {
    if ((p.quantidade || 0) < (p.quantidadeMinima || 0)) alerta += 1
    else ok += 1
  }
  return {
    labels: ['OK', 'Abaixo do mínimo'],
    datasets: [
      {
        data: [ok, alerta],
        backgroundColor: ['rgba(22, 163, 74, 0.85)', 'rgba(220, 38, 38, 0.85)'],
        borderColor: ['#16a34a', '#dc2626'],
        borderWidth: 1,
        hoverOffset: 6,
      },
    ],
  }
})

const optsRosca = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
    tooltip: {
      callbacks: {
        label(ctx) {
          const n = ctx.dataset.data[ctx.dataIndex]
          return ` ${ctx.label}: ${n} produto(s)`
        },
      },
    },
  },
}
</script>

<style scoped>
.relatorios {
  max-width: var(--largura-max);
  margin: 0 auto;
  padding: 1.5rem;
}

.relatorios-header {
  margin-bottom: 1.75rem;
}

.relatorios-header h2 {
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

.secao {
  background: var(--cor-superficie);
  border-radius: var(--raio);
  padding: 1.25rem;
  margin-bottom: 1.25rem;
  box-shadow: var(--sombra);
  border: 1px solid var(--cor-borda);
}

.secao h3 {
  margin: 0 0 1rem;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--cor-titulo);
}

.grid-graficos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.card-grafico {
  background: var(--cor-fundo-suave);
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio-sm);
  padding: 0.85rem 1rem;
}

.card-grafico h4 {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--cor-titulo);
}

.chart-wrap {
  position: relative;
  height: 230px;
}

.chart-wrap--rosca {
  height: 250px;
  max-width: 300px;
  margin: 0 auto;
}

.msg-vazia {
  margin: 0;
  padding: 1.25rem 0.5rem;
  font-size: 0.85rem;
  color: var(--cor-texto-leve);
  text-align: center;
  line-height: 1.45;
}

.resumo {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.25rem;
  margin-bottom: 1rem;
  padding: 0.65rem 1rem;
  background: var(--cor-fundo-suave);
  border-radius: var(--raio-sm);
  border: 1px solid var(--cor-borda);
}

.resumo-linha {
  display: flex;
  gap: 0.35rem;
  align-items: center;
  font-size: 0.9rem;
}

.resumo-linha .label {
  color: var(--cor-texto-leve);
}

.resumo-linha .valor {
  font-weight: 700;
  color: var(--cor-titulo);
}

.resumo-linha .valor.ok {
  color: var(--cor-sucesso);
}

.resumo-linha .valor.alerta {
  color: var(--cor-perigo);
}

.tabela-wrap {
  overflow-x: auto;
}

.tabela {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.tabela th,
.tabela td {
  padding: 0.55rem 0.7rem;
  text-align: left;
  border-bottom: 1px solid var(--cor-borda);
}

.tabela th {
  background: var(--cor-fundo-suave);
  font-weight: 600;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--cor-texto);
}

.tabela tbody tr:hover {
  background: var(--cor-fundo-suave);
}

.badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: var(--raio-pill);
  font-size: 0.78rem;
  font-weight: 600;
}

.badge-ok {
  background: var(--cor-sucesso-fundo);
  color: var(--cor-sucesso);
}

.badge-alerta {
  background: var(--cor-perigo-fundo);
  color: var(--cor-perigo);
}

@media (max-width: 600px) {
  .relatorios {
    padding: 1rem;
  }

  .chart-wrap {
    height: 200px;
  }
}
</style>
