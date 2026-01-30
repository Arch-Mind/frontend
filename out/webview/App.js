"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const ArchitectureGraph_1 = __importDefault(require("./ArchitectureGraph"));
const App = () => {
    return (react_1.default.createElement("div", { style: { width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' } },
        react_1.default.createElement("div", { style: { padding: '10px', borderBottom: '1px solid var(--vscode-widget-border)' } },
            react_1.default.createElement("h3", null, "Architecture Reconstruction"),
            react_1.default.createElement("p", null, "Visualizing codebase structure...")),
        react_1.default.createElement("div", { style: { flex: 1 } },
            react_1.default.createElement(ArchitectureGraph_1.default, null))));
};
exports.default = App;
//# sourceMappingURL=App.js.map