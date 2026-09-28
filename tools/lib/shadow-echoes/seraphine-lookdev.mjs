const compare=document.getElementById('compare');
const candidate=document.getElementById('candidate');
const buttons=Object.fromEntries(['full','combat','backdrop','windup','attack','play'].map(id=>[id,document.getElementById(id)]));
const base='../../03_assets/characters/seraphine/lookdev/';
const poses={idle:['seraphine-front-cutout-v1.png','Séraphine en attente'],windup:['seraphine-basic-windup-key-v1.png','Séraphine préparant son attaque de base'],attack:['seraphine-basic-attack-key-v2.png','Séraphine frappant avec son épée']};
let current='idle',timers=[];
function showPose(pose){current=pose;candidate.src=base+poses[pose][0];candidate.alt=poses[pose][1];candidate.dataset.pose=pose;buttons.windup.setAttribute('aria-pressed',String(pose==='windup'));buttons.attack.setAttribute('aria-pressed',String(pose==='attack'));}
function stopPlayback(){timers.forEach(clearTimeout);timers=[];}
function setScale(combat){compare.classList.toggle('combat',combat);buttons.full.setAttribute('aria-pressed',String(!combat));buttons.combat.setAttribute('aria-pressed',String(combat));document.getElementById('mode-note').textContent=combat?'Lisibilité à taille de combat':'Revue de silhouette à taille atelier';}
buttons.full.addEventListener('click',()=>setScale(false));
buttons.combat.addEventListener('click',()=>setScale(true));
buttons.backdrop.addEventListener('click',()=>{const on=compare.classList.toggle('game');buttons.backdrop.setAttribute('aria-pressed',String(on));});
buttons.windup.addEventListener('click',()=>{stopPlayback();showPose(current==='windup'?'idle':'windup');});
buttons.attack.addEventListener('click',()=>{stopPlayback();showPose(current==='attack'?'idle':'attack');});
buttons.play.addEventListener('click',()=>{stopPlayback();showPose('idle');timers=[setTimeout(()=>showPose('windup'),150),setTimeout(()=>showPose('attack'),570),setTimeout(()=>showPose('idle'),1110)];});
candidate.addEventListener('error',()=>{document.getElementById('mode-note').textContent='Image de Séraphine introuvable';});
