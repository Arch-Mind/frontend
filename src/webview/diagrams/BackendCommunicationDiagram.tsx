// src/webview/diagrams/BackendCommunicationDiagram.tsx
import React, { useMemo } from "react";
import ReactFlow, { Background, BackgroundVariant } from "reactflow";
import "reactflow/dist/style.css";
import type { BackendGraph } from "./backendGraphToReactFlow";
import { toReactFlow } from "./backendGraphToReactFlow";

/**
 * Communication diagram (from backend graph):
 * - Show Module nodes and their IMPORTS edges between modules (if present),
 *   otherwise show Module -> File imports as "communication".
 */
export function BackendCommunicationDiagram({ graph }: { graph: BackendGraph | null }) {
    const { nodes, edges } = useMemo(() => {
        if (!graph) return { nodes: [], edges: [] };

        const hasModules = graph.nodes.some((n) => n.type === "module");
        if (!hasModules) {
            // Nothing meaningful to show as "communication"
            return toReactFlow(graph, {
                nodeFilter: (n) => n.type === "file",
                edgeFilter: (e) => e.type === "imports",
                direction: "LR",
                nodeWidth: 260,
                nodeHeight: 54,
            });
        }

        // Prefer module-only graph if possible
        const moduleIds = new Set(graph.nodes.filter((n) => n.type === "module").map((n) => n.id));
        const hasModuleToModuleImports = graph.edges.some(
            (e) => e.type === "imports" && moduleIds.has(e.source) && moduleIds.has(e.target)
        );

        if (hasModuleToModuleImports) {
            return toReactFlow(graph, {
                nodeFilter: (n) => n.type === "module",
                edgeFilter: (e) => e.type === "imports",
                direction: "LR",
                nodeWidth: 280,
                nodeHeight: 56,
            });
        }

        // Otherwise: module + file nodes with module/file import edges
        return toReactFlow(graph, {
            nodeFilter: (n) => n.type === "module" || n.type === "file",
            edgeFilter: (e) => e.type === "imports",
            direction: "LR",
            nodeWidth: 280,
            nodeHeight: 56,
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