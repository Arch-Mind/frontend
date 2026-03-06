"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationHistory = void 0;
const react_1 = __importDefault(require("react"));
const NotificationHistory = ({ entries, onClear }) => {
    if (entries.length === 0) {
        return null;
    }
    return (react_1.default.createElement("div", { className: "notification-panel" },
        react_1.default.createElement("div", { className: "notification-header" },
            react_1.default.createElement("span", null, "Recent Updates"),
            react_1.default.createElement("button", { onClick: onClear }, "Clear")),
        react_1.default.createElement("ul", null, entries.map((entry) => (react_1.default.createElement("li", { key: entry.id },
            react_1.default.createElement("span", null, entry.message),
            react_1.default.createElement("time", null, entry.timestamp)))))));
};
exports.NotificationHistory = NotificationHistory;
//# sourceMappingURL=NotificationHistory.js.map