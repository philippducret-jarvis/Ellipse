# Audit gameplay, fidélité visuelle et potentiel commercial

Date de l'état audité : 17 juillet 2026. Cet audit porte sur les workspaces, les planches, les assets, les manifests, les runtimes et les rapports QA présents dans le dépôt. Il ne constitue pas une certification commerciale.

## Verdict

Le portefeuille contient trois priorités désormais jouables dans des runtimes spécialisés : `Orbes d'Astra`, `Veloria — Veille des Lames` et `Echoes of the Mushroom Realm`. Aucun des trois ne doit toutefois être déclaré « identique à la planche » sur la seule foi des rapports automatiques : la comparaison perceptuelle des captures finales et la validation sur appareil restent des gates humaines.

Ces trois jeux sont protégés contre le copieur Forge générique. Leurs seules voies de production autorisées sont respectivement `pnpm orbes:build`, `pnpm veloria:hd` et `pnpm echoes:hd`.

## État après refonte des trois priorités

Les constats historiques détaillés plus bas expliquent l'origine des défauts. À l'issue de cette intervention, les trois priorités ont été reconstruites et leurs anciennes voies de livraison génériques ne sont plus autoritaires.

### Orbes d'Astra

- `MergeDropEngine` est l'unique moteur du livrable ; `index.html` et `preview.html` sont désormais strictement identiques et n'ajoutent aucun chrome Forge/preview.
- Le hub Observatoire a été recomposé en interface céleste chaleureuse : Gardien actif, navigation sigillaire, monnaies, verrerie et hiérarchie visuelle mobile. Le Sanctuaire et le Reliquaire disposent de véritables portails, halos, particules et révélations de cartes.
- Les douze Gardiens alimentent désormais les portraits des orbes dans une grille 4×3 ; les astres respirent, oscillent et conservent leur lisibilité pendant les chutes, fusions et cascades.
- Nexus, résultat, relance tactile, monnaie, essence, doublons, pity, sélection de Gardien et sauvegarde sont exécutables.
- La simulation est déterministe à 60, 30 et 20 FPS ; 16 tests Orbes et le build navigateur passent.

### Veloria

- `VeloriaEngine` Pixi est l'unique runtime flagship déclaré par `workspace.json`, l'export et le Studio. Les métadonnées Forge/Canvas concurrentes ont été retirées du manifest principal.
- Les captures de planche complètes sont classées `golden reference`, avec `runtimeEligible: false`. Aucun fond, HUD ou acteur intégré n'est chargé en jeu.
- Les six fonds 720×1280 proviennent des six vignettes canoniques « PLAN 3 LANES », sans titre ni HUD incrusté. Les crops Auréline, Morgane et Bourreau viennent des deux planches gameplay.
- La boucle comprend trois voies, douze vagues, 180 secondes, déplacement discret/tactile, attaque auto, trois compétences, ultime, combo, gardes, six bénédictions effectives, six hazards et boss à phases.
- Le hub, l'invocation, les bénédictions, la victoire et la défaite ont été réécrits. Le HUD reproduit vague/chrono, barre de boss, compétences/ultime, combo et PV, avec une composition tactile droite fidèle aux planches.
- Le moteur ajoute télégraphes de voie, arcs d'attaque, impacts, esquive, bouclier, zone d'écho, aura et flash d'ultime. Les pools d'ennemis ne sont plus reconstruits à chaque frame et les échelles de sprites restent stables.
- Le gate flagship passe `7/7` : URL principale, bundle, sources autorisées, contrat GDL, six fonds HD, atlas/audio présents et absence d'asset intégré. La suite ciblée passe les 24 tests Veloria.

### Echoes of the Mushroom Realm

- L'ancien runtime Forge a été remplacé par `EchoesEngine`, un platformer Pixi spécialisé, piloté par une simulation déterministe et un GDL dédié.
- Le menu canonique, le playfield 4096×720, le héros, les ennemis, le boss, les plateformes et les contrôles tactiles sont chargés depuis les assets propres reconstruits à partir des planches.
- Course, respiration, attaque, esquive, traînées, impacts, spores et animation du boss sont calculés par frame ; le build embarque ses bindings audio et ses chemins d'assets spécialisés.
- L'export est recréé atomiquement, `workspace.json` pointe uniquement vers ce runtime, le gate statique passe `13/13` et les 10 tests Echoes passent.

### Ellisphere et ses agents

