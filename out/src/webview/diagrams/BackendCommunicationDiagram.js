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
const ZoomToolbar_1 = require("./ZoomToolbar");
const webviewClient_1 = require("../../api/webviewClient");
function Inner({ graph, repoId, graphEngineUrl }) {
    const [showMinimap, setShowMinimap] = (0, react_1.useState)(false);
    const [commData, setCommData] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const apiClient = (0, react_1.useMemo)(() => new webviewClient_1.ArchMindWebviewApiClient(graphEngineUrl || 'https://graph-engine-production-90f5.up.railway.app'), [graphEngineUrl]);
    (0, react_1.useEffect)(() => {
        if (!repoId)
            return;
        let active = true;
        const load = async () => {
            try {
                setIsLoading(true);
                const data = await apiClient.getCommunication(repoId);
                if (active)
                    setCommData(data);
            }
            catch (err) {
                console.error("Failed to fetch rich communication data", err);
            }
            finally {
                if (active)
                    setIsLoading(false);
            }
        };
        load();
        return () => { active = false; };
    }, [apiClient, repoId]);
    const mergedGraph = (0, react_1.useMemo)(() => {
        if (!graph)
            return null;
        if (!commData)
            return graph;
        // Start with existing graph nodes and edges
        const nodes = [...graph.nodes];
        const edges = [...graph.edges];
        const existingNodeIds = new Set(nodes.map(n => n.id));
        // Add HTTP Endpoints
        commData.endpoints.forEach(ep => {
            const epId = `endpoint:${ep.method}:${ep.url}`;
            if (!existingNodeIds.has(epId)) {
                nodes.push({
                    id: epId,
                    label: `${ep.method} ${ep.url}`,
                    type: "endpoint",
                });
                existingNodeIds.add(epId);
            }
            ep.callers.forEach(caller => {
                const callerId = nodes.find(n => n.filePath === caller || n.id === caller)?.id || caller;
                edges.push({
                    id: `comm-edge-${callerId}-${epId}`,
                    source: callerId,
                    target: epId,
                    type: "calls"
                });
            });
            ep.services.forEach(svc => {
                const svcId = `service:${svc}`;
                if (!existingNodeIds.has(svcId)) {
                    nodes.push({ id: svcId, label: svc, type: "service" });
                    existingNodeIds.add(svcId);
                }
                edges.push({
                    id: `comm-edge-${epId}-${svcId}`,
                    source: epId,
                    target: svcId,
                    type: "calls"
                });
            });
        });
        // Add RPC Services
        commData.rpc_services.forEach(rpc => {
            const rpcId = `rpc:${rpc.name}`;
            if (!existingNodeIds.has(rpcId)) {
                nodes.push({ id: rpcId, label: rpc.name, type: "rpc" });
                existingNodeIds.add(rpcId);
            }
            rpc.callers.forEach(caller => {
                const callerId = nodes.find(n => n.filePath === caller || n.id === caller)?.id || caller;
                edges.push({
                    id: `comm-edge-${callerId}-${rpcId}`,
                    source: callerId,
                    target: rpcId,
                    type: "calls"
                });
            });
        });
        // Add Queues
        commData.queues.forEach(q => {
            const qId = `queue:${q.topic}`;
            if (!existingNodeIds.has(qId)) {
                nodes.push({ id: qId, label: q.topic, type: "queue" });
                existingNodeIds.add(qId);
            }
            q.publishers.forEach(pub => {
                const pubId = nodes.find(n => n.filePath === pub || n.id === pub)?.id || pub;
                edges.push({
                    id: `comm-edge-${pubId}-${qId}`,
                    source: pubId,
                    target: qId,
                    type: "calls"
                });
            });
            q.consumers.forEach(con => {
                const conId = nodes.find(n => n.filePath === con || n.id === con)?.id || con;
                edges.push({
                    id: `comm-edge-${qId}-${conId}`,
                    source: qId,
                    target: conId,
                    type: "calls"
                });
            });
        });
        return { ...graph, nodes, edges };
    }, [graph, commData]);
    const { nodes, edges } = (0, react_1.useMemo)(() => {
        if (!mergedGraph)
            return { nodes: [], edges: [] };
        return (0, backendGraphToReactFlow_1.toReactFlowWholeGraph)(mergedGraph, {
            edgeFilter: (e) => e.type === "calls" || e.type === "imports",
            filterOrphans: true,
        });
    }, [mergedGraph]);
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
                flexDirection: "column",
                gap: 6,
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #334155",
                background: "rgba(15,23,42,0.92)",
                color: "#e5e7eb",
            } },
            react_1.default.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center" } },
                react_1.default.createElement("span", { style: { fontSize: 13, fontWeight: 600 } }, "Communication Diagram"),
                isLoading && react_1.default.createElement("span", { style: { fontSize: 11, opacity: 0.7 } }, "Updating signals...")),
            react_1.default.createElement("div", { style: { fontSize: 11, opacity: 0.8 } },
                "Nodes: ",
                nodes.length,
                " \u2022 Edges: ",
                edges.length),
            react_1.default.createElement("label", { style: { display: "flex", gap: 6, alignItems: "center", fontSize: 12, marginTop: 4, cursor: "pointer" } },
                react_1.default.createElement("input", { type: "checkbox", checked: showMinimap, onChange: (e) => setShowMinimap(e.target.checked) }),
                "Show MiniMap")),
        react_1.default.createElement(reactflow_1.default, { nodes: nodes, edges: edges, nodeTypes: backendGraphToReactFlow_1.backendNodeTypes, fitView: true, onlyRenderVisibleElements: true, nodesDraggable: false, nodesConnectable: false, panOnDrag: true, zoomOnScroll: true, zoomOnPinch: true, zoomOnDoubleClick: true, minZoom: 0.03, maxZoom: 3 },
            showMinimap && react_1.default.createElement(reactflow_1.MiniMap, null),
            react_1.default.createElement(reactflow_1.Controls, null),
            react_1.default.createElement(reactflow_1.Background, { variant: reactflow_1.BackgroundVariant.Dots, gap: 18, size: 1 }))));
}
function BackendCommunicationDiagram({ graph, repoId, graphEngineUrl }) {
    return (react_1.default.createElement(reactflow_1.ReactFlowProvider, null,
        react_1.default.createElement(Inner, { graph: graph, repoId: repoId, graphEngineUrl: graphEngineUrl })));
}
//# sourceMappingURL=BackendCommunicationDiagram.js.map