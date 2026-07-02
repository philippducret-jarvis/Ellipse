import type { GameProjectSnapshot } from '@ellipse/shared';
import { FACTORY_AGENT_PROFILES } from './data.js';
import { summarizeTaskStatuses } from './helpers.js';

export function FactoryAgentsSection({
  tasksByFactoryAgent,
}: {
  tasksByFactoryAgent: Map<string, GameProjectSnapshot['tasks']>;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>Agents factory (workspace)</h3>
          <p className="muted">Structurent le projet, densifient les connaissances et organisent le travail.</p>
        </div>
      </div>

      <div className="factory-agent-grid">
        {FACTORY_AGENT_PROFILES.map((agent) => {
          const agentTasks = tasksByFactoryAgent.get(agent.id) ?? [];
          return (
            <article key={agent.id} className="factory-agent-card">
              <div className="factory-agent-head">
                <div>
                  <strong>{agent.name}</strong>
                  <p className="muted factory-agent-id">{agent.id}</p>
                </div>
                <span className="chip-small">{agentTasks.length} tâche(s)</span>
              </div>
              <p className="factory-agent-role">{agent.role}</p>
              <p className="muted factory-agent-status">{summarizeTaskStatuses(agentTasks.map((task) => task.status))}</p>

              <div className="factory-agent-section">
                <h4>Compétences</h4>
                <ul className="agent-bullet-list">
                  {agent.competencies.map((competency) => (
                    <li key={competency}>{competency}</li>
                  ))}
                </ul>
              </div>

              <div className="factory-agent-section">
                <h4>Sorties</h4>
                <div className="factory-agent-tags">
                  {agent.outputs.map((output) => (
                    <span key={output} className="chip-small">{output}</span>
                  ))}
                </div>
              </div>

              {agentTasks.length > 0 ? (
                <div className="factory-agent-section">
                  <h4>Taches du projet</h4>
                  <div className="factory-agent-task-list">
                    {agentTasks.slice(0, 4).map((task) => (
                      <div key={task.id} className="factory-agent-task-item">
                        <strong>{task.title}</strong>
                        <span className="muted">{task.kind} | P{task.priority} | {task.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
