import { AGENT_CATALOG, DOMAIN_LABELS, getDomainOrder } from '@ellipse/shared';

export function RuntimeAgentsSection({
  liveRuntimeAgents,
  runtimeStepCounts,
}: {
  liveRuntimeAgents: Set<string>;
  runtimeStepCounts: Map<string, number>;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>Agents runtime & génération</h3>
          <p className="muted">Catalogue visuel, gameplay et export — relié à l&apos;onglet Génération IA.</p>
        </div>
      </div>

      <div className="runtime-domain-stack">
        {getDomainOrder().map((domain) => {
          const agents = AGENT_CATALOG.filter((entry) => entry.domain === domain);
          return (
            <section key={domain} className="runtime-domain-group">
              <div className="runtime-domain-head">
                <strong>{DOMAIN_LABELS[domain]}</strong>
                <span className="chip-small">{agents.length} agent(s)</span>              </div>

              <div className="runtime-agent-grid">
                {agents.map((agent) => {
                  const isPlanned = liveRuntimeAgents.has(agent.id);
                  const stepCount = runtimeStepCounts.get(agent.id) ?? 0;
                  return (
                    <article key={agent.id} className={`runtime-agent-card ${isPlanned ? 'planned' : ''}`}>
                      <div className="runtime-agent-head">
                        <div>
                          <strong>{agent.name}</strong>
                          <p className="muted">{agent.id}</p>
                        </div>
                        <div className="runtime-agent-badges">
                          <span className="chip-small">{agent.phase === 1 ? 'Phase 1' : 'Phase 2'}</span>
                          <span className="chip-small">{stepCount} étape(s) live</span>
                        </div>
                      </div>
                      <p className="runtime-agent-role">{agent.role}</p>
                      <p className="runtime-agent-work">{agent.workLabel}</p>
                      <div className="factory-agent-tags">
                        {agent.outputs.map((output) => (
                          <span key={output} className="chip-small">{output}</span>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
