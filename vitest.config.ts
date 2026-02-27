import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}', 'tests/integration/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'dist/**',
        'tests/e2e/**',
        'src/main.tsx',
        'src/game/render/**',
        'src/game/ui/**',
        '*.config.ts',
        '.eslintrc.cjs'
      ],
      thresholds: {
        lines: 55,
        functions: 60,
        branches: 65,
        statements: 55
      }
    }
  }
});
