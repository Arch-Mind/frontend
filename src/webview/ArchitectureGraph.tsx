import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    useReactFlow,
    ReactFlowProvider,
    NodeProps,
    Handle,
    Position
} from 'reactflow';

import 'reactflow/dist/style.css';
import { FilterState } from './SearchFilter';

// VS Code API
declare function acquireVsCodeApi(): {
    postMessage: (message: any) => void;
};

const vscode = acquireVsCodeApi();

// Node data interface
interface NodeData {
    label: string;
    type: 'file' | 'directory' | 'function' | 'class' | 'module';
    filePath: string;
    relativePath: string;
    lineNumber?: number;
    fileExtension?: string;
    size?: number;
    isMatched?: boolean;
    isSelected?: boolean;
    isConnected?: boolean;
}

// Context menu state
interface ContextMenu {
    visible: boolean;
    x: number;
    y: number;
    nodeId: string | null;
    nodeData: NodeData | null;
}

// Custom Node Component with tooltip
const CustomNode: React.FC<NodeProps<NodeData>> = ({ data, selected }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    
    const getNodeIcon = () => {
        switch (data.type) {
            case 'directory': return '📁';
            case 'function': return 'ƒ';
            case 'class': return '◆';
            case 'module': return '📦';
            default: return '📄';
        }
    };

    const formatSize = (bytes?: number) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const nodeClass = `custom-node type-${data.type} ${data.isMatched === false ? 'dimmed' : ''} ${data.isSelected ? 'selected' : ''} ${data.isConnected ? 'connected' : ''}`;

    return (
        <div 
            className={nodeClass}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <Handle type="target" position={Position.Top} />
            <div className="node-content">
                <span className="node-icon">{getNodeIcon()}</span>
                <span className="node-label">{data.label}</span>
            </div>
            <Handle type="source" position={Position.Bottom} />
            
            {showTooltip && (
                <div className="node-tooltip">
                    <div className="tooltip-row"><strong>Name:</strong> {data.label}</div>
                    <div className="tooltip-row"><strong>Type:</strong> {data.type}</div>
                    <div className="tooltip-row"><strong>Path:</strong> {data.relativePath}</div>
                    {data.lineNumber && <div className="tooltip-row"><strong>Line:</strong> {data.lineNumber}</div>}
                    {data.fileExtension && <div className="tooltip-row"><strong>Extension:</strong> .{data.fileExtension}</div>}
                    {data.size && <div className="tooltip-row"><strong>Size:</strong> {formatSize(data.size)}</div>}
                    <div className="tooltip-hint">Click to open • Right-click for menu</div>
                </div>
            )}
        </div>
    );
};

const nodeTypes = { custom: CustomNode };

interface ArchitectureGraphProps {
    filter: FilterState;
    onMatchCountChange: (matched: number, total: number) => void;
}

// Match function for path patterns (simple glob-like matching)
function matchPathPattern(path: string, pattern: string): boolean {
    if (!pattern) return true;
    
    const normalizedPath = path.replace(/\\/g, '/').toLowerCase();
    const normalizedPattern = pattern.replace(/\\/g, '/').toLowerCase().trim();
    
    // Simple contains check first (for paths like "billing-system" or "projects/billing-system")
    if (normalizedPath.includes(normalizedPattern)) {
        return true;
    }
    
    // Check if any segment of the path matches the pattern
    const pathSegments = normalizedPath.split('/');
    const patternSegments = normalizedPattern.split('/');
    
    // Check if the last segment of pattern matches any segment in path
    const lastPatternSegment = patternSegments[patternSegments.length - 1];
    if (pathSegments.some(segment => segment.includes(lastPatternSegment))) {
        return true;
    }
    
    // Convert glob pattern to regex for wildcard support
    const regexPattern = normalizedPattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '{{GLOBSTAR}}')
        .replace(/\*/g, '[^/]*')
        .replace(/{{GLOBSTAR}}/g, '.*')
        .replace(/\?/g, '.');
    
    try {
        const regex = new RegExp(regexPattern, 'i');
        return regex.test(normalizedPath);
    } catch {
        return normalizedPath.includes(normalizedPattern);
    }
}

