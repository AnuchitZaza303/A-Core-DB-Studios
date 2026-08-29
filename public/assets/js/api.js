/**
 * API Client Module
 */
import { Toast } from './utils/toast.js';

class ApiClient {
    constructor() {
        this.baseUrl = window.APP_CONFIG?.apiPrefix || '/api';
        this.loadingBar = document.getElementById('global-loading-bar');
        this.activeRequests = 0;
    }

    startLoading() {
        this.activeRequests++;
        if (this.loadingBar) {
            this.loadingBar.classList.remove('-translate-y-full');
        }
    }

    stopLoading() {
        this.activeRequests = Math.max(0, this.activeRequests - 1);
        if (this.activeRequests === 0 && this.loadingBar) {
            this.loadingBar.classList.add('-translate-y-full');
        }
    }

    async request(endpoint, options = {}) {
        if (!options.silent) {
            this.startLoading();
        }
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

        const token = localStorage.getItem('acore_session_token');
        const headers = {
            'X-Requested-With': 'XMLHttpRequest',
            ...(token ? { 'X-Acore-Token': token } : {}),
            ...(options.headers || {})
        };

        if (!(options.body instanceof FormData) && options.body && typeof options.body === 'object') {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, {
                ...options,
                credentials: 'same-origin',
                headers
            });

            const data = await response.json().catch(() => null);

            // Persist session token if provided by backend
            if (data?.data?.token) {
                localStorage.setItem('acore_session_token', data.data.token);
            }

            if (!response.ok) {
                const errorMsg = data?.message || `Request failed with status ${response.status}`;
                if (response.status === 401) {
                    window.dispatchEvent(new CustomEvent('auth:required'));
                }
                throw new Error(errorMsg);
            }

            return data;
        } catch (error) {
            console.error('[API Error]:', error);
            throw error;
        } finally {
            if (!options.silent) {
                this.stopLoading();
            }
        }
    }

    get(endpoint, params = {}, options = {}) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, val]) => {
            if (val !== null && val !== undefined && val !== '') {
                searchParams.append(key, val);
            }
        });
        const qs = searchParams.toString();
        const url = qs ? `${endpoint}?${qs}` : endpoint;
        return this.request(url, { method: 'GET', ...options });
    }

    post(endpoint, body = {}, options = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body,
            ...options
        });
    }

    put(endpoint, body = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body
        });
    }

    delete(endpoint, params = {}) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, val]) => {
            if (val !== null && val !== undefined && val !== '') {
                searchParams.append(key, val);
            }
        });
        const qs = searchParams.toString();
        const url = qs ? `${endpoint}?${qs}` : endpoint;
        return this.request(url, { method: 'DELETE' });
    }

    upload(endpoint, formData) {
        return this.request(endpoint, {
            method: 'POST',
            body: formData,
            headers: {} // Let browser set Content-Type with multipart boundary
        });
    }
}

window.__ACORE_API__ = window.__ACORE_API__ || new ApiClient();
export const api = window.__ACORE_API__;
