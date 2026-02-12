export interface VsCodeApi {
    postMessage(message: unknown): void;
    getState(): unknown;
    setState(state: unknown): void;
}

declare global {
    interface Window {
        _vscodeApi?: VsCodeApi;
    }
}

// Declaration to satisfy TypeScript
declare const acquireVsCodeApi: () => VsCodeApi;

// Module-level cache
let apiInstance: VsCodeApi | undefined;

export function getVsCodeApi(): VsCodeApi {
    // 1. Check module-level cache first
    if (apiInstance) {
        return apiInstance;
    }

    // 2. Check if we already stored the API on the window (survives module reload)
    if (typeof window !== 'undefined' && window._vscodeApi) {
        apiInstance = window._vscodeApi;
        return apiInstance;
    }

    // 3. Try to acquire the API
    if (typeof acquireVsCodeApi === 'function') {
        try {
            const api = acquireVsCodeApi();
            apiInstance = api;
            if (typeof window !== 'undefined') {
                window._vscodeApi = api;
            }
            return api;
        } catch (e) {
            console.error('[ArchMind] Failed to acquire VS Code API (already acquired?):', e);
            // Fallthrough to return mock API so the app doesn't crash, 
            // although functionality might be limited if we lost the handle.
        }
    } else {
        console.warn('[ArchMind] acquireVsCodeApi is not a function. Running outside VS Code?');
    }

    // 4. Fallback to mock implementation (for development/browser testing or recovery)
    const mockApi: VsCodeApi = {
        postMessage: (msg: unknown) => console.log('[ArchMind Mock] postMessage:', msg),
        getState: () => ({}),
        setState: (state: unknown) => console.log('[ArchMind Mock] setState:', state),
    };

    // Cache the mock API too, to prevent repeated warnings
    apiInstance = mockApi;
    if (typeof window !== 'undefined') {
        window._vscodeApi = mockApi;
    }

    return mockApi;
}
