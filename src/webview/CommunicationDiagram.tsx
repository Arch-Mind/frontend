import React, { useEffect, useMemo, useState } from 'react';
import ReactFlow, {
    Background,
    BackgroundVariant,
    Edge,
    MarkerType,
    Node,
    ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { elkLayout } from './layoutAlgorithms';
import { ArchMindWebviewApiClient } from '../api/webviewClient';
import { CommunicationResponse, ContributionsResponse } from '../api/types';
import { HeatmapLegend } from './HeatmapLegend';
import { HeatmapNode } from './HeatmapNode';
import { buildHeatmap, HeatmapMode, HeatmapState, normalizePath } from './heatmapUtils';
import { getVsCodeApi } from './vscode-api';

interface FilterState {
    http: boolean;
    rpc: boolean;
    queues: boolean;
    compose: boolean;
}

interface EdgeDetails {
    type: 'http' | 'rpc' | 'queue';
    label: string;
    meta: string[];
}

interface CommunicationDiagramProps {
    heatmapMode: HeatmapMode;
    highlightNodeIds?: string[];
}

export const CommunicationDiagram: React.FC<CommunicationDiagramProps> = ({ heatmapMode, highlightNodeIds = [] }) => {
    const vscode = useMemo(() => getVsCodeApi(), []);
    const apiClient = useMemo(() => new ArchMindWebviewApiClient(), []);

    const [repoId, setRepoId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<CommunicationResponse | null>(null);
    const [contributions, setContributions] = useState<ContributionsResponse | null>(null);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [edgeDetails, setEdgeDetails] = useState<EdgeDetails | null>(null);
    const [apiFlowMode, setApiFlowMode] = useState(false);
    const [flowEntry, setFlowEntry] = useState<string>('');

    const [filters, setFilters] = useState<FilterState>({
        http: true,
        rpc: true,
        queues: true,
        compose: true,
    });

    const [initialLoading, setInitialLoading] = useState(true);

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
                setInitialLoading(false);
                const extractedRepoId = message.data?.repo_id || message.data?.repoId;
                if (extractedRepoId) {
                    setRepoId(extractedRepoId);
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

    useEffect(() => {
        if (!repoId) return;
        let active = true;

        const load = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const response = await apiClient.getCommunication(repoId);
                if (!active) return;
                setData(response);
            } catch (err) {
                if (!active) return;
                setError(err instanceof Error ? err.message : 'Failed to load communication data');
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

    useEffect(() => {
        if (!data) return;

        const nodeMap = new Map<string, Node>();
        const edgeList: Edge[] = [];

        const composeServices = data.compose_services || [];
        const composeNames = composeServices.map(service => service.name);
        if (!flowEntry && composeNames.length > 0) {
            const preferred = composeNames.find(name => name.toLowerCase().includes('gateway')) || composeNames[0];
            setFlowEntry(preferred);
        }

        if (filters.compose) {
            composeServices.forEach(service => {
                const serviceId = `service:${service.name}`;
                nodeMap.set(
                    serviceId,
                    createNode(serviceId, `${service.name} (${service.ports.join(', ') || 'no ports'})`, 'service')
                );
            });
        }

        if (filters.http) {
            data.endpoints.forEach(endpoint => {
                const endpointId = `endpoint:${endpoint.method}:${endpoint.url}`;
                nodeMap.set(endpointId, createNode(endpointId, `${endpoint.method} ${endpoint.url}`, 'endpoint'));

                endpoint.callers.forEach(caller => {
                    const fileId = `file:${caller}`;
                    const heatmap = heatmapState.entries.get(normalizePath(caller));
                    const isHighlighted = highlightSet.has(normalizePath(caller));
                    nodeMap.set(
                        fileId,
                        createNode(fileId, caller, 'file', heatmap?.color, heatmap?.tooltip, isHighlighted)
                    );

                    edgeList.push(createEdge({
                        id: `${fileId}->${endpointId}`,
                        source: fileId,
                        target: endpointId,
                        type: 'http',
                        label: '→',
                        details: [`${endpoint.method} ${endpoint.url}`],
                    }));
                });

                endpoint.services.forEach(service => {
                    const serviceId = `service:${service}`;
                    nodeMap.set(serviceId, createNode(serviceId, service, 'service'));

                    edgeList.push(createEdge({
                        id: `${endpointId}->${serviceId}`,
                        source: endpointId,
                        target: serviceId,
                        type: 'http',
                        label: '→',
                        details: [`${endpoint.method} ${endpoint.url}`],
                    }));
                });
            });
        }

        if (filters.rpc) {
            data.rpc_services.forEach(service => {
                const rpcId = `rpc:${service.name}`;
                nodeMap.set(rpcId, createNode(rpcId, service.name, 'rpc'));
                service.callers.forEach(caller => {
                    const callerId = `file:${caller}`;
                    const heatmap = heatmapState.entries.get(normalizePath(caller));
                    const isHighlighted = highlightSet.has(normalizePath(caller));
                    nodeMap.set(
                        callerId,
                        createNode(callerId, caller, 'file', heatmap?.color, heatmap?.tooltip, isHighlighted)
                    );
                    edgeList.push(createEdge({
                        id: `${callerId}->${rpcId}`,
                        source: callerId,
                        target: rpcId,
                        type: 'rpc',
                        label: '⇒',
                        details: [`RPC service: ${service.name}`],
                    }));
                });
            });
        }

        if (filters.queues) {
            data.queues.forEach(queue => {
                const queueId = `queue:${queue.topic}`;
                nodeMap.set(queueId, createNode(queueId, queue.topic, 'queue'));
                queue.publishers.forEach(pub => {
                    const pubId = `file:${pub}`;
                    const heatmap = heatmapState.entries.get(normalizePath(pub));
                    const isHighlighted = highlightSet.has(normalizePath(pub));
                    nodeMap.set(
                        pubId,
                        createNode(pubId, pub, 'file', heatmap?.color, heatmap?.tooltip, isHighlighted)
                    );
                    edgeList.push(createEdge({
                        id: `${pubId}->${queueId}`,
                        source: pubId,
                        target: queueId,
                        type: 'queue',
                        label: '⇄',
                        details: [`Queue topic: ${queue.topic}`, `Publisher: ${pub}`],
                        bidirectional: true,
                    }));
                });
                queue.consumers.forEach(con => {
                    const conId = `file:${con}`;
                    const heatmap = heatmapState.entries.get(normalizePath(con));
                    const isHighlighted = highlightSet.has(normalizePath(con));
                    nodeMap.set(
                        conId,
                        createNode(conId, con, 'file', heatmap?.color, heatmap?.tooltip, isHighlighted)
                    );
                    edgeList.push(createEdge({
                        id: `${queueId}->${conId}`,
                        source: queueId,
                        target: conId,
                        type: 'queue',
                        label: '⇄',
                        details: [`Queue topic: ${queue.topic}`, `Consumer: ${con}`],
                        bidirectional: true,
                    }));
                });
            });
        }

        let filteredNodes = Array.from(nodeMap.values());
        let filteredEdges = edgeList;

        if (apiFlowMode && flowEntry) {
            const entryId = `service:${flowEntry}`;
            const reachable = collectReachableNodes(entryId, edgeList);
            filteredNodes = filteredNodes.filter(node => reachable.has(node.id));
            filteredEdges = edgeList.filter(edge => reachable.has(edge.source) && reachable.has(edge.target));
        }

        const layoutNodes = filteredNodes.map(node => ({ id: node.id, width: 200, height: 50 }));
        const layoutEdges = filteredEdges.map(edge => ({ id: edge.id, source: edge.source, target: edge.target }));

        const applyLayout = async () => {
            const { nodes: positions } = await elkLayout(layoutNodes, layoutEdges, 'force');
            const layoutedNodes = filteredNodes.map(node => ({
                ...node,
                position: positions.get(node.id) || { x: 0, y: 0 },
            }));

            setNodes(layoutedNodes);
            setEdges(filteredEdges);
        };

        applyLayout();
    }, [data, filters, heatmapState, apiFlowMode, flowEntry, highlightSet]);

    return (
        <div className="diagram-container">
            {initialLoading && (
                <div className="loading-container">
                    <div className="loading-spinner" />
                    Initializing communication diagram...
                </div>
            )}

            {!initialLoading && !repoId && !data && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                    <h3>No Repository Analyzed</h3>
                    <p style={{ opacity: 0.8, maxWidth: '400px', marginBottom: '24px' }}>
                        Run backend analysis to visualize service communication patterns.
                    </p>
                    <button
                        className="diagram-pill active"
                        onClick={() => vscode.postMessage({ command: 'analyzeRepository' })}
                    >
                        Analyze Repository
                    </button>
                </div>
            )}

            {!initialLoading && (repoId || data) && (
                <>
                    <div className="diagram-header">
                        <div>
                            <h2>Communication Diagram</h2>
                            <p>Service calls across HTTP, RPC, and queues with compose boundaries.</p>
                        </div>
                        <div className="diagram-filters">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={filters.http}
                                    onChange={() => setFilters(prev => ({ ...prev, http: !prev.http }))}
                                />
                                HTTP
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={filters.rpc}
                                    onChange={() => setFilters(prev => ({ ...prev, rpc: !prev.rpc }))}
                                />
                                RPC
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={filters.queues}
                                    onChange={() => setFilters(prev => ({ ...prev, queues: !prev.queues }))}
                                />
                                Queue
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={filters.compose}
                                    onChange={() => setFilters(prev => ({ ...prev, compose: !prev.compose }))}
                                />
                                Compose
                            </label>
                        </div>
                        <div className="diagram-filters">
                            <label className="diagram-toggle">
                                <input
                                    type="checkbox"
                                    checked={apiFlowMode}
                                    onChange={() => setApiFlowMode(prev => !prev)}
                                />
                                API Flow
                            </label>
                            {apiFlowMode && data?.compose_services?.length ? (
                                <select
                                    className="diagram-select"
                                    value={flowEntry}
                                    onChange={(event) => setFlowEntry(event.target.value)}
                                >
                                    {data.compose_services.map(service => (
                                        <option key={service.name} value={service.name}>
                                            {service.name}
                                        </option>
                                    ))}
                                </select>
                            ) : null}
                        </div>
                    </div>

                    {heatmapMode !== 'off' && (
                        <HeatmapLegend
                            mode={heatmapMode}
                            minMetric={heatmapState.minMetric}
                            maxMetric={heatmapState.maxMetric}
                        />
                    )}

                    {isLoading && <div className="diagram-state">Loading communication data...</div>}
                    {error && <div className="diagram-state diagram-error">{error}</div>}

                    {!isLoading && !error && nodes.length === 0 && (
                        <div className="diagram-state">
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📡</div>
                            <h3>No Communication Patterns Detected</h3>
                            <p style={{ opacity: 0.8, maxWidth: '400px', margin: '0 auto 24px' }}>
                                Analysis found no HTTP, RPC, or Queue interactions.
                            </p>
                            <button
                                className="diagram-pill active"
                                onClick={() => vscode.postMessage({ command: 'analyzeRepository' })}
                            >
                                Re-run Analysis
                            </button>
                        </div>
                    )}

                    {!isLoading && !error && nodes.length > 0 && (
                        <ReactFlowProvider>
                            <div className="diagram-flow">
                                <ReactFlow
                                    nodes={nodes}
                                    edges={edges}
                                    nodeTypes={{ heatmapNode: HeatmapNode }}
                                    fitView
                                    fitViewOptions={{ padding: 0.2 }}
                                    onEdgeClick={(_, edge) => {
                                        const details = edge.data?.details as EdgeDetails | undefined;
                                        if (details) {
                                            setEdgeDetails(details);
                                        }
                                    }}
                                >
                                    <Background variant={BackgroundVariant.Dots} gap={16} size={0.8} />
                                </ReactFlow>
                            </div>
                        </ReactFlowProvider>
                    )}

                    {edgeDetails && (
                        <div className="edge-details">
                            <div className="edge-details-header">
                                <span>{edgeDetails.label}</span>
                                <button onClick={() => setEdgeDetails(null)}>×</button>
                            </div>
                            <ul>
                                {edgeDetails.meta.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

function createNode(
    id: string,
    label: string,
    type: string,
    heatmapColor?: string,
    heatmapTooltip?: string,
    isHighlighted?: boolean
): Node {
    const styles: Record<string, React.CSSProperties> = {
        endpoint: { background: '#0ea5e9', color: '#0f172a' },
        rpc: { background: '#f472b6', color: '#0f172a' },
        queue: { background: '#f59e0b', color: '#0f172a' },
        service: { background: '#22c55e', color: '#0f172a' },
        file: { background: '#1e293b', color: '#e2e8f0' },
    };

    const baseStyle = styles[type] || styles.file;

    return {
        id,
        type: 'heatmapNode',
        data: {
            label,
            type,
            heatmapTooltip,
        },
        position: { x: 0, y: 0 },
        style: {
            padding: '8px 10px',
            borderRadius: '8px',
            border: isHighlighted ? '2px solid #f97316' : '1px solid #0f172a',
            boxShadow: isHighlighted ? '0 0 0 2px rgba(249, 115, 22, 0.6)' : undefined,
            fontSize: 11,
            background: heatmapColor || baseStyle.background,
            color: baseStyle.color,
        },
        width: 200,
    };
}

function createEdge(options: {
    id: string;
    source: string;
    target: string;
    type: 'http' | 'rpc' | 'queue';
    label: string;
    details: string[];
    bidirectional?: boolean;
}): Edge {
    const colorMap = {
        http: '#38bdf8',
        rpc: '#f472b6',
        queue: '#f59e0b',
    };

    const color = colorMap[options.type];

    return {
        id: options.id,
        source: options.source,
        target: options.target,
        label: options.label,
        labelStyle: { fill: color, fontSize: 12 },
        style: { stroke: color, strokeWidth: 1.6 },
        markerEnd: {
            type: MarkerType.ArrowClosed,
            color,
        },
        markerStart: options.bidirectional
            ? {
                type: MarkerType.ArrowClosed,
                color,
            }
            : undefined,
        data: {
            details: {
                type: options.type,
                label: options.label,
                meta: options.details,
            } as EdgeDetails,
        },
    };
}

function collectReachableNodes(entryId: string, edges: Edge[]): Set<string> {
    const adjacency = new Map<string, Set<string>>();

    edges.forEach(edge => {
        if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
        if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
        adjacency.get(edge.source)?.add(edge.target);
        adjacency.get(edge.target)?.add(edge.source);
    });

    const visited = new Set<string>();
    const queue: string[] = [entryId];
    visited.add(entryId);

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) break;
        adjacency.get(current)?.forEach(neighbor => {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        });
    }

    return visited;
}
