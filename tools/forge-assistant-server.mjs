/**
 * SERVEUR JARVIS — petit service HTTP autonome pour l'assistant conversationnel,
 * consommé par le Studio (proxy) et testable seul :
 *   pnpm forge:assistant            # écoute sur :4310
 *   POST /assistant { history:[{role,content}] } → { reply, actions, brain, history }
 *
 * Vit dans tools/ (avec le cerveau, keyless) : pas de dépendance au build TS.
 */
import http from 'node:http';
import { jarvisTurn } from './lib/forge/brain/agent.mjs';
import { pickBrain } from './lib/forge/brain/providers.mjs';

const port = Number(process.env.FORGE_ASSISTANT_PORT ?? 4310);

const server = http.createServer(async (req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (req.method === 'GET' && new URL(req.url, 'http://x').pathname === '/health') {
    const brain = await pickBrain().catch(() => null);
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ ok: Boolean(brain), brain: brain?.name ?? null }));
  }

  if (req.method === 'POST' && new URL(req.url, 'http://x').pathname === '/assistant') {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', async () => {
      try {
        const { history = [] } = JSON.parse(body || '{}');
        const turn = await jarvisTurn(history);
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(turn));
      } catch (e) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  res.writeHead(404); res.end();
});

const brain = await pickBrain().catch(() => null);
server.listen(port, () => console.log(`🤖 Jarvis HTTP sur http://localhost:${port}/ (cerveau : ${brain?.name ?? 'aucun'})`));
