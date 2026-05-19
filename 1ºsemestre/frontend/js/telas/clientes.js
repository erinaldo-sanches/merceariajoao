class GerenciadorClientes {
    constructor() {
        this.clientes = [];
        this.inicializar();
    }

    async inicializar() {
        this.cacheElementos();
        this.configurarEventos();
        const apiOk = await this.verificarConexaoAPI();
        if (!apiOk) {
            this.exibirTabelaOffline();
            return;
        }
        await this.carregarClientes();

        const params = new URLSearchParams(window.location.search);
        if (params.get('novo') === '1') {
            this.abrirModal();
        }
    }

    cacheElementos() {
        this.elementos = {
            btnNovo: document.getElementById('btnNovoCliente'),
            btnRecarregar: document.getElementById('btnRecarregar'),
            btnBuscar: document.getElementById('btnBuscar'),
            btnLimparBusca: document.getElementById('btnLimparBusca'),
            inputBusca: document.getElementById('inputBusca'),
            formCliente: document.getElementById('formCliente'),
            modal: document.getElementById('modalCliente'),
            modalTitulo: document.getElementById('modalTitulo'),
            btnFecharModal: document.getElementById('btnFecharModal'),
            btnCancelar: document.getElementById('btnCancelar'),
            clienteId: document.getElementById('clienteId'),
            inputNome: document.getElementById('nome'),
            inputTelefone: document.getElementById('telefone'),
            inputEmail: document.getElementById('email'),
            inputEndereco: document.getElementById('endereco'),
            tabelaBody: document.getElementById('tabelaClientes'),
            apiStatus: document.getElementById('api-status'),
            totalClientes: document.getElementById('totalClientes')
        };
    }

    configurarEventos() {
        this.elementos.btnNovo.addEventListener('click', () => this.abrirModal());
        this.elementos.btnRecarregar.addEventListener('click', () => this.carregarClientes());
        this.elementos.btnBuscar.addEventListener('click', () => this.buscarClientes());
        this.elementos.btnLimparBusca.addEventListener('click', () => {
            this.elementos.inputBusca.value = '';
            this.carregarClientes();
        });
        this.elementos.inputBusca.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.buscarClientes();
        });
        this.elementos.formCliente.addEventListener('submit', (e) => {
            e.preventDefault();
            this.salvarCliente();
        });
        this.elementos.btnFecharModal.addEventListener('click', () => this.fecharModal());
        this.elementos.btnCancelar.addEventListener('click', () => this.fecharModal());
        this.elementos.modal.addEventListener('click', (e) => {
            if (e.target === this.elementos.modal) this.fecharModal();
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
                `Backend não responde em ${typeof urlApiExibicao === 'function' ? urlApiExibicao() : window.location.origin}. Inicie o FastAPI e acesse http://127.0.0.1:8000`,
                'warning',
                8000
            );
        }
        return online;
    }

    exibirTabelaOffline() {
        if (!this.elementos.tabelaBody) return;
        this.elementos.tabelaBody.innerHTML = `
            <tr><td colspan="6" class="centralizado mensagem-tabela">
                ⚠️ API offline — inicie: <code>uvicorn main:app --reload --port 8000</code>
            </td></tr>
        `;
    }

    async carregarClientes() {
        try {
            this.elementos.tabelaBody.innerHTML = `
                <tr><td colspan="6" class="centralizado mensagem-tabela">⏳ Carregando...</td></tr>
            `;
            const resposta = await ClienteAPI.listar();
            this.clientes = resposta.data || [];
            this.atualizarTabela();
            this.elementos.totalClientes.textContent = this.clientes.length;
        } catch (erro) {
            console.error('Erro ao carregar clientes:', erro);
            this.elementos.tabelaBody.innerHTML = `
                <tr><td colspan="6" class="centralizado mensagem-tabela">❌ Erro ao carregar clientes</td></tr>
            `;
            mostrarAlerta('Erro ao carregar clientes.', 'error');
        }
    }

    async buscarClientes() {
        const termo = this.elementos.inputBusca.value.trim();
        if (!termo) return this.carregarClientes();

        try {
            const resposta = await ClienteAPI.buscarPorNome(termo);
            this.clientes = resposta.data || [];
            this.atualizarTabela();
            mostrarAlerta(`${this.clientes.length} cliente(s) encontrado(s).`, 'success');
        } catch {
            mostrarAlerta('Erro ao buscar clientes.', 'error');
        }
    }

    atualizarTabela() {
        if (!this.clientes.length) {
            this.elementos.tabelaBody.innerHTML = `
                <tr><td colspan="6" class="centralizado mensagem-tabela">
                    Nenhum cliente cadastrado. Clique em "Novo Cliente".
                </td></tr>
            `;
            return;
        }

        this.elementos.tabelaBody.innerHTML = this.clientes.map((c) => `
            <tr>
                <td>${c.id}</td>
                <td><strong>${c.nome}</strong></td>
                <td>${c.telefone || '—'}</td>
                <td>${c.email || '—'}</td>
                <td>${formatarData(c.data_cadastro)}</td>
                <td>
                    <button type="button" class="btn btn-pequeno" onclick="gerenciadorClientes.editarCliente(${c.id})">✏️ Editar</button>
                    <button type="button" class="btn btn-pequeno btn-perigo" onclick="gerenciadorClientes.excluirCliente(${c.id})">🗑️ Excluir</button>
                </td>
            </tr>
        `).join('');
    }

    abrirModal(cliente = null) {
        this.elementos.formCliente.reset();
        this.elementos.clienteId.value = '';

        if (cliente) {
            this.elementos.modalTitulo.textContent = '✏️ Editar Cliente';
            this.elementos.clienteId.value = cliente.id;
            this.elementos.inputNome.value = cliente.nome;
            this.elementos.inputTelefone.value = cliente.telefone || '';
            this.elementos.inputEmail.value = cliente.email || '';
            this.elementos.inputEndereco.value = cliente.endereco || '';
        } else {
            this.elementos.modalTitulo.textContent = '👤 Novo Cliente';
        }

        this.elementos.modal.style.display = 'flex';
        this.elementos.inputNome.focus();
    }

    fecharModal() {
        this.elementos.modal.style.display = 'none';
        this.elementos.formCliente.reset();
    }

    async editarCliente(id) {
        try {
            const resposta = await ClienteAPI.buscarPorId(id);
            this.abrirModal(resposta.data);
        } catch {
            mostrarAlerta('Erro ao carregar cliente.', 'error');
        }
    }

    async excluirCliente(id) {
        const cliente = this.clientes.find((c) => c.id === id);
        if (!cliente) return;
        if (!confirm(`Excluir o cliente "${cliente.nome}"?`)) return;

        try {
            await ClienteAPI.excluir(id);
            mostrarAlerta('Cliente excluído com sucesso!', 'success');
            await this.carregarClientes();
        } catch (erro) {
            const msg = erro.response?.data?.detail || 'Erro ao excluir cliente.';
            mostrarAlerta(typeof msg === 'string' ? msg : 'Erro ao excluir cliente.', 'error');
        }
    }

    async salvarCliente() {
        const dados = {
            nome: this.elementos.inputNome.value.trim(),
            telefone: this.elementos.inputTelefone.value.trim(),
            email: this.elementos.inputEmail.value.trim(),
            endereco: this.elementos.inputEndereco.value.trim()
        };

        if (!dados.nome) {
            mostrarAlerta('O nome é obrigatório.', 'error');
            return;
        }

        try {
            const id = this.elementos.clienteId.value;
            if (id) {
                await ClienteAPI.atualizar(id, dados);
                mostrarAlerta('Cliente atualizado!', 'success');
            } else {
                await ClienteAPI.criar(dados);
                mostrarAlerta('Cliente cadastrado!', 'success');
            }
            this.fecharModal();
            await this.carregarClientes();
        } catch (erro) {
            const detalhe = erro.response?.data?.detail;
            mostrarAlerta(detalhe || 'Erro ao salvar cliente.', 'error');
        }
    }
}

let gerenciadorClientes;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof ClienteAPI === 'undefined') {
        alert('Erro: api.js não carregou ClienteAPI.');
        return;
    }
    gerenciadorClientes = new GerenciadorClientes();
    window.gerenciadorClientes = gerenciadorClientes;
});
