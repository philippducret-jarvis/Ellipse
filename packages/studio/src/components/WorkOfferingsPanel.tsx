import { AGENT_CATALOG } from '@ellipse/shared/agents/catalog';
import { useStudioStore } from '../store/studio-store.js';

/** Panneau compact : travaux proposables + surbrillance plan actuel */
export function WorkOfferingsPanel() {
  const plan = useStudioStore((s) => s.plan);
  const setView = useStudioStore((s) => s.setView);
  const plannedIds = new Set(plan?.tasks.map((t) => t.agent) ?? []);

  return (
    <section className="panel work-panel-compact">
      <div className="panel-head">
        <h2>Travaux Ellipse</h2>
        <span className="chip-small">{AGENT_CATALOG.length} métiers</span>
      </div>
      <p className="muted compact-intro">
        Cortex active les agents pertinents selon votre prompt.{' '}
        <button type="button" className="link-btn" onClick={() => setView('agents')}>
          Voir toutes les capacités →
        </button>
      </p>
      <ul className="work-list-compact">
        {AGENT_CATALOG.map((a) => (
          <li key={a.id} className={plannedIds.has(a.id) ? 'active' : ''}>
            <span className="work-icon">{a.icon}</span>
            <div>
              <strong>{a.workLabel}</strong>
              <span className="muted">{a.capabilities[0]}</span>
            </div>
            {plannedIds.has(a.id) && <span className="work-active-dot" title="Dans le plan" />}
          </li>
        ))}
      </ul>
    </section>
  );
}
