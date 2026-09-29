# Nyxara — pipeline Blender du modèle 3D

Modèle 3D jouable de Nyxara (Shadow Echoes), construit par script à partir du maillage
MakeHuman/MPFB (CC0) déjà présent dans le dépôt. Blender 4.0.2+ en arrière-plan, numpy, Mesa/EGL
pour le rendu Workbench. Aucun outil externe n'est nécessaire.

## Chaîne complète

```bash
D=workspaces/orbes-d-astra/03_assets/3d/catalog_v2/diagnostics/mpfb-mira-diagnostic.blend
T=tools/blender/nyxara
O=/tmp/nyx     # dossier de travail

# 1. carte du rig d'origine (os -> articulations du corps)         (une seule fois, déjà fournie : rig_map.json)
blender -b -P $T/rig_map.py -- $D $T/rig_map.json

# 2. corps féminin complet + articulations transformées
blender -b -P $T/body_lab.py -- $D $T/params_body_v5.json $O/body      # -> body_body.blend, body_landmarks.json

# 3. tête, costume, tissus, accessoires, rig, pose héroïque, rendus
blender -b -P $T/nyx_build.py -- $O/body_body.blend $O/nyx $T/params_build_final.json   # Cycles (~10 min)
blender -b -P $T/nyx_build.py -- $O/body_body.blend $O/nyx $T/params_build_preview.json # Workbench (~15 s)

# 4. export jeu : GLB LOD0/1/2, 12 animations, rapport
blender -b -P $T/nyx_export.py -- $O/nyx_full.blend $O/nyx_joints.json $O/export

# 5. contrôle des GLB (relecture)
blender -b -P $T/glb_check.py -- $O/export/nyxara_lod0.glb $O/export/nyxara_lod1.glb $O/export/nyxara_lod2.glb
```

## Fichiers

| Fichier | Rôle |
|---|---|
| `body_lab.py` | macros MakeHuman féminines, proportions par sections, membres lissés, export des 125 articulations |
| `nyx_build.py` | tête (yeux, maquillage, couronne, cheveux en rubans) + costume + tissus + rig + pose + rendus |
| `nyx_costume.py` | coques issues du corps, treillis d'or, tissus paramétriques, transfert de poids |
| `nyx_rig.py` | armature 55 os (nommage UE) rattachée aux articulations, poses par visée, talons cuits |
| `nyx_export.py` | purge, fusion en 8 meshes, 12 animations procédurales, LOD0/1/2, rapport |
| `rig_map.json` | hiérarchie et ancrage des os sur les articulations |
| `glb_check.py` | relit les GLB et compte meshes, os, clips, triangles |
