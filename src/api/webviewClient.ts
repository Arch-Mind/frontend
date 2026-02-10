import {
    ArchitectureInsightsResponse,
    CommunicationResponse,
    ContributionsResponse,
    DependenciesResponse,
    ModuleBoundariesResponse,
} from './types';

interface WebviewApiClientConfig {
    graphEngineUrl: string;
    timeout: number;
}

/**
 * ArchMindWebviewApiClient
 * ------------------------
 * Client for interacting with the ArchMind Graph Engine API from the webview.
 * Provides methods for fetching graph data, dependencies, and insights.
 */
export class ArchMindWebviewApiClient {
    private config: WebviewApiClientConfig;
    private abortController: AbortController | null = null;

    /**
     * @param graphEngineUrl - Base URL for the Graph Engine API
     * @param timeout - Request timeout in milliseconds
     */
    constructor(graphEngineUrl: string = 'http://localhost:8000', timeout: number = 30000) {
        this.config = { graphEngineUrl, timeout };
    }

    /**
     * Performs a generic HTTP request to the Graph Engine
     * @param endpoint - API endpoint path
     * @param options - Fetch options
     */
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        this.abortController = new AbortController();
        const timeoutId = setTimeout(() => this.abortController?.abort(), this.config.timeout);

        const url = `${this.config.graphEngineUrl}${endpoint}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> || {}),
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
                } catch {
                    // Keep default error message
                }
                throw new Error(errorMessage);
            }

            return await response.json() as T;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Request timed out');
            }
            throw error instanceof Error ? error : new Error('Unknown error occurred');
        }
    }

    public async getModuleBoundaries(repoId: string): Promise<ModuleBoundariesResponse> {
        return this.request<ModuleBoundariesResponse>(
            `/api/graph/${encodeURIComponent(repoId)}/boundaries`
        );
    }

    public async getDependencies(repoId: string): Promise<DependenciesResponse> {
        return this.request<DependenciesResponse>(
            `/api/graph/${encodeURIComponent(repoId)}/dependencies`
        );
    }

    public async getCommunication(repoId: string): Promise<CommunicationResponse> {
        return this.request<CommunicationResponse>(
            `/api/graph/${encodeURIComponent(repoId)}/communication`
        );
    }

    public async getContributions(repoId: string): Promise<ContributionsResponse> {
        return this.request<ContributionsResponse>(
            `/api/graph/${encodeURIComponent(repoId)}/contributions`
        );
    }

    public async getArchitectureInsights(repoId: string): Promise<ArchitectureInsightsResponse> {
        return this.request<ArchitectureInsightsResponse>(
            `/api/analyze/${encodeURIComponent(repoId)}/architecture`
        );
    }
}
