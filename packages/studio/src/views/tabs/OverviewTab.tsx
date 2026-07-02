import { useEffect, useMemo, useState } from 'react';
import type { GameProjectSnapshot } from '@ellipse/shared';
import { addGameProjectPrompt, fetchWorkflowCatalog, type WorkflowCatalogResponse } from '../../api/client.js';
import { ActionLink } from '../../ui/ActionButton.js';
import { PROJECT_STATUS_FR } from '../../i18n/fr.js';
import { buildTaskSummary, buildWorkflowSummary, projectStatusFr } from './overview/helpers.js';
import { ProductionJourney } from '../../components/ProductionJourney.js';
import { IntentContractPanel } from '../../components/IntentContractPanel.js';
import { CreationStreamPanel } from '../../components/CreationStreamPanel.js';
import { AutonomousWorkflowPanel } from '../../components/AutonomousWorkflowPanel.js';

const STATUS_COLOR: Record<string, string> = {
  planning: '#f1c40f',
  active: '#2ecc71',
  completed: '#3498db',
  archived: '#888888',
  producing: '#4ecdc4',
  review: '#f39c12',
  ready: '#7bed9f',
  draft: '#95a5a6',
};

export function OverviewTab({ snap, onUpdate }: { snap: GameProjectSnapshot; onUpdate: (s: GameProjectSnapshot) => void }) {
  const [iterPrompt, setIterPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflowCatalog, setWorkflowCatalog] = useState<WorkflowCatalogResponse | null>(null);

  const project = snap.project;
  const isShowcaseMode = Boolean(project.metadata?.showcase_mode);
  const stats = useMemo(() => buildTaskSummary(snap), [snap]);
  const workflowSummary = useMemo(() => buildWorkflowSummary(workflowCatalog), [workflowCatalog]);
  const latestBuild = snap.builds[0] ?? null;
  const workspaceBase = `/workspaces/${project.slug}`;
  const previewUrl = `${workspaceBase}/07_exports/web/preview.html`;
  const keyartUrl = `${workspaceBase}/01_inputs/references/menu_keyart.jpeg`;
  const manifestUrl = `${workspaceBase}/08_ops/manifests/echoes-workspace.json`;
  const agentCapabilitiesUrl = `${workspaceBase}/08_ops/manifests/agent-capabilities.json`;
  const constructionStackUrl = `${workspaceBase}/02_design/specs/game-construction-stack.md`;
  const constructionMapUrl = `${workspaceBase}/07_exports/web/construction-map.html`;
  const systemsBoardUrl = `${workspaceBase}/07_exports/web/systems-board.html`;
  const operatingModelUrl = `${workspaceBase}/07_exports/web/operating-model.html`;
  const productionHqUrl = `${workspaceBase}/07_exports/web/production-hq.html`;
  const runtimeGdlUrl = `${workspaceBase}/05_runtime/gdl/echoes.preview.gdl.json`;
  const referenceIndexUrl = `${workspaceBase}/01_inputs/references/reference-index.json`;
  const assetBlueprintUrl = `${workspaceBase}/02_design/specs/asset-factory-blueprint.md`;
  const masterPlanUrl = `${workspaceBase}/08_ops/manifests/master-execution-plan.json`;
  const designMasterPlanUrl = `${workspaceBase}/02_design/specs/next-gen-master-plan.md`;
  const statusFr = projectStatusFr(project.status);

  useEffect(() => {
    void fetchWorkflowCatalog().then(setWorkflowCatalog).catch(() => setWorkflowCatalog(null));
  }, []);

  async function handleIteration(): Promise<void> {
    if (!iterPrompt.trim()) return;
    setBusy(true);
    setError(null);

    try {
      const updated = await addGameProjectPrompt(project.id, iterPrompt.trim());
      onUpdate(updated);
      setIterPrompt('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d'ajouter l'itération");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tab-content overview-tab">
      <IntentContractPanel snap={snap} />
      <CreationStreamPanel snap={snap} />
      <ProductionJourney snap={snap} />
      {!isShowcaseMode ? <AutonomousWorkflowPanel projectId={project.id} /> : null}
      <section className="overview-hero overview-hero-expanded">
        <div className="overview-hero-left">
          <p className="workspace-kicker">Pilotage projet</p>
          <h2 className="overview-title">{project.title}</h2>
          <p className="overview-summary">{project.summary ?? 'Aucun résumé pour le moment.'}</p>
          {isShowcaseMode ? (
            <p className="muted">
              Mode vitrine : le projet est chargé depuis les manifests workspace (base de données indisponible).
            </p>
          ) : null}
          <div className="overview-tags">
            <span className="chip">{project.dimension.toUpperCase()}</span>
            <span className="chip">{project.genre ?? 'hybride'}</span>
            <span
              className="chip"
              style={{ background: `${STATUS_COLOR[project.status] ?? '#888888'}22`, color: STATUS_COLOR[project.status] ?? '#888888' }}
            >
              {statusFr}
            </span>
            <span className="chip chip-photo">{snap.asset_sources.length} réf. sources</span>
            <span className="chip chip-photo">{snap.prompts.length} prompt(s)</span>
          </div>

          <div className="overview-link-row es-command-bar-grid" style={{ marginTop: '1rem' }}>
            <ActionLink
              label="Aperçu jouable"
              hint="Tester le jeu dans le moteur Ellipse — valide GDL et assets"
              href={previewUrl}
              external
            />
            <ActionLink
              label="Carte de construction"
              hint="Graphe des systèmes et dépendances de production"
              href={constructionMapUrl}
              external
            />
            <ActionLink
              label="Tableau des systèmes"
              hint="Vue d'ensemble des systèmes gameplay et techniques"
              href={systemsBoardUrl}
              external
            />
            <ActionLink
              label="Modèle opérationnel"
              hint="Organisation agents, pipelines et livraisons"
              href={operatingModelUrl}
              external
            />
            <ActionLink
              label="Production HQ"
              hint="Cockpit production — work orders et routing"
              href={productionHqUrl}
              external
            />
            <ActionLink
              label="Plan directeur"
              hint="Manifest d'exécution et jalons du projet"
              href={masterPlanUrl}
              external
            />
            <ActionLink
              label="Manifest workspace"
              hint="État du workspace, chemins et contexte orchestration"
              href={manifestUrl}
              external
            />
            <ActionLink
              label="GDL runtime"
              hint="Définition déclarative — entités, scènes, systèmes"
              href={runtimeGdlUrl}
              external
            />
          </div>
        </div>

        <div className="overview-hero-right">
          <div className="overview-keyart-frame">
            <img src={keyartUrl} alt={`Illustration — ${project.title}`} />
          </div>
          {latestBuild ? (
            <div className="overview-build-badge">
              <span className="overview-build-label">Dernière compilation</span>
              <span className={`overview-build-status status-${latestBuild.status}`}>
                {PROJECT_STATUS_FR[latestBuild.status] ?? latestBuild.status}
              </span>
              <span className="overview-build-target">{latestBuild.target}</span>
            </div>
          ) : null}
        </div>
      </section>

      <div className="stat-strip">
        {stats.map((entry) => (
          <article key={entry.label} className="stat-tile">
            <span className="stat-label">{entry.label}</span>
            <strong className="stat-value">{entry.value}</strong>
          </article>
        ))}
      </div>

      <div className="overview-grid">
        <section className="panel overview-prompt-panel">
          <h3>Concept d&apos;origine</h3>
          <p className="overview-prompt-text">{project.source_prompt}</p>
          <div className="overview-resource-links es-command-bar-links">
            <ActionLink label="Index références" hint="Photos et planches sources indexées" href={referenceIndexUrl} external />
            <ActionLink label="Blueprint assets" hint="Spécification usine à assets par famille" href={assetBlueprintUrl} external />
            <ActionLink label="Carte construction" hint="Graphe de dépendances de production" href={constructionMapUrl} external />
            <ActionLink label="Systèmes" hint="Board des systèmes gameplay" href={systemsBoardUrl} external />
            <ActionLink label="Ops model" hint="Modèle opérationnel agents" href={operatingModelUrl} external />
            <ActionLink label="Production HQ" hint="Suivi work orders" href={productionHqUrl} external />
            <ActionLink label="Plan design" hint="Roadmap design next-gen" href={designMasterPlanUrl} external />
            <ActionLink label="Plan manifest" hint="Plan d'exécution JSON" href={masterPlanUrl} external />
            <ActionLink label="Stack construction" hint="Specs techniques empilées" href={constructionStackUrl} external />
            <ActionLink label="Capacités agents" hint="Manifest des compétences agents" href={agentCapabilitiesUrl} external />
            <ActionLink label="README workspace" hint="Documentation racine du projet" href={`${workspaceBase}/README.md`} external />
          </div>
        </section>

        <section className="panel overview-backlog-panel">
          <h3>Backlog prioritaire</h3>
          <div className="task-list">
            {snap.tasks.slice(0, 8).map((task) => (
              <div key={task.id} className="task-item">
                <div className="task-item-info">
                  <strong>{task.title}</strong>
                  <span className="muted">
                    {task.agent_id} · {task.kind}
                  </span>
                </div>
                <span className={`chip chip-task-${task.status}`}>{PROJECT_STATUS_FR[task.status] ?? task.status}</span>
              </div>
            ))}
            {snap.tasks.length > 8 ? (
              <p className="muted task-more">+{snap.tasks.length - 8} tâches supplémentaires</p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="panel overview-spine-panel">
        <div className="panel-head">
          <div>
            <h3>Colonne vertébrale du projet</h3>
            <p className="muted">Indicateurs clés pour piloter et auditer l&apos;avancement.</p>
          </div>
        </div>
        <div className="overview-spine-grid">
          <article className="summary-tile">
            <span className="muted">Racine workspace</span>
            <strong>{`workspaces/${project.slug}`}</strong>
          </article>
          <article className="summary-tile">
            <span className="muted">Scènes</span>
            <strong>{snap.scenes.length}</strong>
          </article>
          <article className="summary-tile">
            <span className="muted">Variantes</span>
            <strong>{snap.asset_variants.length}</strong>
          </article>
          <article className="summary-tile">
            <span className="muted">Sorties assets</span>
            <strong>{snap.asset_outputs.length}</strong>
          </article>
        </div>
      </section>

      <section className="panel overview-spine-panel">
        <div className="panel-head">
          <div>
            <h3>Couche workflows</h3>
            <p className="muted">Catalogue durable exposé par l&apos;orchestrateur, relié au plan directeur.</p>
          </div>
        </div>
        <div className="overview-spine-grid">
          <article className="summary-tile">
            <span className="muted">Workflows durables</span>
            <strong>{workflowSummary.count}</strong>
          </article>
          <article className="summary-tile">
            <span className="muted">Runtimes principaux</span>
            <strong>{workflowSummary.runtimes}</strong>
          </article>
          <article className="summary-tile">
            <span className="muted">Surface maître</span>
            <strong>{workflowSummary.masterSurface}</strong>
          </article>
          <article className="summary-tile">
            <span className="muted">Cible actuelle</span>
            <strong>{workflowSummary.currentTarget}</strong>
          </article>
        </div>
      </section>

      <section className="panel overview-iteration-panel">
        <h3>Itérer sur ce jeu</h3>
        <p className="muted">
          Ajoutez une demande ciblée : les agents mettent à jour le GDL et la mémoire projet reste cohérente.
        </p>
        <div className="iteration-row">
          <textarea
            className="text-input textarea"
            rows={2}
            value={iterPrompt}
            onChange={(event) => setIterPrompt(event.target.value)}
            placeholder="Ex. : verrouiller la silhouette du héros, découper le niveau en combats plus lisibles, préparer les packs ennemis runtime."
          />
          <button className="btn-secondary" disabled={busy || !iterPrompt.trim() || isShowcaseMode} onClick={() => void handleIteration()}>
            {busy ? 'Ajout…' : isShowcaseMode ? 'Lecture seule (vitrine)' : 'Ajouter une itération'}
          </button>
        </div>
        {isShowcaseMode ? <p className="muted">Les écritures restent désactivées tant que la base de données est indisponible.</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
      </section>
    </div>
  );
}
