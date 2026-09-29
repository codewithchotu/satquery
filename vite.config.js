import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
  },
  build: {
    rollupOptions: {
      input: {
        landing: 'index.html',
        analyze: 'analyze.html',
        workspaces: 'workspaces.html',
        newWorkspace: 'new-workspace.html',
        workspace: 'workspace.html',
        newAnalysis: 'new-analysis.html',
        analysis: 'analysis.html',
        history: 'history.html',
        reports: 'reports.html',
        report: 'report.html',
        settings: 'settings.html',
        help: 'help.html'
      }
    }
  }
});
