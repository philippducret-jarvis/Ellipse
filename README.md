# Ellipse — Moteur de génération de jeux vidéo par IA

> **Créez des jeux 2D/3D haute définition sans écrire une ligne de code.**

Ellipse est un moteur de nouvelle génération où une **IA maîtresse** orchestre des **sous-IA autonomes**, chacune experte dans son domaine, pour transformer vos idées — et vos photos — en jeux vidéo complets et jouables.

---

## Vision

| Aujourd'hui | Avec Ellipse |
|-------------|--------------|
| Modéliser, texturer, animer, coder, tester… | Décrire ou montrer ce que vous voulez |
| Semaines de travail spécialisé | Génération itérative en minutes |
| Compétences techniques multiples | Interface conversationnelle + visuelle |

**Ambition :** devenir le **Figma du jeu vidéo** — un outil où la créativité prime sur la technique.

---

## Principes fondateurs

1. **Zero-code** — Aucun script requis ; l'utilisateur dialogue, glisse-dépose, et valide.
2. **Photo-to-Game** — Une photo devient texture, sprite, modèle 3D, référence de style ou blueprint de niveau.
3. **Agents spécialisés** — Chaque domaine a son **sous-agent Ellipse enregistré**, piloté par **Ellipse Cortex** (IA native).
4. **Itération naturelle** — « Rends le personnage plus rapide », « Change l'ambiance en cyberpunk ».
5. **Haute définition** — Sortie 2D vectorielle/raster HD et 3D PBR prête pour le rendu temps réel.
6. **Transparence** — L'utilisateur voit ce que chaque agent fait et peut intervenir à tout moment.
7. **Infra distribuée** — Pas de monolithe : services indépendants, bus async, scaling professionnel ([ORDRE-006](docs/04-roadmap/CONSTRUCTION_ORDERS.md)).

---

## Architecture en bref

```
Utilisateur (texte + photos + voix)
        │
        ▼
┌───────────────────┐
│   IA Maîtresse    │  ← Ellipse Cortex : intent, plan, délégation, assemble
│   (Orchestrateur) │
└─────────┬─────────┘
          │ délégation par tâches
    ┌─────┴─────┬─────────┬──────────┬─────────┐
    ▼           ▼         ▼          ▼         ▼
 Asset      Animation  Level     Gameplay   Audio
 Agent       Agent     Agent      Agent     Agent
    │           │         │          │         │
    └───────────┴─────────┴──────────┴─────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Moteur Ellipse       │
              │  (Runtime 2D / 3D)    │
              └───────────────────────┘
```

---

## Structure du dépôt

```
Projet Ellipse/
├── docs/                    # Documentation complète du projet
│   ├── 01-vision/           # Vision, personas, cas d'usage
│   ├── 02-architecture/     # Architecture technique & agents
│   ├── 03-pipelines/        # Pipelines photo→jeu, génération HD
│   ├── 04-roadmap/          # Phases, jalons, métriques
│   └── 05-guides/           # Guides développeur & contributeur
├── packages/
│   ├── cortex/              # IA native Ellipse (Cortex Maîtresse + modèles)
│   ├── orchestrator/        # Bus sessions, API — consomme Cortex
│   ├── agents/              # Sous-IA autonomes par domaine
│   ├── engine/              # Runtime de jeu 2D/3D
│   ├── pipeline/            # Pipelines de génération d'assets
│   ├── studio/              # Interface no-code (éditeur visuel)
│   └── shared/              # Types, schémas, utilitaires communs
├── infra/                   # Infra pro — catalogue services, Docker, compose
│   ├── services/            # SERVICE_CATALOG.yaml
│   └── compose/             # docker-compose multi-services
├── schemas/                 # JSON Schema des contrats inter-agents
├── examples/                # Projets de démonstration
└── tools/                   # Scripts CLI & outils de dev
```

---

## Démarrage rapide (développeurs)

> Le socle est en cours de construction. Voir [docs/04-roadmap/PHASES.md](docs/04-roadmap/PHASES.md) pour la feuille de route.

```bash
# À venir — Phase 1
npm install
npm run dev:studio      # Interface Ellipse Studio
npm run dev:orchestrator
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [**Ordres de construction**](docs/04-roadmap/CONSTRUCTION_ORDERS.md) | **Règles normatives — IA Ellipse + infra distribuée** |
| [Infrastructure distribuée](docs/02-architecture/INFRASTRUCTURE.md) | Services, bus, anti-patterns monolithe |
| [Vision détaillée](docs/01-vision/VISION.md) | Mission, différenciation, personas |
| [Ellipse Cortex (IA native)](docs/02-architecture/ELLIPSE_AI.md) | Modèles propriétaires, pas de LLM tiers |
| [Architecture système](docs/02-architecture/SYSTEM.md) | Composants, flux de données, sécurité |
| [Système multi-agents](docs/02-architecture/AGENTS.md) | Cortex + sous-agents enregistrés |
| [Pipeline Photo-to-Game](docs/03-pipelines/PHOTO_TO_GAME.md) | De la photo au jeu jouable |
| [Stack technique](docs/02-architecture/STACK.md) | Technologies retenues |
| [**Roadmap ambitieuse 2026**](docs/04-roadmap/ROADMAP_AMBITIEUSE_2026.md) | **Plan détaillé anti-monolithe, UI pro, agents production** |
| [Taxonomie assets](docs/02-architecture/ASSET_TAXONOMY.md) | 11 familles, 32 rôles, pipeline 8 stages |
| [Studio UI v2](docs/02-architecture/STUDIO_UI_V2.md) | Spec interface professionnelle |
| [Pipeline agents production](docs/03-pipelines/AGENT_PRODUCTION_PIPELINE.md) | Découpage, rig, mouvements |

---

## Licence

Projet privé — Projet Ellipse © 2026
