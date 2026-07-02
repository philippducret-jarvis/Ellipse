// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssetsTab } from './AssetsTab.js';
import { createAsset, createAssetSource, createStudioTestSnapshot } from '../../test/fixtures.js';

vi.mock('../../api/client.js', () => ({
  createGameAsset: vi.fn(),
  fetchAssetStages: vi.fn(),
  fetchGameProject: vi.fn(),
  generateAssetPrototypes: vi.fn(),
  runAssetStage: vi.fn(),
  uploadAssetSource: vi.fn(),
  retouchAssetImage: vi.fn(),
  fetchProjectWorkspaceFile: vi.fn(async () => ({ content: undefined, path: '', name: '', ext: 'json', kind: 'json', url: '', size: 0 })),
}));

vi.mock('../../components/CorpsPreview.js', () => ({
  CorpsPreview: () => null,
}));

describe('AssetsTab', () => {
  afterEach(() => cleanup());

  it('renders asset families and filters assets in showcase mode', () => {
    const heroAsset = createAsset();
    const enemyAsset = createAsset({
      id: '88888888-8888-4888-8888-888888888888',
      role: 'enemy',
      title: 'Sporeling',
      status: 'review',
    });

    const snap = createStudioTestSnapshot({
      assets: [heroAsset, enemyAsset],
      asset_sources: [
        createAssetSource(),
        createAssetSource({
          id: '99999999-9999-4999-8999-999999999999',
          asset_id: enemyAsset.id,
          url: '/references/sporeling.png',
        }),
      ],
      project: {
        metadata: { showcase_mode: true },
      },
    });

    render(<AssetsTab snap={snap} onUpdate={vi.fn()} />);

    expect(screen.getByText(/Mode showcase/i)).toBeTruthy();
    expect(screen.getByText("L'Echo")).toBeTruthy();
    expect(screen.getByText('Sporeling')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: /Ennemis/i })[0]!);

    expect(screen.queryByText("L'Echo")).toBeNull();
    expect(screen.getByText('Sporeling')).toBeTruthy();
  });
});
