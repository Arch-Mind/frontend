/**
 * VS Code Webview API types
 */

interface VsCodeApi {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
}

/**
 * Global function provided by VS Code webviews
 */
declare function acquireVsCodeApi(): VsCodeApi;
