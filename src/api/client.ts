import * as vscode from 'vscode';
import {
    ApiClientConfig,
    AnalyzeRequest,
    AnalyzeResponse,
    AnalysisJob,
    JobsListResponse,
    RepositoriesResponse,
    Neo4jGraphResponse,
    MetricsResponse,
    ImpactAnalysisResponse,
    PageRankResponse,
    HealthCheckResponse,
    GraphEngineHealthResponse,
    TransformedGraphData,
    TransformedNode,
    TransformedEdge,
    ModuleBoundariesResponse,
} from './types';

/**
 * HTTP client for ArchMind Backend API communication.
 * Uses native Node.js fetch (available in Node 18+) for HTTP requests.
 */
export class ArchMindApiClient {
    private config: ApiClientConfig;
    private abortController: AbortController | null = null;

    constructor() {
        this.config = this.loadConfig();
    }

    /**
     * Load configuration from VS Code settings
     */
    private loadConfig(): ApiClientConfig {
        const config = vscode.workspace.getConfiguration('archmind');
        return {
            gatewayUrl: config.get<string>('backendUrl', 'http://localhost:8080'),
            graphEngineUrl: config.get<string>('graphEngineUrl', 'http://localhost:8000'),
            authToken: config.get<string>('authToken', ''),
            timeout: config.get<number>('requestTimeout', 30000),
        };
    }

    /**
     * Refresh configuration (call when settings change)
     */
    public refreshConfig(): void {
        this.config = this.loadConfig();
    }

    /**
     * Get current configuration
     */
    public getConfig(): ApiClientConfig {
        return { ...this.config };
    }

