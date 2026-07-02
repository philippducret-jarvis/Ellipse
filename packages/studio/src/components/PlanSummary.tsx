import { useStudioStore } from '../store/studio-store.js';

export function PlanSummary() {
  const plan = useStudioStore((s) => s.plan);
  if (!plan) return null;

  return (
    <section className="panel plan-panel">
      <div className="panel-head">
        <h2>Cortex</h2>
        <span className="chip-small">{plan.user_intent.genre ?? 'jeu'} · {plan.user_intent.dimension}</span>
      </div>
      <p className="plan-notes">{plan.master_notes}</p>
      {plan.user_intent.mechanics.length > 0 && (
        <div className="mechanics">
          {plan.user_intent.mechanics.map((m) => (
            <span key={m} className="chip">
              {m}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
