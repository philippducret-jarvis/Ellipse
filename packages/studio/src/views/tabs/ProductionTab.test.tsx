// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductionTab } from './ProductionTab.js';
import { createStudioTestSnapshot } from '../../test/fixtures.js';

const clientMocks = vi.hoisted(() => ({
  fetchProjectWorkspaceFile: vi.fn(),
}));

vi.mock('../../api/client.js', () => ({
  fetchProjectWorkspaceFile: clientMocks.fetchProjectWorkspaceFile,
}));

describe('ProductionTab', () => {
  afterEach(() => {
    cleanup();
    clientMocks.fetchProjectWorkspaceFile.mockReset();
  });

  it('renders production families and switches views', async () => {
    clientMocks.fetchProjectWorkspaceFile.mockImplementation(async (_projectId: string, path: string) => {
      if (path.includes('asset-taxonomy')) {
        return {
          content: JSON.stringify({
            checked_at: '2026-06-19',
            families: [
              {
                id: 'heroes',
                label: 'Heroes',
                group: 'characters',
                roles: ['hero'],
                kinds: ['character'],
                runtimeUse: ['runtime'],
                folderPattern: '03_assets/characters/hero__*',
                realized_assets: [{ id: 'hero-1', title: 'The Echo', role: 'hero', kind: 'character', workspace_root: null }],
              },
            ],
          }),
        };
      }

      if (path.includes('model-routing')) {
        return {
          content: JSON.stringify({
            checked_at: '2026-06-19',
            routes: [
              {
                asset_id: 'hero-1',
                title: 'The Echo',
                role: 'hero',
                kind: 'character',
                folder_group: 'characters',
                family_id: 'heroes',
                routing: {
                  pipeline: 'asset_family_pipeline',
                  execution: ['sam2', 'asset_factory'],
                  models: [{ id: 'sam2', url: 'https://example.com/sam2', use: 'cutout' }],
                  outputs: ['atlas'],
                },
              },
            ],
          }),
        };
      }

      return {
        content: JSON.stringify({
          checked_at: '2026-06-19',
          stats: {
            taxonomy_families: 1,
            current_assets: 1,
            planned_work_orders: 1,
            active_agents: 2,
          },
          work_orders: [
            {
              asset_id: 'hero-1',
              asset_title: 'The Echo',
              role: 'hero',
              kind: 'character',
              asset_root: null,
              status: 'queued',
              queue_state: 'queued',
              execution_profile: ['hybrid'],
              assigned_agents: ['asset_direction'],
              expected_outputs: ['atlas'],
              source_refs: [],
              stages: [{ id: 'cutout', title: 'Cutout', status: 'queued', agents: ['asset_direction'], preferred_tools: [], quality_gates: [] }],
            },
          ],
        }),
      };
    });

    render(<ProductionTab snap={createStudioTestSnapshot()} />);

    await waitFor(() => {
      expect(screen.getByText('Cockpit production')).toBeTruthy();
      expect(screen.getByText('Heroes')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Routing ML' }));
    await waitFor(() => expect(screen.getAllByText('The Echo').length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: 'Ordres' }));
    await waitFor(() => expect(screen.getByText('Cutout')).toBeTruthy());
  });
});
