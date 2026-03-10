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
import { buildHeatmap, HeatmapMode, HeatmapState, normalizePath, findHeatmapEntry } from './heatmapUtils';
import { getVsCodeApi } from '../utils/vscodeApi';

const boundaryColors: Record<string, string> = {
    physical: '#3b82f6',
    logical: '#22c55e',
    architectural: '#f59e0b',
};

const defaultBoundaryColor = '#94a3b8';

interface BoundaryNodeData {
    boundary: ModuleBoundary;
    summary?: string;
    heatmapColor?: string;
    heatmapTooltip?: string;
    isHighlighted?: boolean;
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
                <span className="boundary-node-name">{data.boundary.name}</span>
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

const boundaryNodeTypes: NodeTypes = {
    boundaryNode: BoundaryNode,
    fileDot: FileNode,
};

interface BoundaryDiagramProps {
    heatmapMode: HeatmapMode;
    highlightNodeIds?: string[];
    repoId?: string | null;
    graphEngineUrl?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    architectureData?: any;
    localContributions?: ContributionsResponse | null;
}

export const BoundaryDiagram: React.FC<BoundaryDiagramProps> = ({
    heatmapMode,
    highlightNodeIds = [],
    repoId: initialRepoId = null,
    graphEngineUrl,
    architectureData,
    localContributions,
}) => {
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
    const [contributions, setContributions] = useState<ContributionsResponse | null>(localContributions || null);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [highlightBoundaryId, setHighlightBoundaryId] = useState<string | null>(null);

    const [filters, setFilters] = useState({
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
                    if (!active) return;
                    console.warn('BoundaryDiagram: Fallback to derived boundaries', backendError);

                    if (architectureData && architectureData.nodes) {
                        const files = architectureData.nodes.filter((n: RawNode) => n.type === 'file');
                        // Group by directory - use a more robust multi-level grouping or just top-level folders
                        const dirMap = new Map<string, string[]>();

                        files.forEach((node: RawNode) => {
                            const pathStr = node.filePath || node.id;
                            // Simplify: use first two levels of directory as the "boundary"
                            const parts = pathStr.split('/');
                            let dir = 'root';
                            if (parts.length > 2) {
                                dir = parts.slice(0, 2).join('/');
                            } else if (parts.length > 1) {
                                dir = parts[0];
                            }

                            if (!dirMap.has(dir)) dirMap.set(dir, []);
                            dirMap.get(dir)?.push(pathStr);
                        });

                        const derived: ModuleBoundary[] = Array.from(dirMap.entries()).map(([dir, files], index) => ({
                            id: `local-${dir.replace(/[\/\.]/g, '-')}`,
                            name: dir,
                            path: dir,
                            type: 'physical',
                            files: files,
                            file_count: files.length,
                            layer: 'Unknown'
                        }));

                        setBoundaryData({
                            boundaries: derived,
                            total_boundaries: derived.length,
                            repo_id: repoId
                        });
                    } else {
                        throw backendError;
                    }
                }
            } catch (err) {
                if (!active) return;
                setError(err instanceof Error ? err.message : 'Failed to load boundaries');
            } finally {
                if (active) setIsLoading(false);
            }
        };

