# Ellipse Studio UI v2 — Spécification produit professionnelle

> Objectif : passer d'un prototype développeur à une **console de production jeu** niveau Figma/Unity Hub.

---

## Diagnostic v1 (état actuel)

| Problème | Impact |
|----------|--------|
| CSS monolithique 3500+ lignes | Maintenance impossible, incohérences visuelles |
| Code legacy (`FactoryView`, `CreateView`) | Dette, store cassé |
| Tabs Zustand sans URL | Pas de deep links, pas de partage |
| Liens topbar = fichiers JSON bruts | Expérience non intégrée |
| AssetsTab déconnectée de `03_assets/` | Double vérité BDD vs disque |
| Emoji / ASCII / EN+FR mélangés | Perception amateur |
| ProductionTab = lecteur JSON | Pas de workflow actionnable |

---

## Vision v2 — App shell professionnel

```
┌─────────────────────────────────────────────────────────────────────┐
│  Topbar : breadcrumb · statut projet · actions · health · user        │
├──────────┬──────────────────────────────────────────────────────────┤
│          │  Sub-nav contextuelle (Assets | Scenes | Agents | …)    │
│  Nav     ├──────────────────────────────────────────────────────────┤
│  projets │                                                          │
│          │  Contenu principal                                       │
│  ─────── │                                                          │
│  Settings│  ┌─────────────────────┬──────────────────────────────┐  │
│          │  │  Liste / grille     │  Panneau détail (preview)    │  │
│          │  └─────────────────────┴──────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────────────────┘
```

### Principes UX

1. **Une action = un bouton** — jamais ouvrir un JSON brut pour l'utilisateur final
2. **Preview intégrée** — moteur Ellipse en iframe/panel, pas nouvel onglet
3. **Workflow par stage** — barre de progression 01→07 visible sur chaque asset
4. **Feedback temps réel** — WebSocket agents, toasts, skeleton loaders
5. **Français unifié** — i18n `fr` par défaut, clés `studio.*`

---

## Stack technique v2

| Couche | Choix | Raison |
|--------|-------|--------|
| Routing | React Router v7 | Deep links `/projects/:slug/assets/:id/stage/05_animation` |
| Design system | Tailwind CSS v4 + shadcn/ui | Composants pro, accessible, thème dark |
| Icons | Lucide React | Cohérence, pas d'emoji |
| État serveur | TanStack Query | Cache API, invalidation, polling |
| État UI | Zustand (minimal) | Modals, panneaux |
| Preview jeu | `@ellipse/engine` embed | Hot-reload GDL |
| Preview 3D | Three.js panel existant | Modèles glTF |

---

## Design tokens

```css
/* packages/studio/src/design/tokens.css */
--surface-base: #0d0d12;
--surface-raised: #16161f;
--surface-overlay: #1e1e2a;
--border-subtle: rgba(255,255,255,0.06);
--accent-primary: #e94560;
--accent-success: #2ecc71;
--accent-warning: #f39c12;
--text-primary: #f0f0f5;
--text-muted: #8888a0;
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 16px;
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

---

## Navigation restructurée

| Section | Route | Contenu |
|---------|-------|---------|
| Vue d'ensemble | `/projects/:slug` | KPIs, blockers, timeline agents |
| Assets | `/projects/:slug/assets` | Grille par **famille taxonomique** (11 familles) |
| Asset détail | `/projects/:slug/assets/:id` | Stages 01-07, preview, actions lancer stage |
| Scènes | `/projects/:slug/scenes` | Niveaux, hubs, cutscenes |
| Agents | `/projects/:slug/agents` | 15 runtime + 10 factory, statut live |
| Génération | `/projects/:slug/generate` | Prompt + upload → plan DAG |
| Preview | `/projects/:slug/play` | Moteur plein écran |
| Production | `/projects/:slug/production` | Work orders, routing modèles |
| Build | `/projects/:slug/build` | Exports HTML5, manifests |
| Documents | `/projects/:slug/docs` | GDD, pitch, art direction |

---

## AssetsTab v2 — connectée à la taxonomie

### Grille par famille (pas liste plate)

```
[Héros]  [PNJ & alliés]  [Ennemis]  [Boss]  [Armes]  [Props]  [Cartes]  [UI]  [Audio]  [FX]
   1           1              0          1        0        1        1       0      0      0
```

Chaque carte asset affiche :
- Miniature preview (stage 06_exports ou 01_source)
- Badge statut (`concept` → `approved`)
- Barre stages : ●●●○○○○ (3/7 complétés)
- Blockers QA (rouge si stage 07 échoué)
- Actions : « Lancer découpage », « Générer animations », « Valider QA »

### Panneau détail asset

- Onglets : Overview | Stages | Preview | GDL ref | Historique agents
- Timeline des TaskResult par stage
- Bouton « Dispatch agent » → choix stage + agent

---

## Composants à créer

```
packages/studio/src/
├── design/
│   ├── tokens.css
│   └── components/          # shadcn wrappers
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       ├── Tabs.tsx
│       ├── DataTable.tsx
│       ├── Progress.tsx
│       ├── EmptyState.tsx
│       └── Skeleton.tsx
├── routes/                  # React Router
│   └── project-routes.tsx
├── features/
│   ├── assets/
│   │   ├── AssetFamilyGrid.tsx
│   │   ├── AssetStagePipeline.tsx
│   │   └── AssetPreviewPanel.tsx
│   ├── agents/
│   │   └── AgentLiveBoard.tsx
│   └── preview/
│       └── EmbeddedGamePreview.tsx
└── styles/
    ├── layout.css
    ├── assets.css
    └── agents.css
```

---

## Migration plan (4 sprints)

### Sprint UI-1 (1 semaine)
- Installer Tailwind + shadcn + React Router
- Extraire tokens, supprimer classes dupliquées
- Purger `FactoryView`, `CreateView`, `Sidebar`, `PromptPanel`

### Sprint UI-2 (1 semaine)
- Routing URL + breadcrumbs
- App shell 3 zones
- AssetsTab v2 avec familles depuis `@ellipse/shared`

### Sprint UI-3 (1 semaine)
- AssetStagePipeline (barre 01-07, actions dispatch)
- Preview intégrée moteur
- Toasts + skeleton + empty states

### Sprint UI-4 (1 semaine)
- AgentLiveBoard WebSocket
- i18n fr complet
- Polish responsive + accessibilité WCAG AA

---

## Références design

- **Figma** — navigation projet, panneaux contextuels
- **Unity Hub** — gestion assets par type
- **Linear** — densité info, statuts, keyboard shortcuts
- **Vercel Dashboard** — dark mode, tokens, micro-interactions
