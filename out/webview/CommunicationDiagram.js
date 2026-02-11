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
exports.CommunicationDiagram = void 0;
const react_1 = __importStar(require("react"));
const reactflow_1 = __importStar(require("reactflow"));
require("reactflow/dist/style.css");
const layoutAlgorithms_1 = require("./layoutAlgorithms");
const webviewClient_1 = require("../api/webviewClient");
const HeatmapLegend_1 = require("./HeatmapLegend");
const HeatmapNode_1 = require("./HeatmapNode");
const heatmapUtils_1 = require("./heatmapUtils");
const CommunicationDiagram = ({ heatmapMode, highlightNodeIds = [], repoId: initialRepoId = null, graphEngineUrl, }) => {
    const vscode = (0, react_1.useMemo)(() => acquireVsCodeApi(), []);
    const apiClient = (0, react_1.useMemo)(() => new webviewClient_1.ArchMindWebviewApiClient(graphEngineUrl || 'https://graph-engine-production-90f5.up.railway.app'), [graphEngineUrl]);
    const [repoId, setRepoId] = (0, react_1.useState)(initialRepoId);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [data, setData] = (0, react_1.useState)(null);
    const [contributions, setContributions] = (0, react_1.useState)(null);
    const [nodes, setNodes] = (0, react_1.useState)([]);
    const [edges, setEdges] = (0, react_1.useState)([]);
    const [edgeDetails, setEdgeDetails] = (0, react_1.useState)(null);
    const [apiFlowMode, setApiFlowMode] = (0, react_1.useState)(false);
    const [flowEntry, setFlowEntry] = (0, react_1.useState)('');
    const [filters, setFilters] = (0, react_1.useState)({
        http: true,
        rpc: true,
        queues: true,
        compose: true,
    });
    const heatmapState = (0, react_1.useMemo)(() => (0, heatmapUtils_1.buildHeatmap)(contributions?.contributions || [], heatmapMode), [contributions, heatmapMode]);
    const highlightSet = (0, react_1.useMemo)(() => new Set(highlightNodeIds.map((id) => (0, heatmapUtils_1.normalizePath)(id.replace(/^file:/, '')))), [highlightNodeIds]);
    (0, react_1.useEffect)(() => {
        const handler = (event) => {
            const message = event.data;
            if (message?.command === 'architectureData') {
                const extractedRepoId = message.data?.repo_id || message.data?.repoId;
                if (extractedRepoId) {
                    setRepoId(String(extractedRepoId));
                }
            }
        };
        window.addEventListener('message', handler);
        vscode.postMessage({ command: 'requestArchitecture' });
        return () => window.removeEventListener('message', handler);
    }, [vscode]);
    (0, react_1.useEffect)(() => {
        if (initialRepoId) {
            setRepoId(initialRepoId);
        }
    }, [initialRepoId]);
    (0, react_1.useEffect)(() => {
        if (!repoId)
            return;
        let active = true;
        const load = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const response = await apiClient.getCommunication(repoId);
                if (!active)
                    return;
                setData(response);
            }
            catch (err) {
                if (!active)
                    return;
                setError(err instanceof Error ? err.message : 'Failed to load communication data');
            }
            finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [apiClient, repoId]);
    (0, react_1.useEffect)(() => {
        if (!repoId || heatmapMode === 'off') {
            setContributions(null);
            return;
        }
        let active = true;
        const load = async () => {
            try {
                const response = await apiClient.getContributions(repoId);
                if (active) {
                    setContributions(response);
                }
            }
            catch {
                if (active) {
                    setContributions(null);
                }
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [apiClient, repoId, heatmapMode]);
    (0, react_1.useEffect)(() => {
        if (!data)
            return;
        const nodeMap = new Map();
        const edgeList = [];
        const composeServices = data.compose_services || [];
        const composeNames = composeServices.map(service => service.name);
        if (!flowEntry && composeNames.length > 0) {
            const preferred = composeNames.find(name => name.toLowerCase().includes('gateway')) || composeNames[0];
            setFlowEntry(preferred);
        }
        if (filters.compose) {
            composeServices.forEach(service => {
                const serviceId = `service:${service.name}`;
                nodeMap.set(serviceId, createNode(serviceId, `${service.name} (${service.ports.join(', ') || 'no ports'})`, 'service'));
            });
        }
        if (filters.http) {
            data.endpoints.forEach(endpoint => {
                const endpointId = `endpoint:${endpoint.method}:${endpoint.url}`;
                nodeMap.set(endpointId, createNode(endpointId, `${endpoint.method} ${endpoint.url}`, 'endpoint'));
                endpoint.callers.forEach(caller => {
                    const fileId = `file:${caller}`;
                    const heatmap = heatmapState.entries.get((0, heatmapUtils_1.normalizePath)(caller));
                    const isHighlighted = highlightSet.has((0, heatmapUtils_1.normalizePath)(caller));
                    nodeMap.set(fileId, createNode(fileId, caller, 'file', heatmap?.color, heatmap?.tooltip, isHighlighted));
                    edgeList.push(createEdge({
                        id: `${fileId}->${endpointId}`,
                        source: fileId,
                        target: endpointId,
                        type: 'http',
                        label: '→',
                        details: [`${endpoint.method} ${endpoint.url}`],
                    }));
                });
                endpoint.services.forEach(service => {
                    const serviceId = `service:${service}`;
                    nodeMap.set(serviceId, createNode(serviceId, service, 'service'));
                    edgeList.push(createEdge({
                        id: `${endpointId}->${serviceId}`,
                        source: endpointId,
                        target: serviceId,
                        type: 'http',
                        label: '→',
                        details: [`${endpoint.method} ${endpoint.url}`],
                    }));
                });
            });
        }
        if (filters.rpc) {
            data.rpc_services.forEach(service => {
                const rpcId = `rpc:${service.name}`;
                nodeMap.set(rpcId, createNode(rpcId, service.name, 'rpc'));
                service.callers.forEach(caller => {
                    const callerId = `file:${caller}`;
                    const heatmap = heatmapState.entries.get((0, heatmapUtils_1.normalizePath)(caller));
                    const isHighlighted = highlightSet.has((0, heatmapUtils_1.normalizePath)(caller));
                    nodeMap.set(callerId, createNode(callerId, caller, 'file', heatmap?.color, heatmap?.tooltip, isHighlighted));
                    edgeList.push(createEdge({
                        id: `${callerId}->${rpcId}`,
                        source: callerId,
                        target: rpcId,
                        type: 'rpc',
                        label: '⇒',
                        details: [`RPC service: ${service.name}`],
                    }));
                });
            });
        }
        if (filters.queues) {
            data.queues.forEach(queue => {
                const queueId = `queue:${queue.topic}`;
                nodeMap.set(queueId, createNode(queueId, queue.topic, 'queue'));
                queue.publishers.forEach(pub => {
                    const pubId = `file:${pub}`;
                    const heatmap = heatmapState.entries.get((0, heatmapUtils_1.normalizePath)(pub));
                    const isHighlighted = highlightSet.has((0, heatmapUtils_1.normalizePath)(pub));
                    nodeMap.set(pubId, createNode(pubId, pub, 'file', heatmap?.color, heatmap?.tooltip, isHighlighted));
                    edgeList.push(createEdge({
                        id: `${pubId}->${queueId}`,
                        source: pubId,
                        target: queueId,
                        type: 'queue',
                        label: '⇄',
                        details: [`Queue topic: ${queue.topic}`, `Publisher: ${pub}`],
                        bidirectional: true,
                    }));
                });
                queue.consumers.forEach(con => {
                    const conId = `file:${con}`;
                    const heatmap = heatmapState.entries.get((0, heatmapUtils_1.normalizePath)(con));
                    const isHighlighted = highlightSet.has((0, heatmapUtils_1.normalizePath)(con));
                    nodeMap.set(conId, createNode(conId, con, 'file', heatmap?.color, heatmap?.tooltip, isHighlighted));
                    edgeList.push(createEdge({
                        id: `${queueId}->${conId}`,
                        source: queueId,
                        target: conId,
                        type: 'queue',
                        label: '⇄',
                        details: [`Queue topic: ${queue.topic}`, `Consumer: ${con}`],
                        bidirectional: true,
                    }));
                });
            });
        }
        let filteredNodes = Array.from(nodeMap.values());
        let filteredEdges = edgeList;
        if (apiFlowMode && flowEntry) {
            const entryId = `service:${flowEntry}`;
            const reachable = collectReachableNodes(entryId, edgeList);
            filteredNodes = filteredNodes.filter(node => reachable.has(node.id));
            filteredEdges = edgeList.filter(edge => reachable.has(edge.source) && reachable.has(edge.target));
        }
        const layoutNodes = filteredNodes.map(node => ({ id: node.id, width: 200, height: 50 }));
        const layoutEdges = filteredEdges.map(edge => ({ id: edge.id, source: edge.source, target: edge.target }));
        const applyLayout = async () => {
            try {
                const { nodes: positions } = await (0, layoutAlgorithms_1.elkLayout)(layoutNodes, layoutEdges, 'force');
                const layoutedNodes = filteredNodes.map(node => ({
                    ...node,
                    position: positions.get(node.id) || { x: 0, y: 0 },
                }));
                setNodes(layoutedNodes);
                setEdges(filteredEdges);
            }
            catch (err) {
                console.error('Layout failed:', err);
                setError('Failed to calculate layout for communication diagram');
            }
        };
        applyLayout();
    }, [data, filters, heatmapState, apiFlowMode, flowEntry, highlightSet]);
    return (react_1.default.createElement("div", { className: "diagram-container" },
        react_1.default.createElement("div", { className: "diagram-header" },
            react_1.default.createElement("div", null,
                react_1.default.createElement("h2", null, "Communication Diagram"),
                react_1.default.createElement("p", null, "Service calls across HTTP, RPC, and queues with compose boundaries.")),
            react_1.default.createElement("div", { className: "diagram-filters" },
                react_1.default.createElement("label", null,
                    react_1.default.createElement("input", { type: "checkbox", checked: filters.http, onChange: () => setFilters(prev => ({ ...prev, http: !prev.http })) }),
                    "HTTP"),
                react_1.default.createElement("label", null,
                    react_1.default.createElement("input", { type: "checkbox", checked: filters.rpc, onChange: () => setFilters(prev => ({ ...prev, rpc: !prev.rpc })) }),
                    "RPC"),
                react_1.default.createElement("label", null,
                    react_1.default.createElement("input", { type: "checkbox", checked: filters.queues, onChange: () => setFilters(prev => ({ ...prev, queues: !prev.queues })) }),
                    "Queue"),
                react_1.default.createElement("label", null,
                    react_1.default.createElement("input", { type: "checkbox", checked: filters.compose, onChange: () => setFilters(prev => ({ ...prev, compose: !prev.compose })) }),
                    "Compose")),
            react_1.default.createElement("div", { className: "diagram-filters" },
                react_1.default.createElement("label", { className: "diagram-toggle" },
                    react_1.default.createElement("input", { type: "checkbox", checked: apiFlowMode, onChange: () => setApiFlowMode(prev => !prev) }),
                    "API Flow"),
                apiFlowMode && data?.compose_services?.length ? (react_1.default.createElement("select", { className: "diagram-select", value: flowEntry, onChange: (event) => setFlowEntry(event.target.value) }, data.compose_services.map(service => (react_1.default.createElement("option", { key: service.name, value: service.name }, service.name))))) : null)),
        heatmapMode !== 'off' && heatmapState.maxMetric > 0 && (react_1.default.createElement(HeatmapLegend_1.HeatmapLegend, { mode: heatmapMode, minMetric: heatmapState.minMetric, maxMetric: heatmapState.maxMetric })),
        isLoading && react_1.default.createElement("div", { className: "diagram-state" }, "Loading communication data..."),
        error && react_1.default.createElement("div", { className: "diagram-state diagram-error" }, error),
        !isLoading && !error && !repoId && (react_1.default.createElement("div", { className: "diagram-state" }, "Backend repository context is not available. Run backend analysis first.")),
        !isLoading && !error && !!repoId && data &&
            data.endpoints.length === 0 &&
            data.rpc_services.length === 0 &&
            data.queues.length === 0 &&
            data.compose_services.length === 0 && (react_1.default.createElement("div", { className: "diagram-state" }, "No communication signals were detected for this repository.")),
        !isLoading && !error && !!repoId && (react_1.default.createElement(reactflow_1.ReactFlowProvider, null,
            react_1.default.createElement("div", { className: "diagram-flow" },
                react_1.default.createElement(reactflow_1.default, { nodes: nodes, edges: edges, nodeTypes: { heatmapNode: HeatmapNode_1.HeatmapNode }, fitView: true, fitViewOptions: { padding: 0.2 }, onEdgeClick: (_, edge) => {
                        const details = edge.data?.details;
                        if (details) {
                            setEdgeDetails(details);
                        }
                    } },
                    react_1.default.createElement(reactflow_1.Background, { variant: reactflow_1.BackgroundVariant.Dots, gap: 16, size: 0.8 }))))),
        edgeDetails && (react_1.default.createElement("div", { className: "edge-details" },
            react_1.default.createElement("div", { className: "edge-details-header" },
                react_1.default.createElement("span", null, edgeDetails.label),
                react_1.default.createElement("button", { onClick: () => setEdgeDetails(null) }, "\u00D7")),
            react_1.default.createElement("ul", null, edgeDetails.meta.map((item) => (react_1.default.createElement("li", { key: item }, item))))))));
};
exports.CommunicationDiagram = CommunicationDiagram;
function createNode(id, label, type, heatmapColor, heatmapTooltip, isHighlighted) {
    const styles = {
        endpoint: { background: '#0ea5e9', color: '#0f172a' },
        rpc: { background: '#f472b6', color: '#0f172a' },
        queue: { background: '#f59e0b', color: '#0f172a' },
        service: { background: '#22c55e', color: '#0f172a' },
        file: { background: '#1e293b', color: '#e2e8f0' },
    };
    const baseStyle = styles[type] || styles.file;
    return {
        id,
        type: 'heatmapNode',
        data: {
            label,
            type,
            heatmapTooltip,
        },
        position: { x: 0, y: 0 },
        style: {
            padding: '8px 10px',
            borderRadius: '8px',
            border: isHighlighted ? '2px solid #f97316' : '1px solid #0f172a',
            boxShadow: isHighlighted ? '0 0 0 2px rgba(249, 115, 22, 0.6)' : undefined,
            fontSize: 11,
            background: heatmapColor || baseStyle.background,
            color: baseStyle.color,
        },
        width: 200,
    };
}
function createEdge(options) {
    const colorMap = {
        http: '#38bdf8',
        rpc: '#f472b6',
        queue: '#f59e0b',
    };
    const color = colorMap[options.type];
    return {
        id: options.id,
        source: options.source,
        target: options.target,
        label: options.label,
        labelStyle: { fill: color, fontSize: 12 },
        style: { stroke: color, strokeWidth: 1.6 },
        markerEnd: {
            type: reactflow_1.MarkerType.ArrowClosed,
            color,
        },
        markerStart: options.bidirectional
            ? {
                type: reactflow_1.MarkerType.ArrowClosed,
                color,
            }
            : undefined,
        data: {
            details: {
                type: options.type,
                label: options.label,
                meta: options.details,
            },
        },
    };
}
function collectReachableNodes(entryId, edges) {
    const adjacency = new Map();
    edges.forEach(edge => {
        if (!adjacency.has(edge.source))
            adjacency.set(edge.source, new Set());
        if (!adjacency.has(edge.target))
            adjacency.set(edge.target, new Set());
        adjacency.get(edge.source)?.add(edge.target);
        adjacency.get(edge.target)?.add(edge.source);
    });
    const visited = new Set();
    const queue = [entryId];
    visited.add(entryId);
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current)
            break;
        adjacency.get(current)?.forEach(neighbor => {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        });
    }
    return visited;
}
//# sourceMappingURL=CommunicationDiagram.js.map