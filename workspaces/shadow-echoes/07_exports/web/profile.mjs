import {levelCap,xpRequired,grantHeroXP,talentCheck,talentStats,talentBudget,talentSpent,talentsFor,ascensionCheck,ascensionCost} from './progression.mjs';
import {HEROES} from './heroes.mjs';
import {MODES,RELICS,QUESTS} from './citadel-data.mjs';
import {EQUIPMENT,SLOTS,RITUALS} from './edition-data.mjs';
export const PROFILE_KEY='shadow-echoes:citadel:v1';
const int=(v,max=10000000)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
export function newProfile(){return {version:1,progressionVersion:2,essence:0,gearRanks:{},gold:400,sigils:4,xp:0,selected:'seraphine',heroes:Object.fromEntries(HEROES.map(h=>[h.id,{level:1,xp:0,ascension:0,talents:{},copies:1,fragments:0,relic:null,gear:{weapon:EQUIPMENT.find(e=>e.hero===h.id).id,armor:null,accessory:null}}])),equipment:EQUIPMENT.filter(e=>e.hero).map(e=>e.id),relics:[],modes:{},summons:0,history:[],claimed:[],active:null,settings:{sound:false,motion:true},revision:0};}
export function parseProfile(raw){
 try{const p=typeof raw==='string'?JSON.parse(raw):structuredClone(raw);if(!p||p.version!==1||!int(p.gold)||!int(p.sigils)||!int(p.xp)||!int(p.summons)||!int(p.revision)||!HEROES.some(h=>h.id===p.selected))return null;
  if(!Array.isArray(p.relics)||new Set(p.relics).size!==p.relics.length||p.relics.some(id=>!RELICS.some(r=>r.id===id)))return null;
  if(!p.heroes||Array.isArray(p.heroes)||Object.keys(p.heroes).length!==HEROES.length||Object.keys(p.heroes).some(id=>!HEROES.some(h=>h.id===id)))return null;
  const equipped=[];for(const h of HEROES){const v=p.heroes?.[h.id];if(!v||!int(v.level,30)||v.level<1||!int(v.copies)||v.copies<1||!int(v.fragments)||v.relic!==null&&!p.relics.includes(v.relic))return null;if(v.relic)equipped.push(v.relic);}if(new Set(equipped).size!==equipped.length)return null;
  if(!p.modes||typeof p.modes!=='object'||Array.isArray(p.modes))return null;for(const [id,v]of Object.entries(p.modes)){if(!MODES.some(m=>m.id===id)||!v||!int(v.wins)||!int(v.best)||!int(v.attempts)||v.attempts<v.wins)return null;}
  if(!Array.isArray(p.claimed)||new Set(p.claimed).size!==p.claimed.length||p.claimed.some(id=>!QUESTS.some(q=>q.id===id))||!Array.isArray(p.history)||p.history.length>20)return null;
  p.history=p.history.filter(id=>HEROES.some(h=>h.id===id));
  if(p.active&&(!MODES.some(m=>m.id===p.active.mode)||typeof p.active.id!=='string'||!p.active.id||p.active.id.length>100||!p.modes[p.active.mode]))return null;
  // Additive migration: old edition carnets keep every resource and reward.
  if(p.equipment===undefined){p.equipment=EQUIPMENT.filter(e=>e.hero||p.modes[e.source]?.wins>0).map(e=>e.id);for(const h of HEROES)p.heroes[h.id].gear={weapon:EQUIPMENT.find(e=>e.hero===h.id).id,armor:null,accessory:null};}
  if(!Array.isArray(p.equipment)||new Set(p.equipment).size!==p.equipment.length||p.equipment.some(id=>!EQUIPMENT.some(e=>e.id===id)))return null;
  const worn=[];for(const h of HEROES){const gear=p.heroes[h.id].gear;if(!gear||typeof gear!=='object'||Object.keys(gear).length!==3)return null;for(const slot of Object.keys(SLOTS)){const id=gear[slot];if(id===null)continue;const item=EQUIPMENT.find(e=>e.id===id);if(!item||item.slot!==slot||item.hero&&item.hero!==h.id||!p.equipment.includes(id))return null;worn.push(id);}}if(new Set(worn).size!==worn.length)return null;
  if(p.progressionVersion===undefined){p.progressionVersion=2;p.essence=0;p.gearRanks={};for(const h of Object.values(p.heroes)){h.xp=0;h.ascension=0;h.talents={};}}
  if(p.progressionVersion!==2||!int(p.essence)||!p.gearRanks||typeof p.gearRanks!=='object'||Array.isArray(p.gearRanks))return null;
  for(const [id,rank] of Object.entries(p.gearRanks))if(!p.equipment.includes(id)||!int(rank,3))return null;
  for(const h of HEROES){const v=p.heroes[h.id];if(!int(v.xp)||!int(v.ascension,2)||v.level>levelCap(v)||!v.talents||typeof v.talents!=='object'||Array.isArray(v.talents)||talentSpent(v)>talentBudget(v))return null;const nodes=talentsFor(h.id);for(const [id,rank] of Object.entries(v.talents)){const t=nodes.find(t=>t.id===id);if(!t||!int(rank,3)||rank<1||v.level<t.level||v.ascension<t.ascension||t.parent&&(v.talents[t.parent]??0)<2)return null;}}
  if(p.active?.heroes&&(!Array.isArray(p.active.heroes)||p.active.heroes.length<1||new Set(p.active.heroes).size!==p.active.heroes.length||p.active.heroes.some(id=>!p.heroes[id])))return null;
  p.settings={sound:p.settings?.sound===true,motion:p.settings?.motion!==false};return p;
 }catch{return null;}
}
export function readProfile(storage){let raw;try{raw=storage.getItem(PROFILE_KEY);const p=parseProfile(raw);return {profile:p??newProfile(),recovered:!!raw&&!p,unavailable:false};}catch{return {profile:newProfile(),recovered:false,unavailable:true};}}
export function saveProfile(storage,p){try{p.revision++;storage.setItem(PROFILE_KEY,JSON.stringify(p));return true;}catch{return false;}}
export function beginRun(p,mode,id){if(!MODES.some(m=>m.id===mode)||typeof id!=='string'||!id||id.length>100)throw new Error('Épreuve inconnue');p.active={id,mode,heroes:mode==='campaign'?HEROES.map(h=>h.id):[p.selected]};const s=p.modes[mode]??={wins:0,best:0,attempts:0};s.attempts++;return p.active;}
export function finishRun(p,id,won,score=0){
 if(!p.active||p.active.id!==id)return null;const mode=MODES.find(m=>m.id===p.active.mode),s=p.modes[mode.id],participants=p.active.heroes??(mode.id==='campaign'?HEROES.map(h=>h.id):[p.selected]);p.active=null;
 if(!won)return {won:false,gold:0,sigils:0,xp:0,relic:null};
 const first=s.wins===0;s.wins++;s.best=Math.max(s.best,Math.round(Math.min(10000000,Math.max(0,Number(score)||0))));
 const reward={won:true,first,gold:first?mode.gold:Math.round(mode.gold*.35),sigils:first?1:0,xp:first?100:25,relic:first?mode.relic??null:null};
 p.gold+=reward.gold;p.sigils+=reward.sigils;p.xp+=reward.xp;if(reward.relic&&!p.relics.includes(reward.relic))p.relics.push(reward.relic);
 reward.essence=mode.id==='campaign'?2:1;p.essence+=reward.essence;reward.heroXP={};const heroXP=mode.id==='campaign'?220:mode.id==='survival'?160:mode.id==='expedition'?120:80;for(const id of participants){const levels=grantHeroXP(p.heroes[id],heroXP);reward.heroXP[id]={amount:heroXP,levels,level:p.heroes[id].level};}
 reward.equipment=[];for(const item of EQUIPMENT)if(item.source===mode.id&&!p.equipment.includes(item.id)){p.equipment.push(item.id);reward.equipment.push(item.id);}return reward;
}
export function summon(p,roll,tier=1){const ritual=RITUALS.find(r=>r.id===tier);if(!ritual||p.sigils<ritual.cost||!Number.isFinite(roll)||roll<0||roll>=1)return null;const hero=HEROES[Math.floor(roll*HEROES.length)];p.sigils-=ritual.cost;p.summons++;p.heroes[hero.id].copies++;p.heroes[hero.id].fragments+=ritual.fragments;p.history.unshift(hero.id);p.history=p.history.slice(0,20);return hero.id;}
export function buySigil(p){if(p.gold<150)return false;p.gold-=150;p.sigils++;return true;}
export function upgradeHero(p,id){const hero=p.heroes[id];if(!hero||hero.level>=levelCap(hero))return false;const cost=hero.level*100;if(p.gold<cost||hero.fragments<20)return false;p.gold-=cost;hero.fragments-=20;grantHeroXP(hero,Math.max(0,xpRequired(hero.level)-hero.xp));return true;}
export function ascendHero(p,id){if(!ascensionCheck(p,id).ok)return false;const h=p.heroes[id],cost=ascensionCost(h);p.gold-=cost.gold;h.fragments-=cost.fragments;p.essence-=cost.essence;h.ascension++;grantHeroXP(h,0);return true;}
export function learnTalent(p,heroId,id){const h=p.heroes[heroId];if(!h||!talentCheck(h,heroId,id).ok)return false;h.talents[id]=(h.talents[id]??0)+1;return true;}
export function resetTalents(p,id){if(!p.heroes[id])return false;p.heroes[id].talents={};return true;}
export function enhanceItem(p,id){if(!p.equipment.includes(id))return false;const rank=p.gearRanks[id]??0,cost=60*(rank+1);if(rank>=3||p.gold<cost)return false;p.gold-=cost;p.gearRanks[id]=rank+1;return true;}

