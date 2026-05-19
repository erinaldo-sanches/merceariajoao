/**
 * CLASSE GerenciadorProdutos
 * Controla todas as operações da tela de produtos
 */
class GerenciadorProdutos {
    /**
     * CONSTRUTOR
     */
    constructor() {
        this.produtos = [];
        this.produtoEditando = null;
        this.inicializar();
    }
    
    /**
     * MÉTODO inicializar
     */
    async inicializar() {
        this.cacheElementos();
        this.configurarEventos();
        const apiOk = await this.verificarConexaoAPI();
        if (apiOk) {
            await this.carregarProdutos();
        } else {
            this.exibirTabelaOffline();
        }
        const editarId = new URLSearchParams(window.location.search).get('editar');
        if (editarId) {
            await this.editarProduto(editarId);
        }
        console.log('✅ Aplicação inicializada com sucesso!');
    }
    
    /**
     * MÉTODO cacheElementos
     */
    cacheElementos() {
        this.elementos = {
            // Botões principais
            btnNovo: document.getElementById('btnNovoProduto'),
            btnRecarregar: document.getElementById('btnRecarregar'),
            btnBuscar: document.getElementById('btnBuscar'),
            btnLimparBusca: document.getElementById('btnLimparBusca'),
            
            // Formulários e inputs
            inputBusca: document.getElementById('inputBusca'),
            formProduto: document.getElementById('formProduto'),
            
            // Modal
            modal: document.getElementById('modalProduto'),
            modalTitulo: document.getElementById('modalTitulo'),
            btnFecharModal: document.getElementById('btnFecharModal'),
            btnCancelar: document.getElementById('btnCancelar'),
            
            // Campos do formulário
            produtoId: document.getElementById('produtoId'),
            inputNome: document.getElementById('nome'),
            inputDescricao: document.getElementById('descricao'),
            inputPreco: document.getElementById('preco'),
            inputEstoque: document.getElementById('estoque'),
            
            // Tabela
            tabelaBody: document.getElementById('tabelaProdutos'),
            
            // Elementos de status
            apiStatus: document.getElementById('api-status'),
            totalProdutos: document.getElementById('totalProdutos'),
            estoqueBaixo: document.getElementById('estoqueBaixo'),
            valorTotal: document.getElementById('valorTotal')
        };
    }
    
    /**
     * MÉTODO configurarEventos
     */
    configurarEventos() {
        // Botão Novo Produto
        this.elementos.btnNovo.addEventListener('click', () => {
            this.abrirModal();
        });
        
        // Botão Recarregar
        this.elementos.btnRecarregar.addEventListener('click', () => {
            this.carregarProdutos();
        });
        
        // Botão Buscar
        this.elementos.btnBuscar.addEventListener('click', () => {
            this.buscarProdutos();
        });
        
        // Botão Limpar Busca
        this.elementos.btnLimparBusca.addEventListener('click', () => {
            this.elementos.inputBusca.value = '';
            this.carregarProdutos();
        });
        
        // Busca com Enter
        this.elementos.inputBusca.addEventListener('keypress', (evento) => {
            if (evento.key === 'Enter') {
                this.buscarProdutos();
            }
        });
        
        // Formulário de produto
        this.elementos.formProduto.addEventListener('submit', (evento) => {
            evento.preventDefault();
            this.salvarProduto();
        });
        
        // Fechar modal
        this.elementos.btnFecharModal.addEventListener('click', () => {
            this.fecharModal();
        });
        
        // Cancelar no modal
        this.elementos.btnCancelar.addEventListener('click', () => {
            this.fecharModal();
        });
        
        // Fechar modal clicando fora
        this.elementos.modal.addEventListener('click', (evento) => {
            if (evento.target === this.elementos.modal) {
                this.fecharModal();
            }
        });
    }
    
