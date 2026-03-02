// src/webview/diagrams/backendGraphToReactFlow.ts
import type { Edge as RFEdge, Node as RFNode, Viewport } from "reactflow";

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

    // If backend sends positions, we use them
    x?: number;
    y?: number;
    position?: { x: number; y: number };

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
    repo_id?: string;
};

export function makeNodeStyle(t: BackendNodeType) {
    const base = {
        padding: "8px 10px",
        borderRadius: "12px",
        border: "1px solid #334155",
        background: "#0b1220",
        color: "#e5e7eb",
        fontSize: 12,
        width: 240,
    } as const;

    if (t === "module") return { ...base, border: "2px solid #22c55e", background: "rgba(34,197,94,0.10)" };
    if (t === "directory") return { ...base, border: "2px solid #3b82f6", background: "rgba(59,130,246,0.10)" };
    if (t === "function" || t === "class")
        return { ...base, border: "1px solid #a78bfa", background: "rgba(167,139,250,0.08)" };
    return base;
}

function hash32(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/**
 * Fast deterministic grid layout that scales to huge graphs.
 * Bands by node.type to keep some structure.
 */
export function fastGridLayout(
    nodes: BackendNode[],
    {
        colWidth = 280,
        rowHeight = 70,
        columnsPerBand = 40,
        bandGap = 220,
    }: {
        colWidth?: number;
        rowHeight?: number;
        columnsPerBand?: number;
        bandGap?: number;
    } = {}
): Map<string, { x: number; y: number }> {
    const bands: Record<string, BackendNode[]> = {
        module: [],
        directory: [],
        file: [],
        class: [],
        function: [],
    };

    for (const n of nodes) (bands[n.type] || (bands[n.type] = [])).push(n);

    for (const k of Object.keys(bands)) {
        bands[k].sort((a, b) => hash32(a.id) - hash32(b.id));
    }

    const bandOrder: BackendNodeType[] = ["module", "directory", "file", "class", "function"];
    const pos = new Map<string, { x: number; y: number }>();

    let yOffset = 0;
    for (const band of bandOrder) {
        const arr = bands[band] || [];
        for (let i = 0; i < arr.length; i++) {
            const col = i % columnsPerBand;
            const row = Math.floor(i / columnsPerBand);
            pos.set(arr[i].id, { x: col * colWidth, y: yOffset + row * rowHeight });
        }
        const rows = Math.ceil(arr.length / columnsPerBand);
        yOffset += rows * rowHeight + bandGap;
    }

    return pos;
}

export function toReactFlowWholeGraph(
    graph: BackendGraph,
    {
        nodeFilter,
        edgeFilter,
        edgeCap,
    }: {
        nodeFilter?: (n: BackendNode) => boolean;
        edgeFilter?: (e: BackendEdge) => boolean;
        edgeCap?: number;
    } = {}
): { nodes: RFNode[]; edges: RFEdge[]; initialViewport?: Viewport } {
    const nodes0 = (graph.nodes || []).filter((n) => (nodeFilter ? nodeFilter(n) : true));
    const nodeSet = new Set(nodes0.map((n) => n.id));

    let edges0 = (graph.edges || [])
        .filter((e) => (edgeFilter ? edgeFilter(e) : true))
        .filter((e) => nodeSet.has(e.source) && nodeSet.has(e.target));

    if (typeof edgeCap === "number" && edgeCap > 0 && edges0.length > edgeCap) {
        edges0 = edges0
            .slice()
            .sort((a, b) => hash32(a.id) - hash32(b.id))
            .slice(0, edgeCap);
    }

    let positionedCount = 0;
    for (const n of nodes0) {
        if (n.position || (typeof n.x === "number" && typeof n.y === "number")) positionedCount++;
    }
    const useBackendPos = positionedCount / Math.max(nodes0.length, 1) > 0.6;
    const grid = useBackendPos ? null : fastGridLayout(nodes0);

    const rfNodes: RFNode[] = nodes0.map((n) => {
        const p =
            n.position ??
            (typeof n.x === "number" && typeof n.y === "number" ? { x: n.x, y: n.y } : null) ??
            grid?.get(n.id) ??
            { x: 0, y: 0 };

        return {
            id: n.id,
            position: p,
            data: { label: n.label, raw: n },
            style: makeNodeStyle(n.type),
        };
    });

    const rfEdges: RFEdge[] = edges0.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: false,
        type: "straight", // ✅ straight line edges
        style: {
            strokeWidth: 1,
            stroke: e.type === "imports" ? "#94a3b8" : "#6b7280",
        },
    }));

    return { nodes: rfNodes, edges: rfEdges };
}