import {createBattleStage,actionPose} from './stage-effects.mjs';
import {loadVolumeActor} from './hero-actor-3d.mjs';
import {ENEMIES} from './edition-data.mjs';
import {HEROES} from './heroes.mjs';
import {PHASES, SAVE_KEY, createBattle, startBattle, nextPhase, battleCanCast, useSkill, guard, togglePause, advance, readRecord, victoryRecord} from './battle.mjs';
import {MotionPlayer} from './rig-renderer.mjs';
import {readProfile,newProfile,heroBonuses} from './profile.mjs';

const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString('fr-FR');
const time = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
const art = h => `../../03_assets/characters/${h.id}/presentation-v1.png`;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const citadelRun=new URLSearchParams(location.search).get('citadelRun');
function freshBattle(){let profile;try{profile=readProfile(localStorage).profile;}catch{profile=newProfile();}return createBattle(Object.fromEntries(HEROES.map(h=>[h.id,heroBonuses(profile,h.id)])));}
let state = freshBattle(), selected = HEROES[0], lastEvent = 0, shownStatus = '', record = null;
let audioContext, soundEnabled = false, lastTone = 0;
try {record = readRecord(localStorage.getItem(SAVE_KEY));} catch {}
const stage=createBattleStage($('arena'));
const members = new Map(), fighters = new Map(), skills = [];
const actors = new Map(), motions = new Map(HEROES.map(h => [h.id,new MotionPlayer()]));
let motionEnabled = !reducedMotion.matches, endingTime = 0;
let disposed=false;
function resetMotion() {for (const motion of motions.values()) motion.reset(); endingTime = 0;}
function text(id, value) {if ($(id).textContent !== value) $(id).textContent = value;}
function feedback(message) {text('feedback', message);}
function savedText() {
  text('saved-record', record ? `Sceau des Quatre obtenu · ${record.victories} victoire${record.victories > 1 ? 's' : ''} · Record ${time(record.bestTime)} · ${record.bestSurvivors}/4 survivants` : 'Première victoire : débloquez le Sceau des Quatre dans votre carnet local.');
}
PHASES.forEach((phase, index) => {
  const li = document.createElement('li');
  li.innerHTML = `<b>0${index + 1}</b>${phase.name}`;
  $('journey').append(li);
});
HEROES.forEach(h => {
  const member = document.createElement('button');
  member.className = 'member'; member.style.setProperty('--hero-color', h.accent);
  member.setAttribute('aria-label', `Commander ${h.name}`);
  member.innerHTML = `<img src="${art(h)}" alt=""><div><strong>${h.name}</strong><small></small><div class="healthbar"><i></i></div><div class="healthbar energybar"><i></i></div></div>`;
  member.addEventListener('click', () => select(h));
  $('team').append(member); members.set(h.id, member);
  const fighter = document.createElement('button');
  fighter.className = 'fighter'; fighter.style.setProperty('--hero-color', h.accent);
  fighter.setAttribute('aria-label', `Sélectionner ${h.name} sur le terrain`);
  fighter.innerHTML = `<img src="${art(h)}" alt="${h.name}"><span class="fighter-name">${h.name}</span>`;
  fighter.addEventListener('click', () => select(h));
  $('fighters').append(fighter); fighters.set(h.id, fighter);
  const source = fighter.querySelector('img');
  loadVolumeActor(fighter,h.id,{facing:-.28,onFallback:lost=>{
    source.style.visibility=lost?'visible':'hidden';fighter.dataset.motion=lost?'fallback':'ready';
    fighter.dataset.renderer='volume-3d';
  }}).then(actor=>{
    if(disposed){actor.destroy();return;}
    actors.set(h.id,actor);source.style.visibility='hidden';fighter.dataset.motion='ready';
    fighter.dataset.renderer='volume-3d';
  }).catch(()=>{fighter.dataset.motion='fallback';});
});
$('layers-mode').parentElement.hidden=true;
for (let i = 0; i < 3; i++) {
  const button = document.createElement('button');
  button.className = `skill${i === 2 ? ' ultimate' : ''}`;
  button.innerHTML = `<span class="key">${i + 1} · ${['ATTAQUE DE BASE','COMPÉTENCE','SUPER'][i]}</span><strong></strong><p></p><small></small>`;
  button.addEventListener('click', () => castSelected(i));
  $('skills').append(button); skills.push(button);
}
function select(h) {
  selected = h;
  document.documentElement.style.setProperty('--accent', h.accent);
  text('selected-name', h.name); text('selected-role', h.role);
  h.skills.forEach((s, i) => {
    skills[i].querySelector('strong').textContent = s.name;
    skills[i].querySelector('p').textContent = s.description;
  });
  render();
}
function castSelected(index) {
  const skill = selected.skills[index];
  const result = useSkill(state, selected.id, skill.id);
  feedback(result.ok ? `${selected.name} · ${skill.name}${result.restored ? ` · +${fmt(result.restored)} PV rendus` : ''}` : result.reason);
  update();
}
function takeGuard() {
  feedback(guard(state) ? 'Garde active : dégâts réduits pendant 3 secondes.' : 'Garde indisponible pour le moment.');
  update();
}
function pause() {togglePause(state); render();}
function reset() {
  state = freshBattle(); state.auto = $('auto').checked;
  resetMotion();
  lastEvent = 0; shownStatus = ''; $('vfx').replaceChildren();
  if ($('result').open) $('result').close();
  savedText(); render(); $('briefing').showModal();
}
function tone(kind) {
  if (!soundEnabled || !audioContext || audioContext.state !== 'running') return;
  const now = audioContext.currentTime;
  if (now - lastTone < .06) return;
  lastTone = now;
  const osc = audioContext.createOscillator(), gain = audioContext.createGain();
  osc.connect(gain); gain.connect(audioContext.destination);
  osc.type = kind === 'hit' ? 'triangle' : 'sine';
  const frequency = kind === 'warning' ? 180 : kind === 'cast' ? 440 : kind === 'guard' ? 660 : 100;
  osc.frequency.setValueAtTime(frequency, now);
  osc.frequency.exponentialRampToValueAtTime(frequency * .5, now + .15);
  gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.035, now + .01);
  gain.gain.exponentialRampToValueAtTime(.0001, now + .2);
  osc.start(now); osc.stop(now + .22); osc.onended = () => {osc.disconnect(); gain.disconnect();};
}
function effect(className, value, heroId, color) {
  const node = document.createElement('span'); node.className = className;
  if (value) node.textContent = value;
  if (heroId) node.style.left = `${8 + HEROES.findIndex(h => h.id === heroId) * 15}%`;
  if (color) node.style.setProperty('--fx', color);
  $('vfx').append(node);
  setTimeout(() => node.remove(), 950);
}
function presentEvents() {
  for (const e of state.events) {
    if (e.id <= lastEvent) continue;
    lastEvent = e.id;
    const h = HEROES.find(hero => hero.id === e.heroId);
    if (e.type === 'cast') {
      const kind = e.skillId === h?.skills[2].id ? 'ultimate' : e.skillId === h?.skills[1].id ? 'skill' : 'attack';
      motions.get(e.heroId)?.trigger(kind,e.time);
      if (kind==='ultimate') {const cut=document.createElement('div');cut.className='super-announcement';cut.style.setProperty('--fx',h.accent);cut.innerHTML=`<img src="${art(h)}" alt=""><span>SUPER · ${h.name}<strong>${h.skills[2].name}</strong></span>`;cut.dataset.started=String(e.time);$('vfx').append(cut);}
      if (e.dealt) effect('damage-number', fmt(e.dealt));
      if (e.restored) effect('damage-number heal', `+${fmt(e.restored)}`, e.heroId);
      if (!reducedMotion.matches && h) {
        if (e.dealt) effect(e.skillId === h.skills[2].id ? 'impact-ring' : 'skill-line', '', null, h.accent);
      }
    }
    if (e.type === 'hit') {effect('damage-number incoming', e.damage ? `−${fmt(e.damage)}` : 'Bloqué', e.heroId);motions.get(e.heroId)?.trigger(e.guarded?'guard':'hit',e.time);}
    if (e.type === 'guard') for (const [id,motion] of motions) if (state.heroes[id].hp>0) motion.trigger('guard',e.time);
    if (e.type === 'interrupt') feedback('Nyxara a interrompu l’attaque de l’Écho.');
    tone(e.type);
  }
}
function showResult() {
  const status = state.status;
  if (!['intermission', 'victory', 'defeat'].includes(status) || shownStatus === status) return;
  if(motionEnabled&&endingTime<.85)return;
  shownStatus = status;
  const victory = status === 'victory', intermission = status === 'intermission';
  text('result-kicker', victory ? 'LE SCEAU DES QUATRE' : intermission ? `PHASE ${state.phase + 1} ACCOMPLIE` : 'LES ÉCHOS VOUS ATTENDENT');
  text('result-title', victory ? 'Le serment est tenu.' : intermission ? 'La faille recule.' : 'Une lumière s’éteint.');
  text('result-story', victory ? 'Les quatre pouvoirs ont refermé la faille. Votre première épreuve entre dans la mémoire de la citadelle.' : intermission ? `${PHASES[state.phase + 1].hint} Les survivants récupéreront 15 % de leur vie maximale avant la prochaine phase.` : 'Vos Mythiques sont tombés. Utilisez la garde juste avant l’impact, interrompez les attaques avec Nyxara et gardez les soins de Lysael pour les blessures de l’équipe.');
  const survivors = Object.values(state.heroes).filter(h => h.hp > 0).length;
  $('result-stats').innerHTML = `<span>Temps de combat<b>${time(state.time)}</b></span><span>Héros debout<b>${survivors} / 4</b></span><span>Dégâts infligés<b>${fmt(state.totalDamage)}</b></span><span>Soins effectifs<b>${fmt(state.totalHealing)}</b></span>`;
  text('save-status', '');
  if (victory) {
    record = victoryRecord(state, record);
    try {localStorage.setItem(SAVE_KEY, JSON.stringify(record)); text('save-status', `Sceau obtenu · victoire sauvegardée sur ce navigateur · record ${time(record.bestTime)}`);}
    catch {text('save-status', 'Victoire accomplie. Le navigateur refuse la sauvegarde locale ; ce résultat restera disponible jusqu’à la fermeture de la page.');}
  }
  text('continue', intermission ? 'Poursuivre l’épreuve →' : 'Rejouer l’épreuve →');
  $('result').showModal();
  if(citadelRun&&window.parent!==window&&!intermission)window.parent.postMessage({type:'shadow:campaign-result',runId:citadelRun,won:victory,score:Math.max(0,Math.round(10000-state.time*30+survivors*500))},location.origin);
}
function render() {
  document.documentElement.classList.toggle('battle-still',!motionEnabled||state.paused);
  const p = PHASES[state.phase];
  text('phase-label', `ÉPREUVE · ${state.phase + 1} / 3`); text('time', time(state.time));
  text('enemy-name', ENEMIES[state.phase].name); text('enemy-health', `${fmt(state.target.hp)} / ${fmt(state.target.maxHp)} PV`);
  $('enemy-hp').style.width = `${100 * state.target.hp / state.target.maxHp}%`;
  text('enemy-rank', state.phase === 2 && state.target.hp <= state.target.maxHp / 2 ? 'FUREUR · DÉGÂTS ACCRUS' : ENEMIES[state.phase].role.toUpperCase());
  [...$('journey').children].forEach((node, i) => {node.classList.toggle('active', i === state.phase); node.classList.toggle('done', i < state.phase || state.status === 'victory'); if (i === state.phase) node.setAttribute('aria-current', 'step'); else node.removeAttribute('aria-current');});
  for (const h of HEROES) {
    const m = state.heroes[h.id], node = members.get(h.id), fighter = fighters.get(h.id);
    node.setAttribute('aria-pressed', String(h.id === selected.id));
    node.querySelector('small').textContent = m.hp > 0 ? `${fmt(m.hp)} PV · ${m.energy} ÉN${m.shield ? ` · ${m.shield} BCL` : ''}` : 'À terre';
    node.querySelector('.healthbar i').style.width = `${m.hp / m.maxHp * 100}%`;
    node.querySelector('.energybar i').style.width = `${m.energy}%`;
    node.classList.toggle('fallen', m.hp <= 0); fighter.classList.toggle('fallen', m.hp <= 0);
    if (m.hp <= 0 && motions.get(h.id).clip !== 'defeat') motions.get(h.id).trigger('defeat',state.time);
    fighter.classList.toggle('selected', h.id === selected.id);
    fighter.classList.toggle('targeted', Boolean(state.warning?.targets.includes(h.id)));
    fighter.classList.toggle('guarded', m.hp > 0 && (m.shield > 0 || state.guardUntil > state.time));
  }
  text('energy-label', `${state.heroes[selected.id].energy} / 100 ÉNERGIE`);
  selected.skills.forEach((skill, i) => {
    const check = battleCanCast(state, selected.id, skill.id);
    skills[i].disabled = !check.ok;
    skills[i].querySelector('small').textContent = check.ok ? skill.cost ? 'Super prêt · 100 énergie' : `Prête · recharge ${(skill.cooldown*(state.heroes[selected.id].cooldownMultiplier??1)).toFixed(1)} s` : check.reason;
  });
  $('pause').disabled = state.status !== 'fighting';
  text('pause', state.paused ? 'Reprendre · P' : 'Pause · P');
  $('pause-banner').hidden = !state.paused;
  const guardRemaining = Math.max(0, state.guardReadyAt - state.time), guarded = state.guardUntil > state.time;
  $('guard').disabled = state.status !== 'fighting' || state.paused || guardRemaining > 0;
  $('guard').classList.toggle('active', guarded);
  text('guard-state', guarded ? `Protégés · ${(state.guardUntil - state.time).toFixed(1)} s` : guardRemaining > 0 ? `Recharge · ${guardRemaining.toFixed(1)} s` : 'Prête · recharge 12 s');
  $('danger').hidden = !state.warning;
  if (state.warning) {
    const warning = state.warning;
    text('danger-name', warning.name);
    text('danger-target', warning.targets.length > 1 ? 'Toute l’équipe · garde ou interruption' : `${HEROES.find(h => h.id === warning.targets[0]).name} visé(e) · garde ou interruption`);
    text('danger-count', `${Math.max(0, warning.impactAt - state.time).toFixed(1)} s`);
    $('danger-count').setAttribute('aria-hidden', 'true');
    $('danger-bar').style.width = `${Math.min(100, (state.time - warning.startedAt) / (warning.impactAt - warning.startedAt) * 100)}%`;
  }
  $('echo').classList.toggle('charging', Boolean(state.warning));
  $('echo').classList.toggle('defeated', state.target.hp <= 0);
  $('echo').classList.toggle('enraged', state.phase === 2 && state.target.hp <= state.target.maxHp / 2);
  text('arena-caption', state.target.controlledUntil > state.time ? 'ÉCHO SOUS CONTRÔLE · NYXARA' : state.status === 'fighting' ? 'LES QUATRE POUVOIRS RÉSONNENT' : 'LE SERMENT DES MYTHIQUES');
}
function update() {presentEvents(); render(); showResult();}
$('start').addEventListener('click', () => {startBattle(state); $('briefing').close(); feedback(PHASES[0].hint); update();});
$('continue').addEventListener('click', () => {
  $('result').close(); shownStatus = '';
  if (state.status === 'intermission') {nextPhase(state); feedback(PHASES[state.phase].hint);}
  else {state = freshBattle(); state.auto = $('auto').checked; lastEvent = 0; resetMotion(); startBattle(state); feedback(PHASES[0].hint);}
  update();
});
$('return').addEventListener('click', reset);
$('guard').addEventListener('click', takeGuard);
$('pause').addEventListener('click', pause); $('resume').addEventListener('click', pause);
$('auto').addEventListener('change', () => {state.auto = $('auto').checked;});
$('motion').checked = motionEnabled;
$('motion').addEventListener('change', () => {motionEnabled=$('motion').checked;});
reducedMotion.addEventListener('change', () => {motionEnabled=!reducedMotion.matches;$('motion').checked=motionEnabled;});
window.addEventListener('pagehide', e => {if(!e.persisted){disposed=true;for(const actor of actors.values())actor.destroy();stage.destroy();}});
$('sound').addEventListener('click', async () => {
  try {
    if (!audioContext) audioContext = new AudioContext();
    await audioContext.resume(); soundEnabled = !soundEnabled;
    $('sound').setAttribute('aria-pressed', String(soundEnabled)); text('sound', soundEnabled ? 'Son activé' : 'Son désactivé');
  } catch {feedback('Les effets sonores ne sont pas disponibles dans ce navigateur.');}
});
for (const dialog of [$('briefing'), $('result')]) dialog.addEventListener('cancel', event => event.preventDefault());
document.addEventListener('keydown', e => {
  if (e.repeat || e.altKey || e.ctrlKey || e.metaKey || $('briefing').open || $('result').open || e.target instanceof HTMLInputElement) return;
  if (['1', '2', '3'].includes(e.key)) {e.preventDefault(); castSelected(Number(e.key) - 1);}
  if (e.code === 'Space') {e.preventDefault(); takeGuard();}
  if (e.key.toLowerCase() === 'p' || e.key === 'Escape') {e.preventDefault(); pause();}
  if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {e.preventDefault(); select(HEROES[(HEROES.indexOf(selected) + (e.key === 'ArrowRight' ? 1 : 3)) % 4]);}
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.status === 'fighting' && !state.paused) {state.paused = true; render();}
});
window.addEventListener('message',e=>{if(citadelRun&&e.origin===location.origin&&e.source===window.parent&&e.data?.runId===citadelRun&&e.data?.type==='shadow:campaign-pause'&&state.status==='fighting'){state.paused=e.data.paused===true;render();}});
let last = performance.now(), nextRender = 0,readyTime=0;
function frame(now) {
  if(disposed)return;
  // No catch-up burst when a tab or the machine returns from suspension.
  const delta=Math.min(.1,Math.max(0,(now-last)/1000));
  advance(state, delta); last = now;
  if (now >= nextRender) {update(); nextRender = now + 80;}
  if (['victory','defeat','intermission'].includes(state.status)) endingTime=Math.min(2,endingTime+delta);else endingTime=0;
  if(state.status==='ready')readyTime+=delta;else readyTime=0;
  const visualTime=readyTime+state.time+Math.max(0,state.remainder)+endingTime;
  for(const [id,actor] of actors){
    const pose=motionEnabled?motions.get(id).sample(visualTime):{clip:'neutral',time:0};
    if(actor.lastClip!==pose.clip||actor.lastTime!==pose.time)actor.draw(pose.clip,pose.time);
  }
  stage.draw(state,visualTime,motionEnabled);
  for(const cut of $('vfx').querySelectorAll('.super-announcement')){const p=Math.max(0,(visualTime-Number(cut.dataset.started))/1.5);if(p>=1){cut.remove();continue;}cut.style.opacity=String(Math.min(1,p/.12,(1-p)/.2));cut.style.transform=`translateX(${(1-Math.min(1,p/.15))*-35}px)`;}
  for(const [id,fighter] of fighters){const pose=motionEnabled?motions.get(id).sample(visualTime):{clip:'neutral',time:0},move=actionPose(pose.clip,pose.time);fighter.style.setProperty('--step-x',move.lunge+'px');fighter.style.setProperty('--step-y',move.lift+'px');fighter.dataset.action=pose.clip;}
  document.documentElement.classList.toggle('battle-still',!motionEnabled||state.paused);
  requestAnimationFrame(frame);
}
select(selected); savedText(); $('briefing').showModal(); requestAnimationFrame(frame);
