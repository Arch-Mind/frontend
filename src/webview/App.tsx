import React, { useEffect, useState } from 'react';
import ArchitectureGraph from './ArchitectureGraph';
import { ModuleBoundaryDiagram } from './ModuleBoundaryDiagram';
import { BoundaryDiagram } from './BoundaryDiagram';
import { DependencyDiagram } from './DependencyDiagram';
import { CommunicationDiagram } from './CommunicationDiagram';
import { CommitDetails } from './CommitDetails';
import { ThemeProvider, useThemeKeyboard } from './ThemeContext';
import { CompactThemeToggle } from './ThemeToggle';
import { initializeExportListener } from '../utils/exporters/vscodeExportHelper';
import { HeatmapMode } from './heatmapUtils';
import { NotificationHistory, NotificationEntry } from './NotificationHistory';
import { WebhookSetup } from './WebhookSetup';
import { getVsCodeApi } from '../utils/vscodeApi';

// ✅ backend-driven diagrams
import { BackendDependencyDiagram } from './diagrams/BackendDependencyDiagram';
import { BackendBoundaryDiagram } from './diagrams/BackendBoundaryDiagram';
import { BackendCommunicationDiagram } from './diagrams/BackendCommunicationDiagram';

type AppView =
  | 'graph'
  | 'boundaries'
  | 'boundary-diagram'
  | 'dependency-diagram'
  | 'communication'
  | 'webhooks'
  | 'commits';

function normalizeView(view: string): AppView | null {
  switch (view) {
    case 'graph':
    case 'boundaries':
    case 'boundary-diagram':
    case 'dependency-diagram':
    case 'communication':
    case 'commits':
      return view;
    case 'webhooks':
      return 'webhooks';
    case 'dependencies':
      return 'dependency-diagram';
    default:
      return null;
  }
}

const ThemeKeyboardHandler: React.FC = () => {
  useThemeKeyboard();
  return null;
};

const Header: React.FC = () => (
  <header className="app-header">
    <div className="header-content">
      <h1 className="header-title">
        <span className="header-icon">🏗️</span>
        ArchMind
      </h1>
      <span className="header-subtitle">Architecture Intelligence</span>
    </div>
    <div className="header-actions">
      <CompactThemeToggle />
    </div>
  </header>
);

