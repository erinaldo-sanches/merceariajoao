class GerenciadorVendas {
    constructor() {
        this.vendas = [];
        this.produtos = [];
        this.clientes = [];
        this.inicializar();
    }

    async inicializar() {
        this.cacheElementos();
        this.configurarEventos();
        const apiOk = await this.verificarConexaoAPI();
        if (!apiOk) {
            this.exibirEstadoOffline();
            return;
        }
        await this.carregarDadosIniciais();
        await this.carregarVendas();
        await this.carregarResumoHoje();
        this.aplicarProdutoDaUrl();
    }

    cacheElementos() {
        this.elementos = {
            formVenda: document.getElementById('formVenda'),
            selectCliente: document.getElementById('selectCliente'),
            selectProduto: document.getElementById('selectProduto'),
            quantidade: document.getElementById('quantidade'),
            estoqueDisponivel: document.getElementById('estoqueDisponivel'),
            valorTotalVenda: document.getElementById('valorTotalVenda'),
            tabelaBody: document.getElementById('tabelaVendas'),
            btnRecarregar: document.getElementById('btnRecarregar'),
            apiStatus: document.getElementById('api-status'),
            vendasHoje: document.getElementById('vendasHoje'),
            totalHoje: document.getElementById('totalHoje')
        };
    }

    configurarEventos() {
        this.elementos.formVenda.addEventListener('submit', (e) => {
            e.preventDefault();
            this.registrarVenda();
        });
        this.elementos.selectProduto.addEventListener('change', () => this.atualizarPreview());
        this.elementos.quantidade.addEventListener('input', () => this.atualizarPreview());
        this.elementos.btnRecarregar.addEventListener('click', async () => {
            await this.carregarVendas();
            await this.carregarResumoHoje();
        });
    }

    async verificarConexaoAPI() {
        const el = this.elementos.apiStatus;
        const online = await verificarApiOnline();
        if (el) {
            el.textContent = online ? '● API Online' : '● API Offline';
            el.className = online ? 'status-online' : 'status-offline';
        }
        if (!online) {
            mostrarAlerta(
                `Backend não responde em ${API_BASE_URL}. Inicie o FastAPI na porta 8000.`,
                'warning',
                8000
            );
        }
        return online;
    }

    exibirEstadoOffline() {
        if (this.elementos.tabelaBody) {
            this.elementos.tabelaBody.innerHTML = `
                <tr><td colspan="7" class="centralizado mensagem-tabela">
                    ⚠️ API offline — inicie: <code>uvicorn main:app --reload --port 8000</code>
                </td></tr>
            `;
        }
    }

    async carregarDadosIniciais() {
        try {
            const [clientesRes, produtosRes] = await Promise.all([
                ClienteAPI.listar(),
                ProdutoAPI.listar()
            ]);
            this.clientes = clientesRes.data || [];
            this.produtos = produtosRes.data || [];
            this.preencherSelects();
        } catch (erro) {
            console.error('Erro ao carregar dados:', erro);
            mostrarAlerta('Erro ao carregar clientes ou produtos.', 'error');
        }
    }

    preencherSelects() {
        this.elementos.selectCliente.innerHTML = '<option value="">Selecione o cliente...</option>' +
            this.clientes.map((c) => `<option value="${c.id}">${c.nome}</option>`).join('');

        this.elementos.selectProduto.innerHTML = '<option value="">Selecione o produto...</option>' +
            this.produtos.map((p) => {
                const preco = p.preco_venda ?? p.preco ?? 0;
                const estoque = p.qtd_estoque ?? p.estoque ?? 0;
                return `<option value="${p.id}" data-preco="${preco}" data-estoque="${estoque}">${p.nome} — ${formatarPreco(preco)} (${estoque} un.)</option>`;
            }).join('');
    }

    aplicarProdutoDaUrl() {
        const produtoId = new URLSearchParams(window.location.search).get('produto');
        if (produtoId && this.elementos.selectProduto.querySelector(`option[value="${produtoId}"]`)) {
            this.elementos.selectProduto.value = produtoId;
            this.atualizarPreview();
        }
    }

    atualizarPreview() {
        const option = this.elementos.selectProduto.selectedOptions[0];
        if (!option || !option.value) {
            this.elementos.estoqueDisponivel.textContent = 'Estoque disponível: —';
            this.elementos.valorTotalVenda.textContent = 'R$ 0,00';
            return;
        }

        const preco = Number(option.dataset.preco) || 0;
        const estoque = Number(option.dataset.estoque) || 0;
        const qtd = Math.max(1, parseInt(this.elementos.quantidade.value, 10) || 1);

        this.elementos.estoqueDisponivel.textContent = `Estoque disponível: ${estoque} unidade(s)`;
        this.elementos.valorTotalVenda.textContent = formatarPreco(preco * qtd);
    }

    async carregarVendas() {
        try {
            this.elementos.tabelaBody.innerHTML = `
                <tr><td colspan="7" class="centralizado mensagem-tabela">⏳ Carregando...</td></tr>
            `;
            const resposta = await VendaAPI.listar();
            this.vendas = resposta.data || [];
            this.atualizarTabela();
        } catch (erro) {
            console.error('Erro ao carregar vendas:', erro);
            this.elementos.tabelaBody.innerHTML = `
                <tr><td colspan="7" class="centralizado mensagem-tabela">❌ Erro ao carregar vendas</td></tr>
            `;
        }
    }

    async carregarResumoHoje() {
        try {
            const resposta = await VendaAPI.vendasHoje();
            const dados = resposta.data || {};
            this.elementos.vendasHoje.textContent = dados.quantidade ?? 0;
            this.elementos.totalHoje.textContent = formatarPreco(dados.valor_total ?? 0);
        } catch {
            this.elementos.vendasHoje.textContent = '0';
            this.elementos.totalHoje.textContent = 'R$ 0,00';
        }
    }

    atualizarTabela() {
        if (!this.vendas.length) {
            this.elementos.tabelaBody.innerHTML = `
                <tr><td colspan="7" class="centralizado mensagem-tabela">Nenhuma venda registrada.</td></tr>
            `;
            return;
        }

        this.elementos.tabelaBody.innerHTML = this.vendas.map((v) => `
            <tr>
                <td>${v.id}</td>
                <td>${formatarData(v.data_venda, true)}</td>
                <td>${v.cliente_nome || `Cliente #${v.cliente_id}`}</td>
                <td>${v.produto_nome || `Produto #${v.produto_id}`}</td>
                <td>${v.quantidade}</td>
                <td><strong>${formatarPreco(v.valor_total)}</strong></td>
                <td>
                    <button type="button" class="btn btn-pequeno btn-perigo" onclick="gerenciadorVendas.cancelarVenda(${v.id})">✕ Cancelar</button>
                </td>
            </tr>
        `).join('');
    }

    async registrarVenda() {
        const clienteId = this.elementos.selectCliente.value;
        const produtoId = this.elementos.selectProduto.value;
        const quantidade = parseInt(this.elementos.quantidade.value, 10);

        if (!clienteId || !produtoId) {
            mostrarAlerta('Selecione cliente e produto.', 'warning');
            return;
        }
        if (!quantidade || quantidade < 1) {
            mostrarAlerta('Informe uma quantidade válida.', 'error');
            return;
        }

        const option = this.elementos.selectProduto.selectedOptions[0];
        const estoque = Number(option.dataset.estoque) || 0;
        if (quantidade > estoque) {
            mostrarAlerta(`Estoque insuficiente. Disponível: ${estoque}`, 'error');
            return;
        }

        try {
            await VendaAPI.criar({ cliente_id: clienteId, produto_id: produtoId, quantidade });
            mostrarAlerta('Venda registrada com sucesso!', 'success');
            this.elementos.formVenda.reset();
            this.elementos.quantidade.value = 1;
            await this.carregarDadosIniciais();
            await this.carregarVendas();
            await this.carregarResumoHoje();
            this.atualizarPreview();
        } catch (erro) {
            const detalhe = erro.response?.data?.detail;
            mostrarAlerta(detalhe || 'Erro ao registrar venda.', 'error');
        }
    }

    async cancelarVenda(id) {
        if (!confirm('Cancelar esta venda? O estoque do produto será restaurado.')) return;

        try {
            await VendaAPI.excluir(id);
            mostrarAlerta('Venda cancelada.', 'success');
            await this.carregarDadosIniciais();
            await this.carregarVendas();
            await this.carregarResumoHoje();
        } catch {
            mostrarAlerta('Erro ao cancelar venda.', 'error');
        }
    }
}

let gerenciadorVendas;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof VendaAPI === 'undefined' || typeof ClienteAPI === 'undefined') {
        alert('Erro: api.js não carregou VendaAPI ou ClienteAPI.');
        return;
    }
    gerenciadorVendas = new GerenciadorVendas();
    window.gerenciadorVendas = gerenciadorVendas;
});
