import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GENERIC_PROJECTS,
  PORTFOLIO_PLAN,
  PROTECTED_RUNTIMES,
  assertGenericRuntimeTarget,
  buildExecutionPlan,
  parseCliArgs,
  rebuildProject,
  runPortfolio,
  validatePortfolioConfiguration,
} from './rebuild-game-portfolio.mjs';

const ORBES = 'orbes-d-astra';
const VELORIA = 'veloria-veille-des-lames';
const ECHOES = 'echoes-of-the-mushroom-realm';

test('les trois priorites sont protegees et absentes des runtimes generiques', () => {
  assert.deepEqual(Object.keys(PROTECTED_RUNTIMES).sort(), [ORBES, VELORIA, ECHOES].sort());
  assert.equal(Object.hasOwn(GENERIC_PROJECTS, ORBES), false);
  assert.equal(Object.hasOwn(GENERIC_PROJECTS, VELORIA), false);
  assert.equal(Object.hasOwn(GENERIC_PROJECTS, ECHOES), false);
  assert.equal(validatePortfolioConfiguration(), true);
});

test('la barriere refuse toujours un slug de runtime specialise', () => {
  assert.throws(() => assertGenericRuntimeTarget(ORBES), /RUNTIME_PROTEGE.*orbes:build/);
  assert.throws(() => assertGenericRuntimeTarget(VELORIA), /RUNTIME_PROTEGE.*veloria:hd/);
  assert.throws(() => assertGenericRuntimeTarget(ECHOES), /RUNTIME_PROTEGE.*echoes:hd/);
  assert.throws(
    () => validatePortfolioConfiguration({ ...GENERIC_PROJECTS, [VELORIA]: {} }),
    /Runtime protege declare comme generique/,
  );
});

test('le CLI est dry-run par defaut et exige --apply pour ecrire', () => {
  assert.deepEqual(parseCliArgs([]), { mode: 'dry-run', project: undefined, help: false });
  assert.deepEqual(parseCliArgs(['--dry-run']), { mode: 'dry-run', project: undefined, help: false });
  assert.deepEqual(
    parseCliArgs(['--apply', '--project', 'une-chevaliere-d-argent-dans-une-citadel']),
    { mode: 'apply', project: 'une-chevaliere-d-argent-dans-une-citadel', help: false },
  );
  assert.throws(() => parseCliArgs(['--apply', '--dry-run']), /jamais les deux/);
});

test('le plan publie la priorite et garde les runtimes specialises non selectionnes', () => {
  const plan = buildExecutionPlan();
  assert.deepEqual(plan.map(({ priority }) => priority), PORTFOLIO_PLAN.map(({ priority }) => priority));
  for (const slug of [ORBES, VELORIA, ECHOES]) {
    const entry = plan.find((candidate) => candidate.slug === slug);
    assert.equal(entry.status, 'protected');
    assert.equal(entry.selected, false);
  }
});

test('un dry-run ne delegue aucune reconstruction', async () => {
  let rebuildCalls = 0;
  const result = await runPortfolio(
    { mode: 'dry-run' },
    {
      rebuild: async () => { rebuildCalls += 1; },
      log: () => {},
    },
  );
  assert.equal(rebuildCalls, 0);
  assert.deepEqual(result.rebuilt, []);
  assert.equal(result.plan.filter(({ selected }) => selected).length, Object.keys(GENERIC_PROJECTS).length);
});

test('la selection et la fonction bas niveau refusent aussi les runtimes proteges', async () => {
  assert.throws(() => buildExecutionPlan({ project: VELORIA }), /RUNTIME_PROTEGE/);
  await assert.rejects(() => rebuildProject(ORBES, {}), /RUNTIME_PROTEGE/);
  await assert.rejects(() => rebuildProject(ECHOES, {}), /RUNTIME_PROTEGE/);
});
