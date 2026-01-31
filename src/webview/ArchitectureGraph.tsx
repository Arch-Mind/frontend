import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Node,
    Edge,
    BackgroundVariant,
    NodeMouseHandler,
    useReactFlow,
    ReactFlowProvider,
} from 'reactflow';

import 'reactflow/dist/style.css';

// Debounce hook for performant search on large graphs
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

// Types matching the backend analyzer
interface RawNode {
    id: string;
    label: string;
    type: 'file' | 'directory' | 'function' | 'class' | 'module';
    parentId?: string;
    extension?: string;
    language?: string;
    depth: number;
    filePath?: string;
    lineNumber?: number;
    endLineNumber?: number;
}

interface RawEdge {
    id: string;
    source: string;
    target: string;
    type: string;
}

interface GraphStats {
    totalFiles: number;
    totalDirectories: number;
    filesByLanguage: Record<string, number>;
}

interface ArchitectureData {
    nodes: RawNode[];
    edges: RawEdge[];
    stats: GraphStats;
}

// Color scheme for different node types
const NODE_COLORS: Record<string, string> = {
    directory: '#4a9eff',
    typescript: '#3178c6',
    javascript: '#f7df1e',
    json: '#292929',
    markdown: '#083fa1',
    css: '#264de4',
    python: '#3776ab',
    rust: '#dea584',
    go: '#00add8',
    function: '#9b59b6',
    class: '#e74c3c',
    module: '#27ae60',
    default: '#6b7280',
};

// Get color based on node type/language
function getNodeColor(node: RawNode): string {
    if (node.type === 'directory') return NODE_COLORS.directory;
    if (node.type === 'function') return NODE_COLORS.function;
    if (node.type === 'class') return NODE_COLORS.class;
    if (node.type === 'module') return NODE_COLORS.module;
    if (node.language) return NODE_COLORS[node.language] || NODE_COLORS.default;
    return NODE_COLORS.default;
}

// Search filter types
type NodeTypeFilter = 'all' | 'file' | 'directory' | 'function' | 'class' | 'module';

interface SearchFilters {
    searchTerm: string;
    nodeType: NodeTypeFilter;
    pathPattern: string;
}

// Check if a node matches the search filters
function matchesFilters(node: RawNode, filters: SearchFilters): boolean {
    const { searchTerm, nodeType, pathPattern } = filters;

    // Filter by node type
    if (nodeType !== 'all' && node.type !== nodeType) {
        return false;
    }

    // Filter by path pattern (glob-like matching)
    if (pathPattern) {
        // Normalize paths: convert backslashes to forward slashes for consistent matching
        const normalizedNodePath = node.id.replace(/\\/g, '/').toLowerCase();
        const normalizedPattern = pathPattern.replace(/\\/g, '/').toLowerCase();
        
        // Convert glob pattern to regex
        const regexPattern = normalizedPattern
            .replace(/[.+^${}()|[\]]/g, '\\$&')  // Escape special regex chars except * and ?
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        
        // Match anywhere in the path (not just from start)
        const regex = new RegExp(regexPattern, 'i');
        if (!regex.test(normalizedNodePath)) {
            return false;
        }
    }

    // Filter by search term (matches label or id)
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesLabel = node.label.toLowerCase().includes(term);
        const matchesId = node.id.toLowerCase().includes(term);
        if (!matchesLabel && !matchesId) {
            return false;
        }
    }

    return true;
}