    /**
     * MÉTODO verificarConexaoAPI
     */
    async verificarConexaoAPI() {
        const el = this.elementos.apiStatus;
        const online = await verificarApiOnline();
        if (el) {
            el.textContent = online ? '● API Online' : '● API Offline';
            el.className = online ? 'status-online' : 'status-offline';
        }
        if (!online) {
            mostrarAlerta(
                `Backend não responde em ${typeof urlApiExibicao === 'function' ? urlApiExibicao() : window.location.origin}. Inicie: uvicorn main:app --reload --port 8000 e acesse http://127.0.0.1:8000`,
                'warning',
                8000
            );
        }
        return online;
    }

    exibirTabelaOffline() {
        if (!this.elementos.tabelaBody) return;
        this.elementos.tabelaBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    ⚠️ API offline — execute na pasta <strong>projeto_api</strong>:
                    <code>uvicorn main:app --reload --port 8000</code>
                </td>
            </tr>
        `;
    }
    
    /**
     * MÉTODO carregarProdutos
     */
    async carregarProdutos() {
        try {
            // Mostra estado de carregamento
            this.elementos.tabelaBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <i class="fas fa-spinner fa-spin"></i> Carregando produtos...
                    </td>
                </tr>
            `;
            
            // Mostra loading no botão recarregar
            const btnOriginal = this.elementos.btnRecarregar.innerHTML;
            this.elementos.btnRecarregar.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            this.elementos.btnRecarregar.disabled = true;
            
            // Requisição à API
            const resposta = await ProdutoAPI.listar();
            this.produtos = resposta.data || [];
            
            // Restaura botão
            this.elementos.btnRecarregar.innerHTML = btnOriginal;
            this.elementos.btnRecarregar.disabled = false;
            
            // Atualiza interface
            this.atualizarTabela();
            this.atualizarEstatisticas();
            
            // Feedback
            if (this.produtos.length > 0) {
                mostrarAlerta(
                    `${this.produtos.length} produtos carregados com sucesso!`,
                    'success'
                );
            }
            
        } catch (erro) {
            console.error('Erro ao carregar produtos:', erro);
            
            // Restaura botão em caso de erro
            this.elementos.btnRecarregar.innerHTML = '<i class="fas fa-sync-alt"></i> Recarregar';
            this.elementos.btnRecarregar.disabled = false;
            
            if (erro.response && erro.response.status === 404) {
                this.produtos = [];
                this.atualizarTabela();
                mostrarAlerta('Nenhum produto cadastrado no sistema.', 'info');
            } else if (!erro.response) {
                mostrarAlerta(
                    'Não foi possível conectar ao servidor. Verifique sua conexão.',
                    'error'
                );
            } else {
                mostrarAlerta('Erro ao carregar produtos do servidor.', 'error');
            }
        }
    }
    
    /**
     * MÉTODO buscarProdutos
     */
    async buscarProdutos() {
        const termoBusca = this.elementos.inputBusca.value.trim();
        
        if (!termoBusca) {
            return this.carregarProdutos();
        }
        
        try {
            const resposta = await ProdutoAPI.buscarPorNome(termoBusca);
            this.produtos = resposta.data || [];
            
            this.atualizarTabela();
            this.atualizarEstatisticas();
            
            mostrarAlerta(
                `Encontrados ${this.produtos.length} produtos para "${termoBusca}"`,
                'success'
            );
            
        } catch (erro) {
            if (erro.response && erro.response.status === 404) {
                this.produtos = [];
                this.atualizarTabela();
                mostrarAlerta(
                    `Nenhum produto encontrado para "${termoBusca}"`,
                    'info'
                );
            } else {
                mostrarAlerta('Erro ao buscar produtos.', 'error');
            }
        }
    }
    
    /**
     * MÉTODO atualizarTabela
     * ATENÇÃO: Agora usamos preco_venda em vez de preco
     */
    atualizarTabela() {
        if (!this.produtos.length) {
            this.elementos.tabelaBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div style="padding: 40px;">
                            <i class="fas fa-box-open fa-3x" style="color: #999; margin-bottom: 15px;"></i>
                            <h4 style="color: #666;">Nenhum produto encontrado</h4>
                            <p style="color: #999;">Use o botão "Novo Produto" para começar</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Cria HTML para cada linha da tabela
        const linhasHTML = this.produtos.map(produto => {
            // CORREÇÃO: Backend envia preco_venda, não preco
            const preco = Number(produto.preco_venda) || 0;
            const estoque = Number(produto.qtd_estoque) || 0;
            const classeEstoque = getClasseEstoque(estoque);
            
            // Status (ativo/inativo)
            const estaAtivo = produto.ativo !== false;
            const badgeStatus = estaAtivo 
                ? '<span style="background: #D4EDDA; color: #2E933C; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Ativo</span>'
                : '<span style="background: #F8D7DA; color: #D64933; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Inativo</span>';
            
            // Linha da tabela
            return `
                <tr>
                    <td>${produto.id}</td>
                    <td>
                        <strong>${produto.nome}</strong>
                        ${produto.descricao ? `<br><small style="color: #666;">${produto.descricao}</small>` : ''}
                    </td>
                    <td><strong>${formatarPreco(preco)}</strong></td>
                    <td class="${classeEstoque}">
                        ${estoque} unidades
                    </td>
                    <td>${badgeStatus}</td>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            <button type="button" onclick="gerenciadorProdutos.editarProduto(${produto.id})" 
                                    class="btn btn-pequeno">✏️ Editar</button>
                            <button type="button" onclick="gerenciadorProdutos.excluirProduto(${produto.id})" 
                                    class="btn btn-pequeno btn-perigo">🗑️ Excluir</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Insere na tabela
        this.elementos.tabelaBody.innerHTML = linhasHTML;
    }
    
    /**
     * MÉTODO atualizarEstatisticas
     * CORREÇÃO: Usar preco_venda em vez de preco
     */
    atualizarEstatisticas() {
        // Total de produtos
        const total = this.produtos.length;
        this.elementos.totalProdutos.textContent = total;
        
        // Produtos com estoque baixo (≤ 10)
        const estoqueBaixo = this.produtos.filter(produto => {
            const estoque = Number(produto.qtd_estoque) || 0;
            return estoque <= 10;
        }).length;
        
        this.elementos.estoqueBaixo.textContent = estoqueBaixo;
        
        // Valor total em estoque (CORREÇÃO: usar preco_venda)
        const valorTotalEstoque = this.produtos.reduce((total, produto) => {
            const preco = Number(produto.preco_venda) || 0;
            const estoque = Number(produto.qtd_estoque) || 0;
            return total + (preco * estoque);
        }, 0);
        
        this.elementos.valorTotal.textContent = formatarPreco(valorTotalEstoque);
    }
    
    /**
     * MÉTODO abrirModal
     * CORREÇÃO: Preencher com preco_venda em vez de preco
     */
    abrirModal(produto = null) {
        // Limpa formulário
        this.limparFormulario();
        
        if (produto) {
            // Modo edição
            this.elementos.modalTitulo.textContent = 'Editar Produto';
            this.produtoEditando = produto;
            
            // Preenche campos - CORREÇÃO: usar preco_venda
            this.elementos.produtoId.value = produto.id;
            this.elementos.inputNome.value = produto.nome;
            this.elementos.inputDescricao.value = produto.descricao || '';
            this.elementos.inputPreco.value = Number(produto.preco_venda) || 0;
            this.elementos.inputEstoque.value = Number(produto.qtd_estoque) || 0;
        } else {
            // Modo criação
            this.elementos.modalTitulo.textContent = 'Novo Produto';
            this.produtoEditando = null;
        }
        
        // Mostra modal
        this.elementos.modal.style.display = 'flex';
        
        // Foco no primeiro campo
        setTimeout(() => {
            this.elementos.inputNome.focus();
        }, 100);
    }
    
    /**
     * MÉTODO fecharModal
     */
    fecharModal() {
        this.elementos.modal.style.display = 'none';
        this.limparFormulario();
        this.produtoEditando = null;
    }
    
    /**
     * MÉTODO limparFormulario
     */
    limparFormulario() {
        this.elementos.formProduto.reset();
        this.elementos.produtoId.value = '';
        this.elementos.inputEstoque.value = 0;
    }
    
    /**
     * MÉTODO editarProduto
     */
    async editarProduto(id) {
        try {
            const resposta = await ProdutoAPI.buscarPorId(id);
            const produto = resposta.data;
            this.abrirModal(produto);
            
        } catch (erro) {
            console.error('Erro ao carregar produto:', erro);
            mostrarAlerta('Erro ao carregar produto para edição.', 'error');
        }
    }
    
    /**
     * MÉTODO excluirProduto
     */
    async excluirProduto(id) {
        const produto = this.produtos.find(p => p.id === id);
        if (!produto) return;
        
        if (!confirm(`Tem certeza que deseja excluir o produto "${produto.nome}"?\n\nEsta ação não pode ser desfeita.`)) {
            return;
        }
        
        try {
            await ProdutoAPI.excluir(id);
            mostrarAlerta(`Produto "${produto.nome}" excluído com sucesso!`, 'success');
            await this.carregarProdutos();
            
        } catch (erro) {
            console.error('Erro ao excluir produto:', erro);
            
            if (erro.response?.status === 404) {
                mostrarAlerta('Produto não encontrado no servidor.', 'error');
            } else if (erro.response?.status === 500) {
                mostrarAlerta('Erro interno no servidor ao excluir produto.', 'error');
            } else {
                mostrarAlerta('Erro ao excluir produto.', 'error');
            }
        }
    }
    
    /**
     * MÉTODO salvarProduto
     * CORREÇÃO CRÍTICA: Enviar preco_venda e qtd_estoque (não preco e estoque)
     */
    async salvarProduto() {
        // Validação básica
        if (!this.elementos.inputNome.value.trim()) {
            mostrarAlerta('O nome do produto é obrigatório.', 'error');
            this.elementos.inputNome.focus();
            return;
        }
        
        // Converte valores do formulário
        const preco = parseFloat(this.elementos.inputPreco.value) || 0;
        const estoque = parseInt(this.elementos.inputEstoque.value) || 0;
        
        // Validações numéricas
        if (preco <= 0) {
            mostrarAlerta('O preço deve ser maior que zero.', 'error');
            this.elementos.inputPreco.focus();
            return;
        }
        
        if (estoque < 0) {
            mostrarAlerta('O estoque não pode ser negativo.', 'error');
            this.elementos.inputEstoque.focus();
            return;
        }
        
        // Validação de casas decimais (máximo 2)
        if (!/^\d+(\.\d{1,2})?$/.test(preco.toString())) {
            mostrarAlerta('O preço deve ter no máximo 2 casas decimais.', 'error');
            this.elementos.inputPreco.focus();
            return;
        }
        
        // CORREÇÃO: Dados no formato que o backend espera
        const dadosProduto = {
            nome: this.elementos.inputNome.value.trim(),
            descricao: this.elementos.inputDescricao.value.trim() || null,
            preco_venda: preco,        // NOME CORRIGIDO: preco_venda
            qtd_estoque: estoque       // NOME CORRIGIDO: qtd_estoque
        };
        
        // Remove descricao se estiver vazia
        if (!dadosProduto.descricao) {
            delete dadosProduto.descricao;
        }
        
        try {
            const id = this.elementos.produtoId.value;
            let resposta;
            
            // Mostra loading no botão salvar
            const btnSalvar = this.elementos.formProduto.querySelector('button[type="submit"]');
            const btnOriginal = btnSalvar.innerHTML;
            btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            btnSalvar.disabled = true;
            
            if (id) {
                // Atualizar produto existente
                resposta = await ProdutoAPI.atualizar(id, dadosProduto);
                mostrarAlerta('Produto atualizado com sucesso!', 'success');
            } else {
                // Criar novo produto
                resposta = await ProdutoAPI.criar(dadosProduto);
                mostrarAlerta('Produto criado com sucesso!', 'success');
            }
            
            // Restaura botão
            btnSalvar.innerHTML = btnOriginal;
            btnSalvar.disabled = false;
            
            // Fecha modal e recarrega lista
            this.fecharModal();
            await this.carregarProdutos();
            
        } catch (erro) {
            console.error('Erro ao salvar produto:', erro);
            
            // Restaura botão em caso de erro
            const btnSalvar = this.elementos.formProduto.querySelector('button[type="submit"]');
            btnSalvar.innerHTML = '<i class="fas fa-save"></i> Salvar Produto';
            btnSalvar.disabled = false;
            
            // Tratamento de erros específicos
            if (erro.response?.status === 422) {
                // Erro de validação do Pydantic
                const detalhes = erro.response.data.detail;
                if (Array.isArray(detalhes)) {
                    const mensagens = detalhes.map(e => {
                        const campo = e.loc?.[1] || 'campo';
                        return `${campo}: ${e.msg}`;
                    }).join(', ');
                    mostrarAlerta(`Erro de validação: ${mensagens}`, 'error');
                } else {
                    mostrarAlerta(`Erro de validação: ${detalhes}`, 'error');
                }
            } else if (erro.response?.status === 400) {
                mostrarAlerta(`Erro: ${erro.response.data.detail || 'Dados inválidos'}`, 'error');
            } else if (erro.response?.status === 409) {
                mostrarAlerta('Já existe um produto com este nome.', 'error');
            } else if (!erro.response) {
                mostrarAlerta('Não foi possível conectar ao servidor.', 'error');
            } else {
                mostrarAlerta('Erro ao salvar produto.', 'error');
            }
        }
    }
}

// ===== INICIALIZAÇÃO =====
let gerenciadorProdutos;

document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM carregado - Iniciando aplicação...');
    
    // VERIFICAÇÃO DE SEGURANÇA: Funções necessárias existem?
    const funcoesNecessarias = ['ProdutoAPI', 'formatarPreco', 'getClasseEstoque', 'mostrarAlerta'];
    const funcoesFaltando = funcoesNecessarias.filter(fn => typeof window[fn] === 'undefined');
    
    if (funcoesFaltando.length > 0) {
        console.error('Funções não carregadas:', funcoesFaltando);
        alert(`Erro: As seguintes funções não foram carregadas: ${funcoesFaltando.join(', ')}\nVerifique se api.js está sendo carregado antes de produtos.js.`);
        return;
    }
    
    // Cria instância do gerenciador
    gerenciadorProdutos = new GerenciadorProdutos();
    
    // Disponibiliza globalmente
    window.gerenciadorProdutos = gerenciadorProdutos;
    
    console.log('🚀 Aplicação pronta!');
    
    // Funções de debug (útil para desenvolvimento)
    window.debugProdutos = {
        recarregar: () => gerenciadorProdutos.carregarProdutos(),
        verProdutos: () => {
            console.log('📦 Produtos carregados:', gerenciadorProdutos.produtos.length);
            gerenciadorProdutos.produtos.forEach((p, i) => {
                console.log(`  ${i + 1}. ${p.nome} - Preço: ${p.preco_venda} (tipo: ${typeof p.preco_venda}) - 
                    Estoque: ${p.qtd_estoque} (tipo: ${typeof p.qtd_estoque})`);
            });
        },
        testarAPI: async () => {
            console.log('🧪 Testando conexão com API...');
            try {
                const health = await ProdutoAPI.health();
                console.log('Health check:', health.data);
                
                const produtos = await ProdutoAPI.listar();
                console.log('Lista de produtos:', produtos.data?.length || 0);
                
                return true;
            } catch (erro) {
                console.error('Erro no teste:', erro.message);
                return false;
            }
        },
        criarProdutoTeste: async () => {
            const produtoTeste = {
                nome: `Produto Teste ${Date.now()}`,
                preco_venda: 19.90,
                qtd_estoque: 50
            };
            
            try {
                const resposta = await ProdutoAPI.criar(produtoTeste);
                console.log('✅ Produto teste criado:', resposta.data);
                gerenciadorProdutos.carregarProdutos();
            } catch (erro) {
                console.error('Erro ao criar produto teste:', erro.response?.data || erro.message);
            }
        }
    };
});

// Export para módulos (se necessário)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GerenciadorProdutos };
}