const App: React.FC = () => {
  // Initialize export listener for VS Code webview context
  useEffect(() => {
    initializeExportListener();
  }, []);

  const [activeView, setActiveView] = useState<AppView>('graph');
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('off');
  const [config, setConfig] = useState<{ backendUrl: string; graphEngineUrl: string } | null>(null);
  const [repoId, setRepoId] = useState<string | null>(null);
  const [highlightNodes, setHighlightNodes] = useState<string[]>([]);
  const [history, setHistory] = useState<NotificationEntry[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [architectureData, setArchitectureData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [localContributions, setLocalContributions] = useState<any>(null);

  const heatmapOptions: { value: HeatmapMode; label: string }[] = [
    { value: 'off', label: 'Off' },
    { value: 'commit_count', label: 'Commit Count' },
    { value: 'last_modified', label: 'Last Modified' },
    { value: 'author_count', label: 'Author Count' },
  ];

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      const incomingView = message?.view;

      if ((message?.command === 'switchView' || message?.type === 'showView') && incomingView) {
        const normalized = normalizeView(incomingView);
        if (normalized) {
          setActiveView(normalized);
        }
        if (message?.filePath) {
          setHighlightNodes([message.filePath]);
        }
      }

      if (message?.command === 'toggleHeatmap' || message?.type === 'toggleHeatmap') {
        setHeatmapMode((prev) => {
          const order: HeatmapMode[] = ['off', 'commit_count', 'last_modified', 'author_count'];
          const index = order.indexOf(prev);
          return order[(index + 1) % order.length];
        });
      }

      if (message?.command === 'config' && message.data) {
        setConfig(message.data);
      }

      if (message?.command === 'architectureData' && message.data) {
        setArchitectureData(message.data);
        const extractedRepoId = message.data.repo_id || message.data.repoId;
        if (extractedRepoId) {
          setRepoId(String(extractedRepoId));
        }
        // eslint-disable-next-line no-console
        console.log('App.tsx: Received architectureData', {
          nodeCount: message.data.nodes?.length,
          edgeCount: message.data.edges?.length,
          repoId: extractedRepoId,
          source: message.data.source,
        });
      }

      if (message?.command === 'highlightNodes') {
        setHighlightNodes(message.nodeIds || []);
      }

      if (message?.command === 'contributions' && message.data) {
        // eslint-disable-next-line no-console
        console.log('App.tsx: Received contributions', { count: message.data.contributions?.length });
        setLocalContributions(message.data);
      }
    };

    window.addEventListener('message', handler);

    // Request initial configuration
    const vscode = getVsCodeApi();
    if (vscode) {
      vscode.postMessage({ command: 'requestConfig' });
    }

    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { message: string } | undefined;
      if (!detail?.message) return;
      setHistory((prev) =>
        [
          {
            id: `${Date.now()}`,
            message: detail.message,
            timestamp: new Date().toLocaleTimeString(),
          },
          ...prev,
        ].slice(0, 8)
      );
    };

    window.addEventListener('archmind:graphUpdated', handler as EventListener);
    return () => window.removeEventListener('archmind:graphUpdated', handler as EventListener);
  }, []);

  // ✅ detect backend graph payload (from extension/backend)
  const backendGraph = architectureData?.source === 'backend' ? architectureData : null;

  return (
    <ThemeProvider>
      <ThemeKeyboardHandler />
      <div className="app-container">
        <Header />

        <div className="view-toggle">
          <button
            className={activeView === 'graph' ? 'view-tab active' : 'view-tab'}
            onClick={() => setActiveView('graph')}
          >
            Graph
          </button>

          <button
            className={activeView === 'boundaries' ? 'view-tab active' : 'view-tab'}
            onClick={() => setActiveView('boundaries')}
          >
            Boundaries
          </button>

          <button
            className={activeView === 'boundary-diagram' ? 'view-tab active' : 'view-tab'}
            onClick={() => setActiveView('boundary-diagram')}
          >
            Boundary Diagram
          </button>

          <button
            className={activeView === 'dependency-diagram' ? 'view-tab active' : 'view-tab'}
            onClick={() => setActiveView('dependency-diagram')}
          >
            Dependency Diagram
          </button>

          <button
            className={activeView === 'communication' ? 'view-tab active' : 'view-tab'}
            onClick={() => setActiveView('communication')}
          >
            Communication
          </button>

          <button
            className={activeView === 'commits' ? 'view-tab active' : 'view-tab'}
            onClick={() => setActiveView('commits')}
          >
            Commits
          </button>

          <button
            className={activeView === 'webhooks' ? 'view-tab active' : 'view-tab'}
            onClick={() => setActiveView('webhooks')}
          >
            Webhooks
          </button>
        </div>

        <div className="heatmap-toolbar">
          <span className="heatmap-label">Heatmap</span>
          <div className="heatmap-toggle">
            {heatmapOptions.map((option) => (
              <button
                key={option.value}
                className={heatmapMode === option.value ? 'heatmap-pill active' : 'heatmap-pill'}
                onClick={() => setHeatmapMode(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <main className="app-main">
          {activeView === 'graph' && (
            <ArchitectureGraph
              heatmapMode={heatmapMode}
              highlightNodeIds={highlightNodes}
              repoId={repoId}
              graphEngineUrl={config?.graphEngineUrl}
              localContributions={localContributions}
            />
          )}

          {/* ✅ Boundaries: render backend boundary diagram if backend graph present, else fallback to existing */}
          {activeView === 'boundaries' &&
            (backendGraph ? (
              <BackendBoundaryDiagram graph={backendGraph} />
            ) : (
              <ModuleBoundaryDiagram
                heatmapMode={heatmapMode}
                highlightNodeIds={highlightNodes}
                repoId={repoId}
                graphEngineUrl={config?.graphEngineUrl}
                architectureData={architectureData}
                localContributions={localContributions}
              />
            ))}

          {activeView === 'boundary-diagram' && (
            <BoundaryDiagram
              heatmapMode={heatmapMode}
              highlightNodeIds={highlightNodes}
              repoId={repoId}
              graphEngineUrl={config?.graphEngineUrl}
              architectureData={architectureData}
            />
          )}

          {/* ✅ Dependency diagram: backend graph if present, else fallback */}
          {activeView === 'dependency-diagram' &&
            (backendGraph ? (
              <BackendDependencyDiagram graph={backendGraph} />
            ) : (
              <DependencyDiagram
                heatmapMode={heatmapMode}
                highlightNodeIds={highlightNodes}
                repoId={repoId}
                graphEngineUrl={config?.graphEngineUrl}
                architectureData={architectureData}
                localContributions={localContributions}
              />
            ))}

          {/* ✅ Communication: backend comm diagram if backend graph present, else fallback */}
          {activeView === 'communication' &&
            (backendGraph ? (
              <BackendCommunicationDiagram graph={backendGraph} />
            ) : (
              <CommunicationDiagram
                heatmapMode={heatmapMode}
                highlightNodeIds={highlightNodes}
                repoId={repoId}
                graphEngineUrl={config?.graphEngineUrl}
                architectureData={architectureData}
              />
            ))}

          {activeView === 'webhooks' && (
            <WebhookSetup
              backendUrl={config?.backendUrl || 'http://localhost:8080'}
            />
          )}

          {activeView === 'commits' && (
            <CommitDetails
              backendUrl={config?.backendUrl || 'http://localhost:8080'}
              repoId={repoId}
            />
          )}
        </main>

        <NotificationHistory entries={history} onClear={() => setHistory([])} />
      </div>
    </ThemeProvider>
  );
};

export default App;
