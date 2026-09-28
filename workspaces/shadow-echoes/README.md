# Shadow Echoes — projet Ellipse

## Direction active au 28 septembre 2026

Deux campagnes témoins sont accessibles depuis la [Citadelle](http://localhost:4273/workspaces/shadow-echoes/07_exports/web/citadel.html). Le [Pont des Serments](http://localhost:4273/workspaces/shadow-echoes/07_exports/web/ruins.html) conserve le combat d'action et la vue trois quarts. L'[expédition tactique](http://localhost:4273/workspaces/shadow-echoes/07_exports/web/tactics.html) teste désormais quatre rangs opposés par camp, le tour par tour, les échanges de place, les compétences conditionnées par le rang et les embranchements sans retour. Sa vue principale utilise les illustrations détourées en pied et les gardiens existants ; « Voir étude 3D » ouvre un pont et des combattants en volume encore au stade de prototype. Elle dispose d'une sauvegarde séparée et ne verse pas de récompenses au carnet. Le [cadrage de comparaison](http://localhost:4273/workspaces/shadow-echoes/07_exports/web/ruins.html?camera=tactical) reste disponible dans le Pont. La [proposition de direction](00_brief/documents/17_campagne_theatre_tactique_2026_09_27.md), l'[état réel de la tranche](00_brief/documents/18_tranche_tactique_et_assets_hd_2026_09_28.md) et le [jalon des quatre rangs](00_brief/documents/20_formation_quatre_rangs_et_seraphine_v2_2026_09_28.md) distinguent les règles validées du travail artistique restant.

L'[atelier de contrôle des GLB](http://localhost:4273/workspaces/shadow-echoes/07_exports/web/asset-lab.html) compare le modèle animé à la fiche artistique et donne accès aux feuilles HD face/profil/dos/trois quarts de chaque Mythique. Ses boutons « Rig skinné de Séraphine », « Étude Séraphine V2 » et « Visage et costume V3 » comparent les candidats. Le [V3](00_brief/documents/21_preview_plein_ecran_et_seraphine_surface_v3_2026_09_28.md) ajoute des surfaces visage/corset à UV et cartes PBR, avec vue rapprochée et échelle de combat ; il reste une **revue artistique non approuvée**. Le [rapport des anciens GLB](02_production/lot-08/hero-asset-gate.json) reste valable pour leurs fichiers `volume-v1` : 42 clips chacun, aucune peau pondérée.

La [revue Séraphine V4.1 et décor en volume](00_brief/documents/22_silhouette_seraphine_et_decor_volume_2026_09_28.md) ajoute coiffure, coiffe et étoffes skinnées, ainsi qu'une arène dotée d'un pont et de piliers 3D avec pierre PBR, bannières et éclairage animé. La cité distante est encore un panorama. Le résultat demeure **un candidat non approuvé** : il ne rejoint pas la qualité des planches, et les autres Mythiques attendent la validation de Séraphine. Comparaison : [atelier V4.1](http://localhost:4273/workspaces/shadow-echoes/07_exports/web/asset-lab.html?hero=seraphine&model=groom) et [combat V4.1](http://localhost:4273/workspaces/shadow-echoes/07_exports/web/tactics.html?seraphine=groom-v4-1).

Après cette revue, la méthode a changé : la [comparaison Séraphine 2,5D](http://localhost:4273/workspaces/shadow-echoes/07_exports/web/seraphine-lookdev.html) confronte deux études à la planche d'origine. Leurs PNG conservent toutefois un halo rouge et gris. La [nouvelle revue rapprochée du combat](http://localhost:4273/workspaces/shadow-echoes/07_exports/web/tactics.html?seraphine=lookdev-v6&camera=seraphine) utilise directement les pixels de la planche originale pour l'attente de face et la préparation de trois quarts ; une frappe générée depuis cette planche complète la séquence. Trois masques retirent le halo et cette version est chargée par défaut dans la vue 2,5D. Les [études C](http://localhost:4273/workspaces/shadow-echoes/07_exports/web/tactics.html?seraphine=lookdev-v3), [B](http://localhost:4273/workspaces/shadow-echoes/07_exports/web/tactics.html?seraphine=lookdev-v2), [A](http://localhost:4273/workspaces/shadow-echoes/07_exports/web/tactics.html?seraphine=lookdev-v1) et les anciens modèles restent accessibles. Les ennemis gardent leurs portraits artistiques. La finition du masque et la continuité anatomique de la frappe restent en revue ; aucun personnage n'est encore un modèle articulé de qualité cible. Le [dossier de méthode](00_brief/documents/23_changement_methode_seraphine_reference_25d_2026_09_28.md), le [bilan de l'étude B](00_brief/documents/24_etude_b_seraphine_et_gardiens_25d_2026_09_28.md) et la [revue des masques](00_brief/documents/25_masques_seraphine_et_integration_combat_2026_09_28.md) détaillent le travail restant.

Une [étude des calques animés](00_brief/documents/26_calques_animes_seraphine_2026_09_29.md) est disponible en [preview V8](http://localhost:4273/workspaces/shadow-echoes/07_exports/web/tactics.html?seraphine=lookdev-v8&camera=seraphine) : cheveux et pans extérieurs bougent indépendamment en attente. Le [cadrage portrait](http://localhost:4273/workspaces/shadow-echoes/07_exports/web/tactics.html?seraphine=lookdev-v8&camera=portrait) grossit les raccords pour les contrôler. La V6 reste la version par défaut jusqu'à validation des contours et des poses.

Deuxième lot jouable d’un RPG gothique : hub central, quatre Mythiques, dix activités, trois gardiens, trois rituels d’invocation, neuf équipements, six reliques, arbres de talents, XP et ascensions. Section créée le 23 septembre 2026 à partir des trois archives fournies par l’utilisateur.

## Accès dans Ellipse

Ouvrir Ellipse, puis « Mes projets → Shadow Echoes ». Les onglets Documents, Assets et Workspace donnent accès au cadrage et aux références. Actualiser le Studio si celui-ci était déjà ouvert.

Le lien « Entrer dans la Citadelle — lot 2 » et le bouton « Jouer la preview » ouvrent le hub. La preview intégrée d'Ellipse dispose désormais de **Plein écran**, **Ouvrir à part** et **Échap** pour sortir du mode agrandi. Accès principal : [Citadelle](http://localhost:4273/workspaces/shadow-echoes/07_exports/web/citadel.html). L'ancienne épreuve à positions fixes reste disponible comme prototype historique ; le hub présente côte à côte la campagne d'action et l'expédition tactique.

Le lien « Atelier des mythiques — lot 01 » conserve l’accès aux bases HD, au comparateur et au banc de compétences. Le serveur autonome sur le port 4314 donne aussi accès à ces pages.

Le lien « Atelier du mouvement — lot 03 » ouvre la [revue des rigs](http://localhost:4273/workspaces/shadow-echoes/07_exports/web/motion.html) : quatre héros, huit clips, ralenti, chronologie et inspection des articulations. Les études de mouvement sont raccordées aux compétences du combat.

## Deuxième lot

Fiches : Infos, Équipement, Talents, Ascension et Compétences. Niveaux 1–30, deux ascensions et sauvegardes antérieures conservées. Guide complet : `00_brief/documents/09_lot_2_gardiens_et_progression.md`. Preuves et prompts : `02_production/lot-06/`. Les animations sont hybrides (maillages, calques, profondeur et effets) ; la finition des rigs anatomiques et la fidélité finale restent en revue.

## Contenu

- `00_brief/documents/` : présentation, proposition de conception, direction artistique et faisabilité technique.
- `01_inputs/references/partie-1` à `partie-3` : 155 images originales et le fichier LISEZ_MOI, conservés sans modification.
- `01_inputs/reference-index.json` : inventaire, provenance, dimensions et empreintes SHA-256.
- `03_assets/registry/studio-asset-catalog.json` : références consultables dans le Studio, au statut concept.
- `workspace.json` : inscription au catalogue de projets Ellipse.
- `03_assets/characters/` : quatre bases PNG HD, définitions de héros et rapports techniques.
- `02_production/lot-01/` : manifeste du lot, critères de fidélité et prompts de génération.
- `07_exports/web/heroes.html` : atelier des mythiques, généré par `pnpm shadow:lot01`.

## État réel

Le lot 05 relie les scènes en une première édition jouable : hub, dix premiers niveaux gagnables, quatre Mythiques animés, invocations à monnaie de jeu, fragments, élévation, six reliques avec bonus, quêtes, sauvegarde locale et export/import. Les dix parcours ont été gagnés au travers de leurs commandes dans le navigateur. La finition artistique et les animations anatomiques finales restent en production. Détail dans [le dossier de première édition](00_brief/documents/08_premiere_edition.md).

Le lot 01 livre quatre bases HD et douze compétences. Le lot 02 les intègre dans une épreuve en trois phases avec garde, interruptions, soins, boucliers, ultimes, victoire/défaite, bilan sauvegardé et décor HD. Le lot 03 ajoute quatre rigs **2D** par maillage pondéré, un atelier de revue et des réactions de combat. Ils déforment les illustrations entières avec des amplitudes limitées ; ils ne sont pas des peaux de personnages 3D. Les calques anatomiques séparés et les animations finales restent à produire. Les 155 références ne constituent pas 155 assets prêts pour le moteur ni 155 personnages distincts.

L’utilisateur a autorisé le premier lot et fixé la qualité des designs fournis comme cible, avec les seuls héros mythiques pour commencer. Les textes des images restent des références de conception. Les règles de compétences sont des propositions de prototype. Les bases HD sont au statut revue, sans validation automatique de fidélité.

## Commandes

- `pnpm shadow:citadel` : reconstruire toute la première édition et son entrée principale.
- `node tools/audit-shadow-echoes-hero-assets.mjs` : contrôler la peau, les maillages et les clips des quatre GLB ; `--enforce` renvoie une erreur tant que la cible de livraison n'est pas atteinte.
- `pnpm shadow:verify-citadel` : vérifier hub, économie, sauvegarde et six mini-jeux.
- `node tools/verify-shadow-echoes-adventures.mjs` : terminer les trois jeux d’action et la campagne dans le navigateur.
- `node tools/package-shadow-echoes-citadel.mjs` : assembler l’édition portable avec lanceur Node.js.
- `pnpm shadow:layers` : reconstruire l’étude de calques de Séraphine et vérifier les PNG.
- `pnpm shadow:verify-layers` : vérifier l’assemblage, les commandes et l’affichage mobile.
- `pnpm shadow:lot01` : vérifier les ressources et reconstruire l’atelier.
- `pnpm shadow:trial` : reconstruire l’épreuve et son entrée preview Ellipse.
- `pnpm shadow:motion` : reconstruire aussi l’atelier, les rigs et leur QA.
- `pnpm shadow:serve` : ouvrir le serveur local sur le port 4314.
- `pnpm shadow:test` : vérifier les règles du banc et du combat.
- `pnpm shadow:verify-trial` : vérifier le parcours complet de l’épreuve dans le navigateur.
- `pnpm shadow:verify-motion` : vérifier le rendu des rigs et leur raccord au combat.

Le détail des livrables et du travail restant est dans [le dossier du lot 01](00_brief/documents/04_mythiques_lot_01.md) et [le dossier de l’épreuve](00_brief/documents/05_epreuve_des_mythiques.md).

Le [lot 04](00_brief/documents/07_calques_seraphine.md) intègre les calques V2 de Séraphine dans le combat : épaulière mobile retirée, bras/épée indépendant et gestes distincts. Un atelier compare V1/V2 et le maître HD ; une option du combat revient au maillage. La finition du raccord, la fidélité des détails et les articulations du coude, du poignet et du torse restent à produire. Les trois autres Mythiques conservent leurs rigs du lot 03.
