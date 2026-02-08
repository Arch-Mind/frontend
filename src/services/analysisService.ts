
import * as vscode from 'vscode';
import { GraphNode, GraphEdge, GraphStats, analyzeWorkspace } from '../analyzer/fileSystem';

export interface AnalysisData {
    nodes: GraphNode[];
    edges: GraphEdge[];
    stats: GraphStats;
    timestamp: number;
}

export class AnalysisService {
    private static instance: AnalysisService;
    private data: AnalysisData | null = null;
    private isAnalyzing = false;
    private _onDidAnalysisChange = new vscode.EventEmitter<AnalysisData>();

    public readonly onDidAnalysisChange = this._onDidAnalysisChange.event;

    private constructor() { }

    public static getInstance(): AnalysisService {
        if (!AnalysisService.instance) {
            AnalysisService.instance = new AnalysisService();
        }
        return AnalysisService.instance;
    }

    public async analyze(rootPath: string): Promise<AnalysisData> {
        if (this.isAnalyzing) {
            // Return existing data if available, or wait? 
            // For now, simple lock preventing concurrent full analysis
            if (this.data) return this.data;
            throw new Error('Analysis already in progress');
        }

        this.isAnalyzing = true;
        try {
            const result = await analyzeWorkspace(rootPath);
            this.data = {
                ...result,
                timestamp: Date.now()
            };
            this._onDidAnalysisChange.fire(this.data);
            return this.data;
        } finally {
            this.isAnalyzing = false;
        }
    }

    public getData(): AnalysisData | null {
        return this.data;
    }

    /**
     * Get incoming calls (callers) for a specific function/symbol
     */
    public getCallers(filePath: string, functionName: string): GraphEdge[] {
        if (!this.data) return [];

        // Find the node ID for this function
        // The ID format in fileSystem.ts depends on how it's constructed.
        // Usually it's the file path for files.
        // For functions, implementation in fileSystem.ts:
        // const id = `${fullPath}#${symbol.name}`;

        // Let's try to find the node matching the file path and function name
        // Or construct the ID if we know the convention
        const expectedId = `${filePath}#${functionName}`;

        // Check if node exists (optional, but good for validation)
        const node = this.data.nodes.find(n => n.id === expectedId);

        // If we can't find by ID directly, we might need to search by properties
        // But assuming the convention from fileSystem.ts holds:

        return this.data.edges.filter(edge => edge.target === expectedId && edge.type === 'calls');
    }

    /**
     * Get outgoing calls from a specific function
     */
    public getCalls(filePath: string, functionName: string): GraphEdge[] {
        if (!this.data) return [];
        const expectedId = `${filePath}#${functionName}`;
        return this.data.edges.filter(edge => edge.source === expectedId && edge.type === 'calls');
    }
}
