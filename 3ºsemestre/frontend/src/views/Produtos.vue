<template>
  <div class="produtos">
    <header class="produtos-header">
      <h2>Produtos</h2>
      <p class="subtitle">Gerencie os produtos e o estoque da mercearia.</p>
    </header>

    <section class="cards" aria-label="Resumo de produtos">
      <article class="card card-total">
        <p class="valor">{{ totalProdutos }}</p>
        <h3>Produtos cadastrados</h3>
        <p class="label">Itens diferentes</p>
      </article>

      <article class="card card-estoque">
        <p class="valor">{{ totalItensEmEstoque }}</p>
        <h3>Unidades em estoque</h3>
        <p class="label">Soma das quantidades</p>
      </article>

      <article class="card card-valor">
        <p class="valor">{{ formatarMoeda(valorTotalEstoque) }}</p>
        <h3>Valor total do estoque</h3>
        <p class="label">Qtd × preço</p>
      </article>

    </section>

    <section class="secao-formulario">
      <h3 v-if="!estaEditando">Novo produto</h3>
      <h3 v-else>Editar produto: <span class="nome-editando">{{ form.nome }}</span></h3>

      <form @submit.prevent="salvarProduto" class="form">
        <div class="campo">
          <label for="nome">Nome</label>
          <input
            id="nome"
            v-model="form.nome"
            type="text"
            placeholder="Ex.: Arroz 5kg"
            required
          />
        </div>

        <div class="grupo-horizontal">
          <div class="campo">
            <label for="preco">Preço (R$)</label>
            <input
              id="preco"
              v-model.number="form.preco"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              required
            />
          </div>

          <div class="campo">
            <label for="quantidade">Qtd. estoque</label>
            <input
              id="quantidade"
              v-model.number="form.quantidade"
              type="number"
              min="0"
              placeholder="Ex.: 10"
              required
            />
          </div>

        </div>

        <p v-if="form.preco > 0 && form.quantidade > 0" class="preview-valor">
          Valor em estoque: <strong>{{ formatarMoeda(form.preco * form.quantidade) }}</strong>
        </p>

        <div class="acoes-form">
          <button type="submit" class="botao-primario">
            {{ estaEditando ? 'Salvar alterações' : 'Adicionar' }}
          </button>
          <button type="button" class="botao-secundario" @click="limparFormulario">
            {{ estaEditando ? 'Cancelar' : 'Limpar' }}
          </button>
        </div>
      </form>
    </section>

    <section class="secao-tabela">
      <div class="tabela-cabecalho">
        <h3>Lista de produtos</h3>
        <div class="campo-busca">
          <input
            v-model="textoBusca"
            type="text"
            placeholder="Buscar por nome..."
            class="input-busca"
          />
        </div>
      </div>

      <p v-if="carregando" class="mensagem-vazia">
        Carregando produtos da API...
      </p>

      <p v-else-if="mensagemErro" class="mensagem-vazia">
        {{ mensagemErro }}
      </p>

      <p v-else-if="produtos.length === 0" class="mensagem-vazia">
        Nenhum produto cadastrado ainda. Use o formulário acima para adicionar.
      </p>

      <p v-else-if="produtosFiltrados.length === 0" class="mensagem-vazia">
        Nenhum produto encontrado para "<strong>{{ textoBusca }}</strong>".
      </p>

      <div v-else class="tabela-wrapper">
        <table class="tabela">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Preço</th>
              <th>Qtd. estoque</th>
              <th>Valor estoque</th>
              <th class="col-acoes">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="produto in produtosFiltrados"
              :key="produto.id"
              :class="{ 'linha-alerta': produto.quantidade <= 0 }"
            >
              <td class="coluna-nome">{{ produto.nome }}</td>
              <td>{{ formatarMoeda(produto.preco) }}</td>
              <td>
                <span
                  :class="produto.quantidade <= 0 ? 'qtd-baixa' : ''"
                >
                  {{ produto.quantidade }}
                </span>
              </td>
              <td>{{ formatarMoeda(produto.preco * produto.quantidade) }}</td>
              <td class="celula-acoes">
                <button type="button" class="botao-acao" @click="iniciarEdicao(produto)">
                  Editar
                </button>
                <button
                  type="button"
                  class="botao-acao botao-remover"
                  @click="remover(produto.id)"
                >
                  Remover
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="produtosFiltrados.length > 0" class="rodape-tabela">
        Exibindo {{ produtosFiltrados.length }} de {{ produtos.length }} produtos.
      </p>
    </section>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import {
  listarProdutosApi,
  criarProdutoApi,
  atualizarProdutoApi,
  removerProdutoApi,
} from '../services/productsApi'

