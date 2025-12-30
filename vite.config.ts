import { defineConfig } from 'vite';

export default defineConfig({
  // Base path for GitHub Pages - uses repo name from environment or defaults to '/'
  // For GitHub Pages, this should be '/<repo-name>/' e.g., '/Match5/'
  base: process.env.GITHUB_ACTIONS ? '/Match5/' : '/',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'esnext',
    // Ensure clean output
    emptyOutDir: true,
  },
});
