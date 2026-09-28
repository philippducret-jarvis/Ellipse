export const SLOTS={weapon:'Arme',armor:'Armure',accessory:'Accessoire'};
export const EQUIPMENT=[
 {id:'roseblade',name:'Rapière du Serment',slot:'weapon',hero:'seraphine',index:0,attack:.06,health:0,price:0,source:null,desc:'Une rose gravée dans un acier écarlate.'},
 {id:'nightstaff',name:'Sceptre du Voile',slot:'weapon',hero:'nyxara',index:1,attack:.06,health:0,price:0,source:null,desc:'Un fragment de nuit veille dans le cristal.'},
 {id:'dawnstaff',name:'Branche de l’Aube',slot:'weapon',hero:'lysael',index:2,attack:.06,health:0,price:0,source:null,desc:'Le bois vivant protège sa dernière lumière.'},
 {id:'emberaxe',name:'Hache des Cendres',slot:'weapon',hero:'voren',index:3,attack:.06,health:0,price:0,source:null,desc:'La braise n’a jamais quitté son tranchant.'},
 {id:'veilrobe',name:'Tunique des Échos',slot:'armor',index:4,attack:.02,health:.08,price:180,source:'expedition',desc:'Une étoffe tissée de souvenirs.'},
 {id:'watchplate',name:'Cuirasse des Veilleurs',slot:'armor',index:5,attack:0,health:.14,price:240,source:'survival',desc:'Des plaques noires, un serment intact.'},
 {id:'redcloak',name:'Voile des Ombres',slot:'armor',index:6,attack:.05,health:.06,price:220,source:'caravan',desc:'La cape écarlate des routes oubliées.'},
 {id:'bloodring',name:'Anneau du Sang éternel',slot:'accessory',index:7,attack:.08,health:0,price:180,source:'dice',desc:'Le rubis répond au battement du porteur.'},
 {id:'echoheart',name:'Cœur d’Échos',slot:'accessory',index:8,attack:.03,health:.08,price:240,source:'campaign',desc:'Un éclat d’étoile arraché à la faille.'}
];
export const RITUALS=[
 {id:1,name:'Appel',cost:1,fragments:20,duration:4200,description:'Le sceau s’ouvre. Une silhouette répond.'},
 {id:2,name:'Résonance',cost:2,fragments:45,duration:6000,description:'Deux cercles se rejoignent. Le voile se déchire.'},
 {id:3,name:'Convergence',cost:3,fragments:75,duration:7800,description:'La constellation s’aligne. Le Mythique se manifeste.'}
];
export const ENEMIES=[
 {name:'Veilleur du seuil',role:'Sentinelle · cible unique',color:'#ce6977',attack:'Frappe du serment',rule:'Désigne un héros, puis frappe après 2,2 s. Placez la garde avant l’impact.',hp:4400},
 {name:'Cantatrice du Néant',role:'Spectre · attaque de groupe',color:'#b994f4',attack:'Litanie du vide',rule:'Charge pendant 2 s puis touche les quatre héros. Interrompez avec Nyxara ou protégez et soignez l’équipe.',hp:7200},
 {name:'Gardien Cendrelame',role:'Gardien · fureur à 50 %',color:'#f39855',attack:'Jugement de cendre',rule:'Alterne frappe ciblée et onde de groupe. Sous 50 % de vie, inflige 30 % de dégâts supplémentaires.',hp:15000}
];