const produtos = ref([])
const carregando = ref(false)
const enviando = ref(false)
const mensagemErro = ref('')

const textoBusca = ref('')

const form = reactive({
  nome: '',
  preco: 0,
  quantidade: 0,
})

const idEmEdicao = ref(null)
const estaEditando = computed(() => idEmEdicao.value !== null)

const produtosFiltrados = computed(() => {
  const lista = [...produtos.value].sort((a, b) =>
    (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }),
  )
  const busca = textoBusca.value.trim().toLowerCase()
  if (!busca) return lista
  return lista.filter((p) => (p.nome || '').toLowerCase().includes(busca))
})

const totalProdutos = computed(() => produtos.value.length)
const totalItensEmEstoque = computed(() =>
  produtos.value.reduce((soma, p) => soma + (p.quantidade || 0), 0),
)
const valorTotalEstoque = computed(() =>
  produtos.value.reduce((soma, p) => soma + (p.quantidade || 0) * (p.preco || 0), 0),
)

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor || 0)
}

function limparFormulario() {
  form.nome = ''
  form.preco = 0
  form.quantidade = 0
  idEmEdicao.value = null
}

async function carregarProdutos() {
  carregando.value = true
  mensagemErro.value = ''
  try {
    produtos.value = await listarProdutosApi()
  } catch (error) {
    mensagemErro.value = `Falha ao carregar produtos: ${error.message}`
    console.error('[Produtos] Erro ao listar produtos:', error)
  } finally {
    carregando.value = false
  }
}

async function salvarProduto() {
  if (!form.nome.trim()) return
  if (enviando.value) return

  const dadosApi = {
    nome: form.nome.trim(),
    preco: Number(form.preco) || 0,
    quantidade: Number(form.quantidade) || 0,
  }

  enviando.value = true
  mensagemErro.value = ''
  try {
    if (idEmEdicao.value !== null) {
      await atualizarProdutoApi(idEmEdicao.value, dadosApi)
    } else {
      await criarProdutoApi(dadosApi)
    }
    await carregarProdutos()
    limparFormulario()
  } catch (error) {
    mensagemErro.value = `Falha ao salvar produto: ${error.message}`
    console.error('[Produtos] Erro ao salvar produto:', error)
  } finally {
    enviando.value = false
  }
}

function iniciarEdicao(produto) {
  idEmEdicao.value = produto.id
  form.nome = produto.nome || ''
  form.preco = produto.preco ?? 0
  form.quantidade = produto.quantidade ?? 0
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function remover(id) {
  const confirmar = window.confirm('Tem certeza que deseja remover este produto?')
  if (!confirmar) return
  if (enviando.value) return

  enviando.value = true
  mensagemErro.value = ''
  try {
    await removerProdutoApi(id)
    await carregarProdutos()
    if (idEmEdicao.value === id) {
      limparFormulario()
    }
  } catch (error) {
    mensagemErro.value = `Falha ao remover produto: ${error.message}`
    console.error('[Produtos] Erro ao remover produto:', error)
  } finally {
    enviando.value = false
  }
}

onMounted(async () => {
  await carregarProdutos()
  console.log('[Produtos] Dados recebidos:', {
    totalProdutos: totalProdutos.value,
    totalItensEmEstoque: totalItensEmEstoque.value,
    valorTotalEstoque: valorTotalEstoque.value,
  })
})
</script>

<style scoped>
.produtos {
  max-width: var(--largura-max);
  margin: 0 auto;
  padding: 1.5rem;
}

.produtos-header { margin-bottom: 2rem; }

.produtos-header h2 {
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

/* Cards */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

.card-total .valor   { color: var(--cor-primaria); }
.card-estoque .valor { color: var(--cor-sucesso); }
.card-valor .valor   { color: var(--cor-roxa); }

/* Formulário */
.secao-formulario {
  background: var(--cor-superficie);
  border-radius: var(--raio);
  padding: 1.25rem;
  box-shadow: var(--sombra);
  border: 1px solid var(--cor-borda);
  margin-bottom: 1.5rem;
}

.secao-formulario h3 {
  margin: 0 0 1.25rem;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--cor-titulo);
}

.nome-editando { color: var(--cor-primaria); font-weight: 700; }

.form { display: grid; gap: 0.85rem; }

.campo { display: flex; flex-direction: column; gap: 0.3rem; }

.campo label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--cor-texto);
}

