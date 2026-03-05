import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
