import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/core'),
      '@ui': path.resolve(__dirname, 'src/ui'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@render': path.resolve(__dirname, 'src/render'),
      '@audio': path.resolve(__dirname, 'src/audio')
    }
  },
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      reporter: ['text', 'html']
    }
  }
});
