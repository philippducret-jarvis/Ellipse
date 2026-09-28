# Campagne — proposition « théâtre tactique »

Statut : proposition de direction dont les premières règles sont jouables dans `07_exports/web/tactics.html` depuis le 28 septembre. Voir `18_tranche_tactique_et_assets_hd_2026_09_28.md` pour l'état réel de la livraison. Les quatre images fournies le 27 septembre 2026 sont conservées dans `01_inputs/references/campaign-framing-2026-09-27/`. Elles sont des **références de composition et de détail**, pas des captures d'un niveau déjà réalisé ni des assets de jeu.

## Lecture des références

Les quatre vues montrent une scène presque latérale : personnages grands à l'écran, silhouettes très lisibles, ruines gothiques en plusieurs profondeurs, boss occupant une part majeure du cadre, effets spectaculaires et interface fixée sur les bords. Le sol jouable est étroit dans l'image ; la profondeur réelle et les choix de placement ne sont pas visibles. Une caméra trois quarts aussi haute que celle du Pont actuel clarifie le déplacement, mais diminue la présence des héros et éloigne le rendu de ces images.

La proposition est une **caméra orthographique latérale surélevée**, proche d'un diorama : environ 25–30° de hauteur et 10–15° de biais par rapport au profil du trajet. Elle garde les personnages de grande taille, laisse voir deux à trois couloirs en profondeur et des cases lisibles au sol. La caméra reste fixe pendant la décision, se rapproche pour les compétences et les supers, puis revient exactement au cadrage tactique. Les décors proches peuvent masquer le groupe seulement avec une transparence contrôlée. Une comparaison réversible du cadrage existe dans `ruins.html?camera=tactical` ; elle ne change pas les règles en temps réel de cette scène.

## Boucle recommandée

La campagne deviendrait une **expédition à embranchements et combats au tour par tour**. Les quatre Mythiques sont actifs en même temps. Le joueur choisit l'ordre de leurs actions ; les ennemis jouent ensuite, avec leurs intentions visibles. Une manche donne deux points d'action à chaque héros. Une attaque de base ou un déplacement court coûte un point ; une compétence coûte un ou deux points selon sa puissance ; un super demande l'énergie accumulée et deux points. Ces valeurs sont provisoires et doivent être éprouvées sur une rencontre complète.

L'arène témoin utilise trois couloirs de profondeur et plusieurs positions le long du pont. Un personnage occupe une position ; la portée, la ligne de vue, les obstacles et les zones de danger sont affichés avant validation. Un déplacement peut échanger deux alliés adjacents si les deux positions restent accessibles. Le positionnement doit créer des choix, pas des compétences inutilisables sans avertissement : l'interface montre le coût, les cases autorisées, les cibles et la raison d'un blocage.

| Héros | Rôle spatial témoin | Exemple de condition de compétence |
| --- | --- | --- |
| Séraphine | Percée de proximité | Frappe une cible proche sur son couloir ; un pas de rose peut changer de couloir avant l'attaque. |
| Voren | Tenue de la ligne | Protège les alliés voisins ; son choc atteint le premier rang et repousse un ennemi si la case derrière lui est libre. |
| Nyxara | Contrôle à distance | Tire dans une ligne de vue libre ; une ombre posée sur une case prépare un piège pour le tour adverse. |
| Lysael | Soutien de zone | Soigne ou protège dans une portée montrée au sol ; son placement expose ou couvre plus d'alliés. |

Une attaque ennemie annoncée pour le prochain tour donne une raison immédiate de bouger. Les grandes animations jouent **après** la confirmation de l'action et peuvent être accélérées ; le retour au plateau doit rendre l'état de la bataille immédiatement clair. Le combat garde attente vivante, réactions, effets sur cheveux et étoffes, transitions de mouvement et animation de victoire/défaite. Le tour par tour ne dispense pas de produire les modèles et leurs déformations au niveau des planches.

## Route sans retour arrière

Une expédition courte comporte six à huit étapes. Après chaque emplacement remporté, le joueur choisit parmi une ou deux sorties. Il voit **le type approximatif** de risque (combat, élite, repos, mystère, relique), une indication de difficulté et une famille de récompense ; il ne voit ni la composition exacte ni le contenu de l'événement. Après confirmation, la route précédente se ferme. Un demi-boss survient au milieu de la route, puis un boss final ; ces deux rendez-vous sont garantis, quelles que soient les branches. Un repos ou un événement peut apparaître entre les deux.

Les événements spéciaux proviennent d'une graine de run sauvegardée à chaque choix. Leur probabilité de base et le bonus apporté par un objet sont affichés avant le choix, avec un plafond explicite. L'objet augmente une chance, sans promettre un événement précis. La graine empêche de changer le tirage par rechargement ; l'attribution des récompenses n'a lieu qu'une fois lors de la résolution du nœud. Une défaite termine l'expédition ou ramène au dernier point de reprise défini par les règles du chapitre, sans rouvrir les embranchements déjà choisis.

## Premier niveau vertical à réaliser

1. Construire **une seule arène de ruines** au cadrage retenu : pont de pierre, trois couloirs lisibles, premier plan et fond à plusieurs profondeurs, emplacement pour un boss volumineux. Conserver la géométrie 3D pour les personnages, collisions, ombres et VFX ; employer des fonds peints pour le lointain seulement.
2. Intégrer Séraphine skinnée avec attente, déplacement entre positions, attaque, compétence, super, impact et défaite. Comparer à sa fiche et aux quatre références à la taille réelle d'affichage. Les autres héros peuvent utiliser leurs modèles de travail tant que le statut est annoncé.
3. Jouer une rencontre normale, une rencontre de demi-boss et un boss avec les quatre Mythiques, les intentions ennemies et les restrictions de placement visibles. Vérifier que le joueur peut gagner de plusieurs façons et comprendre une défaite.
4. Relier ces rencontres par deux choix de route irréversibles, un événement spécial avec probabilité modifiée par un objet, une sauvegarde/reprise et un bilan de récompenses sans double attribution.
5. Ensuite seulement généraliser l'animation finale aux trois autres héros et produire les autres emplacements du chapitre.

## État du projet à ne pas confondre avec cette cible

Le `ruins.html` actuel reste un prototype d'action en temps réel, avec compagnon automatique, trois rencontres linéaires et modèles 3D de travail. Le bouton **Vue témoin** modifie uniquement la caméra et la correspondance des contrôles à l'écran pour comparer le cadrage. Le nouveau `tactics.html` réalise séparément les cases, les tours et les branches ; ses personnages et animations ne sont pas encore les modèles finaux. Le manifeste conserve provisoirement `camera_mode: isometric` pour décrire la campagne d'action principale, et publie un lien tactique distinct.
