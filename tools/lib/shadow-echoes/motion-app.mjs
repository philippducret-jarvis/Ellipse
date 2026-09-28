import {HEROES} from './heroes.mjs';
import {createRig} from './rig-data.mjs';
import {CLIPS} from './rig-motion.mjs';
import {loadActor} from './rig-renderer.mjs';
const $=id=>document.getElementById(id),art=h=>`../../03_assets/characters/${h.id}/presentation-v1.png`;
let selected=HEROES[0],clip='idle',time=0,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,actor=null,request=0;
const notes={seraphine:'Couronne et visage, continuité de la main jusqu’à la lame, ronces et drapés rouges. L’épée reste proche de sa pose initiale pour limiter l’étirement.',nyxara:'Couronne, paume et orbe, raccord du coude, chaînes et bas de cape. Le corbeau reste attaché à la silhouette ; il n’a pas encore de rig indépendant.',lysael:'Visage et couronne végétale, rigidité du bâton, doigts et drapés ivoire. Les mouvements du bras tenant le bâton restent particulièrement limités.',voren:'Bords de l’armure, raccord de l’épaule, manche et tête de hache, cape. Vérifier que les ornements restent lisibles pendant l’impact.'};
for(const hero of HEROES){const button=document.createElement('button');button.style.setProperty('--accent',hero.accent);button.innerHTML=`<img src="${art(hero)}" alt=""><strong>${hero.name}</strong><small>MYTHIQUE · ${hero.role}</small>`;button.dataset.hero=hero.id;button.setAttribute('aria-label',`Animer ${hero.name}`);button.addEventListener('click',()=>selectHero(hero));$('heroes').append(button);}
for(const [id,def] of Object.entries(CLIPS)){const b=document.createElement('button');b.textContent=def.label;b.dataset.clip=id;b.addEventListener('click',()=>{clip=id;time=0;sync();draw();});$('clips').append(b);}
for(const name of ['root','spine','head','arm','weapon','capeLeft','capeRight','farArm']){const option=document.createElement('option');option.value=name;option.textContent={root:'Ancrage',spine:'Buste',head:'Tête',arm:'Bras principal',weapon:'Arme / main',capeLeft:'Tissu gauche',capeRight:'Tissu droit',farArm:'Second bras'}[name];$('weights').append(option);}
async function selectHero(hero){
  const token=++request;selected=hero;time=0;actor?.destroy();actor=null;
  document.documentElement.style.setProperty('--accent',hero.accent);
  $('reference').src=art(hero);$('fallback').src=art(hero);$('fallback').style.visibility='visible';
  $('hero-name').textContent=hero.name;$('hero-role').textContent=hero.title;$('focus-note').textContent=notes[hero.id];
  $('source-link').href=`../../01_inputs/references/${hero.reference.split('/').map(encodeURIComponent).join('/')}`;
  $('rig-link').href=`../../03_assets/characters/${hero.id}/mesh-rig-v1.json`;
  for(const b of $('heroes').children)b.setAttribute('aria-pressed',String(b.dataset.hero===hero.id));
  $('status').textContent='Chargement du maillage…';
  try {
    const next=await loadActor($('actor-host'),createRig(hero.id),art(hero),{onFallback:lost=>{
      $('fallback').style.visibility=lost?'visible':'hidden';$('status').textContent=lost?'Affichage 3D interrompu : illustration fixe conservée.':'Maillage rétabli.';
    }});
    if(token!==request){next.destroy();return;}
    actor=next;$('fallback').style.visibility='hidden';
    $('status').textContent='Étude en revue · texture originale conservée · aucune validation artistique finale.';
    draw();
  } catch(error){if(token===request)$('status').textContent=`Animation indisponible : ${error.message}. Illustration fixe conservée.`;}
}
function sync(){
  $('toggle').textContent=playing?'Pause':'Lire';$('timeline').max=String(CLIPS[clip].duration);$('timeline').value=String(time);
  $('timecode').textContent=`${time.toFixed(2).replace('.',',')} / ${CLIPS[clip].duration.toFixed(2).replace('.',',')} s`;
  $('motion-label').textContent=CLIPS[clip].label.toUpperCase();
  $('strength-value').textContent=`${Math.round(Number($('strength').value)*100)} %`;
  for(const b of $('clips').children)b.setAttribute('aria-pressed',String(b.dataset.clip===clip));
}
function draw(){actor?.draw(clip,time,Number($('strength').value),{bones:$('bones').checked,wireframe:$('wireframe').checked,weightBone:$('weights').value});sync();}
$('toggle').addEventListener('click',()=>{playing=!playing;sync();});
$('restart').addEventListener('click',()=>{time=0;draw();});
$('step').addEventListener('click',()=>{playing=false;time=Math.min(CLIPS[clip].duration,time+1/30);draw();});
$('timeline').addEventListener('input',()=>{playing=false;time=Number($('timeline').value);draw();});
for(const id of ['strength','bones','wireframe','weights'])$(id).addEventListener('input',draw);
$('checker').addEventListener('change',()=>document.querySelectorAll('.art-stage').forEach(n=>n.classList.toggle('checker',$('checker').checked)));
document.addEventListener('visibilitychange',()=>{if(document.hidden){playing=false;sync();}});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','SELECT','BUTTON','A'].includes(e.target.tagName)){e.preventDefault();playing=!playing;sync();}});
window.addEventListener('pagehide',e=>{if(!e.persisted)actor?.destroy();});
let last=performance.now();
function frame(now){const delta=Math.max(0,Math.min(.1,(now-last)/1000));last=now;if(playing&&actor){time+=delta*Number($('speed').value);if(time>CLIPS[clip].duration){if($('loop').checked)time%=CLIPS[clip].duration;else{time=CLIPS[clip].duration;playing=false;}}draw();}requestAnimationFrame(frame);}
sync();selectHero(selected);requestAnimationFrame(frame);
