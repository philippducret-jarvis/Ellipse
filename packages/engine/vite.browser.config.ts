import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    outDir: 'dist-browser',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/preview-entry.ts'),
      formats: ['es'],
      fileName: 'ellipse-engine',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    target: 'es2022',
    minify: false,
  },
});
