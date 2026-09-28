# Base de données PostgreSQL — Ellisphere

## Instance active (Docker)

Récupération du 23 septembre 2026 : le conteneur avait disparu, mais son ancien volume anonyme était encore présent. Le cluster a été copié vers le volume nommé `ellipse-postgres-data`, puis le conteneur a été recréé sur cette copie. L’original `f6cb833b43b393064627acd6bc0c93ec685c442d1ca16715a90bfc1604e60f47` reste intact. Deux projets étaient présents dans cette base récupérée ; les workspaces du disque restent également disponibles dans le Studio.

Une sauvegarde au format PostgreSQL custom a été conservée avant migration dans `generated/backups/ellipse-before-repair-20260923.dump`.

| Paramètre | Valeur |
|-----------|--------|
| Conteneur | `postgres-ellisphere` |
| Host | `localhost` |
| Port | **5435** |
| Base | `ellisphere` |
| Utilisateur | `ellisphere` |
| Mot de passe | Défini dans `.env` (`POSTGRES_PASSWORD`) |
| Version | PostgreSQL 16 |
| Volume persistant | `ellipse-postgres-data` |
| Compose de récupération | `infra/compose/postgres-local.yml` |
| pgAdmin | Connexion « Ellisphere - PostgreSQL Docker 5435 » |

## Configuration projet

Les credentials sont dans **`.env`** à la racine (fichier local, non versionné) :

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5435
POSTGRES_DB=ellisphere
POSTGRES_USER=ellisphere
POSTGRES_PASSWORD=<votre mot de passe>
DATABASE_URL=postgresql://ellisphere:<mot_de_passe_encodé>@localhost:5435/ellisphere
```

Pour initialiser :

```bash
cp .env.example .env
# Éditer .env avec le mot de passe du conteneur Docker
```

### Encodage `DATABASE_URL`

Si le mot de passe contient des caractères spéciaux URL, les encoder :

| Caractère | Encodage |
|-----------|----------|
| `*` | `%2A` |
| `@` | `%40` |
| `#` | `%23` |
| `%` | `%25` |

Exemple : mot de passe se terminant par `**` → `%2A%2A` dans l’URL.

## Vérifier la connexion

`Ellipse.exe` vérifie maintenant une connexion SQL avant de lancer le Studio. Si l’instance locale `localhost:5435/ellisphere` est arrêtée, le lanceur redémarre `postgres-ellisphere`. Si le conteneur manque mais que le volume persistant existe, il le recrée depuis le compose dédié. Il ne crée jamais de base vide et ne gère pas les autres instances PostgreSQL de la machine.

Pour vérifier/rétablir la base séparément :

```bash
node tools/ensure-ellipse-database.mjs
```

Docker Desktop doit être démarré. Le conteneur utilise `restart: unless-stopped` ; aucune configuration des autres conteneurs n’est modifiée. Les identifiants existants dans `.env` sont conservés.

Le pool applique un délai de connexion de cinq secondes et gère les interruptions de connexions inactives pour que l’orchestrateur survive à un redémarrage de PostgreSQL.

```bash
# Avec psql (si installé)
psql "postgresql://ellisphere@localhost:5435/ellisphere"
```

Ou via pgAdmin avec les paramètres du tableau ci-dessus.

## Infra compose

Le Postgres du `docker-compose` interne (`ellipse-gdl-store`, port 5432) est **désactivé par défaut** — Ellisphere utilise le conteneur **`postgres-ellisphere`** sur le port **5435**.

Pour activer un Postgres de dev intégré au compose :

```bash
docker compose -f infra/compose/docker-compose.yml --profile internal-db up -d
```
