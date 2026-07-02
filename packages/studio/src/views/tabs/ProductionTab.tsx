import { useEffect, useMemo, useState } from 'react';
import type { GameProjectSnapshot } from '@ellipse/shared';
import { fetchProjectWorkspaceFile, type WorkspaceFilePayload } from '../../api/client.js';
import { FamilyGrid } from './production/FamilyGrid.js';
import { RoutingGrid } from './production/RoutingGrid.js';
import { WorkOrderGrid } from './production/WorkOrderGrid.js';
import { parseWorkspaceJson, type ProductionFile, type ProductionView, type RoutingFile, type TaxonomyFile } from './production/types.js';

function ProductionStats({ production }: { production: ProductionFile }) {
  return (
    <div className="production-stat-strip">
      <article className="stat-tile">
        <span className="stat-label">Familles</span>
        <strong className="stat-value">{production.stats.taxonomy_families}</strong>
      </article>
      <article className="stat-tile">
        <span className="stat-label">Assets actuels</span>
        <strong className="stat-value">{production.stats.current_assets}</strong>
      </article>
      <article className="stat-tile">
        <span className="stat-label">Ordres de travail</span>        <strong className="stat-value">{production.stats.planned_work_orders}</strong>
      </article>
      <article className="stat-tile">
        <span className="stat-label">Agents actifs</span>
        <strong className="stat-value">{production.stats.active_agents}</strong>
      </article>
    </div>
  );
}

function ProductionSwitch({ view, onChange }: { view: ProductionView; onChange: (view: ProductionView) => void }) {
  return (
    <div className="production-view-switch">
      <button type="button" className={`chip ${view === 'families' ? 'active' : ''}`} onClick={() => onChange('families')}>Familles</button>
      <button type="button" className={`chip ${view === 'routing' ? 'active' : ''}`} onClick={() => onChange('routing')}>Routing ML</button>
      <button type="button" className={`chip ${view === 'workorders' ? 'active' : ''}`} onClick={() => onChange('workorders')}>Ordres</button>
    </div>
  );
}

export function ProductionTab({ snap }: { snap: GameProjectSnapshot }) {
  const [view, setView] = useState<ProductionView>('families');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taxonomyFile, setTaxonomyFile] = useState<WorkspaceFilePayload | null>(null);
  const [routingFile, setRoutingFile] = useState<WorkspaceFilePayload | null>(null);
  const [productionFile, setProductionFile] = useState<WorkspaceFilePayload | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void Promise.all([
      fetchProjectWorkspaceFile(snap.project.id, '03_assets/registry/asset-taxonomy.json'),
      fetchProjectWorkspaceFile(snap.project.id, '03_assets/registry/model-routing.json'),
      fetchProjectWorkspaceFile(snap.project.id, '08_ops/manifests/production-hq.json'),
    ])
      .then(([taxonomy, routing, production]) => {
        if (!active) return;
        setTaxonomyFile(taxonomy);
        setRoutingFile(routing);
        setProductionFile(production);
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Données production indisponibles');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [snap.project.id]);

  const taxonomy = useMemo(() => parseWorkspaceJson<TaxonomyFile>(taxonomyFile), [taxonomyFile]);
  const routing = useMemo(() => parseWorkspaceJson<RoutingFile>(routingFile), [routingFile]);
  const production = useMemo(() => parseWorkspaceJson<ProductionFile>(productionFile), [productionFile]);
  const workspaceBase = `/workspaces/${snap.project.slug}`;

  return (
    <div className="tab-content production-tab">
      <section className="production-hero">
        <div className="production-hero-copy">
          <p className="workspace-kicker">Commande production</p>
          <h2>Familles, routing modèles et ordres IA</h2>
          <p className="muted">
            Cette surface structure assets, appels IA et sorties runtime pour
            <strong> {snap.project.title}</strong> — héros, ennemis, cartes, UI, audio et FX restent séparés.
          </p>
        </div>
        <div className="production-hero-actions es-command-bar-links">
          <a className="btn-primary" href={`${workspaceBase}/07_exports/web/production-hq.html`} target="_blank" rel="noreferrer">Production HQ</a>
          <a className="btn-secondary" href={`${workspaceBase}/03_assets/registry/asset-taxonomy.json`} target="_blank" rel="noreferrer">Taxonomie JSON</a>
          <a className="btn-secondary" href={`${workspaceBase}/03_assets/registry/model-routing.json`} target="_blank" rel="noreferrer">Routing JSON</a>
          <a className="btn-secondary" href={`${workspaceBase}/08_ops/manifests/agent-work-orders.json`} target="_blank" rel="noreferrer">Ordres JSON</a>
        </div>
      </section>

      {production ? <ProductionStats production={production} /> : null}

      <section className="panel production-panel">
        <div className="panel-head">
          <div>
            <h3>Cockpit production</h3>
            <p className="muted">Une lecture par strate pour piloter packs, outils et files d&apos;exécution.</p>
          </div>
          <ProductionSwitch view={view} onChange={setView} />
        </div>

        {loading ? <div className="preview-empty">Chargement du cockpit production…</div> : null}
        {error ? <div className="form-error">{error}</div> : null}
        {!loading && !error && view === 'families' && taxonomy ? <FamilyGrid taxonomy={taxonomy} /> : null}
        {!loading && !error && view === 'routing' && routing ? <RoutingGrid routing={routing} /> : null}
        {!loading && !error && view === 'workorders' && production ? (
          <WorkOrderGrid production={production} projectId={snap.project.id} projectSlug={snap.project.slug} />
        ) : null}
      </section>
    </div>
  );
}
