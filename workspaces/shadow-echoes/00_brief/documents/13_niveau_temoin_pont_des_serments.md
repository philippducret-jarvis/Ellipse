# Le Pont des Serments — tranche jouable en 2,5D

État mis à jour le 27 septembre 2026 : niveau de validation fonctionnelle en caméra surélevée trois quarts. La qualité artistique des planches n'est pas encore atteinte. Le premier lot de production reste ouvert.

## Ce qui est jouable

Accès principal depuis la Citadelle et accès direct `07_exports/web/ruins.html`. Une scène en géométrie 3D, vue par une caméra orthographique élevée en trois quarts, remplace les positions fixes pour cette traversée.

- Entrée des ruines, pont, vestiges et arène ; sept adversaires, dont un Gardien final. Deux portes conditionnent l'avancée aux victoires locales.
- Les quatre héros sont présents ensemble. Le joueur change de héros actif ; les trois compagnons suivent par navigation sur grille et utilisent des attaques adaptées à leur portée.
- Déplacement clavier ou clic au sol, pavé tactile, collisions avec colonnes, murs, torches, bords et portes. La recherche de chemin contourne les obstacles. Les colonnes qui masquent le héros deviennent transparentes.
- Attaque de base avec trois gestes successifs, anticipation de l'impact, trois compétences et un super par héros. Les kits distinguent dégâts, soin, protection et interruption. Ces valeurs sont provisoires et propres à cette scène.
- Ennemis articulés avec poursuite, préparation, zone d'impact annoncée, frappe, récupération, étourdissement et chute. Le Gardien élargit son attaque à mi-vie.
- Esquive avec déplacement, invulnérabilité courte et recharge. Les dégâts absorbent d'abord les boucliers. Un héros tombé est remplacé par un survivant ; la chute du groupe entier termine la partie.
- Source utilisable une seule fois après les ruines : soin et réanimation du groupe. Victoire, défaite, rejeu et meilleur temps local.
- Bonus du carnet (niveau, ascension, talents, équipement et reliques) appliqués aux PV, dégâts, soins, boucliers, recharges, énergie et super de cette traversée. La campagne de la Citadelle ouvre désormais ce niveau en 2,5D.
- Carte, caméra réglable, éclairages aube/nuit, sons facultatifs, règles consultables, pause manuelle et automatique quand l'onglet perd le focus. Les mouvements décoratifs et le suivi de caméra respectent la préférence de mouvement réduit.

## Contrôles

| Action | Commande |
| --- | --- |
| Déplacement | ZQSD, WASD, flèches ou clic au sol ; pavé sur écran tactile |
| Héros actif | Portrait ou Tab |
| Attaque | J |
| Compétences | 1, 2, 3 |
| Super | R, à 100 énergie |
| Esquive | Espace, dans la dernière direction de déplacement |
| Source | E ou bouton à proximité |
| Pause | Échap ou bouton |

## Portée de cette livraison

Le niveau emploie les quatre modèles articulés intermédiaires, des ennemis procéduraux et un décor original construit en code. Les matières minérales, les ruines, les éclairages et les effets permettent de vérifier la lecture en situation ; ils ne constituent pas une reproduction finale des nouvelles planches. Les sources PNG fournies restent intactes.

Les compétences propres à cette scène restent provisoires et distinctes de l'ancienne campagne. Depuis le 27 septembre, les bonus du carnet s'appliquent au lancement du niveau ; la victoire utilise la récompense de campagne existante pour les quatre Mythiques et met à jour XP, or, sceaux, essence, relique et équipement selon les règles du profil. Le résultat et le meilleur temps local restent enregistrés sous `shadow-echoes:ruins:v1`. Une même session ne peut créditer la récompense qu'une fois ; la défaite n'en crédite aucune. Si la sauvegarde est corrompue ou indisponible, la traversée reste jouable sans attribution.

Les mini-jeux existants restent accessibles. L'ancienne campagne `play.html` reste dans les fichiers du prototype, mais l'entrée Campagne de la Citadelle mène au Pont des Serments. Cette livraison fournit un niveau représentatif, pas l'ensemble des niveaux illustrés dans les références.

## Validation et suite

Le moteur fait l'objet de tests couvrant chemins, collisions, portes, pause, anticipation, portée, recharges, énergie, soin, boucliers, esquive, interruption, réanimation et défaite. Un parcours automatisé gagne les trois rencontres en utilisant les commandes et la navigation, sans modifier les PV des ennemis.

Les contrôles navigateur sont consignés dans `02_production/lot-07/ruins-browser-validation.json`. Les captures se trouvent dans `tmp/shadow-echoes/ruins-*.png`. Une émulation à 390 px ne vaut pas certification des performances sur téléphone réel.

Les prochaines étapes de production restent : modèles fidèles aux fiches individuelles avec déformations continues et animations retouchées ; décor détaillé fidèle à la planche retenue ; mise en cohérence des compétences provisoires avec les fiches et équilibrage économique ; puis extension des contenus. La décision utilisateur du 27 septembre fixe la vue 2,5D en trois quarts : la caméra latérale des prototypes Aldric n'est pas une cible. Les chiffres de combat de ce niveau ne valent pas nouvel équilibrage approuvé de la bible.
