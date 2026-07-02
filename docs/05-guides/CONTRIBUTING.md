# Guide contributeur

## Convention de branches

- `main` — stable, releases
- `develop` — intégration
- `feature/ellipse-XXX-description` — features
- `fix/ellipse-XXX-description` — corrections

## Commits

Format [Conventional Commits](https://www.conventionalcommits.org/) :

```
feat(orchestrator): add task planner DAG validation
fix(engine): collision layer parsing
docs(agents): document audio agent tools
```

## Pull requests

1. Une feature = une PR focalisée
2. Tests passent (`pnpm test`)
3. Lint pass (`pnpm lint`)
4. Mise à jour doc si changement architecture / API publique

## Packages

| Package | Responsabilité |
|---------|----------------|
| `@ellipse/shared` | Types, schemas Zod |
| `@ellipse/orchestrator` | IA maîtresse |
| `@ellipse/agents` | Sous-IA |
| `@ellipse/engine` | Runtime jeu |
| `@ellipse/pipeline` | Workers assets |
| `@ellipse/studio` | UI |

Dépendances : packages internes via `workspace:*`.

## Tests

- **Unit :** Vitest, fichiers `*.test.ts` colocalisés
- **Integration :** `packages/orchestrator/tests/`
- **E2E :** Phase 2+ Playwright sur studio

## Documentation

Toute modification des contrats inter-agents (`schemas/`) doit mettre à jour :
- JSON Schema source
- Types Zod dans `@ellipse/shared`
- `docs/02-architecture/AGENTS.md` si comportement agent change

Tout nouveau **service déployable** doit être ajouté à `infra/services/SERVICE_CATALOG.yaml` (ORDRE-006).
