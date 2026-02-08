import React, { useState, useRef, useEffect } from 'react';
import { Node, Edge } from 'reactflow';
import {
    exportAsPNG,
    exportAsSVG,
    exportAsJSON,
    exportAsMermaid,
    exportAsDOT,
    ExportFormat
} from './exportUtils';

interface ExportMenuProps {
    nodes: Node[];
    edges: Edge[];
    rawData: any;
    reactFlowWrapper: HTMLElement | null;
    isVisible: boolean;
    onClose: () => void;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({
    nodes,
    edges,
    rawData,
    reactFlowWrapper,
    isVisible,
    onClose,
}) => {
    const [isExporting, setIsExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState<string>('');
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
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

    if (!isVisible) return null;

    const handleExport = async (format: ExportFormat) => {
        setIsExporting(true);
        setExportStatus(`Exporting as ${format.toUpperCase()}...`);

        try {
            switch (format) {
                case 'png':
                    if (reactFlowWrapper) {
                        await exportAsPNG(reactFlowWrapper);
                        setExportStatus('PNG exported successfully!');
                    } else {
                        throw new Error('React Flow wrapper not found');
                    }
                    break;

                case 'svg':
                    exportAsSVG(nodes, edges);
                    setExportStatus('SVG exported successfully!');
                    break;

                case 'json':
                    exportAsJSON(nodes, edges, rawData);
                    setExportStatus('JSON exported successfully!');
                    break;

                case 'mermaid':
                    exportAsMermaid(nodes, edges);
                    setExportStatus('Mermaid diagram exported successfully!');
                    break;

                case 'dot':
                    exportAsDOT(nodes, edges);
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
        } catch (error) {
            console.error('Export error:', error);
            setExportStatus(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setTimeout(() => setExportStatus(''), 3000);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="export-menu" ref={menuRef}>
            <div className="export-header">
                <span className="export-title">📥 Export Graph</span>
                <button className="export-close" onClick={onClose} title="Close">×</button>
            </div>

            <div className="export-description">
                Export your architecture graph in various formats for documentation and sharing.
            </div>

            <div className="export-options">
                <button
                    className="export-option"
                    onClick={() => handleExport('png')}
                    disabled={isExporting}
                    title="Export as high-resolution PNG image"
                >
                    <span className="export-icon">🖼️</span>
                    <div className="export-option-content">
                        <span className="export-option-title">PNG Image</span>
                        <span className="export-option-desc">High-quality raster image</span>
                    </div>
                </button>

                <button
                    className="export-option"
                    onClick={() => handleExport('svg')}
                    disabled={isExporting}
                    title="Export as scalable SVG vector image"
                >
                    <span className="export-icon">🎨</span>
                    <div className="export-option-content">
                        <span className="export-option-title">SVG Vector</span>
                        <span className="export-option-desc">Scalable vector graphics</span>
                    </div>
                </button>

                <button
                    className="export-option"
                    onClick={() => handleExport('json')}
                    disabled={isExporting}
                    title="Export as JSON for reimport"
                >
                    <span className="export-icon">💾</span>
                    <div className="export-option-content">
                        <span className="export-option-title">JSON Data</span>
                        <span className="export-option-desc">For reimport and backup</span>
                    </div>
                </button>

                <button
                    className="export-option"
                    onClick={() => handleExport('mermaid')}
                    disabled={isExporting}
                    title="Export as Mermaid diagram markdown"
                >
                    <span className="export-icon">🧜</span>
                    <div className="export-option-content">
                        <span className="export-option-title">Mermaid Diagram</span>
                        <span className="export-option-desc">Markdown diagram syntax</span>
                    </div>
                </button>

                <button
                    className="export-option"
                    onClick={() => handleExport('dot')}
                    disabled={isExporting}
                    title="Export as Graphviz DOT format"
                >
                    <span className="export-icon">🔷</span>
                    <div className="export-option-content">
                        <span className="export-option-title">DOT (Graphviz)</span>
                        <span className="export-option-desc">For Graphviz rendering</span>
                    </div>
                </button>
            </div>

            {exportStatus && (
                <div className={`export-status ${exportStatus.includes('failed') ? 'error' : 'success'}`}>
                    {exportStatus}
                </div>
            )}

            <style>{`
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
            `}</style>
        </div>
    );
};
