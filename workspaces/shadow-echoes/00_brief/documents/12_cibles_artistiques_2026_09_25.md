# Cibles artistiques reçues le 25 septembre 2026

Source : `Shadow_Echoes_Dernieres_Creations_2026-09-25.zip`, reçue pendant le travail sur les animations du premier lot de la bible.

## Import et nature des fichiers

21 PNG ont été copiés sans modification dans `01_inputs/references/transformations-2026-09-25/`. Leurs tailles et leurs empreintes SHA-256 correspondent au manifeste de l'archive. Aucun GLB, FBX, fichier Blender, squelette, clip animé ou scène exécutable n'est présent.

Le texte d'accompagnement et le manifeste annoncent aussi un Word et un PDF dans `01_Documentation`, mais ces deux entrées sont absentes du ZIP reçu. La bible PDF précédemment transmise reste disponible séparément ; ce manque n'empêche pas l'utilisation des 21 références visuelles.

Les textes intégrés aux images décrivent une intention de production. Les mentions « modèle final », « prêt pour le jeu » et « animations en jeu » ne constituent pas des preuves de modèles ou d'animations livrés. Les montants, noms alternatifs et règles dessinés dans les maquettes ne sont pas appliqués automatiquement au jeu.

## Références principales

| Sujet | Planche principale | Éléments à respecter |
| --- | --- | --- |
| Séraphine | `02_Transformation_Seraphine/03_modele_final_2_5D.png` | Proportions élancées, visage et profil, cheveux argentés en mèches, roses et ronces, filigranes d'or, pans cramoisis irréguliers, lame rouge détaillée |
| Nyxara | `04_Transformation_10_Mythiques/03_Nyxara.png` | Visage propre, chevelure violette sombre, couronne fine, robe et chaînes, corbeau, orbe, gestes d'incantation et déplacement des étoffes |
| Lysael | `04_Transformation_10_Mythiques/08_Lysael.png` | Cheveux ivoire ondulés, fleurs, feuillage, étoffes légères, bâton floral, lumière chaude et gestes de soin |
| Voren | `04_Transformation_10_Mythiques/07_Voren.png` | Anatomie masculine puissante, torse, armure volcanique en plaques et pointes, hache détaillée, cape fragmentée, poids des appuis et des frappes |
| Fiche personnage | `03_Transformation_Interface/avant_apres_interface_mythiques.png` | Navigation latérale, hiérarchie des informations, portrait vivant, finitions gothiques or/rouge, cadres fins et commandes lisibles |
| Niveaux | Six planches de `05_Transformation_Niveaux` | Caméra surélevée en trois quarts, profondeur réelle, chemins lisibles, ruines et ponts, arènes, éclairage local et effets atmosphériques |

Les dix fiches individuelles du dossier Mythiques concernent Astrae, Ragnar, Nyxara, Solmira, Caelum, Eirlys, Voren, Lysael, Zareth et Ophélia. Séraphine possède son propre dossier : l'ensemble couvre donc onze identités de référence. Le premier lot reste centré sur les quatre personnages déjà demandés ; les sept autres entrent au catalogue de cibles.

Les planches d'ensemble des niveaux utilisent plusieurs distributions alternatives et des noms différents : Kaelthar/Kaelthas, Drakonis/Drakos, Morrigan/Moriana, etc. Elles changent aussi parfois les titres et rôles de Lysael ou Voren. Elles sont utilisées pour la composition, les ambiances et l'intégration ; les fiches individuelles priment pour l'identité des héros. Aucun renommage ni remplacement silencieux n'a été effectué.

## Effet sur le premier lot en cours

Le socle volumétrique développé permet d'animer les articulations et de tester les gestes, mais son rendu schématique reste au stade de l'ébauche montré dans les nouvelles planches. Il ne satisfait pas leur qualité finale. L'ajout de filigranes ou d'effets ne suffit pas à fermer cet écart.

Le premier lot inclut les quatre héros et leurs animations de base. Pour sa validation artistique, chaque héros doit passer les contrôles suivants :

1. Comparaison face, profil, dos et trois quarts avec la planche individuelle ; silhouette et proportions identifiables avant les effets.
2. Visage propre au héros, modelé continu, yeux et mains crédibles, peau et matériaux différenciés.
3. Costume fidèle : volumes des plaques, couches de tissu, mèches, bijoux et arme ; éviter le corps générique recoloré.
4. Squelette et pondération permettant coude, poignet, genou et épaule sans séparation artificielle du corps.
5. Attentes avec respiration, regard et changement d'appui ; marche et course avec pieds ancrés ; anticipation, impact et récupération des attaques.
6. Cheveux, cape et jupe réagissant aux accélérations et retombant après les actions ; intersections contrôlées.
7. Lecture des gestes dans la fiche et dans une vraie scène au cadrage de jeu, avec variantes de distance et de lumière.
8. Contrôle des performances sur les appareils cibles et des options de réduction du mouvement.

Les 42 états d'animation et les GLB actuels restent des bases réutilisables pour ces tests. Les poses du nouveau dossier guideront leur retouche sur les modèles détaillés. Un extrait d'une illustration ne remplace pas une séquence animée.

## Niveaux en 2,5D

Les nouvelles planches montrent surtout une vue élevée en trois quarts, plus ouverte que la caméra latérale évoquée dans la bible. Le 27 septembre, l'utilisateur a écarté explicitement la modélisation latérale : la vue 2,5D en trois quarts est désormais la direction fixée. Les tests PC/mobile doivent optimiser ce cadrage, sans rouvrir le choix latéral.

Tranche représentative proposée : arrivée dans des ruines, choix entre deux passages, rencontre sur un pont, espace de repos et arène finale. La même scène doit permettre de tester déplacements, profondeur, collisions, masquage du héros derrière les décors, indications d'attaque et transitions. Les variantes jour, nuit et événement peuvent réutiliser sa géométrie.

Les décors devront être construits comme des scènes navigables ; les planches restent des cibles visuelles. Les quantités d'EXP, d'or et les chances de récompense imprimées sur les variantes sont des exemples à rapprocher de l'audit économique, pas des nouveaux paramètres approuvés.

## Consultation dans Ellipse

Galerie intégrée : `07_exports/web/targets.html`, avec 21 planches, filtres et agrandissement. Chaque fiche des quatre héros et l'atelier des mouvements pointent vers sa nouvelle cible. L'original reste accessible depuis la vue agrandie.

Traçabilité : `02_production/lot-07/reference-import.json`. Aucune source de l'archive n'a été retouchée.
