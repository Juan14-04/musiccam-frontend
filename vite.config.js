import { defineConfig, loadEnv } from 'vite';
import { construirCsp } from './csp.config.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // En Docker sobre Windows los eventos de archivos no cruzan la carpeta compartida y hay que
  // sondear. Por defecto se sondea cada 100 ms, lo que satura el proceso y frena cada respuesta:
  // se sondea cada segundo y solo lo que el navegador carga (src, public, index.html).
  const sondeo = process.env.CHOKIDAR_USEPOLLING === 'true';
  return {
    server: {
      port: 5173,
      strictPort: true,
      watch: {
        usePolling: sondeo,
        interval: 1000,
        binaryInterval: 3000,
        ignored: ['**/dist/**', '**/tests/**', '**/docs/**', '**/node_modules/**', '**/.git/**'],
      },
      // Transforma por adelantado los módulos de arranque para que la primera carga no espere.
      warmup: { clientFiles: ['./src/main.js', './src/app/**/*.js', './src/shared/**/*.js'] },
    },
    plugins: [
      {
        // CSP solo en el build: el servidor de desarrollo necesita su canal HMR.
        name: 'csp-meta',
        apply: 'build',
        transformIndexHtml: (html) =>
          html.replace(
            '</title>',
            `</title>\n    <meta http-equiv="Content-Security-Policy" content="${construirCsp(env.VITE_API_URL)}" />`,
          ),
      },
    ],
  };
});
