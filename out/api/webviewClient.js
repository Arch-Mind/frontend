"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchMindWebviewApiClient = void 0;
/**
 * ArchMindWebviewApiClient
 * ------------------------
 * Client for interacting with the ArchMind Graph Engine API from the webview.
 * Provides methods for fetching graph data, dependencies, and insights.
 */
class ArchMindWebviewApiClient {
    /**
     * @param graphEngineUrl - Base URL for the Graph Engine API
     * @param timeout - Request timeout in milliseconds
     */
    constructor(graphEngineUrl = 'https://graph-engine-production-90f5.up.railway.app', timeout = 30000) {
        this.abortController = null;
        this.config = { graphEngineUrl, timeout };
    }
    /**
     * Performs a generic HTTP request to the Graph Engine
     * @param endpoint - API endpoint path
     * @param options - Fetch options
     */
    async request(endpoint, options = {}) {
        this.abortController = new AbortController();
        const timeoutId = setTimeout(() => this.abortController?.abort(), this.config.timeout);
        const url = `${this.config.graphEngineUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        };
        try {
            const response = await fetch(url, {
                ...options,
                headers,
                signal: this.abortController.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorBody = await response.text();
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                try {
                    const errorJson = JSON.parse(errorBody);
                    errorMessage = errorJson.message || errorJson.error || errorMessage;
                }
                catch {
                    // Keep default error message
                }
                throw new Error(errorMessage);
            }
            return await response.json();
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Request timed out');
            }
            throw error instanceof Error ? error : new Error('Unknown error occurred');
        }
    }
    async getModuleBoundaries(repoId) {
        return this.request(`/api/graph/${encodeURIComponent(repoId)}/boundaries`);
    }
    async getDependencies(repoId) {
        return this.request(`/api/graph/${encodeURIComponent(repoId)}/dependencies`);
    }
    async getCommunication(repoId) {
        return this.request(`/api/graph/${encodeURIComponent(repoId)}/communication`);
    }
    async getContributions(repoId) {
        return this.request(`/api/graph/${encodeURIComponent(repoId)}/contributions`);
    }
    async getArchitectureInsights(repoId) {
        return this.request(`/api/analyze/${encodeURIComponent(repoId)}/architecture`);
    }
}
exports.ArchMindWebviewApiClient = ArchMindWebviewApiClient;
//# sourceMappingURL=webviewClient.js.map