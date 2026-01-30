"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const ArchitectureGraph_1 = __importDefault(require("./ArchitectureGraph"));
const Header = () => (react_1.default.createElement("header", { className: "app-header" },
    react_1.default.createElement("div", { className: "header-content" },
        react_1.default.createElement("h1", { className: "header-title" },
            react_1.default.createElement("span", { className: "header-icon" }, "\uD83C\uDFD7\uFE0F"),
            "ArchMind"),
        react_1.default.createElement("span", { className: "header-subtitle" }, "Architecture Intelligence"))));
const App = () => {
    return (react_1.default.createElement("div", { className: "app-container" },
        react_1.default.createElement(Header, null),
        react_1.default.createElement("main", { className: "app-main" },
            react_1.default.createElement(ArchitectureGraph_1.default, null))));
};
exports.default = App;
//# sourceMappingURL=App.js.map