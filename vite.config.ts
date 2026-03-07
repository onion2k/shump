import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
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
