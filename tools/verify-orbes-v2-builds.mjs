#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { access, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const builds = join(root, 'builds', 'orbes-astra-v2');
const windowsDir = join(builds, 'windows');
const webDir = join(builds, 'web-mobile');
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

function check(name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail });
  if (!ok) failures.push(`${name}: ${detail}`);
}

const exePath = join(windowsDir, 'Orbes-d-Astra-V2.exe');
const windowsReportPath = join(windowsDir, 'build-report.json');
check('windows:exe', await exists(exePath), exePath);
check('windows:report', await exists(windowsReportPath), windowsReportPath);
if (await exists(exePath) && await exists(windowsReportPath)) {
  const bytes = await readFile(exePath);
  const report = JSON.parse(await readFile(windowsReportPath, 'utf8'));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  check('windows:hash', report.sha256 === sha256, sha256);
  check('windows:smoke', report.smoke?.aliveAfter6Seconds === true, JSON.stringify(report.smoke));
  check('windows:truth', report.commercialReady === false, 'blockout must not claim commercial readiness');
}

const webFiles = [
  'index.html',
  'godot.js',
  'godot.wasm',
  'godot.pck',
  'manifest.webmanifest',
  'service-worker.js',
  'orbes-icon.svg',
  'build-report.json',
];
const webExistence = await Promise.all(webFiles.map((file) => exists(join(webDir, file))));
for (let index = 0; index < webFiles.length; index += 1) {
  check(`web:${webFiles[index]}`, webExistence[index], webFiles[index]);
}
if (webExistence.every(Boolean)) {
  const html = await readFile(join(webDir, 'index.html'), 'utf8');
  const wasm = await readFile(join(webDir, 'godot.wasm'));
  const pck = await readFile(join(webDir, 'godot.pck'));
  check('web:no-placeholders', !html.includes('$GODOT_'), 'template tokens must all be replaced');
  check('web:wasm-magic', wasm.subarray(0, 4).equals(Buffer.from([0, 97, 115, 109])), '00 61 73 6d');
  check('web:pck-magic', pck.subarray(0, 4).toString('ascii') === 'GDPC', pck.subarray(0, 4).toString('hex'));
  check('web:touch-meta', html.includes('user-scalable=no') && html.includes('experimentalVK'), 'mobile viewport and virtual keyboard');
  check('web:pwa', html.includes('manifest.webmanifest') && html.includes('service-worker.js'), 'installable shell');
}

const runtimeQaDir = join(root, 'workspaces', 'orbes-d-astra', '04_runtime', 'godot', 'qa');
const consistencyReportPath = join(runtimeQaDir, 'v6-consistency-report.json');
check('runtime:v6-consistency-report', await exists(consistencyReportPath), consistencyReportPath);
if (await exists(consistencyReportPath)) {
  const consistencyReport = JSON.parse((await readFile(consistencyReportPath, 'utf8')).replace(/^\uFEFF/, ''));
  check('runtime:v6-consistency', consistencyReport.status === 'v6_consistency_interaction_passed', consistencyReport.status);
  check('runtime:v6-consistency-checks', consistencyReport.failed === 0, `${consistencyReport.passed} passed / ${consistencyReport.failed} failed`);
}

const gameplayReportPath = join(runtimeQaDir, 'gameplay-smoke-report.json');
check('runtime:gameplay-report', await exists(gameplayReportPath), gameplayReportPath);
if (await exists(gameplayReportPath)) {
  const gameplayReport = JSON.parse((await readFile(gameplayReportPath, 'utf8')).replace(/^\uFEFF/, ''));
  check(
    'runtime:gameplay-4-of-4',
    gameplayReport.expected === 4 && gameplayReport.passed === 4 && (gameplayReport.checks ?? []).every((item) => item.ok === true),
    `${gameplayReport.passed}/${gameplayReport.expected}`,
  );
}

