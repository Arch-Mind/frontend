# ArchMind VS Code Extension - Testing Guide

This guide walks you through testing the ArchMind VS Code extension with the backend services.

---

## Prerequisites

Before testing, ensure the following services are running:

| Service | Port | Command |
|---------|------|---------|
| PostgreSQL | 5432 | `docker compose up -d postgres` (or local) |
| Redis | 6379 | `docker compose up -d redis` |
| Neo4j | 7474/7687 | `docker compose up -d neo4j` |
| API Gateway | 8080 | `cd backend/apps/api-gateway && go run main.go` |
| Graph Engine | 8000 | `cd backend/services/graph-engine && python main.py` |
| Ingestion Worker | - | `cd backend/services/ingestion-worker && cargo run` |

---

## Testing Steps

### 1. Start the Extension in Debug Mode

1. Open the frontend folder in VS Code:
   ```
   code c:\Users\91902\Documents\Other_Projects\arch-mind\frontend\frontend
   ```

2. Press **F5** to launch the Extension Development Host

3. A new VS Code window will open with the extension loaded

---

### 2. Configure the Extension

In the Extension Development Host window, open Settings (`Ctrl+,`) and search for **"archmind"**:

| Setting | Value |
|---------|-------|
| Backend URL | `http://localhost:8080` |
| Graph Engine URL | `http://localhost:8000` |
| Use Backend Analysis | `true` |

**Or** add to `.vscode/settings.json`:

```json
{
  "archmind.backendUrl": "http://localhost:8080",
  "archmind.graphEngineUrl": "http://localhost:8000",
  "archmind.useBackendAnalysis": true,
  "archmind.requestTimeout": 30000,
  "archmind.pollInterval": 2000,
  "archmind.maxPollAttempts": 60
}
```

---

### 3. Test the Commands

Open the Command Palette (`Ctrl+Shift+P`) and try these commands:

| Command | Description |
|---------|-------------|
| **ArchMind: Check Backend Status** | Verifies connection to backend services |
| **ArchMind: Analyze Repository** | Triggers repository analysis via the API Gateway |
| **ArchMind: Show Architecture** | Opens the architecture graph view |
| **ArchMind: Refresh Graph** | Fetches fresh data from Neo4j |

---

### 4. What to Expect

#### ✅ Check Backend Status
- Should show: **"Backend services are healthy"**
- If it fails, check that API Gateway and Graph Engine are running

#### ✅ Analyze Repository
1. Opens input box for GitHub repository URL
2. Example: `https://github.com/venkatesh21bit/Nidaan`
3. Submits to API Gateway (`POST /api/v1/analyze`)
4. Polls for job completion (`GET /api/v1/jobs/{id}`)
5. Shows progress notifications
6. On completion, fetches and displays graph

#### ✅ Show Architecture
- Opens webview panel showing the dependency graph
- Stats panel shows: Files, Functions, Classes count
- Source badge shows: "Backend (Neo4j)" or "Local"

#### ✅ Refresh Graph
- Fetches fresh data from Neo4j via Graph Engine
- Updates the visualization

---

## Troubleshooting

### "Backend services are not healthy"
- Check API Gateway is running on port 8080
- Check Graph Engine is running on port 8000
- Verify with: `curl http://localhost:8080/health`

### "Request timed out"
- The Ingestion Worker may be slow processing large repos
- Increase `archmind.maxPollAttempts` in settings
- Check Ingestion Worker terminal for errors

### "Resource not found"
- The job_id used to query doesn't have data in Neo4j
- This happens when querying with wrong job_id
- Re-run "Analyze Repository" to create fresh analysis

### Graph is empty or not rendering
- Check browser console in webview (Help > Toggle Developer Tools)
- Verify Graph Engine returns data: 
  ```
  curl "http://localhost:8000/api/graph/{job_id}?limit=10"
  ```

### PostgreSQL connection failed
- Ensure database `arch-mind` exists
- Run schema migrations:
  ```
  psql -U postgres -d "arch-mind" -f backend/infra/postgres/init/001_schema.sql
  ```

---

## Verifying Services

### Check Docker Services
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Check API Gateway Health
```powershell
curl http://localhost:8080/health
```

### Check Graph Engine Health
```powershell
curl http://localhost:8000/health
```

### Check Neo4j Data
```powershell
curl "http://localhost:7474/db/neo4j/tx/commit" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"statements":[{"statement":"MATCH (n) RETURN labels(n)[0] as type, count(n) as count"}]}' `
  -Headers @{Authorization="Basic bmVvNGo6cGFzc3dvcmQ="}
```

### Check Job Status in PostgreSQL
```powershell
psql -U postgres -d "arch-mind" -c "SELECT job_id, status, created_at FROM analysis_jobs ORDER BY created_at DESC LIMIT 5;"
```

---

## Test Workflow Summary

```
1. Start all backend services
2. Press F5 to launch extension
3. Ctrl+Shift+P → "ArchMind: Check Backend Status"
4. Ctrl+Shift+P → "ArchMind: Analyze Repository"
5. Enter: https://github.com/owner/repo
6. Wait for analysis to complete
7. View the architecture graph
8. Click nodes to open files
9. Use search (Ctrl+F) to find nodes
10. Try different layout algorithms (Ctrl+L)
```

---

*Last updated: February 2, 2026*