- L'assistant du projet s'appelle exclusivement `Ellisphere` dans le serveur, le chat, le Studio, le lanceur et la documentation active.
- Ellisphere découvre les workspaces modernes et expose six outils : portefeuille, état runtime, état qualité, itération protégée, état des agents et connexions.
- Chaque priorité reçoit un manifeste `ellisphere-team.json` avec cellules producteur, direction artistique, animation, gameplay, UI, QA et release, fichiers critiques, commandes de reconstruction, contrôles et handoffs.
- Le smoke Ellisphere passe, les trois jeux sont marqués `operational` par la synchronisation des agents et toute déclaration `commercial_ready` reste interdite sans gates humaines.

### Limite de certification

Le moteur du navigateur intégré n'était pas disponible dans cette session. Les exports, URLs, assets, contrats runtime, typechecks et simulations ont été vérifiés, mais aucune nouvelle golden screenshot composée ni validation sur appareil réel n'a pu être certifiée ici. Le statut honnête est donc `playable_hd`, pas « identique certifié » ni `commercial_ready`. La signature G3–G5 reste humaine et bloquante.

## Inventaire réel

Les comptes ci-dessous portent sur les fichiers image des workspaces, copies générées comprises.

| Priorité | Jeu | Planches de référence | Images | Runtime observé | État honnête |
|---:|---|---:|---:|---|---|
| P0 | Orbes d'Astra | 2 masters + assets HD dérivés | variable | `MergeDropEngine`, export unique | `playable_hd`, certification visuelle restante |
| P0 | Veloria : La Veille des Lames | 14 | 698 | `VeloriaEngine` Pixi, export unique | `playable_hd`, gate statique 7/7 |
| P0 | Echoes of the Mushroom Realm | 12 | 175 | `EchoesEngine` Pixi, export unique | `playable_hd`, gate statique 13/13 |
| P2 | Seraphine : La Citadelle des Cendres | 0 canonique | 24 | Forge générique | Fidélité impossible à certifier sans cible |
| P3 | Neon Kage : Protocole Zero | 0 canonique | 24 | Forge générique | Prototype, fidélité impossible à certifier |

Les workspaces représentent environ 1 900 fichiers : Veloria à lui seul en contient 1 394 (environ 161,5 Mo), Echoes 425 (environ 117 Mo), Orbes 20 (environ 13,2 Mo), Seraphine 51 et Neon Kage 51. Ces workspaces sont majoritairement ignorés par Git ; une livraison reproductible exige donc un manifest d'assets versionné avec checksums et provenance.

## Constats historiques avant refonte

### Orbes d'Astra

- La boucle merge-drop, les cascades, les pouvoirs, l'invocation, la pitié et la sauvegarde existent dans le moteur spécialisé.
- Le contenu livré reste une seule scène/vertical slice. Le GDD le dit explicitement : équilibrage longue durée, audio final, accessibilité complète et certification stores restent requis avant vente.
- Les deux images maîtres portent presque toute l'identité visuelle. Il faut encore démontrer la fidélité de chaque état interactif, pas seulement du fond et du roster.

### Veloria

- `workspace.json` pointe la preview principale vers `05_runtime/index.html`, tandis que l'export spécialisé est relégué en `legacy_preview_url` sous `07_exports/web/preview.html`. Deux vérités de runtime coexistent.
- Le GDL de preview et l'assembleur HD ne sont pas au même niveau de version ; l'export web spécialisé est incomplet ou périmé par rapport aux assets générés.
- La normalisation de chemins observée retire `03_assets` de certaines URLs. Dix-neuf entrées d'atlas deviennent ainsi des références invalides.
- Des assets dits runtime sont encore des crops de planche : le sprite de combat d'Aureline (`200 × 280`) contient des éléments de composition/UI, et un fond d'arène (`720 × 1280`) conserve titre et flou de la planche. Ce ne sont pas des sprites/fonds propres à composer.
- Le contrôle IoU actuel compare principalement l'alpha à `128 × 192`. Deux images opaques de contenu différent peuvent obtenir `1,0` ; ce score ne prouve donc aucune fidélité perceptuelle.
- Le rapport shipping contient une contradiction interne entre un total nul et `29/29` réussites. Il ne peut pas servir de gate de release.

### Echoes et jeux génériques

- Echoes possède assez de planches pour lancer une reconstruction fidèle, mais le héros, les arrière-plans, les échelles et les chemins du runtime générique ne reproduisent pas la composition des boards.
- Les collisions, objectifs et télégraphes ne sont pas dérivés des volumes visibles de la planche.
- Seraphine et Neon Kage n'ont pas de planche canonique dans leur workspace. Aucun score « identique » n'est possible avant validation d'une cible.

## Ordre de validation restant

1. **P0 — validation finale Orbes/Veloria/Echoes** : golden screenshots composées, comparaison côte à côte, tactile, audio et performance sur appareils réels.
2. **P0 — contenu et équilibrage** : playtests longue durée, courbes de difficulté, économie, rétention et accessibilité.
3. **P2 — Seraphine** : faire approuver une planche canonique avant toute production HD.
4. **P3 — Neon Kage** : même gate de référence, puis décider s'il reste un prototype ou devient un produit.

