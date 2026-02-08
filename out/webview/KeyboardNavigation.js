"use strict";
/**
 * Keyboard Navigation Hook (Issue #18)
 * Enable keyboard-only navigation: Arrow keys, Enter, Tab, shortcuts
 */
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
exports.KeyboardHelp = void 0;
exports.useKeyboardNavigation = useKeyboardNavigation;
const react_1 = __importStar(require("react"));
function useKeyboardNavigation(options) {
    const { nodes, onNodeSelect, onNodeActivate, getCurrentNodeId, getConnectedNodes, onFocusSearch, onShowHelp, } = options;
    const isNavigating = (0, react_1.useRef)(false);
    /**
     * Get next node in direction
     */
    const getNextNode = (0, react_1.useCallback)((direction) => {
        const currentId = getCurrentNodeId();
        if (!currentId || nodes.length === 0) {
            // No selection - return first node
            return nodes[0]?.id || null;
        }
        const currentIndex = nodes.findIndex(n => n.id === currentId);
        if (currentIndex === -1)
            return null;
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
     * Navigate with arrow keys
     */
    const handleArrowKey = (0, react_1.useCallback)((direction) => {
        const nextNodeId = getNextNode(direction);
        if (nextNodeId) {
            onNodeSelect(nextNodeId);
        }
    }, [getNextNode, onNodeSelect]);
    /**
     * Tab navigation - cycle through connected nodes
     */
    const handleTab = (0, react_1.useCallback)((shiftKey) => {
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
     * Main keyboard event handler
     */
    (0, react_1.useEffect)(() => {
        const handleKeyDown = (e) => {
            // Check if we're in an input field
            const target = e.target;
            const isInput = target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable;
            // Arrow keys - move between nodes
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !isInput) {
                e.preventDefault();
                const direction = e.key.replace('Arrow', '').toLowerCase();
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
    return {
        isNavigating: isNavigating.current,
    };
}
const KeyboardHelp = ({ onClose }) => {
    return (react_1.default.createElement("div", { className: "keyboard-help-overlay", onClick: onClose },
        react_1.default.createElement("div", { className: "keyboard-help-panel", onClick: e => e.stopPropagation() },
            react_1.default.createElement("div", { className: "help-header" },
                react_1.default.createElement("h3", { className: "help-title" }, "\u2328\uFE0F Keyboard Shortcuts"),
                react_1.default.createElement("button", { className: "help-close-btn", onClick: onClose }, "\u2715")),
            react_1.default.createElement("div", { className: "help-sections" },
                react_1.default.createElement("div", { className: "help-section" },
                    react_1.default.createElement("h4", { className: "help-section-title" }, "Navigation"),
                    react_1.default.createElement("div", { className: "help-shortcuts" },
                        react_1.default.createElement("div", { className: "help-shortcut" },
                            react_1.default.createElement("kbd", null, "\u2191"),
                            react_1.default.createElement("kbd", null, "\u2193"),
                            react_1.default.createElement("kbd", null, "\u2190"),
                            react_1.default.createElement("kbd", null, "\u2192"),
                            react_1.default.createElement("span", null, "Move between nodes")),
                        react_1.default.createElement("div", { className: "help-shortcut" },
                            react_1.default.createElement("kbd", null, "Enter"),
                            react_1.default.createElement("span", null, "Select/activate node")),
                        react_1.default.createElement("div", { className: "help-shortcut" },
                            react_1.default.createElement("kbd", null, "Tab"),
                            react_1.default.createElement("span", null, "Cycle through connected nodes")),
                        react_1.default.createElement("div", { className: "help-shortcut" },
                            react_1.default.createElement("kbd", null, "Shift"),
                            "+",
                            react_1.default.createElement("kbd", null, "Tab"),
                            react_1.default.createElement("span", null, "Cycle backward")),
                        react_1.default.createElement("div", { className: "help-shortcut" },
                            react_1.default.createElement("kbd", null, "Home"),
                            react_1.default.createElement("span", null, "First node")),
                        react_1.default.createElement("div", { className: "help-shortcut" },
                            react_1.default.createElement("kbd", null, "End"),
                            react_1.default.createElement("span", null, "Last node")))),
                react_1.default.createElement("div", { className: "help-section" },
                    react_1.default.createElement("h4", { className: "help-section-title" }, "Search & View"),
                    react_1.default.createElement("div", { className: "help-shortcuts" },
                        react_1.default.createElement("div", { className: "help-shortcut" },
                            react_1.default.createElement("kbd", null, "/"),
                            react_1.default.createElement("span", null, "Focus search")),
                        react_1.default.createElement("div", { className: "help-shortcut" },
                            react_1.default.createElement("kbd", null, "Ctrl"),
                            "+",
                            react_1.default.createElement("kbd", null, "F"),
                            react_1.default.createElement("span", null, "Open search")),
                        react_1.default.createElement("div", { className: "help-shortcut" },
                            react_1.default.createElement("kbd", null, "Esc"),
                            react_1.default.createElement("span", null, "Close panels")),
                        react_1.default.createElement("div", { className: "help-shortcut" },
                            react_1.default.createElement("kbd", null, "?"),
                            react_1.default.createElement("span", null, "Show this help")))),
                react_1.default.createElement("div", { className: "help-section" },
                    react_1.default.createElement("h4", { className: "help-section-title" }, "Zoom & Theme"),
                    react_1.default.createElement("div", { className: "help-shortcuts" },
                        react_1.default.createElement("div", { className: "help-shortcut" },
                            react_1.default.createElement("kbd", null, "Ctrl"),
                            "+",
                            react_1.default.createElement("kbd", null, "+"),
                            react_1.default.createElement("span", null, "Zoom in")),
                        react_1.default.createElement("div", { className: "help-shortcut" },
                            react_1.default.createElement("kbd", null, "Ctrl"),
                            "+",
                            react_1.default.createElement("kbd", null, "\u2212"),
                            react_1.default.createElement("span", null, "Zoom out")),
                        react_1.default.createElement("div", { className: "help-shortcut" },
                            react_1.default.createElement("kbd", null, "Ctrl"),
                            "+",
                            react_1.default.createElement("kbd", null, "0"),
                            react_1.default.createElement("span", null, "Fit to screen")),
                        react_1.default.createElement("div", { className: "help-shortcut" },
                            react_1.default.createElement("kbd", null, "Ctrl"),
                            "+",
                            react_1.default.createElement("kbd", null, "Shift"),
                            "+",
                            react_1.default.createElement("kbd", null, "T"),
                            react_1.default.createElement("span", null, "Toggle theme"))))),
            react_1.default.createElement("div", { className: "help-footer" },
                react_1.default.createElement("button", { className: "help-close-button", onClick: onClose }, "Got it!")))));
};
exports.KeyboardHelp = KeyboardHelp;
//# sourceMappingURL=KeyboardNavigation.js.map