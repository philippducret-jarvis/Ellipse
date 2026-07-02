// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceTab } from './WorkspaceTab.js';
import { createStudioTestSnapshot, createWorkspaceFile, createWorkspaceOverview } from '../../test/fixtures.js';

const workspaceClientMocks = vi.hoisted(() => ({
  fetchProjectWorkspace: vi.fn(),
  fetchProjectWorkspaceFile: vi.fn(),
}));

vi.mock('../../api/client.js', () => ({
  fetchProjectWorkspace: workspaceClientMocks.fetchProjectWorkspace,
  fetchProjectWorkspaceFile: workspaceClientMocks.fetchProjectWorkspaceFile,
}));

describe('WorkspaceTab', () => {
  afterEach(() => {
    cleanup();
    workspaceClientMocks.fetchProjectWorkspace.mockReset();
    workspaceClientMocks.fetchProjectWorkspaceFile.mockReset();
  });

  it('renders workspace explorer and selected file preview', async () => {
    workspaceClientMocks.fetchProjectWorkspace.mockResolvedValue(createWorkspaceOverview());
    workspaceClientMocks.fetchProjectWorkspaceFile.mockResolvedValue(createWorkspaceFile());

    render(<WorkspaceTab snap={createStudioTestSnapshot()} />);

    await waitFor(() => {
      expect(screen.getByText('Explorateur workspace')).toBeTruthy();
      expect(screen.getAllByText('README.md').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole('button', { name: /README\.md/i })[0]!);

    await waitFor(() => {
      expect(screen.getByText((content, node) => node?.textContent === '# Echoes\nWorkspace overview')).toBeTruthy();
    });
  });
});
