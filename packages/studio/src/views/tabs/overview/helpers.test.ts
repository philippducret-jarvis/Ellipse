import { describe, expect, it } from 'vitest';
import type { GameProjectSnapshot } from '@ellipse/shared';
import type { WorkflowCatalogResponse } from '../../../api/client.js';
import { buildTaskSummary, buildWorkflowSummary } from './helpers.js';

const snapshot = {
  project: {
    id: '8c1d9d74-9d59-4d05-a6ab-111111111111',
    title: 'Echoes of the Mushroom Realm',
    slug: 'echoes-of-the-mushroom-realm',
    status: 'planning',
    source_prompt: 'Prompt',
    summary: 'Summary',
    genre: 'platformer',
    dimension: '2d',
    target_runtime: 'ellipse_web_2d',
    camera_mode: 'side_view',
    source_images: [],
    metadata: {},
  },
  prompts: [],
  documents: [{ id: '1' }],
  tasks: [
    { id: 'a', status: 'ready' },
    { id: 'b', status: 'backlog' },
    { id: 'c', status: 'backlog' },
  ],
  assets: [{ id: 'asset-1' }, { id: 'asset-2' }],
  asset_sources: [],
  asset_variants: [],
  asset_outputs: [],
  scenes: [],
  builds: [],
} as unknown as GameProjectSnapshot;

describe('overview helpers', () => {
  it('builds a stable task summary for the cockpit', () => {
    const summary = buildTaskSummary(snapshot);
    expect(summary.find((entry) => entry.label === 'Genre')?.value).toBe('platformer');
    expect(summary.find((entry) => entry.label === 'Tâches')?.value).toBe('3');
    expect(summary.find((entry) => entry.label === 'Répartition tâches')?.value).toContain('2 backlog');
  });

  it('builds workflow metrics from the orchestrator catalog', () => {
    const catalog: WorkflowCatalogResponse = {
      workflows: [
        { id: 'a', label: 'A', runtime: 'hybrid', objective: '', triggers: [], recovery_strategy: [], steps: [] },
        { id: 'b', label: 'B', runtime: 'temporal', objective: '', triggers: [], recovery_strategy: [], steps: [] },
        { id: 'c', label: 'C', runtime: 'hybrid', objective: '', triggers: [], recovery_strategy: [], steps: [] },
      ],
    };

    const summary = buildWorkflowSummary(catalog);
    expect(summary.count).toBe(3);
    expect(summary.runtimes).toBe('hybrid · temporal');
    expect(summary.masterSurface).toBe('contrats + workflows');
  });
});
