"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backendNodeTypes = exports.BackendNodeComponent = void 0;
exports.makeNodeStyle = makeNodeStyle;
exports.fastGridLayout = fastGridLayout;
exports.toReactFlowWholeGraph = toReactFlowWholeGraph;
// src/webview/diagrams/backendGraphToReactFlow.ts
const react_1 = __importDefault(require("react"));
const reactflow_1 = require("reactflow");
const typeIcons = {
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
const BackendNodeComponent = ({ data }) => {
    const t = data.raw.type;
    const icon = typeIcons[t] || "•";
    return (react_1.default.createElement("div", { className: `backend-node-v2 node-type-${t}` },
        react_1.default.createElement(reactflow_1.Handle, { type: "target", position: reactflow_1.Position.Top, style: { visibility: "hidden" } }),
        react_1.default.createElement("div", { className: "node-icon" },
            " ",
            icon,
            " "),
        react_1.default.createElement("div", { className: "node-content" },
            react_1.default.createElement("div", { className: "node-label" },
                " ",
                data.label,
                " "),
            react_1.default.createElement("div", { className: "node-type-label" },
                " ",
                t,
                " ")),
        react_1.default.createElement(reactflow_1.Handle, { type: "source", position: reactflow_1.Position.Bottom, style: { visibility: "hidden" } })));
};
exports.BackendNodeComponent = BackendNodeComponent;
exports.backendNodeTypes = {
    backendNode: exports.BackendNodeComponent,
};
function makeNodeStyle(t) {
    return {
        padding: 0,
        borderRadius: "12px",
        background: "transparent",
        border: "none",
        width: 240,
    };
}
function hash32(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
function fastGridLayout(nodes, { colWidth = 280, rowHeight = 100, columnsPerBand = 15, bandGap = 150, } = {}) {
    const bands = {
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
    for (const n of nodes)
        (bands[n.type] || (bands[n.type] = [])).push(n);
    for (const k of Object.keys(bands)) {
        bands[k].sort((a, b) => hash32(a.id) - hash32(b.id));
    }
    const bandOrder = ["service", "endpoint", "rpc", "queue", "module", "directory", "file", "class", "function"];
    const pos = new Map();
    let yOffset = 0;
    for (const band of bandOrder) {
        const arr = bands[band] || [];
        if (arr.length === 0)
            continue;
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
function toReactFlowWholeGraph(graph, { nodeFilter, edgeFilter, edgeCap, filterOrphans, } = {}) {
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
        const activeNodeIds = new Set();
        edges0.forEach(e => {
            activeNodeIds.add(e.source);
            activeNodeIds.add(e.target);
        });
        finalNodes = nodes0.filter(n => activeNodeIds.has(n.id));
    }
    let positionedCount = 0;
    for (const n of finalNodes) {
        if (n.position || (typeof n.x === "number" && typeof n.y === "number"))
            positionedCount++;
    }
    const useBackendPos = positionedCount / Math.max(finalNodes.length, 1) > 0.6;
    const grid = useBackendPos ? null : fastGridLayout(finalNodes);
    const rfNodes = finalNodes.map((n) => {
        const p = n.position ??
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
    const rfEdges = edges0.map((e) => {
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
                type: reactflow_1.MarkerType.ArrowClosed,
                color: "#38bdf8",
            } : undefined,
        };
    });
    return { nodes: rfNodes, edges: rfEdges };
}
//# sourceMappingURL=backendGraphToReactFlow.js.map