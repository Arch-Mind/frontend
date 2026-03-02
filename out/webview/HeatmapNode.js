"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeatmapNode = void 0;
const react_1 = __importDefault(require("react"));
const reactflow_1 = require("reactflow");
const HeatmapNode = ({ data }) => {
    return (react_1.default.createElement("div", { className: "heatmap-node", title: data.heatmapTooltip || '' },
        react_1.default.createElement(reactflow_1.Handle, { type: "target", position: reactflow_1.Position.Left, style: { background: '#555' } }),
        react_1.default.createElement("div", { className: "heatmap-node-content" },
            react_1.default.createElement("div", { className: "heatmap-node-label" }, data.label),
            data.type && react_1.default.createElement("div", { className: "heatmap-node-type" }, data.type)),
        react_1.default.createElement(reactflow_1.Handle, { type: "source", position: reactflow_1.Position.Right, style: { background: '#555' } })));
};
exports.HeatmapNode = HeatmapNode;
//# sourceMappingURL=HeatmapNode.js.map