import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    console.log('ArchMind VS Code Extension is now active!');

    let disposable = vscode.commands.registerCommand('archmind.showArchitecture', () => {
        ArchitecturePanel.createOrShow(context.extensionUri);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() { }

class ArchitecturePanel {
    public static currentPanel: ArchitecturePanel | undefined;
    public static readonly viewType = 'archmindArchitecture';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (ArchitecturePanel.currentPanel) {
            ArchitecturePanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            ArchitecturePanel.viewType,
            'Architecture Intelligence',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'out/webview')]
            }
        );

        ArchitecturePanel.currentPanel = new ArchitecturePanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;


        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'requestArchitecture':
                        await this._sendArchitecture();
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    private async _sendArchitecture() {
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
        } catch (error) {
            console.error(error);
            vscode.window.showErrorMessage('Failed to analyze workspace');
        }
    }

    public dispose() {
        ArchitecturePanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = "Architecture Intelligence";
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
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
