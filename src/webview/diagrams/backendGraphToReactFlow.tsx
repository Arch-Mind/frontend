// src/webview/diagrams/backendGraphToReactFlow.ts
import React from "react";
import {
    Edge as RFEdge,
    Node as RFNode,
    Viewport,
    Handle,
    Position,
    NodeProps,
    MarkerType
} from "reactflow";

export type BackendNodeType = "module" | "directory" | "file" | "class" | "function" | "endpoint" | "rpc" | "queue" | "service";
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

const typeIcons: Record<string, string> = {
    service: "📦",
    endpoint: "🌐",
    rpc: "🔌",
    queue: "📥",
    module: "📂",
    directory: "📁",
    file: "📄",
    class: "🏛️",
    function: "ƒ",
};

export const BackendNodeComponent: React.FC<NodeProps<{ label: string; raw: BackendNode }>> = ({ data }) => {
    const t = data.raw.type;
    const icon = typeIcons[t] || "•";

    return (
        <div className= {`backend-node-v2 node-type-${t}`
}>
    <Handle type="target" position = { Position.Top } style = {{ visibility: "hidden" }} />
        < div className = "node-icon" > { icon } </div>
            < div className = "node-content" >
                <div className="node-label" > { data.label } </div>
                    < div className = "node-type-label" > { t } </div>
                        </div>
                        < Handle type = "source" position = { Position.Bottom } style = {{ visibility: "hidden" }} />
                            </div>
    );
};

export const backendNodeTypes = {
    backendNode: BackendNodeComponent,
};

export function makeNodeStyle(t: BackendNodeType) {
    return {
        padding: 0,
        borderRadius: "12px",
        background: "transparent",
        border: "none",
        width: 240,
    };
}

function hash32(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

export function fastGridLayout(
    nodes: BackendNode[],
    {
        colWidth = 280,
        rowHeight = 100,
        columnsPerBand = 15,
        bandGap = 150,
    }: {
        colWidth?: number;
        rowHeight?: number;
        columnsPerBand?: number;
        bandGap?: number;
    } = {}
): Map<string, { x: number; y: number }> {
    const bands: Record<string, BackendNode[]> = {
        service: [],
        endpoint: [],
        rpc: [],
        queue: [],
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

    const bandOrder: BackendNodeType[] = ["service", "endpoint", "rpc", "queue", "module", "directory", "file", "class", "function"];
    const pos = new Map<string, { x: number; y: number }>();

    let yOffset = 0;
    for (const band of bandOrder) {
        const arr = bands[band] || [];
        if (arr.length === 0) continue;

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
        filterOrphans,
    }: {
        nodeFilter?: (n: BackendNode) => boolean;
        edgeFilter?: (e: BackendEdge) => boolean;
        edgeCap?: number;
        filterOrphans?: boolean;
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

    let finalNodes = nodes0;
    if (filterOrphans) {
        const activeNodeIds = new Set<string>();
        edges0.forEach(e => {
            activeNodeIds.add(e.source);
            activeNodeIds.add(e.target);
        });
        finalNodes = nodes0.filter(n => activeNodeIds.has(n.id));
    }

    let positionedCount = 0;
    for (const n of finalNodes) {
        if (n.position || (typeof n.x === "number" && typeof n.y === "number")) positionedCount++;
    }
    const useBackendPos = positionedCount / Math.max(finalNodes.length, 1) > 0.6;
    const grid = useBackendPos ? null : fastGridLayout(finalNodes);

    const rfNodes: RFNode[] = finalNodes.map((n) => {
        const p =
            n.position ??
            (typeof n.x === "number" && typeof n.y === "number" ? { x: n.x, y: n.y } : null) ??
            grid?.get(n.id) ??
            { x: 0, y: 0 };

        return {
            id: n.id,
            position: p,
            type: "backendNode",
            data: { label: n.label, raw: n },
            style: makeNodeStyle(n.type),
        };
    });

    const rfEdges: RFEdge[] = edges0.map((e) => {
        const isComm = e.type === "calls" || e.type === "imports";
        return {
            id: e.id,
            source: e.source,
            target: e.target,
            animated: isComm,
            type: "smoothstep",
            style: {
                strokeWidth: isComm ? 2 : 1,
                stroke: e.type === "imports" ? "#94a3b8" : isComm ? "#38bdf8" : "#6b7280",
            },
            markerEnd: isComm ? {
                type: MarkerType.ArrowClosed,
                color: "#38bdf8",
            } : undefined,
        };
    });

    return { nodes: rfNodes, edges: rfEdges };
}