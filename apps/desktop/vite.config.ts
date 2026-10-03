import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El renderer se sirve en desarrollo desde :5174 (la web usa :5173) y en producción desde app://fitia/.
export default defineConfig({
  plugins: [react()],
  server: { port: 5174, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 900 },
});
