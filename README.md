# ArchMind VS Code Extension

A VS Code extension for real-time codebase visualization and architecture reconstruction using interactive dependency graphs.

## 🎯 Overview

ArchMind VS Code Extension provides developers with an interactive visual representation of their codebase structure. Built with React and ReactFlow, it displays files, directories, and their relationships in an intuitive graph format directly within VS Code.

## ✨ Features

- **Interactive Graph Visualization** - Explore your codebase as a node-edge graph
- **ReactFlow Integration** - Smooth pan, zoom, and navigation controls
- **VS Code Theme Support** - Automatically adapts to your editor theme
- **Minimap Navigation** - Quick overview for navigating large codebases
- **Real-time Analysis** - Analyzes workspace structure on demand
- **Backend Integration** - Connect to ArchMind backend for Neo4j-powered dependency analysis
- **Impact Analysis** - See which nodes are affected by changes (via backend)
- **📥 Multi-Format Export** - Export graphs as PNG, SVG, JSON, Mermaid, or DOT (Graphviz)

## 🚀 Getting Started

### Prerequisites

- VS Code 1.85.0 or higher
- Node.js 18+ and npm
- (Optional) ArchMind Backend services for enhanced analysis

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Arch-Mind/frontend.git
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile the extension:
   ```bash
   npm run compile
   ```

4. Build the webview:
   ```bash
   npm run build:webview
   ```

### Running the Extension

1. Open this folder in VS Code
2. Press `F5` to launch the Extension Development Host
3. In the new VS Code window, open any workspace
4. Press `Ctrl+Shift+P` and run **"ArchMind: Show Architecture"**

## 🔌 Backend Integration

The extension can connect to the ArchMind backend services for enhanced analysis using Neo4j graph database.

### Available Commands

| Command | Description |
|---------|-------------|
| `ArchMind: Show Architecture` | Show architecture graph (local or backend based on settings) |
| `ArchMind: Analyze Repository (Backend)` | Trigger repository analysis using the backend API |
| `ArchMind: Refresh Graph` | Refresh the current graph visualization |
| `ArchMind: Check Backend Status` | Verify connectivity to backend services |

### Configuration Settings

Configure in VS Code Settings (`Ctrl+,`):

| Setting | Default | Description |
|---------|---------|-------------|
| `archmind.backendUrl` | `https://go-api-gateway-production-2173.up.railway.app` | URL of the ArchMind API Gateway |
| `archmind.graphEngineUrl` | `https://graph-engine-production-90f5.up.railway.app` | URL of the Graph Engine service |
| `archmind.authToken` | `` | GitHub OAuth token (if required) |
| `archmind.requestTimeout` | `30000` | HTTP request timeout in ms |
| `archmind.useBackendAnalysis` | `false` | Use backend API by default |
| `archmind.repositoryUrl` | `` | Git repository URL (auto-detected if empty) |
| `archmind.defaultBranch` | `main` | Default branch for analysis |
| `archmind.pollInterval` | `2000` | Job status polling interval (ms) |
| `archmind.maxPollAttempts` | `60` | Maximum polling attempts |

### Backend Services

The extension communicates with two backend services:

1. **API Gateway** (Go, port 8080)
   - Triggers repository analysis
   - Manages analysis jobs
   - Stores repository metadata in PostgreSQL

2. **Graph Engine** (Python/FastAPI, port 8000)
   - Queries Neo4j dependency graph
   - Provides metrics and impact analysis
   - Calculates PageRank for code importance

## 📁 Project Structure

```
frontend/
├── src/
│   ├── extension.ts          # VS Code extension entry point
│   ├── api/                   # Backend API client
│   │   ├── client.ts         # HTTP client for API communication
│   │   ├── types.ts          # TypeScript type definitions
│   │   └── index.ts          # Module exports
│   ├── analyzer/
│   │   └── fileSystem.ts     # Local workspace file system analyzer
│   └── webview/
│       ├── index.tsx         # React app entry point
│       ├── App.tsx           # Main App component
│       ├── ArchitectureGraph.tsx  # ReactFlow graph component
│       └── index.css         # Styles
├── out/                      # Compiled output
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript configuration
└── webpack.webview.js        # Webpack config for webview bundle
```

## 📊 How It Works

### Local Analysis Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           VS Code Editor                                 │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 │ User runs "ArchMind: Show Architecture"
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Extension Host (extension.ts)                       │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ 1. Register command: archmind.showArchitecture                  │    │
│  │ 2. Create WebviewPanel with React app                           │    │
│  │ 3. Listen for messages from webview                             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 │ Webview requests architecture data
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    File System Analyzer (fileSystem.ts)                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ 1. Traverse workspace directory recursively                     │    │
│  │ 2. Filter out ignored folders (node_modules, .git, etc.)        │    │
│  │ 3. Extract file metadata (extension, language)                  │    │
│  │ 4. Build graph nodes and edges                                  │    │
│  │ 5. Calculate statistics (files, directories, languages)         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 │ postMessage({ command: 'architectureData', data })
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Webview (React + ReactFlow)                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ 1. Receive graph data via message event                         │    │
│  │ 2. Apply hierarchical layout algorithm                          │    │
│  │ 3. Color-code nodes by type/language                            │    │
│  │ 4. Render interactive graph with ReactFlow                      │    │
│  │ 5. Display statistics panel                                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Backend Analysis Workflow (Neo4j Integration)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           VS Code Editor                                 │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 │ User runs "ArchMind: Analyze Repository (Backend)"
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               Extension Host (extension.ts + api/client.ts)              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ 1. Detect or prompt for repository URL                          │    │
│  │ 2. POST /api/v1/analyze to API Gateway                          │    │
│  │ 3. Poll GET /api/v1/jobs/:id until COMPLETED                    │    │
│  │ 4. Fetch graph from Graph Engine: GET /api/graph/:repo_id       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
            ┌────────────────────┴────────────────────┐
            │                                         │
            ▼                                         ▼
