import { useEffect, useRef, useState, startTransition } from 'react';
import { useStudioStore } from './store/studio-store.js';
import { ProjectSidebar } from './components/ProjectSidebar.js';
import { ProjectWorkspace } from './views/ProjectWorkspace.js';
import { NewProjectModal } from './components/NewProjectModal.js';
import { CreationWizard } from './components/CreationWizard.js';
import { Cockpit } from './components/Cockpit.js';
import { StatusBar } from './components/StatusBar.js';
import { PreviewModal } from './layout/PreviewModal.js';
import { resolvePreviewUrl } from './lib/preview.js';
import { ActionButton } from './ui/ActionButton.js';
import { Badge } from './ui/Badge.js';
import { PROJECT_STATUS_FR } from './i18n/fr.js';
import { fetchHealth, fetchGameProjects, fetchSessions } from './api/client.js';

export function App() {
  const setHealth = useStudioStore((s) => s.setHealth);
  const setProjects = useStudioStore((s) => s.setProjects);
  const setSessions = useStudioStore((s) => s.setSessions);
  const setActiveProject = useStudioStore((s) => s.setActiveProject);
  const projects = useStudioStore((s) => s.projects);
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const snap = useStudioStore((s) => s.activeSnapshot);
  const newProjectOpen = useStudioStore((s) => s.newProjectOpen);
  const wizardOpen = useStudioStore((s) => s.wizardOpen);
  const setWizardOpen = useStudioStore((s) => s.setWizardOpen);
  const [previewOpen, setPreviewOpen] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void Promise.all([
      fetchHealth().then(setHealth).catch(() => setHealth(null)),
      fetchGameProjects()
        .then((list) => {
          startTransition(() => {
            setProjects(list);
            if (!activeProjectId && list[0]) setActiveProject(list[0].id);
          });
        })
        .catch(() => {}),
      fetchSessions().then(setSessions).catch(() => {}),
    ]);

    pollingRef.current = setInterval(() => {
      void fetchHealth().then(setHealth).catch(() => setHealth(null));
    }, 15_000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  useEffect(() => {
    if (!activeProjectId && projects.length > 0) setActiveProject(projects[0]!.id);
  }, [projects, activeProjectId, setActiveProject]);

  const previewUrl = resolvePreviewUrl(snap);

  return (
    <div className="es-app">
      <ProjectSidebar />
      <div className="es-main">
        <header className="es-topbar">
          <div className="es-topbar-back">
            <ActionButton
              className="es-btn-compact"
              label={activeProjectId ? 'Accueil studio' : 'Ellipse'}
              hint="Retour au tableau de bord et liste des jeux"
              variant="ghost"
              onClick={() => setActiveProject(null)}
            />
          </div>
          <div className="es-topbar-center">
            {activeProjectId && snap ? <ProjectTitleBar /> : <span className="es-page-title">Ellipse Studio</span>}
          </div>
          <div className="es-topbar-actions">
            <ActionButton
              className="es-btn-compact"
              label="Créer un jeu"
              hint="Assistant guidé — genre, mécaniques, cast et premier pipeline"
              variant="primary"
              onClick={() => setWizardOpen(true)}
            />
            {activeProjectId && snap ? (
              <ActionButton
                className="es-btn-compact"
                label="Aperçu jouable"
                hint="Tester le jeu dans le moteur Ellipse"
                variant="secondary"
                onClick={() => setPreviewOpen(true)}
              />
            ) : null}
            <StatusBar />
          </div>
        </header>
        <div className="es-body">
          {activeProjectId ? <ProjectWorkspace key={activeProjectId} projectId={activeProjectId} /> : <Cockpit />}
        </div>
      </div>
      {newProjectOpen ? <NewProjectModal /> : null}
      {wizardOpen ? <CreationWizard /> : null}
      {previewOpen && previewUrl ? (
        <PreviewModal url={previewUrl} title={snap?.project.title ?? 'Jeu'} onClose={() => setPreviewOpen(false)} />
      ) : null}
    </div>
  );
}

function ProjectTitleBar() {
  const snap = useStudioStore((s) => s.activeSnapshot);
  if (!snap) return <span className="muted">Chargement du projet…</span>;

  const statusFr = PROJECT_STATUS_FR[snap.project.status] ?? snap.project.status;

  return (
    <div className="es-topbar-project">
      <span className="es-page-title" style={{ fontSize: '1rem', margin: 0 }}>
        {snap.project.title}
      </span>
      <Badge tone="muted">{snap.project.dimension.toUpperCase()}</Badge>
      {snap.project.genre ? <Badge tone="accent">{snap.project.genre}</Badge> : null}
      <Badge tone="success">{statusFr}</Badge>
    </div>
  );
}
