# Revue de l’assemblage de Séraphine

Deux PNG RGBA 1024 × 1536 composent la version active : corps avec les zones masquées reconstruites et bras/épée V2. Le haut du bras a été corrigé avec imagegen intégré pour retirer l’épaulière mobile et former un chevauchement arrondi sous celle du corps. La V1 reste disponible dans l’atelier. Maître du lot 01 conservé, empreinte SHA-256 vérifiée. Prompts et provenance dans `image-prompts.json` et `image-prompts-v2.json`.

## Contrôles effectués

- 26 tests de simulation, maillage, recalage et gestes sur calques passent.
- Contrôle des dimensions, présence du canal alpha et proportions de pixels transparents/opaques des deux PNG.
- Vérification navigateur : retour identique au repos, corps immobile pendant la rotation du bras, transparence totale lorsque les deux calques sont masqués, animation, pause, superposition, écartement, export JSON, liens et mobile 390 px sans débordement. Aucune erreur JS ou ressource HTTP signalée.
- Captures de repos, balayage à −65°, séparation et mobile : `tmp/shadow-echoes/layers-*.png`. Repos, balayage et mobile examinés visuellement.
- Vérification TypeScript du Studio après ajout du lien du lot 04.
- Comparaison V1/V2, retour au maillage dans le combat, compétences synchronisées, pause stable, mouvements réduits et panne de chargement d’un calque vérifiés dans le navigateur. Le secours automatique conserve le maillage fonctionnel.
- Parcours complet du combat avec V2 : victoire en 48,2 secondes, quatre survivants, sauvegarde/rechargement, défaite et nouvelle tentative. Aucun changement des dégâts, recharges ou règles.
- Régression de l’atelier des quatre maillages et perte/restauration du contexte WebGL : réussie.
- Captures de combat V2 examinées sur ordinateur et mobile : `tmp/shadow-echoes/layers-combat-live.png` et `layers-combat-mobile-live.png`. Rapports `layers-browser-report.json`, `trial-browser-report.json` et `motion-browser-report.json` dans le même dossier.

## Résultat artistique

La V2 supprime le fragment d’épaulière qui sortait au-dessus du raccord lors du balayage. La lame reste rigide. Le changement de cadrage à la génération a nécessité un recalage affine, qui modifie les proportions du bras : l’identité des pixels et la fidélité des détails ne sont pas garanties. Une finition du raccord reste nécessaire aux grands angles. Le corps accompagne les gestes par une translation et une légère inclinaison globale ; le torse, le coude et le poignet ne sont pas articulés.

Statut : étude partielle intégrée au combat avec comparaison au maillage, fidélité non approuvée. Prochaine production : articulations du coude et du poignet, coordination du torse, finition des raccords et détails/proportions bras-lame. La cible reste la qualité des designs fournis.
