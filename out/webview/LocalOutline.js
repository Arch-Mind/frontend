"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalOutline = void 0;
const react_1 = __importDefault(require("react"));
const SymbolItem = ({ symbol, depth }) => {
    const icon = {
        'function': '⚡',
        'method': 'Md', // M
        'class': '🏷️',
        'variable': 'Vx'
    }[symbol.kind] || '•';
    return (react_1.default.createElement("div", { className: "outline-item", style: { paddingLeft: `${depth * 15}px` } },
        react_1.default.createElement("span", { className: "outline-icon" }, icon),
        react_1.default.createElement("span", { className: "outline-name" }, symbol.name),
        react_1.default.createElement("span", { className: "outline-line" },
            ":",
            symbol.startLine)));
};
// Recursive renderer
const renderSymbols = (symbols, depth = 0) => {
    return symbols.map((sym, idx) => (react_1.default.createElement(react_1.default.Fragment, { key: `${sym.name}-${idx}` },
        react_1.default.createElement(SymbolItem, { symbol: sym, depth: depth }),
        sym.children && renderSymbols(sym.children, depth + 1))));
};
const LocalOutline = ({ fileName, symbols, isVisible, onClose }) => {
    if (!isVisible || !symbols || symbols.length === 0)
        return null;
    return (react_1.default.createElement("div", { className: "local-outline-panel" },
        react_1.default.createElement("div", { className: "outline-header" },
            react_1.default.createElement("span", { className: "outline-title" },
                "\uD83D\uDCDD ",
                fileName.split(/[/\\]/).pop()),
            react_1.default.createElement("button", { className: "outline-close", onClick: onClose }, "\u00D7")),
        react_1.default.createElement("div", { className: "outline-content" }, renderSymbols(symbols)),
        react_1.default.createElement("style", null, `
                .local-outline-panel {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    width: 250px;
                    max-height: 400px;
                    background: var(--am-panel-bg);
                    border: 1px solid var(--am-border);
                    border-radius: 6px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    z-index: 1000;
                    display: flex;
                    flex-direction: column;
                    color: var(--am-panel-fg);
                    font-size: 12px;
                }
                .outline-header {
                    padding: 8px 12px;
                    border-bottom: 1px solid var(--am-border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(255,255,255,0.05);
                }
                .outline-title {
                    font-weight: 600;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .outline-close {
                    background: none;
                    border: none;
                    color: var(--am-panel-fg);
                    cursor: pointer;
                    font-size: 16px;
                }
                .outline-content {
                    overflow-y: auto;
                    padding: 8px;
                    flex: 1;
                }
                .outline-item {
                    padding: 2px 4px;
                    display: flex;
                    align-items: center;
                }
                .outline-icon {
                    margin-right: 6px;
                    opacity: 0.7;
                    width: 16px;
                    text-align: center;
                }
                .outline-line {
                    margin-left: auto;
                    opacity: 0.5;
                    font-size: 10px;
                }
            `)));
};
exports.LocalOutline = LocalOutline;
//# sourceMappingURL=LocalOutline.js.map