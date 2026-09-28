# Règles détaillées et cas limites

Ce document doit pouvoir être traduit en tests sans interprétation créative.

## 1. État du plateau

- Coordonnées physiques exprimées en mètres, origine en haut-centre.
- Largeur logique : 8 m ; hauteur utile : 12 m.
- Ligne de rupture à 2,1 m du haut.
- Maximum : 64 Orbes physiques actives.
- Simulation fixe : 60 Hz PC, 30 ou 60 Hz mobile selon profil.
- Le résultat d’une mission doit être déterministe à seed et entrées identiques.

## 2. Génération

- Le sac contient les rangs 1 à 3.
- Les dix premiers lâchers ne peuvent produire plus de trois rangs 3.
- Le prochain et le suivant sont toujours visibles.
- Une mission peut modifier les poids, jamais cacher la table.
- Aucune dépense ne modifie secrètement la génération.

## 3. Lâcher

- Un lâcher normal crée l’Orbe à la position visée avec vitesse verticale fixe.
- Une charge de 0,2 à 1 seconde augmente masse et vitesse de 0 à 25 %.
- Une correction aérienne dure au maximum 350 ms.
- Délai de base entre deux lâchers : 650 ms.
- Une entrée pendant le délai est mise en buffer pendant 200 ms.

## 4. Fusion

Deux Orbes fusionnent si :

- leur rang est identique ;
- leur distance est inférieure à 92 % de la somme des rayons ;
- leur vitesse relative est inférieure à 13 m/s ;
- aucune des deux n’est verrouillée par un effet.

Résultat :

- les deux entités sont supprimées au même tick ;
- le rang supérieur apparaît au barycentre pondéré ;
- l’impulsion résultante est plafonnée ;
- l’événement `merge` contient rang, position, combo, source et seed ;
- le rang 8 ne fusionne plus : deux Astra déclenchent une Résonance Nexus.

## 5. Fusion parfaite

Trois Orbes identiques participant à la même composante de contact dans une fenêtre
de 120 ms donnent :

- une Orbe de rang +1 ;
- 50 % de dégâts supplémentaires ;
- 20 points de charge à tous les Gardiens ;
- 700 ms de stabilisation de rupture.

La Fusion parfaite prend priorité sur deux fusions séquentielles.

## 6. Combo

- Fenêtre de base : 2,4 s après une fusion.
- Chaque nouvelle fusion incrémente jusqu’à ×8.
- Multiplicateur dégâts : `1 + 0,18 × (combo - 1)`.
- Multiplicateur ressources de mission plafonné à ×2.
- Le combo est suspendu pendant une cinématique, jamais consommé par elle.

## 7. Ligne de rupture

- Une Orbe stable au-dessus de la ligne démarre un compteur de 2,5 s.
- Plusieurs Orbes n’accélèrent pas le compteur.
- Une Orbe qui repasse entièrement sous la ligne réduit le compteur à raison de
  1,5 seconde par seconde.
- À 70 %, UI rouge, vibration et voix d’alerte.
- À 100 %, l’escouade perd un Cœur. Une mission standard possède deux Cœurs.
- Après perte : onde de dégagement, invulnérabilité de 1,2 s, compteur remis à zéro.

## 8. Dégâts

`Dégâts = puissance_rang × attaque_gardien × combo × réaction × critique_contextuel`

- aucun critique aléatoire dans le puzzle principal ;
- un “critique contextuel” vient d’une condition lisible : faiblesse, parade ou
  Fusion parfaite ;
- les résistances ne peuvent réduire sous 35 % ;
- les boss ont une jauge de rupture séparée de la vie.

## 9. Éléments et réactions

| Paire | Réaction | Effet |
|---|---|---|
| Eau + Foudre | Conductivité | chaîne de dégâts et aimantation |
| Feu + Vent | Fournaise | zone ascendante et dégâts continus |
| Lune + Ombre | Éclipse | gel du compteur de rupture |
| Cristal + Son | Résonance | double impulsion de fusion |
| Nature + Eau | Floraison | crée une Orbe de soin/stabilisation |
| Solaire + Vide | Annihilation | forte rupture, recul dangereux |
| Temps + tout | Rémanence | rejoue 40 % du dernier effet |
| Nexus + tout | Accord | charge l’escouade entière |

Une réaction possède un délai interne de 1 seconde par type pour éviter les boucles.

## 10. Gardiens

- Chaque Gardien est jouable à acquisition, sans doublon.
- Niveau 1–60 : statistiques de base.
- Ascension 0–6 : matériaux déterministes.
- Liens 1–5 : narration et cosmétique.
- Constellation 0–5 : doublons ou ressource universelle ; bonus horizontaux,
  jamais correction d’un kit volontairement incomplet.
- Trois actions : attaque de fusion, compétence, ultime.
- Surpuissance : seconde jauge, améliore l’ultime mais ne remplace pas une mécanique.

## 11. Changement de Gardien

- délai global 8 s ;
- impossible pendant 300 ms après dommage ;
- entrée anticipée bufferisée 200 ms ;
- changement parfait dans les 250 ms précédant une attaque : parade et réduction
  du délai de 3 s ;
- le Gardien sortant reste visible et rejoint un point d’attente.

## 12. Victoire et défaite

Victoire lorsque l’objectif primaire est accompli et tous les événements de dégâts
du tick sont résolus. Défaite si :

- tous les Cœurs sont perdus ;
- le chronomètre obligatoire expire ;
- une condition scénarisée explicite échoue.

Une victoire et une défaite simultanées donnent la victoire si le boss atteint
zéro avant la perte du dernier Cœur dans l’ordre déterministe des événements.

## 13. Étoiles de maîtrise

- étoile 1 : victoire ;
- étoile 2 : objectif tactique annoncé ;
- étoile 3 : contrainte de maîtrise annoncée.

Aucune étoile ne dépend d’un personnage gacha précis. Une famille de rôle ou un
élément peut être recommandé, jamais requis sans prêt temporaire.

## 14. Pause, reprise et réseau

- une mission solo se met en pause immédiatement hors focus ;
- snapshot local signé toutes les 10 secondes et à chaque phase ;
- reprise possible pendant 24 h ;
- récompenses confirmées par serveur si connecté ;
- hors ligne : campagne autorisée, achats/invocations/classés interdits ;
- résolution de conflit : inventaire serveur autoritaire, progression maximale
  fusionnée seulement pour les données non économiques.

## 15. Accessibilité

- aucun signal uniquement colorimétrique ;
- taille UI 100/125/150 % ;
- réduction des flashs et secousses ;
- mode maintien ou bascule pour la charge ;
- remapping complet PC ;
- aide de visée optionnelle sans pénalité ;
- difficulté Histoire sans modifier les taux économiques.

