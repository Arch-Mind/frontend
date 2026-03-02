"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackendBoundaryDiagram = BackendBoundaryDiagram;
// src/webview/diagrams/BackendBoundaryDiagram.tsx
const react_1 = __importStar(require("react"));
const reactflow_1 = __importStar(require("reactflow"));
require("reactflow/dist/style.css");
const backendGraphToReactFlow_1 = require("./backendGraphToReactFlow");
const ZoomToolbar_1 = require("./ZoomToolbar");
function Inner({ graph }) {
    const [showMinimap, setShowMinimap] = (0, react_1.useState)(false);
    const { nodes, edges } = (0, react_1.useMemo)(() => {
        if (!graph)
            return { nodes: [], edges: [] };
        return (0, backendGraphToReactFlow_1.toReactFlowWholeGraph)(graph, {
            edgeFilter: (e) => e.type === "contains", // boundary edges
            // edgeCap: 300000, // optional safety cap
        });
    }, [graph]);
    if (!graph)
        return react_1.default.createElement("div", { style: { padding: 12 } }, "No backend graph loaded yet.");
    return (react_1.default.createElement("div", { style: { height: "calc(100vh - 80px)", position: "relative" } },
        react_1.default.createElement(ZoomToolbar_1.ZoomToolbar, { fitPadding: 0.05, minZoom: 0.03, maxZoom: 3 }),
        react_1.default.createElement("div", { style: {
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
            } },
            react_1.default.createElement("span", { style: { fontSize: 12, opacity: 0.9 } },
                "Nodes: ",
                nodes.length,
                " \u2022 Edges: ",
                edges.length),
            react_1.default.createElement("label", { style: { display: "flex", gap: 6, alignItems: "center", fontSize: 12 } },
                react_1.default.createElement("input", { type: "checkbox", checked: showMinimap, onChange: (e) => setShowMinimap(e.target.checked) }),
                "MiniMap")),
        react_1.default.createElement(reactflow_1.default, { nodes: nodes, edges: edges, fitView: true, onlyRenderVisibleElements: true, nodesDraggable: false, nodesConnectable: false, panOnDrag: true, zoomOnScroll: true, zoomOnPinch: true, zoomOnDoubleClick: true, minZoom: 0.03, maxZoom: 3 },
            showMinimap && react_1.default.createElement(reactflow_1.MiniMap, null),
            react_1.default.createElement(reactflow_1.Controls, null),
            react_1.default.createElement(reactflow_1.Background, { variant: reactflow_1.BackgroundVariant.Dots, gap: 18, size: 1 }))));
}
function BackendBoundaryDiagram({ graph }) {
    return (react_1.default.createElement(reactflow_1.ReactFlowProvider, null,
        react_1.default.createElement(Inner, { graph: graph })));
}
//# sourceMappingURL=BackendBoundaryDiagram.js.map