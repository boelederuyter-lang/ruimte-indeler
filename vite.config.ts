import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' zorgt dat de build werkt op elk pad (bijv. GitHub Pages /ruimte-indeler/).
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
