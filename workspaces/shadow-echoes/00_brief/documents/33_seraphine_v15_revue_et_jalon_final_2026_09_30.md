# Séraphine V15 — revue du mouvement de frappe et jalon final

La V15 est une **étude non approuvée** accessible avec `?seraphine=lookdev-v15`. Elle reprend les pixels originaux de la vue trois quarts de la planche pendant la préparation et la frappe. Deux calques supplémentaires sélectionnent les cheveux clairs et les étoffes rouges, puis les déforment légèrement sur un maillage. Le visage, le corset et la coiffe restent dans la pose source. La V12 demeure la vue par défaut ; la V13 et toutes les anciennes études restent accessibles.

Les [captures portrait V15](../../02_production/lot-15/seraphine-v15-portrait-attack-review.png) et [V13](../../02_production/lot-15/seraphine-v13-portrait-attack-review.png) montrent que l'identité du visage est conservée. La [capture V15 à taille de combat](../../02_production/lot-15/seraphine-v15-campaign-attack-review.png) montre aussi la limite : la silhouette du bras et l'épée ne suivent pas une trajectoire anatomique, et le relief du costume ne réagit pas à l'éclairage. La scène emploie encore un panorama pour la cité distante ; le pont et les arcs ont une géométrie, mais leurs masses et matériaux ne rejoignent pas les images cibles. Les trois autres Mythiques utilisent encore leurs études de volume. Ce résultat n'est donc **pas le rendu final demandé**.

## Décision de fabrication

Le prochain jalon qui peut réellement satisfaire la cible est un modèle de production de Séraphine, réalisé à partir des quatre vues communiquées : sculpture du visage et du costume, chevelure et étoffes séparées, retopologie et UV, textures PBR peintes pour ces surfaces, puis rig du corps, du visage, du tissu et de l'épée. Une pose neutre et trois actions (attente, préparation, frappe) doivent d'abord être jugées côte à côte avec la planche, en portrait et à taille de combat. Après approbation seulement, déployer cette méthode aux trois autres Mythiques et remplacer les grandes masses de pierre du niveau par une architecture sculptée avec matériaux, profondeur et éclairage cohérents. Agrandir davantage les anciens portraits ou déformer leur maillage ne résoudra pas l'articulation ni la qualité de surface.

## Critères de sortie du jalon Séraphine

- Le visage, la couronne, les roses, la coiffure, le corset, les gantelets, les cuissardes et les pans de robe restent reconnaissables depuis la face et le trois quarts, sans changer d'identité entre les poses.
- Le bras, le coude, la main et la lame ont une trajectoire continue et lisible à l'impact ; aucune couture ni transparence visible au raccord des pièces.
- L'attente anime respiration, regard, cheveux et étoffes ; la frappe a anticipation, transfert de poids, contact et récupération. Les pieds conservent un appui crédible sur le pont.
- À taille de combat, le personnage se distingue des sentinelles, projette une ombre de contact, et les matériaux du costume réagissent aux lumières du niveau sans ressembler à un portrait posé devant le panorama.
- Revue artistique sur captures et animation, puis `fidelity_approved: true` uniquement après cette validation. Les tests techniques de chargement ne valent pas approbation artistique.

Validation technique V15 : `node tools/verify-shadow-seraphine-matte.mjs lookdev-v15 portrait --freeze=.72` et `node tools/verify-shadow-seraphine-matte.mjs lookdev-v15 cinematic --arcade --freeze=.72` passent. Deux captures portrait séparées de 900 ms présentent un mouvement mesurable dans la région du personnage. Aucune de ces vérifications ne démontre encore la fidélité finale du modèle.
