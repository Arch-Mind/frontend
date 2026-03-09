// src/webview/diagrams/BackendCommunicationDiagram.tsx
import React, { useEffect, useMemo, useState } from "react";
import ReactFlow, {
    Background,
    BackgroundVariant,
    Controls,
    MiniMap,
    ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import type { BackendGraph, BackendNode, BackendEdge } from "./backendGraphToReactFlow";
import { toReactFlowWholeGraph, backendNodeTypes } from "./backendGraphToReactFlow";
import { ZoomToolbar } from "./ZoomToolbar";
import { ArchMindWebviewApiClient } from "../../api/webviewClient";
import { CommunicationResponse } from "../../api/types";

interface InnerProps {
    graph: BackendGraph | null;
    repoId: string | null;
    graphEngineUrl?: string;
}

function Inner({ graph, repoId, graphEngineUrl }: InnerProps) {
    const [showMinimap, setShowMinimap] = useState(false);
    const [commData, setCommData] = useState<CommunicationResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const apiClient = useMemo(
        () => new ArchMindWebviewApiClient(graphEngineUrl || 'https://graph-engine-production-90f5.up.railway.app'),
        [graphEngineUrl]
    );

    useEffect(() => {
        if (!repoId) return;
        let active = true;
        const load = async () => {
            try {
                setIsLoading(true);
                const data = await apiClient.getCommunication(repoId);
                if (active) setCommData(data);
            } catch (err) {
                console.error("Failed to fetch rich communication data", err);
            } finally {
                if (active) setIsLoading(false);
            }
        };
        load();
        return () => { active = false; };
    }, [apiClient, repoId]);

    const mergedGraph = useMemo(() => {
        if (!graph) return null;
        if (!commData) return graph;

        // Start with existing graph nodes and edges
        const nodes = [...graph.nodes];
        const edges = [...graph.edges];
        const existingNodeIds = new Set(nodes.map(n => n.id));

        // Add HTTP Endpoints
        commData.endpoints.forEach(ep => {
            const epId = `endpoint:${ep.method}:${ep.url}`;
            if (!existingNodeIds.has(epId)) {
                nodes.push({
                    id: epId,
                    label: `${ep.method} ${ep.url}`,
                    type: "endpoint",
                });
                existingNodeIds.add(epId);
            }

            ep.callers.forEach(caller => {
                const callerId = nodes.find(n => n.filePath === caller || n.id === caller)?.id || caller;
                edges.push({
                    id: `comm-edge-${callerId}-${epId}`,
                    source: callerId,
                    target: epId,
                    type: "calls"
                });
            });

            ep.services.forEach(svc => {
                const svcId = `service:${svc}`;
                if (!existingNodeIds.has(svcId)) {
                    nodes.push({ id: svcId, label: svc, type: "service" });
                    existingNodeIds.add(svcId);
                }
                edges.push({
                    id: `comm-edge-${epId}-${svcId}`,
                    source: epId,
                    target: svcId,
                    type: "calls"
                });
            });
        });

        // Add RPC Services
        commData.rpc_services.forEach(rpc => {
            const rpcId = `rpc:${rpc.name}`;
            if (!existingNodeIds.has(rpcId)) {
                nodes.push({ id: rpcId, label: rpc.name, type: "rpc" });
                existingNodeIds.add(rpcId);
            }

            rpc.callers.forEach(caller => {
                const callerId = nodes.find(n => n.filePath === caller || n.id === caller)?.id || caller;
                edges.push({
                    id: `comm-edge-${callerId}-${rpcId}`,
                    source: callerId,
                    target: rpcId,
                    type: "calls"
                });
            });
        });

        // Add Queues
        commData.queues.forEach(q => {
            const qId = `queue:${q.topic}`;
            if (!existingNodeIds.has(qId)) {
                nodes.push({ id: qId, label: q.topic, type: "queue" });
                existingNodeIds.add(qId);
            }

            q.publishers.forEach(pub => {
                const pubId = nodes.find(n => n.filePath === pub || n.id === pub)?.id || pub;
                edges.push({
                    id: `comm-edge-${pubId}-${qId}`,
                    source: pubId,
                    target: qId,
                    type: "calls"
                });
            });

            q.consumers.forEach(con => {
                const conId = nodes.find(n => n.filePath === con || n.id === con)?.id || con;
                edges.push({
                    id: `comm-edge-${qId}-${conId}`,
                    source: qId,
                    target: conId,
                    type: "calls"
                });
            });
        });

        return { ...graph, nodes, edges };
    }, [graph, commData]);

    const { nodes, edges } = useMemo(() => {
        if (!mergedGraph) return { nodes: [], edges: [] };
        return toReactFlowWholeGraph(mergedGraph, {
            edgeFilter: (e) => e.type === "calls" || e.type === "imports",
            filterOrphans: true,
        });
    }, [mergedGraph]);

    if (!graph) return <div style={{ padding: 12 }}>No backend graph loaded yet.</div>;

    return (
        <div style={{ height: "calc(100vh - 80px)", position: "relative" }}>
            <ZoomToolbar fitPadding={0.05} minZoom={0.03} maxZoom={3} />

            <div
                style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    zIndex: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid #334155",
                    background: "rgba(15,23,42,0.92)",
                    color: "#e5e7eb",
                }}
            >
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Communication Diagram</span>
                    {isLoading && <span style={{ fontSize: 11, opacity: 0.7 }}>Updating signals...</span>}
                </div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>
                    Nodes: {nodes.length} • Edges: {edges.length}
                </div>
                <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, marginTop: 4, cursor: "pointer" }}>
                    <input type="checkbox" checked={showMinimap} onChange={(e) => setShowMinimap(e.target.checked)} />
                    Show MiniMap
                </label>
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={backendNodeTypes}
                fitView
                onlyRenderVisibleElements
                nodesDraggable={false}
                nodesConnectable={false}
                panOnDrag
                zoomOnScroll
                zoomOnPinch
                zoomOnDoubleClick
                minZoom={0.03}
                maxZoom={3}
            >
                {showMinimap && <MiniMap />}
                <Controls />
                <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
            </ReactFlow>
        </div>
    );
}

export function BackendCommunicationDiagram({
    graph,
    repoId,
    graphEngineUrl
}: {
    graph: BackendGraph | null;
    repoId: string | null;
    graphEngineUrl?: string;
}) {
    return (
        <ReactFlowProvider>
            <Inner graph={graph} repoId={repoId} graphEngineUrl={graphEngineUrl} />
        </ReactFlowProvider>
    );
}