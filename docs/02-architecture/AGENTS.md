# Système multi-agents Ellipse

## Philosophie

L'**IA Maîtresse** ne fait pas tout : elle **comprend**, **planifie**, **délègue** et **assemble**. Chaque **sous-IA** est une experte verticale avec :
- Un périmètre strict (single responsibility)
- Des **outils deterministes locaux** (segmentation, mesh bake, ffmpeg)
- Un **modèle Ellipse** référencé dans `cortex/models/manifest.json`
- Un format de sortie contractuel (JSON Schema)
- Une autonomie locale (peut sous-planifier ses étapes)

Inspirations : AutoGPT, CrewAI, Devin (délégation), mais **orienté production de jeux**.

---

## IA Maîtresse (Orchestrator)

### Responsabilités
| Fonction | Description |
|----------|-------------|
| Dialogue utilisateur | Ton créatif, clarifications minimales |
| Planification | DAG de tâches avec dépendances |
| Routing | Choix de l'agent selon TaskSpec |
| Fusion | Résolution conflits entre agents (ex: scale incohérent) |
| Qualité | Déclenche QA Agent avant preview |
| Mémoire | Style guide, préférences, historique du projet |

### Modèle Ellipse (Cortex)

- **Maîtresse :** module `CortexMaster` dans `@ellipse/cortex` — modèle `ellipse-cortex-master-v0`
- **Sous-agents :** chaque agent charge son modèle via `manifest.json` (weights locaux)
- **Phase 1 :** modules intent/plan (règles) → remplacés par weights entraînés Ellipse en Phase 2

> ❌ Aucun Claude, GPT, Gemini ou API LLM tierce. Voir [ORDRE-001](../04-roadmap/CONSTRUCTION_ORDERS.md).

### Comportement Maîtresse
```
CortexMaster ne génère pas d'assets directement.
Elle produit un plan JSON { tasks: TaskSpec[] } et délègue aux agents enregistrés.
Elle maintient la cohérence du Game Design Document implicite du projet.
```

---

## Catalogue des sous-IA (15 agents spécialisés)

> **Un agent = un métier.** Catalogue normatif : `packages/shared/src/agents/catalog.ts`

| ID | Nom | Mission |
|----|-----|---------|
| `character` | Le Héros | Sprites personnage, photo→spritesheet |
| `decor` | Le Décorateur | Tilesets, props, arrière-plans |
| `animation` | Le Mouvement | Animations idle/walk/run/jump |
| `level` | L'Architecte | Layout, collisions, spawns |
| `mesh_3d` | Le Sculpteur | Modèles 3D glTF |
| `lighting` | L'Éclairagiste | Éclairage scènes 3D |
| `camera` | Le Cadreur | Caméra follow, cinématiques |
| `gameplay` | Le Game Designer | Mécaniques GDL |
| `narrative` | Le Conteur | Histoire, dialogues, quêtes |
| `music` | Le Musicien | BGM adaptive |
| `sfx` | L'Effeteur | Effets sonores gameplay |
| `ui` | L'Interface | HUD, menus |
| `vfx` | L'Illusionniste | Particules, juice |
| `qa` | Le Testeur | Validation, smoke test |
| `integration` | L'Assembleur | Export final |

---

### Détail par agent (extraits)

### 1. Character Agent — « Le Héros »

**Mission :** Sprite joueur depuis photo ou procédural.

### 2. Decor Agent — « Le Décorateur »
**Mission :** Environnements visuels 2D — tilesets, props, parallax.

---

### 3. Animation Agent — « Le Mouvement »
**Mission :** Donner vie aux entités.

| Entrée | Sortie |
|--------|--------|
| Sprites / meshes riggables | Animations : idle, walk, run, jump, attack… |
| Style mouvement (prompt) | State machine animation + événements |

**Outils :**
- Sprite animation (interpolation, rotoscoping IA)
- Rigging auto (AccuRig, Mixamo API)
- Motion synthesis (MDM, future)
- Retargeting skeletal

**Cas photo :** Pose estimation → keyframes → loop walk cycle

---

### 4. Level Agent — « L'Architecte »
**Mission :** Espaces jouables cohérents.

