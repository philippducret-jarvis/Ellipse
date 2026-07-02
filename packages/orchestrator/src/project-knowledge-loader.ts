import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import {
  formatAgentSkillsForContext,
  summarizeGodotParityForAgents,
  formatTrainingRoadmapForAgents,
} from '@ellipse/shared';
import { readAgentMemory, formatAgentMemoryForContext } from './agents/agent-memory.js';
import type { AgentType } from '@ellipse/shared';
import { searchKnowledgeIndex, type WorkspaceKnowledgeIndex } from './knowledge/workspace-indexer.js';

export interface ProjectKnowledgeContext {
  project_slug: string;
  gdd_excerpt: string;
  playbook_excerpt: string;
  capability_summary: string;
  agent_memory_summary: string;
  knowledge_chunks: Array<{ title: string; excerpt: string; path: string }>;
}

async function readOptional(path: string, max = 6000): Promise<string> {
  if (!existsSync(path)) return '';
  const raw = await readFile(path, 'utf-8');
  return raw.length <= max ? raw : `${raw.slice(0, max)}…`;
}

export async function loadProjectKnowledgeContext(
  workspaceRoot: string,
  projectSlug: string,
  query: string,
): Promise<ProjectKnowledgeContext> {
  const playbook = await readOptional(join(workspaceRoot, '08_ops', 'manifests', 'agent-playbook.md'));
  const hdPlaybook = await readOptional(join(workspaceRoot, '08_ops', 'manifests', 'agent-hd-playbook.md'), 4000);
  const capability = await readOptional(
    join(workspaceRoot, '08_ops', 'manifests', 'studio-capability-gap-registry.json'),
    3000,
  );

  let knowledge_chunks: ProjectKnowledgeContext['knowledge_chunks'] = [];
  const indexPath = join(workspaceRoot, '08_ops', 'knowledge', 'index.json');
  if (existsSync(indexPath)) {
    try {
      const index = JSON.parse(await readFile(indexPath, 'utf-8')) as WorkspaceKnowledgeIndex;
      knowledge_chunks = searchKnowledgeIndex(index, query || projectSlug, 8).map((c) => ({
        title: c.title,
        excerpt: c.excerpt,
        path: c.path,
      }));
    } catch {
      /* optional */
    }
  }

  const refineReport = await readOptional(join(workspaceRoot, '08_ops', 'manifests', 'refine-all-report.json'), 2000);
  const trainingSnapshot = await readOptional(join(workspaceRoot, '08_ops', 'manifests', 'training-roadmap.json'), 2500);
  const memory = await readAgentMemory(workspaceRoot, 25);
  const agent_memory_summary = formatAgentMemoryForContext(memory);

  let gsgSummary = '';
  const gdlPath = join(workspaceRoot, '05_runtime', 'gdl', 'veloria.preview.gdl.json');
  if (existsSync(gdlPath)) {
    try {
      const { buildSemanticGraphFromGdl } = await import('@ellipse/shared');
      const gdl = JSON.parse(await readFile(gdlPath, 'utf-8'));
      const gsg = buildSemanticGraphFromGdl(gdl);
      gsgSummary = `## GSG (${gsg.nodes.length} nœuds)\n${gsg.nodes
        .slice(0, 12)
        .map((n) => `- ${n.kind}: ${n.label}`)
        .join('\n')}`;
    } catch {
      /* optional */
    }
  }

  const gdd_excerpt = [
    `# Projet ${projectSlug}`,
    knowledge_chunks.length
      ? `## Contexte indexé\n${knowledge_chunks.map((c) => `### ${c.title}\n${c.excerpt}`).join('\n\n')}`
      : '',
    refineReport ? `## Dernier refine-all\n${refineReport}` : '',
    trainingSnapshot ? `## Progression entraînement\n${trainingSnapshot}` : '',
    gsgSummary,
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    project_slug: projectSlug,
    gdd_excerpt,
    playbook_excerpt: [playbook, hdPlaybook].filter(Boolean).join('\n\n---\n\n'),
    capability_summary: capability,
    agent_memory_summary,
    knowledge_chunks,
  };
}

export function enrichTaskContextWithKnowledge(
  agent: AgentType,
  baseContext: { gdd_excerpt?: string; style_guide?: Record<string, unknown> } | undefined,
  projectKnowledge: ProjectKnowledgeContext | null,
): { gdd_excerpt?: string; style_guide?: Record<string, unknown> } {
  const skills = formatAgentSkillsForContext(agent);
  const trainingFocus = formatTrainingRoadmapForAgents(agent).slice(0, 1800);
  const godotParity =
    agent === 'animation' || agent === 'character' || agent === 'integration'
      ? summarizeGodotParityForAgents().slice(0, 2200)
      : '';
  const parts = [
    baseContext?.gdd_excerpt,
    projectKnowledge?.playbook_excerpt,
    projectKnowledge?.gdd_excerpt,
    skills,
    trainingFocus ? `## Phase entraînement (focus agent)\n${trainingFocus}` : '',
    projectKnowledge?.agent_memory_summary
      ? `## Mémoire agents (échecs/leçons)\n${projectKnowledge.agent_memory_summary}`
      : '',
    godotParity ? `## Parité Godot (cibles agents)\n${godotParity}` : '',
    projectKnowledge?.capability_summary
      ? `## Capability gaps\n${projectKnowledge.capability_summary.slice(0, 1500)}`
      : '',
  ].filter(Boolean);

  return {
    ...baseContext,
    gdd_excerpt: parts.join('\n\n'),
    style_guide: {
      mood: 'dark fantasy premium',
      palette: ['#1a1028', '#c9a227', '#9333ea', '#dc2626'],
      dimension: '2d',
      ...baseContext?.style_guide,
    },
  };
}
