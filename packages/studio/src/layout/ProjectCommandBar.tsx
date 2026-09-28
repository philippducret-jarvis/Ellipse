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
        {snap.project.slug === 'shadow-echoes' ? (
          <ActionLink
            label="Campagne tactique — quatre rangs"
            hint="Combats, déplacement et compétences selon la position"
            href={`${base}/07_exports/web/tactics.html`}
            external
          />
        ) : null}
        {snap.project.slug === 'shadow-echoes' ? (
          <ActionLink
            label="Séraphine V3 — revue 3D"
            hint="Comparer la cible au visage et au corset UV/PBR en mouvement"
            href={`${base}/07_exports/web/asset-lab.html?hero=seraphine&model=surface`}
            external
          />
        ) : null}
        {snap.project.slug === 'shadow-echoes' ? (
          <ActionLink
            label="Entrer dans la Citadelle — lot 2"
            hint="Hub, dix activités, quatre Mythiques, invocations, reliques et progression"
            href={`${base}/07_exports/web/citadel.html`}
            external
          />
        ) : null}
        {snap.project.slug === 'shadow-echoes' ? (
          <ActionLink
            label="Calques de Séraphine — lot 04"
            hint="Corps reconstruit, bras et épée indépendants : assemblage en revue"
            href={`${base}/07_exports/web/layers.html`}
            external
          />
        ) : null}
        {snap.project.slug === 'shadow-echoes' ? (
          <ActionLink
            label="Atelier du mouvement — lot 03"
            hint="Rigs des quatre Mythiques : ralentir, comparer et inspecter les articulations"
            href={`${base}/07_exports/web/motion.html`}
            external
          />
        ) : null}
        {snap.project.slug === 'shadow-echoes' ? (
          <ActionLink
            label="Jouer l’Épreuve des Échos — lot 02"
            hint="Les quatre Mythiques dans une épreuve de combat en trois phases"
            href={`${base}/07_exports/web/play.html`}
            external
          />
        ) : null}
        {snap.project.slug === 'shadow-echoes' ? (
          <ActionLink
            label="Atelier des mythiques — lot 01"
            hint="Séraphine, Nyxara, Lysael et Voren : bases HD, comparaison aux références et banc de compétences"
            href={`${base}/07_exports/web/heroes.html`}
            external
          />
        ) : null}
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
