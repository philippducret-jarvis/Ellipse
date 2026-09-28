# Revue du lot 01 — première passe

## Résultat technique

- Quatre bases RGBA de 1024 × 1536, avec transparence réelle contrôlée dans les pixels et dans le navigateur.
- Quatre fiches de rareté Mythique vérifiées visuellement dans les références originales.
- Sept tests de simulation réussis : énergie, recharge, effets périodiques, contrôle, soins, boucliers et chronologie indépendante de la taille des pas.
- Parcours navigateur réussi : quatre sélections, huit références, compétences, riposte/soin, pause, réinitialisation et conservation du héros sélectionné.
- Captures de contrôle sur écran 1440 px et mobile 390 px, sans débordement horizontal ; revue visuelle effectuée.
- Vérification TypeScript du Studio réussie. Snapshot Ellipse validé : 155 références et quatre nouvelles bases, cinq documents, statut producing, aucun build de jeu complet annoncé.

## Revue artistique

Les quatre bases reprennent les identités et familles de matières des planches : noir/rouge et ronces pour Séraphine, violet/or et corbeau pour Nyxara, ivoire/or végétal pour Lysael, métal volcanique et cendres pour Voren.

Elles restent des interprétations produites à partir de plusieurs références, pas des copies géométriquement identiques. Les détails des ornements, le dessin des couronnes, les filigranes, la chute des drapés et la forme exacte des armes nécessitent une comparaison rapprochée. Pour Séraphine, la couronne de roses suit la variante d’invocation ; la fiche de profil présente un ornement de cheveux différent. Ce choix de variante doit rester explicite avant le rig.

Le détourage de Séraphine a été examiné sur damier clair et sur fond sombre dans le navigateur. Les autres fichiers possèdent aussi un alpha mesuré ; une revue de chaque bord fin demeure nécessaire avant découpe et animation. Les deux essais supplémentaires de détourage de Séraphine et Nyxara n’ont pas remplacé les bases v1, dont l’alpha a ensuite été confirmé.

## Statut et suite

Première passe livrée pour revue. Fidélité finale non approuvée ; personnages non prêts pour le runtime de combat. La suite est la correction fine, la séparation des éléments, les rigs, les clips d’animation et la validation en mouvement. Aucun abaissement de la cible de qualité n’est adopté.

Les prompts exacts utilisés se trouvent dans [image-prompts.json](image-prompts.json). Les résultats techniques individuels sont sous `03_assets/characters/<héros>/qa-v1.json`.
