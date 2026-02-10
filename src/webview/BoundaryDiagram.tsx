import React, { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, BackgroundVariant, Node, Edge, NodeTypes, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';

import { elkLayout } from './layoutAlgorithms';
import { ArchMindWebviewApiClient } from '../api/webviewClient';
import {
    ArchitectureInsightsResponse,
    ContributionsResponse,
    ModuleBoundariesResponse,
    ModuleBoundary,
} from '../api/types';
import { HeatmapLegend } from './HeatmapLegend';
import { buildHeatmap, HeatmapMode, HeatmapState, normalizePath } from './heatmapUtils';

declare function acquireVsCodeApi(): {
    postMessage(message: unknown): void;
    getState(): unknown;
    setState(state: unknown): void;
};

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
}

function getBoundaryHeatmap(boundary: ModuleBoundary, heatmapState: HeatmapState) {
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
    return (
        <div
            className="boundary-diagram-node"
            style={{
                borderColor: color,
                boxShadow: data.heatmapColor ? `0 0 0 2px ${data.heatmapColor}` : undefined,
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

function FileNode({ data }: { data?: { heatmapColor?: string; heatmapTooltip?: string } }) {
    return (
        <div
            className="boundary-file-dot"
            style={{ backgroundColor: data?.heatmapColor || undefined }}
            title={data?.heatmapTooltip || ''}
        />
    );
}

interface BoundaryDiagramProps {
    heatmapMode: HeatmapMode;
}

export const BoundaryDiagram: React.FC<BoundaryDiagramProps> = ({ heatmapMode }) => {
    const vscode = useMemo(() => acquireVsCodeApi(), []);
    const apiClient = useMemo(() => new ArchMindWebviewApiClient(), []);

    const [repoId, setRepoId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [boundaryData, setBoundaryData] = useState<ModuleBoundariesResponse | null>(null);
    const [insights, setInsights] = useState<ArchitectureInsightsResponse | null>(null);
    const [contributions, setContributions] = useState<ContributionsResponse | null>(null);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

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

    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const message = event.data;
            if (message?.command === 'architectureData') {
                const extractedRepoId = message.data?.repo_id || message.data?.repoId;
                if (extractedRepoId) {
                    setRepoId(extractedRepoId);
                }
            }
        };

        window.addEventListener('message', handler);
        vscode.postMessage({ command: 'requestArchitecture' });

        return () => window.removeEventListener('message', handler);
    }, [vscode]);

    useEffect(() => {
        if (!repoId) return;
        let active = true;

        const load = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const [boundaries, analysis] = await Promise.all([
                    apiClient.getModuleBoundaries(repoId),
                    apiClient.getArchitectureInsights(repoId).catch(() => null),
                ]);

                if (!active) return;
                setBoundaryData(boundaries);
                setInsights(analysis);
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
    }, [apiClient, repoId]);

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
            return {
            id: `boundary:${boundary.id}`,
            type: 'boundaryNode',
            position: { x: 0, y: 0 },
            data: {
                boundary,
                summary: summaryByBoundary.get(boundary.name) || '',
                heatmapColor: hottest?.color,
                heatmapTooltip: hottest?.tooltip,
            },
            draggable: false,
            selectable: true,
            style: {
                width: 260,
                height: 120,
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
            const { nodes: positions } = await elkLayout(layoutNodes, [], 'layered');
            const layoutedBoundaries = boundaryNodes.map(node => {
                const pos = positions.get(node.id) || { x: 0, y: 0 };
                return { ...node, position: pos };
            });

            setNodes([...layoutedBoundaries, ...fileNodes]);
            setEdges([]);
        };

        applyLayout();
    }, [boundaryData, filters, summaryByBoundary, heatmapState]);

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

            {!isLoading && !error && (
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
            )}
        </div>
    );
};
