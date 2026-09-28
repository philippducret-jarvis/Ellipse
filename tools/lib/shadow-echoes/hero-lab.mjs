import { HEROES } from './heroes.mjs';

export function createLab() {
  return {
    time: 0, paused: false, incoming: false, nextIncoming: 2, selected: HEROES[0].id,
    target: { hp: 50000, maxHp: 50000, controlledUntil: 0 },
    heroes: Object.fromEntries(HEROES.map((hero) => [hero.id, {
      hp: hero.stats.maxHp, maxHp: hero.stats.maxHp, shield: 0, energy: 0, readyAt: {},
    }])),
    effects: [], log: [], totalDamage: 0, totalHealing: 0,
  };
}
function note(state, message) {
  state.log.unshift({ time: state.time, message });
  state.log.length = Math.min(state.log.length, 30);
}
function damage(state, amount) {
  const dealt = Math.min(state.target.hp, amount);
  state.target.hp -= dealt;
  state.totalDamage += dealt;
  return dealt;
}
function heal(state, member, amount) {
  // Les soins ne ressuscitent pas implicitement un héros tombé.
  if (member.hp <= 0) return 0;
  const restored = Math.min(member.maxHp - member.hp, amount);
  member.hp += restored;
  state.totalHealing += restored;
  return restored;
}
export function canCast(state, heroId, skillId) {
  const hero = HEROES.find((h) => h.id === heroId);
  const skill = hero?.skills.find((s) => s.id === skillId);
  const actor = state.heroes[heroId];
  if (!hero || !skill || !actor) return { ok: false, reason: 'Compétence inconnue' };
  if (state.paused) return { ok: false, reason: 'Essai en pause' };
  if (actor.hp <= 0) return { ok: false, reason: 'Héros à terre' };
  if (state.target.hp <= 0) return { ok: false, reason: 'Cible vaincue — réinitialiser' };
  const remaining = Math.max(0, (actor.readyAt[skillId] ?? 0) - state.time);
  if (remaining > 0.00001) return { ok: false, reason: `Recharge ${remaining.toFixed(1)} s`, remaining };
  if (actor.energy < (skill.cost ?? 0)) return { ok: false, reason: `${skill.cost} énergie nécessaire` };
  return { ok: true, skill, actor, hero };
}
export function cast(state, heroId, skillId) {
  const check = canCast(state, heroId, skillId);
  if (!check.ok) return check;
  const { skill, actor, hero } = check;
  actor.energy = Math.min(100, actor.energy - (skill.cost ?? 0) + (skill.energyGain ? skill.energyGain+(actor.energyBonus??0) : 0));
  actor.readyAt[skill.id] = state.time + skill.cooldown*(actor.cooldownMultiplier??1);
  const multiplier=Number.isFinite(actor.attackMultiplier)?Math.max(1,Math.min(2,actor.attackMultiplier)):1;
  const superMultiplier=skill.cost?(actor.ultimateMultiplier??1):1;
  const healing=Math.round((skill.healing??0)*(actor.healingMultiplier??1)*superMultiplier),shield=Math.round((skill.shield??0)*(actor.shieldMultiplier??1)*superMultiplier);
  const dealt = damage(state, Math.round((skill.power ?? 0)*multiplier*superMultiplier));
  let restored = 0;
  if (skill.type === 'drain') restored = heal(state, actor, healing);
  if (skill.type === 'heal' || skill.type === 'sanctuary') {
    for (const ally of Object.values(state.heroes)) {
      restored += heal(state, ally, healing);
      if (skill.shield && ally.hp > 0) ally.shield = Math.max(ally.shield, shield);
    }
  }
  if (skill.type === 'fortifiedStrike') actor.shield = Math.max(actor.shield, shield);
  if (skill.type === 'control') state.target.controlledUntil = Math.max(state.target.controlledUntil, state.time + skill.duration);
  if (skill.dot) {
    // Un effet identique est rafraîchi ; les sources différentes restent indépendantes.
    const key = `${heroId}:${skillId}`;
    state.effects = state.effects.filter((e) => e.key !== key);
    state.effects.push({ key, name: skill.name, power: Math.round(skill.dot*multiplier), nextTick: state.time + 1, ticks: skill.duration });
  }
  note(state, `${hero.name} · ${skill.name}${dealt ? ` · ${dealt} dégâts` : ''}${restored ? ` · +${restored} PV` : ''}`);
  return { ok: true, dealt, restored, type: skill.type };
}
export function setIncoming(state, enabled) {
  state.incoming = Boolean(enabled);
  // Ne jamais rejouer les attaques d’une période où la cible était inactive.
  state.nextIncoming = state.time + 2;
}
export function tick(state, seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Durée invalide');
  if (state.paused || seconds === 0 || state.target.hp <= 0) return;
  const end = state.time + seconds;
  // Ordre chronologique stable : les dégâts périodiques précèdent les ripostes simultanées.
  while (true) {
    const nextEffect = Math.min(...state.effects.filter((e) => e.ticks > 0).map((e) => e.nextTick));
    const nextAttack = state.incoming ? state.nextIncoming : Infinity;
    const nextEvent = Math.min(nextEffect, nextAttack);
    if (nextEvent > end) break;
    state.time = nextEvent;
    for (const effect of state.effects) {
      if (effect.ticks > 0 && effect.nextTick <= nextEvent) {
        const dealt = damage(state, effect.power);
        note(state, `${effect.name} · ${dealt} dégâts périodiques`);
        effect.ticks--;
        effect.nextTick++;
      }
    }
    if (state.target.hp <= 0) { state.effects = []; return; }
    if (nextAttack === nextEvent) {
      if (state.time >= state.target.controlledUntil) {
        for (const hero of HEROES) {
          const ally = state.heroes[hero.id];
          if (ally.hp <= 0) continue;
          const incoming = Math.max(1, 260 - hero.stats.defense);
          const blocked = Math.min(ally.shield, incoming);
          ally.shield -= blocked;
          ally.hp = Math.max(0, ally.hp - incoming + blocked);
        }
        note(state, 'Onde de la cible · dégâts à l’équipe');
      } else note(state, 'Cible contrôlée · onde empêchée');
      state.nextIncoming += 2;
    }
    state.effects = state.effects.filter((e) => e.ticks > 0);
  }
  state.time = end;
}
