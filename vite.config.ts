import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    target: 'esnext',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      external: ['@pmndrs/uikit/webgpu'],
    },
  },
});