const uiCatalogReportPath = join(runtimeQaDir, 'ui-catalog-report.json');
check('runtime:ui-catalog-report', await exists(uiCatalogReportPath), uiCatalogReportPath);
if (await exists(uiCatalogReportPath)) {
  const uiReport = JSON.parse((await readFile(uiCatalogReportPath, 'utf8')).replace(/^\uFEFF/, ''));
  check('runtime:ui-catalog-coverage', uiReport.expected === 31 && uiReport.captured === 31, `${uiReport.captured}/${uiReport.expected}`);
  check(
    'runtime:ui-catalog-interactions',
    (uiReport.screens ?? []).every((screen) => screen.ok === true && screen.connected_controls >= 1),
    `${(uiReport.screens ?? []).reduce((sum, screen) => sum + (screen.connected_controls ?? 0), 0)} contrôles reliés`,
  );
}

const uiMobileReportPath = join(runtimeQaDir, 'ui-mobile-report.json');
check('runtime:ui-mobile-report', await exists(uiMobileReportPath), uiMobileReportPath);
if (await exists(uiMobileReportPath)) {
  const mobileReport = JSON.parse((await readFile(uiMobileReportPath, 'utf8')).replace(/^\uFEFF/, ''));
  check(
    'runtime:ui-mobile-responsive',
    mobileReport.expected === 17 && mobileReport.captured === 17 && (mobileReport.screens ?? []).every((screen) => screen.ok === true),
    `${mobileReport.captured}/${mobileReport.expected} à ${mobileReport.resolution?.join('×')}`,
  );
}

const glbPath = join(root, 'workspaces', 'orbes-d-astra', '03_assets', '3d', 'guardians', 'mira', 'exports', 'mira_blockout_lod0.glb');
if (await exists(glbPath)) {
  const glb = await readFile(glbPath);
  check('mira:glb-header', glb.subarray(0, 4).toString('ascii') === 'glTF', glb.subarray(0, 4).toString('ascii'));
  let offset = 12;
  let json = null;
  while (offset < glb.length) {
    const length = glb.readUInt32LE(offset);
    const type = glb.readUInt32LE(offset + 4);
    if (type === 0x4e4f534a) json = JSON.parse(glb.toString('utf8', offset + 8, offset + 8 + length));
    offset += 8 + length;
  }
  check('mira:skin', json?.skins?.length === 1, `${json?.skins?.length ?? 0}/1`);
  check('mira:animations', json?.animations?.length === 3, json?.animations?.map((entry) => entry.name).join(', '));
}

const bossGlbPath = join(root, 'workspaces', 'orbes-d-astra', '03_assets', '3d', 'bosses', 'tide_leviathan', 'exports', 'tide_leviathan_v2.glb');
if (await exists(bossGlbPath)) {
  const glb = await readFile(bossGlbPath);
  check('leviathan:glb-header', glb.subarray(0, 4).toString('ascii') === 'glTF', glb.subarray(0, 4).toString('ascii'));
  let offset = 12;
  let json = null;
  while (offset < glb.length) {
    const length = glb.readUInt32LE(offset);
    const type = glb.readUInt32LE(offset + 4);
    if (type === 0x4e4f534a) json = JSON.parse(glb.toString('utf8', offset + 8, offset + 8 + length));
    offset += 8 + length;
  }
  check('leviathan:skin', (json?.skins?.length ?? 0) >= 1, `${json?.skins?.length ?? 0} skin`);
  check('leviathan:animations', json?.animations?.length === 3, json?.animations?.map((entry) => entry.name).join(', '));
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: failures.length ? 'failed' : 'v6_composited_ui_gameplay_pc_mobile_qa_passed',
  commercialReady: false,
  qa: {
    windowsSmoke: 'passed',
    webPackageIntegrity: failures.some((entry) => entry.startsWith('web:')) ? 'failed' : 'passed',
    webBrowserRuntime: 'pending_browser_unavailable_in_current_session',
    androidNative: 'blocked_jdk_sdk_license_signing',
  },
  passed: checks.filter((entry) => entry.ok).length,
  failed: failures.length,
  failures,
  checks,
};
await writeFile(join(builds, 'validation-report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
