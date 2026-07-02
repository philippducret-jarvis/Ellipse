import type { GameProjectSnapshot } from '@ellipse/shared';
import { PROJECT_QUICK_ACTIONS } from '../i18n/fr.js';
import { ActionButton, ActionLink } from '../ui/ActionButton.js';
import { useStudioStore, type WorkspaceTab } from '../store/studio-store.js';

interface Props {
  snap: GameProjectSnapshot;
  onPreview?: () => void;
}

export function ProjectCommandBar({ snap, onPreview }: Props) {
  const setTab = useStudioStore((s) => s.setWorkspaceTab);
  const setWizardOpen = useStudioStore((s) => s.setWizardOpen);
  const base = `/workspaces/${snap.project.slug}`;

  return (
    <section className="es-command-bar" aria-label="Actions de construction">
      <div className="es-command-bar-head">
        <span className="es-command-bar-title">Actions rapides — chaîne image → jeu</span>
        <span className="es-command-bar-sub">Étapes 1→5 : détourage, rig, QA, scène, export</span>
      </div>
      <div className="es-command-bar-grid">
        {PROJECT_QUICK_ACTIONS.map((action) => (
          <ActionButton
            key={action.id}
            label={action.label}
            hint={action.hint}
            variant={action.variant ?? 'secondary'}
            onClick={() => action.tab && setTab(action.tab as WorkspaceTab)}
          />
        ))}
        <ActionButton
          label="Jouer la preview"
          hint="Ouvre le jeu dans le navigateur — valide le GDL et les assets"
          variant="primary"
          onClick={onPreview}
        />
        <ActionButton
          label="Assistant création"
          hint="Wizard guidé : genre, mécaniques, cast et premier pipeline"
          variant="ghost"
          onClick={() => setWizardOpen(true)}
        />
      </div>
      <div className="es-command-bar-links">
        <ActionLink
          label="GDL runtime"
          hint="Définition déclarative du jeu — entités, scènes, systèmes"
          href={`${base}/05_runtime/gdl/echoes.preview.gdl.json`}
          external
        />
        <ActionLink
          label="Manifest ops"
          hint="État workspace, manifests et contexte orchestration"
          href={`${base}/08_ops/manifests/echoes-workspace.json`}
          external
        />
        <ActionLink
          label="Carte construction"
          hint="Graphe des systèmes et dépendances de production"
          href={`${base}/07_exports/web/construction-map.html`}
          external
        />
      </div>
    </section>
  );
}
