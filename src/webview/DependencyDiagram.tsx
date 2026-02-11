import React, { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, BackgroundVariant, Edge, Node, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';

import { dagreLayout } from './layoutAlgorithms';
import { ArchMindWebviewApiClient } from '../api/webviewClient';
import { ContributionsResponse, DependenciesResponse, DependencyRecord } from '../api/types';
import { HeatmapLegend } from './HeatmapLegend';
import { HeatmapNode } from './HeatmapNode';
import { buildHeatmap, HeatmapMode, HeatmapState, normalizePath } from './heatmapUtils';

declare function acquireVsCodeApi(): {
    postMessage(message: unknown): void;
    getState(): unknown;
    setState(state: unknown): void;
};

const edgeStyles: Record<string, { color: string; dash: string; width: number }> = {
    import: { color: '#6b7280', dash: '0', width: 1.2 },
    inheritance: { color: '#8b5cf6', dash: '6 4', width: 1.2 },
    library: { color: '#a16207', dash: '2 6', width: 1.2 },
    data: { color: '#dc2626', dash: '0', width: 2.2 },
};

interface FilterState {
    import: boolean;
    inheritance: boolean;
    library: boolean;
    data: boolean;
}

type FocusMode = 'off' | '1' | '2' | 'all';

interface DependencyDiagramProps {
    heatmapMode: HeatmapMode;
    highlightNodeIds?: string[];
    repoId?: string | null;
    graphEngineUrl?: string;
}

export const DependencyDiagram: React.FC<DependencyDiagramProps> = ({
    heatmapMode,
    highlightNodeIds = [],
    repoId: initialRepoId = null,
    graphEngineUrl,
}) => {
    const vscode = useMemo(() => acquireVsCodeApi(), []);
    const apiClient = useMemo(
        () => new ArchMindWebviewApiClient(graphEngineUrl || 'http://localhost:8000'),
        [graphEngineUrl]
    );

    const [repoId, setRepoId] = useState<string | null>(initialRepoId);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rawData, setRawData] = useState<DependenciesResponse | null>(null);
    const [contributions, setContributions] = useState<ContributionsResponse | null>(null);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [focusMode, setFocusMode] = useState<FocusMode>('off');

    const [filters, setFilters] = useState<FilterState>({
        import: true,
        inheritance: true,
        library: true,
        data: true,
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
        };

        window.addEventListener('message', handler);
        vscode.postMessage({ command: 'requestArchitecture' });

        return () => window.removeEventListener('message', handler);
    }, [vscode]);

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
                const response = await apiClient.getDependencies(repoId);
                if (!active) return;
                setRawData(response);
            } catch (err) {
                if (!active) return;
                setError(err instanceof Error ? err.message : 'Failed to load dependencies');
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

    const filteredRecords = useMemo(() => {
        if (!rawData) return [];
        return rawData.dependencies.filter(record => {
            const category = getDependencyCategory(record);
            return filters[category];
        });
    }, [rawData, filters]);

    useEffect(() => {
        if (!rawData) return;

        const records = applyFocusMode(filteredRecords, selectedNode, focusMode);

        const nodeMap = new Map<string, Node>();
        const edgeMap = new Map<string, {
            source: string;
            target: string;
            category: keyof FilterState;
            count: number;
        }>();

        records.forEach(record => {
            const sourceId = `file:${record.source_file}`;
            const targetId = `${record.target_type}:${record.target}`;
            const category = getDependencyCategory(record);
            const sourceHeatmap = heatmapState.entries.get(normalizePath(record.source_file));
            const sourceHighlighted = highlightSet.has(normalizePath(record.source_file));

            if (!nodeMap.has(sourceId)) {
                nodeMap.set(
                    sourceId,
                    createNode(
                        sourceId,
                        record.source_file,
                        'File',
                        sourceHeatmap?.color,
                        sourceHeatmap?.tooltip,
                        sourceHighlighted
                    )
                );
            }
            if (!nodeMap.has(targetId)) {
                const targetHighlighted =
                    targetId.startsWith('file:') && highlightSet.has(normalizePath(record.target));
                nodeMap.set(
                    targetId,
                    createNode(targetId, record.target, record.target_type, undefined, undefined, targetHighlighted)
                );
            }

            const key = `${sourceId}|${targetId}|${category}`;
            const entry = edgeMap.get(key);
            if (entry) {
                entry.count += 1;
            } else {
                edgeMap.set(key, { source: sourceId, target: targetId, category, count: 1 });
            }
        });

        const nodeList = Array.from(nodeMap.values());
        const edgeList: Edge[] = Array.from(edgeMap.entries()).map(([key, edge]) => {
            const style = edgeStyles[edge.category];
            return {
                id: key,
                source: edge.source,
                target: edge.target,
                label: `${edge.count} ${edge.category}`,
                style: {
                    stroke: style.color,
                    strokeWidth: style.width,
                    strokeDasharray: style.dash,
                },
                labelStyle: { fill: style.color, fontSize: 10 },
                animated: edge.category === 'data',
            };
        });

        const layoutNodes = nodeList.map(node => ({
            id: node.id,
            width: 180,
            height: 50,
        }));

        const layoutEdges = edgeList.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
        }));

        const { nodes: positions } = dagreLayout(layoutNodes, layoutEdges, 'LR');
        const layoutedNodes = nodeList.map(node => ({
            ...node,
            position: positions.get(node.id) || { x: 0, y: 0 },
        }));

        setNodes(layoutedNodes);
        setEdges(edgeList);
    }, [rawData, filteredRecords, focusMode, selectedNode, heatmapState, highlightSet]);

    return (
        <div className="diagram-container">
            <div className="diagram-header">
                <div>
                    <h2>Dependency Diagram</h2>
                    <p>Visualize import, inheritance, library, and data dependencies.</p>
                </div>
                <div className="diagram-filters">
                    <label>
                        <input
                            type="checkbox"
                            checked={filters.import}
                            onChange={() => setFilters(prev => ({ ...prev, import: !prev.import }))}
                        />
                        Import
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={filters.inheritance}
                            onChange={() => setFilters(prev => ({ ...prev, inheritance: !prev.inheritance }))}
                        />
                        Inheritance
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={filters.library}
                            onChange={() => setFilters(prev => ({ ...prev, library: !prev.library }))}
                        />
                        Library
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={filters.data}
                            onChange={() => setFilters(prev => ({ ...prev, data: !prev.data }))}
                        />
                        Data
                    </label>
                </div>
                <div className="diagram-filters focus-group">
                    <span>Focus:</span>
                    {(['off', '1', '2', 'all'] as FocusMode[]).map(mode => (
                        <button
                            key={mode}
                            className={focusMode === mode ? 'diagram-pill active' : 'diagram-pill'}
                            onClick={() => setFocusMode(mode)}
                        >
                            {mode === 'off' ? 'All' : `${mode}-hop`}
                        </button>
                    ))}
                </div>
            </div>
            {heatmapMode !== 'off' && heatmapState.maxMetric > 0 && (
                <HeatmapLegend
                    mode={heatmapMode}
                    minMetric={heatmapState.minMetric}
                    maxMetric={heatmapState.maxMetric}
                />
            )}

            {isLoading && <div className="diagram-state">Loading dependencies...</div>}
            {error && <div className="diagram-state diagram-error">{error}</div>}
            {!isLoading && !error && !repoId && (
                <div className="diagram-state">
                    Backend repository context is not available. Run backend analysis first.
                </div>
            )}
            {!isLoading && !error && !!repoId && rawData && filteredRecords.length === 0 && (
                <div className="diagram-state">No dependency records matched the current filters.</div>
            )}

            {!isLoading && !error && !!repoId && (
                <ReactFlowProvider>
                    <div className="diagram-flow">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            nodeTypes={{ heatmapNode: HeatmapNode }}
                            fitView
                            fitViewOptions={{ padding: 0.2 }}
                            onNodeClick={(_, node) => setSelectedNode(node.id)}
                        >
                            <Background variant={BackgroundVariant.Dots} gap={16} size={0.8} />
                        </ReactFlow>
                    </div>
                </ReactFlowProvider>
            )}
        </div>
    );
};

