/** Lot 3A: versioned design/simulation rules. Not applied to the existing local wallet. */
export const FOUNDATION={version:'bible-v1-review-1',status:'simulation-only',heroes:['seraphine','nyxara','lysael','voren'],maxHeroLevel:100,ascensionCaps:[20,40,60,80,100],finalAscension:'mastery-at-100',team:{controlled:1,companions:3,supportsInFirstLot:0,supportsLater:2},animationStatesPerHero:42,combat:{simulationHz:60,basicCombo:3,activeSlots:3,ultimateGauge:100,classEnergy:100,dodgeCharges:2,dodgeRechargeSeconds:5,dodgeInvulnerabilitySeconds:.22},energy:{cap:120,regenerationMinutes:8},summoning:{cost:160,softStart:66,softIncrement:.04,hardPity:80,epicPity:10,featuredChance:.5,carryPolicy:'same-banner-family',realPayments:false}};
export const HERO_COSTS=[
 {cap:20,gold:20000,xp:8000,essences:10,stones:0},
 {cap:40,gold:80000,xp:30000,essences:25,stones:5},
 {cap:60,gold:250000,xp:90000,essences:60,stones:15},
 {cap:80,gold:700000,xp:250000,essences:120,stones:35},
 {cap:100,gold:1800000,xp:700000,essences:250,stones:75}
];
export function heroCostTotal(count=1){return Object.fromEntries(['gold','xp','essences','stones'].map(k=>[k,HERO_COSTS.reduce((n,row)=>n+row[k],0)*count]));}
export function invocationRates({mythicDry=0,epicDry=0}={}){
 if(!Number.isInteger(mythicDry)||mythicDry<0||mythicDry>79||!Number.isInteger(epicDry)||epicDry<0||epicDry>9)throw Error('Compteur de garantie invalide');
 const attempt=mythicDry+1,mythic=attempt===80?1:Math.min(1,.012+Math.max(0,attempt-65)*.04),scale=(1-mythic)/.988;
 const rates={common:.408*scale,rare:.33*scale,epic:.18*scale,legendary:.07*scale,mythic};
 if(epicDry===9){rates.common=0;rates.rare=0;const sum=rates.epic+rates.legendary+rates.mythic;for(const k of ['epic','legendary','mythic'])rates[k]/=sum;}
 return rates;
}
export function simulateInvocation(state,roll,featuredRoll=.5){
 if(!Number.isFinite(roll)||roll<0||roll>=1||!Number.isFinite(featuredRoll)||featuredRoll<0||featuredRoll>=1)throw Error('Tirage hors intervalle');
 const rates=invocationRates(state);let cumulative=0,rarity='mythic';for(const [rank,p]of Object.entries(rates)){cumulative+=p;if(roll<cumulative){rarity=rank;break;}}
 const mythic=rarity==='mythic',epic=['epic','legendary','mythic'].includes(rarity),featured=mythic&&(state.featuredGuaranteed===true||featuredRoll<.5);
 return {rarity,featured,rates,state:{mythicDry:mythic?0:(state.mythicDry??0)+1,epicDry:epic?0:(state.epicDry??0)+1,featuredGuaranteed:mythic?!featured:state.featuredGuaranteed===true}};
}
/** Exact finite-state distribution: includes the ten-pull guarantee, not a base-rate shortcut. */
export function firstMythicDistribution(){
 let states=new Map([['0,0',1]]);const distribution=[];
 for(let pull=1;pull<=80;pull++){const next=new Map();let found=0;for(const [key,mass]of states){const [mythicDry,epicDry]=key.split(',').map(Number),r=invocationRates({mythicDry,epicDry});found+=mass*r.mythic;for(const [k,p]of Object.entries(r)){if(k==='mythic'||!p)continue;const e=['epic','legendary'].includes(k)?0:epicDry+1,key2=`${mythicDry+1},${e}`;next.set(key2,(next.get(key2)??0)+mass*p);}}distribution.push({pull,probability:found});states=next;}
 return {distribution,mean:distribution.reduce((n,r)=>n+r.pull*r.probability,0),totalProbability:distribution.reduce((n,r)=>n+r.probability,0)};
}
