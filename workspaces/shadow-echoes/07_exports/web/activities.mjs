export function seeded(seed=1){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
export function shuffled(items,rng=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function createMemory(rng=Math.random){return {cards:shuffled([0,1,2,3,4,5,0,1,2,3,4,5],rng),open:[],found:[],tries:0,status:'playing'};}
export function flipMemory(s,i){if(s.status!=='playing'||!Number.isInteger(i)||i<0||i>=12||s.open.length===2||s.open.includes(i)||s.found.includes(i))return false;s.open.push(i);if(s.open.length===2){s.tries++;const [a,b]=s.open;if(s.cards[a]===s.cards[b]){s.found.push(a,b);s.open=[];}if(s.found.length===12)s.status='won';else if(s.tries>=24)s.status='lost';}return true;}
export function closeMemory(s){if(s.open.length===2)s.open=[];}
export function toggleRune(board,i){for(const j of [i,i%3>0?i-1:-1,i%3<2?i+1:-1,i-3,i+3])if(j>=0&&j<9)board[j]=!board[j];}
export function createRunes(rng=Math.random){const board=Array(9).fill(true),scramble=shuffled([0,1,2,3,4,5,6,7,8],rng).slice(0,5);for(const i of scramble)toggleRune(board,i);return {board,moves:0,status:'playing'};}
export function pressRune(s,i){if(s.status!=='playing'||!Number.isInteger(i)||i<0||i>8)return false;toggleRune(s.board,i);s.moves++;if(s.board.every(Boolean))s.status='won';else if(s.moves>=20)s.status='lost';return true;}
export function runeHint(board){for(let bits=1;bits<512;bits++){const copy=[...board];for(let i=0;i<9;i++)if(bits&(1<<i))toggleRune(copy,i);if(copy.every(Boolean))return Array.from({length:9},(_,i)=>i).filter(i=>bits&(1<<i));}return [];}
export function createDice(){return {total:0,pot:0,round:1,last:0,status:'playing'};}
export function rollDice(s,rng=Math.random){if(s.status!=='playing')return false;s.last=1+Math.floor(rng()*6);if(s.last===1){s.pot=0;s.round++;}else s.pot+=s.last;if(s.round>6)s.status=s.total>=35?'won':'lost';return true;}
export function bankDice(s){if(s.status!=='playing'||s.pot===0)return false;s.total+=s.pot;s.pot=0;s.round++;if(s.total>=35)s.status='won';else if(s.round>6)s.status='lost';return true;}
export const INGREDIENTS=[{name:'Rose de cendre',icon:'✥',color:'#e77788'},{name:'Sel lunaire',icon:'☽',color:'#cab6ed'},{name:'Racine d’or',icon:'❋',color:'#d4bd77'},{name:'Rosée spectrale',icon:'◆',color:'#85c9cd'}];
export const RECIPES=[{name:'Essence d’éveil',ingredients:[0,2],heat:35},{name:'Baume lunaire',ingredients:[3,1,2],heat:60},{name:'Élixir des Mondes',ingredients:[2,0,3],heat:80}];
export function createAlchemy(){return {recipe:0,chosen:[],errors:0,status:'playing'};}
export function brew(s,heat){if(s.status!=='playing')return false;const r=RECIPES[s.recipe];const ok=s.chosen.length===r.ingredients.length&&s.chosen.every((v,i)=>v===r.ingredients[i])&&Math.abs(heat-r.heat)<=5;s.chosen=[];if(ok)s.recipe++;else s.errors++;if(s.recipe===3)s.status='won';else if(s.errors>=3)s.status='lost';return ok;}
export const EXPEDITION_STEPS=[
 {title:'Les portes d’Azenval',text:'Un pont brisé coupe la vallée. Une patrouille d’ombres garde l’ancien passage.',choices:[{text:'Forcer le passage',hint:'−5 intégrité · +35 trésor',hp:-5,food:0,loot:35},{text:'Suivre la rive',hint:'−2 provisions · passage sûr',hp:0,food:-2,loot:5}]},
 {title:'Le bivouac oublié',text:'Un feu veille encore parmi les pierres. Les réserves des voyageurs reposent à côté.',choices:[{text:'Partager un repas',hint:'−1 provision · +4 intégrité',hp:4,food:-1,loot:0},{text:'Emporter les réserves',hint:'+2 provisions · −2 intégrité',hp:-2,food:2,loot:10}]},
 {title:'La crypte des Veilleurs',text:'Un coffret luit derrière les sceaux. Les gardiens se réveillent.',choices:[{text:'Ouvrir la crypte',hint:'−5 intégrité · +60 trésor',hp:-5,food:0,loot:60},{text:'Déchiffrer les inscriptions',hint:'−2 provisions · +25 trésor',hp:0,food:-2,loot:25}]},
 {title:'Les jardins engloutis',text:'Des fruits pâles poussent autour d’une source. Le retour traverse les hauts remparts.',choices:[{text:'Boire à la source',hint:'+4 intégrité · −1 provision',hp:4,food:-1,loot:0},{text:'Récolter les fruits',hint:'+2 provisions · +10 trésor',hp:0,food:2,loot:10}]},
 {title:'Le dernier rempart',text:'La citadelle apparaît dans la brume. Une dernière ombre barre la route.',choices:[{text:'Combattre et rentrer',hint:'−5 intégrité · +60 trésor',hp:-5,food:0,loot:60},{text:'Passer par les tunnels',hint:'−2 provisions · +25 trésor',hp:0,food:-2,loot:25}]},
];
export function createExpedition(){return {step:0,hp:12,food:5,loot:0,status:'playing'};}
export function choosePath(s,i){if(s.status!=='playing'||![0,1].includes(i))return false;const c=EXPEDITION_STEPS[s.step].choices[i];s.hp=Math.min(12,s.hp+c.hp);s.food+=c.food;s.loot+=c.loot;s.step++;if(s.hp<=0||s.food<0)s.status='lost';else if(s.step===5)s.status='won';return true;}
export function createFishing(){return {phase:'cast',time:0,tension:45,progress:0,catches:0,misses:0,status:'playing',message:'Lancez votre ligne.'};}
export function fishingTap(s){if(s.status!=='playing')return;if(s.phase==='cast'){s.phase='bite';s.time=0;s.message='Ferrez dans la zone dorée.';}else if(s.phase==='bite'){const position=(Math.sin(s.time*2.6)+1)*50;if(position>=35&&position<=65){s.phase='reel';s.tension=45;s.progress=0;s.time=0;s.message='Maintenez la tension entre 25 et 75.';}else{s.misses++;s.phase='cast';s.message='La prise s’est échappée. Relancez.';if(s.misses>=5)s.status='lost';}}}
export function stepFishing(s,dt,holding){if(s.status!=='playing')return;s.time+=dt;if(s.phase==='reel'){s.tension+=dt*(holding?34:-23)+Math.sin(s.time*3)*dt*8;s.progress=Math.max(0,s.progress+dt*(s.tension>=25&&s.tension<=75?18:-8));if(s.tension<=0||s.tension>=100){s.misses++;s.phase='cast';s.message='La ligne a cédé. Relancez.';if(s.misses>=5)s.status='lost';}else if(s.progress>=100){s.catches++;s.phase='cast';s.message='Une âme du lac rejoint votre collection.';if(s.catches===3)s.status='won';}}else if(s.phase==='bite'&&s.time>12){s.misses++;s.phase='cast';s.message='La prise s’est éloignée.';if(s.misses>=5)s.status='lost';}}
export function createAction(mode,bonus={attack:1,health:1},rng=Math.random){return {mode,rng,bonuses:bonus,time:0,spawnAt:.6,attackAt:0,pulseAt:0,clickAt:0,nextId:1,hp:mode==='race'?4:100*bonus.health,maxHp:mode==='race'?4:100*bonus.health,attack:bonus.attack,x:200,y:310,lane:1,enemies:[],coins:0,kills:0,score:0,fx:[],status:'playing',duration:mode==='survival'?60:mode==='caravan'?55:45};}

export function actionClick(s,x,y){if(s.mode!=='caravan'||s.status!=='playing'||s.time<s.clickAt)return false;s.clickAt=s.time+.12;const target=s.enemies.find(e=>e.hp>0&&Math.hypot(x-e.x,y-e.y)<65);if(target){target.hp-=25*s.attack;s.energy=Math.min(100,(s.energy??0)+8);s.pose='attack';s.poseAt=s.time;s.fx.push({kind:'strike',x:target.x,y:target.y,life:.3});return true;}return false;}
export function actionBase(s){if(s.mode==='race'||s.status!=='playing'||s.time<(s.baseAt??0))return false;const target=s.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-s.x,e.y-s.y)<400).sort((a,b)=>Math.hypot(a.x-s.x,a.y-s.y)-Math.hypot(b.x-s.x,b.y-s.y))[0];if(!target)return false;s.baseAt=s.time+.65*(s.bonuses?.cooldown??1);target.hp-=27*s.attack;s.energy=Math.min(100,(s.energy??0)+12+(s.bonuses?.energy??0));s.pose='attack';s.poseAt=s.time;s.fx.push({kind:'bolt',x:s.x,y:s.y,tx:target.x,ty:target.y,life:.4});return true;}
export function actionPower(s,superMode=false){if(s.mode==='race'||s.status!=='playing'||superMode&&(s.energy??0)<100||!superMode&&s.time<s.pulseAt)return false;
 if(superMode)s.energy=0;else s.pulseAt=s.time+8*(s.bonuses?.cooldown??1);s.pose=superMode?'ultimate':'skill';s.poseAt=s.time;const hero=s.heroId??'seraphine',range=superMode?1100:280;
 if(hero==='lysael'){s.hp=Math.min(s.maxHp,s.hp+(superMode?55:25)*s.maxHp/100*(s.bonuses?.healing??1)*(superMode?(s.bonuses?.ultimate??1):1));s.fx.push({kind:'heal',x:s.x,y:s.y,life:1});}
 if(hero==='voren'&&superMode)s.shield=(s.shield??0)+35*(s.bonuses?.shield??1)*(s.bonuses?.ultimate??1);
 for(const e of s.enemies){if(s.mode!=='caravan'&&Math.hypot(e.x-s.x,e.y-s.y)>range)continue;if(hero==='nyxara')e.stunnedUntil=s.time+(superMode?5:3);e.hp-=(hero==='lysael'?(superMode?75:15):superMode?180:60)*s.attack*(superMode?(s.bonuses?.ultimate??1):1);}
 s.fx.push({kind:superMode?'super':'pulse',x:s.x,y:s.y,life:superMode?1.3:.65});return true;
}
export function changeLane(s,delta){if(s.status==='playing'&&s.mode==='race')s.lane=Math.max(0,Math.min(2,s.lane+delta));}
export function stepAction(s,seconds,input={x:0,y:0}){
 if(s.status!=='playing')return;const dt=Math.max(0,Math.min(.05,seconds));s.time+=dt;
 if(s.mode==='survival'){const length=Math.hypot(input.x,input.y)||1;s.x=Math.max(55,Math.min(945,s.x+input.x/length*180*dt));s.y=Math.max(100,Math.min(500,s.y+input.y/length*180*dt));}
 if(s.time>=s.spawnAt){s.spawnAt=s.time+(s.mode==='survival'?Math.max(.55,1.4-s.time*.01):s.mode==='caravan'?1.45:1.15);const lane=Math.floor(s.rng()*3),side=s.rng()<.5;const e={id:s.nextId++,x:s.mode==='survival'?(side?0:1000):1030,y:s.mode==='race'?155+lane*145:140+s.rng()*320,lane,hp:s.mode==='survival'?45:50,speed:s.mode==='race'?260:32+s.rng()*25,lastHit:-5,coin:s.mode==='race'&&s.rng()<.3};s.enemies.push(e);}
 if(s.mode==='survival'&&s.auto!==false)actionBase(s);
 for(const e of s.enemies){if(e.hp<=0||s.time<(e.stunnedUntil??0))continue;if(s.mode==='survival'){const d=Math.hypot(s.x-e.x,s.y-e.y)||1;e.x+=(s.x-e.x)/d*e.speed*dt;e.y+=(s.y-e.y)/d*e.speed*dt;if(d<35&&s.time-e.lastHit>1){const absorbed=Math.min(s.shield??0,11);s.shield=(s.shield??0)-absorbed;s.hp-=11-absorbed;e.lastHit=s.time;}}else {e.x-=e.speed*dt;if(s.mode==='caravan'&&e.x<185){s.hp-=14;e.hp=0;e.breached=true;}if(s.mode==='race'&&Math.abs(e.x-185)<40&&e.lane===s.lane&&!e.touched){e.touched=true;if(e.coin)s.coins++;else s.hp--;}}}
 for(const e of s.enemies)if(e.hp<=0&&!e.breached){s.kills++;s.score+=100;}
 s.enemies=s.enemies.filter(e=>e.hp>0&&e.x>-80);for(const f of s.fx)f.life-=dt;s.fx=s.fx.filter(f=>f.life>0);
 if(s.hp<=0){s.hp=0;s.status='lost';}else if(s.time>=s.duration){s.status='won';s.score+=Math.round(s.hp*10)+s.coins*100;}
}

export function actionPulse(s){return actionPower(s,false);}
