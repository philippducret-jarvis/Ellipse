import type { RoutingFile } from './types.js';

export function RoutingGrid({ routing }: { routing: RoutingFile }) {
  return (
    <div className="production-routing-grid">
      {routing.routes.map((route) => (
        <article key={route.asset_id} className="production-card routing-card-pro">
          <div className="production-card-head">
            <div>
              <span className="production-card-kicker">{route.folder_group}</span>
              <h4>{route.title}</h4>
            </div>
            <span className="chip-small">{route.role}</span>
          </div>
          <p className="production-card-copy">{route.routing.pipeline}</p>
          <div className="production-chip-row">
            {route.routing.execution.map((entry) => <span key={entry} className="chip-small">{entry}</span>)}
          </div>
          <div className="production-model-list">
            {route.routing.models.map((model) => (
              <a key={`${route.asset_id}-${model.id}`} className="production-model-item" href={model.url} target="_blank" rel="noreferrer">
                <strong>{model.id}</strong>
                <span>{model.use}</span>
              </a>
            ))}
            {route.routing.models.length === 0 ? <p className="muted">No external model required.</p> : null}
          </div>
          <div className="production-output-list">
            {route.routing.outputs.map((output) => <span key={output} className="chip-small">{output}</span>)}
          </div>
        </article>
      ))}
    </div>
  );
}
