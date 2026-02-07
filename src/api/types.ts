/**
 * ArchMind Backend API Types
 * These types mirror the backend API response structures
 */

// =============================================================================
// API Gateway Types (Go Backend - Port 8080)
// =============================================================================

/**
 * Health check response from API Gateway
 */
export interface HealthCheckResponse {
    status: string;
    services: {
        redis: string;
        postgres: string;
    };
    timestamp: string;
}

/**
 * Request to trigger repository analysis
 */
export interface AnalyzeRequest {
    repo_url: string;
    branch?: string;
    options?: Record<string, string>;
}

/**
 * Response after creating an analysis job
 */
export interface AnalyzeResponse {
    job_id: string;
    status: JobStatus;
    message: string;
    created_at: string;
}

/**
 * Job status values
 */
export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/**
 * Analysis job details
 */
export interface AnalysisJob {
    job_id: string;
    repo_url: string;
    branch: string;
    status: JobStatus;
    options?: Record<string, string>;
    created_at: string;
    error_message?: string;
}

/**
 * List of jobs response
 */
export interface JobsListResponse {
    jobs: AnalysisJob[];
    total: number;
}

/**
 * Repository information
 */
export interface Repository {
    id: number;
    url: string;
    owner_id: number;
    created_at: string;
}

/**
 * List of repositories response
 */
export interface RepositoriesResponse {
    repositories: Repository[];
    total: number;
}

// =============================================================================
// Graph Engine Types (Python Backend - Port 8000)
// =============================================================================

/**
 * Graph node from Neo4j
 */
export interface Neo4jGraphNode {
    id: string;
    label: string;
    type: string;
    properties: Record<string, unknown>;
}

/**
 * Graph edge from Neo4j
 */
export interface Neo4jGraphEdge {
    source: string;
    target: string;
    type: string;
}

/**
 * Full graph response from Graph Engine
 */
export interface Neo4jGraphResponse {
    nodes: Neo4jGraphNode[];
    edges: Neo4jGraphEdge[];
}

/**
 * Repository metrics response
 */
export interface MetricsResponse {
    total_files: number;
    total_functions: number;
    total_classes: number;
    total_dependencies: number;
    complexity_score: number;
}

/**
 * Impact analysis response
 */
export interface ImpactAnalysisResponse {
    node_id: string;
    impacted_count: number;
    impacted_nodes: {
        id: string;
        name: string;
        type: string;
        distance: number;
    }[];
}

/**
 * PageRank analysis response
 */
export interface PageRankResponse {
    repo_id: string;
    total_nodes: number;
    top_nodes: {
        id: string;
        score: number;
    }[];
}

/**
 * Graph Engine health check response
 */
export interface GraphEngineHealthResponse {
    status: string;
    services: {
        neo4j: string;
    };
}

// =============================================================================
// Extension-specific types for transformed data
// =============================================================================

/**
 * Transformed graph data for the webview visualization
 * Compatible with the existing GraphData interface in fileSystem.ts
 */
export interface TransformedGraphData {
    nodes: TransformedNode[];
    edges: TransformedEdge[];
    stats: {
        totalFiles: number;
        totalDirectories: number;
        totalFunctions: number;
        totalClasses: number;
        filesByLanguage: Record<string, number>;
    };
    source: 'backend' | 'local';
    repoId?: string;
}

export interface TransformedNode {
    id: string;
    label: string;
    type: 'file' | 'directory' | 'function' | 'class' | 'module';
    parentId?: string;
    extension?: string;
    language?: string;
    depth: number;
    filePath?: string;
    lineNumber?: number;
    endLineNumber?: number;
    properties?: Record<string, unknown>;
}

export interface TransformedEdge {
    id: string;
    source: string;
    target: string;
    type: 'contains' | 'imports' | 'calls' | 'inherits';
}

/**
 * API client configuration
 */
export interface ApiClientConfig {
    gatewayUrl: string;
    graphEngineUrl: string;
    authToken?: string;
    timeout: number;
}

/**
 * API error response
 */
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}
