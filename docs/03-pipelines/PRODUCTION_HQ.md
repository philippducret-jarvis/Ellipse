# Production HQ

La couche `Production HQ` structure le projet autour de trois vues complementaires :

- `asset-taxonomy.json` pour separer les familles d'assets et leurs usages runtime
- `model-routing.json` pour declarer les bons outils et modeles selon le type d'asset
- `agent-work-orders.json` pour suivre les chaines de travail asset par asset

## Sorties generees

- `workspaces/echoes-of-the-mushroom-realm/07_exports/web/production-hq.html`
- `workspaces/echoes-of-the-mushroom-realm/08_ops/manifests/production-hq.json`
- `workspaces/echoes-of-the-mushroom-realm/03_assets/registry/asset-taxonomy.json`
- `workspaces/echoes-of-the-mushroom-realm/03_assets/registry/model-routing.json`
- `workspaces/echoes-of-the-mushroom-realm/08_ops/manifests/agent-work-orders.json`

## Objectif

Eviter un pipeline monolithique. Chaque famille d'asset a :

- un dossier cible dedie
- une route de generation propre
- une execution locale ou distante explicite
- des sorties attendues connues
- des agents assignes
- des gates qualite lisibles

## Commande

```bash
corepack pnpm run echoes:production-hq
```
