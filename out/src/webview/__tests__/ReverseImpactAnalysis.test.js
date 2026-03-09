"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
require("@testing-library/jest-dom");
const ReverseImpactAnalysis_1 = require("../ReverseImpactAnalysis");
// Mock the global fetch function
const mockFetch = jest.fn();
global.fetch = mockFetch;
describe('ReverseImpactAnalysisPanel', () => {
    const defaultProps = {
        filePath: 'src/components/UserDashboard.tsx',
        backendUrl: 'http://localhost:8080',
        onClose: jest.fn(),
        onNodeClick: jest.fn(),
    };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('renders and calls backend with correct parameters', async () => {
        const mockData = {
            target_file: 'src/components/UserDashboard.tsx',
            impact_count: 2,
            severity_score: 82,
            severity_tier: 'Critical',
            metrics: { churn: 12, pagerank: 0.045 },
            upstream_dependencies: [
                { id: 'src/App.tsx', type: 'File', depth: 1 },
                { id: 'src/routes/MainRouter.tsx', type: 'File', depth: 2 }
            ]
        };
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
        });
        (0, react_2.render)(react_1.default.createElement(ReverseImpactAnalysis_1.ReverseImpactAnalysisPanel, { ...defaultProps }));
        // Verify loading state shows up
        expect(react_2.screen.getByText(/Analyzing impact.../i)).toBeInTheDocument();
        // Wait for data to load (by checking for data points that only render after load)
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('2 dependents')).toBeInTheDocument();
        });
        // Verify fetch was called with correct URL
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/analyze/impact?file_path=src%2Fcomponents%2FUserDashboard.tsx'));
        // Verify summary data
        expect(react_2.screen.getByText('Critical')).toBeInTheDocument();
        expect(react_2.screen.getByText('82')).toBeInTheDocument();
        expect(react_2.screen.getByText(/Churn: 12/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/PageRank: 0.0450/)).toBeInTheDocument();
        // Verify upstream dependencies are listed
        expect(react_2.screen.getByText('App.tsx')).toBeInTheDocument();
        expect(react_2.screen.getByText('MainRouter.tsx')).toBeInTheDocument();
    });
    it('renders correctly for Low severity', async () => {
        const mockData = {
            target_file: 'src/utils/helper.ts',
            impact_count: 1,
            severity_score: 15,
            severity_tier: 'Low',
            metrics: { churn: 2, pagerank: 0.01 },
            upstream_dependencies: [
                { id: 'src/test/unit.ts', type: 'File', depth: 1 }
            ]
        };
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
        });
        (0, react_2.render)(react_1.default.createElement(ReverseImpactAnalysis_1.ReverseImpactAnalysisPanel, { ...defaultProps, filePath: "src/utils/helper.ts" }));
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('Low')).toBeInTheDocument();
            expect(react_2.screen.getByText('15')).toBeInTheDocument();
        });
        // Verify severity color (Low)
        const severityBox = react_2.screen.getByText('Low').parentElement?.parentElement;
        // In the component, severity_tier text color is #2ecc71 for Low
        const tierText = react_2.screen.getByText('Low');
        expect(tierText).toHaveStyle({ color: '#2ecc71' });
    });
    it('handles error state gracefully', async () => {
        // Suppress expected console.error output during this test
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
        });
        (0, react_2.render)(react_1.default.createElement(ReverseImpactAnalysis_1.ReverseImpactAnalysisPanel, { ...defaultProps }));
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText(/⚠️ HTTP 500: Internal Server Error/i)).toBeInTheDocument();
        });
        consoleSpy.mockRestore();
    });
    it('calls onClose when close button is clicked', async () => {
        const mockData = {
            target_file: 'src/test.ts',
            impact_count: 0,
            severity_score: 0,
            severity_tier: 'Low',
            upstream_dependencies: []
        };
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
        });
        (0, react_2.render)(react_1.default.createElement(ReverseImpactAnalysis_1.ReverseImpactAnalysisPanel, { ...defaultProps }));
        await (0, react_2.waitFor)(() => {
            const closeBtn = react_2.screen.getByText('✕');
            react_2.fireEvent.click(closeBtn);
            expect(defaultProps.onClose).toHaveBeenCalled();
        });
    });
    it('handles empty upstream dependencies correctly', async () => {
        const mockData = {
            target_file: 'src/isolated.ts',
            impact_count: 0,
            severity_score: 5,
            severity_tier: 'Low',
            metrics: { churn: 1, pagerank: 0.001 },
            upstream_dependencies: []
        };
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
        });
        (0, react_2.render)(react_1.default.createElement(ReverseImpactAnalysis_1.ReverseImpactAnalysisPanel, { ...defaultProps, filePath: "src/isolated.ts" }));
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('No upstream dependencies found.')).toBeInTheDocument();
        });
    });
});
//# sourceMappingURL=ReverseImpactAnalysis.test.js.map