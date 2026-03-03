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
exports.LandingPage = void 0;
const react_1 = __importStar(require("react"));
const LandingPage = ({ onAnalyze, onSelectRepo, repositories, isLoading }) => {
    const [repoUrl, setRepoUrl] = (0, react_1.useState)('');
    const handleSubmit = (e) => {
        e.preventDefault();
        if (repoUrl.trim()) {
            onAnalyze(repoUrl.trim());
        }
    };
    return (react_1.default.createElement("div", { className: "landing-page" },
        react_1.default.createElement("div", { className: "landing-content" },
            react_1.default.createElement("div", { className: "hero-section" },
                react_1.default.createElement("h1", { className: "hero-title" },
                    "Welcome to ",
                    react_1.default.createElement("span", { className: "brand-highlight" }, "ArchMind")),
                react_1.default.createElement("p", { className: "hero-subtitle" }, "Visualize, analyze, and master your codebase architecture with AI-powered insights.")),
            react_1.default.createElement("div", { className: "connect-section" },
                react_1.default.createElement("div", { className: "search-card" },
                    react_1.default.createElement("h3", null, "Connect a Repository"),
                    react_1.default.createElement("p", { className: "card-description" }, "Enter a GitHub repository URL to start the architectural analysis."),
                    react_1.default.createElement("form", { onSubmit: handleSubmit, className: "repo-form" },
                        react_1.default.createElement("input", { type: "text", className: "repo-input", placeholder: "https://github.com/owner/repo", value: repoUrl, onChange: (e) => setRepoUrl(e.target.value), disabled: isLoading }),
                        react_1.default.createElement("button", { type: "submit", className: "analyze-btn", disabled: isLoading || !repoUrl.trim() }, isLoading ? (react_1.default.createElement("span", { className: "btn-content" },
                            react_1.default.createElement("div", { className: "mini-spinner" }),
                            " Analyzing...")) : ('Analyze Now'))))),
            repositories.length > 0 && (react_1.default.createElement("div", { className: "recent-section" },
                react_1.default.createElement("h3", null, "Recent Repositories"),
                react_1.default.createElement("div", { className: "repo-grid" }, repositories.map((repo) => (react_1.default.createElement("div", { key: repo.id, className: "repo-card", onClick: () => onSelectRepo(String(repo.id)) },
                    react_1.default.createElement("div", { className: "repo-card-icon" }, "\uD83D\uDCC1"),
                    react_1.default.createElement("div", { className: "repo-card-info" },
                        react_1.default.createElement("div", { className: "repo-name" }, repo.url.split('/').pop()),
                        react_1.default.createElement("div", { className: "repo-url" }, repo.url)),
                    react_1.default.createElement("div", { className: "repo-card-arrow" }, "\u2192"))))))),
            react_1.default.createElement("div", { className: "features-section" },
                react_1.default.createElement("div", { className: "feature-item" },
                    react_1.default.createElement("span", { className: "feature-icon" }, "\uD83D\uDD0D"),
                    react_1.default.createElement("h4", null, "Impact Analysis"),
                    react_1.default.createElement("p", null, "Predict how changes propagate through your system.")),
                react_1.default.createElement("div", { className: "feature-item" },
                    react_1.default.createElement("span", { className: "feature-icon" }, "\uD83D\uDCE6"),
                    react_1.default.createElement("h4", null, "Module Boundaries"),
                    react_1.default.createElement("p", null, "Identify and enforce clean architectural boundaries.")),
                react_1.default.createElement("div", { className: "feature-item" },
                    react_1.default.createElement("span", { className: "feature-icon" }, "\uD83C\uDFAF"),
                    react_1.default.createElement("h4", null, "PageRank Scoring"),
                    react_1.default.createElement("p", null, "Find critical nodes based on network centrality."))))));
};
exports.LandingPage = LandingPage;
//# sourceMappingURL=LandingPage.js.map