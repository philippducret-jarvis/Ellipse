# Shadow Echoes — première édition solo jouable

## Entrée principale

La Citadelle est maintenant l’accueil du jeu et l’entrée `preview.html` utilisée par Ellipse. URL locale : http://localhost:4273/workspaces/shadow-echoes/07_exports/web/citadel.html. Les pages des anciens ateliers restent accessibles.

## Contenu livré

Un hub gothique avec sanctuaire, portes du monde, salle des reliques et taverne. Quatre Mythiques disponibles dès le départ : Séraphine, Nyxara, Lysael et Voren. Les héros sont animés dans le hub, leur fiche, les invocations et le combat. Séraphine emploie ses deux calques indépendants ; les autres conservent leur maillage de présentation.

| Activité | Premier niveau | Objectif |
| --- | --- | --- |
| Campagne | Les Ruines de l’Aube | Gagner le combat d’équipe en trois phases |
| Survie des ombres | La barricade assiégée | Survivre 60 secondes à trois vagues |
| Expédition | La route d’Azenval | Gérer provisions et intégrité sur cinq étapes |
| Défense de caravane | Le pont des Veilleurs | Protéger le convoi pendant 55 secondes |
| Course de montures | La chevauchée écarlate | Éviter les ombres sur trois allées pendant 45 secondes |
| Pêche maudite | Le lac des Âmes | Ferrer puis maîtriser la tension de trois prises |
| Dés du destin | La taverne du Voile | Sécuriser 35 points en six manches |
| Échos de mémoire | La cathédrale oubliée | Retrouver six paires en 24 essais |
| Sanctuaire des runes | Le sceau lunaire | Allumer neuf pierres en 20 coups |
| Alchimie | L’atelier des Racines | Réaliser trois recettes avec ordre et chaleur corrects |

Chaque niveau possède ses instructions, ses conditions de fin, son bilan, un retour au hub et une nouvelle tentative. Les activités chronométrées disposent d’une pause et s’arrêtent quand l’onglet est quitté. Souris/clavier et commandes tactiles sont fournis. Le niveau de campagne conserve ses commandes détaillées dans sa scène.

## Progression commune

- Départ : 400 or, 4 sceaux, les quatre Mythiques de niveau 1.
- Une invocation coûte 1 sceau. Les quatre héros ont chacun 25 % de probabilité ; chaque invocation révèle le personnage et lui donne 20 fragments. Historique limité aux 20 derniers résultats.
- Un sceau peut être obtenu contre 150 or gagné en jeu. Aucun paiement réel.
- Élévation d’un héros : 20 fragments et 100 × niveau actuel en or, jusqu’au niveau 10. Chaque niveau ajoute 3 % de dégâts et 4 % de vie.
- Première victoire de chaque activité : or indiqué, 1 sceau, 100 XP et éventuellement une relique. Rejouer donne 35 % de l’or initial et 25 XP, sans doubler le sceau ou la relique de première victoire.
- Six reliques obtenues en campagne, survie, runes, mémoire, pêche et alchimie. Une relique par héros et un porteur par relique. Les bonus de vie/dégâts affectent réellement la campagne et les combats d’action.
- Quatre serments permanents distribuent des récompenses réclamables une seule fois. Les dix victoires figurent dans l’atlas.

## Sauvegarde et fonctionnement local

Carnet versionné sous `shadow-echoes:citadel:v1`, distinct du record historique de l’épreuve. Validation des valeurs et des identifiants, protection contre le double versement d’un résultat, sauvegarde après transactions. Export JSON et import avec aperçu et confirmation de remplacement. Un fichier invalide est rejeté ; un carnet local illisible est conservé sous une clé de récupération.

Le stockage est propre au navigateur et à l’adresse utilisée. Si le navigateur refuse l’écriture, le jeu continue en mémoire et signale qu’il faut exporter. Un niveau interrompu recommence au début ; les ressources déjà obtenues restent conservées. Plusieurs onglets synchronisent le carnet, mais une seule session d’activité est active.

## Qualité et limites réelles

Cette livraison transforme les ateliers isolés en un ensemble jouable. Elle ne constitue pas une version commerciale finale : les animations complètes du corps, de nouveaux angles de vue, la fidélité détaillée aux designs, l’équilibrage long terme et les musiques restent à produire. Les mini-jeux ont chacun un premier niveau ; il n’y a pas encore de campagne étendue ni de multijoueur, guilde connectée, boutique réelle ou sauvegarde cloud.

Le décor du hub et l’atlas des six reliques, du convoi, de la monture et du spectre ont été générés avec imagegen intégré. Les références importées sont utilisées comme direction artistique, et non comme instructions d’exécution. Les fichiers PNG sources restent intacts ; l’atlas est découpé par coordonnées au rendu dans le moteur.

Fichiers sauvegardés : [décor de la Citadelle](../../03_assets/environments/citadel-v1.png), [atlas des reliques et créatures](../../03_assets/items/citadel-atlas-v1.png), [prompts exacts et mode utilisé](../../02_production/lot-05/image-prompts.json).

## Reconstruction et vérification

`pnpm shadow:citadel` reconstruit le hub et les scènes. `pnpm shadow:test` vérifie les règles, l’économie, les puzzles, les sauvegardes, le combat et les rigs. `pnpm shadow:verify-citadel` parcourt l’économie et six mini-jeux. `node tools/verify-shadow-echoes-adventures.mjs` gagne les trois jeux d’action et la campagne au moyen des commandes de l’interface.

La version portable est construite par `node tools/package-shadow-echoes-citadel.mjs`. Son lanceur `Jouer.cmd` utilise Node.js 22+ et sert les fichiers sur le port 4316. Il ne remplace pas `Ellipse.exe`.
