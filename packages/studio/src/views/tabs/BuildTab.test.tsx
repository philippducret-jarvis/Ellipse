// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BuildTab } from './BuildTab.js';
import { createBuild, createStudioTestSnapshot } from '../../test/fixtures.js';
import { useStudioStore } from '../../store/studio-store.js';

const buildClientMocks = vi.hoisted(() => ({
  fetchSessions: vi.fn(),
  fetchSession: vi.fn(),
  fetchSessionResults: vi.fn(),
}));

vi.mock('../../api/client.js', () => ({
  fetchSessions: buildClientMocks.fetchSessions,
  fetchSession: buildClientMocks.fetchSession,
  fetchSessionResults: buildClientMocks.fetchSessionResults,
}));

describe('BuildTab', () => {
  afterEach(() => {
    cleanup();
    buildClientMocks.fetchSessions.mockReset();
    buildClientMocks.fetchSession.mockReset();
    buildClientMocks.fetchSessionResults.mockReset();
    useStudioStore.setState({ sessions: [] });
  });

  it('renders builds and selected generation run details', async () => {
    buildClientMocks.fetchSessions.mockResolvedValue([
      {
        id: 'session-1',
        prompt: 'Create a vertical slice around the origin tree.',
        status: 'completed',
        created_at: '2026-06-19T10:00:00Z',
      },
    ]);
    buildClientMocks.fetchSession.mockResolvedValue({
      prompt: 'Create a vertical slice around the origin tree.',
      status: 'completed',
      created_at: '2026-06-19T10:00:00Z',
    });
    buildClientMocks.fetchSessionResults.mockResolvedValue([
      {
        task_id: 'task-1',
        agent: 'producer',
        status: 'success',
        agent_notes: 'Master plan locked.',
      },
    ]);

    const snap = createStudioTestSnapshot({
      builds: [
        createBuild({
          target: 'android_preview',
          output_url: '/artifacts/android-preview.apk',
        }),
      ],
    });

    render(<BuildTab snap={snap} />);

    await waitFor(() => {
      expect(screen.getByText('Cibles de compilation')).toBeTruthy();
      expect(screen.getByText('android_preview')).toBeTruthy();
      expect(screen.getByRole('button', { name: /Create a vertical slice/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Create a vertical slice/i }));

    await waitFor(() => {
      expect(screen.getByText('Détail du run')).toBeTruthy();
      expect(screen.getByText('Master plan locked.')).toBeTruthy();
      expect(screen.getByRole('link', { name: /Exporter le bundle session/i })).toBeTruthy();
    });
  });
});
