import type { TaxonomyFile } from './types.js';

export function FamilyGrid({ taxonomy }: { taxonomy: TaxonomyFile }) {
  return (
    <div className="production-family-grid">
      {taxonomy.families.map((family) => (
        <article key={family.id} className="production-card family-card-pro">
          <div className="production-card-head">
            <div>
              <span className="production-card-kicker">{family.group}</span>
              <h4>{family.label}</h4>
            </div>
            <span className="chip-small">{family.realized_assets.length} realized</span>
          </div>
          <p className="production-card-copy">{family.runtimeUse.join(' | ')}</p>
          <div className="production-chip-row">
            {family.roles.map((role) => <span key={role} className="chip-small">{role}</span>)}
          </div>
          <div className="production-chip-row">
            {family.kinds.map((kind) => <span key={kind} className="chip-small">{kind}</span>)}
          </div>
          <div className="production-path-block">
            <span className="muted">Folder pattern</span>
            <strong>{family.folderPattern}</strong>
          </div>
          <div className="production-list">
            {family.realized_assets.map((asset) => (
              <div key={asset.id} className="production-list-item">
                <strong>{asset.title}</strong>
                <span className="muted">{asset.role} | {asset.kind}</span>
              </div>
            ))}
            {family.realized_assets.length === 0 ? <p className="muted">No realized asset yet.</p> : null}
          </div>
        </article>
      ))}
    </div>
  );
}
