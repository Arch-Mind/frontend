"use strict";
/**
 * ZoomControls Component (Issue #20)
 * Displays zoom level indicator and preset buttons
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZoomControls = void 0;
const react_1 = __importDefault(require("react"));
const ZoomControls = ({ zoomPan, position = 'bottom-right', }) => {
    const { zoomPercent, zoomIn, zoomOut, resetZoom, zoomToFit, presets, applyPreset, canZoomIn, canZoomOut, } = zoomPan;
    const [showPresets, setShowPresets] = react_1.default.useState(false);
    return (react_1.default.createElement("div", { className: `zoom-controls zoom-controls-${position}` },
        react_1.default.createElement("div", { className: "zoom-level-indicator", onClick: () => setShowPresets(!showPresets), title: "Click to show zoom presets" },
            react_1.default.createElement("span", { className: "zoom-icon" }, "\uD83D\uDD0D"),
            react_1.default.createElement("span", { className: "zoom-value" },
                zoomPercent,
                "%"),
            react_1.default.createElement("span", { className: "zoom-dropdown-icon" }, showPresets ? '▲' : '▼')),
        showPresets && (react_1.default.createElement("div", { className: "zoom-presets-dropdown" }, presets.map((preset, index) => (react_1.default.createElement("button", { key: index, className: "zoom-preset-btn", onClick: () => {
                applyPreset(preset);
                setShowPresets(false);
            } },
            preset.icon && react_1.default.createElement("span", { className: "preset-icon" }, preset.icon),
            react_1.default.createElement("span", { className: "preset-label" }, preset.label)))))),
        react_1.default.createElement("div", { className: "zoom-quick-controls" },
            react_1.default.createElement("button", { className: "zoom-btn", onClick: zoomOut, disabled: !canZoomOut, title: "Zoom Out (Ctrl+\u2212)" }, "\u2212"),
            react_1.default.createElement("button", { className: "zoom-btn", onClick: resetZoom, title: "Reset Zoom (Ctrl+1)" }, "\u2299"),
            react_1.default.createElement("button", { className: "zoom-btn", onClick: zoomIn, disabled: !canZoomIn, title: "Zoom In (Ctrl++)" }, "+"),
            react_1.default.createElement("button", { className: "zoom-btn", onClick: zoomToFit, title: "Fit to Screen (Ctrl+0)" }, "\u22A1")),
        react_1.default.createElement("div", { className: "zoom-shortcuts-hint" },
            react_1.default.createElement("div", { className: "shortcut-line" },
                react_1.default.createElement("kbd", null, "Ctrl"),
                "+",
                react_1.default.createElement("kbd", null, "+"),
                "/",
                react_1.default.createElement("kbd", null, "\u2212"),
                " Zoom"),
            react_1.default.createElement("div", { className: "shortcut-line" },
                react_1.default.createElement("kbd", null, "Ctrl"),
                "+",
                react_1.default.createElement("kbd", null, "0"),
                " Fit"),
            react_1.default.createElement("div", { className: "shortcut-line" },
                react_1.default.createElement("kbd", null, "Shift"),
                "+Drag Pan"))));
};
exports.ZoomControls = ZoomControls;
//# sourceMappingURL=ZoomControls.js.map