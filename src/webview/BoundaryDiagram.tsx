import React, { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, BackgroundVariant, Node, Edge, NodeTypes, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';

import { elkLayout } from './layoutAlgorithms';
import { ArchMindWebviewApiClient } from '../api/webviewClient';
import { RawNode } from './graphTypes';
import {
    ArchitectureInsightsResponse,
    ContributionsResponse,
    ModuleBoundariesResponse,
    ModuleBoundary,
} from '../api/types';
import { HeatmapLegend } from './HeatmapLegend';
import { buildHeatmap, HeatmapMode, HeatmapState, normalizePath } from './heatmapUtils';
import { getVsCodeApi } from '../utils/vscodeApi';

declare const acquireVsCodeApi: any;

const boundaryColors: Record<string, string> = {
    physical: '#3b82f6',
    logical: '#22c55e',
    architectural: '#f59e0b',
};

const defaultBoundaryColor = '#94a3b8';

const boundaryNodeTypes: NodeTypes = {
    boundaryNode: BoundaryNode,
    fileDot: FileNode,
};

interface FilterState {
    physical: boolean;
    logical: boolean;
    architectural: boolean;
    showFiles: boolean;
}

interface BoundaryNodeData {
    boundary: ModuleBoundary;
    summary?: string;
    heatmapColor?: string;
    heatmapTooltip?: string;
    isHighlighted?: boolean;
}

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

function BoundaryNode({ data }: { data: BoundaryNodeData }) {
    const color = boundaryColors[data.boundary.type] || defaultBoundaryColor;
    const ring = data.isHighlighted ? '0 0 0 3px rgba(249, 115, 22, 0.75)' : undefined;
    return (
        <div
            className="boundary-diagram-node"
            style={{
                borderColor: color,
                boxShadow: ring || (data.heatmapColor ? `0 0 0 2px ${data.heatmapColor}` : undefined),
            }}
            title={data.heatmapTooltip || data.summary || ''}
        >
            <div className="boundary-node-header" style={{ color }}>
                <span>{data.boundary.name}</span>
                {data.boundary.layer && (
                    <span className="boundary-layer-pill">{data.boundary.layer}</span>
                )}
            </div>
            {data.boundary.path && <div className="boundary-node-path">{data.boundary.path}</div>}
            <div className="boundary-node-meta">{data.boundary.file_count} files</div>
        </div>
    );
}

function FileNode({ data }: { data?: { heatmapColor?: string; heatmapTooltip?: string; isHighlighted?: boolean } }) {
    return (
        <div
            className="boundary-file-dot"
            style={{
                backgroundColor: data?.heatmapColor || undefined,
                boxShadow: data?.isHighlighted ? '0 0 0 2px rgba(249, 115, 22, 0.75)' : undefined,
            }}
            title={data?.heatmapTooltip || ''}
        />
    );
}

interface GraphStats {
    totalFiles: number;
    totalDirectories: number;
    totalFunctions?: number;
    totalClasses?: number;
    filesByLanguage: Record<string, number>;
}

interface ArchitectureData {
    nodes: RawNode[];
    edges: unknown[];
    stats: GraphStats;
    source?: 'local' | 'backend';
    repoId?: string;
    repo_id?: string;
}

interface BoundaryDiagramProps {
    heatmapMode: HeatmapMode;
    highlightNodeIds?: string[];
    repoId?: string | null;
    graphEngineUrl?: string;
    architectureData?: ArchitectureData | null;
}

export const BoundaryDiagram: React.FC<BoundaryDiagramProps> = ({
    heatmapMode,
    highlightNodeIds = [],
    repoId: initialRepoId = null,
    graphEngineUrl,
    architectureData,
}) => {
    console.log('BoundaryDiagram: Mounted', { repoId: initialRepoId, hasArchitectureData: !!architectureData });

    console.log('BoundaryDiagram: Mounted', { repoId: initialRepoId, hasArchitectureData: !!architectureData });

    const vscode = useMemo(() => getVsCodeApi(), []);
    const apiClient = useMemo(
        () => new ArchMindWebviewApiClient(graphEngineUrl || 'https://graph-engine-production-90f5.up.railway.app'),
        [graphEngineUrl]
    );

    const [repoId, setRepoId] = useState<string | null>(initialRepoId);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [boundaryData, setBoundaryData] = useState<ModuleBoundariesResponse | null>(null);
    const [insights, setInsights] = useState<ArchitectureInsightsResponse | null>(null);
    const [contributions, setContributions] = useState<ContributionsResponse | null>(null);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [highlightBoundaryId, setHighlightBoundaryId] = useState<string | null>(null);

    const [filters, setFilters] = useState<FilterState>({
        physical: true,
        logical: true,
        architectural: true,
        showFiles: true,
    });

    const heatmapState = useMemo<HeatmapState>(
        () => buildHeatmap(contributions?.contributions || [], heatmapMode),
        [contributions, heatmapMode]
    );

    const highlightSet = useMemo(
        () => new Set(highlightNodeIds.map((id) => normalizePath(id.replace(/^file:/, '')))),
        [highlightNodeIds]
    );

    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const message = event.data;
            if (message?.command === 'architectureData') {
                const extractedRepoId = message.data?.repo_id || message.data?.repoId;
                if (extractedRepoId) {
                    setRepoId(String(extractedRepoId));
                }
            }
            if (message?.command === 'revealBoundaryFile' && message.filePath && boundaryData) {
                const normalized = normalizePath(message.filePath);
                const match = boundaryData.boundaries.find(boundary =>
                    boundary.files.some(file => normalizePath(file) === normalized)
                );
                if (match) {
                    setHighlightBoundaryId(match.id);
                }
                setFilters(prev => ({ ...prev, showFiles: true }));
            }
        };

        window.addEventListener('message', handler);
        window.addEventListener('message', handler);
        if (vscode) {
            vscode.postMessage({ command: 'requestArchitecture' });
        }

        return () => window.removeEventListener('message', handler);
    }, [vscode, boundaryData]);

    useEffect(() => {
        if (initialRepoId) {
            setRepoId(initialRepoId);
        }
    }, [initialRepoId]);

    useEffect(() => {
        if (!repoId) return;
        let active = true;

        const load = async () => {
            try {
                setIsLoading(true);
                setError(null);

                console.log('BoundaryDiagram: Attempting to load boundaries', { repoId });

                // Try fetching boundaries from the backend
                try {
                    const [boundaries, analysis] = await Promise.all([
                        apiClient.getModuleBoundaries(repoId),
                        apiClient.getArchitectureInsights(repoId).catch(() => null),
                    ]);

                    if (!active) return;

                    if (boundaries && boundaries.boundaries.length > 0) {
                        setBoundaryData(boundaries);
                        setInsights(analysis);
                    } else {
                        throw new Error('No boundaries returned from backend');
                    }
                } catch (backendError) {
                    console.warn('BoundaryDiagram: Backend fetch failed, trying fallback', backendError);

                    if (!active) return;

                    // Fallback: Derive from architectureData if available
                    if (architectureData && architectureData.nodes) {
                        console.log('BoundaryDiagram: Deriving from architectureData', { nodeCount: architectureData.nodes.length });
                        const files = architectureData.nodes.filter((n: RawNode) => n.type === 'file');
                        // Group by directory
                        const dirMap = new Map<string, string[]>();

                        files.forEach((node: RawNode) => {
                            const pathParts = (node.filePath || node.id).split('/');
                            const dir = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : 'root';
                            if (!dirMap.has(dir)) dirMap.set(dir, []);
                            dirMap.get(dir)?.push(node.filePath || node.id);
                        });

                        const derivedBoundaries: ModuleBoundary[] = Array.from(dirMap.entries()).map(([dir, files], index) => ({
                            id: `physical-${index}`,
                            name: dir,
                            path: dir,
                            type: 'physical',
                            files: files,
                            file_count: files.length,
                            layer: 'Unknown'
                        }));

                        setBoundaryData({
                            boundaries: derivedBoundaries,
                            total_boundaries: derivedBoundaries.length,
                            repo_id: repoId
                        });
                    } else {
                        console.error('BoundaryDiagram: No architectureData available for fallback');
                        // If no graph data either, bubble the error
                        throw backendError;
                    }
                }
            } catch (err) {
                if (!active) return;
                setError(err instanceof Error ? err.message : 'Failed to load boundaries');
            } finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        };

        load();
        return () => {
            active = false;
        };
    }, [apiClient, repoId, architectureData]);

    useEffect(() => {
        if (!repoId || heatmapMode === 'off') {
            setContributions(null);
            return;
        }

        let active = true;
        const load = async () => {
            try {
                const response = await apiClient.getContributions(repoId);
                if (active) {
                    setContributions(response);
                }
            } catch {
                if (active) {
                    setContributions(null);
                }
            }
        };

        load();
        return () => {
            active = false;
        };
    }, [apiClient, repoId, heatmapMode]);

    const summaryByBoundary = useMemo(() => {
        const map = new Map<string, string>();
        if (!insights?.insights) return map;
        insights.insights.forEach(item => {
            if (item.pattern_type?.startsWith('module_summary:')) {
                const name = item.pattern_type.replace('module_summary:', '').trim();
                map.set(name, item.summary);
            }
        });
        return map;
    }, [insights]);

    useEffect(() => {
        if (!boundaryData) return;

        const filteredBoundaries = boundaryData.boundaries.filter(boundary => {
            if (boundary.type === 'physical') return filters.physical;
            if (boundary.type === 'logical') return filters.logical;
            if (boundary.type === 'architectural') return filters.architectural;
            return true;
        });

        const boundaryNodes: Node[] = filteredBoundaries.map(boundary => {
            const hottest = getBoundaryHeatmap(boundary, heatmapState);
            const isHighlighted =
                highlightBoundaryId === boundary.id ||
                boundary.files.some(file => highlightSet.has(normalizePath(file)));
            return {
                id: `boundary:${boundary.id}`,
                type: 'boundaryNode',
                position: { x: 0, y: 0 },
                data: {
                    boundary,
                    summary: summaryByBoundary.get(boundary.name) || '',
                    heatmapColor: hottest?.color,
                    heatmapTooltip: hottest?.tooltip,
                    isHighlighted,
                },
                draggable: false,
                selectable: true,
                style: {
                    width: 260,
                    height: 120,
                    boxShadow: isHighlighted ? '0 0 12px rgba(249, 115, 22, 0.6)' : undefined,
                },
            };
        });

        const fileNodes: Node[] = [];
        if (filters.showFiles) {
            filteredBoundaries.forEach(boundary => {
                const parentId = `boundary:${boundary.id}`;
                const files = boundary.files || [];
                const columns = Math.max(3, Math.ceil(Math.sqrt(files.length)));
                files.forEach((file, index) => {
                    const row = Math.floor(index / columns);
                    const col = index % columns;
                    const entry = heatmapState.entries.get(normalizePath(file));
                    const isHighlighted = highlightSet.has(normalizePath(file));
                    fileNodes.push({
                        id: `file:${boundary.id}:${index}`,
                        type: 'fileDot',
                        position: {
                            x: 16 + col * 14,
                            y: 44 + row * 12,
                        },
                        parentNode: parentId,
                        extent: 'parent',
                        draggable: false,
                        selectable: false,
                        data: {
                            file,
                            heatmapColor: entry?.color,
                            heatmapTooltip: entry?.tooltip,
                            isHighlighted,
                        },
                    });
                });
            });
        }

        const layoutNodes = boundaryNodes.map(node => ({
            id: node.id,
            width: 260,
            height: 140,
        }));

        const applyLayout = async () => {
            try {
                const { nodes: positions } = await elkLayout(layoutNodes, [], 'layered');
                const layoutedBoundaries = boundaryNodes.map(node => {
                    const pos = positions.get(node.id) || { x: 0, y: 0 };
                    return { ...node, position: pos };
                });

                setNodes([...layoutedBoundaries, ...fileNodes]);
                setEdges([]);
            } catch (err) {
                console.error('Layout failed:', err);
                setError('Failed to calculate layout for boundary diagram.');
            }
        };

        applyLayout();
    }, [boundaryData, filters, summaryByBoundary, heatmapState, highlightBoundaryId, highlightSet]);

    return (
        <div className="diagram-container">
            <div className="diagram-header">
                <div>
                    <h2>Boundary Diagram</h2>
                    <p>Grouped view of detected module boundaries.</p>
                </div>
                <div className="diagram-filters">
                    <label>
                        <input
                            type="checkbox"
                            checked={filters.physical}
                            onChange={() => setFilters(prev => ({ ...prev, physical: !prev.physical }))}
                        />
                        Physical
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={filters.logical}
                            onChange={() => setFilters(prev => ({ ...prev, logical: !prev.logical }))}
                        />
                        Logical
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={filters.architectural}
                            onChange={() => setFilters(prev => ({ ...prev, architectural: !prev.architectural }))}
                        />
                        Architectural
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={filters.showFiles}
                            onChange={() => setFilters(prev => ({ ...prev, showFiles: !prev.showFiles }))}
                        />
                        Show files
                    </label>
                </div>
            </div>
            {heatmapMode !== 'off' && heatmapState.maxMetric > 0 && (
                <HeatmapLegend
                    mode={heatmapMode}
                    minMetric={heatmapState.minMetric}
                    maxMetric={heatmapState.maxMetric}
                />
            )}

            {isLoading && <div className="diagram-state">Loading boundaries...</div>}
            {error && <div className="diagram-state diagram-error">{error}</div>}
            {
                !isLoading && !error && !repoId && (
                    <div className="diagram-state">
                        Backend repository context is not available. Run backend analysis first.
                    </div>
                )
            }
            {
                !isLoading && !error && !!repoId && boundaryData && boundaryData.boundaries.length === 0 && (
                    <div className="diagram-state">No boundaries were returned for this repository.</div>
                )
            }

            {
                !isLoading && !error && !!repoId && (
                    <ReactFlowProvider>
                        <div className="diagram-flow">
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                nodeTypes={boundaryNodeTypes}
                                fitView
                                fitViewOptions={{ padding: 0.2 }}
                            >
                                <Background variant={BackgroundVariant.Dots} gap={16} size={0.8} />
                            </ReactFlow>
                        </div>
                    </ReactFlowProvider>
                )
            }
        </div>
    );
};