    /**
     * Cancel any ongoing requests
     */
    public cancelRequests(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    /**
     * Generic HTTP request method
     */
    private async request<T>(
        baseUrl: string,
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        this.abortController = new AbortController();
        const timeoutId = setTimeout(() => this.abortController?.abort(), this.config.timeout);

        const url = `${baseUrl}${endpoint}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> || {}),
        };

        // Add auth token if available
        if (this.config.authToken) {
            headers['Authorization'] = `Bearer ${this.config.authToken}`;
        }

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
                    // Use default error message
                }
                throw new ApiRequestError(errorMessage, response.status, endpoint);
            }

            return await response.json() as T;
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error instanceof ApiRequestError) {
                throw error;
            }
            
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new ApiRequestError('Request timed out', 408, endpoint);
                }
                throw new ApiRequestError(
                    `Network error: ${error.message}`,
                    0,
                    endpoint
                );
            }
            
            throw new ApiRequestError('Unknown error occurred', 0, endpoint);
        }
    }

    // =========================================================================
    // API Gateway Endpoints (Port 8080)
    // =========================================================================

    /**
     * Check API Gateway health
     */
    public async checkGatewayHealth(): Promise<HealthCheckResponse> {
        return this.request<HealthCheckResponse>(
            this.config.gatewayUrl,
            '/health'
        );
    }

    /**
     * Trigger repository analysis
     * POST /api/v1/analyze
     */
    public async triggerAnalysis(request: AnalyzeRequest): Promise<AnalyzeResponse> {
        return this.request<AnalyzeResponse>(
            this.config.gatewayUrl,
            '/api/v1/analyze',
            {
                method: 'POST',
                body: JSON.stringify(request),
            }
        );
    }

    /**
     * Get job status
     * GET /api/v1/jobs/:id
     */
    public async getJobStatus(jobId: string): Promise<AnalysisJob> {
        return this.request<AnalysisJob>(
            this.config.gatewayUrl,
            `/api/v1/jobs/${jobId}`
        );
    }

    /**
     * List all jobs
     * GET /api/v1/jobs
     */
    public async listJobs(): Promise<JobsListResponse> {
        return this.request<JobsListResponse>(
            this.config.gatewayUrl,
            '/api/v1/jobs'
        );
    }

    /**
     * List repositories
     * GET /api/v1/repositories
     */
    public async listRepositories(): Promise<RepositoriesResponse> {
        return this.request<RepositoriesResponse>(
            this.config.gatewayUrl,
            '/api/v1/repositories'
        );
    }

    // =========================================================================
    // Graph Engine Endpoints (Port 8000)
    // =========================================================================

    /**
     * Check Graph Engine health
     */
    public async checkGraphEngineHealth(): Promise<GraphEngineHealthResponse> {
        return this.request<GraphEngineHealthResponse>(
            this.config.graphEngineUrl,
            '/health'
        );
    }

    /**
     * Get dependency graph for a repository
     * GET /api/graph/:repo_id
     */
    public async getDependencyGraph(repoId: string, limit: number = 100): Promise<Neo4jGraphResponse> {
        return this.request<Neo4jGraphResponse>(
            this.config.graphEngineUrl,
            `/api/graph/${encodeURIComponent(repoId)}?limit=${limit}`
        );
    }

    /**
     * Get repository metrics
     * GET /api/metrics/:repo_id
     */
    public async getRepositoryMetrics(repoId: string): Promise<MetricsResponse> {
        return this.request<MetricsResponse>(
            this.config.graphEngineUrl,
            `/api/metrics/${encodeURIComponent(repoId)}`
        );
    }

    /**
     * Get impact analysis for a node
     * GET /api/impact/:node_id
     */
    public async getImpactAnalysis(nodeId: string, depth: number = 3): Promise<ImpactAnalysisResponse> {
        return this.request<ImpactAnalysisResponse>(
            this.config.graphEngineUrl,
            `/api/impact/${encodeURIComponent(nodeId)}?depth=${depth}`
        );
    }

    /**
     * Calculate PageRank for repository nodes
     * GET /api/pagerank/:repo_id
     */
    public async getPageRank(repoId: string): Promise<PageRankResponse> {
        return this.request<PageRankResponse>(
            this.config.graphEngineUrl,
            `/api/pagerank/${encodeURIComponent(repoId)}`
        );
    }

    /**
     * Get module boundaries
     * GET /api/graph/:repo_id/boundaries
     */
    public async getModuleBoundaries(repoId: string): Promise<ModuleBoundariesResponse> {
        return this.request<ModuleBoundariesResponse>(
            this.config.graphEngineUrl,
            `/api/graph/${encodeURIComponent(repoId)}/boundaries`
        );
    }

    // =========================================================================
    // High-level Operations
    // =========================================================================

    /**
     * Poll job status until completion or failure
     * @param jobId - The job ID to poll
     * @param onProgress - Optional callback for progress updates
     * @param pollInterval - Polling interval in ms (default: 2000)
     * @param maxAttempts - Maximum polling attempts (default: 60 = 2 minutes)
     */
    public async pollJobUntilComplete(
        jobId: string,
        onProgress?: (job: AnalysisJob) => void,
        pollInterval: number = 2000,
        maxAttempts: number = 60
    ): Promise<AnalysisJob> {
        let attempts = 0;

        while (attempts < maxAttempts) {
            const job = await this.getJobStatus(jobId);
            
            if (onProgress) {
                onProgress(job);
            }

            if (job.status === 'COMPLETED') {
                return job;
            }

            if (job.status === 'FAILED') {
                throw new ApiRequestError(
                    job.error_message || 'Analysis job failed',
                    500,
                    `/api/v1/jobs/${jobId}`
                );
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            attempts++;
        }

        throw new ApiRequestError(
            'Analysis job timed out after maximum polling attempts',
            408,
            `/api/v1/jobs/${jobId}`
        );
    }

    /**
     * Analyze repository and fetch graph data
     * Complete workflow: trigger analysis -> poll status -> fetch graph
     */
    public async analyzeAndFetchGraph(
        repoUrl: string,
        branch: string = 'main',
        onProgress?: (status: string, job?: AnalysisJob) => void
    ): Promise<TransformedGraphData> {
        // Step 1: Trigger analysis
        onProgress?.('Triggering analysis...');
        const analyzeResponse = await this.triggerAnalysis({
            repo_url: repoUrl,
            branch,
        });

        const jobId = analyzeResponse.job_id;
        
        // Step 2: Poll for completion
        const completedJob = await this.pollJobUntilComplete(
            jobId,
            (job) => onProgress?.(`Job status: ${job.status}`, job)
        );

        // Step 3: Use job_id as repo_id for Graph Engine queries
        // The Ingestion Worker stores data with job_id as the identifier
        const repoId = jobId;

        // Step 4: Fetch graph and metrics
        onProgress?.('Fetching graph data...');
        const [graphData, metrics] = await Promise.all([
            this.getDependencyGraph(repoId, 500),
            this.getRepositoryMetrics(repoId).catch(() => null),
        ]);

        // Step 5: Transform to extension format
        // Use jobId as repoId so refreshes work correctly
        return this.transformGraphData(graphData, metrics, jobId);
    }

    /**
     * Fetch existing graph data without triggering new analysis
     */
    public async fetchExistingGraph(repoId: string): Promise<TransformedGraphData> {
        const [graphData, metrics] = await Promise.all([
            this.getDependencyGraph(repoId, 500),
            this.getRepositoryMetrics(repoId).catch(() => null),
        ]);

        return this.transformGraphData(graphData, metrics, repoId);
    }

    /**
     * Extract repository ID from URL
     * Example: https://github.com/owner/repo.git -> owner/repo
     */
    private extractRepoId(repoUrl: string): string {
        const match = repoUrl.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/);
        if (match) {
            return match[1];
        }
        // Fallback: use the full URL as ID
        return repoUrl;
    }

    /**
     * Transform Neo4j graph data to extension format
     * Fixes Issue #9: Normalizes node IDs, resolves edge references, calculates proper depth
     */
    private transformGraphData(
        graphData: Neo4jGraphResponse,
        metrics: MetricsResponse | null,
        repoId: string
    ): TransformedGraphData {
        // Map node types from Neo4j to extension types
        const typeMapping: Record<string, TransformedNode['type']> = {
            'File': 'file',
            'Directory': 'directory',
            'Function': 'function',
            'Class': 'class',
            'Module': 'module',
        };

        // Map edge types from Neo4j to extension types
        const edgeTypeMapping: Record<string, TransformedEdge['type']> = {
            'CONTAINS': 'contains',
            'IMPORTS': 'imports',
            'CALLS': 'calls',
            'INHERITS': 'inherits',
            'DEFINES': 'contains',
        };

        // Depth mapping by node type for proper layout
        const depthByType: Record<string, number> = {
            'Module': 0,
            'File': 1,
            'Class': 2,
            'Function': 3,
        };

        // FIX 1: Build ID mapping to handle inconsistent node IDs from backend
        // Maps various ID formats (full paths, function names) to normalized IDs
        const idMapping = new Map<string, string>();
        const nameToIdMap = new Map<string, string[]>(); // Multiple nodes can have same name
        
        // First pass: normalize IDs and build mappings
        graphData.nodes.forEach(node => {
            const props = node.properties || {};
            const filePath = String(props['file_path'] || props['path'] || props['file'] || '');
            const name = String(props['name'] || node.label || '');
            
            // Normalize ID to relative path (remove temp directories)
            const normalizedId = this.normalizeNodeId(node.id, filePath, name, node.type);
            
            // Store original -> normalized mapping
            idMapping.set(node.id, normalizedId);
            
            // Store name -> ID mapping for edge resolution
            if (name) {
                const existing = nameToIdMap.get(name) || [];
                existing.push(normalizedId);
                nameToIdMap.set(name, existing);
            }
        });

        // FIX 2: Transform nodes with normalized IDs and calculated depth
        const nodes: TransformedNode[] = graphData.nodes.map((node, index) => {
            const props = node.properties || {};
            const nodeType = typeMapping[node.type] || 'module';
            
            // FIX 3: Calculate depth properly based on node type hierarchy
            let depth = depthByType[node.type];
            if (depth === undefined) {
                // Fallback: try from properties, or use type-based default
                depth = Number(props['depth']) || this.getDefaultDepth(nodeType);
            }
            
            // Get normalized ID
            const normalizedId = idMapping.get(node.id) || node.id;
            
            // Normalize parent ID if present
            let parentId: string | undefined = String(props['parent_id'] || '');
            if (parentId && idMapping.has(parentId)) {
                parentId = idMapping.get(parentId)!;
            } else if (!parentId) {
                parentId = undefined;
            }
            
            return {
                id: normalizedId,
                label: node.label || String(props['name']) || normalizedId,
                type: nodeType,
                parentId: parentId,
                extension: String(props['extension']) || undefined,
                language: String(props['language']) || this.inferLanguage(String(props['extension'])),
                depth: depth,
                filePath: String(props['file_path']) || String(props['path']) || String(props['file']) || undefined,
                lineNumber: Number(props['start_line']) || Number(props['line_number']) || undefined,
                endLineNumber: Number(props['end_line']) || Number(props['end_line_number']) || undefined,
                properties: props,
            };
        });

        // FIX 4: Transform edges with ID resolution
        const edges: TransformedEdge[] = graphData.edges
            .map((edge, index) => {
                // Resolve source and target using ID mapping
                let source = idMapping.get(edge.source) || edge.source;
                let target = idMapping.get(edge.target) || edge.target;
                
                // If source/target not found, try name-based lookup
                if (!idMapping.has(edge.source)) {
                    const matches = nameToIdMap.get(edge.source);
                    if (matches && matches.length > 0) {
                        source = matches[0]; // Use first match
                    }
                }
                
                if (!idMapping.has(edge.target)) {
                    const matches = nameToIdMap.get(edge.target);
                    if (matches && matches.length > 0) {
                        target = matches[0]; // Use first match
                    }
                }
                
                return {
                    id: `e-${source}-${target}-${index}`,
                    source: source,
                    target: target,
                    type: edgeTypeMapping[edge.type] || 'imports',
                };
            })
            // Filter out edges where source or target doesn't exist in nodes
            .filter(edge => {
                const hasSource = nodes.some(n => n.id === edge.source);
                const hasTarget = nodes.some(n => n.id === edge.target);
                return hasSource && hasTarget;
            });

        // Build stats from metrics or calculate from nodes
        const stats = {
            totalFiles: metrics?.total_files || nodes.filter(n => n.type === 'file').length,
            totalDirectories: nodes.filter(n => n.type === 'directory').length,
            totalFunctions: metrics?.total_functions || nodes.filter(n => n.type === 'function').length,
            totalClasses: metrics?.total_classes || nodes.filter(n => n.type === 'class').length,
            filesByLanguage: this.countFilesByLanguage(nodes),
        };

        return {
            nodes,
            edges,
            stats,
            source: 'backend',
            repoId,
        };
    }

    /**
     * Normalize node ID to relative path format
     * Removes temp directory prefixes and standardizes format
     */
    private normalizeNodeId(id: string, filePath: string, name: string, type: string): string {
        // For function/class nodes, prefer name-based ID
        if (type === 'Function' || type === 'Class') {
            if (name && filePath) {
                return `${filePath}::${name}`;
            }
            return name || id;
        }
        
        // For file nodes, extract relative path
        if (type === 'File' && filePath) {
            // Remove temp directories like /tmp/archmind-xxx/
            const normalized = filePath
                .replace(/^\/tmp\/[^/]+\//, '')
                .replace(/^C:\\Users\\[^\\]+\\AppData\\Local\\Temp\\[^\\]+\\/, '')
                .replace(/\\/g, '/'); // Normalize path separators
            return normalized;
        }
        
        // For directory/module nodes
        if (filePath) {
            return filePath
                .replace(/^\/tmp\/[^/]+\//, '')
                .replace(/^C:\\Users\\[^\\]+\\AppData\\Local\\Temp\\[^\\]+\\/, '')
                .replace(/\\/g, '/');
        }
        
        // Fallback: use ID as-is
        return id;
    }

    /**
     * Get default depth based on node type
     */
    private getDefaultDepth(type: TransformedNode['type']): number {
        const defaults: Record<TransformedNode['type'], number> = {
            'module': 0,
            'directory': 0,
            'file': 1,
            'class': 2,
            'function': 3,
        };
        return defaults[type] || 1;
    }

    /**
     * Infer programming language from file extension
     */
    private inferLanguage(extension?: string): string | undefined {
        if (!extension) return undefined;
        
        const languageMap: Record<string, string> = {
            'ts': 'typescript',
            'tsx': 'typescript',
            'js': 'javascript',
            'jsx': 'javascript',
            'py': 'python',
            'rs': 'rust',
            'go': 'go',
            'java': 'java',
            'json': 'json',
            'md': 'markdown',
            'css': 'css',
            'scss': 'css',
            'html': 'html',
        };

        return languageMap[extension.toLowerCase()];
    }

    /**
     * Count files by programming language
     */
    private countFilesByLanguage(nodes: TransformedNode[]): Record<string, number> {
        const counts: Record<string, number> = {};
        
        for (const node of nodes) {
            if (node.type === 'file' && node.language) {
                counts[node.language] = (counts[node.language] || 0) + 1;
            }
        }

        return counts;
    }
}

/**
 * Custom error class for API request errors
 */
export class ApiRequestError extends Error {
    public readonly statusCode: number;
    public readonly endpoint: string;

    constructor(message: string, statusCode: number, endpoint: string) {
        super(message);
        this.name = 'ApiRequestError';
        this.statusCode = statusCode;
        this.endpoint = endpoint;
    }

    /**
     * Check if this is a network connectivity error
     */
    public isNetworkError(): boolean {
        return this.statusCode === 0;
    }

    /**
     * Check if this is a timeout error
     */
    public isTimeoutError(): boolean {
        return this.statusCode === 408;
    }

    /**
     * Check if this is a server error
     */
    public isServerError(): boolean {
        return this.statusCode >= 500;
    }

    /**
     * Check if this is a client error
     */
    public isClientError(): boolean {
        return this.statusCode >= 400 && this.statusCode < 500;
    }

    /**
     * Get user-friendly error message
     */
    public getUserMessage(): string {
        if (this.isNetworkError()) {
            return 'Unable to connect to ArchMind backend. Please check if the server is running.';
        }
        if (this.isTimeoutError()) {
            return 'Request timed out. The server might be busy or the operation took too long.';
        }
        if (this.statusCode === 404) {
            return 'Resource not found. The repository might not have been analyzed yet.';
        }
        if (this.statusCode === 401) {
            return 'Authentication required. Please configure your auth token in settings.';
        }
        if (this.statusCode === 403) {
            return 'Access denied. You may not have permission to access this resource.';
        }
        if (this.isServerError()) {
            return 'Server error occurred. Please try again later.';
        }
        return this.message;
    }
}

/**
 * WebSocket job update message types
 */
export interface JobUpdate {
    type: 'progress' | 'status' | 'graph_update' | 'error';
    job_id?: string;
    repo_id?: string;
    status?: string;
    progress?: number;
    message?: string;
    error?: string;
    changed_nodes?: string[];
    changed_edges?: string[];
    result_summary?: Record<string, any>;
    timestamp: string;
}

/**
 * WebSocket client for real-time updates
 */
export class ArchMindWebSocketClient {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000; // Start with 1 second
    private reconnectTimer: NodeJS.Timeout | null = null;
    private listeners: Map<string, Set<(update: JobUpdate) => void>> = new Map();
    private globalListeners: Set<(update: JobUpdate) => void> = new Set();
    private isIntentionallyClosed = false;
    private url: string;
    private type: 'job' | 'repo';
    private id: string;

    constructor(type: 'job' | 'repo', id: string, gatewayUrl: string = 'http://localhost:8080') {
        this.type = type;
        this.id = id;
        
        // Convert http(s) to ws(s)
        const wsProtocol = gatewayUrl.startsWith('https') ? 'wss' : 'ws';
        const baseUrl = gatewayUrl.replace(/^https?:\/\//, '');
        this.url = `${wsProtocol}://${baseUrl}/ws/${type}/${id}`;
    }

    /**
     * Connect to WebSocket server
     */
    public connect(): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return; // Already connected
        }

