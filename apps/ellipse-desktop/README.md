# Ellipse Desktop

Application Windows pour lancer Ellipse Studio avec icône personnalisée.

## Lanceur local du projet

Le fichier `Ellipse.exe` à la racine est un lanceur Windows léger distinct de l’installateur Electron. Il démarre la plateforme puis ouvre `http://localhost:4273/` dans le navigateur par défaut. Il localise ses fichiers à partir de son propre dossier et peut être lancé depuis un raccourci sans dépendre du dossier courant.

Il affiche une fenêtre d’attente, conserve les services déjà démarrés et écrit les diagnostics dans `generated/logs/launcher.log`. En cas d’échec, une boîte de dialogue indique le journal. L’option `--no-browser` vérifie le démarrage sans ouvrir de fenêtre ; `--stop` appelle l’arrêt de la plateforme.

Le démarrage vérifie aussi PostgreSQL et remet en route l’instance locale Ellipse si nécessaire, à partir de son volume existant. Docker Desktop doit être ouvert. Une base absente ou un identifiant incorrect provoque un diagnostic explicite ; aucune base vide n’est créée pour masquer le problème.

Pour reconstruire ce lanceur et son icône depuis les sources :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/build-ellipse-launcher.ps1
```

Le script sauvegarde l’ancien exécutable sous `generated/ellipse-launcher/` avant remplacement. La source du lanceur est `tools/windows/EllipseLauncher.cs`. La fermeture du script Node est naturelle pour éviter le plantage `UV_HANDLE_CLOSING` observé sous Windows.

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

Icône actuelle : `assets/ellipse-app.ico` pour Windows et `assets/ellipse-app.png` pour Electron. Source vectorielle : `assets/ellipse-app.svg`. Reconstruction des sept tailles Windows avec `node tools/build-ellipse-icon.mjs`.
