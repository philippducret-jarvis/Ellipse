# Base de données PostgreSQL — Ellisphere

## Instance active (Docker)

| Paramètre | Valeur |
|-----------|--------|
| Conteneur | `postgres-ellisphere` |
| Host | `localhost` |
| Port | **5435** |
| Base | `ellisphere` |
| Utilisateur | `ellisphere` |
| Mot de passe | Défini dans `.env` (`POSTGRES_PASSWORD`) |
| Version | PostgreSQL 16 |
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
