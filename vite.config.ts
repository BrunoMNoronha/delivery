import { defineConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { UserConfig as VitestUserConfig } from 'vitest/config'

// https://vite.dev/config/
type ConfigWithTests = UserConfig & { test: VitestUserConfig['test'] };

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
} as ConfigWithTests)
