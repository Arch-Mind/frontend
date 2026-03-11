"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchitectureInsightsPanel = void 0;
// src/webview/ArchitectureInsightsPanel.tsx
const react_1 = __importDefault(require("react"));
// ── helpers ──────────────────────────────────────────────────────────────────
function severityColor(severity) {
    switch (severity) {
        case 'critical': return '#ff4d4f';
        case 'high': return '#ff7a00';
        case 'medium': return '#faad14';
        default: return '#8c8c8c';
    }
}
function couplingColor(concern) {
    switch (concern) {
        case 'high': return '#ff4d4f';
        case 'medium': return '#faad14';
        default: return '#52c41a';
    }
}
function confidenceLabel(v) {
    if (v === null || v === undefined)
        return '';
    const pct = Math.round(v * 100);
    return `${pct}% confidence`;
}
// ── sub-components ────────────────────────────────────────────────────────────
const PatternBanner = ({ pattern }) => (react_1.default.createElement("div", { className: "ai-pattern-banner" },
    react_1.default.createElement("div", { className: "ai-pattern-header" },
        react_1.default.createElement("span", { className: "ai-pattern-type" }, pattern.pattern_type.toUpperCase()),
        pattern.confidence !== null && (react_1.default.createElement("span", { className: "ai-confidence-badge" }, confidenceLabel(pattern.confidence)))),
    react_1.default.createElement("p", { className: "ai-pattern-summary" }, pattern.summary),
    pattern.patterns_found.length > 0 && (react_1.default.createElement("div", { className: "ai-tags-row" }, pattern.patterns_found.map((p) => (react_1.default.createElement("span", { key: p, className: "ai-tag ai-tag--green" }, p)))))));
const AntipatternCard = ({ item }) => (react_1.default.createElement("div", { className: "ai-antipattern-card", style: { borderLeftColor: severityColor(item.severity) } },
    react_1.default.createElement("div", { className: "ai-antipattern-header" },
        react_1.default.createElement("span", { className: "ai-antipattern-name" }, item.name),
        react_1.default.createElement("span", { className: "ai-severity-badge", style: { background: severityColor(item.severity) } }, item.severity)),
    react_1.default.createElement("p", { className: "ai-antipattern-desc" }, item.description)));
const ModuleCard = ({ module }) => (react_1.default.createElement("div", { className: "ai-module-card" },
    react_1.default.createElement("div", { className: "ai-module-header" },
        react_1.default.createElement("span", { className: "ai-module-name", title: module.file_path || module.name }, module.name),
        react_1.default.createElement("div", { className: "ai-module-chips" },
            module.role && module.role !== 'unknown' && (react_1.default.createElement("span", { className: "ai-tag ai-tag--blue" }, module.role)),
            react_1.default.createElement("span", { className: "ai-tag", style: { background: couplingColor(module.coupling_concern), color: '#fff' } },
                module.coupling_concern,
                " coupling"))),
    module.language && (react_1.default.createElement("span", { className: "ai-module-lang" }, module.language)),
    react_1.default.createElement("p", { className: "ai-module-summary" }, module.summary)));
const LoadingSkeleton = () => (react_1.default.createElement("div", { className: "ai-skeleton-wrap" },
    react_1.default.createElement("div", { className: "ai-skeleton ai-skeleton--banner" }),
    react_1.default.createElement("div", { className: "ai-skeleton ai-skeleton--row" }),
    react_1.default.createElement("div", { className: "ai-skeleton ai-skeleton--row" }),
    react_1.default.createElement("div", { className: "ai-skeleton ai-skeleton--row ai-skeleton--short" })));
