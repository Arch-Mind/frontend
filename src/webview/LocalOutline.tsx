
import React from 'react';

export interface LocalSymbol {
    name: string;
    kind: 'function' | 'class' | 'method' | 'variable';
    startLine: number;
    endLine: number;
    children?: LocalSymbol[];
}

interface LocalOutlineProps {
    fileName: string;
    symbols: LocalSymbol[];
    isVisible: boolean;
    onClose: () => void;
    onSymbolClick: (line: number) => void; // Could implement jump to line later
}

const SymbolItem: React.FC<{ symbol: LocalSymbol; depth: number }> = ({ symbol, depth }) => {
    const icon = {
        'function': '⚡',
        'method': 'Md', // M
        'class': '🏷️',
        'variable': 'Vx'
    }[symbol.kind] || '•';

    return (
        <div className="outline-item" style={{ paddingLeft: `${depth * 15}px` }}>
            <span className="outline-icon">{icon}</span>
            <span className="outline-name">{symbol.name}</span>
            <span className="outline-line">:{symbol.startLine}</span>
        </div>
    );
};

// Recursive renderer
const renderSymbols = (symbols: LocalSymbol[], depth: number = 0): React.ReactNode => {
    return symbols.map((sym, idx) => (
        <React.Fragment key={`${sym.name}-${idx}`}>
            <SymbolItem symbol={sym} depth={depth} />
            {sym.children && renderSymbols(sym.children, depth + 1)}
        </React.Fragment>
    ));
};

export const LocalOutline: React.FC<LocalOutlineProps> = ({ fileName, symbols, isVisible, onClose }) => {
    if (!isVisible || !symbols || symbols.length === 0) return null;

    return (
        <div className="local-outline-panel">
            <div className="outline-header">
                <span className="outline-title">📝 {fileName.split(/[/\\]/).pop()}</span>
                <button className="outline-close" onClick={onClose}>×</button>
            </div>
            <div className="outline-content">
                {renderSymbols(symbols)}
            </div>
            <style>{`
                .local-outline-panel {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    width: 250px;
                    max-height: 400px;
                    background: var(--am-panel-bg);
                    border: 1px solid var(--am-border);
                    border-radius: 6px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    z-index: 1000;
                    display: flex;
                    flex-direction: column;
                    color: var(--am-panel-fg);
                    font-size: 12px;
                }
                .outline-header {
                    padding: 8px 12px;
                    border-bottom: 1px solid var(--am-border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(255,255,255,0.05);
                }
                .outline-title {
                    font-weight: 600;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .outline-close {
                    background: none;
                    border: none;
                    color: var(--am-panel-fg);
                    cursor: pointer;
                    font-size: 16px;
                }
                .outline-content {
                    overflow-y: auto;
                    padding: 8px;
                    flex: 1;
                }
                .outline-item {
                    padding: 2px 4px;
                    display: flex;
                    align-items: center;
                }
                .outline-icon {
                    margin-right: 6px;
                    opacity: 0.7;
                    width: 16px;
                    text-align: center;
                }
                .outline-line {
                    margin-left: auto;
                    opacity: 0.5;
                    font-size: 10px;
                }
            `}</style>
        </div>
    );
};
