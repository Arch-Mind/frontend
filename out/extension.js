"use strict";
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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
function activate(context) {
    console.log('ArchMind VS Code Extension is now active!');
    let disposable = vscode.commands.registerCommand('archmind.showArchitecture', () => {
        ArchitecturePanel.createOrShow(context.extensionUri);
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }
class ArchitecturePanel {
    static createOrShow(extensionUri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // If we already have a panel, show it.
        if (ArchitecturePanel.currentPanel) {
            ArchitecturePanel.currentPanel._panel.reveal(column);
            return;
        }
        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(ArchitecturePanel.viewType, 'Architecture Intelligence', column || vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'out/webview')]
        });
        ArchitecturePanel.currentPanel = new ArchitecturePanel(panel, extensionUri);
    }
    constructor(panel, extensionUri) {
        this._disposables = [];
        this._panel = panel;
        this._extensionUri = extensionUri;
        // Set the webview's initial html content
        this._update();
        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'requestArchitecture':
                    await this._sendArchitecture();
                    return;
            }
        }, null, this._disposables);
    }
    async _sendArchitecture() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }
        const rootPath = workspaceFolders[0].uri.fsPath;
        try {
            // Dynamic import or require if needed, but we can import at top level if configured
            const { analyzeWorkspace } = require('./analyzer/fileSystem');
            const data = await analyzeWorkspace(rootPath);
            this._panel.webview.postMessage({ command: 'architectureData', data });
        }
        catch (error) {
            console.error(error);
            vscode.window.showErrorMessage('Failed to analyze workspace');
        }
    }
    dispose() {
        ArchitecturePanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _update() {
        const webview = this._panel.webview;
        this._panel.title = "Architecture Intelligence";
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }
    _getHtmlForWebview(webview) {
        const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'out/webview', 'bundle.js');
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Architecture Intelligence</title>
				<style>
					body, html, #root {
						height: 100%;
						margin: 0;
						overflow: hidden;
						background-color: var(--vscode-editor-background);
						color: var(--vscode-editor-foreground);
					}
				</style>
			</head>
			<body>
				<div id="root"></div>
				<script src="${scriptUri}"></script>
			</body>
			</html>`;
    }
}
ArchitecturePanel.viewType = 'archmindArchitecture';
//# sourceMappingURL=extension.js.map