// ── main component ────────────────────────────────────────────────────────────
const ArchitectureInsightsPanel = ({ repoId, insights, isLoading, error, onRefresh, }) => {
    if (!repoId) {
        return (react_1.default.createElement("div", { className: "ai-empty-state" },
            react_1.default.createElement("span", { className: "ai-empty-icon" }, "\uD83C\uDFD7\uFE0F"),
            react_1.default.createElement("p", null, "No repository loaded. Analyse a repository first.")));
    }
    if (isLoading) {
        return (react_1.default.createElement("div", { className: "ai-panel" },
            react_1.default.createElement("div", { className: "ai-toolbar" },
                react_1.default.createElement("span", { className: "ai-toolbar-title" }, "AI Insights"),
                react_1.default.createElement("button", { className: "ai-refresh-btn", disabled: true }, "Generating\u2026")),
            react_1.default.createElement(LoadingSkeleton, null)));
    }
    if (error) {
        return (react_1.default.createElement("div", { className: "ai-panel" },
            react_1.default.createElement("div", { className: "ai-toolbar" },
                react_1.default.createElement("span", { className: "ai-toolbar-title" }, "AI Insights"),
                react_1.default.createElement("button", { className: "ai-refresh-btn", onClick: onRefresh }, "\u21BB Retry")),
            react_1.default.createElement("div", { className: "ai-error-state" },
                react_1.default.createElement("span", { className: "ai-empty-icon" }, "\u26A0\uFE0F"),
                react_1.default.createElement("p", { className: "ai-error-message" }, error),
                react_1.default.createElement("button", { className: "ai-refresh-btn", onClick: onRefresh }, "Try Again"))));
    }
    if (!insights) {
        return (react_1.default.createElement("div", { className: "ai-panel" },
            react_1.default.createElement("div", { className: "ai-toolbar" },
                react_1.default.createElement("span", { className: "ai-toolbar-title" }, "AI Insights"),
                react_1.default.createElement("button", { className: "ai-refresh-btn", onClick: onRefresh }, "Generate Insights")),
            react_1.default.createElement("div", { className: "ai-empty-state" },
                react_1.default.createElement("span", { className: "ai-empty-icon" }, "\u2728"),
                react_1.default.createElement("p", null,
                    "Click ",
                    react_1.default.createElement("strong", null, "Generate Insights"),
                    " to analyse your architecture with Gemini AI."))));
    }
    const { pattern, modules, generated_at, cached } = insights;
    return (react_1.default.createElement("div", { className: "ai-panel" },
        react_1.default.createElement("div", { className: "ai-toolbar" },
            react_1.default.createElement("span", { className: "ai-toolbar-title" }, "AI Insights"),
            react_1.default.createElement("div", { className: "ai-toolbar-right" },
                generated_at && (react_1.default.createElement("span", { className: "ai-timestamp" },
                    cached ? '📦 cached · ' : '',
                    new Date(generated_at).toLocaleString())),
                react_1.default.createElement("button", { className: "ai-refresh-btn", onClick: onRefresh }, "\u21BB Refresh"))),
        react_1.default.createElement("div", { className: "ai-scroll-area" },
            react_1.default.createElement(PatternBanner, { pattern: pattern }),
            pattern.recommendations.length > 0 && (react_1.default.createElement("section", { className: "ai-section" },
                react_1.default.createElement("h3", { className: "ai-section-title" }, "Recommendations"),
                react_1.default.createElement("ul", { className: "ai-recommendations" }, pattern.recommendations.map((rec, i) => (react_1.default.createElement("li", { key: i }, rec)))))),
            pattern.antipatterns.length > 0 && (react_1.default.createElement("section", { className: "ai-section" },
                react_1.default.createElement("h3", { className: "ai-section-title" }, "\u26A0\uFE0F Anti-patterns Detected"),
                react_1.default.createElement("div", { className: "ai-antipatterns-list" }, pattern.antipatterns.map((ap, i) => (react_1.default.createElement(AntipatternCard, { key: i, item: ap })))))),
            modules.length > 0 && (react_1.default.createElement("section", { className: "ai-section" },
                react_1.default.createElement("h3", { className: "ai-section-title" }, modules[0].file_path ? 'File Summaries' : 'Module Summaries'),
                react_1.default.createElement("div", { className: "ai-modules-grid" }, modules.map((m, i) => (react_1.default.createElement(ModuleCard, { key: i, module: m })))))))));
};
exports.ArchitectureInsightsPanel = ArchitectureInsightsPanel;
exports.default = exports.ArchitectureInsightsPanel;
//# sourceMappingURL=ArchitectureInsightsPanel.js.map