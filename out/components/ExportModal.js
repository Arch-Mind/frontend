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
exports.ExportModal = void 0;
const react_1 = __importStar(require("react"));
const jsonExporter_1 = require("../utils/exporters/jsonExporter");
const imageExporter_1 = require("../utils/exporters/imageExporter");
const pdfExporter_1 = require("../utils/exporters/pdfExporter");
const markdownExporter_1 = require("../utils/exporters/markdownExporter");
const ExportModal = ({ isOpen, onClose, nodes, edges, rawData, reactFlowWrapper, source = 'local', }) => {
    const [exportStatus, setExportStatus] = (0, react_1.useState)('idle');
    const [statusMessage, setStatusMessage] = (0, react_1.useState)('');
    const [selectedFormats, setSelectedFormats] = (0, react_1.useState)(new Set());
    const [showAdvanced, setShowAdvanced] = (0, react_1.useState)(false);
    // Advanced options
    const [imageOptions, setImageOptions] = (0, react_1.useState)({
        scale: 2,
        quality: 0.95,
    });
    const [pdfOptions, setPdfOptions] = (0, react_1.useState)({
        includeMetadata: true,
        includeTitle: true,
    });
    const [markdownOptions, setMarkdownOptions] = (0, react_1.useState)({
        format: 'mermaid',
        includeStats: true,
    });
    const modalRef = (0, react_1.useRef)(null);
    // Close on escape
    (0, react_1.useEffect)(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);
    // Click outside to close
    (0, react_1.useEffect)(() => {
        const handleClickOutside = (e) => {
            if (modalRef.current && e.target instanceof HTMLElement && !modalRef.current.contains(e.target)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);
    if (!isOpen)
        return null;
    const handleSingleExport = async (format) => {
        setExportStatus('exporting');
        setStatusMessage(`Exporting as ${format.toUpperCase()}...`);
        try {
            switch (format) {
                case 'json':
                    (0, jsonExporter_1.downloadJSON)(nodes, edges, `graph-export-${Date.now()}.json`, rawData, source);
                    break;
                case 'png':
                    if (!reactFlowWrapper)
                        throw new Error('Graph element not found');
                    await (0, imageExporter_1.exportAsPNG)(reactFlowWrapper, `graph-${Date.now()}.png`, imageOptions);
                    break;
                case 'jpeg':
                    if (!reactFlowWrapper)
                        throw new Error('Graph element not found');
                    await (0, imageExporter_1.exportAsJPEG)(reactFlowWrapper, `graph-${Date.now()}.jpg`, imageOptions);
                    break;
                case 'webp':
                    if (!reactFlowWrapper)
                        throw new Error('Graph element not found');
                    await (0, imageExporter_1.exportAsWebP)(reactFlowWrapper, `graph-${Date.now()}.webp`, imageOptions);
                    break;
                case 'svg':
                    (0, imageExporter_1.exportAsSVG)(nodes, edges, `graph-${Date.now()}.svg`);
                    break;
                case 'pdf':
                    if (!reactFlowWrapper)
                        throw new Error('Graph element not found');
                    await (0, pdfExporter_1.exportAsPDF)(reactFlowWrapper, nodes, edges, `graph-${Date.now()}.pdf`, pdfOptions);
                    break;
                case 'markdown':
                    (0, markdownExporter_1.exportAsMarkdown)(nodes, edges, `graph-${Date.now()}.md`, markdownOptions);
                    break;
            }
            setExportStatus('success');
            setStatusMessage(`Successfully exported as ${format.toUpperCase()}!`);
            setTimeout(() => {
                setExportStatus('idle');
                setStatusMessage('');
            }, 2000);
        }
        catch (error) {
            setExportStatus('error');
            setStatusMessage(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setTimeout(() => {
                setExportStatus('idle');
                setStatusMessage('');
            }, 3000);
        }
    };
    const handleBulkExport = async () => {
        if (selectedFormats.size === 0) {
            setStatusMessage('Please select at least one format');
            return;
        }
        setExportStatus('exporting');
        setStatusMessage(`Exporting ${selectedFormats.size} formats...`);
        const errors = [];
        for (const format of Array.from(selectedFormats)) {
            try {
                await handleSingleExport(format);
                // Small delay between exports
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            catch (error) {
                errors.push(`${format}: ${error instanceof Error ? error.message : 'Failed'}`);
            }
        }
        if (errors.length === 0) {
            setExportStatus('success');
            setStatusMessage(`Successfully exported ${selectedFormats.size} formats!`);
        }
        else {
            setExportStatus('error');
            setStatusMessage(`${errors.length} exports failed: ${errors.join(', ')}`);
        }
        setTimeout(() => {
            setExportStatus('idle');
            setStatusMessage('');
            setSelectedFormats(new Set());
        }, 3000);
    };
    const toggleFormat = (format) => {
        const newSet = new Set(selectedFormats);
        if (newSet.has(format)) {
            newSet.delete(format);
        }
        else {
            newSet.add(format);
        }
        setSelectedFormats(newSet);
    };
    const handleCopyToClipboard = async () => {
        if (!reactFlowWrapper)
            return;
        setExportStatus('exporting');
        setStatusMessage('Copying to clipboard...');
        try {
            await (0, imageExporter_1.copyToClipboard)(reactFlowWrapper);
            setExportStatus('success');
            setStatusMessage('Copied to clipboard!');
            setTimeout(() => {
                setExportStatus('idle');
                setStatusMessage('');
            }, 2000);
        }
        catch (error) {
            setExportStatus('error');
            setStatusMessage('Failed to copy to clipboard');
            setTimeout(() => {
                setExportStatus('idle');
                setStatusMessage('');
            }, 2000);
        }
    };
    // Calculate sizes
    const jsonSize = (0, jsonExporter_1.formatFileSize)((0, jsonExporter_1.getJSONSize)(nodes, edges, rawData));
    const pdfSize = (0, jsonExporter_1.formatFileSize)((0, pdfExporter_1.estimatePDFSize)(nodes, edges));
    const mdSize = (0, jsonExporter_1.formatFileSize)((0, markdownExporter_1.getMarkdownSize)(nodes, edges));
    const imgEstimate = (0, imageExporter_1.estimateImageSize)(nodes, imageOptions.scale || 2);
    return (react_1.default.createElement("div", { className: "export-modal-overlay" },
        react_1.default.createElement("div", { className: "export-modal", ref: modalRef },
            react_1.default.createElement("div", { className: "export-modal-header" },
                react_1.default.createElement("h2", null, "\uD83D\uDCE5 Export Graph"),
                react_1.default.createElement("button", { className: "close-btn", onClick: onClose, "aria-label": "Close" }, "\u00D7")),
            react_1.default.createElement("div", { className: "export-modal-body" },
                react_1.default.createElement("p", { className: "export-description" }, "Export your architecture graph in multiple formats for documentation, sharing, and analysis."),
                react_1.default.createElement("section", { className: "export-section" },
                    react_1.default.createElement("h3", null, "Quick Export"),
                    react_1.default.createElement("div", { className: "export-grid" },
                        react_1.default.createElement(ExportButton, { icon: "\uD83D\uDCBE", title: "JSON", description: "Complete data", size: jsonSize, onClick: () => handleSingleExport('json'), disabled: exportStatus === 'exporting' }),
                        react_1.default.createElement(ExportButton, { icon: "\uD83D\uDDBC\uFE0F", title: "PNG", description: "High-quality image", size: (0, jsonExporter_1.formatFileSize)(imgEstimate.estimatedBytes), onClick: () => handleSingleExport('png'), disabled: exportStatus === 'exporting' || !reactFlowWrapper }),
                        react_1.default.createElement(ExportButton, { icon: "\uD83D\uDCC4", title: "PDF", description: "Document format", size: pdfSize, onClick: () => handleSingleExport('pdf'), disabled: exportStatus === 'exporting' || !reactFlowWrapper }),
                        react_1.default.createElement(ExportButton, { icon: "\uD83D\uDCDD", title: "Markdown", description: "Documentation", size: mdSize, onClick: () => handleSingleExport('markdown'), disabled: exportStatus === 'exporting' }))),
                react_1.default.createElement("section", { className: "export-section" },
                    react_1.default.createElement("h3", null, "Bulk Export"),
                    react_1.default.createElement("p", { className: "section-hint" }, "Select multiple formats to export at once"),
                    react_1.default.createElement("div", { className: "format-checkboxes" }, ['json', 'png', 'jpeg', 'webp', 'svg', 'pdf', 'markdown'].map(format => (react_1.default.createElement("label", { key: format, className: "format-checkbox" },
                        react_1.default.createElement("input", { type: "checkbox", checked: selectedFormats.has(format), onChange: () => toggleFormat(format), disabled: exportStatus === 'exporting' }),
                        react_1.default.createElement("span", null, format.toUpperCase()))))),
                    react_1.default.createElement("button", { className: "bulk-export-btn", onClick: handleBulkExport, disabled: exportStatus === 'exporting' || selectedFormats.size === 0 },
                        "Export ",
                        selectedFormats.size > 0 && `(${selectedFormats.size})`,
                        " Selected")),
                react_1.default.createElement("section", { className: "export-section" },
                    react_1.default.createElement("button", { className: "toggle-advanced", onClick: () => setShowAdvanced(!showAdvanced) },
                        showAdvanced ? '▼' : '▶',
                        " Advanced Options"),
                    showAdvanced && (react_1.default.createElement("div", { className: "advanced-options" },
                        react_1.default.createElement("div", { className: "options-group" },
                            react_1.default.createElement("h4", null, "Image Options"),
                            react_1.default.createElement("label", null,
                                "Quality:",
                                react_1.default.createElement("input", { type: "range", min: "0.1", max: "1", step: "0.05", value: imageOptions.quality || 0.95, onChange: e => setImageOptions({
                                        ...imageOptions,
                                        quality: parseFloat(e.target.value)
                                    }) }),
                                react_1.default.createElement("span", null,
                                    Math.round((imageOptions.quality || 0.95) * 100),
                                    "%")),
                            react_1.default.createElement("label", null,
                                "Scale:",
                                react_1.default.createElement("select", { value: imageOptions.scale || 2, onChange: e => setImageOptions({
                                        ...imageOptions,
                                        scale: parseInt(e.target.value)
                                    }) },
                                    react_1.default.createElement("option", { value: "1" }, "1x"),
                                    react_1.default.createElement("option", { value: "2" }, "2x (Recommended)"),
                                    react_1.default.createElement("option", { value: "3" }, "3x")))),
                        react_1.default.createElement("div", { className: "options-group" },
                            react_1.default.createElement("h4", null, "PDF Options"),
                            react_1.default.createElement("label", null,
                                react_1.default.createElement("input", { type: "checkbox", checked: pdfOptions.includeMetadata ?? true, onChange: e => setPdfOptions({
                                        ...pdfOptions,
                                        includeMetadata: e.target.checked
                                    }) }),
                                "Include Metadata"),
                            react_1.default.createElement("label", null,
                                react_1.default.createElement("input", { type: "checkbox", checked: pdfOptions.includeTitle ?? true, onChange: e => setPdfOptions({
                                        ...pdfOptions,
                                        includeTitle: e.target.checked
                                    }) }),
                                "Include Title")),
                        react_1.default.createElement("div", { className: "options-group" },
                            react_1.default.createElement("h4", null, "Markdown Options"),
                            react_1.default.createElement("label", null,
                                "Format:",
                                react_1.default.createElement("select", { value: markdownOptions.format || 'mermaid', onChange: e => setMarkdownOptions({
                                        ...markdownOptions,
                                        format: e.target.value
                                    }) },
                                    react_1.default.createElement("option", { value: "mermaid" }, "Mermaid Diagram"),
                                    react_1.default.createElement("option", { value: "github" }, "GitHub"),
                                    react_1.default.createElement("option", { value: "standard" }, "Standard"))),
                            react_1.default.createElement("label", null,
                                react_1.default.createElement("input", { type: "checkbox", checked: markdownOptions.includeStats ?? true, onChange: e => setMarkdownOptions({
                                        ...markdownOptions,
                                        includeStats: e.target.checked
                                    }) }),
                                "Include Statistics"))))),
                react_1.default.createElement("section", { className: "export-section" },
                    react_1.default.createElement("h3", null, "Additional Actions"),
                    react_1.default.createElement("div", { className: "action-buttons" },
                        react_1.default.createElement("button", { className: "action-btn", onClick: handleCopyToClipboard, disabled: !reactFlowWrapper || exportStatus === 'exporting' }, "\uD83D\uDCCB Copy to Clipboard"),
                        react_1.default.createElement("button", { className: "action-btn", onClick: () => (0, imageExporter_1.exportAsSVG)(nodes, edges, `graph-${Date.now()}.svg`), disabled: exportStatus === 'exporting' }, "\uD83C\uDFA8 Export SVG"),
                        react_1.default.createElement("button", { className: "action-btn", onClick: () => (0, markdownExporter_1.exportAsREADME)(nodes, edges, 'Project', 'ARCHITECTURE.md'), disabled: exportStatus === 'exporting' }, "\uD83D\uDCD6 Export as README"))),
                statusMessage && (react_1.default.createElement("div", { className: `status-message status-${exportStatus}` }, statusMessage)),
                react_1.default.createElement("div", { className: "graph-info" },
                    react_1.default.createElement("span", null,
                        nodes.length,
                        " nodes"),
                    react_1.default.createElement("span", null, "\u2022"),
                    react_1.default.createElement("span", null,
                        edges.length,
                        " edges"),
                    react_1.default.createElement("span", null, "\u2022"),
                    react_1.default.createElement("span", null,
                        "Source: ",
                        source))),
            react_1.default.createElement("style", null, styles))));
};
exports.ExportModal = ExportModal;
const ExportButton = ({ icon, title, description, size, onClick, disabled, }) => (react_1.default.createElement("button", { className: "export-btn", onClick: onClick, disabled: disabled },
    react_1.default.createElement("span", { className: "export-icon" }, icon),
    react_1.default.createElement("div", { className: "export-info" },
        react_1.default.createElement("div", { className: "export-title" }, title),
        react_1.default.createElement("div", { className: "export-desc" }, description),
        react_1.default.createElement("div", { className: "export-size" },
            "~",
            size))));
const styles = `
    .export-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
    }

    .export-modal {
        background: var(--am-panel-bg);
        border-radius: 12px;
        width: 90%;
        max-width: 700px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        animation: modalSlideIn 0.3s ease-out;
    }

    @keyframes modalSlideIn {
        from {
            opacity: 0;
            transform: translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .export-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid var(--am-border);
    }

    .export-modal-header h2 {
        margin: 0;
        font-size: 20px;
        color: var(--am-panel-fg);
    }

    .close-btn {
        background: none;
        border: none;
        font-size: 28px;
        color: var(--am-panel-fg);
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.2s;
    }

    .close-btn:hover {
        background: var(--am-hover);
    }

    .export-modal-body {
        padding: 24px;
    }

    .export-description {
        margin: 0 0 24px 0;
        color: var(--am-desc);
        font-size: 14px;
        line-height: 1.5;
    }

    .export-section {
        margin-bottom: 24px;
    }

    .export-section h3 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--am-panel-fg);
    }

    .section-hint {
        margin: 0 0 12px 0;
        font-size: 13px;
        color: var(--am-desc);
    }

    .export-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 12px;
    }

    .export-btn {
        background: var(--am-bg-lighter, #2d2d2d);
        border: 1px solid var(--am-border);
        border-radius: 8px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
    }

    .export-btn:hover:not(:disabled) {
        background: var(--am-hover);
        border-color: var(--am-accent);
        transform: translateY(-2px);
    }

    .export-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .export-icon {
        font-size: 32px;
        display: block;
        margin-bottom: 8px;
    }

    .export-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .export-title {
        font-weight: 600;
        color: var(--am-panel-fg);
        font-size: 14px;
    }

    .export-desc {
        font-size: 12px;
        color: var(--am-desc);
    }

    .export-size {
        font-size: 11px;
        color: var(--am-accent);
        margin-top: 4px;
    }

    .format-checkboxes {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 16px;
    }

    .format-checkbox {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: var(--am-bg-lighter, #2d2d2d);
        border: 1px solid var(--am-border);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .format-checkbox:hover {
        background: var(--am-hover);
        border-color: var(--am-accent);
    }

    .format-checkbox input {
        cursor: pointer;
    }

    .format-checkbox span {
        font-size: 13px;
        color: var(--am-panel-fg);
    }

    .bulk-export-btn {
        width: 100%;
        padding: 12px;
        background: var(--am-btn-bg);
        color: var(--am-btn-fg);
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
    }

    .bulk-export-btn:hover:not(:disabled) {
        background: var(--am-btn-hover);
    }

    .bulk-export-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .toggle-advanced {
        background: none;
        border: none;
        color: var(--am-link);
        font-size: 14px;
        cursor: pointer;
        padding: 8px 0;
        text-align: left;
    }

    .toggle-advanced:hover {
        text-decoration: underline;
    }

    .advanced-options {
        margin-top: 16px;
        padding: 16px;
        background: var(--am-bg-lighter, #2d2d2d);
        border-radius: 8px;
    }

    .options-group {
        margin-bottom: 16px;
    }

    .options-group:last-child {
        margin-bottom: 0;
    }

    .options-group h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--am-panel-fg);
    }

    .options-group label {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        font-size: 13px;
        color: var(--am-panel-fg);
    }

    .options-group input[type="range"] {
        flex: 1;
    }

    .options-group select {
        flex: 1;
        padding: 4px 8px;
        background: var(--am-input-bg);
        color: var(--am-input-fg);
        border: 1px solid var(--am-input-border);
        border-radius: 4px;
    }

    .action-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .action-btn {
        padding: 8px 16px;
        background: var(--am-btn-secondary-bg);
        color: var(--am-btn-secondary-fg);
        border: none;
        border-radius: 6px;
        font-size: 13px;
        cursor: pointer;
        transition: background 0.2s;
    }

    .action-btn:hover:not(:disabled) {
        background: var(--am-btn-secondary-hover);
    }

    .action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .status-message {
        padding: 12px;
        border-radius: 6px;
        margin-top: 16px;
        font-size: 14px;
        text-align: center;
        animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .status-idle {
        display: none;
    }

    .status-exporting {
        background: rgba(66, 153, 225, 0.2);
        color: #4299e1;
        border: 1px solid rgba(66, 153, 225, 0.3);
    }

    .status-success {
        background: rgba(72, 187, 120, 0.2);
        color: #48bb78;
        border: 1px solid rgba(72, 187, 120, 0.3);
    }

    .status-error {
        background: rgba(245, 101, 101, 0.2);
        color: #f56565;
        border: 1px solid rgba(245, 101, 101, 0.3);
    }

    .graph-info {
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid var(--am-border);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 12px;
        color: var(--am-desc);
    }
`;
//# sourceMappingURL=ExportModal.js.map