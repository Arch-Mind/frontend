"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeExportListener = initializeExportListener;
exports.saveFileInVSCode = saveFileInVSCode;
exports.isVSCodeWebview = isVSCodeWebview;
/**
 * Helper for VS Code webview file exports
 * Wraps postMessage with promises that resolve when extension responds
 */
const vscodeApi_1 = require("../vscodeApi");
let pendingExports = new Map();
/**
 * Initialize export message listener (call once on app start)
 */
function initializeExportListener() {
    if (typeof window === 'undefined')
        return;
    window.addEventListener('message', (event) => {
        const message = event.data;
        if (message.command === 'fileSaveSuccess' ||
            message.command === 'fileSaveError' ||
            message.command === 'fileSaveCancelled') {
            // Resolve all pending exports
            pendingExports.forEach(({ resolve, reject }, filename) => {
                if (message.command === 'fileSaveSuccess') {
                    resolve(message.path || 'File saved successfully');
                }
                else if (message.command === 'fileSaveError') {
                    reject(new Error(message.error || 'Export failed'));
                }
                else if (message.command === 'fileSaveCancelled') {
                    reject(new Error('Export cancelled by user'));
                }
            });
            // Clear pending exports
            pendingExports.clear();
        }
    });
}
/**
 * Send file save request to VS Code extension and wait for response
 */
function saveFileInVSCode(data, filename, mimeType) {
    return new Promise((resolve, reject) => {
        // Check if we're in VS Code webview context
        if (typeof acquireVsCodeApi !== 'function') {
            reject(new Error('Not in VS Code webview context'));
            return;
        }
        const vscode = (0, vscodeApi_1.getVsCodeApi)();
        // Store promise handlers
        pendingExports.set(filename, { resolve, reject });
        // Send message to extension
        vscode.postMessage({
            command: 'saveFile',
            data: data,
            filename: filename,
            mimeType: mimeType
        });
        // Timeout after 30 seconds
        setTimeout(() => {
            if (pendingExports.has(filename)) {
                pendingExports.delete(filename);
                reject(new Error('Export timeout - no response from extension'));
            }
        }, 30000);
    });
}
/**
 * Check if we're in VS Code webview context
 */
function isVSCodeWebview() {
    return typeof acquireVsCodeApi === 'function';
}
//# sourceMappingURL=vscodeExportHelper.js.map