# Shadow Echoes — étude B de Séraphine et gardiens 2,5D

## Référence et variantes

La planche `03_assets/characters/seraphine/turnaround-v1.png` reste la cible. L'étude A (`lookdev-v1`) et les anciens rigs V2 à V4.1 sont conservés. L'étude B (`lookdev-v2`) utilise trois nouvelles images transparentes générées avec **imagegen** à partir de la vue frontale et de l'étude B elle-même : `seraphine-front-cutout-v2.png`, `seraphine-basic-windup-key-v2.png` et `seraphine-basic-attack-key-v3.png`, dans `03_assets/characters/seraphine/lookdev/`. Les prompts demandaient une extraction frontale fidèle, puis une préparation à l'épée et une frappe horizontale sans changer le visage, la coiffe, les broderies ni les bottes. Le résultat est une **interprétation générée**, pas une découpe pixel à pixel de la planche.

`07_exports/web/seraphine-lookdev.html` compare les études A et B à la planche en vue entière et à taille de combat. Le lien « Essayer en combat » suit la variante choisie. `tactics.html?seraphine=lookdev-v2` charge l'étude B et ses trois poses ; `?seraphine=lookdev-v1` conserve l'étude A.

La planche existante `03_assets/enemies/guardians-v2.png` a servi de référence aux portraits transparents `03_assets/enemies/sentinels-lookdev/armored-sentinel-idle-v1.png` et `void-sentinel-idle-v1.png`, également générés avec imagegen. La nouvelle preview place deux chevaliers cuirassés et un gardien spectral face aux quatre héros. Les anciens volumes ennemis restent dans la preview ordinaire. Le gardien de boss de la planche reste disponible séparément.

## État réel

Les silhouettes, armures et étoffes ennemies sont désormais lisibles à l'échelle du combat. Séraphine B se rapproche de la planche en face avant. Les trois poses sont encore des images complètes commutées, avec une déformation légère du maillage et un effet d'impact ; ce ne sont pas des pièces animées indépendamment. Les deux sentinelles n'ont qu'une pose de repos et un balancement global. L'écart avec la cible reste net sur les mouvements, les autres Mythiques et l'intégration volumétrique du décor lointain.

## Contrôles et suite

`node tools/verify-shadow-seraphine-lookdev.mjs` contrôle la transparence, les variantes A/B, le chargement des trois poses B et des trois portraits ennemis, la séquence d'attaque et l'absence de chevauchement entre poses. Les captures sont dans `02_production/lot-14/qa/`. `node tools/verify-shadow-echoes-tactics.mjs` contrôle les règles, la route, les rangs et la vue mobile.

Le prochain seuil artistique consiste à séparer visage, cheveux, bras, épée et couches de robe depuis une référence approuvée, à préserver les raccords pendant une animation articulée, puis à revoir le personnage sous la caméra de combat. Les ennemis demandent le même traitement pour les attaques et les réactions. Le pont proche est en volume ; l'arrière-plan de ruines reste un panorama et devra être reconstruit en plans 2,5D ou en géométrie détaillée.
