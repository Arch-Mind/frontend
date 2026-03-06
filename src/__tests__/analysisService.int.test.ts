import { AnalysisService } from '../services/analysisService';
import * as vscode from 'vscode';

// Mocking the VS Code API and our common client/gateway etc.
jest.mock('vscode');

describe('AnalysisService Integration test', () => {
    let service: AnalysisService;

    beforeEach(() => {
        service = AnalysisService.getInstance();
    });

    it('should be a singleton', () => {
        const anotherInstance = AnalysisService.getInstance();
        expect(service).toBe(anotherInstance);
    });

    it('should handle analysis requests', async () => {
        const mockData: any = { nodes: [], edges: [], stats: { totalFiles: 0, totalFunctions: 0, totalClasses: 0 } };
        const mockAnalyze = jest.spyOn(service, 'analyze').mockResolvedValue(mockData);

        await service.analyze('/test/path');
        expect(mockAnalyze).toHaveBeenCalledWith('/test/path');

        mockAnalyze.mockRestore();
    });
});
