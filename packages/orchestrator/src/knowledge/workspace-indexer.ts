import { readFile, readdir, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

export interface KnowledgeChunk {
  id: string;
  path: string;
  title: string;
  excerpt: string;
  tags: string[];
}

export interface WorkspaceKnowledgeIndex {
  project_slug: string;
  chunk_count: number;
  indexed_at: string;
  chunks: KnowledgeChunk[];
}

const INDEXABLE = /\.(md|json|txt)$/i;
const SKIP_DIRS = new Set(['node_modules', '.git', '07_exports']);

function excerpt(text: string, max = 480): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max)}…`;
}

function titleFromPath(rel: string): string {
  const base = rel.split(/[/\\]/).pop() ?? rel;
  return base.replace(/\.(md|json|txt)$/i, '').replace(/[-_]/g, ' ');
}

function tagsFromPath(rel: string): string[] {
  const parts = rel.split(/[/\\]/).filter(Boolean);
  return parts.slice(0, -1).slice(-3);
}

export async function indexWorkspaceKnowledge(workspaceRoot: string, slug: string): Promise<WorkspaceKnowledgeIndex> {
  const chunks: KnowledgeChunk[] = [];

  async function walk(abs: string): Promise<void> {
    const entries = await readdir(abs, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = join(abs, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!INDEXABLE.test(entry.name)) continue;
      if (entry.name.endsWith('.min.json')) continue;
      try {
        const st = await stat(full);
        if (st.size > 512_000) continue;
        const raw = await readFile(full, 'utf-8');
        const rel = relative(workspaceRoot, full).replace(/\\/g, '/');
        chunks.push({
          id: rel.replace(/[/\\]/g, '__'),
          path: rel,
          title: titleFromPath(rel),
          excerpt: excerpt(raw),
          tags: tagsFromPath(rel),
        });
      } catch {
        /* skip unreadable */
      }
    }
  }

  await walk(workspaceRoot);

  const index: WorkspaceKnowledgeIndex = {
    project_slug: slug,
    chunk_count: chunks.length,
    indexed_at: new Date().toISOString(),
    chunks,
  };

  const outDir = join(workspaceRoot, '08_ops', 'knowledge');
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'index.json'), JSON.stringify(index, null, 2), 'utf-8');
  return index;
}

export function searchKnowledgeIndex(index: WorkspaceKnowledgeIndex, query: string, limit = 12): KnowledgeChunk[] {
  const q = query.toLowerCase().trim();
  if (!q) return index.chunks.slice(0, limit);
  const scored = index.chunks
    .map((c) => {
      const hay = `${c.title} ${c.excerpt} ${c.tags.join(' ')} ${c.path}`.toLowerCase();
      let score = 0;
      for (const term of q.split(/\s+/)) {
        if (term && hay.includes(term)) score += 1;
      }
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.c);
}