┌───────────────────────────┐         ┌───────────────────────────────────┐
│  API Gateway (Go:8080)    │         │    Graph Engine (Python:8000)     │
│  ┌─────────────────────┐  │         │  ┌───────────────────────────┐   │
│  │ - Queue analysis job│  │         │  │ - Query Neo4j graph       │   │
│  │ - Store in Postgres │  │         │  │ - Calculate metrics       │   │
│  │ - Push to Redis     │  │         │  │ - Impact analysis         │   │
│  └─────────────────────┘  │         │  │ - PageRank computation    │   │
└───────────────────────────┘         │  └───────────────────────────┘   │
            │                         └────────────────┬──────────────────┘
            ▼                                          │
┌───────────────────────────┐                          │
│  Ingestion Worker (Rust)  │                          │
│  ┌─────────────────────┐  │                          │
│  │ - Clone repository  │  │                          │
│  │ - Parse with TreeSit│  │                          │
│  │ - Extract AST deps  │  │                          │
│  │ - Store in Neo4j    │  │──────────────────────────┤
│  └─────────────────────┘  │                          │
└───────────────────────────┘                          │
                                                       │
                                 ┌─────────────────────┘
                                 │
                                 │ Graph data returned to extension
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Webview (React + ReactFlow)                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ 1. Receive Neo4j graph data with richer dependency information  │    │
│  │ 2. Display functions, classes, and real import relationships    │    │
│  │ 3. Show backend source indicator                                │    │
│  │ 4. Access impact analysis on node selection                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Step-by-Step Flow (Local Analysis)

1. **User Action**: User opens command palette (`Ctrl+Shift+P`) and runs "ArchMind: Show Architecture"

2. **Extension Activation**: The extension creates a new webview panel and loads the bundled React application

3. **Data Request**: The React app sends a `requestArchitecture` message to the extension host

4. **Workspace Analysis**: 
   - The analyzer reads the workspace root directory
   - Recursively traverses all files and folders
   - Skips ignored directories (node_modules, .git, dist, etc.)
   - Extracts metadata: file type, programming language, depth level
   - Builds a graph structure with nodes (files/folders) and edges (parent-child relationships)
   - Computes statistics (total files, directories, language breakdown)

5. **Data Transfer**: Extension sends the graph data back to the webview via `postMessage`

6. **Visualization**:
   - React receives the data and applies a hierarchical layout
   - Nodes are positioned by depth level
   - Colors are assigned based on language (TypeScript = blue, JavaScript = yellow, etc.)
   - ReactFlow renders the interactive graph with pan, zoom, and minimap

7. **User Interaction**: User can:
   - Pan and zoom the graph
   - Click on nodes to select them
   - Use the minimap for navigation
   - View statistics in the overlay panel

## �🛠️ Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile TypeScript extension code |
| `npm run watch` | Watch mode for extension TypeScript |
| `npm run build:webview` | Bundle React webview for production |
| `npm run watch:webview` | Watch mode for webview development |
| `npm run lint` | Run ESLint on source files |

### Architecture

The extension consists of two main parts:

1. **Extension Host** (`src/extension.ts`)
   - Registers VS Code commands
   - Creates and manages webview panels
   - Analyzes workspace and sends data to webview
   - Communicates with backend API services

2. **Webview** (`src/webview/`)
   - React application bundled with Webpack
   - Uses ReactFlow for graph visualization
   - Communicates with extension via `postMessage` API

3. **API Client** (`src/api/`)
   - HTTP client for backend communication
   - Type definitions for API responses
   - Error handling and retries

### Extension-Webview Communication

```typescript
// Extension → Webview
panel.webview.postMessage({ command: 'architectureData', data: graphData });

// Webview → Extension
vscode.postMessage({ command: 'requestArchitecture' });
vscode.postMessage({ command: 'analyzeRepository' });
```

## 🔧 Configuration

The extension contributes the following commands:

| Command | Title |
|---------|-------|
| `archmind.showArchitecture` | ArchMind: Show Architecture |
| `archmind.analyzeRepository` | ArchMind: Analyze Repository (Backend) |
| `archmind.refreshGraph` | ArchMind: Refresh Graph |
| `archmind.checkBackendStatus` | ArchMind: Check Backend Status |

## 🗺️ Roadmap

- [x] Backend API integration with ArchMind Graph Engine
- [x] Real code dependency parsing (imports, function calls) via backend
- [x] Intelligent graph layout algorithms (hierarchical, force-directed)
- [x] Click-to-navigate to source files
- [x] Search and filter functionality
- [x] Custom node types for functions, classes, modules
- [ ] Real-time file watching and auto-update
- [x] Code metrics and analysis panel (via backend)
- [x] **Export graph as PNG/SVG/JSON/Mermaid/DOT** ✨ **NEW**
- [x] Impact analysis visualization
- [ ] PageRank-based node importance highlighting
- [ ] Import JSON graphs for comparison
- [ ] Batch export multiple formats

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is part of the ArchMind platform.

## 🔗 Related

- [ArchMind Backend](../backend/) - API Gateway, Ingestion Worker, and Graph Engine
- [API Documentation](../backend/docs/API_DOCUMENTATION.md)

