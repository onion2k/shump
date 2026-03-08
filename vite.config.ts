import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { shumpTelemetryPlugin } from './plugins/shumpTelemetryPlugin';

type PackageJsonShape = {
  shump?: {
    telemetryEnabled?: boolean;
  };
};

const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, 'package.json'), 'utf8')
) as PackageJsonShape;
const telemetryEnabled = packageJson.shump?.telemetryEnabled ?? true;

export default defineConfig({
  plugins: [react(), shumpTelemetryPlugin({ enabled: telemetryEnabled })],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'index.html'),
        telemetry: resolve(__dirname, 'telemetry.html')
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
            return 'react-vendor';
          }

          if (id.includes('/node_modules/three/examples/jsm/')) {
            return 'three-examples';
          }

          const threeSubsystem = id.match(/\/node_modules\/three\/src\/([^/]+)\//)?.[1];
          if (threeSubsystem) {
            return `three-${threeSubsystem}`;
          }

          if (id.includes('/node_modules/three/')) {
            return 'three-core';
          }

          if (
            id.includes('/node_modules/@react-three/fiber/')
            || id.includes('/node_modules/@react-three/drei/')
            || id.includes('/node_modules/react-three-flex/')
          ) {
            return 'r3f-vendor';
          }

          if (id.includes('/node_modules/@react-three/postprocessing/') || id.includes('/node_modules/postprocessing/')) {
            return 'postfx-vendor';
          }

          if (id.includes('/node_modules/zustand/')) {
            return 'state-vendor';
          }

          return undefined;
        }
      }
    }
  },
  resolve: {
    alias: {
      'react-three-fiber': '@react-three/fiber'
    }
  },
  optimizeDeps: {
    include: ['react-three-flex', 'yoga-layout-prebuilt'],
    esbuildOptions: {
      banner: {
        js: 'var _a;'
      }
    }
  },
  server: {
    port: 5173
  }
});