const ArchitectureGraphInner: React.FC<ArchitectureGraphProps> = ({ filter, onMatchCountChange }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [rawNodes, setRawNodes] = useState<any[]>([]);
    const [rawEdges, setRawEdges] = useState<any[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenu>({
        visible: false,
        x: 0,
        y: 0,
        nodeId: null,
        nodeData: null
    });
    
    const { fitView, setCenter } = useReactFlow();

    const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    // Get connected node IDs for a given node
    const getConnectedNodeIds = useCallback((nodeId: string) => {
        const connected = new Set<string>();
        rawEdges.forEach((edge: any) => {
            if (edge.source === nodeId) connected.add(edge.target);
            if (edge.target === nodeId) connected.add(edge.source);
        });
        return connected;
    }, [rawEdges]);

    // Apply filters and update nodes
    useEffect(() => {
        if (rawNodes.length === 0) return;

        const connectedIds = selectedNodeId ? getConnectedNodeIds(selectedNodeId) : new Set<string>();

        const layoutedNodes = rawNodes.map((n: any, index: number) => {
            // Check if node matches filters
            const matchesSearch = !filter.searchQuery || 
                n.label.toLowerCase().includes(filter.searchQuery.toLowerCase());
            
            // Ensure type is valid, default to 'file' if not recognized
            const nodeType = (n.type && ['file', 'directory', 'function', 'class', 'module'].includes(n.type)) 
                ? n.type as keyof typeof filter.nodeTypes 
                : 'file';
            const matchesType = filter.nodeTypes[nodeType] !== false;
            
            const matchesPath = matchPathPattern(n.relativePath || n.label, filter.pathPattern);
            
            const isMatched = matchesSearch && matchesType && matchesPath;
            const isSelected = n.id === selectedNodeId;
            const isConnected = connectedIds.has(n.id);

            return {
                id: n.id,
                type: 'custom',
                data: { 
                    label: n.label,
                    type: n.type || 'file',
                    filePath: n.filePath || n.id,
                    relativePath: n.relativePath || n.label,
                    lineNumber: n.lineNumber,
                    fileExtension: n.fileExtension,
                    size: n.size,
                    isMatched,
                    isSelected,
                    isConnected
                },
                position: { x: (index % 5) * 220, y: Math.floor(index / 5) * 120 },
            };
        });

        const matchedCount = layoutedNodes.filter(n => n.data.isMatched).length;
        onMatchCountChange(matchedCount, layoutedNodes.length);

        setNodes(layoutedNodes);
        
        // Style edges based on selection
        const styledEdges = rawEdges.map((e: any) => ({
            ...e,
            style: {
                stroke: (e.source === selectedNodeId || e.target === selectedNodeId) 
                    ? '#007acc' 
                    : 'var(--vscode-editor-foreground)',
                strokeWidth: (e.source === selectedNodeId || e.target === selectedNodeId) ? 2 : 1,
                opacity: selectedNodeId && e.source !== selectedNodeId && e.target !== selectedNodeId ? 0.3 : 1
            }
        }));
        setEdges(styledEdges);
    }, [rawNodes, rawEdges, filter, selectedNodeId, getConnectedNodeIds, onMatchCountChange, setNodes, setEdges]);

    // Listen for messages from the extension
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (message.command === 'architectureData') {
                const { nodes: newNodes, edges: newEdges } = message.data;
                setRawNodes(newNodes);
                setRawEdges(newEdges);
            }
        };

        window.addEventListener('message', handleMessage);
        vscode.postMessage({ command: 'requestArchitecture' });

        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Handle node click - open file
    const onNodeClick = useCallback((event: React.MouseEvent, node: Node<NodeData>) => {
        setSelectedNodeId(node.id);
        
        // Open file in editor
        if (node.data.type !== 'directory') {
            vscode.postMessage({
                command: 'openFile',
                filePath: node.data.filePath,
                lineNumber: node.data.lineNumber
            });
        }
    }, []);

    // Handle node right-click - show context menu
    const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node<NodeData>) => {
        event.preventDefault();
        setContextMenu({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            nodeId: node.id,
            nodeData: node.data
        });
    }, []);

    // Close context menu
    const closeContextMenu = useCallback(() => {
        setContextMenu(prev => ({ ...prev, visible: false }));
    }, []);

    // Context menu actions
    const handleContextMenuAction = useCallback((action: string) => {
        if (!contextMenu.nodeData) return;

        switch (action) {
            case 'open':
                vscode.postMessage({
                    command: 'openFile',
                    filePath: contextMenu.nodeData.filePath,
                    lineNumber: contextMenu.nodeData.lineNumber
                });
                break;
            case 'reveal':
                vscode.postMessage({
                    command: 'revealInExplorer',
                    filePath: contextMenu.nodeData.filePath
                });
                break;
            case 'definition':
                vscode.postMessage({
                    command: 'goToDefinition',
                    filePath: contextMenu.nodeData.filePath,
                    lineNumber: contextMenu.nodeData.lineNumber
                });
                break;
            case 'references':
                vscode.postMessage({
                    command: 'findReferences',
                    filePath: contextMenu.nodeData.filePath,
                    lineNumber: contextMenu.nodeData.lineNumber
                });
                break;
        }
        closeContextMenu();
    }, [contextMenu.nodeData, closeContextMenu]);

    // Handle pane click to close context menu and deselect
    const onPaneClick = useCallback(() => {
        closeContextMenu();
        setSelectedNodeId(null);
    }, [closeContextMenu]);

    // Focus on filtered results
    useEffect(() => {
        const handleFocusSelection = (event: CustomEvent) => {
            const matchedNodes = nodes.filter(n => (n.data as NodeData).isMatched);
            if (matchedNodes.length > 0) {
                fitView({ nodes: matchedNodes, padding: 0.2, duration: 500 });
            }
        };

        window.addEventListener('focusSelection' as any, handleFocusSelection);
        return () => window.removeEventListener('focusSelection' as any, handleFocusSelection);
    }, [nodes, fitView]);

    return (
        <div style={{ width: '100%', height: '100%' }} onClick={closeContextMenu}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onNodeContextMenu={onNodeContextMenu}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
            >
                <Controls />
                <MiniMap 
                    nodeColor={(node) => {
                        const data = node.data as NodeData;
                        if (data.isSelected) return '#007acc';
                        if (data.isMatched === false) return '#666';
                        switch (data.type) {
                            case 'directory': return '#dcb67a';
                            case 'function': return '#dcdcaa';
                            case 'class': return '#4ec9b0';
                            case 'module': return '#c586c0';
                            default: return '#9cdcfe';
                        }
                    }}
                />
                <Background gap={12} size={1} />
            </ReactFlow>

            {/* Context Menu */}
            {contextMenu.visible && (
                <div 
                    className="context-menu"
                    style={{ 
                        position: 'fixed', 
                        left: contextMenu.x, 
                        top: contextMenu.y,
                        zIndex: 1000
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="context-menu-item" onClick={() => handleContextMenuAction('open')}>
                        📄 Open File
                    </div>
                    <div className="context-menu-item" onClick={() => handleContextMenuAction('reveal')}>
                        📂 Reveal in Explorer
                    </div>
                    <div className="context-menu-separator" />
                    <div className="context-menu-item" onClick={() => handleContextMenuAction('definition')}>
                        🔍 Go to Definition
                    </div>
                    <div className="context-menu-item" onClick={() => handleContextMenuAction('references')}>
                        🔗 Find References
                    </div>
                </div>
            )}
        </div>
    );
};

// Wrapper with ReactFlowProvider
interface WrapperProps {
    filter: FilterState;
    onMatchCountChange: (matched: number, total: number) => void;
}

const ArchitectureGraph: React.FC<WrapperProps> = (props) => {
    return (
        <ReactFlowProvider>
            <ArchitectureGraphInner {...props} />
        </ReactFlowProvider>
    );
};

export default ArchitectureGraph;
