// @vitest-environment jsdom
import {act, cleanup, render} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {App} from './App.js';
import {useStudioStore} from './store/studio-store.js';
import {createStudioTestSnapshot} from './test/fixtures.js';
import type {GameProject} from '@ellipse/shared';

const mocks = vi.hoisted(() => ({fetchHealth:vi.fn(), fetchGameProjects:vi.fn(), fetchSessions:vi.fn()}));
vi.mock('./api/client.js', () => mocks);
vi.mock('./components/ProjectSidebar.js', () => ({ProjectSidebar:() => null}));
vi.mock('./views/ProjectWorkspace.js', () => ({ProjectWorkspace:() => null}));
vi.mock('./components/NewProjectModal.js', () => ({NewProjectModal:() => null}));
vi.mock('./components/CreationWizard.js', () => ({CreationWizard:() => null}));
vi.mock('./components/Cockpit.js', () => ({Cockpit:() => null}));
vi.mock('./components/EllispherePanel.js', () => ({EllispherePanel:() => null}));

afterEach(() => {cleanup(); vi.resetAllMocks(); useStudioStore.setState({activeProjectId:null,activeSnapshot:null,projects:[]});});
it('conserve le choix utilisateur quand la liste initiale arrive en retard', async () => {
  let complete!: (list:GameProject[]) => void;
  mocks.fetchGameProjects.mockReturnValue(new Promise<GameProject[]>(resolve => {complete = resolve;}));
  mocks.fetchHealth.mockResolvedValue(null); mocks.fetchSessions.mockResolvedValue([]);
  useStudioStore.setState({activeProjectId:null,activeSnapshot:null,projects:[]});
  render(<App />);
  await act(async () => {useStudioStore.getState().setActiveProject('shadow');});
  const project = createStudioTestSnapshot().project;
  project.id = 'first-project';
  await act(async () => {complete([project]);});
  expect(useStudioStore.getState().activeProjectId).toBe('shadow');
});
