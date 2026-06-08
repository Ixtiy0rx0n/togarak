# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Build project**: `npm run build` (compiles TypeScript to JS)
- **Type check**: `npm run check` (runs `tsc` without emitting files)
- **Start server**: `npm start` (runs the Express server)

## Architecture and Structure

The project is a club management portal with a simple client-server architecture.

### Backend
- **Server**: `server.js` uses Express to serve static files from the root and provides two API endpoints (`GET /api/data` and `POST /api/data`) to read and write the project's state.
- **Database**: A JSON-based flat-file database located at `Data/seed.json`.

### Frontend
- **Pages**: Static HTML files in the `Pages/` directory.
- **Logic**: TypeScript source files in `src/` that handle the frontend behavior.
    - `src/core/`: Core system logic including session management, data store, and common types.
    - `src/pages/`: Page-specific logic. There is typically a 1:1 mapping between files in `src/pages/` and HTML files in `Pages/` (e.g., `src/pages/admin.ts` handles `Pages/Admin.html`).
    - `src/shared/`: Reusable frontend components or utilities.

### Directory Map
- `Pages/`: Frontend HTML templates.
- `src/`: TypeScript source code.
- `Data/`: Backend data storage (JSON and SQLite files).
- `dist/`: Compiled JavaScript output.
