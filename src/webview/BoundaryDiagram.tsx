import React, { useEffect, useMemo, useState, useCallback } from 'react';
import ReactFlow, {
    Background,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
    ReactFlowProvider,
    BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ArchMindWebviewApiClient } from '../api/webviewClient';
import { ModuleBoundariesResponse, ModuleBoundary, ContributionsResponse } from '../api/types';
import { HeatmapMode, HeatmapState, buildHeatmap, normalizePath } from './heatmapUtils';
import { HeatmapLegend } from './HeatmapLegend';
import { getVsCodeApi } from './vscode-api';

/**
 * Generate fallback boundaries by grouping files from the architecture
 * graph data by their directory relative to the workspace root.
 */
function generateFallbackBoundaries(graphData: any): ModuleBoundariesResponse {
    const nodesArray = graphData?.nodes || [];
    const fileNodes = nodesArray.filter((n: any) => n.type === 'file');
    if (fileNodes.length === 0) {
        return { repo_id: graphData?.repoId || graphData?.repo_id || '', total_boundaries: 0, boundaries: [] };
    }

    // Find the workspace root (the depth=0 directory node)
    const rootNode = nodesArray.find((n: any) => n.type === 'directory' && n.depth === 0);
    const rootPrefix = rootNode
        ? (rootNode.filePath || rootNode.id || '').replace(/\\/g, '/').replace(/\/?$/, '/')
        : '';

    const groups = new Map<string, string[]>();
    fileNodes.forEach((node: any) => {
        const filePath = (node.filePath || node.id || '').replace(/\\/g, '/');
        // Strip the workspace root prefix to get a relative path
        const relative = rootPrefix && filePath.startsWith(rootPrefix)
            ? filePath.slice(rootPrefix.length)
            : filePath;
        const parts = relative.split('/');
        // Group by first directory segment, or 'root' for files at root level
        const dir = parts.length > 1 ? parts[0] : 'root';
        if (!groups.has(dir)) groups.set(dir, []);
        groups.get(dir)!.push(relative);
    });

    const boundaries: ModuleBoundary[] = Array.from(groups.entries()).map(([dir, files], idx) => ({
        id: `fallback-${idx}`,
        name: dir,
        type: 'logical',
        path: dir,
        layer: null,
        file_count: files.length,
        files,
    }));

    return {
        repo_id: graphData?.repoId || graphData?.repo_id || '',
        total_boundaries: boundaries.length,
        boundaries,
    };
}

// Reuse logic from ModuleBoundaryDiagram
function getBoundaryHeatmap(boundary: ModuleBoundary, heatmapState: HeatmapState): { color: string; tooltip: string; metric: number } | null {
    let hottest: { color: string; tooltip: string; metric: number } | null = null;
    boundary.files.forEach((file) => {
        const entry = heatmapState.entries.get(normalizePath(file));
        if (!entry) return;
        if (!hottest || entry.metric > hottest.metric) {
            hottest = { color: entry.color, tooltip: entry.tooltip, metric: entry.metric };
        }
    });
    return hottest;
}

const LAYER_COLORS: Record<string, string> = {
    Presentation: '#4fc3f7',
    BusinessLogic: '#ff9800',
    DataAccess: '#4caf50',
    Infrastructure: '#9c27b0',
    Unknown: '#78909c',
};

interface BoundaryDiagramProps {
    heatmapMode: HeatmapMode;
    highlightNodeIds?: string[];
}

