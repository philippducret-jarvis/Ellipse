// @vitest-environment jsdom
import {act, cleanup, render} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {ProjectWorkspace} from './ProjectWorkspace.js';
import {useStudioStore} from '../store/studio-store.js';
import {createStudioTestSnapshot} from '../test/fixtures.js';
import type {GameProjectSnapshot} from '@ellipse/shared';

const mocks = vi.hoisted(() => ({fetchGameProject:vi.fn()}));
vi.mock('../api/client.js', () => mocks);
vi.mock('../components/ProductionRecipePanel.js', () => ({ProductionRecipePanel:() => null}));
vi.mock('../layout/WorkspaceNav.js', () => ({WorkspaceNav:() => null}));
vi.mock('../layout/ProjectCommandBar.js', () => ({ProjectCommandBar:() => null}));
vi.mock('./tabs/DocumentsTab.js', () => ({DocumentsTab:() => null}));

afterEach(() => {cleanup(); mocks.fetchGameProject.mockReset(); useStudioStore.setState({activeProjectId:null,activeSnapshot:null});});

it.each(['success', 'failure'])('ignore une réponse %s du projet quitté', async outcome => {
  let resolveOld!: (value:GameProjectSnapshot) => void;
  let rejectOld!: (error:Error) => void;
  const oldRequest = new Promise<GameProjectSnapshot>((resolve,reject) => {resolveOld = resolve; rejectOld = reject;});
  const oldSnapshot = createStudioTestSnapshot();
  const nextSnapshot = createStudioTestSnapshot();
  oldSnapshot.project.id = 'old'; nextSnapshot.project.id = 'next';
  mocks.fetchGameProject.mockImplementation((id:string) => id === 'old' ? oldRequest : Promise.resolve(nextSnapshot));
  useStudioStore.setState({activeProjectId:'old',activeSnapshot:null,workspaceTab:'documents'});
  const view = render(<ProjectWorkspace projectId="old" />);
  await act(async () => {useStudioStore.getState().setActiveProject('next'); useStudioStore.getState().setWorkspaceTab('documents'); view.rerender(<ProjectWorkspace projectId="next" />);});
  expect(useStudioStore.getState().activeSnapshot?.project.id).toBe('next');
  await act(async () => {if (outcome === 'success') resolveOld(oldSnapshot); else rejectOld(new Error('Delayed failure'));});
  expect(useStudioStore.getState().activeSnapshot?.project.id).toBe('next');
});
