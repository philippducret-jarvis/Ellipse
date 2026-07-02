// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GenerateCallbacks } from '../../api/client.js';
import { GenerateTab } from './GenerateTab.js';
import { useStudioStore } from '../../store/studio-store.js';

const generateClientMocks = vi.hoisted(() => ({
  fetchSessions: vi.fn(),
  generateViaWebSocket: vi.fn(),
  uploadPhoto: vi.fn(),
  saveProjectGdl: vi.fn(),
  fetchGameProject: vi.fn(),
}));

vi.mock('../../api/client.js', () => ({
  fetchSessions: generateClientMocks.fetchSessions,
  generateViaWebSocket: generateClientMocks.generateViaWebSocket,
  uploadPhoto: generateClientMocks.uploadPhoto,
  saveProjectGdl: generateClientMocks.saveProjectGdl,
  fetchGameProject: generateClientMocks.fetchGameProject,
}));

vi.mock('./generate/GeneratePreviewPanel.js', () => ({
  GeneratePreviewPanel: ({ hasGdl }: { hasGdl: boolean }) => <div>{hasGdl ? 'Preview ready' : 'Preview idle'}</div>,
}));

describe('GenerateTab', () => {
  afterEach(() => {
    cleanup();
    generateClientMocks.fetchSessions.mockReset();
    generateClientMocks.generateViaWebSocket.mockReset();
    generateClientMocks.uploadPhoto.mockReset();
    useStudioStore.setState({
      generatePrompt: '',
      generateUploads: [],
      generating: false,
      generateError: null,
      generateStatus: null,
      generatePlan: null,
      generateAgentSteps: [],
      generateSessionId: null,
      generateSessionStatus: null,
      generateGdl: null,
      sessions: [],
    });
  });

  it('runs the generation flow and renders plan, session result, and preview state', async () => {
    generateClientMocks.fetchSessions.mockResolvedValue([
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        prompt: 'Generate a playable Echoes slice.',
        status: 'completed',
        created_at: '2026-06-19T12:00:00Z',
      },
    ]);

    generateClientMocks.generateViaWebSocket.mockImplementation(
      (prompt: string, images: string[], callbacks: GenerateCallbacks) => {
        expect(prompt).toBe('Generate a playable Echoes slice.');
        expect(images).toEqual([]);

        callbacks.onStatus('Planning runtime...');
        callbacks.onPlan({
          plan_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          user_intent: {
            raw_prompt: prompt,
            dimension: '2d',
            mechanics: ['jump', 'attack'],
            source_images: [],
            ambitions: { narrative: true, vfx: true, cinematic: false },
          },
          tasks: [
            {
              task_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              agent: 'producer',
              priority: 1,
              depends_on: [],
              input: { phase: 'plan' },
            },
          ],
          estimated_duration_minutes: 7,
          master_notes: 'Lock the level slice before export.',
        });
        callbacks.onTaskStart({
          task_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          agent: 'producer',
        });
        callbacks.onTaskComplete({
          task_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          agent: 'producer',
          status: 'success',
          agent_notes: 'Plan locked.',
          artifacts: [],
          gdl_patches: [],
        });
        callbacks.onComplete({
          session_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          status: 'completed',
          plan: {
            plan_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            user_intent: {
              raw_prompt: prompt,
              dimension: '2d',
              mechanics: ['jump', 'attack'],
              source_images: [],
              ambitions: { narrative: true, vfx: true, cinematic: false },
            },
            tasks: [
              {
                task_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
                agent: 'producer',
                priority: 1,
                depends_on: [],
                input: { phase: 'plan' },
              },
            ],
            estimated_duration_minutes: 7,
            master_notes: 'Lock the level slice before export.',
          },
          gdl: {
            meta: { title: 'Echoes Slice', dimension: '2d', version: '1.0.0' },
            entities: [],
            scenes: [],
            systems: [],
          },
        });

        return vi.fn();
      },
    );

    generateClientMocks.saveProjectGdl.mockResolvedValue({ ok: true, path: '05_runtime/gdl/game.preview.gdl.json', url: '/x' });
    generateClientMocks.fetchGameProject.mockResolvedValue({ project: { id: '11111111-1111-4111-8111-111111111111', slug: 'game' }, assets: [], prompts: [], documents: [], tasks: [], asset_sources: [], asset_variants: [], asset_outputs: [], scenes: [], builds: [] });

    useStudioStore.setState({ generatePrompt: 'Generate a playable Echoes slice.' });

    render(<GenerateTab projectId="11111111-1111-4111-8111-111111111111" snap={null} onUpdate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Lancer les agents/i }));

    await waitFor(() => {
      expect(screen.getByText(/Plan Cortex : 1 agents/i)).toBeTruthy();
      expect(screen.getByText('Plan locked.')).toBeTruthy();
      expect(screen.getByText(/ID session :/i)).toBeTruthy();
      expect(screen.getByText('Preview ready')).toBeTruthy();
    });
  });
});
