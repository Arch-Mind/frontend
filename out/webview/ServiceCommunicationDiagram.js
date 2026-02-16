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
exports.ServiceCommunicationDiagram = void 0;
const react_1 = __importStar(require("react"));
const reactflow_1 = __importStar(require("reactflow"));
require("reactflow/dist/style.css");
const layoutAlgorithms_1 = require("./layoutAlgorithms");
const webviewClient_1 = require("../api/webviewClient");
const vscodeApi_1 = require("../utils/vscodeApi");
const ServiceCommunicationDiagram = () => {
    const vscode = (0, react_1.useMemo)(() => (0, vscodeApi_1.getVsCodeApi)(), []);
    const apiClient = (0, react_1.useMemo)(() => new webviewClient_1.ArchMindWebviewApiClient(), []);
    const [repoId, setRepoId] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [data, setData] = (0, react_1.useState)(null);
    const [nodes, setNodes] = (0, react_1.useState)([]);
    const [edges, setEdges] = (0, react_1.useState)([]);
    const [filters, setFilters] = (0, react_1.useState)({
        http: true,
        rpc: true,
        queues: true,
        compose: true,
    });
    (0, react_1.useEffect)(() => {
        const handler = (event) => {
            const message = event.data;
            if (message?.command === 'architectureData') {
                const extractedRepoId = message.data?.repo_id || message.data?.repoId;
                if (extractedRepoId) {
                    setRepoId(extractedRepoId);
                }
            }
        };
        window.addEventListener('message', handler);
        vscode.postMessage({ command: 'requestArchitecture' });
        return () => window.removeEventListener('message', handler);
    }, [vscode]);
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
        if (!data)
            return;
        const nodeMap = new Map();
        const edgeList = [];
        if (filters.http) {
            data.endpoints.forEach(endpoint => {
                const endpointId = `endpoint:${endpoint.method}:${endpoint.url}`;
                nodeMap.set(endpointId, createNode(endpointId, `${endpoint.method} ${endpoint.url}`, 'endpoint'));
                endpoint.services.forEach(service => {
                    const serviceId = `compose:${service}`;
                    nodeMap.set(serviceId, createNode(serviceId, service, 'compose'));
                    edgeList.push({
                        id: `${endpointId}->${serviceId}`,
                        source: endpointId,
                        target: serviceId,
                        style: { stroke: '#38bdf8', strokeWidth: 1.4 },
                    });
                });
            });
        }
        if (filters.rpc) {
            data.rpc_services.forEach(service => {
                const rpcId = `rpc:${service.name}`;
                nodeMap.set(rpcId, createNode(rpcId, service.name, 'rpc'));
                service.callers.forEach(caller => {
                    const callerId = `file:${caller}`;
                    nodeMap.set(callerId, createNode(callerId, caller, 'file'));
                    edgeList.push({
                        id: `${callerId}->${rpcId}`,
                        source: callerId,
                        target: rpcId,
                        style: { stroke: '#f472b6', strokeWidth: 1.4 },
                    });
                });
            });
        }
        if (filters.queues) {
            data.queues.forEach(queue => {
                const queueId = `queue:${queue.topic}`;
                nodeMap.set(queueId, createNode(queueId, queue.topic, 'queue'));
                queue.publishers.forEach(pub => {
                    const pubId = `file:${pub}`;
                    nodeMap.set(pubId, createNode(pubId, pub, 'file'));
                    edgeList.push({
                        id: `${pubId}->${queueId}`,
                        source: pubId,
                        target: queueId,
                        style: { stroke: '#f59e0b', strokeWidth: 1.4 },
                    });
                });
                queue.consumers.forEach(con => {
                    const conId = `file:${con}`;
                    nodeMap.set(conId, createNode(conId, con, 'file'));
                    edgeList.push({
                        id: `${queueId}->${conId}`,
                        source: queueId,
                        target: conId,
                        style: { stroke: '#10b981', strokeWidth: 1.4 },
                    });
                });
            });
        }
        if (filters.compose) {
            data.compose_services.forEach(service => {
                const serviceId = `compose:${service.name}`;
                nodeMap.set(serviceId, createNode(serviceId, `${service.name} (${service.ports.join(', ')})`, 'compose'));
            });
        }
        const nodeList = Array.from(nodeMap.values());
        const layoutNodes = nodeList.map(node => ({ id: node.id, width: 200, height: 50 }));
        const layoutEdges = edgeList.map(edge => ({ id: edge.id, source: edge.source, target: edge.target }));
        const { nodes: positions } = (0, layoutAlgorithms_1.dagreLayout)(layoutNodes, layoutEdges, 'TB');
        const layoutedNodes = nodeList.map(node => ({
            ...node,
            position: positions.get(node.id) || { x: 0, y: 0 },
        }));
        setNodes(layoutedNodes);
        setEdges(edgeList);
    }, [data, filters]);
    return (react_1.default.createElement("div", { className: "diagram-container" },
        react_1.default.createElement("div", { className: "diagram-header" },
            react_1.default.createElement("div", null,
                react_1.default.createElement("h2", null, "Service Communication"),
                react_1.default.createElement("p", null, "HTTP endpoints, RPC services, queues, and compose services.")),
            react_1.default.createElement("div", { className: "diagram-filters" },
                react_1.default.createElement("label", null,
                    react_1.default.createElement("input", { type: "checkbox", checked: filters.http, onChange: () => setFilters(prev => ({ ...prev, http: !prev.http })) }),
                    "HTTP"),
                react_1.default.createElement("label", null,
                    react_1.default.createElement("input", { type: "checkbox", checked: filters.rpc, onChange: () => setFilters(prev => ({ ...prev, rpc: !prev.rpc })) }),
                    "RPC"),
                react_1.default.createElement("label", null,
                    react_1.default.createElement("input", { type: "checkbox", checked: filters.queues, onChange: () => setFilters(prev => ({ ...prev, queues: !prev.queues })) }),
                    "Queues"),
                react_1.default.createElement("label", null,
                    react_1.default.createElement("input", { type: "checkbox", checked: filters.compose, onChange: () => setFilters(prev => ({ ...prev, compose: !prev.compose })) }),
                    "Compose"))),
        isLoading && react_1.default.createElement("div", { className: "diagram-state" }, "Loading communication data..."),
        error && react_1.default.createElement("div", { className: "diagram-state diagram-error" }, error),
        !isLoading && !error && (react_1.default.createElement(reactflow_1.ReactFlowProvider, null,
            react_1.default.createElement("div", { className: "diagram-flow" },
                react_1.default.createElement(reactflow_1.default, { nodes: nodes, edges: edges, fitView: true, fitViewOptions: { padding: 0.2 } },
                    react_1.default.createElement(reactflow_1.Background, { variant: reactflow_1.BackgroundVariant.Dots, gap: 16, size: 0.8 })))))));
};
exports.ServiceCommunicationDiagram = ServiceCommunicationDiagram;
function createNode(id, label, type) {
    const styles = {
        endpoint: { background: '#0ea5e9', color: '#0f172a' },
        rpc: { background: '#f472b6', color: '#0f172a' },
        queue: { background: '#f59e0b', color: '#0f172a' },
        compose: { background: '#22c55e', color: '#0f172a' },
        file: { background: '#1e293b', color: '#e2e8f0' },
    };
    return {
        id,
        data: { label, type },
        position: { x: 0, y: 0 },
        style: {
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid #0f172a',
            fontSize: 11,
            ...(styles[type] || styles.file),
        },
        width: 200,
    };
}
//# sourceMappingURL=ServiceCommunicationDiagram.js.map