import React, { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, BackgroundVariant, Edge, Node, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';

import { dagreLayout } from './layoutAlgorithms';
import { ArchMindWebviewApiClient } from '../api/webviewClient';
import { CommunicationResponse } from '../api/types';

declare function acquireVsCodeApi(): {
    postMessage(message: unknown): void;
    getState(): unknown;
    setState(state: unknown): void;
};

interface FilterState {
    http: boolean;
    rpc: boolean;
    queues: boolean;
    compose: boolean;
}

export const ServiceCommunicationDiagram: React.FC = () => {
    const vscode = useMemo(() => acquireVsCodeApi(), []);
    const apiClient = useMemo(() => new ArchMindWebviewApiClient(), []);

    const [repoId, setRepoId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<CommunicationResponse | null>(null);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    const [filters, setFilters] = useState<FilterState>({
        http: true,
        rpc: true,
        queues: true,
        compose: true,
    });

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
        if (!data) return;

        const nodeMap = new Map<string, Node>();
        const edgeList: Edge[] = [];

        if (filters.http) {
            data.endpoints.forEach(endpoint => {
                const endpointId = `endpoint:${endpoint.method}:${endpoint.url}`;
                nodeMap.set(endpointId, createNode(endpointId, `${endpoint.method} ${endpoint.url}`, 'endpoint'));

                endpoint.services.forEach(service => {
                    const serviceId = `compose:${service}`;
                    nodeMap.set(serviceId, createNode(serviceId, service, 'compose'));
                    edgeList.push({
                        id: `${endpointId}->${serviceId}`,
                        source: endpointId,
                        target: serviceId,
                        style: { stroke: '#38bdf8', strokeWidth: 1.4 },
                    });
                });
            });
        }

        if (filters.rpc) {
            data.rpc_services.forEach(service => {
                const rpcId = `rpc:${service.name}`;
                nodeMap.set(rpcId, createNode(rpcId, service.name, 'rpc'));
                service.callers.forEach(caller => {
                    const callerId = `file:${caller}`;
                    nodeMap.set(callerId, createNode(callerId, caller, 'file'));
                    edgeList.push({
                        id: `${callerId}->${rpcId}`,
                        source: callerId,
                        target: rpcId,
                        style: { stroke: '#f472b6', strokeWidth: 1.4 },
                    });
                });
            });
        }

        if (filters.queues) {
            data.queues.forEach(queue => {
                const queueId = `queue:${queue.topic}`;
                nodeMap.set(queueId, createNode(queueId, queue.topic, 'queue'));
                queue.publishers.forEach(pub => {
                    const pubId = `file:${pub}`;
                    nodeMap.set(pubId, createNode(pubId, pub, 'file'));
                    edgeList.push({
                        id: `${pubId}->${queueId}`,
                        source: pubId,
                        target: queueId,
                        style: { stroke: '#f59e0b', strokeWidth: 1.4 },
                    });
                });
                queue.consumers.forEach(con => {
                    const conId = `file:${con}`;
                    nodeMap.set(conId, createNode(conId, con, 'file'));
                    edgeList.push({
                        id: `${queueId}->${conId}`,
                        source: queueId,
                        target: conId,
                        style: { stroke: '#10b981', strokeWidth: 1.4 },
                    });
                });
            });
        }

        if (filters.compose) {
            data.compose_services.forEach(service => {
                const serviceId = `compose:${service.name}`;
                nodeMap.set(serviceId, createNode(serviceId, `${service.name} (${service.ports.join(', ')})`, 'compose'));
            });
        }

        const nodeList = Array.from(nodeMap.values());
        const layoutNodes = nodeList.map(node => ({ id: node.id, width: 200, height: 50 }));
        const layoutEdges = edgeList.map(edge => ({ id: edge.id, source: edge.source, target: edge.target }));
        const { nodes: positions } = dagreLayout(layoutNodes, layoutEdges, 'TB');

        const layoutedNodes = nodeList.map(node => ({
            ...node,
            position: positions.get(node.id) || { x: 0, y: 0 },
        }));

        setNodes(layoutedNodes);
        setEdges(edgeList);
    }, [data, filters]);

    return (
        <div className="diagram-container">
            <div className="diagram-header">
                <div>
                    <h2>Service Communication</h2>
                    <p>HTTP endpoints, RPC services, queues, and compose services.</p>
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
                        Queues
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
            </div>

            {isLoading && <div className="diagram-state">Loading communication data...</div>}
            {error && <div className="diagram-state diagram-error">{error}</div>}

            {!isLoading && !error && (
                <ReactFlowProvider>
                    <div className="diagram-flow">
                        <ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.2 }}>
                            <Background variant={BackgroundVariant.Dots} gap={16} size={0.8} />
                        </ReactFlow>
                    </div>
                </ReactFlowProvider>
            )}
        </div>
    );
};

function createNode(id: string, label: string, type: string): Node {
    const styles: Record<string, React.CSSProperties> = {
        endpoint: { background: '#0ea5e9', color: '#0f172a' },
        rpc: { background: '#f472b6', color: '#0f172a' },
        queue: { background: '#f59e0b', color: '#0f172a' },
        compose: { background: '#22c55e', color: '#0f172a' },
        file: { background: '#1e293b', color: '#e2e8f0' },
    };

    return {
        id,
        data: { label, type },
        position: { x: 0, y: 0 },
        style: {
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid #0f172a',
            fontSize: 11,
            ...(styles[type] || styles.file),
        },
        width: 200,
    };
}
