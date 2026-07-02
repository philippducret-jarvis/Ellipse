import { useStudioStore } from '../store/studio-store.js';
import { ProductionRecipePanel } from './ProductionRecipePanel.js';
import { ActionButton } from '../ui/ActionButton.js';
import { PageHeader } from '../ui/PageHeader.js';
import { Badge } from '../ui/Badge.js';
import { PROJECT_STATUS_FR, SERVICE_LABELS } from '../i18n/fr.js';

/**
 * Accueil studio — tableau de bord, projets et pipeline de construction.
 */
export function Cockpit() {
  const projects = useStudioStore((s) => s.projects);
  const sessions = useStudioStore((s) => s.sessions);
  const health = useStudioStore((s) => s.health);
  const setActiveProject = useStudioStore((s) => s.setActiveProject);
  const setWizardOpen = useStudioStore((s) => s.setWizardOpen);
  const setNewProjectOpen = useStudioStore((s) => s.setNewProjectOpen);

  const online = health?.status === 'ok' || health?.status === 'healthy';
  const checks = health?.checks;

  return (
    <div className="es-cockpit">
      <section className="es-cockpit-hero">
        <div>
          <PageHeader
            kicker="Studio Ellipse"
            title="Construire un jeu sans écrire de code"
            description="Décrivez ou importez vos références : Cortex planifie, les agents fabriquent assets, niveaux, systèmes et audio, le moteur rend le tout jouable. Infrastructure souveraine, sans IA tierce."
            actions={
              <>
                <ActionButton
                  label="Assistant de création"
                  hint="Wizard complet — genre, mécaniques, cast et lancement du pipeline"
                  variant="primary"
                  onClick={() => setWizardOpen(true)}
                />
                <ActionButton
                  label="Projet rapide"
                  hint="Un prompt suffit pour initialiser workspace et documents"
                  variant="ghost"
                  onClick={() => setNewProjectOpen(true)}
                />
              </>
            }
          />
        </div>
        <aside>
          <p className="es-kicker">Infrastructure</p>
          <Badge tone={online ? 'success' : 'warning'}>{online ? 'Services en ligne' : 'Services limités'}</Badge>
          {checks ? (
            <ul style={{ listStyle: 'none', marginTop: '0.75rem', fontSize: '0.78rem' }}>
              <li style={{ marginBottom: '0.35rem' }}>
                <StatusDot ok={isUp(checks.database)} /> {SERVICE_LABELS.database}
              </li>
              <li style={{ marginBottom: '0.35rem' }}>
                <StatusDot ok={isUp(checks.bus)} /> {SERVICE_LABELS.bus}
              </li>
              <li>
                <StatusDot ok={isUp(checks.comfyui)} /> {SERVICE_LABELS.comfyui}
              </li>
            </ul>
          ) : null}
        </aside>
      </section>

      <section className="es-cockpit-kpis">
        <Kpi value={projects.length} label="Projets actifs" />
        <Kpi value={sessions.length} label="Sessions génération" />
        <Kpi value={28} label="Genres supportés" />
        <Kpi value={16} label="Agents spécialisés" />
      </section>

      <section className="es-cockpit-section">
        <div className="es-cockpit-section-head">
          <h2>Mes jeux</h2>
          <ActionButton
            className="es-btn-compact"
            label="Nouveau"
            hint="Créer un jeu via l'assistant"
            variant="ghost"
            onClick={() => setWizardOpen(true)}
          />
        </div>
        {projects.length === 0 ? (
          <div className="es-empty">
            Aucun projet. Utilisez l&apos;assistant pour créer votre premier jeu — platformer, RPG, puzzle, etc.
          </div>
        ) : (
          <div className="es-project-grid">
            {projects.map((p) => (
              <button key={p.id} type="button" className="es-project-card" onClick={() => setActiveProject(p.id)}>
                <span className="es-project-card-title">{p.title}</span>
                <div className="es-project-card-meta">
                  <Badge tone="muted">{p.dimension?.toUpperCase?.() ?? '2D'}</Badge>
                  {p.genre ? <Badge tone="accent">{p.genre}</Badge> : null}
                  <Badge tone="success">{PROJECT_STATUS_FR[p.status] ?? p.status}</Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="es-cockpit-section">
        <div className="es-cockpit-section-head">
          <h2>Pipeline de construction</h2>
          <span className="muted">Étapes agents par type de jeu</span>
        </div>
        <ProductionRecipePanel genre={projects[0]?.genre ?? undefined} />
      </section>
    </div>
  );
}

function Kpi({ value, label }: { value: number; label: string }) {
  return (
    <div className="es-kpi">
      <div className="es-kpi-value">{value}</div>
      <div className="es-kpi-label">{label}</div>
    </div>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`es-status-dot ${ok ? 'is-up' : 'is-down'}`}
      style={{ display: 'inline-block', marginRight: '0.35rem', verticalAlign: 'middle' }}
    />
  );
}

function isUp(state: string): boolean {
  return state === 'ok' || state === 'up' || state === 'connected' || state === 'available';
}
