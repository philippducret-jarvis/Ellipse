import { startTransition, useEffect } from 'react';
import { useStudioStore } from '../store/studio-store.js';
import { ActionButton } from '../ui/ActionButton.js';
import { PROJECT_STATUS_FR } from '../i18n/fr.js';
import { fetchGameProjects } from '../api/client.js';

export function ProjectSidebar() {
  const projects = useStudioStore((s) => s.projects);
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const setActiveProject = useStudioStore((s) => s.setActiveProject);
  const setProjects = useStudioStore((s) => s.setProjects);
  const setWizardOpen = useStudioStore((s) => s.setWizardOpen);
  const setNewProjectOpen = useStudioStore((s) => s.setNewProjectOpen);

  useEffect(() => {
    void fetchGameProjects()
      .then((list) => startTransition(() => setProjects(list)))
      .catch(() => {});
  }, [setProjects]);

  return (
    <aside className="es-sidebar">
      <div className="es-sidebar-brand">
        <div className="es-logo-mark" aria-hidden>
          E
        </div>
        <div className="es-brand-text">
          <strong>Ellipse</strong>
          <span>Usine de jeux IA</span>
        </div>
      </div>

      <ActionButton
        label="Nouveau jeu"
        hint="Assistant de création — définit genre, mécaniques et cast initial"
        variant="primary"
        onClick={() => setWizardOpen(true)}
      />
      <ActionButton
        label="Projet rapide"
        hint="Création minimale par prompt — sans wizard"
        variant="ghost"
        onClick={() => setNewProjectOpen(true)}
      />

      <p className="es-sidebar-section">Mes projets</p>
      <nav className="es-sidebar-nav" aria-label="Projets">
        {projects.length === 0 ? (
          <p className="es-sidebar-item-meta" style={{ padding: '0.5rem' }}>
            Aucun jeu. Lancez l&apos;assistant pour démarrer.
          </p>
        ) : null}
        {projects.map((project) => {
          const statusFr = PROJECT_STATUS_FR[project.status] ?? project.status;
          return (
            <button
              key={project.id}
              type="button"
              className={`es-sidebar-item ${activeProjectId === project.id ? 'is-active' : ''}`}
              onClick={() => setActiveProject(project.id)}
              title={`Ouvrir ${project.title} — ${statusFr}`}
            >
              <span className="es-sidebar-item-title">{project.title}</span>
              <span className="es-sidebar-item-meta">
                {project.dimension.toUpperCase()} · {project.genre ?? 'hybride'} · {statusFr}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="es-sidebar-footer">
        {projects.length} projet{projects.length !== 1 ? 's' : ''} · workspace isolé par jeu
      </div>
    </aside>
  );
}
