import { ModuleBoundariesResponse } from './types';

interface WebviewApiClientConfig {
    graphEngineUrl: string;
    timeout: number;
}

export class ArchMindWebviewApiClient {
    private config: WebviewApiClientConfig;
    private abortController: AbortController | null = null;

    constructor(graphEngineUrl: string = 'http://localhost:8000', timeout: number = 30000) {
        this.config = { graphEngineUrl, timeout };
    }

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
}
