export const MAX_LEVEL=30;
export const levelCap=hero=>10+(hero.ascension??0)*10;
export const xpRequired=level=>100+(level-1)*35;
export const talentBudget=hero=>1+Math.floor((hero.level-1)/2)+(hero.ascension??0)*2;
export const talentSpent=hero=>Object.values(hero.talents??{}).reduce((a,b)=>a+b,0);
export const availablePoints=hero=>talentBudget(hero)-talentSpent(hero);
const NAMES={
 seraphine:['Ronces acérées','Danse écarlate','Requiem souverain','Racines tenaces','Rose protectrice','Serment de vie','Sève de l’abîme','Floraison rapide','Écho des roses'],
 nyxara:['Orbe affamé','Vol des corbeaux','Silence absolu','Voile de minuit','Couronne du Néant','Trône immortel','Sang des ombres','Éclipse vive','Appel du vide'],
 lysael:['Racines anciennes','Souffle des feuilles','Chant éternel','Écorce sacrée','Jardin des âmes','Monde préservé','Rosée vivante','Harmonie fluide','Grâce de l’aube'],
 voren:['Tranchant de braise','Marche impériale','Empire éternel','Cuirasse de cendre','Rempart du roi','Cœur volcanique','Feu régénérant','Décret ardent','Rage souveraine']
};
const DEFS=[
 ['edge','Puissance','⚔','attack',.04,1,null,0],['rhythm','Puissance','✦','energy',1,5,'edge',0],['apex','Puissance','✥','ultimate',.08,10,'rhythm',1],
 ['roots','Protection','♜','health',.05,1,null,0],['ward','Protection','◇','shield',.1,5,'roots',0],['endure','Protection','♥','health',.07,10,'ward',1],
 ['bloom','Maîtrise','❋','healing',.08,1,null,0],['flow','Maîtrise','☽','cooldown',.03,5,'bloom',0],['echo','Maîtrise','✧','energy',2,10,'flow',1]
];
export function talentsFor(heroId){return DEFS.map(([id,branch,icon,stat,value,level,parent,ascension],i)=>{if(id==='ward'&&['seraphine','nyxara'].includes(heroId)){stat='health';value=.04;}if(id==='bloom'&&heroId==='seraphine'){stat='attack';value=.025;}if(id==='bloom'&&heroId==='voren'){stat='health';value=.03;}return {id,branch,icon,stat,value,level,parent,ascension,max:3,name:NAMES[heroId][i]};});}
export function talentEffect(t,rank=1){const value=t.value*rank;return t.stat==='attack'?`+${Math.round(value*100)} % dégâts`:t.stat==='health'?`+${Math.round(value*100)} % vie`:t.stat==='healing'?`+${Math.round(value*100)} % soins`:t.stat==='shield'?`+${Math.round(value*100)} % boucliers`:t.stat==='ultimate'?`+${Math.round(value*100)} % puissance du super`:t.stat==='cooldown'?`−${Math.round(value*100)} % recharge des actions`:`+${value} énergie par action génératrice`;}
export function talentCheck(hero,heroId,id){const t=talentsFor(heroId).find(t=>t.id===id);if(!t)return {ok:false,reason:'Talent inconnu'};if((hero.talents[t.id]??0)>=t.max)return {ok:false,reason:'Rang maximal'};if(hero.level<t.level)return {ok:false,reason:`Niveau ${t.level} requis`};if(hero.ascension<t.ascension)return {ok:false,reason:`Ascension ${t.ascension} requise`};if(t.parent&&(hero.talents[t.parent]??0)<2)return {ok:false,reason:'Talent précédent : rang 2 requis'};if(availablePoints(hero)<1)return {ok:false,reason:'Un point de talent requis'};return {ok:true,reason:'Déverrouiller · 1 point'};}
export function talentStats(hero,heroId){const out={attack:0,health:0,healing:0,shield:0,cooldown:0,energy:0,ultimate:0};for(const t of talentsFor(heroId))out[t.stat]+=(hero.talents?.[t.id]??0)*t.value;return out;}
export function grantHeroXP(hero,amount){const before=hero.level;hero.xp=Math.min(10000000,(hero.xp??0)+Math.max(0,Math.round(amount)));while(hero.level<levelCap(hero)&&hero.xp>=xpRequired(hero.level)){hero.xp-=xpRequired(hero.level);hero.level++;}return hero.level-before;}
export function ascensionCost(hero){const next=(hero.ascension??0)+1;return {gold:300*next,fragments:40*next,essence:3*next};}
export function ascensionCheck(profile,id){const h=profile.heroes[id];if(!h)return {ok:false,reason:'Héros inconnu'};if(h.ascension>=2)return {ok:false,reason:'Ascension maximale'};if(h.level<levelCap(h))return {ok:false,reason:`Atteignez le niveau ${levelCap(h)}`};const cost=ascensionCost(h);if(profile.gold<cost.gold||h.fragments<cost.fragments||profile.essence<cost.essence)return {ok:false,reason:'Ressources insuffisantes'};return {ok:true,reason:'Accomplir l’ascension'};}
