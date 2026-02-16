/**
 * Helper for VS Code webview file exports
 * Wraps postMessage with promises that resolve when extension responds
 */
import { getVsCodeApi } from '../vscodeApi';

declare const acquireVsCodeApi: any;


type SaveFileResponse = {
    command: 'fileSaveSuccess' | 'fileSaveError' | 'fileSaveCancelled';
    path?: string;
    error?: string;
};

let pendingExports: Map<string, { resolve: (path: string) => void; reject: (error: Error) => void }> = new Map();

/**
 * Initialize export message listener (call once on app start)
 */
export function initializeExportListener() {
    if (typeof window === 'undefined') return;

    window.addEventListener('message', (event) => {
        const message = event.data as SaveFileResponse;

        if (message.command === 'fileSaveSuccess' ||
            message.command === 'fileSaveError' ||
            message.command === 'fileSaveCancelled') {

            // Resolve all pending exports
            pendingExports.forEach(({ resolve, reject }, filename) => {
                if (message.command === 'fileSaveSuccess') {
                    resolve(message.path || 'File saved successfully');
                } else if (message.command === 'fileSaveError') {
                    reject(new Error(message.error || 'Export failed'));
                } else if (message.command === 'fileSaveCancelled') {
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
export function saveFileInVSCode(data: string, filename: string, mimeType: string): Promise<string> {
    return new Promise((resolve, reject) => {
        // Check if we're in VS Code webview context
        if (typeof acquireVsCodeApi !== 'function') {
            reject(new Error('Not in VS Code webview context'));
            return;
        }

        const vscode = getVsCodeApi();

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
export function isVSCodeWebview(): boolean {
    return typeof acquireVsCodeApi === 'function';
}
