# Ellipse Desktop

Application Windows pour lancer Ellipse Studio avec icône personnalisée.

## Prérequis

- Node.js 22+
- `pnpm install` à la racine du monorepo

## Développement

```bash
pnpm desktop:dev
```

Démarre l'orchestrator (port 4400) et le Studio (port 5173) puis ouvre la fenêtre Electron.

## Build .exe

```bash
pnpm desktop:build
```

L'installateur NSIS est généré dans `apps/ellipse-desktop/dist/`.

Icône : `assets/icon.png` (également `assets/icon.svg` source vectorielle).