export function equipRelic(p,heroId,relicId){if(!p.heroes[heroId]||relicId!==null&&!p.relics.includes(relicId))return false;for(const hero of Object.values(p.heroes))if(hero.relic===relicId)hero.relic=null;p.heroes[heroId].relic=relicId;return true;}
export function equipItem(p,heroId,slot,itemId){const hero=p.heroes[heroId],item=EQUIPMENT.find(e=>e.id===itemId);if(!hero||!SLOTS[slot]||itemId!==null&&(!item||item.slot!==slot||item.hero&&item.hero!==heroId||!p.equipment.includes(itemId)))return false;for(const h of Object.values(p.heroes))if(h.gear?.[slot]===itemId)h.gear[slot]=null;hero.gear[slot]=itemId;return true;}
export function buyItem(p,id){const item=EQUIPMENT.find(e=>e.id===id);if(!item||p.equipment.includes(id)||p.gold<item.price)return false;p.gold-=item.price;p.equipment.push(id);return true;}
export function heroBonuses(p,id){const h=p.heroes[id],r=RELICS.find(r=>r.id===h.relic),t=talentStats(h,id),gear=Object.values(h.gear??{}).map(id=>EQUIPMENT.find(e=>e.id===id)).filter(Boolean),sum=stat=>gear.reduce((n,e)=>n+e[stat]*(1+(p.gearRanks?.[e.id]??0)*.3),0);return {attack:Math.min(2,1+(h.level-1)*.03+(h.ascension??0)*.05+(r?.stat==='attack'?r.value/100:0)+sum('attack')+t.attack),health:Math.min(2,1+(h.level-1)*.04+(h.ascension??0)*.05+(r?.stat==='health'?r.value/100:0)+sum('health')+t.health),healing:1+t.healing,shield:1+t.shield,cooldown:Math.max(.7,1-t.cooldown),energy:t.energy,ultimate:1+t.ultimate};}

export function questProgress(p,q){return q.type==='wins'?Object.values(p.modes).reduce((n,s)=>n+s.wins,0):q.type==='summons'?p.summons:q.type==='relics'?p.relics.length:Object.values(p.modes).filter(s=>s.wins>0).length;}
export function claimQuest(p,id){const q=QUESTS.find(q=>q.id===id);if(!q||p.claimed.includes(id)||questProgress(p,q)<q.target)return false;p.claimed.push(id);p.gold+=q.gold;p.sigils+=q.sigils;return true;}
