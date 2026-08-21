import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{js,jsx}', '.agents/**/*.test.js'],
    testTimeout: 20000,
    hookTimeout: 20000
  }
});
