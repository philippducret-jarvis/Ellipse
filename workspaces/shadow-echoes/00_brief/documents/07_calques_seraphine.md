# Lot 04 — premiers calques de Séraphine

Le premier assemblage comporte un corps reconstruit et un bras tenant l’épée, tous deux en PNG RGBA 1024 × 1536. Les deux images ont été générées avec imagegen à partir du maître du lot 01, conservé intact. Ce sont des calques régénérés, pas une extraction pixel à pixel.

## Consultation

- [Atelier interactif](../../07_exports/web/layers.html) : angle manuel, attaque en boucle, pause, ralenti, visibilité de chaque calque, séparation, damier, superposition du maître et export JSON.
- [Corps reconstruit](../../03_assets/characters/seraphine/layers-v1/body.png).
- [Bras et épée V2](../../03_assets/characters/seraphine/layers-v1/arm-sword-v2.png), avec haut arrondi sous l’épaulière fixe. La V1 reste consultable dans l’atelier.
- [Prompts initiaux](../../02_production/lot-04/image-prompts.json) et [prompt de correction V2](../../02_production/lot-04/image-prompts-v2.json), outil imagegen intégré.
- [Recalage](../../03_assets/characters/seraphine/layers-v1/layer-rig-review.json) et [contrôle technique](../../03_assets/characters/seraphine/layers-v1/qa-review.json).

## Assemblage et limites

Le cadrage généré du bras diffère du maître. Une transformation affine utilise trois repères : épaule, main et pointe. L’épée et le bras tournent ensuite ensemble autour de l’épaule ; ils ne subissent pas de flexion pendant le mouvement. Une partie du corps passe devant le raccord sous l’épaulière.

La V2 retire l’épaulière qui tournait avec le bras dans la V1. Le haut est maintenant arrondi et passe sous l’épaulière fixe du corps. Le raccord est amélioré mais demande encore une finition, notamment aux grands angles. Les détails du gant et de la lame, ainsi que leurs proportions après recalage, restent à comparer aux designs. La fidélité n’est pas approuvée.

Le combat utilise la V2 de Séraphine par défaut. Attaque, compétence et ultime ont des amplitudes distinctes ; garde, impact, attente et affaiblissement sont également raccordés aux événements. Le corps accompagne le bras par un déplacement et une inclinaison globale modestes ; ce n’est pas une articulation du torse. Les trois autres Mythiques conservent leurs maillages.

L’option « Séraphine articulée · étude » revient au maillage du lot 03. La pause et l’option « Héros animés » contrôlent aussi ces gestes ; la préférence système de mouvement réduit est respectée. Si un PNG de calque ne charge pas, le maillage reste utilisable. Les dégâts et recharges du combat ne sont pas modifiés ; le geste se déclenche sur l’événement de compétence, sans nouveau délai d’impact.

## Suite de production

Corriger le raccord et les proportions, puis séparer coude, poignet, cheveux et cape pour coordonner le mouvement du corps. Produire ensuite les calques des trois autres Mythiques. Les animations finales, les faces cachées et les autres angles de vue restent à réaliser.

Reconstruction : `pnpm shadow:layers`. Vérifications : `pnpm shadow:test` et `pnpm shadow:verify-layers`. Les contrôles automatiques vérifient le rendu et les commandes ; ils ne valident pas la qualité artistique.
