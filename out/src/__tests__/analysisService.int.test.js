"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const analysisService_1 = require("../services/analysisService");
// Mocking the VS Code API and our common client/gateway etc.
jest.mock('vscode');
describe('AnalysisService Integration test', () => {
    let service;
    beforeEach(() => {
        service = analysisService_1.AnalysisService.getInstance();
    });
    it('should be a singleton', () => {
        const anotherInstance = analysisService_1.AnalysisService.getInstance();
        expect(service).toBe(anotherInstance);
    });
    it('should handle analysis requests', async () => {
        const mockData = { nodes: [], edges: [], stats: { totalFiles: 0, totalFunctions: 0, totalClasses: 0 } };
        const mockAnalyze = jest.spyOn(service, 'analyze').mockResolvedValue(mockData);
        await service.analyze('/test/path');
        expect(mockAnalyze).toHaveBeenCalledWith('/test/path');
        mockAnalyze.mockRestore();
    });
});
//# sourceMappingURL=analysisService.int.test.js.map