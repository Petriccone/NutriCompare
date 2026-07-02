import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

// ── Dev middleware: serves /api/extract locally under `npm run dev` ────────────
// In production, Vercel routes /api/extract to api/extract.ts automatically.
// This plugin replicates that behaviour in the Vite dev server so you never
// need to run `vercel dev` for local development.

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString('utf8'); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function apiExtractDevPlugin(geminiApiKey: string): Plugin {
  return {
    name: 'nutricompare-api-extract-dev',
    configureServer(server: ViteDevServer) {
      // Inject GEMINI_API_KEY into process.env from .env (loaded by loadEnv).
      // process.env.GEMINI_API_KEY is only set here — it never surfaces to the
      // client bundle because `define: { 'process.env': {} }` only applies to
      // the browser bundle, not to SSR/Node code.
      if (geminiApiKey && !process.env.GEMINI_API_KEY) {
        process.env.GEMINI_API_KEY = geminiApiKey;
      }

      server.middlewares.use(
        '/api/extract',
        async (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Método não permitido.' }));
            return;
          }

          try {
            const rawBody = await readBody(req);

            // Rough payload cap in dev (mirrors the production limit)
            if (rawBody.length > 8 * 1024 * 1024) {
              res.writeHead(413, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Imagem muito grande. Use uma foto menor.' }));
              return;
            }

            let body: { imageBase64?: string; mimeType?: string };
            try {
              body = JSON.parse(rawBody);
            } catch {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'JSON inválido.' }));
              return;
            }

            if (typeof body.imageBase64 !== 'string' || typeof body.mimeType !== 'string') {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Os campos imageBase64 e mimeType são obrigatórios.' }));
              return;
            }

            // Load api/extract.ts through Vite's SSR pipeline so TypeScript is
            // handled correctly without a separate build step.
            const mod = await server.ssrLoadModule('/api/extract.ts');
            const result = await (mod.doExtraction as (b: string, m: string) => Promise<unknown>)(
              body.imageBase64,
              body.mimeType,
            );

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (err) {
            console.error('[dev /api/extract]', err instanceof Error ? err.message : String(err));
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Erro ao analisar a imagem. Tente novamente.' }));
          }
        },
      );
    },
  };
}

// ── Vite config ────────────────────────────────────────────────────────────────

export default defineConfig(({ mode }) => {
  // loadEnv with '' prefix loads ALL vars from .env (including GEMINI_API_KEY
  // without a VITE_ prefix). They are NOT exposed to the client bundle.
  const env = loadEnv(mode, '.', '');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      apiExtractDevPlugin(env.GEMINI_API_KEY ?? ''),
    ],
    define: {
      'process.env': {}
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
