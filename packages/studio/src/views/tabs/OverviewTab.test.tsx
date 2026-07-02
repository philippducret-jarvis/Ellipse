// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { OverviewTab } from './OverviewTab.js';
import type { GameProjectSnapshot } from '@ellipse/shared';

vi.mock('../../api/client.js', () => ({
  addGameProjectPrompt: vi.fn(),
  fetchWorkflowCatalog: vi.fn(async () => ({
    workflows: [
      { id: 'project_bootstrap', runtime: 'hybrid' },
      { id: 'asset_family_pipeline', runtime: 'temporal' },
    ],
  })),
  fetchProjectWorkspaceFile: vi.fn(async () => ({ content: undefined, path: '', name: '', ext: 'json', kind: 'json', url: '', size: 0 })),
  fetchAutonomousWorkflow: vi.fn(async () => ({
    run: {
      runId: 'test',
      projectId: 'p1',
      status: 'idle',
      currentStepId: 'design_brief',
      steps: {},
      integrableArtifacts: [],
      updatedAt: new Date().toISOString(),
    },
  })),
}));

const snap: GameProjectSnapshot = {
  project: {
    id: 'proj-1',
    title: 'Echoes of the Mushroom Realm',
    slug: 'echoes-of-the-mushroom-realm',
    status: 'planning',
    source_prompt: 'Create a dark fantasy exploration game.',
    dimension: '2d',
    target_runtime: 'ellipse_web_2d',
    camera_mode: 'side_view',
    source_images: [],
    metadata: { showcase_mode: true },
    summary: 'Dark fantasy 2D action-exploration slice.',
    genre: 'platformer',
  },
  prompts: [{ id: 'prompt-1', project_id: 'proj-1', content: 'Prompt', created_by: 'test' }],
  documents: [{ id: 'doc-1', project_id: 'proj-1', kind: 'pitch', title: 'Pitch', status: 'generated', content: '# Pitch', payload: {}, created_by: 'test' }],
  tasks: [
    {
      id: 'task-1',
      project_id: 'proj-1',
      agent_id: 'producer',
      kind: 'vision',
      title: 'Lock MVP',
      description: 'desc',
      status: 'ready',
      priority: 1,
      acceptance_criteria: ['done'],
      depends_on: [],
      payload: {},
    },
  ],
  assets: [],
  asset_sources: [],
  asset_variants: [],
  asset_outputs: [],
  scenes: [],
  builds: [
    {
      id: 'build-1',
      project_id: 'proj-1',
      target: 'web_preview',
      status: 'ready',
      created_at: '2026-06-19T00:00:00Z',
      output_url: '/build.zip',
    },
  ],
};

describe('OverviewTab', () => {
  afterEach(() => cleanup());

  it('renders cockpit surfaces and workflow metrics', async () => {
    render(<OverviewTab snap={snap} onUpdate={() => {}} />);

    expect(screen.getByText('Echoes of the Mushroom Realm')).toBeTruthy();
    expect(screen.getByText('Plan directeur')).toBeTruthy();
    expect(screen.getByText('Couche workflows')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('hybrid · temporal')).toBeTruthy();
    });
  });
});
