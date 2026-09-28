# Livraison du deuxième lot utilisateur

Le lot est disponible dans la Citadelle, sur le même projet Ellipse. Les fiches, la progression, les talents, l’équipement, les invocations et les combats sont raccordés et sauvegardés.

## Vérifications

- 47 tests de logique distincts validés, dont les deux ascensions jusqu’au niveau 30.
- Les dix premiers niveaux gagnés dans le navigateur avec les commandes de jeu.
- Trois rituels vérifiés jusqu’au résultat, avec les coûts et fragments attendus.
- Fiches, transfert et amélioration d’équipement, sélection et restitution des talents, ascension et import de carnet vérifiés dans l’interface.
- Quatre gestes d’attente vérifiés par comparaison des images rendues ; base manuelle, super et pause vérifiés.
- Ouvrir les règles du hub suspend le combat embarqué ; reprise vérifiée.
- Écrans existants et huit nouveaux parcours vérifiés à 390 px.
- Vérification TypeScript du Studio réussie.

Rapports détaillés : `validation.json`, `edition-browser-report.json`, `edition-combat-report.json`, `citadel-browser-report.json` et `citadel-adventures-report.json`. Le test navigateur d’ascension utilise un carnet préparé, importé par l’interface ; les tests de logique couvrent les deux paliers.

## Visuels et provenance

Création avec l’outil **imagegen intégré**, depuis les planches de combat et d’équipement fournies. Prompts exacts : `image-prompts.json`.

- `03_assets/enemies/guardians-v2.png` : atlas transparent des trois gardiens.
- `03_assets/items/equipment-atlas-v1.png` : atlas transparent des neuf équipements.

Les originaux fournis et les maîtres des héros ont été conservés. Les atlas sont chargés depuis le projet, indépendamment du dossier de génération de Codex.

## Limites de finition

Les systèmes du lot sont jouables. L’animation utilise une combinaison de maillages pondérés, de calques pour Séraphine, de profondeur visuelle et d’effets. Elle ne constitue pas quatre rigs anatomiques complets. La fidélité artistique finale aux planches n’est pas certifiée. La tenue illustrée ne change pas lorsqu’un équipement est transféré. Musiques définitives, équilibrage à long terme et services en ligne restent hors de cette livraison solo.
