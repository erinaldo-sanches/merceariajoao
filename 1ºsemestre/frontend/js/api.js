// Configuração base da API (definida em config.js) — vazio = mesma origem, sem CORS
const API_BASE_URL = typeof window.API_BASE_URL === 'string' ? window.API_BASE_URL : '';
const API_TIMEOUT = 10000;

function urlApiExibicao() {
    return API_BASE_URL || window.location.origin || 'servidor';
}

let apiOnlineCache = null;
let apiVerificacaoEmAndamento = null;

axios.defaults.timeout = API_TIMEOUT;
axios.defaults.headers.common['Content-Type'] = 'application/json';

function isErroRede(erro) {
    return !erro.response && (
        erro.code === 'ERR_NETWORK' ||
        erro.message === 'Network Error' ||
        erro.message?.includes('Network Error')
    );
}

function logErroApi(contexto, erro) {
    if (isErroRede(erro)) {
        console.warn(`[API] ${contexto}: servidor indisponível em ${urlApiExibicao()}`);
        return;
    }
    console.error(`[API] ${contexto}:`, erro);
}

/**
 * Verifica se a API está acessível (com cache curto).
 * @param {boolean} forcar - Ignora cache e testa de novo
 */
async function verificarApiOnline(forcar = false) {
    if (!forcar && apiOnlineCache !== null) {
        return apiOnlineCache;
    }
    if (!forcar && apiVerificacaoEmAndamento) {
        return apiVerificacaoEmAndamento;
    }

    apiVerificacaoEmAndamento = (async () => {
        try {
            await axios.get(`${API_BASE_URL}/health`, { timeout: 4000 });
            apiOnlineCache = true;
        } catch {
            apiOnlineCache = false;
        }
        apiVerificacaoEmAndamento = null;
        return apiOnlineCache;
    })();

    return apiVerificacaoEmAndamento;
}

function marcarApiOffline() {
    apiOnlineCache = false;
}

/**
 * Transforma dados do frontend para formato do backend
 * @param {Object} dadosFrontend - Dados no formato do frontend
 * @returns {Object} Dados no formato do backend
 */
function transformarProdutoParaBackend(dadosFrontend) {
    if (!dadosFrontend) return {};

    return {
        nome: dadosFrontend.nome || '',
        preco: Number(dadosFrontend.preco ?? dadosFrontend.preco_venda ?? 0),
        quantidade: Number(dadosFrontend.estoque ?? dadosFrontend.qtd_estoque ?? 0)
    };
}

function transformarProdutoParaFrontend(dadosBackend) {
    if (!dadosBackend) return {};

    const preco = Number(dadosBackend.preco ?? dadosBackend.preco_venda ?? 0);
    const estoque = Number(dadosBackend.quantidade ?? dadosBackend.qtd_estoque ?? 0);

    return {
        id: dadosBackend.id,
        nome: dadosBackend.nome || '',
        preco,
        preco_venda: preco,
        estoque,
        qtd_estoque: estoque,
        data_cadastro: dadosBackend.data_cadastro
    };
}

function transformarClienteParaFrontend(dadosBackend) {
    if (!dadosBackend) return {};
    return {
        id: dadosBackend.id,
        nome: dadosBackend.nome || '',
        telefone: dadosBackend.telefone || '',
        email: dadosBackend.email || '',
        endereco: dadosBackend.endereco || '',
        data_cadastro: dadosBackend.data_cadastro
    };
}

function transformarClienteParaBackend(dadosFrontend) {
    return {
        nome: dadosFrontend.nome?.trim() || '',
        telefone: dadosFrontend.telefone?.trim() || null,
        email: dadosFrontend.email?.trim() || null,
        endereco: dadosFrontend.endereco?.trim() || null
    };
}

/**
 * Formata um valor numérico para moeda brasileira (R$)
 * @param {number|string} valor - Valor a ser formatado
 * @returns {string} Valor formatado como moeda
 */
