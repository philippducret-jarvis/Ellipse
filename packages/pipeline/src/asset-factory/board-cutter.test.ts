import { describe, it, expect, afterAll } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { cutSprite, sliceBoardGrid } from './board-cutter.js';

const dirs: string[] = [];
async function tmp(): Promise<string> {
  const d = await mkdtemp(join(tmpdir(), 'ellipse-cut-'));
  dirs.push(d);
  return d;
}
afterAll(async () => Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true }))) as unknown as void);

/** Board synthétique 2×2 : 4 carrés colorés 32×32 sur fond transparent, avec marge. */
async function makeBoard(dir: string): Promise<string> {
  const p = join(dir, 'board.png');
  const svg = `<svg width="128" height="128">
    <rect x="16" y="16" width="32" height="32" fill="#ff0000"/>
    <rect x="80" y="16" width="32" height="32" fill="#00ff00"/>
    <rect x="16" y="80" width="32" height="32" fill="#0000ff"/>
    <rect x="80" y="80" width="32" height="32" fill="#ffff00"/>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(p);
  return p;
}

describe('board-cutter — découpe CV CPU', () => {
  it('cutSprite recadre sur le contenu (trim du transparent)', async () => {
    const dir = await tmp();
    const src = join(dir, 'one.png');
    await sharp(Buffer.from('<svg width="200" height="200"><circle cx="100" cy="100" r="30" fill="#5ec7ef"/></svg>'))
      .png()
      .toFile(src);
    const res = await cutSprite(src, join(dir, 'cut.png'));
    // contenu ~60px → bien plus petit que 200px d'origine
    expect(res.width).toBeLessThan(120);
    expect(res.width).toBeGreaterThan(40);
  });

  it('sliceBoardGrid découpe une planche 2×2 en 4 assets nommés', async () => {
    const dir = await tmp();
    const board = await makeBoard(dir);
    const out = join(dir, 'cells');
    const res = await sliceBoardGrid({
      srcPath: board,
      outputDir: out,
      rows: 2,
      cols: 2,
      names: ['hero', 'enemy', 'prop', 'boss'],
      trim: true,
    });
    expect(res.cells).toHaveLength(4);
    expect(res.cells[0]!.path.endsWith('hero.png')).toBe(true);
    // chaque cellule recadrée ≈ 32px (le carré), pas 64 (la cellule pleine)
    for (const c of res.cells) {
      const m = await sharp(c.path).metadata();
      expect(m.width!).toBeLessThanOrEqual(40);
      expect(m.width!).toBeGreaterThanOrEqual(24);
    }
  });
});
