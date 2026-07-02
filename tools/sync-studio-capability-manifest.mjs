#!/usr/bin/env node
/**
 * Synchronise le registre capacités Studio + moteurs évolution vers le workspace projet
 * et génère le manifest agent-readable.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const root = process.cwd();

async function main() {
  try {
    execSync('npx --yes pnpm --filter @ellipse/shared build && npx --yes pnpm --filter @ellipse/pipeline build', {
      cwd: root,
      stdio: 'inherit',
      shell: true,
    });
  } catch {
    console.warn('⚠ Build packages échoué — tentative avec dist existant');
  }

  const shared = await import(pathToFileURL(join(root, 'packages/shared/dist/index.js')).href);
  const pipeline = await import(pathToFileURL(join(root, 'packages/pipeline/dist/index.js')).href).catch(() => ({}));

  const summary = shared.summarizeGapRegistry?.() ?? { note: 'build shared first: pnpm --filter @ellipse/shared build' };
  const gaps = shared.STUDIO_CAPABILITY_GAPS ?? [];
  const engines = shared.EVOLUTION_ENGINES ?? [];

  const manifest = {
    generated_at: new Date().toISOString(),
    purpose: 'Registre capacités Ellipse — ce qui manque pour éditeur next-gen. Lu par agents MasterAI.',
    summary,
    evolution_engines: engines,
    capability_gaps: gaps,
    shipping_pipeline: pipeline.SHIPPING_ASSET_PIPELINE ?? [],
    fidelity_thresholds: pipeline.DEFAULT_FIDELITY_THRESHOLDS ?? {},
    agent_playbook: {
      rule_1: 'Ne jamais shipper un crop board ou une silhouette vectorielle seule comme asset final.',
      rule_2: 'Toujours passer par 07_qa pixel-diff ; viser IoU shipping ≥ 0.72.',
      rule_3: 'Hybrid planche + accents = minimum acceptable si procédural échoue.',
      rule_4: 'Runtime doit consommer runtime_atlas.json — pas rectangles Graphics.',
      rule_5: 'Systèmes GDL déclarés doivent exister dans @ellipse/engine ou bridge explicite.',
    },
    phases: [
      { id: 'T0', name: 'Fidélité assets', weeks: '4-8', p0: ['asset.concept_to_hd', 'animation.rig_runtime', 'qa.blocking_gates'] },
      { id: 'T1', name: 'Monde & gameplay engine', weeks: '6-10', p0: ['world.tilemaps', 'gameplay.systems_catalog', 'audio.gdl_playback'] },
      { id: 'T2', name: 'Studio actionnable', weeks: '4-6', p1: ['studio.production_actions', 'studio.scene_visual_editor'] },
      { id: 'T3', name: 'Intelligence & scale', weeks: '8+', p2: ['agents.project_knowledge', 'observability.real_kpis', 'runtime.multi_platform_export'] },
    ],
  };

  const opsDir = join(root, 'workspaces', 'veloria-veille-des-lames', '08_ops', 'manifests');
  const docsDir = join(root, 'docs', '04-roadmap');
  await mkdir(opsDir, { recursive: true });
  await mkdir(docsDir, { recursive: true });

  await writeFile(join(opsDir, 'studio-capability-gap-registry.json'), JSON.stringify(manifest, null, 2));
  console.log('✓', join(opsDir, 'studio-capability-gap-registry.json'));

  const md = `# Ellipse — Analyse des gaps Studio Next-Gen

> Généré : ${manifest.generated_at}
> Maturité moyenne capacités : **${summary.average_maturity_pct ?? '?'}%**

## Diagnostic Veloria (constat utilisateur)

Les livrables actuels sont **majoritairement vectorisés procéduralement** ou **hybrid planche basse fidélité** (IoU ~0.40–0.50). Les planches concept restent la **source d'intention**, pas des assets shipping. C'est une **maquette de pipeline**, pas un jeu visuellement fidèle.

## 8 moteurs à construire

${engines.map((e) => `### ${e.title} (\`${e.id}\`)\n- Statut : **${e.status}**\n- ${e.description}\n- Manque : ${(e.missing ?? []).join(' ; ')}`).join('\n\n')}

## Capacités P0 (${gaps.filter((g) => g.priority === 'P0').length})

${gaps.filter((g) => g.priority === 'P0').map((g) => `- **${g.title}** (${g.maturity_pct}%) — ${g.problem}`).join('\n')}

## Phases recommandées

| Phase | Focus | Durée |
|-------|-------|-------|
| T0 | Fidélité assets + rig + QA bloquant | 4-8 sem |
| T1 | Tilemaps + systèmes engine + audio GDL | 6-10 sem |
| T2 | Studio actionnable + éditeurs visuels | 4-6 sem |
| T3 | RAG + observabilité + export multi-plateforme | 8+ sem |

Voir \`packages/shared/src/studio/capability-gap-registry.ts\` pour le registre source.
`;

  await writeFile(join(docsDir, 'GAP_ANALYSIS_STUDIO_NEXT_GEN.md'), md);
  console.log('✓', join(docsDir, 'GAP_ANALYSIS_STUDIO_NEXT_GEN.md'));
  console.log('\nMaturité moyenne:', summary.average_maturity_pct + '%');
  console.log('P0 gaps:', summary.p0_count);
}

main().catch((e) => {
  console.error('Build @ellipse/shared et @ellipse/pipeline d abord, puis relancer.');
  console.error(e);
  process.exit(1);
});
