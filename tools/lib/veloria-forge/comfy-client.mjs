/**
 * Veloria — CLIENT ComfyUI (soumission réelle des workflows).
 *
 * Implémente le maillon manquant `create_comfyui_remote` : POST /prompt → poll /history
 * → récupère les images générées via /view. Garde de disponibilité (COMFYUI_URL).
 * Sans backend, le forge bascule en mode PLAN (aucun appel) — voir forge.mjs.
 */
const URL = () => (process.env.COMFYUI_URL || 'http://localhost:8188').replace(/\/$/, '');

export async function available(timeoutMs = 4000) {
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${URL()}/system_stats`, { signal: ctrl.signal });
    clearTimeout(t); return res.ok;
  } catch { return false; }
}

async function queue(graph, clientId) {
  const res = await fetch(`${URL()}/prompt`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: graph, client_id: clientId }),
  });
  if (!res.ok) throw new Error(`ComfyUI /prompt ${res.status}: ${await res.text()}`);
  return (await res.json()).prompt_id;
}

async function waitHistory(promptId, { pollMs = 1500, maxMs = 180000 } = {}) {
  const t0 = Date.now();
  for (;;) {
    const res = await fetch(`${URL()}/history/${promptId}`);
    if (res.ok) { const h = await res.json(); if (h[promptId]?.outputs) return h[promptId]; }
    if (Date.now() - t0 > maxMs) throw new Error('ComfyUI timeout');
    await new Promise((r) => setTimeout(r, pollMs));
  }
}

async function fetchImage(img) {
  const q = new URLSearchParams({ filename: img.filename, subfolder: img.subfolder ?? '', type: img.type ?? 'output' });
  const res = await fetch(`${URL()}/view?${q}`);
  if (!res.ok) throw new Error(`ComfyUI /view ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** soumet un graphe, attend, renvoie les buffers PNG produits. */
export async function generate(graph, { clientId = 'veloria-forge' } = {}) {
  const promptId = await queue(graph, clientId);
  const hist = await waitHistory(promptId);
  const buffers = [];
  for (const node of Object.values(hist.outputs ?? {})) {
    for (const img of node.images ?? []) buffers.push(await fetchImage(img));
  }
  return buffers;
}