        this.isIntentionallyClosed = false;

        try {
            console.log(`🔌 Connecting to WebSocket: ${this.url}`);
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log(`✅ WebSocket connected (${this.type}: ${this.id})`);
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;
            };

            this.ws.onmessage = (event) => {
                try {
                    const update: JobUpdate = JSON.parse(event.data);
                    this.handleUpdate(update);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('⚠️  WebSocket error:', error);
            };

            this.ws.onclose = (event) => {
                console.log(`🔌 WebSocket closed (${this.type}: ${this.id})`);
                this.ws = null;

                if (!this.isIntentionallyClosed) {
                    this.scheduleReconnect();
                }
            };
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Schedule reconnection attempt with exponential backoff
     */
    private scheduleReconnect(): void {
        if (this.isIntentionallyClosed || this.reconnectAttempts >= this.maxReconnectAttempts) {
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('❌ Max reconnection attempts reached');
            }
            return;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, delay);
    }

    /**
     * Handle incoming update
     */
    private handleUpdate(update: JobUpdate): void {
        // Notify specific listeners
        const specificKey = update.job_id || update.repo_id;
        if (specificKey) {
            const specificListeners = this.listeners.get(specificKey);
            if (specificListeners) {
                specificListeners.forEach(listener => {
                    try {
                        listener(update);
                    } catch (error) {
                        console.error('Error in WebSocket listener:', error);
                    }
                });
            }
        }

        // Notify global listeners
        this.globalListeners.forEach(listener => {
            try {
                listener(update);
            } catch (error) {
                console.error('Error in global WebSocket listener:', error);
            }
        });
    }

