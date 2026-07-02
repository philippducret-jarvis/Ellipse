import type { GameProjectSnapshot } from '@ellipse/shared';
import type { WorkspaceOverview } from '../../../api/client.js';
import { ActionLink } from '../../../ui/ActionButton.js';

export function WorkspaceHero({ snap, overview }: { snap: GameProjectSnapshot; overview: WorkspaceOverview | null }) {
  const slug = snap.project.slug;

  return (
    <section className="workspace-hero">
      <div className="workspace-hero-copy">
        <p className="workspace-kicker">Mémoire projet</p>
        <h2>Navigateur de fichiers</h2>
        <p className="muted">
          Documents, prompts, manifests, aperçus, layouts et sorties techniques de
          <strong> {snap.project.title}</strong> — tout est consultable ici.
        </p>
      </div>
      <div className="workspace-hero-actions es-command-bar-links">
        {overview?.highlights.preview_url ? (
          <ActionLink
            label="Aperçu jouable"
            hint="Ouvre la preview HTML5 du jeu"
            href={overview.highlights.preview_url}
            external
          />
        ) : null}
        <ActionLink
          label="Production HQ"
          hint="Cockpit work orders et routing ML"
          href={`/workspaces/${slug}/07_exports/web/production-hq.html`}
          external
        />
        {overview?.highlights.workspace_manifest_url ? (
          <ActionLink
            label="Manifest workspace"
            hint="État et chemins du workspace disque"
            href={overview.highlights.workspace_manifest_url}
            external
          />
        ) : null}
      </div>
    </section>
  );
}
