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
exports.ZoomToolbar = ZoomToolbar;
// src/webview/diagrams/ZoomToolbar.tsx
const react_1 = __importStar(require("react"));
const reactflow_1 = require("reactflow");
function ZoomToolbar({ fitPadding = 0.05, minZoom = 0.03, maxZoom = 3, }) {
    const rf = (0, reactflow_1.useReactFlow)();
    const [zoom, setZoom] = (0, react_1.useState)(1);
    const syncZoom = (0, react_1.useCallback)(() => {
        const vp = rf.getViewport();
        setZoom(vp.zoom);
    }, [rf]);
    const setZoomTo = (0, react_1.useCallback)((z) => {
        const vp = rf.getViewport();
        rf.setViewport({ x: vp.x, y: vp.y, zoom: z }, { duration: 120 });
        setZoom(z);
    }, [rf]);
    return (react_1.default.createElement("div", { style: {
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 10,
            display: "flex",
            gap: 10,
            alignItems: "center",
            padding: "8px 10px",
            borderRadius: 12,
            border: "1px solid #334155",
            background: "rgba(15,23,42,0.92)",
            color: "#e5e7eb",
        }, onMouseEnter: syncZoom },
        react_1.default.createElement("span", { style: { fontSize: 12, opacity: 0.9 } }, "Zoom"),
        react_1.default.createElement("input", { type: "range", min: minZoom, max: maxZoom, step: 0.02, value: zoom, onChange: (e) => setZoomTo(Number(e.target.value)), style: { width: 160 } }),
        react_1.default.createElement("span", { style: { fontSize: 12, width: 52, textAlign: "right" } },
            Math.round(zoom * 100),
            "%"),
        react_1.default.createElement("button", { onClick: () => rf.fitView({ padding: fitPadding }) }, "Fit")));
}
//# sourceMappingURL=ZoomToolbar.js.map