.campo input {
  padding: 0.55rem 0.7rem;
  border-radius: var(--raio-sm);
  border: 1px solid var(--cor-borda);
  font-size: 0.9rem;
  transition: border-color 0.15s;
}

.campo input:focus {
  outline: none;
  border-color: var(--cor-primaria);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12);
}

.grupo-horizontal {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.85rem;
}

.preview-valor {
  margin: 0;
  font-size: 0.85rem;
  color: var(--cor-texto);
  background: var(--cor-roxa-fundo);
  border-left: 3px solid var(--cor-roxa);
  padding: 0.4rem 0.75rem;
  border-radius: 0 var(--raio-sm) var(--raio-sm) 0;
}

.preview-valor strong { color: var(--cor-roxa); }

.acoes-form { display: flex; gap: 0.5rem; margin-top: 0.25rem; flex-wrap: wrap; }

.botao-primario {
  padding: 0.5rem 1.1rem;
  border-radius: var(--raio-sm);
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  background: var(--cor-primaria);
  color: #fff;
  transition: filter 0.15s;
}

.botao-secundario {
  padding: 0.5rem 1.1rem;
  border-radius: var(--raio-sm);
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  background: var(--cor-borda);
  color: var(--cor-texto);
  transition: filter 0.15s;
}

.botao-primario:hover,
.botao-secundario:hover { filter: brightness(0.95); }

/* Tabela */
.secao-tabela {
  background: var(--cor-superficie);
  border-radius: var(--raio);
  padding: 1.25rem;
  box-shadow: var(--sombra);
  border: 1px solid var(--cor-borda);
}

.tabela-cabecalho {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.tabela-cabecalho h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--cor-titulo);
}

.campo-busca {
  display: flex;
  align-items: center;
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio-sm);
  background: var(--cor-fundo-input);
}

.input-busca {
  border: none;
  background: transparent;
  font-size: 0.875rem;
  outline: none;
  width: 180px;
  color: var(--cor-texto);
  padding: 0.4rem 0.7rem;
}

.tabela-wrapper { overflow-x: auto; }

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

.tabela tbody tr:hover { background: var(--cor-fundo-suave); }

.linha-alerta { background: var(--cor-perigo-fundo) !important; }
.linha-alerta:hover { background: #ffecec !important; }

.qtd-baixa { color: var(--cor-perigo); font-weight: 700; }
.coluna-nome { font-weight: 500; }

.col-acoes { width: 160px; text-align: center; }

.celula-acoes { display: flex; gap: 0.35rem; justify-content: center; }

.botao-acao {
  padding: 0.28rem 0.6rem;
  border-radius: var(--raio-sm);
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  background: var(--cor-borda);
  color: var(--cor-texto);
  white-space: nowrap;
  transition: filter 0.15s;
}

.botao-acao.botao-remover {
  background: var(--cor-perigo-fundo);
  color: var(--cor-perigo);
}

.botao-acao:hover { filter: brightness(0.93); }

.mensagem-vazia {
  margin: 1rem 0 0;
  font-size: 0.9rem;
  color: var(--cor-texto-leve);
  text-align: center;
  padding: 1.5rem;
  background: var(--cor-fundo-suave);
  border-radius: var(--raio-sm);
  border: 1px dashed var(--cor-borda);
}

.rodape-tabela {
  margin: 0.75rem 0 0;
  font-size: 0.8rem;
  color: var(--cor-texto-muito-leve);
  text-align: right;
}

@media (max-width: 600px) {
  .produtos { padding: 1rem; }
  .tabela th, .tabela td { padding: 0.5rem; }
  .input-busca { width: 120px; }
}
</style>
