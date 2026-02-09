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
const ThemeContext_1 = require("./ThemeContext");
const ThemeToggle_1 = require("./ThemeToggle");
const vscodeExportHelper_1 = require("../utils/exporters/vscodeExportHelper");
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
    return (react_1.default.createElement(ThemeContext_1.ThemeProvider, null,
        react_1.default.createElement(ThemeKeyboardHandler, null),
        react_1.default.createElement("div", { className: "app-container" },
            react_1.default.createElement(Header, null),
            react_1.default.createElement("main", { className: "app-main" },
                react_1.default.createElement(ArchitectureGraph_1.default, null)))));
};
exports.default = App;
//# sourceMappingURL=App.js.map