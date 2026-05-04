import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    exclude: ['**/node_modules/**', '**/tests/e2e/**', '**/dist/**'],
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        'postgresql://mihbah:mihbah_dev_password@localhost:5432/mihbah_dev',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
})
