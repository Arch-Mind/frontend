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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const ArchitectureGraph_1 = __importDefault(require("./ArchitectureGraph"));
const ModuleBoundaryDiagram_1 = require("./ModuleBoundaryDiagram");
const BoundaryDiagram_1 = require("./BoundaryDiagram");
const DependencyDiagram_1 = require("./DependencyDiagram");
const CommunicationDiagram_1 = require("./CommunicationDiagram");
const WebhookSetup_1 = require("./WebhookSetup");
const ThemeContext_1 = require("./ThemeContext");
const ThemeToggle_1 = require("./ThemeToggle");
const vscodeExportHelper_1 = require("../utils/exporters/vscodeExportHelper");
const NotificationHistory_1 = require("./NotificationHistory");
function normalizeView(view) {
    switch (view) {
        case 'graph':
        case 'boundaries':
        case 'boundary-diagram':
        case 'dependency-diagram':
        case 'communication':
        case 'webhooks':
            return view;
        case 'dependencies':
            return 'dependency-diagram';
        default:
            return null;
    }
}
const ThemeKeyboardHandler = () => {
    (0, ThemeContext_1.useThemeKeyboard)();
    return null;
};
const Header = () => (react_1.default.createElement("header", { className: "app-header" },
    react_1.default.createElement("div", { className: "header-content" },
        react_1.default.createElement("h1", { className: "header-title" },
            react_1.default.createElement("span", { className: "header-icon" }, "\uD83C\uDFD7\uFE0F"),
            "ArchMind"),
        react_1.default.createElement("span", { className: "header-subtitle" }, "Architecture Intelligence")),
    react_1.default.createElement("div", { className: "header-actions" },
        react_1.default.createElement(ThemeToggle_1.CompactThemeToggle, null))));
