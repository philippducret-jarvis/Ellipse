import { describe, it, expect, afterAll } from 'vitest';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { derivePreset } from '@ellipse/shared';
import { produceLibraryPack } from './library-pack.js';

const PALETTE = ['#16131f', '#5a3a72', '#9e4f5c', '#5ec7ef', '#f0d9a6'];
const dirs: string[] = [];
afterAll(async () => Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true }))) as unknown as void);

describe('T3 — produceLibraryPack (assets procéduraux par preset)', () => {
  it('génère un pack réel pour un platformer', async () => {
    const out = await mkdtemp(join(tmpdir(), 'ellipse-pack-'));
    dirs.push(out);
    const preset = derivePreset({ game_type: 'platformer', art_style: 'pixel' });
    const res = await produceLibraryPack({ preset, palette: PALETTE, outputDir: out });

    expect(res.game_type).toBe('platformer');
    expect(res.produced.length).toBeGreaterThan(0);
    // hero produit en PNG réel
    const hero = res.produced.find((p) => p.id === 'hero');
    expect(hero).toBeTruthy();
    await stat(hero!.pngPath);
    // tileset & parallax_bg → à découper depuis références
    expect(res.to_cut).toContain('tileset');
    expect(res.to_cut).toContain('parallax_bg');
  });

  it('signale les familles spécialisées non encore générables (deckbuilder)', async () => {
    const out = await mkdtemp(join(tmpdir(), 'ellipse-pack-'));
    dirs.push(out);
    const preset = derivePreset({ game_type: 'card_deckbuilder' });
    const res = await produceLibraryPack({ preset, palette: PALETTE, outputDir: out });
    expect(res.specialized_pending).toContain('cards');
  });
});
