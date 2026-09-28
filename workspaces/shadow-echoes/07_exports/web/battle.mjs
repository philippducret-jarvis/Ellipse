import {ENEMIES} from './edition-data.mjs';
import {HEROES} from './heroes.mjs';
import {createLab, cast, canCast, tick} from './hero-lab.mjs';

export const PHASES = [
  {name: 'Le seuil des Échos', title: 'Écho du seuil', hp: 4400, power: 410, interval: 5.5, windup: 2.2, hint: 'Une marque désigne le héros visé. Protégez-le avant l’impact.'},
  {name: 'Le chœur brisé', title: 'Écho du chœur', hp: 7200, power: 460, interval: 5.2, windup: 2, hint: 'L’onde frappe toute l’équipe. Lysael peut soigner plusieurs héros à la fois.'},
  {name: 'Le cœur de la faille', title: 'Cœur des Échos', hp: 15000, power: 680, interval: 4.7, windup: 2, hint: 'Sous 50 % de vie, le cœur entre en fureur. Gardez une interruption de Nyxara en réserve.'},
];
PHASES.forEach((p,i)=>{p.title=ENEMIES[i].name;});
const STEP = .05;
export function createBattle(bonuses={}) {
  const state = createLab();
  for(const hero of HEROES){const member=state.heroes[hero.id],bonus=bonuses[hero.id];if(bonus){member.maxHp=Math.round(member.maxHp*Math.max(1,Math.min(2,Number(bonus.health)||1)));member.hp=member.maxHp;member.attackMultiplier=Math.max(1,Math.min(2,Number(bonus.attack)||1));}}
  for(const [id,bonus] of Object.entries(bonuses)){const member=state.heroes[id];if(!member)continue;for(const [field,key,min,max] of [['healingMultiplier','healing',1,2],['shieldMultiplier','shield',1,2],['cooldownMultiplier','cooldown',.7,1],['energyBonus','energy',0,20],['ultimateMultiplier','ultimate',1,2]])member[field]=Math.max(min,Math.min(max,Number(bonus[key])||min));}
  Object.assign(state, {status: 'ready', phase: 0, steps: 0, remainder: 0, auto: true,
    guardUntil: 0, guardReadyAt: 0, warning: null, nextWarning: 3, attacks: 0,
    events: [], eventId: 0, damageTaken: 0, guards: 0, interrupts: 0});
  setTarget(state);
  return state;
}
function setTarget(s) {
  s.target = {hp: PHASES[s.phase].hp, maxHp: PHASES[s.phase].hp, controlledUntil: 0};
  s.effects = [];
  s.warning = null;
  s.nextWarning = s.time + 3;
  s.attacks = 0;
}
function emit(s, type, detail = {}) {
  s.events.push({id: ++s.eventId, type, time: s.time, ...detail});
  if (s.events.length > 60) s.events.shift();
}
export function startBattle(s) {
  if (s.status !== 'ready') return false;
  s.status = 'fighting';
  emit(s, 'start');
  return true;
}
export function nextPhase(s) {
  if (s.status !== 'intermission') return false;
  s.phase++;
  for (const member of Object.values(s.heroes)) {
    if (member.hp > 0) member.hp = Math.min(member.maxHp, member.hp + Math.round(member.maxHp * .15));
  }
  setTarget(s);
  s.status = 'fighting';
  emit(s, 'start');
  return true;
}
export function battleCanCast(s, heroId, skillId) {
  if (s.status !== 'fighting') return {ok: false, reason: 'Combat inactif'};
  return canCast(s, heroId, skillId);
}
function settle(s) {
  if (s.target.hp <= 0) {
    s.status = s.phase === PHASES.length - 1 ? 'victory' : 'intermission';
    s.warning = null;
    s.effects = [];
    emit(s, s.status);
  } else if (Object.values(s.heroes).every(h => h.hp <= 0)) {
    s.status = 'defeat';
    s.warning = null;
    emit(s, 'defeat');
  }
}
export function useSkill(s, heroId, skillId) {
  const check = battleCanCast(s, heroId, skillId);
  if (!check.ok) return check;
  const result = cast(s, heroId, skillId);
  if (result.ok) {
    emit(s, 'cast', {heroId, skillId, dealt: result.dealt, restored: result.restored, skillType: result.type});
    if (result.type === 'control' && s.warning) {
      s.warning = null;
      s.nextWarning = s.time + PHASES[s.phase].interval;
      s.interrupts++;
      emit(s, 'interrupt', {heroId});
    }
    settle(s);
  }
  return result;
}
export function guard(s) {
  if (s.status !== 'fighting' || s.paused || s.time + 1e-6 < s.guardReadyAt) return false;
  s.guardUntil = s.time + 3;
  s.guardReadyAt = s.time + 12;
  emit(s, 'guard');
  return true;
}
export function togglePause(s) {
  if (s.status === 'fighting') s.paused = !s.paused;
}
function enemyAttack(s) {
  const p = PHASES[s.phase];
  const enraged = s.phase === 2 && s.target.hp <= s.target.maxHp / 2;
  const warning = s.warning;
  for (const id of warning.targets) {
    const h = s.heroes[id];
    if (h.hp <= 0) continue;
    const def = HEROES.find(hero => hero.id === id).stats.defense;
    const guarded = s.guardUntil > s.time;
    const amount = Math.round(Math.max(1, p.power * (enraged ? 1.3 : 1) - def) * (guarded ? .35 : 1));
    const blocked = Math.min(h.shield, amount);
    h.shield -= blocked;
    const damage = Math.min(h.hp, amount - blocked);
    h.hp -= damage;
    s.damageTaken += damage;
    if (guarded) s.guards++;
    emit(s, 'hit', {heroId: id, damage, blocked, guarded});
  }
  s.warning = null;
  s.nextWarning = s.time + p.interval - p.windup;
  settle(s);
}
// Fixed simulation steps keep enemy timings identical across display frame rates.
export function advance(s, seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Durée invalide');
  if (s.status !== 'fighting' || s.paused) return;
  s.remainder += seconds;
  while (s.remainder + 1e-9 >= STEP && s.status === 'fighting') {
    s.remainder -= STEP;
    s.steps++;
    tick(s, STEP);
    s.time = Math.round(s.time * 1000) / 1000;
    settle(s);
    if (s.status !== 'fighting') break;
    if (s.auto) {
      for (const hero of HEROES) {
        useSkill(s, hero.id, hero.skills[0].id);
        if (s.status !== 'fighting') break;
      }
    }
    if (s.status !== 'fighting') break;
    if (s.warning && s.time + 1e-6 >= s.warning.impactAt) enemyAttack(s);
    if (s.status !== 'fighting') break;
    if (!s.warning && s.time >= s.nextWarning && s.time >= s.target.controlledUntil) {
      const alive = HEROES.filter(h => s.heroes[h.id].hp > 0);
      const all = s.phase > 0 && (s.phase === 1 || s.attacks % 2 === 1);
      const targets = all ? alive.map(h => h.id) : [alive[s.attacks % alive.length].id];
      s.attacks++;
      s.warning = {targets, startedAt: s.time, impactAt: s.time + PHASES[s.phase].windup,
        name: `${ENEMIES[s.phase].attack} · ${all?'zone':'cible unique'}`};
      emit(s, 'warning');
    }
  }
  if (s.status !== 'fighting') s.remainder = 0;
}

export const SAVE_KEY = 'shadow-echoes:trial:v1';
export function readRecord(raw) {
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || !Number.isInteger(value.victories) || value.victories < 1
      || !Number.isFinite(value.bestTime) || value.bestTime <= 0 || value.bestTime > 86400
      || !Number.isInteger(value.bestSurvivors) || value.bestSurvivors < 1 || value.bestSurvivors > 4) return null;
    return {version: 1, victories: value.victories, bestTime: value.bestTime, bestSurvivors: value.bestSurvivors};
  } catch {return null;}
}
export function victoryRecord(s, previous) {
  if (s.status !== 'victory') return previous;
  return {version: 1, victories: (previous?.victories ?? 0) + 1,
    bestTime: Math.min(previous?.bestTime ?? Infinity, s.time),
    bestSurvivors: Math.max(previous?.bestSurvivors ?? 0, Object.values(s.heroes).filter(h => h.hp > 0).length)};
}