    /**
     * Subscribe to updates for a specific job or repo
     */
    public subscribe(id: string, callback: (update: JobUpdate) => void): () => void {
        if (!this.listeners.has(id)) {
            this.listeners.set(id, new Set());
        }
        this.listeners.get(id)!.add(callback);

        // Return unsubscribe function
        return () => {
            const listeners = this.listeners.get(id);
            if (listeners) {
                listeners.delete(callback);
                if (listeners.size === 0) {
                    this.listeners.delete(id);
                }
            }
        };
    }

    /**
     * Subscribe to all updates
     */
    public subscribeAll(callback: (update: JobUpdate) => void): () => void {
        this.globalListeners.add(callback);

        // Return unsubscribe function
        return () => {
            this.globalListeners.delete(callback);
        };
    }

    /**
     * Disconnect WebSocket
     */
    public disconnect(): void {
        this.isIntentionallyClosed = true;
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.listeners.clear();
        this.globalListeners.clear();
        console.log(`🔌 WebSocket disconnected (${this.type}: ${this.id})`);
    }

    /**
     * Get connection status
     */
    public isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}

// Export singleton instance
let apiClientInstance: ArchMindApiClient | null = null;

export function getApiClient(): ArchMindApiClient {
    if (!apiClientInstance) {
        apiClientInstance = new ArchMindApiClient();
    }
    return apiClientInstance;
}

export function resetApiClient(): void {
    if (apiClientInstance) {
        apiClientInstance.cancelRequests();
    }
    apiClientInstance = null;
}
