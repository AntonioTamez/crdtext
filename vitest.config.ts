import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Default to 'node': src/lib/crdt/ must stay framework/browser-API-free per
    // architecture.md, and server/ is Node-only — jsdom would mask violations of
    // both. React component tests (*.test.tsx) need a DOM: add a
    // `// @vitest-environment jsdom` comment at the top of that specific test
    // file (Vitest 4 removed environmentMatchGlobs; per-file override is now
    // the supported mechanism for a single non-default environment like this).
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'shared/**/*.test.ts', 'server/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
