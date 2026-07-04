# Jarvis — assistant conversationnel du studio

> **Vrai dialogue, jamais de réponses pré-faites.** Un modèle de langage
> répond en langage naturel ET agit réellement sur le studio via des outils.

```
pnpm forge:chat                       # REPL en terminal (immédiat)
pnpm forge:chat -- "quels jeux ?"     # un seul tour
pnpm forge:assistant                  # service HTTP :4310 (consommé par le Studio)
```

Dans le Studio : bouton flottant 🤖 en bas à droite.

## Cerveau (tools/lib/forge/brain/providers.mjs)

Chaîne de providers, bascule automatique — **aucune clé requise par défaut** :

| Cerveau | Coût | Quand |
|---|---|---|
| `anthropic` (si `ANTHROPIC_API_KEY`) | ~ | le plus capable |
| `ollama` (si local) | gratuit | souverain, hors-ligne |
| `pollinations` (défaut) | **gratuit, keyless** | immédiat, sans GPU |

Forcer : `FORGE_BRAIN=pollinations|ollama|anthropic`. Les trois parlent le
**tool-calling natif** (format OpenAI ; traduit pour Anthropic) — bien plus
fiable qu'un protocole texte. La pub du palier gratuit Pollinations est
retirée automatiquement.

## Outils réels (tools/lib/forge/brain/tools.mjs)

Jarvis n'invente rien — il consulte et agit :

- `list_games` — les jeux forgés (titre, genre, niveaux)
- `game_status` — héros, stats, niveaux, boss, reliques, dernier auto-play,
  historique des modifications d'un jeu
- `iterate_game` — **modifie un jeu** par instruction naturelle puis
  re-valide toute la campagne à l'auto-play (un patch cassant est refusé)
- `list_connections` — état des connexions externes

Ajouter un outil = une entrée dans `TOOLS` (name, description, args, run).
Les specs OpenAI en sont dérivées automatiquement.

## Boucle (tools/lib/forge/brain/agent.mjs)

`jarvisTurn(history)` : le modèle choisit d'appeler des outils, on les exécute
réellement, on lui rend l'observation, il enchaîne ou répond en clair. Retour :
`{ reply, actions, brain, history }` — `actions` liste ce qui a VRAIMENT été
fait (traçabilité).

## Surface

Studio (:4273) → proxy `/api` → orchestrateur (:4400) `/api/assistant` → relais
→ service Jarvis (:4310) → cerveau. `Ellipse.cmd` lance les trois.
Smoke CI hors-ligne : `pnpm forge:brain-smoke`.
