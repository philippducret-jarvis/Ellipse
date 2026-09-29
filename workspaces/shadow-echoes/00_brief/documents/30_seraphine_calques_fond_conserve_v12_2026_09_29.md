# Séraphine V12 — calques d'attente avec pose intacte

La V8 découpait les cheveux et les pans de tissu dans la pose fixe, puis les redessinait sur des maillages déformés. À certains instants, l'écart entre les maillages laissait voir le fond à travers les épaules et le buste. La V12 garde tous les pixels de la planche originale sur le plan de base et anime les mêmes régions par-dessus. Les transitions des masques sont adoucies pour éviter une bordure dure.

La V12 est la version chargée sans paramètre `seraphine` dans la vue tactique. La V6 et la V8 restent disponibles avec `?seraphine=lookdev-v6` et `?seraphine=lookdev-v8`. Les [captures portrait](../../02_production/lot-15/seraphine-v12-portrait-idle-review.png) et [campagne](../../02_production/lot-15/seraphine-v12-campaign-review.png) documentent l'attente ; le test automatise aussi la préparation et la frappe. `prefers-reduced-motion` garde la pose stable.

Cette correction rend l'attente plus propre sans atteindre la cible artistique : les calques demeurent plats, le corps n'est pas articulé, la frappe change encore le visage et les autres héros ont des volumes provisoires. La suite prioritaire est une pose de frappe qui conserve les traits de la planche, puis une vraie reconstruction animable du visage, de l'armure et des étoffes, vérifiée à l'échelle du combat devant le décor en volume.