function formatarPreco(valor) {
    if (valor === null || valor === undefined || valor === '') {
        return 'R$ 0,00';
    }
    
    // Converte para número
    const numero = typeof valor === 'string' ? 
        parseFloat(valor.replace(',', '.')) : 
        Number(valor);
    
    // Verifica se é um número válido
    if (isNaN(numero) || !isFinite(numero)) {
        console.warn('Valor inválido para formatação:', valor);
        return 'R$ 0,00';
    }
    
    // Formata como moeda brasileira
    return numero.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Determina a classe CSS baseada na quantidade em estoque
 * @param {number|string} quantidade - Quantidade em estoque
 * @returns {string} Classe CSS correspondente
 */
function getClasseEstoque(quantidade) {
    const qtd = typeof quantidade === 'string' ? 
        parseInt(quantidade, 10) : 
        Number(quantidade) || 0;
    
    if (qtd <= 10) return 'estoque-baixo';
    if (qtd <= 30) return 'estoque-medio';
    return 'estoque-bom';
}

/**
 * Formata a data para exibição amigável
 * @param {string|Date} dataString - Data no formato ISO ou objeto Date
 * @returns {string} Data formatada
 */
function formatarData(dataString) {
    if (!dataString) return '';
    
    try {
        const data = new Date(dataString);
        if (isNaN(data.getTime())) return '';
        
        return data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (erro) {
        console.warn('Erro ao formatar data:', dataString, erro);
        return String(dataString).substring(0, 16).replace('T', ' ');
    }
}

/**
 * Valida dados de produto antes de enviar para API
 * @param {Object} produto - Dados do produto
 * @returns {Object} Resultado da validação {valido: boolean, erros: string[]}
 */
function validarProduto(produto) {
    const erros = [];
    
    // Validação de nome
    if (!produto.nome || produto.nome.trim().length === 0) {
        erros.push('Nome do produto é obrigatório');
    } else if (produto.nome.length > 100) {
        erros.push('Nome deve ter no máximo 100 caracteres');
    }
    
    // Validação de preço
    const preco = produto.preco_venda || produto.preco || 0;
    if (preco <= 0) {
        erros.push('Preço deve ser maior que zero');
    }
    
    // Validação de casas decimais do preço
    if (preco.toString().includes('.')) {
        const partes = preco.toString().split('.');
        if (partes[1].length > 2) {
            erros.push('Preço deve ter no máximo 2 casas decimais');
        }
    }
    
    // Validação de estoque
    const estoque = produto.qtd_estoque || produto.estoque || 0;
    if (estoque < 0) {
        erros.push('Estoque não pode ser negativo');
    }
    
    return {
        valido: erros.length === 0,
        erros: erros
    };
}

/**
 * Exibe um alerta temporário na interface
 * @param {string} mensagem - Mensagem a ser exibida
 * @param {string} tipo - Tipo do alerta (success, error, warning, info)
 * @param {number} tempo - Tempo em milissegundos para o alerta desaparecer (0 = permanente)
 * @returns {HTMLElement} Elemento do alerta criado
 */
function mostrarAlerta(mensagem, tipo = 'info', tempo = 4000) {
    // Tipos de alerta suportados
    const tipos = {
        success: { cor: '#2E933C', icone: 'check-circle', nome: 'Sucesso' },
        error: { cor: '#D64933', icone: 'exclamation-circle', nome: 'Erro' },
        warning: { cor: '#F0C808', icone: 'exclamation-triangle', nome: 'Aviso' },
        info: { cor: '#FF6B35', icone: 'info-circle', nome: 'Informação' }
    };
    
    const config = tipos[tipo] || tipos.info;
    
    // Cria elemento do alerta
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo}`;
    alerta.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        max-width: 500px;
        animation: slideIn 0.3s ease;
    `;
    
    alerta.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 12px;">
            <i class="fas fa-${config.icone}" style="color: ${config.cor}; font-size: 1.2rem; margin-top: 2px;"></i>
            <div style="flex: 1;">
                <div style="font-weight: 600; color: ${config.cor}; margin-bottom: 4px;">
                    ${config.nome}
                </div>
                <div style="color: #2D2D2D;">
                    ${mensagem}
                </div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: none; border: none; color: #666; cursor: pointer; font-size: 1.2rem;">
                &times;
            </button>
        </div>
    `;
    
    // Adiciona ao DOM
    document.body.appendChild(alerta);
    
    // Remove após o tempo especificado
    if (tempo > 0) {
        setTimeout(() => {
            if (alerta.parentElement) {
                alerta.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (alerta.parentElement) {
                        alerta.remove();
                    }
                }, 300);
            }
        }, tempo);
    }
    
    return alerta;
}

/**
 * Módulo de API para produtos
 */
const ProdutoAPI = {
    /**
     * Lista todos os produtos
     * @param {number} skip - Quantidade de registros a pular
     * @param {number} limit - Quantidade máxima de registros
     * @returns {Promise} Promise com a resposta da API
     */
    listar: async (skip = 0, limit = 100) => {
        try {
            const resposta = await axios.get(`${API_BASE_URL}/produtos`, {
                params: { skip, limit }
            });
            
            // Transforma dados do backend para frontend
            if (resposta.data && Array.isArray(resposta.data)) {
                resposta.data = resposta.data.map(transformarProdutoParaFrontend);
            }
            
            return resposta;
        } catch (erro) {
            if (isErroRede(erro)) marcarApiOffline();
            logErroApi('listar produtos', erro);
            throw erro;
        }
    },
    
    /**
     * Cria um novo produto
     * @param {Object} produto - Dados do produto
     * @returns {Promise} Promise com a resposta da API
     */
    criar: async (produto) => {
        try {
            // Valida dados antes de enviar
            const validacao = validarProduto(produto);
            if (!validacao.valido) {
                throw {
                    response: {
                        status: 400,
                        data: { detail: validacao.erros.join(', ') }
                    }
                };
            }
            
            // Transforma dados para formato do backend
            const dadosBackend = transformarProdutoParaBackend(produto);
            
            const resposta = await axios.post(`${API_BASE_URL}/produtos`, dadosBackend);
            
            // Transforma resposta para frontend
            if (resposta.data) {
                resposta.data = transformarProdutoParaFrontend(resposta.data);
            }
            
            return resposta;
        } catch (erro) {
            console.error('Erro ao criar produto:', erro);
            throw erro;
        }
    },
    
    /**
     * Busca produto por ID
     * @param {number} id - ID do produto
     * @returns {Promise} Promise com a resposta da API
     */
    buscarPorId: async (id) => {
        try {
            if (!id || isNaN(Number(id))) {
                throw {
                    response: {
                        status: 400,
                        data: { detail: 'ID do produto inválido' }
                    }
                };
            }
            
            const resposta = await axios.get(`${API_BASE_URL}/produtos/${id}`);
            
            // Transforma resposta para frontend
            if (resposta.data) {
                resposta.data = transformarProdutoParaFrontend(resposta.data);
            }
            
            return resposta;
        } catch (erro) {
            console.error(`Erro ao buscar produto ID ${id}:`, erro);
            throw erro;
        }
    },
    
    /**
     * Atualiza um produto existente
     * @param {number} id - ID do produto
     * @param {Object} produto - Dados atualizados do produto
     * @returns {Promise} Promise com a resposta da API
     */
    atualizar: async (id, produto) => {
        try {
            if (!id || isNaN(Number(id))) {
                throw {
                    response: {
                        status: 400,
                        data: { detail: 'ID do produto inválido' }
                    }
                };
            }
            
            // Valida dados antes de enviar
            const validacao = validarProduto(produto);
            if (!validacao.valido) {
                throw {
                    response: {
                        status: 400,
                        data: { detail: validacao.erros.join(', ') }
                    }
                };
            }
            
            // Transforma dados para formato do backend
            const dadosBackend = transformarProdutoParaBackend(produto);
            
            const resposta = await axios.put(`${API_BASE_URL}/produtos/${id}`, dadosBackend);
            
            // Transforma resposta para frontend
            if (resposta.data) {
                resposta.data = transformarProdutoParaFrontend(resposta.data);
            }
            
            return resposta;
        } catch (erro) {
            console.error(`Erro ao atualizar produto ID ${id}:`, erro);
            throw erro;
        }
    },
    
    /**
     * Exclui um produto
     * @param {number} id - ID do produto
     * @returns {Promise} Promise com a resposta da API
     */
    excluir: async (id) => {
        try {
            if (!id || isNaN(Number(id))) {
                throw {
                    response: {
                        status: 400,
                        data: { detail: 'ID do produto inválido' }
                    }
                };
            }
            
            const resposta = await axios.delete(`${API_BASE_URL}/produtos/${id}`);
            return resposta;
        } catch (erro) {
            console.error(`Erro ao excluir produto ID ${id}:`, erro);
            throw erro;
        }
    },
    
    /**
     * Busca produtos por nome (busca parcial)
     * @param {string} nome - Termo de busca
     * @returns {Promise} Promise com a resposta da API
     */
    buscarPorNome: async (nome) => {
        try {
            if (!nome || nome.trim().length === 0) {
                return { data: [] };
            }
            
            const resposta = await axios.get(`${API_BASE_URL}/produtos/busca/${encodeURIComponent(nome)}`);
            
            // Transforma dados do backend para frontend
            if (resposta.data && Array.isArray(resposta.data)) {
                resposta.data = resposta.data.map(transformarProdutoParaFrontend);
            }
            
            return resposta;
        } catch (erro) {
            console.error(`Erro ao buscar produtos por nome "${nome}":`, erro);
            throw erro;
        }
    },
    
    /**
     * Verifica status da API
     * @returns {Promise} Promise com a resposta da API
     */
    health: async () => {
        try {
            const resposta = await axios.get(`${API_BASE_URL}/health`, {
                timeout: 5000 // Timeout mais curto para health check
            });
            return resposta;
        } catch (erro) {
            if (isErroRede(erro)) marcarApiOffline();
            logErroApi('health check', erro);
            throw erro;
        }
    },

    testarConexao: async () => verificarApiOnline(true)
};

// Adiciona animação CSS para os alertas (se não existir)
if (!document.querySelector('#alert-animations')) {
    const style = document.createElement('style');
    style.id = 'alert-animations';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .alert-success {
            background-color: rgba(46, 147, 60, 0.1) !important;
            border-left: 5px solid #2E933C !important;
            color: #2E933C !important;
        }
        
        .alert-error {
            background-color: rgba(214, 73, 51, 0.1) !important;
            border-left: 5px solid #D64933 !important;
            color: #D64933 !important;
        }
        
        .alert-warning {
            background-color: rgba(240, 200, 8, 0.1) !important;
            border-left: 5px solid #F0C808 !important;
            color: #B38F00 !important;
        }
        
        .alert-info {
            background-color: rgba(255, 107, 53, 0.1) !important;
            border-left: 5px solid #FF6B35 !important;
            color: #FF6B35 !important;
        }
    `;
    document.head.appendChild(style);
}

// Exporta funções e objetos para o escopo global
window.ProdutoAPI = ProdutoAPI;
window.formatarPreco = formatarPreco;
window.getClasseEstoque = getClasseEstoque;
window.mostrarAlerta = mostrarAlerta;
window.formatarData = formatarData;
window.validarProduto = validarProduto;
window.API_BASE_URL = API_BASE_URL;
window.urlApiExibicao = urlApiExibicao;
window.verificarApiOnline = verificarApiOnline;
window.isErroRede = isErroRede;
window.transformarProdutoParaBackend = transformarProdutoParaBackend;
window.transformarProdutoParaFrontend = transformarProdutoParaFrontend;

const ClienteAPI = {
    listar: async (skip = 0, limit = 100) => {
        const resposta = await axios.get(`${API_BASE_URL}/clientes`, { params: { skip, limit } });
        if (Array.isArray(resposta.data)) {
            resposta.data = resposta.data.map(transformarClienteParaFrontend);
        }
        return resposta;
    },
    criar: async (cliente) => {
        const resposta = await axios.post(`${API_BASE_URL}/clientes`, transformarClienteParaBackend(cliente));
        resposta.data = transformarClienteParaFrontend(resposta.data);
        return resposta;
    },
    buscarPorId: async (id) => {
        const resposta = await axios.get(`${API_BASE_URL}/clientes/${id}`);
        resposta.data = transformarClienteParaFrontend(resposta.data);
        return resposta;
    },
    atualizar: async (id, cliente) => {
        const resposta = await axios.put(`${API_BASE_URL}/clientes/${id}`, transformarClienteParaBackend(cliente));
        resposta.data = transformarClienteParaFrontend(resposta.data);
        return resposta;
    },
    excluir: async (id) => axios.delete(`${API_BASE_URL}/clientes/${id}`),
    buscarPorNome: async (nome) => {
        if (!nome?.trim()) return { data: [] };
        const resposta = await axios.get(`${API_BASE_URL}/clientes/busca/${encodeURIComponent(nome)}`);
        if (Array.isArray(resposta.data)) {
            resposta.data = resposta.data.map(transformarClienteParaFrontend);
        }
        return resposta;
    }
};

const VendaAPI = {
    listar: async (skip = 0, limit = 100) => {
        return axios.get(`${API_BASE_URL}/vendas`, { params: { skip, limit } });
    },
    criar: async (venda) => {
        return axios.post(`${API_BASE_URL}/vendas`, {
            cliente_id: Number(venda.cliente_id),
            produto_id: Number(venda.produto_id),
            quantidade: Number(venda.quantidade)
        });
    },
    buscarPorId: async (id) => axios.get(`${API_BASE_URL}/vendas/${id}`),
    excluir: async (id) => axios.delete(`${API_BASE_URL}/vendas/${id}`),
    vendasHoje: async () => axios.get(`${API_BASE_URL}/vendas/hoje`)
};

window.ClienteAPI = ClienteAPI;
window.VendaAPI = VendaAPI;

console.log('✅ API.JS carregado');
console.log(`🔗 API: ${API_BASE_URL || '(mesma origem)'}`);

if (window.location.protocol === 'file:') {
    console.warn(
        '⚠️ Não abra o HTML como file://. Inicie o FastAPI e acesse http://127.0.0.1:8000 (frontend servido pela API).'
    );
}