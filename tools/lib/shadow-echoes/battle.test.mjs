import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattle, startBattle, nextPhase, useSkill, guard, advance, togglePause, readRecord, victoryRecord} from './battle.mjs';
import {HEROES} from './heroes.mjs';

function active() {const s = createBattle(); startBattle(s); s.auto = false; return s;}
test('le combat doit démarrer, puis pause gèle temps et actions', () => {
  const s = createBattle(); advance(s, 20); assert.equal(s.time, 0);
  assert.equal(useSkill(s, 'voren', 'axe').ok, false);
  startBattle(s); togglePause(s); advance(s, 10);
  assert.equal(s.time, 0); assert.equal(guard(s), false);
  assert.equal(useSkill(s, 'voren', 'axe').ok, false);
});
test('signaux, réduction de garde et recharge', () => {
  const s = active(); advance(s, 3.1); assert.equal(s.warning.targets[0], 'seraphine');
  guard(s); assert.equal(guard(s), false); advance(s, 2.2);
  assert.equal(s.heroes.seraphine.hp, 2200 - Math.round((410 - 80) * .35));
  assert.equal(s.guards, 1);
});
test('Nyxara interrompt une attaque annoncée, pas de dégâts fantômes', () => {
  const s = active(); advance(s, 3.1);
  useSkill(s, 'nyxara', 'eclipse'); assert.equal(s.warning, null);
  advance(s, 2.5); assert.equal(s.damageTaken, 0); assert.equal(s.interrupts, 1);
});
test('les pas de simulation restent indépendants du framerate', () => {
  const a = active(), b = active(); advance(a, 21);
  for (let i = 0; i < 1260; i++) advance(b, 1 / 60);
  assert.equal(a.time, b.time); assert.deepEqual(a.heroes, b.heroes); assert.deepEqual(a.warning, b.warning);
});
test('défaite terminale et héros morts non ressuscités', () => {
  const s = active(); advance(s, 800); assert.equal(s.status, 'defeat');
  const time = s.time; advance(s, 20); assert.equal(s.time, time);
  assert.equal(useSkill(s, 'lysael', 'harmony').ok, false);
});
test('les trois phases peuvent être gagnées avec soin, contrôle et garde', () => {
  const s = createBattle(); startBattle(s);
  for (let i = 0; i < 5000 && s.status !== 'victory' && s.status !== 'defeat'; i++) {
    if (s.status === 'intermission') nextPhase(s);
    if (s.warning) {
      if (!useSkill(s, 'nyxara', 'eclipse').ok && s.warning.impactAt - s.time < .5) guard(s);
    }
    for (const hero of HEROES) {
      if (hero.id !== 'nyxara' && (hero.id !== 'lysael' || Object.values(s.heroes).some(h => h.maxHp - h.hp >= 280))) useSkill(s, hero.id, hero.skills[1].id);
      if (hero.id !== 'lysael' || Object.values(s.heroes).some(h => h.maxHp - h.hp >= 520)) useSkill(s, hero.id, hero.skills[2].id);
    }
    advance(s, .1);
  }
  assert.equal(s.status, 'victory'); assert.equal(s.phase, 2);
  assert.ok(s.totalHealing > 0); assert.ok(s.interrupts > 0);
  const record = victoryRecord(s, null); assert.equal(record.victories, 1);
  assert.deepEqual(readRecord(JSON.stringify(record)), record);
  console.log(`Victoire tactique : ${s.time}s, ${record.bestSurvivors} survivants`);
});
test('pas de double transition et aucune résurrection à l’intermission', () => {
  const s = active(); s.heroes.seraphine.hp = 0; s.target.hp = 1;
  useSkill(s, 'voren', 'axe'); assert.equal(s.status, 'intermission');
  assert.equal(nextPhase(s), true); assert.equal(nextPhase(s), false);
  assert.equal(s.heroes.seraphine.hp, 0); assert.equal(s.target.hp, 7200);
});
test('sauvegarde corrompue ou inconnue rejetée', () => {
  for (const raw of ['{', 'null', '{"version":2}', '{"version":1,"victories":-1}', '{"version":1,"victories":1,"bestTime":2,"bestSurvivors":99}']) assert.equal(readRecord(raw), null);
  assert.equal(victoryRecord(createBattle(), null), null);
});
