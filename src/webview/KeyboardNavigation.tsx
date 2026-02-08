/**
 * useKeyboardNavigation Hook
 * -------------------------
 * Enables keyboard-only navigation for graph nodes (arrow keys, enter, tab, shortcuts).
 * Used to improve accessibility and efficiency for power users.
 *
 * Features:
 * - Arrow keys to move between nodes
 * - Enter to activate/select node
 * - Tab to cycle through connected nodes
 * - Keyboard shortcuts for search, help, zoom, and theme
 *
 * @param {KeyboardNavigationOptions} options - Node list, selection/activation handlers, and helpers
 * @returns {object} Navigation state
 */

import React, { useEffect, useCallback, useRef } from 'react';

export interface KeyboardNavigationOptions {
    nodes: Array<{ id: string; [key: string]: any }>;
    onNodeSelect: (nodeId: string) => void;
    onNodeActivate: (nodeId: string) => void;
    getCurrentNodeId: () => string | null;
    getConnectedNodes: (nodeId: string) => string[];
    onFocusSearch?: () => void;
    onShowHelp?: () => void;
}

export function useKeyboardNavigation(options: KeyboardNavigationOptions) {
    const {
        nodes,
        onNodeSelect,
        onNodeActivate,
        getCurrentNodeId,
        getConnectedNodes,
        onFocusSearch,
        onShowHelp,
    } = options;

    const isNavigating = useRef(false);

    /**
     * Returns the next node ID in the given direction (up, down, left, right)
     * @param direction - Navigation direction
     * @returns {string | null} Next node ID
     */
    const getNextNode = useCallback((direction: 'up' | 'down' | 'left' | 'right'): string | null => {
        const currentId = getCurrentNodeId();
        if (!currentId || nodes.length === 0) {
            // No selection - return first node
            return nodes[0]?.id || null;
        }

        const currentIndex = nodes.findIndex(n => n.id === currentId);
        if (currentIndex === -1) return null;

        switch (direction) {
            case 'down':
                // Next node in list
                return nodes[(currentIndex + 1) % nodes.length]?.id || null;
            
            case 'up':
                // Previous node in list
                return nodes[(currentIndex - 1 + nodes.length) % nodes.length]?.id || null;
            
            case 'right':
            case 'left':
                // Try connected nodes first
                const connected = getConnectedNodes(currentId);
                if (connected.length > 0) {
                    return connected[0];
                }
                // Fall back to next/previous
                return direction === 'right'
                    ? nodes[(currentIndex + 1) % nodes.length]?.id || null
                    : nodes[(currentIndex - 1 + nodes.length) % nodes.length]?.id || null;
            
            default:
                return null;
        }
    }, [nodes, getCurrentNodeId, getConnectedNodes]);

    /**
     * Handles navigation with arrow keys
     * @param direction - Navigation direction
     */
    const handleArrowKey = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
        const nextNodeId = getNextNode(direction);
        if (nextNodeId) {
            onNodeSelect(nextNodeId);
        }
    }, [getNextNode, onNodeSelect]);

    /**
     * Handles tab navigation to cycle through connected nodes
     * @param shiftKey - Whether shift is held (reverse direction)
     */
    const handleTab = useCallback((shiftKey: boolean) => {
        const currentId = getCurrentNodeId();
        if (!currentId) {
            // No selection - select first node
            if (nodes.length > 0) {
                onNodeSelect(nodes[0].id);
            }
            return;
        }

        const connected = getConnectedNodes(currentId);
        if (connected.length === 0) {
            // No connections - just move to next node
            handleArrowKey(shiftKey ? 'up' : 'down');
            return;
        }

        // Cycle through connected nodes
        const currentConnectedIndex = connected.indexOf(currentId);
        const nextIndex = shiftKey
            ? (currentConnectedIndex - 1 + connected.length) % connected.length
            : (currentConnectedIndex + 1) % connected.length;
        
        onNodeSelect(connected[nextIndex]);
    }, [getCurrentNodeId, getConnectedNodes, nodes, onNodeSelect, handleArrowKey]);

    /**
     * Main keyboard event handler for navigation and shortcuts
     * @effect
     */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if we're in an input field
            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' ||
                          target.isContentEditable;

            // Arrow keys - move between nodes
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !isInput) {
                e.preventDefault();
                const direction = e.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right';
                handleArrowKey(direction);
                return;
            }

            // Enter - activate selected node
            if (e.key === 'Enter' && !isInput) {
                const currentId = getCurrentNodeId();
                if (currentId) {
                    e.preventDefault();
                    onNodeActivate(currentId);
                }
                return;
            }

            // Tab - cycle through connected nodes
            if (e.key === 'Tab' && !isInput) {
                e.preventDefault();
                handleTab(e.shiftKey);
                return;
            }

            // / - focus search
            if (e.key === '/' && !isInput) {
                e.preventDefault();
                onFocusSearch?.();
                return;
            }

            // ? - show help
            if (e.key === '?' && !isInput) {
                e.preventDefault();
                onShowHelp?.();
                return;
            }

            // Home - select first node
            if (e.key === 'Home' && !isInput) {
                e.preventDefault();
                if (nodes.length > 0) {
                    onNodeSelect(nodes[0].id);
                }
                return;
            }

            // End - select last node
            if (e.key === 'End' && !isInput) {
                e.preventDefault();
                if (nodes.length > 0) {
                    onNodeSelect(nodes[nodes.length - 1].id);
                }
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [nodes, handleArrowKey, handleTab, getCurrentNodeId, onNodeActivate, onFocusSearch, onShowHelp, onNodeSelect]);

    // Return navigation state (can be expanded for more features)
    return {
        isNavigating: isNavigating.current,
    };
}

