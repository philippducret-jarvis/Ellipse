export const TARGET_ROOT='../../01_inputs/references/transformations-2026-09-25/';
export const HERO_TARGETS={
 seraphine:'02_Transformation_Seraphine/03_modele_final_2_5D.png',
 nyxara:'04_Transformation_10_Mythiques/03_Nyxara.png',
 lysael:'04_Transformation_10_Mythiques/08_Lysael.png',
 voren:'04_Transformation_10_Mythiques/07_Voren.png'
};
export const TARGET_BOARDS=[
 {id:'seraphine-final',name:'Séraphine · cible de production',group:'Premiers héros',file:HERO_TARGETS.seraphine,note:'Vues, costume décomposé, arme et poses clés.'},
 ...[['nyxara','Nyxara'],['lysael','Lysael'],['voren','Voren']].map(([id,name])=>({id,name,group:'Premiers héros',file:HERO_TARGETS[id],note:'Fiche individuelle de référence : identité, matières, vues et gestes.'})),
 ...[['01_Astrae','Astrae'],['02_Ragnar','Ragnar'],['04_Solmira','Solmira'],['05_Caelum','Caelum'],['06_Eirlys','Eirlys'],['09_Zareth','Zareth'],['10_Ophelia','Ophélia']].map(([file,name])=>({id:file,name,group:'Catalogue Mythiques',file:`04_Transformation_10_Mythiques/${file}.png`,note:'Cible de personnage pour l’extension du catalogue.'})),
 {id:'interface',name:'Fiche de personnage · direction visuelle',group:'Interface',file:'03_Transformation_Interface/avant_apres_interface_mythiques.png',note:'Structure conservée, finitions gothiques, portrait vivant et informations hiérarchisées.'},
 ...[['01_planche_exploratoire','Exploration initiale'],['02_comparaison_niveaux_et_personnages','Comparaison et intégration'],['03_variations_et_jeu','Variations de niveaux'],['04_variantes_jeu','Pont, ruines et sanctuaire'],['05_explorations_visuelles','Forêt, citadelle et sommet'],['06_environnement_et_integration','Environnement et intégration']].map(([file,name])=>({id:file,name,group:'Niveaux 2,5D',file:`05_Transformation_Niveaux/${file}.png`,note:'Cible de cadrage, profondeur et ambiance. Les noms et récompenses exploratoires ne remplacent pas les règles du jeu.'})),
 ...[['01_recherches_initiales','Séraphine · recherches'],['02_approfondissement_concept_art','Séraphine · approfondissement'],['04_pipeline_visuel_detaille','Séraphine · étapes de production']].map(([file,name])=>({id:file,name,group:'Recherches',file:`02_Transformation_Seraphine/${file}.png`,note:'Itération conservée pour suivre la construction du design.'}))
];
