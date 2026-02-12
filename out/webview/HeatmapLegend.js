"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeatmapLegend = void 0;
const react_1 = __importDefault(require("react"));
const heatmapUtils_1 = require("./heatmapUtils");
const HeatmapLegend = ({ mode, minMetric, maxMetric }) => {
    if (mode === 'off') {
        return null;
    }
    if (maxMetric <= 0) {
        return (react_1.default.createElement("div", { className: "heatmap-legend" },
            react_1.default.createElement("div", { className: "heatmap-legend-title" },
                "Heatmap: ",
                labelForMode(mode)),
            react_1.default.createElement("div", { className: "heatmap-legend-empty" },
                react_1.default.createElement("span", { style: { opacity: 0.7, fontSize: '12px' } }, "\u26A0\uFE0F No contribution data available. Run backend analysis to enable heatmap coloring."))));
    }
    const steps = [0.1, 0.5, 1];
    const labels = steps.map((step) => {
        const metric = minMetric + (maxMetric - minMetric) * step;
        return (0, heatmapUtils_1.formatHeatmapMetric)(mode, metric);
    });
    return (react_1.default.createElement("div", { className: "heatmap-legend" },
        react_1.default.createElement("div", { className: "heatmap-legend-title" },
            "Heatmap: ",
            labelForMode(mode)),
        react_1.default.createElement("div", { className: "heatmap-legend-scale" }, steps.map((step, index) => {
            const metric = minMetric + (maxMetric - minMetric) * step;
            return (react_1.default.createElement("div", { key: step, className: "heatmap-legend-step" },
                react_1.default.createElement("span", { className: "heatmap-legend-swatch", style: { backgroundColor: (0, heatmapUtils_1.getHeatmapColor)(metric, maxMetric) } }),
                react_1.default.createElement("span", { className: "heatmap-legend-label" }, labels[index])));
        }))));
};
exports.HeatmapLegend = HeatmapLegend;
function labelForMode(mode) {
    switch (mode) {
        case 'commit_count':
            return 'Commit Count';
        case 'last_modified':
            return 'Last Modified';
        case 'author_count':
            return 'Author Count';
        default:
            return 'Off';
    }
}
//# sourceMappingURL=HeatmapLegend.js.map