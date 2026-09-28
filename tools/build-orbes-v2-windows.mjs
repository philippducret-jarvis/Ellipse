#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const project = join(root, 'workspaces', 'orbes-d-astra', '04_runtime', 'godot');
const outputDir = join(root, 'builds', 'orbes-astra-v2', 'windows');
const outputExe = join(outputDir, 'Orbes-d-Astra-V2.exe');
const template = join(process.env.APPDATA ?? '', 'Godot', 'export_templates', '4.7.stable', 'windows_release_x86_64.exe');

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function findGodot() {
  const override = process.env.ELLIPSE_GODOT_PATH;
  if (override && await exists(override)) return override;
  const packageRoot = join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WinGet', 'Packages');
  for (const entry of await readdir(packageRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('GodotEngine.GodotEngine_')) continue;
    const folder = join(packageRoot, entry.name);
    const file = (await readdir(folder)).find((name) => /^Godot_v4\.7.*win64\.exe$/i.test(name));
    if (file) return join(folder, file);
  }
  throw new Error('Godot 4.7 not found. Set ELLIPSE_GODOT_PATH.');
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], ...options });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => { stdout += chunk; });
    child.stderr?.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => code === 0
      ? resolve({ code, stdout, stderr })
      : reject(new Error(`${command} exited ${code}\n${stdout}\n${stderr}`)));
  });
}

if (!await exists(template)) throw new Error('Windows template missing. Run node tools/install-godot-47-minimal-templates.mjs');
await mkdir(outputDir, { recursive: true });
const godot = await findGodot();
const exportResult = await run(godot, [
  '--headless',
  '--path', project,
  '--export-release', 'Windows Desktop',
  outputExe,
]);
const bytes = await readFile(outputExe);

const smoke = await new Promise((resolve, reject) => {
  const game = spawn(outputExe, [], { cwd: outputDir, windowsHide: true, stdio: 'ignore' });
  let exited = false;
  let exitCode = null;
  game.once('error', reject);
  game.once('exit', (code) => {
    exited = true;
    exitCode = code;
  });
  setTimeout(() => {
    const aliveAfter6Seconds = !exited;
    if (!exited && process.platform === 'win32') {
      const killer = spawn('taskkill.exe', ['/PID', String(game.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      killer.once('close', () => resolve({ started: true, aliveAfter6Seconds, earlyExitCode: exitCode, terminatedBySmokeTest: true }));
    } else {
      if (!exited) game.kill('SIGKILL');
      resolve({ started: true, aliveAfter6Seconds, earlyExitCode: exitCode, terminatedBySmokeTest: aliveAfter6Seconds });
    }
  }, 6000);
});

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: smoke.aliveAfter6Seconds ? 'v6_convergence_gameplay_build_passed_smoke' : 'failed_smoke',
  commercialReady: false,
  file: outputExe,
  bytes: (await stat(outputExe)).size,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  smoke,
  exportWarnings: exportResult.stderr.trim().split(/\r?\n/).filter(Boolean),
};
await writeFile(join(outputDir, 'build-report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (!smoke.aliveAfter6Seconds) process.exit(1);
