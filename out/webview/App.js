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
const SearchFilter_1 = __importDefault(require("./SearchFilter"));
const defaultFilter = {
    searchQuery: '',
    nodeTypes: {
        file: true,
        directory: true,
        function: true,
        class: true,
        module: true
    },
    pathPattern: ''
};
const App = () => {
    const [filter, setFilter] = (0, react_1.useState)(defaultFilter);
    const [matchCount, setMatchCount] = (0, react_1.useState)(0);
    const [totalCount, setTotalCount] = (0, react_1.useState)(0);
    const handleFilterChange = (0, react_1.useCallback)((newFilter) => {
        setFilter(newFilter);
    }, []);
    const handleFocusSelection = (0, react_1.useCallback)(() => {
        // Dispatch custom event to graph
        window.dispatchEvent(new CustomEvent('focusSelection'));
    }, []);
    const handleMatchCountChange = (0, react_1.useCallback)((matched, total) => {
        setMatchCount(matched);
        setTotalCount(total);
    }, []);
    return (react_1.default.createElement("div", { style: { width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' } },
        react_1.default.createElement("div", { className: "header-panel" },
            react_1.default.createElement("div", { className: "header-title" },
                react_1.default.createElement("h3", null, "\uD83C\uDFD7\uFE0F Architecture Reconstruction"),
                react_1.default.createElement("span", { className: "header-subtitle" }, "Real-Time Codebase Intelligence")),
            react_1.default.createElement(SearchFilter_1.default, { onFilterChange: handleFilterChange, onFocusSelection: handleFocusSelection, matchCount: matchCount, totalCount: totalCount })),
        react_1.default.createElement("div", { style: { flex: 1 } },
            react_1.default.createElement(ArchitectureGraph_1.default, { filter: filter, onMatchCountChange: handleMatchCountChange }))));
};
exports.default = App;
//# sourceMappingURL=App.js.map