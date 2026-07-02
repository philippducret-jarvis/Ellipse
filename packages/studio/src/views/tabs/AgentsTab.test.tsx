// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AgentsTab } from './AgentsTab.js';
import { useStudioStore } from '../../store/studio-store.js';
import { createStudioTestSnapshot, createTask } from '../../test/fixtures.js';

describe('AgentsTab', () => {
  beforeEach(() => {
    useStudioStore.setState({
      generatePlan: {
        tasks: [{ task_id: 'plan-1', title: 'Hero pack', description: 'desc', agent: 'asset_direction', depends_on: [] }],
      } as never,
      generateAgentSteps: [{ taskId: 'step-1', agent: 'asset_direction', status: 'running' }],
    });
  });

  afterEach(() => {
    cleanup();
    useStudioStore.setState({ generatePlan: null, generateAgentSteps: [] });
  });

  it('renders factory and runtime agent coverage', () => {
    const snap = createStudioTestSnapshot({
      tasks: [
        createTask({ id: 'task-1', agent_id: 'producer', title: 'Lock vision' }),
        createTask({ id: 'task-2', agent_id: 'asset_direction', title: 'Hero pack' }),
      ],
    });

    render(<AgentsTab snap={snap} />);

    expect(screen.getByText(/Agents, compétences et couverture/i)).toBeTruthy();
    expect(screen.getByText('Agents factory (workspace)')).toBeTruthy();
    expect(screen.getByText('Agents runtime & génération')).toBeTruthy();
  });
});
