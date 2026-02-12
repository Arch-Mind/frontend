"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeatmapNode = void 0;
const react_1 = __importDefault(require("react"));
const HeatmapNode = ({ data }) => {
    return (react_1.default.createElement("div", { className: "heatmap-node", title: data.heatmapTooltip || '' }, data.label));
};
exports.HeatmapNode = HeatmapNode;
//# sourceMappingURL=HeatmapNode.js.map