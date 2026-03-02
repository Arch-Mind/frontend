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
exports.BackendCommunicationDiagram = BackendCommunicationDiagram;
// src/webview/diagrams/BackendCommunicationDiagram.tsx
const react_1 = __importStar(require("react"));
const reactflow_1 = __importStar(require("reactflow"));
require("reactflow/dist/style.css");
const backendGraphToReactFlow_1 = require("./backendGraphToReactFlow");
/**
 * Communication diagram (from backend graph):
 * - Show Module nodes and their IMPORTS edges between modules (if present),
 *   otherwise show Module -> File imports as "communication".
 */
function BackendCommunicationDiagram({ graph }) {
    const { nodes, edges } = (0, react_1.useMemo)(() => {
        if (!graph)
            return { nodes: [], edges: [] };
        const hasModules = graph.nodes.some((n) => n.type === "module");
        if (!hasModules) {
            // Nothing meaningful to show as "communication"
            return (0, backendGraphToReactFlow_1.toReactFlow)(graph, {
                nodeFilter: (n) => n.type === "file",
                edgeFilter: (e) => e.type === "imports",
                direction: "LR",
                nodeWidth: 260,
                nodeHeight: 54,
            });
        }
        // Prefer module-only graph if possible
        const moduleIds = new Set(graph.nodes.filter((n) => n.type === "module").map((n) => n.id));
        const hasModuleToModuleImports = graph.edges.some((e) => e.type === "imports" && moduleIds.has(e.source) && moduleIds.has(e.target));
        if (hasModuleToModuleImports) {
            return (0, backendGraphToReactFlow_1.toReactFlow)(graph, {
                nodeFilter: (n) => n.type === "module",
                edgeFilter: (e) => e.type === "imports",
                direction: "LR",
                nodeWidth: 280,
                nodeHeight: 56,
            });
        }
        // Otherwise: module + file nodes with module/file import edges
        return (0, backendGraphToReactFlow_1.toReactFlow)(graph, {
            nodeFilter: (n) => n.type === "module" || n.type === "file",
            edgeFilter: (e) => e.type === "imports",
            direction: "LR",
            nodeWidth: 280,
            nodeHeight: 56,
        });
    }, [graph]);
    if (!graph)
        return react_1.default.createElement("div", { style: { padding: 12 } }, "No backend graph loaded yet.");
    return (react_1.default.createElement("div", { style: { height: "calc(100vh - 80px)" } },
        react_1.default.createElement(reactflow_1.default, { nodes: nodes, edges: edges, fitView: true },
            react_1.default.createElement(reactflow_1.Background, { variant: reactflow_1.BackgroundVariant.Dots, gap: 18, size: 1 }))));
}
//# sourceMappingURL=BackendCommunicationDiagram.js.map