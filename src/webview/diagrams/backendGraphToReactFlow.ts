// src/webview/diagrams/backendGraphToReactFlow.ts
import type { Edge as RFEdge, Node as RFNode } from "reactflow";

export type BackendNodeType = "module" | "directory" | "file" | "class" | "function";
export type BackendEdgeType = "contains" | "imports" | "calls" | "inherits";

export type BackendNode = {
    id: string;
    label: string;
    type: BackendNodeType;
    parentId?: string;
    depth?: number;
    filePath?: string;
    language?: string;
    properties?: Record<string, unknown>;
};

export type BackendEdge = {
    id: string;
    source: string;
    target: string;
    type: BackendEdgeType;
};

export type BackendGraph = {
    nodes: BackendNode[];
    edges: BackendEdge[];
    stats?: Record<string, unknown>;
    source?: string;
    repoId?: string;
};

export type LayoutOpts = {
    direction?: "LR" | "TB";
    xGap?: number;
    yGap?: number;
    nodeWidth?: number;
    nodeHeight?: number;
};

/**
 * Lightweight deterministic layout without extra deps:
 * - Builds layers by BFS from roots (in-degree == 0) on selected edges.
 * - Places nodes in columns (LR) or rows (TB).
 */
export function simpleLayerLayout(
    nodeIds: string[],
    edges: Array<{ source: string; target: string }>,
    opts: LayoutOpts = {}
): Map<string, { x: number; y: number }> {
    const direction = opts.direction ?? "LR";
    const xGap = opts.xGap ?? 60;
    const yGap = opts.yGap ?? 18;
    const w = opts.nodeWidth ?? 240;
    const h = opts.nodeHeight ?? 54;

    const inDeg = new Map<string, number>();
    const out = new Map<string, string[]>();

    for (const id of nodeIds) {
        inDeg.set(id, 0);
        out.set(id, []);
    }
    for (const e of edges) {
        if (!inDeg.has(e.source) || !inDeg.has(e.target)) continue;
        inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
        out.get(e.source)!.push(e.target);
    }

    const q: string[] = [];
    for (const id of nodeIds) {
        if ((inDeg.get(id) || 0) === 0) q.push(id);
    }
    // If everything is cyclic, just seed with all nodes (stable order)
    if (q.length === 0) q.push(...nodeIds);

    const depth = new Map<string, number>();
    for (const id of nodeIds) depth.set(id, 0);

    // Kahn-like propagation
    const inDegWork = new Map(inDeg);
    const queue = [...q];

    while (queue.length) {
        const u = queue.shift()!;
        const du = depth.get(u) || 0;
        for (const v of out.get(u) || []) {
            const dv = depth.get(v) || 0;
            if (du + 1 > dv) depth.set(v, du + 1);
            inDegWork.set(v, (inDegWork.get(v) || 0) - 1);
            if ((inDegWork.get(v) || 0) === 0) queue.push(v);
        }
    }

    const buckets = new Map<number, string[]>();
    for (const id of nodeIds) {
        const d = depth.get(id) || 0;
        if (!buckets.has(d)) buckets.set(d, []);
        buckets.get(d)!.push(id);
    }

    const dLevels = [...buckets.keys()].sort((a, b) => a - b);
    const pos = new Map<string, { x: number; y: number }>();

    for (const d of dLevels) {
        const ids = (buckets.get(d) || []).slice().sort();
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const x = direction === "LR" ? d * (w + xGap) : i * (w + xGap);
            const y = direction === "LR" ? i * (h + yGap) : d * (h + yGap);
            pos.set(id, { x, y });
        }
    }

    return pos;
}

export function makeNodeStyle(t: BackendNodeType) {
    // Keep styles inline so you can drop-in without CSS changes.
    const base = {
        padding: "8px 10px",
        borderRadius: "12px",
        border: "1px solid #334155",
        background: "#0b1220",
        color: "#e5e7eb",
        fontSize: 12,
        width: 240,
    } as const;

    if (t === "module") {
        return { ...base, border: "2px solid #22c55e", background: "rgba(34,197,94,0.10)" };
    }
    if (t === "directory") {
        return { ...base, border: "2px solid #3b82f6", background: "rgba(59,130,246,0.10)" };
    }
    if (t === "function" || t === "class") {
        return { ...base, border: "1px solid #a78bfa", background: "rgba(167,139,250,0.08)" };
    }
    return base;
}

export function toReactFlow(
    graph: BackendGraph,
    {
        nodeFilter,
        edgeFilter,
        direction = "LR",
        nodeWidth = 240,
        nodeHeight = 54,
    }: {
        nodeFilter?: (n: BackendNode) => boolean;
        edgeFilter?: (e: BackendEdge) => boolean;
        direction?: "LR" | "TB";
        nodeWidth?: number;
        nodeHeight?: number;
    } = {}
): { nodes: RFNode[]; edges: RFEdge[] } {
    const nodes0 = (graph.nodes || []).filter((n) => (nodeFilter ? nodeFilter(n) : true));
    const nodeIdSet = new Set(nodes0.map((n) => n.id));

    const edges0 = (graph.edges || [])
        .filter((e) => (edgeFilter ? edgeFilter(e) : true))
        .filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target));

    const layout = simpleLayerLayout(
        nodes0.map((n) => n.id),
        edges0.map((e) => ({ source: e.source, target: e.target })),
        { direction, nodeWidth, nodeHeight }
    );

    const rfNodes: RFNode[] = nodes0.map((n) => ({
        id: n.id,
        position: layout.get(n.id) || { x: 0, y: 0 },
        data: { label: n.label, raw: n },
        style: makeNodeStyle(n.type),
    }));

    const rfEdges: RFEdge[] = edges0.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: e.type === "calls",
        style: {
            strokeWidth: e.type === "imports" ? 1.6 : 1.2,
            stroke: e.type === "imports" ? "#94a3b8" : "#6b7280",
        },
    }));

    return { nodes: rfNodes, edges: rfEdges };
}