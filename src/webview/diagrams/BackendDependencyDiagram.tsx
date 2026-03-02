// src/webview/diagrams/BackendDependencyDiagram.tsx
import React, { useMemo } from "react";
import ReactFlow, { Background, BackgroundVariant } from "reactflow";
import "reactflow/dist/style.css";
import type { BackendGraph } from "./backendGraphToReactFlow";
import { toReactFlow } from "./backendGraphToReactFlow";

export function BackendDependencyDiagram({ graph }: { graph: BackendGraph | null }) {
    const { nodes, edges } = useMemo(() => {
        if (!graph) return { nodes: [], edges: [] };

        // "Dependency diagram": File <-> File imports + Module imports
        // Keep files + modules; collapse functions/classes to reduce noise.
        return toReactFlow(graph, {
            nodeFilter: (n) => n.type === "file" || n.type === "module",
            edgeFilter: (e) => e.type === "imports",
            direction: "LR",
            nodeWidth: 260,
            nodeHeight: 54,
        });
    }, [graph]);

    if (!graph) return <div style={{ padding: 12 }}>No backend graph loaded yet.</div>;

    return (
        <div style={{ height: "calc(100vh - 80px)" }}>
            <ReactFlow nodes={nodes} edges={edges} fitView>
                <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
            </ReactFlow>
        </div>
    );
}