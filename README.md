# UH4 Architecture Intelligence

A VS Code extension for real-time codebase visualization and architecture reconstruction using interactive dependency graphs.

## 🎯 Overview

UH4 Architecture Intelligence provides developers with an interactive visual representation of their codebase structure. Built with React and ReactFlow, it displays files, directories, and their relationships in an intuitive graph format directly within VS Code.

## ✨ Features

- **Interactive Graph Visualization** - Explore your codebase as a node-edge graph
- **ReactFlow Integration** - Smooth pan, zoom, and navigation controls
- **VS Code Theme Support** - Automatically adapts to your editor theme
- **Minimap Navigation** - Quick overview for navigating large codebases
- **Real-time Analysis** - Analyzes workspace structure on demand

## 🚀 Getting Started

### Prerequisites

- VS Code 1.85.0 or higher
- Node.js 18+ and npm

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
4. Press `Ctrl+Shift+P` and run **"UH4: Show Architecture"**

## 📁 Project Structure

```
frontend/
├── src/
│   ├── extension.ts          # VS Code extension entry point
│   ├── analyzer/
│   │   └── fileSystem.ts     # Workspace file system analyzer
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

## 🛠️ Development

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

2. **Webview** (`src/webview/`)
   - React application bundled with Webpack
   - Uses ReactFlow for graph visualization
   - Communicates with extension via `postMessage` API

### Extension-Webview Communication

```typescript
// Extension → Webview
panel.webview.postMessage({ command: 'architectureData', data: graphData });

// Webview → Extension
vscode.postMessage({ command: 'requestArchitecture' });
```

## 🔧 Configuration

The extension contributes the following command:

| Command | Title |
|---------|-------|
| `uh4.showArchitecture` | UH4: Show Architecture |

## 🗺️ Roadmap

- [ ] Backend API integration with ArchMind Graph Engine
- [ ] Real code dependency parsing (imports, function calls)
- [ ] Intelligent graph layout algorithms (hierarchical, force-directed)
- [ ] Click-to-navigate to source files
- [ ] Search and filter functionality
- [ ] Custom node types for functions, classes, modules
- [ ] Real-time file watching and auto-update
- [ ] Code metrics and analysis panel
- [ ] Export graph as image/HTML

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
