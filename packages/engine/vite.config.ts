import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: { port: 5174 },
  build: {
    outDir: 'dist-dev',
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
    },
  },
});