// Hierarchical layout algorithm
function calculateHierarchicalLayout(
    nodes: RawNode[], 
    edges: RawEdge[],
    filters: SearchFilters,
    selectedNodeId: string | null
): { layoutedNodes: Node[]; matchingNodeIds: Set<string> } {
    // Determine which nodes match the filters
    const matchingNodeIds = new Set<string>();
    const hasActiveFilter = filters.searchTerm || filters.nodeType !== 'all' || filters.pathPattern;
    
    if (hasActiveFilter) {
        nodes.forEach(node => {
            if (matchesFilters(node, filters)) {
                matchingNodeIds.add(node.id);
            }
        });
    }

    // Group nodes by depth
    const nodesByDepth: Map<number, RawNode[]> = new Map();
    nodes.forEach(node => {
        const depthNodes = nodesByDepth.get(node.depth) || [];
        depthNodes.push(node);
        nodesByDepth.set(node.depth, depthNodes);
    });

    const layoutedNodes: Node[] = [];
    const horizontalSpacing = 220;
    const verticalSpacing = 80;

    nodesByDepth.forEach((depthNodes, depth) => {
        const totalWidth = depthNodes.length * horizontalSpacing;
        const startX = -totalWidth / 2;

        depthNodes.forEach((node, index) => {
            const color = getNodeColor(node);
            const isMatching = !hasActiveFilter || matchingNodeIds.has(node.id);
            const isSelected = selectedNodeId === node.id;
            
            layoutedNodes.push({
                id: node.id,
                data: {
                    label: node.label,
                    type: node.type,
                    language: node.language,
                    extension: node.extension,
                    filePath: node.filePath || node.id,
                    lineNumber: node.lineNumber,
                    endLineNumber: node.endLineNumber,
                },
                position: {
                    x: startX + index * horizontalSpacing,
                    y: depth * verticalSpacing,
                },
                style: {
                    background: node.type === 'directory' 
                        ? `${color}20` 
                        : 'var(--vscode-editor-background)',
                    borderColor: isSelected ? 'var(--vscode-focusBorder)' : color,
                    borderWidth: isSelected ? 3 : (node.type === 'directory' ? 2 : 1),
                    borderRadius: node.type === 'directory' ? 8 : 4,
                    opacity: isMatching ? 1 : 0.3,
                    boxShadow: isSelected ? '0 0 10px var(--vscode-focusBorder)' : undefined,
                },
                className: isMatching ? 'matching-node' : 'dimmed-node',
            });
        });
    });

    return { layoutedNodes, matchingNodeIds };
}

// Format edges with proper styling
function formatEdges(rawEdges: RawEdge[], selectedNodeId: string | null, matchingNodeIds: Set<string>): Edge[] {
    return rawEdges.map(edge => {
        const isConnectedToSelected = selectedNodeId !== null && 
            (edge.source === selectedNodeId || edge.target === selectedNodeId);
        const isMatching = matchingNodeIds.size === 0 || 
            (matchingNodeIds.has(edge.source) && matchingNodeIds.has(edge.target));
        
        return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: 'smoothstep',
            animated: isConnectedToSelected ? true : false,
            style: {
                stroke: isConnectedToSelected 
                    ? 'var(--vscode-focusBorder)' 
                    : 'var(--vscode-editor-foreground)',
                strokeWidth: isConnectedToSelected ? 2 : 1,
                opacity: isMatching ? (isConnectedToSelected ? 0.9 : 0.5) : 0.15,
            },
        };
    });
}

// Declare VS Code API type
declare function acquireVsCodeApi(): {
    postMessage(message: unknown): void;
    getState(): unknown;
    setState(state: unknown): void;
};

interface StatsDisplayProps {
    stats: GraphStats | null;
}

const StatsDisplay: React.FC<StatsDisplayProps> = ({ stats }) => {
    if (!stats) return null;

    return (
        <div className="stats-panel">
            <div className="stat-item">
                <span className="stat-label">Files:</span>
                <span className="stat-value">{stats.totalFiles}</span>
            </div>
            <div className="stat-item">
                <span className="stat-label">Directories:</span>
                <span className="stat-value">{stats.totalDirectories}</span>
            </div>
            {Object.entries(stats.filesByLanguage).length > 0 && (
                <div className="stat-languages">
                    {Object.entries(stats.filesByLanguage)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([lang, count]) => (
                            <span key={lang} className="language-badge" style={{
                                backgroundColor: NODE_COLORS[lang] || NODE_COLORS.default,
                            }}>
                                {lang}: {count}
                            </span>
                        ))}
                </div>
            )}
        </div>
    );
};

