// src/webview/diagrams/BackendBoundaryDiagram.tsx
import React, { useMemo } from "react";
import ReactFlow, { Background, BackgroundVariant, Edge, Node } from "reactflow";
import "reactflow/dist/style.css";
import type { BackendGraph, BackendNode } from "./backendGraphToReactFlow";
import { makeNodeStyle, simpleLayerLayout } from "./backendGraphToReactFlow";

/**
 * Boundary diagram from backend graph:
 * - If backend provides Directory nodes + contains edges => use them.
 * - Else fallback: derive boundaries by top-level path segment of File IDs.
 */
function hasDirectoryNodes(g: BackendGraph) {
    return (g.nodes || []).some((n) => n.type === "directory");
}

function basename(p: string) {
    const s = (p || "").replaceAll("\\", "/");
    const parts = s.split("/");
    return parts[parts.length - 1] || s;
}

function topSegment(p: string) {
    const s = (p || "").replaceAll("\\", "/").replace(/^\/+/, "");
    const parts = s.split("/");
    return parts[0] || "root";
}

export function BackendBoundaryDiagram({ graph }: { graph: BackendGraph | null }) {
    const { nodes, edges } = useMemo(() => {
        if (!graph) return { nodes: [] as Node[], edges: [] as Edge[] };

        const boundaryNodes: Node[] = [];
        const boundaryEdges: Edge[] = [];

        if (hasDirectoryNodes(graph)) {
            // Directory boundaries: show directory -> file containment (1 hop)
            const dirs = graph.nodes.filter((n) => n.type === "directory");
            const files = graph.nodes.filter((n) => n.type === "file");
            const fileSet = new Set(files.map((f) => f.id));
            const dirSet = new Set(dirs.map((d) => d.id));

            // Build dir->file edges from contains
            const contains = graph.edges.filter((e) => e.type === "contains");
            const dirToFiles = new Map<string, string[]>();
            for (const e of contains) {
                if (dirSet.has(e.source) && fileSet.has(e.target)) {
                    if (!dirToFiles.has(e.source)) dirToFiles.set(e.source, []);
                    dirToFiles.get(e.source)!.push(e.target);
                }
            }

            // Limit: keep only directories that actually contain files
            const activeDirs = dirs
                .filter((d) => (dirToFiles.get(d.id) || []).length > 0)
                .slice()
                .sort((a, b) => (dirToFiles.get(b.id)!.length - dirToFiles.get(a.id)!.length));

            const pickedDirs = activeDirs.slice(0, 40); // keep it readable
            const pickedDirIds = new Set(pickedDirs.map((d) => d.id));

            const pickedFileIds = new Set<string>();
            for (const d of pickedDirs) {
                for (const fId of (dirToFiles.get(d.id) || []).slice(0, 20)) pickedFileIds.add(fId);
            }

            const fileById = new Map(files.map((f) => [f.id, f]));

            for (const d of pickedDirs) {
                boundaryNodes.push({
                    id: d.id,
                    position: { x: 0, y: 0 },
                    data: { label: `${basename(d.label)} (${(dirToFiles.get(d.id) || []).length})`, raw: d },
                    style: makeNodeStyle("directory"),
                });
            }

            for (const fId of pickedFileIds) {
                const f = fileById.get(fId);
                if (!f) continue;
                boundaryNodes.push({
                    id: f.id,
                    position: { x: 0, y: 0 },
                    data: { label: basename(f.label), raw: f },
                    style: makeNodeStyle("file"),
                });
            }

            for (const d of pickedDirs) {
                for (const fId of (dirToFiles.get(d.id) || []).slice(0, 20)) {
                    if (!pickedFileIds.has(fId)) continue;
                    boundaryEdges.push({
                        id: `contains:${d.id}=>${fId}`,
                        source: d.id,
                        target: fId,
                        style: { strokeWidth: 1.2, stroke: "#94a3b8" },
                    });
                }
            }

            // Layout: directory nodes as roots, files layered after
            const nodeIds = boundaryNodes.map((n) => n.id);
            const layout = simpleLayerLayout(
                nodeIds,
                boundaryEdges.map((e) => ({ source: e.source, target: e.target })),
                { direction: "LR", nodeWidth: 260, nodeHeight: 54 }
            );

            const laidNodes = boundaryNodes.map((n) => ({ ...n, position: layout.get(n.id) || { x: 0, y: 0 } }));
            return { nodes: laidNodes, edges: boundaryEdges };
        }

        // Fallback boundaries by top-level segment of file ID/path
        const files = (graph.nodes || []).filter((n) => n.type === "file");
        const bySeg = new Map<string, BackendNode[]>();
        for (const f of files) {
            const seg = topSegment(f.filePath || f.id);
            if (!bySeg.has(seg)) bySeg.set(seg, []);
            bySeg.get(seg)!.push(f);
        }

        const segs = [...bySeg.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 40);

        for (const [seg, segFiles] of segs) {
            const bId = `boundary:${seg}`;
            boundaryNodes.push({
                id: bId,
                position: { x: 0, y: 0 },
                data: { label: `${seg} (${segFiles.length})` },
                style: makeNodeStyle("directory"),
            });

            for (const f of segFiles.slice(0, 20)) {
                boundaryNodes.push({
                    id: f.id,
                    position: { x: 0, y: 0 },
                    data: { label: basename(f.label), raw: f },
                    style: makeNodeStyle("file"),
                });
                boundaryEdges.push({
                    id: `in:${bId}=>${f.id}`,
                    source: bId,
                    target: f.id,
                    style: { strokeWidth: 1.2, stroke: "#94a3b8" },
                });
            }
        }

        const nodeIds = boundaryNodes.map((n) => n.id);
        const layout = simpleLayerLayout(
            nodeIds,
            boundaryEdges.map((e) => ({ source: e.source, target: e.target })),
            { direction: "LR", nodeWidth: 260, nodeHeight: 54 }
        );

        const laidNodes = boundaryNodes.map((n) => ({ ...n, position: layout.get(n.id) || { x: 0, y: 0 } }));
        return { nodes: laidNodes, edges: boundaryEdges };
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