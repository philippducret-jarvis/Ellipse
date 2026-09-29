# Séraphine — lecture de l'impact au combat

La frappe de base déclenche maintenant un effet d'impact rouge au contact et une réaction de la sentinelle touchée : léger recul, inclinaison et variation de teinte, puis retour à la pose d'attente. Ces effets concernent la vue 2,5D et n'altèrent ni les règles ni les dégâts. La [capture à taille de combat](../../02_production/lot-15/seraphine-impact-v13-campaign-review.png) montre la phase de contact.

Pour inspecter un moment précis sans dépendre du temps d'une capture, `?seraphine=lookdev-v13&camera=cinematic&environment=arcade-v3&reviewFreeze=0.72` fige la frappe à 72 % uniquement dans cette URL de revue. Sans `reviewFreeze`, la frappe se termine normalement. Le test de rendu vérifie la pose, l'effet de lame et la réaction de la cible.

Un essai séparant l'avant-bras et l'épée de la planche a été écarté après revue portrait et combat : le raccord se perdait dans le corset, la trajectoire ne partait pas proprement de l'épaule. Il faut une véritable géométrie articulée et une base de costume préparée pour la rotation. Les images générées de cet essai ne sont pas intégrées au jeu. La V12 reste la vue par défaut ; la V13 conserve l'identité exacte de la planche lors de sa frappe optionnelle.
