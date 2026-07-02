import type { WorkspaceOverview } from '../../../api/client.js';

export function WorkspaceStats({ overview }: { overview: WorkspaceOverview }) {
  return (
    <div className="workspace-stat-strip">
      <article className="stat-tile">
        <span className="stat-label">Files</span>
        <strong className="stat-value">{overview.stats.files}</strong>
      </article>
      <article className="stat-tile">
        <span className="stat-label">Directories</span>
        <strong className="stat-value">{overview.stats.directories}</strong>
      </article>
      <article className="stat-tile">
        <span className="stat-label">Images</span>
        <strong className="stat-value">{overview.stats.images}</strong>
      </article>
      <article className="stat-tile">
        <span className="stat-label">JSON</span>
        <strong className="stat-value">{overview.stats.json}</strong>
      </article>
      <article className="stat-tile">
        <span className="stat-label">Markdown</span>
        <strong className="stat-value">{overview.stats.markdown}</strong>
      </article>
      <article className="stat-tile">
        <span className="stat-label">Root</span>
        <strong className="stat-value workspace-root-value">{overview.root_path}</strong>
      </article>
    </div>
  );
}