// Search Panel Component
interface SearchPanelProps {
    filters: SearchFilters;
    onFiltersChange: (filters: SearchFilters) => void;
    matchCount: number;
    totalCount: number;
    onFocusSelection: () => void;
    isVisible: boolean;
    onClose: () => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({
    filters,
    onFiltersChange,
    matchCount,
    totalCount,
    onFocusSelection,
    isVisible,
    onClose,
}) => {
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isVisible && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isVisible]);

    if (!isVisible) return null;

    const hasActiveFilter = filters.searchTerm || filters.nodeType !== 'all' || filters.pathPattern;

    return (
        <div className="search-panel">
            <div className="search-header">
                <span className="search-title">🔍 Search & Filter</span>
                <button className="search-close" onClick={onClose} title="Close (Esc)">×</button>
            </div>
            
            <div className="search-field">
                <label>Search by name:</label>
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Enter file/function name..."
                    value={filters.searchTerm}
                    onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
                    className="search-input"
                />
            </div>

            <div className="search-field">
                <label>Filter by type:</label>
                <select
                    value={filters.nodeType}
                    onChange={(e) => onFiltersChange({ ...filters, nodeType: e.target.value as NodeTypeFilter })}
                    className="search-select"
                >
                    <option value="all">All Types</option>
                    <option value="file">📄 Files</option>
                    <option value="directory">📁 Directories</option>
                    <option value="function">⚡ Functions</option>
                    <option value="class">🏷️ Classes</option>
                    <option value="module">📦 Modules</option>
                </select>
            </div>

            <div className="search-field">
                <label>Path pattern:</label>
                <input
                    type="text"
                    placeholder="e.g., src/*.ts, **/utils/*"
                    value={filters.pathPattern}
                    onChange={(e) => onFiltersChange({ ...filters, pathPattern: e.target.value })}
                    className="search-input"
                />
            </div>

            <div className="search-results">
                {hasActiveFilter ? (
                    <span className="result-count">
                        Found <strong>{matchCount}</strong> of {totalCount} nodes
                    </span>
                ) : (
                    <span className="result-count">Showing all {totalCount} nodes</span>
                )}
            </div>

            <div className="search-actions">
                <button 
                    className="search-btn"
                    onClick={onFocusSelection}
                    disabled={matchCount === 0}
                    title="Zoom to show all matching nodes"
                >
                    📍 Focus on Results
                </button>
                <button 
                    className="search-btn secondary"
                    onClick={() => onFiltersChange({ searchTerm: '', nodeType: 'all', pathPattern: '' })}
                    disabled={!hasActiveFilter}
                >
                    Clear Filters
                </button>
            </div>

            <div className="search-hint">
                <kbd>Ctrl</kbd>+<kbd>F</kbd> to toggle search
            </div>
        </div>
    );
};

// Tooltip Component for Node Hover
interface TooltipProps {
    node: Node | null;
    position: { x: number; y: number };
}

const NodeTooltip: React.FC<TooltipProps> = ({ node, position }) => {
    if (!node) return null;

    const data = node.data;
    return (
        <div 
            className="node-tooltip"
            style={{ 
                left: position.x + 10, 
                top: position.y + 10,
            }}
        >
            <div className="tooltip-header">
                <span className="tooltip-icon">
                    {data.type === 'directory' ? '📁' : 
                     data.type === 'function' ? '⚡' :
                     data.type === 'class' ? '🏷️' : '📄'}
                </span>
                <span className="tooltip-label">{data.label}</span>
            </div>
            <div className="tooltip-details">
                <div className="tooltip-row">
                    <span className="tooltip-key">Path:</span>
                    <span className="tooltip-value">{data.filePath || node.id}</span>
                </div>
                {data.lineNumber && (
                    <div className="tooltip-row">
                        <span className="tooltip-key">Line:</span>
                        <span className="tooltip-value">
                            {data.lineNumber}{data.endLineNumber ? ` - ${data.endLineNumber}` : ''}
                        </span>
                    </div>
                )}
                {data.language && (
                    <div className="tooltip-row">
                        <span className="tooltip-key">Language:</span>
                        <span className="tooltip-value">{data.language}</span>
                    </div>
                )}
                <div className="tooltip-row">
                    <span className="tooltip-key">Type:</span>
                    <span className="tooltip-value">{data.type}</span>
                </div>
            </div>
            <div className="tooltip-hint">
                Click to open • Right-click for actions
            </div>
        </div>
    );
};

// Context Menu Component
interface ContextMenuProps {
    node: Node | null;
    position: { x: number; y: number };
    onAction: (action: string) => void;
    onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ node, position, onAction, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    if (!node) return null;

    const isFile = node.data.type === 'file' || node.data.type === 'function' || node.data.type === 'class';