const App = () => {
    // Initialize export listener for VS Code webview context
    (0, react_1.useEffect)(() => {
        (0, vscodeExportHelper_1.initializeExportListener)();
    }, []);
    const [activeView, setActiveView] = (0, react_1.useState)('graph');
    const [heatmapMode, setHeatmapMode] = (0, react_1.useState)('off');
    const [config, setConfig] = (0, react_1.useState)(null);
    const [repoId, setRepoId] = (0, react_1.useState)(null);
    const [highlightNodes, setHighlightNodes] = (0, react_1.useState)([]);
    const [history, setHistory] = (0, react_1.useState)([]);
    const heatmapOptions = [
        { value: 'off', label: 'Off' },
        { value: 'commit_count', label: 'Commit Count' },
        { value: 'last_modified', label: 'Last Modified' },
        { value: 'author_count', label: 'Author Count' },
    ];
    (0, react_1.useEffect)(() => {
        const handler = (event) => {
            const message = event.data;
            const incomingView = message?.view;
            if ((message?.command === 'switchView' || message?.type === 'showView') && incomingView) {
                const normalized = normalizeView(incomingView);
                if (normalized) {
                    setActiveView(normalized);
                }
                if (message?.filePath) {
                    setHighlightNodes([message.filePath]);
                }
            }
            if (message?.command === 'toggleHeatmap' || message?.type === 'toggleHeatmap') {
                setHeatmapMode((prev) => {
                    const order = ['off', 'commit_count', 'last_modified', 'author_count'];
                    const index = order.indexOf(prev);
                    return order[(index + 1) % order.length];
                });
            }
            if (message?.command === 'config' && message.data) {
                setConfig(message.data);
            }
            if (message?.command === 'architectureData' && message.data) {
                const extractedRepoId = message.data.repo_id || message.data.repoId;
                if (extractedRepoId) {
                    setRepoId(String(extractedRepoId));
                }
            }
            if (message?.command === 'highlightNodes') {
                setHighlightNodes(message.nodeIds || []);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);
    (0, react_1.useEffect)(() => {
        const handler = (event) => {
            const detail = event.detail;
            if (!detail?.message)
                return;
            setHistory((prev) => [
                {
                    id: `${Date.now()}`,
                    message: detail.message,
                    timestamp: new Date().toLocaleTimeString(),
                },
                ...prev,
            ].slice(0, 8));
        };
        window.addEventListener('archmind:graphUpdated', handler);
        return () => window.removeEventListener('archmind:graphUpdated', handler);
    }, []);
    return (react_1.default.createElement(ThemeContext_1.ThemeProvider, null,
        react_1.default.createElement(ThemeKeyboardHandler, null),
        react_1.default.createElement("div", { className: "app-container" },
            react_1.default.createElement(Header, null),
            react_1.default.createElement("div", { className: "view-toggle" },
                react_1.default.createElement("button", { className: activeView === 'graph' ? 'view-tab active' : 'view-tab', onClick: () => setActiveView('graph') }, "Graph"),
                react_1.default.createElement("button", { className: activeView === 'boundaries' ? 'view-tab active' : 'view-tab', onClick: () => setActiveView('boundaries') }, "Boundaries"),
                react_1.default.createElement("button", { className: activeView === 'boundary-diagram' ? 'view-tab active' : 'view-tab', onClick: () => setActiveView('boundary-diagram') }, "Boundary Diagram"),
                react_1.default.createElement("button", { className: activeView === 'dependency-diagram' ? 'view-tab active' : 'view-tab', onClick: () => setActiveView('dependency-diagram') }, "Dependency Diagram"),
                react_1.default.createElement("button", { className: activeView === 'communication' ? 'view-tab active' : 'view-tab', onClick: () => setActiveView('communication') }, "Communication"),
                react_1.default.createElement("button", { className: activeView === 'webhooks' ? 'view-tab active' : 'view-tab', onClick: () => setActiveView('webhooks') }, "Webhooks")),
            react_1.default.createElement("div", { className: "heatmap-toolbar" },
                react_1.default.createElement("span", { className: "heatmap-label" }, "Heatmap"),
                react_1.default.createElement("div", { className: "heatmap-toggle" }, heatmapOptions.map(option => (react_1.default.createElement("button", { key: option.value, className: heatmapMode === option.value
                        ? 'heatmap-pill active'
                        : 'heatmap-pill', onClick: () => setHeatmapMode(option.value) }, option.label))))),
            react_1.default.createElement("main", { className: "app-main" },
                activeView === 'graph' && (react_1.default.createElement(ArchitectureGraph_1.default, { heatmapMode: heatmapMode, highlightNodeIds: highlightNodes, repoId: repoId, graphEngineUrl: config?.graphEngineUrl })),
                activeView === 'boundaries' && (react_1.default.createElement(ModuleBoundaryDiagram_1.ModuleBoundaryDiagram, { heatmapMode: heatmapMode, highlightNodeIds: highlightNodes, repoId: repoId, graphEngineUrl: config?.graphEngineUrl })),
                activeView === 'boundary-diagram' && (react_1.default.createElement(BoundaryDiagram_1.BoundaryDiagram, { heatmapMode: heatmapMode, highlightNodeIds: highlightNodes, repoId: repoId, graphEngineUrl: config?.graphEngineUrl })),
                activeView === 'dependency-diagram' && (react_1.default.createElement(DependencyDiagram_1.DependencyDiagram, { heatmapMode: heatmapMode, highlightNodeIds: highlightNodes, repoId: repoId, graphEngineUrl: config?.graphEngineUrl })),
                activeView === 'communication' && (react_1.default.createElement(CommunicationDiagram_1.CommunicationDiagram, { heatmapMode: heatmapMode, highlightNodeIds: highlightNodes, repoId: repoId, graphEngineUrl: config?.graphEngineUrl })),
                activeView === 'webhooks' && (react_1.default.createElement(WebhookSetup_1.WebhookSetup, { backendUrl: config?.backendUrl || 'https://go-api-gateway-production-2173.up.railway.app' }))),
            react_1.default.createElement(NotificationHistory_1.NotificationHistory, { entries: history, onClear: () => setHistory([]) }))));
};
exports.default = App;
//# sourceMappingURL=App.js.map