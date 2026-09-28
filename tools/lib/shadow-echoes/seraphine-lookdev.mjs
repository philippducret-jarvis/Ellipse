const compare=document.getElementById('compare');
const candidate=document.getElementById('candidate');
const buttons=Object.fromEntries(['candidate-v1','candidate-v2','full','combat','backdrop','windup','attack','play'].map(id=>[id,document.getElementById(id)]));
const base='../../03_assets/characters/seraphine/lookdev/';
const versions={v1:{idle:'seraphine-front-cutout-v1.png',windup:'seraphine-basic-windup-key-v1.png',attack:'seraphine-basic-attack-key-v2.png'},v2:{idle:'seraphine-front-cutout-v2.png',windup:'seraphine-basic-windup-key-v2.png',attack:'seraphine-basic-attack-key-v3.png'}};
const poseLabels={idle:'en attente',windup:'préparant son attaque de base',attack:'frappant avec son épée'};
let current='idle',version='v2',timers=[];
function showPose(pose){current=pose;candidate.src=base+versions[version][pose];candidate.alt=`Séraphine ${poseLabels[pose]}, étude ${version==='v2'?'B':'A'}`;candidate.dataset.pose=pose;candidate.dataset.version=version;buttons.windup.setAttribute('aria-pressed',String(pose==='windup'));buttons.attack.setAttribute('aria-pressed',String(pose==='attack'));}
function stopPlayback(){timers.forEach(clearTimeout);timers=[];}
function setVersion(next){stopPlayback();version=next;for(const key of ['v1','v2'])buttons[`candidate-${key}`].setAttribute('aria-pressed',String(key===version));document.getElementById('combat-link').href=`./tactics.html?seraphine=lookdev-${version}`;showPose('idle');}
function setScale(combat){compare.classList.toggle('combat',combat);buttons.full.setAttribute('aria-pressed',String(!combat));buttons.combat.setAttribute('aria-pressed',String(combat));document.getElementById('mode-note').textContent=combat?'Lisibilité à taille de combat':'Revue de silhouette à taille atelier';}
buttons.full.addEventListener('click',()=>setScale(false));
buttons.combat.addEventListener('click',()=>setScale(true));
buttons.backdrop.addEventListener('click',()=>{const on=compare.classList.toggle('game');buttons.backdrop.setAttribute('aria-pressed',String(on));});
buttons['candidate-v1'].addEventListener('click',()=>setVersion('v1'));
buttons['candidate-v2'].addEventListener('click',()=>setVersion('v2'));
buttons.windup.addEventListener('click',()=>{stopPlayback();showPose(current==='windup'?'idle':'windup');});
buttons.attack.addEventListener('click',()=>{stopPlayback();showPose(current==='attack'?'idle':'attack');});
buttons.play.addEventListener('click',()=>{stopPlayback();showPose('idle');timers=[setTimeout(()=>showPose('windup'),150),setTimeout(()=>showPose('attack'),570),setTimeout(()=>showPose('idle'),1110)];});
candidate.addEventListener('error',()=>{document.getElementById('mode-note').textContent='Image de Séraphine introuvable';});
showPose('idle');
