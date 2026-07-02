import type { AgentStep } from '../../../store/studio-store.js';
import { AGENT_ICONS, STATUS_ICONS } from './helpers.js';

export function AgentTimelinePanel({ steps }: { steps: AgentStep[] }) {
  if (steps.length === 0) return null;

  return (
    <section className="panel agent-timeline-panel">
      <h3>Agent pipeline</h3>
      <div className="agent-timeline">
        {steps.map((step) => (
          <div key={step.taskId} className={`agent-step agent-step-${step.status}`}>
            <span className="agent-step-icon">{AGENT_ICONS[step.agent] ?? '🤖'}</span>
            <div className="agent-step-body">
              <span className="agent-step-name">{step.agent}</span>
              {step.notes ? <span className="agent-step-notes">{step.notes}</span> : null}
              {step.error ? <span className="agent-step-error">{step.error}</span> : null}
            </div>
            <span className={`agent-step-status-icon status-${step.status}`}>
              {STATUS_ICONS[step.status] ?? '○'}
              {step.status === 'running' ? <span className="spinner-pulse" /> : null}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
