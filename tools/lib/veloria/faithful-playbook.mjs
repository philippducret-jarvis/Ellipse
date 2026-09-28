/** Playbook courant du flagship Veloria, genere avec chaque build HD. */
export function buildFaithfulHdPlaybook() {
  return `# Veloria — Playbook du flagship HD 2,5D

> Ce document décrit uniquement le runtime Pixi spécialisé actuellement livré.
> Les anciens runtimes Forge, Canvas, gacha et méta sont historiques et interdits
> dans l'export flagship.

## Contrat visuel

- Les planches sont l'unique source d'art : aucun personnage ni décor alternatif n'est inventé.
- Les six arènes proviennent des vignettes « PLAN 3 LANES » des planches environnement.
- Les personnages, ennemis et boss proviennent de crops déterministes des planches gameplay.
- Le redimensionnement utilise Lanczos et un sharpen léger ; pas de décor vectoriel ni d'overlay.
- La résolution canonique est 720 × 1280, portrait, dimension 2.5D.

## Chaîne reproductible

1. \`faithful-hd.mjs\` extrait les crops et génère les PNG.
2. \`gdl-assembler.mjs\` produit six scènes, trois lanes et douze vagues par scène.
3. \`VeloriaEngine\` et \`veloria-survival.ts\` exécutent la simulation déterministe.
4. \`preview.js\` est l'unique point d'entrée et charge le bundle \`engine/ellipse-engine.js\`.
5. \`verify-veloria-hd.mjs\` bloque l'export si un ancien runtime, un asset intégré
   ou un contrat de résolution/scènes/lanes/vagues réapparaît.

Commande de reconstruction :

    pnpm veloria:hd

Commande de vérification :

    pnpm veloria:verify-hd

Commande de jeu local :

    pnpm veloria:serve

## Runtime et gameplay

- FSM : hub → invocation → combat ↔ bénédiction → victoire ou défaite.
- Déplacement discret sur trois lanes, clavier et tactile.
- Auto-attaque, trois compétences, ultime, cooldowns, combo, garde et dash.
- Douze vagues, six arènes, hazards télégraphiés, boss en trois phases.
- Six bénédictions produisent de vrais effets dans la simulation.
- Le seed, les drafts et les hazards sont déterministes et testables.

## Fichiers interdits dans le flagship

- \`forge-runtime.js\`
- \`gacha-renderer.js\`
- \`veloria-systems.js\`
- \`veloria-meta.js\`
- \`meta-screens.js\`
- tout \`05_runtime/index.html\` ou \`05_runtime/game.gdl.json\` alternatif

Le build nettoie ces entrées et archive les anciens rapports. Il ne faut jamais les
réintroduire comme fallback : une erreur doit rester visible et être corrigée dans
le runtime spécialisé.

## Statut de qualité

Le gate statique 7/7 vérifie les fichiers servis, le bundle, le GDL, les fonds HD,
les sprites et l'absence de runtime concurrent. Il ne remplace pas les trois gates
humains encore requis avant une déclaration commerciale :

1. golden screenshots composées dans un navigateur réel ;
2. revue côte à côte par la direction artistique ;
3. validation tactile et performance sur appareils cibles.
`;
}
