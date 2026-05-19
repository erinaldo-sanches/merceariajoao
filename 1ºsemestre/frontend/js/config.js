/**
 * Configuração da URL da API.
 * Use ?api=http://127.0.0.1:8000 na URL ou localStorage 'mercearia_api_url' para alterar.
 */
(function () {
    const PADRAO = 'http://127.0.0.1:8000';
    const params = new URLSearchParams(window.location.search);
    const daUrl = params.get('api');
    const salvo = localStorage.getItem('mercearia_api_url');

    const url = (daUrl || salvo || PADRAO).replace(/\/$/, '');
    window.API_BASE_URL = url;

    window.definirUrlApi = function (novaUrl) {
        window.API_BASE_URL = String(novaUrl).replace(/\/$/, '');
        localStorage.setItem('mercearia_api_url', window.API_BASE_URL);
    };
})();
