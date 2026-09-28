# Séraphine · étude des calques animés

L'étude V6 conserve le visage, le costume et la silhouette de la planche fournie en attente, mais tout le personnage reste une surface unique. Les variantes expérimentales `lookdev-v7` et `lookdev-v8` extraient des régions de cette **même texture source** : les cheveux en V7, puis les pans de cape et de jupe en V8. Des masques de région complémentaires retirent ces pixels de la couche fixe et les affichent dans deux maillages séparés. À l'arrêt, ils recomposent la planche ; au repos animé, leurs sommets suivent des mouvements lents distincts.

Prévisualisation de la V8 : `07_exports/web/tactics.html?seraphine=lookdev-v8&camera=seraphine`. La V6 reste la vue 2,5D par défaut et les anciens candidats sont conservés. La préparation de trois quarts et la frappe utilisent toujours leurs images clés entières : les nouveaux calques portent uniquement sur l'attente.

Vérification : `node tools/verify-shadow-seraphine-matte.mjs lookdev-v8 focus` charge trois poses masquées, le passage cheveux/tissu, la préparation et la frappe sans erreur WebGL. Captures de travail dans `02_production/lot-15/qa/`.

La V8 n'est **pas approuvée** : les masques de cheveux et de tissu ont été générés depuis la planche et leur correspondance exacte aux bords fins n'est pas assurée. Le mouvement est un déformateur de maillage 2,5D, pas un rig anatomique. Avant toute promotion comme rendu cible, il faut reprendre les contours à taille native, dissocier au minimum les bras et l'épée, produire des poses de combat dont les raccords et les matières restent cohérents, puis confronter une capture de jeu à la planche et aux images de campagne fournies.
