import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const port = Number(env.CLIENT_PORT || 0);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('CLIENT_PORT deve ser um inteiro entre 0 e 65535. Use 0 para escolher uma porta livre.');
  }
  // O Vite interpreta port=0 como a porta padrão; use um candidato aleatório
  // e strictPort=false para procurar a próxima porta livre se necessário.
  const preferredPort = port || 49152 + Math.floor(Math.random() * 10000);
  const proxy = { '/api': env.API_TARGET || 'http://127.0.0.1:3000' };
  return {
    plugins: [react()],
    server: { host: '127.0.0.1', port: preferredPort, strictPort: false, proxy },
    preview: { host: '127.0.0.1', port: preferredPort, strictPort: false, proxy },
  };
});
