#!/usr/bin/env node
import { access, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const base = join(root, 'workspaces', 'orbes-d-astra');
const prep = join(base, '01_preproduction');
const manifests = join(prep, 'manifests');
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

function check(name, condition, detail) {
  checks.push({ name, ok: Boolean(condition), detail });
  if (!condition) failures.push(`${name}: ${detail}`);
}

const requiredDocs = [
  'README.md',
  '00_VISION_ET_PILIERS.md',
  '01_GDD_COMMERCIAL.md',
  '02_REGLES_DETAILLEES.md',
  '03_ROSTER_ET_PRODUCTION_3D.md',
  '04_DIRECTION_ARTISTIQUE_ET_MAQUETTES.md',
  '05_ECONOMIE_GACHA_ET_CONFORMITE.md',
  '06_ARCHITECTURE_ET_PIPELINE.md',
  '07_PLAN_DE_PRODUCTION.md',
  '08_QA_ET_COMMERCIAL_GATES.md',
  '09_ACTIVITES_SECONDAIRES.md',
  '10_ETAT_REEL_ET_PROCHAINES_ETAPES.md',
  '11_REPRISE_VISUELLE_GODOT_V3.md',
  '12_CONFORMITE_MAQUETTES_RUNTIME_V4.md',
];
for (const file of requiredDocs) check(`document:${file}`, await exists(join(prep, file)), 'fichier requis');

const characters = JSON.parse(await readFile(join(manifests, 'characters-3d.json'), 'utf8'));
const inventory = JSON.parse(await readFile(join(manifests, 'asset-inventory-3d.json'), 'utf8'));
const ui = JSON.parse(await readFile(join(manifests, 'ui-screens.json'), 'utf8'));
const mockups = JSON.parse(await readFile(join(manifests, 'ui-mockup-manifest.json'), 'utf8'));

check('roster:24', characters.guardians.length === 24, `${characters.guardians.length}/24`);
check('roster:adults', characters.guardians.every((entry) => entry.adultConfirmed && entry.age >= 18), 'tous les âges doivent être >= 18');
check('roster:contracts', characters.guardians.every((entry) => entry.requiredFiles.length >= 9 && entry.animations.length >= 28), 'fichiers et animations requis');
check('inventory:112', inventory.summary.totalEntries === 112, `${inventory.summary.totalEntries}/112`);
check('ui:31', ui.screens.length === 31, `${ui.screens.length}/31`);
check('ui:93-variants', mockups.generated.length === 93, `${mockups.generated.length}/93`);
check('ui:drafts', ui.screens.every((entry) => entry.pc === 'draft' && entry.mobile === 'draft' && entry.accessibleVariant === 'draft'), 'PC/mobile/accessible');

for (const entry of mockups.generated) {
  check(`mockup:${entry.screen}:${entry.variant}`, await exists(join(prep, entry.file)), entry.file);
}

const directionImages = [
  '01_hub_pc_direction.png',
  '02_combat_pc_direction.png',
  '03_combat_mobile_direction.png',
  '04_roster_gacha_direction.png',
  '05_side_games_direction.png',
  '06_mira_3d_turnaround_direction.png',
];
for (const file of directionImages) check(`direction:${file}`, await exists(join(prep, 'mockups', file)), 'PNG de direction');

const guardianContracts = await Promise.all(
  characters.guardians.map((entry) => exists(join(base, '03_assets', '3d', 'guardians', entry.id, 'asset-contract.json'))),
);
check('roster:24-contracts-on-disk', guardianContracts.every(Boolean), `${guardianContracts.filter(Boolean).length}/24`);

const finalClaims = characters.guardians.filter((entry) =>
  Object.values(entry.production).some((status) => ['final', 'verified_final', 'commercial_ready'].includes(status)),
);
check('truth:no-fake-3d-claim', finalClaims.length === 0, 'aucun blockout ne doit être déclaré modèle final');

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: failures.length === 0 ? 'preproduction_complete_vertical_slice_blockout_started' : 'invalid',
  summary: {
    passed: checks.filter((entry) => entry.ok).length,
    failed: failures.length,
    documents: requiredDocs.length,
    adultGuardians: characters.guardians.length,
    assets3dSpecified: inventory.summary.totalEntries,
    uxScreens: ui.screens.length,
    uxMockupVariants: mockups.generated.length,
    artDirectionBoards: directionImages.length,
  },
  commercialReady: false,
  nextGate: 'vertical_slice_gold_master_mira_brann_aster_leviathan_drowned_harbor',
  failures,
  checks,
};
await writeFile(join(manifests, 'preproduction-validation.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report.summary, null, 2));
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
