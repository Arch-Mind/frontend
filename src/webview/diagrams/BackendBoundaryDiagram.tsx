// src/webview/diagrams/BackendBoundaryDiagram.tsx
import React, { useMemo, useState } from "react";
import ReactFlow, {
    Background,
    BackgroundVariant,
    Controls,
    MiniMap,
    ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import type { BackendGraph } from "./backendGraphToReactFlow";
import { toReactFlowWholeGraph } from "./backendGraphToReactFlow";
import { ZoomToolbar } from "./ZoomToolbar";

function Inner({ graph }: { graph: BackendGraph | null }) {
    const [showMinimap, setShowMinimap] = useState(false);

    const { nodes, edges } = useMemo(() => {
        if (!graph) return { nodes: [], edges: [] };
        return toReactFlowWholeGraph(graph, {
            edgeFilter: (e) => e.type === "contains", // boundary edges
            // edgeCap: 300000, // optional safety cap
        });
    }, [graph]);

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
                    gap: 10,
                    alignItems: "center",
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid #334155",
                    background: "rgba(15,23,42,0.92)",
                    color: "#e5e7eb",
                }}
            >
                <span style={{ fontSize: 12, opacity: 0.9 }}>
                    Nodes: {nodes.length} • Edges: {edges.length}
                </span>
                <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
                    <input type="checkbox" checked={showMinimap} onChange={(e) => setShowMinimap(e.target.checked)} />
                    MiniMap
                </label>
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
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

export function BackendBoundaryDiagram({ graph }: { graph: BackendGraph | null }) {
    return (
        <ReactFlowProvider>
            <Inner graph={graph} />
        </ReactFlowProvider>
    );
}