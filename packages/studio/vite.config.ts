import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from '@ellipse/shared/load-env';

loadEnv();

const orchestratorUrl = process.env.ORCHESTRATOR_URL ?? 'http://localhost:4400';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/examples/')) return 'three-extras';
          if (id.includes('node_modules/three/')) return 'three-core';
          if (id.includes('node_modules/pixi.js') || id.includes('/packages/engine/')) return 'pixi-runtime';
          return undefined;
        },
      },
    },
  },
  server: {
    port: Number(process.env.STUDIO_PORT ?? 4273),
    proxy: {
      '/api': orchestratorUrl,
      '/health': orchestratorUrl,
      '/ws': { target: orchestratorUrl.replace(/^http/i, 'ws'), ws: true },
      '/uploads': orchestratorUrl,
      '/generated': orchestratorUrl,
      '/workspaces': orchestratorUrl,
    },
  },
});
