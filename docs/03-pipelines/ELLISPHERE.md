# Ellisphere — intelligence de production du studio

Ellisphere est l’assistante conversationnelle intégrée à Ellipse Studio. Elle utilise un vrai modèle de langage et des outils bornés qui lisent l’état réel des workspaces.

## Démarrage

```bash
pnpm forge:assistant
```

Le service écoute par défaut sur `http://localhost:4310`. L’orchestrateur relaie `/api/assistant` afin que le Studio conserve une origine unique.

Le lanceur `Ellipse.cmd` démarre l’orchestrateur, Ellisphere et le Studio dans des processus cachés, avec leurs journaux sous `generated/logs/`.

## Cerveaux

La sélection se fait par disponibilité : fournisseur configuré, modèle local Ollama, puis fournisseur keyless. `/health` expose le cerveau effectivement choisi ; l’interface ne prétend pas être en ligne quand aucun modèle n’est joignable.

## Outils réels

Ellisphere ne devine pas l’état du projet. Elle peut notamment :

- découvrir les GDL modernes via `workspace.json` et `05_runtime/gdl/`, avec compatibilité des anciens jeux Forge ;
- détailler runtime, scènes, systèmes, acteurs et URL de preview ;
- lire les rapports QA sans confondre `playable_hd` et `commercial_ready` ;
- lire les manifestes de capacités, de formation et de handoff des agents ;
- itérer un jeu Forge générique avec auto-validation ;
- refuser toute réécriture générique d’Orbes d’Astra, Veloria ou Echoes, puis indiquer le pipeline spécialisé.

Le point d’entrée est `ellisphereTurn(history)`. Le modèle peut enchaîner jusqu’à sept observations/actions avant de produire une réponse en clair.

## Validation hors réseau

```bash
pnpm forge:brain-smoke
```

Ce smoke vérifie les schémas d’outils, la découverte des jeux modernes, les rapports qualité, les erreurs propres et la protection des trois runtimes spécialisés, sans appeler de LLM.
