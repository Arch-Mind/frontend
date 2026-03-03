import React, { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, BackgroundVariant, Edge, Node, ReactFlowProvider, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';

import { dagreLayout } from './layoutAlgorithms';
import { ArchMindWebviewApiClient } from '../api/webviewClient';
import { ContributionsResponse, DependenciesResponse, DependencyRecord } from '../api/types';
import { HeatmapLegend } from './HeatmapLegend';
import { HeatmapNode } from './HeatmapNode';
import { buildHeatmap, HeatmapMode, HeatmapState, normalizePath, findHeatmapEntry } from './heatmapUtils';
import { RawEdge, RawNode } from './graphTypes';
import { getVsCodeApi } from '../utils/vscodeApi';

const edgeStyles: Record<string, { color: string; dash: string; width: number }> = {
    import: { color: '#64748b', dash: '0', width: 1.2 },
    inheritance: { color: '#8b5cf6', dash: '5 5', width: 1.5 },
    library: { color: '#f59e0b', dash: '2 2', width: 1.2 },
    data: { color: '#ef4444', dash: '0', width: 2.0 },
};

type FocusMode = 'off' | '1' | '2' | 'all';

interface FilterState {
    import: boolean;
    inheritance: boolean;
    library: boolean;
    data: boolean;
}

interface DependencyDiagramProps {
    heatmapMode: HeatmapMode;
    highlightNodeIds?: string[];
    repoId?: string | null;
    graphEngineUrl?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    architectureData?: any;
    localContributions?: ContributionsResponse | null;
}

export const DependencyDiagram: React.FC<DependencyDiagramProps> = ({
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
    const [rawData, setRawData] = useState<DependenciesResponse | null>(null);
    const [contributions, setContributions] = useState<ContributionsResponse | null>(localContributions || null);
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
        if (vscode) {
            vscode.postMessage({ command: 'requestArchitecture' });
        }

        return () => window.removeEventListener('message', handler);
    }, [vscode]);

    useEffect(() => {
        if (!repoId) return;
        let active = true;

        const load = async () => {
            try {
                setIsLoading(true);
                setError(null);

                try {
                    const response = await apiClient.getDependencies(repoId);
                    if (!active) return;
                    if (response && response.dependencies.length > 0) {
                        setRawData(response);
                    } else {
                        throw new Error('No dependencies returned from backend');
                    }
                } catch (backendError) {
                    if (!active) return;
                    console.warn('DependencyDiagram: Fallback to architectureData', backendError);

                    if (architectureData && architectureData.edges) {
                        const filePathMap = new Map<string, string>();
                        const typeMap = new Map<string, string>();

                        architectureData.nodes.forEach((n: RawNode) => {
                            filePathMap.set(n.id, n.filePath || n.id);
                            typeMap.set(n.id, n.type);
                        });

                        const derived: DependencyRecord[] = architectureData.edges
                            .filter((e: RawEdge) => ['imports', 'calls', 'inheritance'].includes(e.type))
                            .map((e: RawEdge) => {
                                const targetId = e.target;
                                const targetType = typeMap.get(targetId) || 'File';

                                return {
                                    source_file: filePathMap.get(e.source) || e.source,
                                    source_language: 'typescript',
                                    target: filePathMap.get(targetId) || targetId,
                                    target_type: targetType.charAt(0).toUpperCase() + targetType.slice(1),
                                    relationship: e.type === 'inheritance' ? 'INHERITS' :
                                        e.type === 'calls' ? 'CALLS' : 'IMPORTS',
                                    relationship_properties: {}
                                };
                            });

                        setRawData({
                            dependencies: derived,
                            total_dependencies: derived.length,
                            repo_id: repoId
                        });
                    } else {
                        throw backendError;
                    }
                }
            } catch (err) {
                if (!active) return;
                setError(err instanceof Error ? err.message : 'Failed to load dependencies');
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

    useEffect(() => {
        if (!rawData) return;

        let records = rawData.dependencies.filter(record => filters[getDependencyCategory(record)]);
        records = applyFocusMode(records, selectedNode, focusMode);

        const nodeMap = new Map<string, Node>();
        const edgeMap = new Map<string, { source: string; target: string; category: keyof FilterState; count: number }>();

        records.forEach(record => {
            const sourceId = `file:${record.source_file}`;
            const targetId = `${record.target_type}:${record.target}`;
            const category = getDependencyCategory(record);

            if (!nodeMap.has(sourceId)) {
                const heatmap = findHeatmapEntry(heatmapState, record.source_file);
                const highlighted = highlightSet.has(normalizePath(record.source_file));
                nodeMap.set(sourceId, createNode(sourceId, record.source_file, 'File', heatmap?.color, heatmap?.tooltip, highlighted));
            }
            if (!nodeMap.has(targetId)) {
                const isFile = record.target_type === 'File';
                const heatmap = isFile ? findHeatmapEntry(heatmapState, record.target) : undefined;
                const highlighted = isFile ? highlightSet.has(normalizePath(record.target)) : false;
                nodeMap.set(targetId, createNode(targetId, record.target, record.target_type, heatmap?.color, heatmap?.tooltip, highlighted));
            }

            const key = `${sourceId}|${targetId}|${category}`;
            const existing = edgeMap.get(key);
            if (existing) existing.count++;
            else edgeMap.set(key, { source: sourceId, target: targetId, category, count: 1 });
        });

        const nodeList = Array.from(nodeMap.values());
        const edgeList: Edge[] = Array.from(edgeMap.entries()).map(([key, edge]) => {
            const style = edgeStyles[edge.category];
            return {
                id: key,
                source: edge.source,
                target: edge.target,
                label: edge.count > 1 ? `${edge.count} ${edge.category}` : edge.category,
                style: {
                    stroke: style.color,
                    strokeWidth: style.width,
                    strokeDasharray: style.dash,
                },
                labelStyle: { fill: style.color, fontSize: 10 },
                markerEnd: { type: MarkerType.ArrowClosed, color: style.color },
            };
        });

        // Dagre layout
        const layoutNodes = nodeList.map(n => ({ id: n.id, width: 220, height: 60 }));
        const { nodes: positions } = dagreLayout(layoutNodes, edgeList.map(e => ({ id: e.id, source: e.source, target: e.target })), 'LR');

        const layoutedNodes = nodeList.map(node => ({
            ...node,
            position: positions.get(node.id) || { x: 0, y: 0 }
        }));

        setNodes(layoutedNodes);
        setEdges(edgeList);
    }, [rawData, filters, focusMode, selectedNode, heatmapState, highlightSet]);

    return (
        <div className="diagram-container">
            <div className="diagram-header">
                <div>
                    <h2>Dependency Diagram</h2>
                    <p>Visualizing relationships and dependencies across the codebase.</p>
                </div>
                <div className="diagram-filters">
                    {(Object.keys(filters) as (keyof FilterState)[]).map(key => (
                        <label key={key}>
                            <input
                                type="checkbox"
                                checked={filters[key]}
                                onChange={() => setFilters(prev => ({ ...prev, [key]: !prev[key] }))}
                            />
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                        </label>
                    ))}
                </div>
                <div className="diagram-filters focus-options">
                    <span>Focus Depth:</span>
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
            {!isLoading && !error && !repoId && <div className="diagram-state">Missing context.</div>}

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
                            onPaneClick={() => setSelectedNode(null)}
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
    if (record.target_type === 'Library') return 'library';
    return 'import';
}

function createNode(id: string, label: string, type: string, heatmapColor?: string, heatmapTooltip?: string, isHighlighted?: boolean): Node {
    return {
        id,
        type: 'heatmapNode',
        data: { label, type, heatmapTooltip },
        position: { x: 0, y: 0 },
        style: {
            padding: '10px',
            borderRadius: '9px',
            background: heatmapColor || '#0f172a',
            color: '#f8fafc',
            border: isHighlighted ? '2px solid #f97316' : '1px solid #334155',
            boxShadow: isHighlighted ? '0 0 10px rgba(249, 115, 22, 0.4)' : undefined,
            fontSize: 12,
        },
        width: 220,
    };
}

function applyFocusMode(records: DependencyRecord[], selectedNode: string | null, mode: FocusMode): DependencyRecord[] {
    if (!selectedNode || mode === 'off') return records;

    const target = selectedNode.includes(':') ? selectedNode.split(':').slice(1).join(':') : selectedNode;
    const adj = new Map<string, Set<string>>();
    records.forEach(r => {
        if (!adj.has(r.source_file)) adj.set(r.source_file, new Set());
        adj.get(r.source_file)?.add(r.target);
        if (!adj.has(r.target)) adj.set(r.target, new Set());
        adj.get(r.target)?.add(r.source_file);
    });

    const depthLimit = mode === 'all' ? 99 : parseInt(mode, 10);
    const visited = new Set<string>([target]);
    const queue: { id: string; d: number }[] = [{ id: target, d: 0 }];

    while (queue.length > 0) {
        const { id, d } = queue.shift()!;
        if (d >= depthLimit) continue;
        adj.get(id)?.forEach(n => {
            if (!visited.has(n)) {
                visited.add(n);
                queue.push({ id: n, d: d + 1 });
            }
        });
    }

    return records.filter(r => visited.has(r.source_file) || visited.has(r.target));
}
