import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: true,
    exclude: [...configDefaults.exclude, 'e2e/**/*.{spec,test}.{js,ts,jsx,tsx}']
  }
});