const BoundaryDiagramInner: React.FC<BoundaryDiagramProps> = ({ heatmapMode, highlightNodeIds = [] }) => {
    const vscode = useMemo(() => getVsCodeApi(), []);
    const apiClient = useMemo(() => new ArchMindWebviewApiClient(), []);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const [repoId, setRepoId] = useState<string | null>(null);
    const [initialLoading, setInitialLoading] = useState(true); // true until first architectureData
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [boundaryData, setBoundaryData] = useState<ModuleBoundariesResponse | null>(null);
    const [contributions, setContributions] = useState<ContributionsResponse | null>(null);
    const [graphData, setGraphData] = useState<any>(null); // Store raw graph data for fallback

    const heatmapState = useMemo<HeatmapState>(
        () => buildHeatmap(contributions?.contributions || [], heatmapMode),
        [contributions, heatmapMode]
    );

    // Listen for repoId and graph data from parent/extension
    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const message = event.data;
            if (message?.command === 'architectureData') {
                setInitialLoading(false);
                const extractedRepoId = message.data?.repo_id || message.data?.repoId;
                if (extractedRepoId) {
                    setRepoId(extractedRepoId);
                }
                // Store graph data for fallback boundary generation
                if (message.data) {
                    setGraphData(message.data);
                }
            }
            if (message?.command === 'loading') {
                setInitialLoading(false);
                setIsLoading(true);
                setError(null);
            }
            if (message?.command === 'error') {
                setInitialLoading(false);
                setError(message.message || 'An error occurred');
                setIsLoading(false);
            }
            if (message?.command === 'noData') {
                setInitialLoading(false);
            }
        };
        window.addEventListener('message', handler);
        vscode.postMessage({ command: 'requestArchitecture' });
        return () => window.removeEventListener('message', handler);
    }, [vscode]);

    // Fetch boundaries (with fallback)
    useEffect(() => {
        if (!repoId) {
            // No repoId — try fallback from graph data
            if (graphData) {
                const fallback = generateFallbackBoundaries(graphData);
                if (fallback.boundaries.length > 0) {
                    setBoundaryData(fallback);
                }
            }
            return;
        }
        const load = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const response = await apiClient.getModuleBoundaries(repoId);
                if (response && response.boundaries && response.boundaries.length > 0) {
                    setBoundaryData(response);
                } else {
                    // API returned empty boundaries, use fallback
                    console.warn('Boundary API returned empty, using fallback grouping');
                    const fallback = generateFallbackBoundaries(graphData);
                    setBoundaryData(fallback.boundaries.length > 0 ? fallback : response);
                }
            } catch (err) {
                console.error("Failed to load boundaries:", err);
                // Try fallback instead of showing error
                if (graphData) {
                    const fallback = generateFallbackBoundaries(graphData);
                    if (fallback.boundaries.length > 0) {
                        setBoundaryData(fallback);
                        setError(null);
                    } else {
                        setError("Failed to load boundary data. Backend may be unavailable.");
                    }
                } else {
                    setError("Failed to load boundary data. Backend may be unavailable.");
                }
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [repoId, apiClient, graphData]);

    // Fetch contributions for heatmap
    useEffect(() => {
        if (!repoId || heatmapMode === 'off') {
            setContributions(null);
            return;
        }
        let active = true;
        const load = async () => {
            try {
                const response = await apiClient.getContributions(repoId);
                if (active) setContributions(response);
            } catch (err) {
                console.error("Failed to load contributions:", err);
            }
        };
        load();
        return () => { active = false; };
    }, [repoId, heatmapMode, apiClient]);

    // Convert boundaries to nodes
    useEffect(() => {
        if (!boundaryData) return;

        const newNodes: Node[] = [];
        const boundaries = boundaryData.boundaries || [];

        // Simple grid layout
        const SPACING_X = 250;
        const SPACING_Y = 150;
        const COLUMNS = 4;

        boundaries.forEach((boundary, index) => {
            const row = Math.floor(index / COLUMNS);
            const col = index % COLUMNS;

            const heatmap = heatmapMode === 'off' ? null : getBoundaryHeatmap(boundary, heatmapState);
            const baseColor = LAYER_COLORS[boundary.layer || 'Unknown'] || LAYER_COLORS.Unknown;
            const finalColor = heatmap ? heatmap.color : `${baseColor}20`; // Transparent base if no heatmap

            newNodes.push({
                id: boundary.id,
                position: { x: col * SPACING_X, y: row * SPACING_Y },
                data: {
                    label: boundary.name,
                    layer: boundary.layer,
                    files: boundary.file_count,
                    heatmapTooltip: heatmap?.tooltip
                },
                style: {
                    background: finalColor,
                    border: `1px solid ${heatmap ? finalColor : baseColor}`,
                    borderRadius: 8,
                    padding: 10,
                    width: 200,
                    fontSize: 12,
                    color: 'var(--am-fg)',
                },
                type: 'default',
            });
        });

        setNodes(newNodes);
        setEdges([]); // No edges for now as API doesn't provide them explicitly
    }, [boundaryData, heatmapState, heatmapMode, setNodes, setEdges]);

    // Show "initializing" spinner while waiting for first architectureData
    if (initialLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
                Initializing boundary diagram...
            </div>
        );
    }

    // Only show "No Repository" screen if no repoId AND no fallback data
    if (!repoId && !boundaryData) {
        return (
            <div className="diagram-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                <h3>No Repository Analyzed</h3>
                <p style={{ opacity: 0.8, maxWidth: '400px', marginBottom: '24px' }}>
                    Run backend analysis to visualize module boundaries, or open a workspace for local analysis.
                </p>
                <button
                    className="diagram-pill active"
                    onClick={() => vscode.postMessage({ command: 'analyzeRepository' })}
                >
                    Analyze Repository
                </button>
            </div>
        );
    }
    if (isLoading) {
        return <div className="loading-container"><div className="loading-spinner" />Loading boundaries...</div>;
    }

    if (error) {
        return <div className="error-container"><h3>Error</h3>{error}</div>;
    }

    if (!isLoading && !error && (!boundaryData || !boundaryData.boundaries || boundaryData.boundaries.length === 0)) {
        return (
            <div className="diagram-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', color: 'var(--am-fg)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>∅</div>
                <h3>No Boundaries Detected</h3>
                <p style={{ opacity: 0.8, maxWidth: '400px', marginBottom: '24px' }}>
                    The analysis could not identify any distinct module boundaries in this repository.
                </p>
                <button
                    className="diagram-pill active"
                    onClick={() => vscode.postMessage({ command: 'analyzeRepository' })}
                >
                    Re-run Analysis
                </button>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%' }}>
            {heatmapMode !== 'off' && (
                <div className="heatmap-legend-floating">
                    <HeatmapLegend
                        mode={heatmapMode}
                        minMetric={heatmapState.minMetric}
                        maxMetric={heatmapState.maxMetric}
                    />
                </div>
            )}
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
            >
                <Background color="var(--am-border)" gap={16} />
            </ReactFlow>
        </div>
    );
};

export const BoundaryDiagram = (props: BoundaryDiagramProps) => (
    <ReactFlowProvider>
        <BoundaryDiagramInner {...props} />
    </ReactFlowProvider>
);