        load();
        return () => { active = false; };
    }, [apiClient, repoId, architectureData]);

    useEffect(() => {
        if (localContributions) {
            setContributions(localContributions);
            return;
        }
        if (!repoId || heatmapMode === 'off') {
            setContributions(null);
            return;
        }

        let active = true;
        const load = async () => {
            try {
                const response = await apiClient.getContributions(repoId);
                if (active) setContributions(response);
            } catch {
                if (active) setContributions(null);
            }
        };
        load();
        return () => { active = false; };
    }, [apiClient, repoId, heatmapMode, localContributions]);

    const summaryByBoundary = useMemo(() => {
        const map = new Map<string, string>();
        if (!insights?.modules) return map;
        insights.modules.forEach(item => {
            map.set(item.name, item.summary);
        });
        return map;
    }, [insights]);

    useEffect(() => {
        if (!boundaryData) return;

        const filtered = boundaryData.boundaries.filter(b => {
            if (b.type === 'physical') return filters.physical;
            if (b.type === 'logical') return filters.logical;
            if (b.type === 'architectural') return filters.architectural;
            return true;
        });

        const boundaryNodes: Node[] = filtered.map(b => {
            const heatmap = getBoundaryHeatmap(b, heatmapState);
            const isHighlighted = highlightBoundaryId === b.id ||
                b.files.some(file => highlightSet.has(normalizePath(file)));

            return {
                id: `boundary:${b.id}`,
                type: 'boundaryNode',
                position: { x: 0, y: 0 },
                data: {
                    boundary: b,
                    summary: summaryByBoundary.get(b.name) || '',
                    heatmapColor: heatmap?.color,
                    heatmapTooltip: heatmap?.tooltip,
                    isHighlighted,
                },
                style: { width: 260, height: 120 },
            };
        });

        const fileNodes: Node[] = [];
        if (filters.showFiles) {
            filtered.forEach(b => {
                const parentId = `boundary:${b.id}`;
                const files = b.files || [];
                const columns = Math.max(3, Math.ceil(Math.sqrt(files.length)));
                files.forEach((file, index) => {
                    const row = Math.floor(index / columns);
                    const col = index % columns;
                    const heatmap = findHeatmapEntry(heatmapState, file);
                    const highlighted = highlightSet.has(normalizePath(file));

                    fileNodes.push({
                        id: `file:${b.id}:${index}`,
                        type: 'fileDot',
                        position: { x: 16 + col * 14, y: 44 + row * 12 },
                        parentNode: parentId,
                        extent: 'parent',
                        draggable: false,
                        selectable: false,
                        data: {
                            file,
                            heatmapColor: heatmap?.color,
                            heatmapTooltip: heatmap?.tooltip,
                            isHighlighted: highlighted,
                        },
                    });
                });
            });
        }

        const applyLayout = async () => {
            try {
                const layoutNodes = boundaryNodes.map(n => ({ id: n.id, width: 260, height: 140 }));
                const { nodes: positions } = await elkLayout(layoutNodes, [], 'layered');

                const layoutedBoundaries = boundaryNodes.map(node => ({
                    ...node,
                    position: positions.get(node.id) || { x: 0, y: 0 }
                }));

                setNodes([...layoutedBoundaries, ...fileNodes]);
                setEdges([]);
            } catch (err) {
                console.error('Layout failed:', err);
                setError('Failed to calculate layout');
            }
        };

        applyLayout();
    }, [boundaryData, filters, summaryByBoundary, heatmapState, highlightBoundaryId, highlightSet]);

    return (
        <div className="diagram-container">
            <div className="diagram-header">
                <div>
                    <h2>Boundary Diagram</h2>
                    <p>Visualizing detected module and service boundaries.</p>
                </div>
                <div className="diagram-filters">
                    {['physical', 'logical', 'architectural'].map(type => (
                        <label key={type}>
                            <input
                                type="checkbox"
                                checked={(filters as any)[type]}
                                onChange={() => setFilters(prev => ({ ...prev, [type]: !(prev as any)[type] }))}
                            />
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </label>
                    ))}
                    <label>
                        <input
                            type="checkbox"
                            checked={filters.showFiles}
                            onChange={() => setFilters(prev => ({ ...prev, showFiles: !prev.showFiles }))}
                        />
                        Files
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
            {!isLoading && !error && !repoId && <div className="diagram-state">Missing repository context.</div>}
            {!isLoading && !error && !!repoId && boundaryData?.boundaries.length === 0 && (
                <div className="diagram-state">No boundaries found.</div>
            )}

            {!isLoading && !error && !!repoId && (
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

function getBoundaryHeatmap(boundary: ModuleBoundary, heatmapState: HeatmapState) {
    let hottest: any = null;
    boundary.files.forEach(file => {
        const entry = findHeatmapEntry(heatmapState, file);
        if (!entry) return;
        if (!hottest || entry.metric > hottest.metric) {
            hottest = { color: entry.color, tooltip: entry.tooltip, metric: entry.metric };
        }
    });
    return hottest;
}
