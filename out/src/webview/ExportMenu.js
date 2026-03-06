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
exports.ExportMenu = void 0;
const react_1 = __importStar(require("react"));
const exportUtils_1 = require("./exportUtils");
const ExportMenu = ({ nodes, edges, rawData, reactFlowWrapper, isVisible, onClose, }) => {
    const [isExporting, setIsExporting] = (0, react_1.useState)(false);
    const [exportStatus, setExportStatus] = (0, react_1.useState)('');
    const menuRef = (0, react_1.useRef)(null);
    // Close menu when clicking outside
    (0, react_1.useEffect)(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isVisible, onClose]);
    if (!isVisible)
        return null;
    const handleExport = async (format) => {
        setIsExporting(true);
        setExportStatus(`Exporting as ${format.toUpperCase()}...`);
        try {
            switch (format) {
                case 'png':
                    if (reactFlowWrapper) {
                        await (0, exportUtils_1.exportAsPNG)(reactFlowWrapper);
                        setExportStatus('PNG exported successfully!');
                    }
                    else {
                        throw new Error('React Flow wrapper not found');
                    }
                    break;
                case 'svg':
                    (0, exportUtils_1.exportAsSVG)(nodes, edges);
                    setExportStatus('SVG exported successfully!');
                    break;
                case 'json':
                    (0, exportUtils_1.exportAsJSON)(nodes, edges, rawData);
                    setExportStatus('JSON exported successfully!');
                    break;
                case 'mermaid':
                    (0, exportUtils_1.exportAsMermaid)(nodes, edges);
                    setExportStatus('Mermaid diagram exported successfully!');
                    break;
                case 'dot':
                    (0, exportUtils_1.exportAsDOT)(nodes, edges);
                    setExportStatus('DOT file exported successfully!');
                    break;
                default:
                    throw new Error(`Unknown export format: ${format}`);
            }
            // Clear status after 2 seconds
            setTimeout(() => {
                setExportStatus('');
                onClose();
            }, 2000);
        }
        catch (error) {
            console.error('Export error:', error);
            setExportStatus(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setTimeout(() => setExportStatus(''), 3000);
        }
        finally {
            setIsExporting(false);
        }
    };
    return (react_1.default.createElement("div", { className: "export-menu", ref: menuRef },
        react_1.default.createElement("div", { className: "export-header" },
            react_1.default.createElement("span", { className: "export-title" }, "\uD83D\uDCE5 Export Graph"),
            react_1.default.createElement("button", { className: "export-close", onClick: onClose, title: "Close" }, "\u00D7")),
        react_1.default.createElement("div", { className: "export-description" }, "Export your architecture graph in various formats for documentation and sharing."),
        react_1.default.createElement("div", { className: "export-options" },
            react_1.default.createElement("button", { className: "export-option", onClick: () => handleExport('png'), disabled: isExporting, title: "Export as high-resolution PNG image" },
                react_1.default.createElement("span", { className: "export-icon" }, "\uD83D\uDDBC\uFE0F"),
                react_1.default.createElement("div", { className: "export-option-content" },
                    react_1.default.createElement("span", { className: "export-option-title" }, "PNG Image"),
                    react_1.default.createElement("span", { className: "export-option-desc" }, "High-quality raster image"))),
            react_1.default.createElement("button", { className: "export-option", onClick: () => handleExport('svg'), disabled: isExporting, title: "Export as scalable SVG vector image" },
                react_1.default.createElement("span", { className: "export-icon" }, "\uD83C\uDFA8"),
                react_1.default.createElement("div", { className: "export-option-content" },
                    react_1.default.createElement("span", { className: "export-option-title" }, "SVG Vector"),
                    react_1.default.createElement("span", { className: "export-option-desc" }, "Scalable vector graphics"))),
            react_1.default.createElement("button", { className: "export-option", onClick: () => handleExport('json'), disabled: isExporting, title: "Export as JSON for reimport" },
                react_1.default.createElement("span", { className: "export-icon" }, "\uD83D\uDCBE"),
                react_1.default.createElement("div", { className: "export-option-content" },
                    react_1.default.createElement("span", { className: "export-option-title" }, "JSON Data"),
                    react_1.default.createElement("span", { className: "export-option-desc" }, "For reimport and backup"))),
            react_1.default.createElement("button", { className: "export-option", onClick: () => handleExport('mermaid'), disabled: isExporting, title: "Export as Mermaid diagram markdown" },
                react_1.default.createElement("span", { className: "export-icon" }, "\uD83E\uDDDC"),
                react_1.default.createElement("div", { className: "export-option-content" },
                    react_1.default.createElement("span", { className: "export-option-title" }, "Mermaid Diagram"),
                    react_1.default.createElement("span", { className: "export-option-desc" }, "Markdown diagram syntax"))),
            react_1.default.createElement("button", { className: "export-option", onClick: () => handleExport('dot'), disabled: isExporting, title: "Export as Graphviz DOT format" },
                react_1.default.createElement("span", { className: "export-icon" }, "\uD83D\uDD37"),
                react_1.default.createElement("div", { className: "export-option-content" },
                    react_1.default.createElement("span", { className: "export-option-title" }, "DOT (Graphviz)"),
                    react_1.default.createElement("span", { className: "export-option-desc" }, "For Graphviz rendering")))),
        exportStatus && (react_1.default.createElement("div", { className: `export-status ${exportStatus.includes('failed') ? 'error' : 'success'}` }, exportStatus)),
        react_1.default.createElement("style", null, `
                .export-menu {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: var(--am-panel-bg);
                    border: 1px solid var(--am-border);
                    border-radius: 8px;
                    padding: 20px;
                    min-width: 400px;
                    max-width: 500px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                    z-index: 10000;
                    backdrop-filter: blur(10px);
                }

                .export-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid var(--am-border);
                }

                .export-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--am-panel-fg);
                }

                .export-close {
                    background: none;
                    border: none;
                    color: var(--am-panel-fg);
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: background 0.2s;
                }

                .export-close:hover {
                    background: var(--am-bg-hover);
                }

                .export-description {
                    color: var(--am-fg-muted);
                    font-size: 13px;
                    margin-bottom: 16px;
                    line-height: 1.5;
                }

                .export-options {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .export-option {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    background: var(--am-bg-lighter);
                    border: 1px solid var(--am-border);
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: left;
                }

                .export-option:hover:not(:disabled) {
                    background: var(--am-bg-hover);
                    border-color: var(--am-accent);
                    transform: translateX(4px);
                }

                .export-option:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .export-icon {
                    font-size: 24px;
                    flex-shrink: 0;
                }

                .export-option-content {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .export-option-title {
                    font-weight: 500;
                    color: var(--am-panel-fg);
                    font-size: 14px;
                }

                .export-option-desc {
                    font-size: 12px;
                    color: var(--am-fg-muted);
                }

                .export-status {
                    margin-top: 12px;
                    padding: 10px;
                    border-radius: 4px;
                    font-size: 13px;
                    text-align: center;
                    animation: slideIn 0.3s ease-out;
                }

                .export-status.success {
                    background: rgba(46, 204, 113, 0.2);
                    color: #2ecc71;
                    border: 1px solid rgba(46, 204, 113, 0.3);
                }

                .export-status.error {
                    background: rgba(231, 76, 60, 0.2);
                    color: #e74c3c;
                    border: 1px solid rgba(231, 76, 60, 0.3);
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
            `)));
};
exports.ExportMenu = ExportMenu;
//# sourceMappingURL=ExportMenu.js.map