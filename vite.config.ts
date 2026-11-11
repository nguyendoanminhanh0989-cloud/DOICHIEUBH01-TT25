import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api/vnpt-uat': {
          target: 'https://rmgateway.vnptit.vn',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/vnpt-uat/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
            });
          },
        },
        '/api/vnpt': {
          target: 'https://gwsca.vnpt.vn',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/vnpt/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
            });
          },
        },
        '/api/emrhub-prod': {
          target: 'https://api.emrhub.vn',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/emrhub-prod/, ''),
        },
        '/api/emrhub-sandbox': {
          target: 'https://api-sandbox.emrhub.vn',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/emrhub-sandbox/, ''),
        },
      },
    },
  };
});
