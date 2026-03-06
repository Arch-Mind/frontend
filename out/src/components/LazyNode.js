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
exports.PlaceholderNode = exports.LazyNode = void 0;
const react_1 = __importStar(require("react"));
const reactflow_1 = require("reactflow");
/**
 * Lazy-loaded node with intersection observer
 */
exports.LazyNode = (0, react_1.memo)(({ data, selected }) => {
    const [isVisible, setIsVisible] = (0, react_1.useState)(false);
    const nodeRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!nodeRef.current)
            return;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                setIsVisible(entry.isIntersecting);
            });
        }, { rootMargin: '100px', threshold: 0.01 });
        observer.observe(nodeRef.current);
        return () => {
            if (nodeRef.current) {
                observer.unobserve(nodeRef.current);
            }
        };
    }, []);
    const detailLevel = data.detailLevel || 'full';
    // Minimal dot when not visible or zoomed out
    if (!isVisible || detailLevel === 'minimal') {
        return (react_1.default.createElement("div", { ref: nodeRef, style: {
                width: 10,
                height: 10,
                background: data.color || '#4a9eff',
                borderRadius: '50%',
                border: selected ? '2px solid #ffd700' : 'none',
            } },
            react_1.default.createElement(reactflow_1.Handle, { type: "target", position: reactflow_1.Position.Top, style: { opacity: 0 } }),
            react_1.default.createElement(reactflow_1.Handle, { type: "source", position: reactflow_1.Position.Bottom, style: { opacity: 0 } })));
    }
    // Simplified rendering
    if (detailLevel === 'simplified') {
        return (react_1.default.createElement("div", { ref: nodeRef, style: {
                padding: '6px 12px',
                background: data.color || 'var(--am-panel-bg, #f9f9fa)',
                border: `2px solid ${selected ? 'var(--am-accent, #0078d4)' : data.isHighlighted ? '#ff6b6b' : 'var(--am-accent, #0078d4)'}`,
                borderRadius: '4px',
                color: 'var(--am-panel-fg, #222)',
                fontSize: '11px',
                whiteSpace: 'nowrap',
                maxWidth: '150px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            } },
            react_1.default.createElement(reactflow_1.Handle, { type: "target", position: reactflow_1.Position.Top }),
            data.label,
            react_1.default.createElement(reactflow_1.Handle, { type: "source", position: reactflow_1.Position.Bottom })));
    }
    // Full rendering
    return (react_1.default.createElement("div", { ref: nodeRef, style: {
            padding: '12px 16px',
            background: data.color || 'var(--am-panel-bg, #f9f9fa)',
            border: `2px solid ${selected ? 'var(--am-accent, #0078d4)' : data.isHighlighted ? '#ff6b6b' : 'var(--am-border, #e0e0e0)'}`,
            borderRadius: '6px',
            boxShadow: selected ? '0 4px 12px rgba(74, 158, 255, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.15)',
            minWidth: '150px',
            maxWidth: '250px',
        } },
        react_1.default.createElement(reactflow_1.Handle, { type: "target", position: reactflow_1.Position.Top, style: { background: 'var(--am-accent, #0078d4)', width: 8, height: 8 } }),
        react_1.default.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
            data.icon && react_1.default.createElement("span", { style: { fontSize: '16px' } }, data.icon),
            react_1.default.createElement("div", { style: { flex: 1, overflow: 'hidden' } },
                react_1.default.createElement("div", { style: {
                        color: 'var(--am-panel-fg, #222)',
                        fontSize: '13px',
                        fontWeight: selected ? 600 : 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    } }, data.label),
                data.type && (react_1.default.createElement("div", { style: { color: 'var(--am-desc, #666)', fontSize: '10px', marginTop: '2px' } }, data.type)))),
        react_1.default.createElement(reactflow_1.Handle, { type: "source", position: reactflow_1.Position.Bottom, style: { background: 'var(--am-accent, #0078d4)', width: 8, height: 8 } })));
}, (prevProps, nextProps) => {
    return (prevProps.selected === nextProps.selected &&
        prevProps.data.label === nextProps.data.label &&
        prevProps.data.isHighlighted === nextProps.data.isHighlighted &&
        prevProps.data.detailLevel === nextProps.data.detailLevel);
});
exports.LazyNode.displayName = 'LazyNode';
/**
 * Placeholder node during loading
 */
exports.PlaceholderNode = (0, react_1.memo)(() => {
    return (react_1.default.createElement("div", { style: {
            width: '150px',
            height: '40px',
            background: 'var(--am-panel-bg, #f9f9fa)',
            border: '1px solid var(--am-border, #e0e0e0)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulse 1.5s ease-in-out infinite',
        } },
        react_1.default.createElement("style", null, `@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }`),
        react_1.default.createElement("div", { style: { color: 'var(--am-desc, #666)', fontSize: '11px' } }, "Loading...")));
});
exports.PlaceholderNode.displayName = 'PlaceholderNode';
//# sourceMappingURL=LazyNode.js.map