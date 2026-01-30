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
const react_1 = __importStar(require("react"));
const reactflow_1 = __importStar(require("reactflow"));
require("reactflow/dist/style.css");
const initialNodes = [
    { id: '1', position: { x: 0, y: 0 }, data: { label: 'src' } },
    { id: '2', position: { x: 0, y: 100 }, data: { label: 'extension.ts' } },
    { id: '3', position: { x: 200, y: 100 }, data: { label: 'webview' } },
];
const ArchitectureGraph = () => {
    const [nodes, setNodes, onNodesChange] = (0, reactflow_1.useNodesState)([]);
    const [edges, setEdges, onEdgesChange] = (0, reactflow_1.useEdgesState)([]);
    const onConnect = (0, react_1.useCallback)((params) => setEdges((eds) => (0, reactflow_1.addEdge)(params, eds)), [setEdges]);
    react_1.default.useEffect(() => {
        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'architectureData') {
                const { nodes: rawNodes, edges: rawEdges } = message.data;
                // Layout logic (simple grid/tree for now)
                const layoutedNodes = rawNodes.map((n, index) => ({
                    id: n.id,
                    data: { label: n.label },
                    position: { x: (index % 5) * 200, y: Math.floor(index / 5) * 100 },
                }));
                setNodes(layoutedNodes);
                setEdges(rawEdges);
            }
        });
        // Request data
        // @ts-ignore
        const vscode = acquireVsCodeApi();
        vscode.postMessage({ command: 'requestArchitecture' });
    }, []);
    return (react_1.default.createElement(reactflow_1.default, { nodes: nodes, edges: edges, onNodesChange: onNodesChange, onEdgesChange: onEdgesChange, onConnect: onConnect, fitView: true },
        react_1.default.createElement(reactflow_1.Controls, null),
        react_1.default.createElement(reactflow_1.MiniMap, null),
        react_1.default.createElement(reactflow_1.Background, { gap: 12, size: 1 })));
};
exports.default = ArchitectureGraph;
//# sourceMappingURL=ArchitectureGraph.js.map