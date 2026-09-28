# Direction artistique et maquettes

## Signature visuelle

**Baroque astronomique sensuel** : instruments scientifiques en laiton, architecture
gothique élancée, ciel profond bleu pétrole, magie cyan, violet améthyste et or
chaud. Les personnages sont éclairés comme des bijoux vivants, avec peau douce,
yeux brillants, matières très lisibles et silhouettes couture.

La référence n’est pas la planche 2D existante en tant qu’asset ; elle sert seulement
à identifier palette, visage et costume. La cible finale est un rendu 3D stylisé
cohérent vu sous plusieurs angles.

## Principes

1. Silhouette lisible à 48 px.
2. Un matériau dominant et un accent lumineux par personnage.
3. Trois profondeurs visibles dans chaque lieu.
4. HUD sombre et translucide, jamais opaque sur plus de 25 % de l’écran.
5. Texte français lisible sans dépendre d’une image générée.
6. VFX courts pour les actions fréquentes, cinématiques réservées aux ultimes.
7. Aucun étirement d’image ; `contain`, crop artistique ou caméra 3D.

## Palette

| Usage | Couleur |
|---|---|
| Fond profond | `#050711` |
| Surface | `#111529` |
| Cyan interaction | `#67E8F9` |
| Or récompense | `#F6C768` |
| Violet magie | `#A78BFA` |
| Rose désir/rare | `#F472B6` |
| Rouge danger | `#FB7185` |
| Texte principal | `#FFF4DC` |
| Texte secondaire | `#A9A4B8` |

## Caméras

### Hub PC

- plan large 16:9, Gardien entier au tiers droit ;
- profondeur réelle, caméra orbitale limitée ±8° ;
- navigation spatiale entre lieux ;
- panneaux UI dans la zone gauche, sans recouvrir le visage.

### Hub mobile

- buste/mi-cuisse, cadrage vertical ;
- accès principal en bas ;
- monnaie discrète en haut ;
- animation tactile du Gardien sans déplacer les boutons.

### Combat

- PC : arène 3D en arrière, plateau central 9:16 sans cadre de téléphone ;
- mobile : boss et télégraphies dans les 22 % supérieurs, plateau sous lui ;
- changement de Gardien accompagné d’un travelling de 250 ms maximum ;
- caméra n’effectue jamais de roulis pendant la physique.

## Écrans à maqueter avant code

1. titre et reprise ;
2. onboarding en trois écrans ;
3. hub PC et hub mobile ;
4. carte des régions ;
5. briefing de mission ;
6. combat normal PC/mobile ;
7. combat boss phase 3 ;
8. changement de Gardien ;
9. ultime et Surpuissance ;
10. résultats/victoire/défaite ;
11. roster, fiche, équipement, tenue, relation ;
12. invocation simple et multiple ;
13. boutique, taux, historique et pity ;
14. Faille roguelite ;
15. trois activités secondaires ;
16. paramètres, accessibilité et remapping ;
17. téléchargement de contenu et erreur réseau.

Le manifeste `manifests/ui-screens.json` porte dimensions, états et critères.

## Animation UI

- navigation : 180–240 ms ;
- ouverture panneau : 160 ms ;
- carte rare : 700–1 200 ms, skippable ;
- invocation ×10 : révélation accélérable après la première lecture ;
- réduction des mouvements : fondu simple ≤ 120 ms ;
- aucun bouton d’achat ne bouge, pulse ou change de position pour provoquer un clic.

## Maquettes

Les PNG dans `mockups/` sont des **références de composition**. Ils ne doivent pas
être intégrés directement au runtime. Le texte final, les icônes et composants
sont reconstruits dans le moteur avec une grille et des tokens.

Le sous-dossier `mockups/wireframes/` contient le contrat UX exhaustif :
31 écrans déclinés en PC, mobile et variante accessible, soit 93 SVG. La galerie
`mockups/wireframes/index.html` permet de les relire sans lancer le moteur. Ces
wireframes valident les flux et la hiérarchie ; ils ne remplacent ni les modèles
3D, ni les textures, ni le lighting final.

Pour chaque maquette :

- source prompt dans `mockups/PROMPTS.md` ;
- résolution cible et device ;
- annotations dans `mockups/annotations/` ;
- variante accessible ;
- décision `approved`, `revise` ou `rejected`.

## Audio-visuel

- une fusion possède attaque, relâchement et impact ;
- les huit rangs utilisent une gamme ascendante cohérente ;
- le Gardien prononce une ligne courte à combo ×5 et à Surpuissance ;
- la musique ajoute une couche par phase de boss ;
- vibration : 20 ms fusion, double 30 ms Fusion parfaite, rampe danger.
