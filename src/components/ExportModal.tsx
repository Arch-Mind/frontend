import React, { useState, useRef, useEffect } from 'react';
import { Node, Edge } from 'reactflow';
import {
    downloadJSON,
    formatFileSize,
    getJSONSize,
} from '../utils/exporters/jsonExporter';
import {
    exportAsPNG,
    exportAsJPEG,
    exportAsWebP,
    exportAsSVG,
    copyToClipboard,
    ImageExportOptions,
    estimateImageSize,
} from '../utils/exporters/imageExporter';
import {
    exportAsPDF,
    exportDetailedPDF,
    PDFExportOptions,
    estimatePDFSize,
} from '../utils/exporters/pdfExporter';
import {
    exportAsMarkdown,
    exportAsREADME,
    MarkdownExportOptions,
    getMarkdownSize,
} from '../utils/exporters/markdownExporter';

export interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    nodes: Node[];
    edges: Edge[];
    rawData?: any;
    reactFlowWrapper: HTMLElement | null;
    source?: 'local' | 'backend';
}

type ExportFormat = 'json' | 'png' | 'jpeg' | 'webp' | 'svg' | 'pdf' | 'markdown';
type ExportStatus = 'idle' | 'exporting' | 'success' | 'error';

export const ExportModal: React.FC<ExportModalProps> = ({
    isOpen,
    onClose,
    nodes,
    edges,
    rawData,
    reactFlowWrapper,
    source = 'local',
}) => {
    const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [selectedFormats, setSelectedFormats] = useState<Set<ExportFormat>>(new Set());
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Advanced options
    const [imageOptions, setImageOptions] = useState<Partial<ImageExportOptions>>({
        scale: 2,
        quality: 0.95,
    });
    const [pdfOptions, setPdfOptions] = useState<Partial<PDFExportOptions>>({
        includeMetadata: true,
        includeTitle: true,
    });
    const [markdownOptions, setMarkdownOptions] = useState<Partial<MarkdownExportOptions>>({
        format: 'mermaid',
        includeStats: true,
    });

    const modalRef = useRef<HTMLDivElement>(null);

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (modalRef.current && e.target instanceof HTMLElement && !modalRef.current.contains(e.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSingleExport = async (format: ExportFormat) => {
        setExportStatus('exporting');
        setStatusMessage(`Exporting as ${format.toUpperCase()}...`);

        try {
            switch (format) {
                case 'json':
                    downloadJSON(nodes, edges, `graph-export-${Date.now()}.json`, rawData, source);
                    break;

                case 'png':
                    if (!reactFlowWrapper) throw new Error('Graph element not found');
                    await exportAsPNG(reactFlowWrapper, `graph-${Date.now()}.png`, imageOptions);
                    break;

                case 'jpeg':
                    if (!reactFlowWrapper) throw new Error('Graph element not found');
                    await exportAsJPEG(reactFlowWrapper, `graph-${Date.now()}.jpg`, imageOptions);
                    break;

                case 'webp':
                    if (!reactFlowWrapper) throw new Error('Graph element not found');
                    await exportAsWebP(reactFlowWrapper, `graph-${Date.now()}.webp`, imageOptions);
                    break;

                case 'svg':
                    exportAsSVG(nodes, edges, `graph-${Date.now()}.svg`);
                    break;

                case 'pdf':
                    if (!reactFlowWrapper) throw new Error('Graph element not found');
                    await exportAsPDF(reactFlowWrapper, nodes, edges, `graph-${Date.now()}.pdf`, pdfOptions);
                    break;

                case 'markdown':
                    exportAsMarkdown(nodes, edges, `graph-${Date.now()}.md`, markdownOptions);
                    break;
            }

            setExportStatus('success');
            setStatusMessage(`Successfully exported as ${format.toUpperCase()}!`);

            setTimeout(() => {
                setExportStatus('idle');
                setStatusMessage('');
            }, 2000);
        } catch (error) {
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

        const errors: string[] = [];

        for (const format of Array.from(selectedFormats)) {
            try {
                await handleSingleExport(format);
                // Small delay between exports
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                errors.push(`${format}: ${error instanceof Error ? error.message : 'Failed'}`);
            }
        }

        if (errors.length === 0) {
            setExportStatus('success');
            setStatusMessage(`Successfully exported ${selectedFormats.size} formats!`);
        } else {
            setExportStatus('error');
            setStatusMessage(`${errors.length} exports failed: ${errors.join(', ')}`);
        }

        setTimeout(() => {
            setExportStatus('idle');
            setStatusMessage('');
            setSelectedFormats(new Set());
        }, 3000);
    };

    const toggleFormat = (format: ExportFormat) => {
        const newSet = new Set(selectedFormats);
        if (newSet.has(format)) {
            newSet.delete(format);
        } else {
            newSet.add(format);
        }
        setSelectedFormats(newSet);
    };

    const handleCopyToClipboard = async () => {
        if (!reactFlowWrapper) return;

        setExportStatus('exporting');
        setStatusMessage('Copying to clipboard...');

        try {
            await copyToClipboard(reactFlowWrapper);
            setExportStatus('success');
            setStatusMessage('Copied to clipboard!');

            setTimeout(() => {
                setExportStatus('idle');
                setStatusMessage('');
            }, 2000);
        } catch (error) {
            setExportStatus('error');
            setStatusMessage('Failed to copy to clipboard');

            setTimeout(() => {
                setExportStatus('idle');
                setStatusMessage('');
            }, 2000);
        }
    };

    // Calculate sizes
    const jsonSize = formatFileSize(getJSONSize(nodes, edges, rawData));
    const pdfSize = formatFileSize(estimatePDFSize(nodes, edges));
    const mdSize = formatFileSize(getMarkdownSize(nodes, edges));
    const imgEstimate = estimateImageSize(nodes, imageOptions.scale || 2);

    return (
        <div className="export-modal-overlay">
            <div className="export-modal" ref={modalRef}>
                <div className="export-modal-header">
                    <h2>📥 Export Graph</h2>
                    <button className="close-btn" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>

                <div className="export-modal-body">
                    <p className="export-description">
                        Export your architecture graph in multiple formats for documentation, sharing, and analysis.
                    </p>

                    {/* Quick Export Section */}
                    <section className="export-section">
                        <h3>Quick Export</h3>
                        <div className="export-grid">
                            <ExportButton
                                icon="💾"
                                title="JSON"
                                description="Complete data"
                                size={jsonSize}
                                onClick={() => handleSingleExport('json')}
                                disabled={exportStatus === 'exporting'}
                            />
                            <ExportButton
                                icon="🖼️"
                                title="PNG"
                                description="High-quality image"
                                size={formatFileSize(imgEstimate.estimatedBytes)}
                                onClick={() => handleSingleExport('png')}
                                disabled={exportStatus === 'exporting' || !reactFlowWrapper}
                            />
                            <ExportButton
                                icon="📄"
                                title="PDF"
                                description="Document format"
                                size={pdfSize}
                                onClick={() => handleSingleExport('pdf')}
                                disabled={exportStatus === 'exporting' || !reactFlowWrapper}
                            />
                            <ExportButton
                                icon="📝"
                                title="Markdown"
                                description="Documentation"
                                size={mdSize}
                                onClick={() => handleSingleExport('markdown')}
                                disabled={exportStatus === 'exporting'}
                            />
                        </div>
                    </section>

                    {/* Bulk Export Section */}
                    <section className="export-section">
                        <h3>Bulk Export</h3>
                        <p className="section-hint">Select multiple formats to export at once</p>

                        <div className="format-checkboxes">
                            {(['json', 'png', 'jpeg', 'webp', 'svg', 'pdf', 'markdown'] as ExportFormat[]).map(format => (
                                <label key={format} className="format-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={selectedFormats.has(format)}
                                        onChange={() => toggleFormat(format)}
                                        disabled={exportStatus === 'exporting'}
                                    />
                                    <span>{format.toUpperCase()}</span>
                                </label>
                            ))}
                        </div>

                        <button
                            className="bulk-export-btn"
                            onClick={handleBulkExport}
                            disabled={exportStatus === 'exporting' || selectedFormats.size === 0}
                        >
                            Export {selectedFormats.size > 0 && `(${selectedFormats.size})`} Selected
                        </button>
                    </section>

                    {/* Advanced Options */}
                    <section className="export-section">
                        <button
                            className="toggle-advanced"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                        >
                            {showAdvanced ? '▼' : '▶'} Advanced Options
                        </button>

                        {showAdvanced && (
                            <div className="advanced-options">
                                <div className="options-group">
                                    <h4>Image Options</h4>
                                    <label>
                                        Quality:
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="1"
                                            step="0.05"
                                            value={imageOptions.quality || 0.95}
                                            onChange={e => setImageOptions({
                                                ...imageOptions,
                                                quality: parseFloat(e.target.value)
                                            })}
                                        />
                                        <span>{Math.round((imageOptions.quality || 0.95) * 100)}%</span>
                                    </label>

                                    <label>
                                        Scale:
                                        <select
                                            value={imageOptions.scale || 2}
                                            onChange={e => setImageOptions({
                                                ...imageOptions,
                                                scale: parseInt(e.target.value)
                                            })}
                                        >
                                            <option value="1">1x</option>
                                            <option value="2">2x (Recommended)</option>
                                            <option value="3">3x</option>
                                        </select>
                                    </label>
                                </div>

                                <div className="options-group">
                                    <h4>PDF Options</h4>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={pdfOptions.includeMetadata ?? true}
                                            onChange={e => setPdfOptions({
                                                ...pdfOptions,
                                                includeMetadata: e.target.checked
                                            })}
                                        />
                                        Include Metadata
                                    </label>

                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={pdfOptions.includeTitle ?? true}
                                            onChange={e => setPdfOptions({
                                                ...pdfOptions,
                                                includeTitle: e.target.checked
                                            })}
                                        />
                                        Include Title
                                    </label>
                                </div>

                                <div className="options-group">
                                    <h4>Markdown Options</h4>
                                    <label>
                                        Format:
                                        <select
                                            value={markdownOptions.format || 'mermaid'}
                                            onChange={e => setMarkdownOptions({
                                                ...markdownOptions,
                                                format: e.target.value as any
                                            })}
                                        >
                                            <option value="mermaid">Mermaid Diagram</option>
                                            <option value="github">GitHub</option>
                                            <option value="standard">Standard</option>
                                        </select>
                                    </label>

                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={markdownOptions.includeStats ?? true}
                                            onChange={e => setMarkdownOptions({
                                                ...markdownOptions,
                                                includeStats: e.target.checked
                                            })}
                                        />
                                        Include Statistics
                                    </label>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Additional Actions */}
                    <section className="export-section">
                        <h3>Additional Actions</h3>
                        <div className="action-buttons">
                            <button
                                className="action-btn"
                                onClick={handleCopyToClipboard}
                                disabled={!reactFlowWrapper || exportStatus === 'exporting'}
                            >
                                📋 Copy to Clipboard
                            </button>
                            <button
                                className="action-btn"
                                onClick={() => exportAsSVG(nodes, edges, `graph-${Date.now()}.svg`)}
                                disabled={exportStatus === 'exporting'}
                            >
                                🎨 Export SVG
                            </button>
                            <button
                                className="action-btn"
                                onClick={() => exportAsREADME(nodes, edges, 'Project', 'ARCHITECTURE.md')}
                                disabled={exportStatus === 'exporting'}
                            >
                                📖 Export as README
                            </button>
                        </div>
                    </section>

                    {/* Status Message */}
                    {statusMessage && (
                        <div className={`status-message status-${exportStatus}`}>
                            {statusMessage}
                        </div>
                    )}

                    {/* Graph Info */}
                    <div className="graph-info">
                        <span>{nodes.length} nodes</span>
                        <span>•</span>
                        <span>{edges.length} edges</span>
                        <span>•</span>
                        <span>Source: {source}</span>
                    </div>
                </div>

                <style>{styles}</style>
            </div>
        </div>
    );
};

interface ExportButtonProps {
    icon: string;
    title: string;
    description: string;
    size: string;
    onClick: () => void;
    disabled: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({
    icon,
    title,
    description,
    size,
    onClick,
    disabled,
}) => (
    <button className="export-btn" onClick={onClick} disabled={disabled}>
        <span className="export-icon">{icon}</span>
        <div className="export-info">
            <div className="export-title">{title}</div>
            <div className="export-desc">{description}</div>
            <div className="export-size">~{size}</div>
        </div>
    </button>
);

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