/**
 * KeyboardHelp Component
 * ----------------------
 * Displays a help overlay listing all keyboard shortcuts for navigation, search, zoom, and theme.
 *
 * @component
 * @param {KeyboardHelpProps} props - onClose handler
 * @returns {JSX.Element}
 */
export interface KeyboardHelpProps {
    onClose: () => void;
}

export const KeyboardHelp: React.FC<KeyboardHelpProps> = ({ onClose }) => {
    return (
        <div className="keyboard-help-overlay" onClick={onClose}>
            <div className="keyboard-help-panel" onClick={e => e.stopPropagation()}>
                <div className="help-header">
                    <h3 className="help-title">⌨️ Keyboard Shortcuts</h3>
                    <button className="help-close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="help-sections">
                    <div className="help-section">
                        <h4 className="help-section-title">Navigation</h4>
                        <div className="help-shortcuts">
                            <div className="help-shortcut">
                                <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd>
                                <span>Move between nodes</span>
                            </div>
                            <div className="help-shortcut">
                                <kbd>Enter</kbd>
                                <span>Select/activate node</span>
                            </div>
                            <div className="help-shortcut">
                                <kbd>Tab</kbd>
                                <span>Cycle through connected nodes</span>
                            </div>
                            <div className="help-shortcut">
                                <kbd>Shift</kbd>+<kbd>Tab</kbd>
                                <span>Cycle backward</span>
                            </div>
                            <div className="help-shortcut">
                                <kbd>Home</kbd>
                                <span>First node</span>
                            </div>
                            <div className="help-shortcut">
                                <kbd>End</kbd>
                                <span>Last node</span>
                            </div>
                        </div>
                    </div>

                    <div className="help-section">
                        <h4 className="help-section-title">Search & View</h4>
                        <div className="help-shortcuts">
                            <div className="help-shortcut">
                                <kbd>/</kbd>
                                <span>Focus search</span>
                            </div>
                            <div className="help-shortcut">
                                <kbd>Ctrl</kbd>+<kbd>F</kbd>
                                <span>Open search</span>
                            </div>
                            <div className="help-shortcut">
                                <kbd>Esc</kbd>
                                <span>Close panels</span>
                            </div>
                            <div className="help-shortcut">
                                <kbd>?</kbd>
                                <span>Show this help</span>
                            </div>
                        </div>
                    </div>

                    <div className="help-section">
                        <h4 className="help-section-title">Zoom & Theme</h4>
                        <div className="help-shortcuts">
                            <div className="help-shortcut">
                                <kbd>Ctrl</kbd>+<kbd>+</kbd>
                                <span>Zoom in</span>
                            </div>
                            <div className="help-shortcut">
                                <kbd>Ctrl</kbd>+<kbd>−</kbd>
                                <span>Zoom out</span>
                            </div>
                            <div className="help-shortcut">
                                <kbd>Ctrl</kbd>+<kbd>0</kbd>
                                <span>Fit to screen</span>
                            </div>
                            <div className="help-shortcut">
                                <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd>
                                <span>Toggle theme</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="help-footer">
                    <button className="help-close-button" onClick={onClose}>
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    );
};