    return (
        <div 
            ref={menuRef}
            className="context-menu"
            style={{ left: position.x, top: position.y }}
        >
            <div className="context-menu-header">{node.data.label}</div>
            <div className="context-menu-divider" />
            {isFile && (
                <>
                    <button className="context-menu-item" onClick={() => onAction('open')}>
                        📄 Open File
                    </button>
                    <button className="context-menu-item" onClick={() => onAction('goToDefinition')}>
                        🎯 Go to Definition
                    </button>
                    <button className="context-menu-item" onClick={() => onAction('findReferences')}>
                        🔗 Find References
                    </button>
                    <div className="context-menu-divider" />
                </>
            )}
            <button className="context-menu-item" onClick={() => onAction('revealInExplorer')}>
                📂 Reveal in Explorer
            </button>
            <button className="context-menu-item" onClick={() => onAction('copyPath')}>
                📋 Copy Path
            </button>
        </div>
    );
};

// Inner component that uses ReactFlow hooks
const ArchitectureGraphInner: React.FC = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [stats, setStats] = useState<GraphStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    
    // Search and filter state
    const [searchVisible, setSearchVisible] = useState(false);
    const [filters, setFilters] = useState<SearchFilters>({
        searchTerm: '',
        nodeType: 'all',
        pathPattern: '',
    });
    
    // Debounce filters for performance on large graphs (200ms delay)
    const debouncedFilters = useDebounce(filters, 200);
    
    // Tooltip state
    const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    
    // Context menu state
    const [contextMenuNode, setContextMenuNode] = useState<Node | null>(null);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    
    // Store raw data for re-filtering
    const [rawData, setRawData] = useState<ArchitectureData | null>(null);
    const [matchingNodeIds, setMatchingNodeIds] = useState<Set<string>>(new Set());

    // ReactFlow instance for programmatic control
    const reactFlowInstance = useReactFlow();
    
    // VS Code API reference
    const vscodeRef = useRef<ReturnType<typeof acquireVsCodeApi> | null>(null);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    // Handle node click - open file in VS Code
    const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
        setSelectedNode(node.id);
        setContextMenuNode(null);
        
        // Open file in VS Code
        if (vscodeRef.current && node.data.type !== 'directory') {
            vscodeRef.current.postMessage({
                command: 'openFile',
                filePath: node.data.filePath || node.id,
                lineNumber: node.data.lineNumber,
            });
        }
    }, []);

    // Handle node right-click - show context menu
    const onNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
        event.preventDefault();
        setContextMenuNode(node);
        setContextMenuPosition({ x: event.clientX, y: event.clientY });
    }, []);

    // Handle node hover
    const onNodeMouseEnter: NodeMouseHandler = useCallback((event, node) => {
        setHoveredNode(node);
        setTooltipPosition({ x: event.clientX, y: event.clientY });
    }, []);

    const onNodeMouseLeave: NodeMouseHandler = useCallback(() => {
        setHoveredNode(null);
    }, []);

    // Handle context menu actions
    const handleContextMenuAction = useCallback((action: string) => {
        if (!contextMenuNode || !vscodeRef.current) return;

        const filePath = contextMenuNode.data.filePath || contextMenuNode.id;
        const lineNumber = contextMenuNode.data.lineNumber;

        switch (action) {
            case 'open':
                vscodeRef.current.postMessage({
                    command: 'openFile',
                    filePath,
                    lineNumber,
                });
                break;
            case 'goToDefinition':
                vscodeRef.current.postMessage({
                    command: 'goToDefinition',
                    filePath,
                    lineNumber,
                });
                break;
            case 'findReferences':
                vscodeRef.current.postMessage({
                    command: 'findReferences',
                    filePath,
                    lineNumber,
                });
                break;
            case 'revealInExplorer':
                vscodeRef.current.postMessage({
                    command: 'revealInExplorer',
                    filePath,
                });
                break;
            case 'copyPath':
                vscodeRef.current.postMessage({
                    command: 'copyPath',
                    filePath,
                });
                break;
        }

        setContextMenuNode(null);
    }, [contextMenuNode]);

    // Focus on filtered/matching nodes
    const handleFocusSelection = useCallback(() => {
        if (matchingNodeIds.size === 0) return;

        const matchingNodes = nodes.filter(n => matchingNodeIds.has(n.id));
        if (matchingNodes.length > 0) {
            reactFlowInstance.fitView({
                nodes: matchingNodes,
                padding: 0.3,
                duration: 500,
            });
        }
    }, [matchingNodeIds, nodes, reactFlowInstance]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+F / Cmd+F to toggle search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                setSearchVisible(prev => !prev);
            }
            // Escape to close search or context menu
            if (e.key === 'Escape') {
                setSearchVisible(false);
                setContextMenuNode(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Update graph when debounced filters change (performant for large graphs)
    useEffect(() => {
        if (!rawData) return;

        const { nodes: rawNodes, edges: rawEdges } = rawData;
        const { layoutedNodes, matchingNodeIds: newMatchingIds } = calculateHierarchicalLayout(
            rawNodes, 
            rawEdges, 
            debouncedFilters,
            selectedNode
        );
        const formattedEdges = formatEdges(rawEdges, selectedNode, newMatchingIds);

        setNodes(layoutedNodes);
        setEdges(formattedEdges);
        setMatchingNodeIds(newMatchingIds);
    }, [debouncedFilters, selectedNode, rawData, setNodes, setEdges]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (message.command === 'architectureData') {
                const data: ArchitectureData = message.data;
                setRawData(data);
                
                const { nodes: rawNodes, edges: rawEdges, stats: graphStats } = data;

                // Apply hierarchical layout (use current filters on initial load)
                const { layoutedNodes, matchingNodeIds: newMatchingIds } = calculateHierarchicalLayout(
                    rawNodes, 
                    rawEdges,
                    debouncedFilters,
                    selectedNode
                );
                const formattedEdges = formatEdges(rawEdges, selectedNode, newMatchingIds);

                setNodes(layoutedNodes);
                setEdges(formattedEdges);
                setStats(graphStats);
                setMatchingNodeIds(newMatchingIds);
                setIsLoading(false);
            }
        };

        window.addEventListener('message', handleMessage);

        // Request data from extension
        const vscode = acquireVsCodeApi();
        vscodeRef.current = vscode;
        vscode.postMessage({ command: 'requestArchitecture' });

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [setNodes, setEdges]);

    // Memoize minimap node color function
    const minimapNodeColor = useCallback((node: Node) => {
        if (node.data?.type === 'directory') return NODE_COLORS.directory;
        if (node.data?.type === 'function') return NODE_COLORS.function;
        if (node.data?.type === 'class') return NODE_COLORS.class;
        if (node.data?.language) return NODE_COLORS[node.data.language] || NODE_COLORS.default;
        return NODE_COLORS.default;
    }, []);

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
                <p>Analyzing workspace structure...</p>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <StatsDisplay stats={stats} />
            
            {/* Search Panel */}
            <SearchPanel
                filters={filters}
                onFiltersChange={setFilters}
                matchCount={matchingNodeIds.size || (filters.searchTerm || filters.nodeType !== 'all' || filters.pathPattern ? 0 : rawData?.nodes.length || 0)}
                totalCount={rawData?.nodes.length || 0}
                onFocusSelection={handleFocusSelection}
                isVisible={searchVisible}
                onClose={() => setSearchVisible(false)}
            />

            {/* Search Toggle Button */}
            {!searchVisible && (
                <button 
                    className="search-toggle-btn"
                    onClick={() => setSearchVisible(true)}
                    title="Search & Filter (Ctrl+F)"
                >
                    🔍
                </button>
            )}

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onNodeContextMenu={onNodeContextMenu}
                onNodeMouseEnter={onNodeMouseEnter}
                onNodeMouseLeave={onNodeMouseLeave}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.1}
                maxZoom={2}
                defaultEdgeOptions={{
                    type: 'smoothstep',
                }}
            >
                <Controls showInteractive={false} />
                <MiniMap 
                    nodeColor={minimapNodeColor}
                    maskColor="rgba(0, 0, 0, 0.8)"
                    style={{
                        backgroundColor: 'var(--vscode-editor-background)',
                    }}
                />
                <Background 
                    variant={BackgroundVariant.Dots}
                    gap={16} 
                    size={1} 
                    color="var(--vscode-editor-foreground)"
                    style={{ opacity: 0.1 }}
                />
            </ReactFlow>

            {/* Hover Tooltip */}
            <NodeTooltip node={hoveredNode} position={tooltipPosition} />

            {/* Context Menu */}
            <ContextMenu
                node={contextMenuNode}
                position={contextMenuPosition}
                onAction={handleContextMenuAction}
                onClose={() => setContextMenuNode(null)}
            />
        </div>
    );
};

// Wrapper component with ReactFlowProvider
const ArchitectureGraph: React.FC = () => {
    return (
        <ReactFlowProvider>
            <ArchitectureGraphInner />
        </ReactFlowProvider>
    );
};

export default ArchitectureGraph;
