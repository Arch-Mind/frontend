"use strict";
/**
 * vscodeApi.ts
 * ------------
 * A singleton utility to ensure acquireVsCodeApi() is only called once.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVsCodeApi = getVsCodeApi;
let vscode;
/**
 * Gets the VS Code API instance.
 * Ensures the native acquireVsCodeApi() is only called once per webview lifecycle.
 */
function getVsCodeApi() {
    if (!vscode) {
        try {
            vscode = acquireVsCodeApi();
        }
        catch (err) {
            console.error('Failed to acquire VS Code API:', err);
            // Fallback for development if needed, though usually webview context is required
            vscode = {
                postMessage: (msg) => console.log('Mock postMessage:', msg),
                getState: () => ({}),
                setState: (s) => console.log('Mock setState:', s),
            };
        }
    }
    return vscode;
}
//# sourceMappingURL=vscodeApi.js.map