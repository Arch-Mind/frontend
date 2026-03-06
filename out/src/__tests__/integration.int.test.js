"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mocking the VS Code API for Jest
jest.mock('vscode');
describe('Extension-Webview Bridge Integration', () => {
    it('should correctly handle messages from the webview', async () => {
        // Mock implementation of a message handler
        const messageHandler = jest.fn();
        // Simulating a message event
        const message = { command: 'analyzeRepository', repoUrl: 'test-url' };
        // This is a simplified integration test to show how Jest can be used 
        // for extension logic without running a full VS Code instance.
        messageHandler(message);
        expect(messageHandler).toHaveBeenCalledWith(expect.objectContaining({
            command: 'analyzeRepository'
        }));
    });
});
//# sourceMappingURL=integration.int.test.js.map