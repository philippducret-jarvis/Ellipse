# Orbes d’Astra — Catalogue UI interactif V5

## Objet de cette passe

Cette version transforme la direction artistique validée en interface de jeu navigable. Les écrans ne sont plus considérés comme de simples images : les boutons, onglets, sélections, curseurs, interrupteurs, modales et retours sont des contrôles Godot natifs.

Le gameplay détaillé des trois activités et la boucle de combat finale restent la passe suivante. Les écrans de préparation, d’état et de résultat nécessaires à ces jeux sont déjà présents et reliés.

## Contrat visuel

- Palette : bleu nuit, cyan astral, or, violet et rose.
- Fonds : prologue, observatoire, sanctuaire, Léviathan et magie déjà validés.
- Personnages : portraits haute définition issus du catalogue de 24 gardiens.
- Références exactes conservées : hub PC, combat PC, combat mobile, collection/invocation et sélection des activités.
- Composants natifs : panneaux vitrés, cartes, boutons, jauges, curseurs, interrupteurs, modales et états sélectionnés.
- Responsive : composition horizontale sur PC, empilement vertical et grandes cibles tactiles en portrait.

## Les 31 écrans

### Entrée et hub

1. `title` — continuer, nouvelle partie, accessibilité, paramètres.
2. `onboarding` — initiation en trois étapes, navigation directe et option de passer.
3. `hub_pc` — tous les accès du hub sont reliés.
4. `hub_mobile` — hub compact avec grille tactile et mission prioritaire.

### Campagne et combat

5. `world_map` — six régions sélectionnables, fiche de risque et accès Faille.
6. `mission_brief` — objectifs, puissance, coût, escouade et lancement.
7. `combat_pc` — chambre, compétences et changement de gardien.
8. `combat_mobile` — commandes tactiles dédiées.
9. `boss_phase_3` — avertissement, règles de phase et reprise.
10. `guardian_switch` — trois gardiens comparables et activables.
11. `ultimate` — présentation cinématique et confirmation de l’Ultime.
12. `overdrive` — bonus, durée, jauge et déclenchement de Surpuissance.
13. `victory` — note, étoiles, récompenses et mission suivante.
14. `defeat` — diagnostic, conseil, carte ou nouvel essai.

### Collection

15. `roster` — collection et bannière d’invocation.
16. `guardian_detail` — portrait, statistiques, passif et accès aux sous-systèmes.
17. `equipment` — inventaire sélectionnable, comparaison, équipement et renforcement.
18. `wardrobe` — tenues sélectionnables, éclairages et action Porter.
19. `bond` — souvenir, trois choix de dialogue et progression de lien.

### Invocation et économie

20. `summon_single` — coût, solde, garantie, taux et confirmation ×1.
21. `summon_ten` — aperçu multiple, coût et confirmation ×10.
22. `shop` — tenues, packs et monnaie sans urgence artificielle.
23. `rates_history` — taux, pity, garantie et historique auditables.

### Modes

24. `rift` — route de neuf nœuds, bénédictions et corruption.
25. `rhythm_game` — règles, contrôles, score, test de feedback et lancement.
26. `astral_hunt` — visée, charge, cibles bonus et lancement.
27. `outfit_workshop` — assemblage, rotation, contraintes et lancement.

### Système

28. `settings` — graphismes, audio, commandes, compte, accessibilité et contenu.
29. `accessibility` — taille, contraste, mouvement, sous-titres et alternatives à la couleur.
30. `download_content` — espace, packs, progression et reprise.
31. `network_error` — sauvegarde confirmée, code, nouvel essai et mode hors ligne.

## Navigation principale

```text
Titre
├── Initiation ──> Hub
├── Accessibilité
└── Paramètres

Hub
├── Campagne ──> Carte ──> Briefing ──> Combat ──> Résultat
├── Invocation ──> Collection ──> Détail / Équipement / Tenue / Lien
├── Activités ──> Rythme / Chasse / Atelier
├── Boutique
└── Paramètres ──> Accessibilité / Contenu
```

`Échap` revient vers l’écran parent logique et non systématiquement vers le hub.

## Preuves de validation

- Rapport desktop : `04_runtime/godot/qa/ui-catalog-report.json`
- Captures desktop : `04_runtime/godot/qa/ui-catalog/`
- Rapport portrait : `04_runtime/godot/qa/ui-mobile-report.json`
- Captures portrait : `04_runtime/godot/qa/ui-mobile/`
- Couverture desktop attendue : 31/31.
- Contrôles reliés vérifiés automatiquement : 177.
- Couverture portrait de référence : 12/12 en 941×1672.

## Limite assumée avant la passe gameplay

Les écrans, routes et états sont maintenant exploitables. Les boutons « Lancer » des trois activités valident la préparation du mode, mais ne démarrent pas encore leur boucle de jeu complète. La prochaine passe doit traiter séparément :

1. la boucle de combat et son équilibrage ;
2. le jeu de rythme ;
3. la chasse astrale ;
4. l’atelier des tenues ;
5. les sauvegardes et l’économie persistante.
