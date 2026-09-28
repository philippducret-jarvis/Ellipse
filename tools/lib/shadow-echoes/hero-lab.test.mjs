import test from 'node:test';
import assert from 'node:assert/strict';
import { HEROES } from './heroes.mjs';
import { createLab, cast, tick, setIncoming } from './hero-lab.mjs';

test('le lot contient quatre identités mythiques uniques', () => {
  assert.equal(HEROES.length, 4);
  assert.equal(new Set(HEROES.map((h) => h.id)).size, 4);
  assert.ok(HEROES.every((h) => h.rarity === 'mythique'));
});
test('recharge et énergie empêchent les doubles activations', () => {
  const s = createLab();
  assert.equal(cast(s, 'seraphine', 'requiem').ok, false);
  assert.equal(cast(s, 'seraphine', 'thorn').ok, true);
  const hp = s.target.hp;
  assert.equal(cast(s, 'seraphine', 'thorn').ok, false);
  assert.equal(s.target.hp, hp);
  tick(s, 1.2);
  assert.equal(cast(s, 'seraphine', 'thorn').ok, true);
  s.heroes.seraphine.energy = 100;
  assert.equal(cast(s, 'seraphine', 'requiem').ok, true);
  assert.equal(s.heroes.seraphine.energy, 0);
});
test('saignement et brûlure ont exactement quatre ticks indépendants', () => {
  const s = createLab();
  cast(s, 'seraphine', 'bloom');
  cast(s, 'voren', 'ashes');
  tick(s, 20);
  assert.equal(s.totalDamage, 210 + 190 + 4 * 35 + 4 * 45);
  assert.deepEqual(s.effects, []);
});
test('le contrôle suspend les attaques sans les reporter en rafale', () => {
  const s = createLab();
  setIncoming(s, true);
  cast(s, 'nyxara', 'eclipse');
  tick(s, 3);
  assert.equal(s.heroes.nyxara.hp, s.heroes.nyxara.maxHp);
  tick(s, 1);
  assert.equal(s.heroes.nyxara.hp, s.heroes.nyxara.maxHp - 165);
});
test('soins plafonnés, héros tombés non ressuscités et bouclier consommé', () => {
  const s = createLab();
  s.heroes.nyxara.hp -= 90;
  s.heroes.seraphine.hp = 0;
  s.heroes.lysael.energy = 100;
  cast(s, 'lysael', 'worldsong');
  assert.equal(s.totalHealing, 90);
  assert.equal(s.heroes.seraphine.hp, 0);
  assert.equal(s.heroes.seraphine.shield, 0);
  assert.equal(s.heroes.nyxara.shield, 240);
  setIncoming(s, true);
  tick(s, 2);
  assert.equal(s.heroes.nyxara.hp, s.heroes.nyxara.maxHp);
  assert.equal(s.heroes.nyxara.shield, 75);
  tick(s, 2);
  assert.equal(s.heroes.nyxara.hp, s.heroes.nyxara.maxHp - 90);
});
test('pause et désactivation de la cible ne créent aucun rattrapage', () => {
  const s = createLab();
  s.paused = true;
  assert.equal(cast(s, 'voren', 'axe').ok, false);
  tick(s, 50);
  assert.equal(s.time, 0);
  s.paused = false;
  tick(s, 50);
  setIncoming(s, true);
  tick(s, 1);
  assert.equal(s.heroes.voren.hp, s.heroes.voren.maxHp);
});
test('un pas long et des petits pas produisent les mêmes résultats', () => {
  const a = createLab(); const b = createLab();
  for (const s of [a, b]) { setIncoming(s, true); cast(s, 'voren', 'ashes'); cast(s, 'nyxara', 'eclipse'); }
  tick(a, 6);
  for (let i = 0; i < 24; i++) tick(b, 0.25);
  assert.deepEqual(a, b);
});
