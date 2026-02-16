
declare const acquireVsCodeApi: any;

let vscodeInstance: any = null;

export function getVsCodeApi() {
    if (vscodeInstance) {
        return vscodeInstance;
    }
    if (typeof acquireVsCodeApi === 'function') {
        try {
            vscodeInstance = acquireVsCodeApi();
        } catch (e) {
            console.warn('VS Code API has already been acquired or is unavailable', e);
            // In case it was already acquired but we lost the reference (unlikely in module scope), 
            // we can't really recover it unless we stored it. 
            // But since this module is a singleton, it should hold the reference once acquired.
        }
    }
    return vscodeInstance;
}
