import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' zorgt dat de build werkt op elk pad (bijv. GitHub Pages /ruimte-indeler/).
export default defineConfig({
  base: './',
  plugins: [react()],
  // Three.js is groot; de 3D-code wordt pas geladen als je naar 3D wisselt.
  build: { chunkSizeWarningLimit: 1000 },
  test: {
    environment: 'node',
  },
});