| Entrée | Sortie |
|--------|--------|
| Photos décor, prompt ambiance | Tilemaps, meshes environnement, lighting |
| Gameplay genre | Collision layers, spawn points, checkpoints |

**Outils :**
- Génération procédurale (WFC, Perlin)
- Photo → depth → mesh simplifié
- Parallax layers 2D
- Navmesh bake (3D)

---

### 5. Gameplay Agent — « Le Game Designer »
**Mission :** Règles, interactions, fun.

| Entrée | Sortie |
|--------|--------|
| Genre, mécaniques demandées | Patches GDL : components, systems, triggers |
| Entités existantes | Comportements IA ennemis, scoring, win/lose |

**Bibliothèque de templates :**
- Platformer, top-down RPG, puzzle, endless runner
- Point & click, visual novel (Phase 2+)
- Third-person action (Phase 4+)

**Ne génère pas de code arbitraire** — uniquement GDL validé par schema.

---

### 6. Narrative Agent — « Le Conteur »
**Mission :** Histoire, dialogues, quêtes, branching.

### 7. Music Agent — « Le Musicien »
**Mission :** BGM loops adaptive.

### 8. SFX Agent — « L'Effeteur »
**Mission :** Effets sonores gameplay (jump, hit, collect).

### 9. UI Agent — « L'Interface »
**Mission :** HUD, menus, typographie cohérente.

| Entrée | Sortie |
|--------|--------|
| Style visuel projet | Layouts UI GDL, boutons, barres vie |
| Langue | i18n keys |

---

### 10. VFX Agent — « L'Illusionniste »
**Mission :** Particules, juice, feedback visuel.

### 11. Mesh 3D Agent — « Le Sculpteur »
**Mission :** Modèles 3D, photo→mesh.

### 12. Lighting Agent — « L'Éclairagiste »
**Mission :** Éclairage scènes 3D.

### 13. Camera Agent — « Le Cadreur »
**Mission :** Caméra follow, cinématiques.

### 14. QA Agent — « Le Testeur »
**Mission :** Valider avant preview utilisateur.

**Checks automatiques :**
- GDL schema valid
- Assets manquants / broken refs
- Player spawn accessible
- Performance budget (poly count, draw calls)
- Playability smoke test (bot simule 30s)

**Sortie :** Rapport + suggestions correctives → relance agents concernés

---

### 15. Integration Agent — « L'Assembleur »
**Mission :** Builds finaux, export multi-plateforme, cohérence refs.

---

## Communication agent ↔ maîtresse

### TaskSpec (assignation)
```json
{
  "task_id": "uuid",
  "agent": "character",
  "priority": 1,
  "depends_on": [],
  "input": {
    "source_images": ["uploads/photo_001.jpg"],
    "target": "character_sprite",
    "constraints": {
      "dimension": "2d",
      "resolution": 512,
      "style_match": "ref_001.png"
    }
  },
  "context": {
    "project_id": "...",
    "gdd_excerpt": "Platformer rétro, chat ninja"
  }
}
```

### TaskResult (retour)
```json
{
  "task_id": "uuid",
  "status": "success",
  "artifacts": [
    { "type": "sprite_sheet", "path": "assets/player_sheet.png", "meta": {} }
  ],
  "gdl_patches": [
    { "op": "add", "path": "/entities/-", "value": { "id": "player", ... } }
  ],
  "agent_notes": "Personnage détecté : félin. 4 frames walk générées."
}
```

---

## Résolution de conflits

| Conflit | Résolution maîtresse |
|---------|---------------------|
| Scale joueur vs tiles | Normaliser via Level Agent (ref tile size) |
| Style incohérent ennemi | Re-run Asset Agent avec style guide renforcé |
| Mécanique incompatible genre | Proposer alternative à l'utilisateur |
| QA fail critique | Re-plan partiel, informer utilisateur si delay |

---

## Autonomie vs contrôle utilisateur

| Mode | Comportement |
|------|--------------|
| **Auto** (défaut) | Agents enchaînent sans validation intermédiaire |
| **Guidé** | Pause après assets clés pour approbation |
| **Expert** | Accès timeline agent par agent, re-run individuel |

---

## Évolution : agents futurs

- **Multiplayer Agent** — netcode, matchmaking basique
- **Localization Agent** — traduction bulk
- **Monetization Agent** — IAP templates (optionnel)
