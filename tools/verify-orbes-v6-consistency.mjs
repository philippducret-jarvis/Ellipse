#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const root = process.cwd();
const godot = join(root, 'workspaces', 'orbes-d-astra', '04_runtime', 'godot');
const qa = join(godot, 'qa');
const failures = [];
const checks = [];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function check(id, ok, details) {
  const result = { id, ok: Boolean(ok), details };
  checks.push(result);
  if (!result.ok) failures.push(`${id}: ${details}`);
}

function parseJson(text) {
  return JSON.parse(text.replace(/^\uFEFF/, ''));
}

const guardianPath = join(godot, 'data', 'guardians.json');
const graphPath = join(godot, 'data', 'screen_graph.json');
const guardiansDocument = parseJson(await readFile(guardianPath, 'utf8'));
const graph = parseJson(await readFile(graphPath, 'utf8'));
const guardians = guardiansDocument.guardians ?? [];

check('roster:exactly-24', guardians.length === 24, `${guardians.length}/24`);
check('roster:adult-only', guardiansDocument.adult_only === true && guardians.every((guardian) => guardian.age >= 18), 'adult_only=true and every age >= 18');
check('roster:unique-ids', new Set(guardians.map((guardian) => guardian.id)).size === guardians.length, 'all character ids must be unique');
check('roster:unique-names', new Set(guardians.map((guardian) => guardian.name)).size === guardians.length, 'all display names must be unique');
check(
  'roster:complete-fields',
  guardians.every((guardian) => ['id', 'name', 'age', 'rarity', 'role', 'element', 'title', 'faction', 'art', 'ability', 'accent'].every((field) => guardian[field] !== undefined)),
  'all runtime character fields are populated',
);
const artResults = await Promise.all(guardians.map((guardian) => exists(join(godot, guardian.art.replace(/^res:\/\//, '')))));
check('roster:all-art-present', artResults.every(Boolean), `${artResults.filter(Boolean).length}/${guardians.length} character images`);

const screens = graph.screens ?? [];
const screenSet = new Set(screens);
check('navigation:31-screens', screens.length === 31 && screenSet.size === 31, `${screens.length} screens, ${screenSet.size} unique`);
check('navigation:valid-entry', screenSet.has(graph.entry), graph.entry);
check(
  'navigation:valid-edges',
  (graph.edges ?? []).every(([from, to]) => screenSet.has(from) && screenSet.has(to)),
  `${graph.edges?.length ?? 0} declared routes`,
);
const reachable = new Set([graph.entry]);
let changed = true;
while (changed) {
  changed = false;
  for (const [from, to] of graph.edges ?? []) {
    if (reachable.has(from) && !reachable.has(to)) {
      reachable.add(to);
      changed = true;
    }
  }
}
check('navigation:all-reachable', reachable.size === screenSet.size, `${reachable.size}/${screenSet.size}; missing=${screens.filter((screen) => !reachable.has(screen)).join(',') || 'none'}`);

const sourceFiles = [
  join(godot, 'scripts', 'main.gd'),
  join(godot, 'scripts', 'ui_catalog.gd'),
  join(godot, 'scripts', 'combat_board.gd'),
  join(godot, 'scripts', 'activity_board.gd'),
];
const sourceTexts = await Promise.all(sourceFiles.map((file) => readFile(file, 'utf8')));
check(
  'runtime:canonical-registry',
  sourceTexts.slice(1).every((source) => source.includes('res://data/guardians.json')),
  'catalogue, combat and activities consume the same registry',
);
check(
  'runtime:native-interaction',
  sourceTexts.join('\n').includes('drop_orb') && sourceTexts.join('\n').includes('activate_slot') && sourceTexts.join('\n').includes('guardian_selected'),
  'drop/touch gameplay and character selection are wired',
);

const desktopReportPath = join(qa, 'ui-catalog-report.json');
const mobileReportPath = join(qa, 'ui-mobile-report.json');
const gameplayReportPath = join(qa, 'gameplay-smoke-report.json');
check('qa:desktop-report', await exists(desktopReportPath), desktopReportPath);
check('qa:mobile-report', await exists(mobileReportPath), mobileReportPath);
check('qa:gameplay-report', await exists(gameplayReportPath), gameplayReportPath);

if (await exists(desktopReportPath)) {
  const report = parseJson(await readFile(desktopReportPath, 'utf8'));
  check('qa:desktop-31-of-31', report.expected === 31 && report.captured === 31, `${report.captured}/${report.expected}`);
  check(
    'qa:desktop-controls-connected',
    (report.screens ?? []).every((screen) => screen.ok === true && screen.connected_controls >= 1),
    `${(report.screens ?? []).reduce((total, screen) => total + (screen.connected_controls ?? 0), 0)} connected controls`,
  );
}

if (await exists(mobileReportPath)) {
  const report = parseJson(await readFile(mobileReportPath, 'utf8'));
  check(
    'qa:mobile-17-of-17',
    report.expected === 17 && report.captured === 17 && (report.screens ?? []).every((screen) => screen.ok === true),
    `${report.captured}/${report.expected} at ${report.resolution?.join('x')}`,
  );
}

if (await exists(gameplayReportPath)) {
  const report = parseJson(await readFile(gameplayReportPath, 'utf8'));
  check(
    'qa:gameplay-4-of-4',
    report.expected === 4 && report.passed === 4 && (report.checks ?? []).every((item) => item.ok === true),
    `${report.passed}/${report.expected}`,
  );
  check('qa:same-selected-character', report.guardian_name === 'Vaelora Noctis', report.guardian_name);
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: failures.length ? 'failed' : 'v6_consistency_interaction_passed',
  commercialReady: false,
  passed: checks.filter((item) => item.ok).length,
  failed: failures.length,
  failures,
  checks,
};
const reportPath = join(qa, 'v6-consistency-report.json');
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
