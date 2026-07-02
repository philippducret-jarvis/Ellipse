import { useMemo } from 'react';
import type { GameProjectSnapshot } from '@ellipse/shared';
import { AGENT_CATALOG } from '@ellipse/shared';
import { useStudioStore } from '../../store/studio-store.js';
import { FACTORY_AGENT_PROFILES } from './agents/data.js';
import { FactoryAgentsSection } from './agents/FactoryAgentsSection.js';
import { RuntimeAgentsSection } from './agents/RuntimeAgentsSection.js';

export function AgentsTab({ snap }: { snap: GameProjectSnapshot }) {
  const generatePlan = useStudioStore((s) => s.generatePlan);
  const liveSteps = useStudioStore((s) => s.generateAgentSteps);

  const tasksByFactoryAgent = useMemo(() => {
    const map = new Map<string, typeof snap.tasks>();
    for (const task of snap.tasks) {
      const entries = map.get(task.agent_id) ?? [];
      entries.push(task);
      map.set(task.agent_id, entries);
    }
    return map;
  }, [snap.tasks]);

  const liveRuntimeAgents = new Set(generatePlan?.tasks.map((task) => task.agent) ?? []);
  const runtimeStepCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const step of liveSteps) {
      counts.set(step.agent, (counts.get(step.agent) ?? 0) + 1);
    }
    return counts;
  }, [liveSteps]);

  const readyTasks = snap.tasks.filter((t) => t.status === 'ready').length;

  return (
    <div className="tab-content agents-tab">
      <section className="agents-hero">
        <div>
          <p className="workspace-kicker">Cockpit IA</p>
          <h2>Agents, compétences et couverture</h2>
          <p className="muted">
            Vue dense de l&apos;usine Ellipse : agents factory du workspace, agents runtime du pipeline,
            tâches couvertes et sorties attendues pour <strong>{snap.project.title}</strong>.
          </p>
        </div>
        <div className="agents-hero-metrics">
          <article className="stat-tile">
            <span className="stat-label">Agents factory</span>
            <strong className="stat-value">{FACTORY_AGENT_PROFILES.length}</strong>
          </article>
          <article className="stat-tile">
            <span className="stat-label">Tâches projet</span>
            <strong className="stat-value">{snap.tasks.length}</strong>
          </article>
          <article className="stat-tile">
            <span className="stat-label">Agents runtime</span>
            <strong className="stat-value">{AGENT_CATALOG.length}</strong>
          </article>
          <article className="stat-tile">
            <span className="stat-label">Prêtes / live</span>
            <strong className="stat-value">
              {readyTasks} / {liveSteps.length}
            </strong>
          </article>
        </div>
      </section>

      <FactoryAgentsSection tasksByFactoryAgent={tasksByFactoryAgent} />
      <RuntimeAgentsSection liveRuntimeAgents={liveRuntimeAgents} runtimeStepCounts={runtimeStepCounts} />
    </div>
  );
}
