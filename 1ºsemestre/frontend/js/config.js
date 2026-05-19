/**
 * URL base da API (mesma origem — sem CORS).
 * Padrão: string vazia → requisições relativas (/health, /produtos, …).
 * Para outro host: ?api=http://host:porta ou localStorage 'mercearia_api_base'.
 */
(function () {
    const PADRAO = '';
    const STORAGE_KEY = 'mercearia_api_base';
    const params = new URLSearchParams(window.location.search);
    const daUrl = params.get('api');
    const salvo = localStorage.getItem(STORAGE_KEY);

    let url = PADRAO;
    if (daUrl !== null) {
        url = daUrl;
    } else if (salvo !== null) {
        url = salvo;
    }

    window.API_BASE_URL = String(url).replace(/\/$/, '');

    window.definirUrlApi = function (novaUrl) {
        window.API_BASE_URL = String(novaUrl).replace(/\/$/, '');
        localStorage.setItem(STORAGE_KEY, window.API_BASE_URL);
    };
})();