Les prototypes techniques hors de cette liste ne doivent pas être présentés comme des jeux commerciaux.

## Gates de fidélité perceptuelle

Les seuils suivants sont des seuils initiaux. Ils doivent être calibrés sur des paires « accepté/refusé » validées par la direction artistique ; une métrique automatique seule ne prouve jamais l'identité visuelle.

### G0 — Référence canonique

- Une planche source approuvée, versionnée, avec checksum, résolution, ratio et zones dynamiques déclarées.
- Une carte de provenance pour chaque crop : rectangle source, masque, transformation, destination et licence.
- Aucune génération, substitution ou image fallback non approuvée dans un build candidat.

### G1 — Registration et composition

- Captures au viewport exact de la planche avant comparaison.
- Erreur médiane des points d'ancrage critiques `≤ 2 px` à la résolution de référence et percentile 95 `≤ 5 px`.
- Silhouette, horizon, lignes de fuite, safe zones UI et centres d'intérêt dans les tolérances approuvées.
- Aucun texte, cadre ou élément UI de la planche incrusté par erreur dans un sprite ou un fond.

### G2 — Similarité d'image

- `SSIM ≥ 0,95` sur les zones statiques alignées.
- `LPIPS ≤ 0,08` sur la scène et sur les crops critiques héros/ennemi/UI.
- Écart couleur `ΔE2000` médian `≤ 3`, percentile 95 `≤ 8` sur les zones de palette contrôlées.
- IoU de contours/silhouettes `≥ 0,90` pour les acteurs critiques. Un IoU d'alpha seul est interdit comme preuve finale.
- Les zones animées sont comparées à un frame de référence déterministe ou masquées par une règle versionnée, jamais ignorées manuellement au cas par cas.

### G3 — Vérité runtime

- Matrice de captures obligatoire : titre, hub, tutoriel, gameplay nominal, pouvoir, boss, récompense et échec ; portrait mobile et desktop lorsque supportés.
- Pour Veloria : une capture certifiée par arène et par état de combat critique. Pour Orbes : pile vide, première fusion, cascade, pouvoir, ligne de perte, Nexus et invocation.
- `100 %` des URLs d'assets résolues, aucun 404, aucun placeholder, aucune divergence entre preview Studio et export livré.
- Diff perceptuel exécuté sur les captures produites par le build candidat, pas sur les assets sources isolés.

### G4 — Mouvement, lisibilité et appareil

- Pas de jitter de caméra, crop instable, flicker ou saut de scale entre frames ; frame pacing p95 dans le budget de la plateforme cible.
- Hitboxes et collisions superposées aux silhouettes approuvées ; télégraphes lisibles sur écran réel.
- Validation tactile, contraste, taille des textes, réduction des mouvements et test sur appareils représentatifs.

### G5 — Décision humaine et release

- Revue côte à côte et overlay par la direction artistique, plus playtest humain des états capturés.
- Échec bloquant si une scène critique manque, si une URL casse, si un fallback apparaît ou si un seuil G1–G4 échoue.
- Le statut « identique à la cible » n'est accordé qu'après validation automatique **et** signature humaine ; « jouable » ou « HD » ne sont pas des synonymes.

## Gates de produit vendable

Une candidate commerciale doit également passer : boucle comprise en moins de 30 secondes, physique stable à plusieurs pas de simulation, action/feedback/échec/récompense réellement exécutés, sauvegarde et économie explicables, divulgation des taux/pitié/doublons, accessibilité, tests automatiques, playtests humains, performance appareils, localisation, audio final et conformité stores.

## Garde-fous d'exploitation

- `pnpm portfolio:plan` : affiche priorités, protections et preflight ; aucune écriture.
- `pnpm portfolio:test` : teste l'invariant des trois priorités et le dry-run.
- `pnpm portfolio:rebuild` : exige explicitement `--apply` et ne cible que les runtimes génériques hors priorités.
- `pnpm orbes:build` : seule voie autorisée pour Orbes.
- `pnpm veloria:hd` : seule voie autorisée pour la reconstruction HD de Veloria.
- `pnpm echoes:hd` : seule voie autorisée pour la reconstruction HD d'Echoes.
- `pnpm ellisphere:sync-agents` : régénère les équipes spécialisées et vérifie leurs fichiers critiques.

Une sélection directe de `orbes-d-astra`, `veloria-veille-des-lames` ou `echoes-of-the-mushroom-realm` dans le reconstructeur générique échoue avant toute lecture-modification-écriture du workspace.