function getDependencyCategory(record: DependencyRecord): keyof FilterState {
    if (record.relationship === 'INHERITS') return 'inheritance';
    if (record.relationship === 'USES_TABLE') return 'data';
    if (record.relationship === 'DEPENDS_ON' && record.target_type === 'Library') return 'library';
    return 'import';
}

function createNode(
    id: string,
    label: string,
    type: string,
    heatmapColor?: string,
    heatmapTooltip?: string,
    isHighlighted?: boolean
): Node {
    return {
        id,
        type: 'heatmapNode',
        position: { x: 0, y: 0 },
        style: {
            padding: '8px 10px',
            borderRadius: '8px',
            background: heatmapColor || '#0f172a',
            color: '#f8fafc',
            border: isHighlighted ? '2px solid #f97316' : '1px solid #334155',
            boxShadow: isHighlighted ? '0 0 0 2px rgba(249, 115, 22, 0.6)' : undefined,
            fontSize: 11,
        },
        width: 180,
        data: {
            label,
            type,
            heatmapTooltip,
        },
    };
}

function applyFocusMode(
    records: DependencyRecord[],
    selectedNode: string | null,
    focusMode: FocusMode
): DependencyRecord[] {
    if (!selectedNode || focusMode === 'off') return records;

    const targetId = selectedNode.includes(':')
        ? selectedNode.split(':').slice(1).join(':')
        : selectedNode;
    const adjacency = new Map<string, Set<string>>();

    records.forEach(record => {
        const source = record.source_file;
        const target = record.target;
        if (!adjacency.has(source)) adjacency.set(source, new Set());
        adjacency.get(source)?.add(target);
        if (!adjacency.has(target)) adjacency.set(target, new Set());
        adjacency.get(target)?.add(source);
    });

    const maxDepth = focusMode === 'all' ? 99 : parseInt(focusMode, 10);
    const queue: Array<{ id: string; depth: number }> = [{ id: targetId, depth: 0 }];
    const visited = new Set<string>([targetId]);

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) break;
        if (current.depth >= maxDepth) continue;
        const neighbors = adjacency.get(current.id);
        if (!neighbors) continue;
        neighbors.forEach(neighbor => {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push({ id: neighbor, depth: current.depth + 1 });
            }
        });
    }

    return records.filter(record => visited.has(record.source_file) || visited.has(record.target));
}
