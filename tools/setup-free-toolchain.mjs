import { access, mkdir, readdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const installWinget = process.argv.includes('--install-winget');

function run(cmd, args, options = {}) {
  return new Promise((resolve) => {
    const { timeoutMs, ...spawnOptions } = options;
    const child = spawn(cmd, args, {
      cwd: root,
      env: process.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...spawnOptions,
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill();
        }, timeoutMs)
      : null;
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      resolve({ code: 1, stdout, stderr: String(err.message ?? err), timedOut });
    });
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code: timedOut ? 124 : (code ?? 1), stdout, stderr, timedOut });
    });
  });
}

async function commandExists(command) {
  const checker = process.platform === 'win32' ? ['where.exe', [command]] : ['sh', ['-lc', `command -v ${command}`]];
  const result = await run(checker[0], checker[1]);
  return result.code === 0 ? result.stdout.trim().split(/\r?\n/)[0] : null;
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function findExecutableInRoots(roots, pattern, maxDepth = 4) {
  const queue = roots.filter(Boolean).map((path) => ({ path, depth: 0 }));
  while (queue.length) {
    const current = queue.shift();
    try {
      const entries = await readdir(current.path, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(current.path, entry.name);
        if (entry.isFile() && pattern.test(entry.name)) return fullPath;
        if (entry.isDirectory() && current.depth < maxDepth) queue.push({ path: fullPath, depth: current.depth + 1 });
      }
    } catch {
      // Ignore protected or missing folders.
    }
  }
  return null;
}

async function wingetPackageInstalled(wingetId) {
  if (!wingetId || !(await commandExists('winget'))) return false;
  const result = await run('winget', ['list', '--id', wingetId, '--exact']);
  return result.code === 0 && result.stdout.includes(wingetId);
}

async function windowsInstallerLocked() {
  if (process.platform !== 'win32') return false;
  const result = await run('tasklist', ['/FI', 'IMAGENAME eq msiexec.exe']);
  return result.code === 0 && /msiexec\.exe/i.test(result.stdout);
}

const executableHints = {
  godot: {
    roots: [join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WinGet', 'Packages')],
    pattern: /^Godot.*win64.*(?:console)?\.exe$/i,
  },
  blender: {
    roots: [
      join(process.env.LOCALAPPDATA ?? '', 'EllipseFactory', 'tools'),
      join(process.env.ProgramFiles ?? '', 'Blender Foundation'),
      join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WinGet', 'Packages'),
    ],
    pattern: /^blender\.exe$/i,
  },
  tiled: {
    roots: [
      join(process.env.LOCALAPPDATA ?? '', 'EllipseFactory', 'tools'),
      join(process.env.ProgramFiles ?? '', 'Tiled'),
      join(process.env['ProgramFiles(x86)'] ?? '', 'Tiled'),
      join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Tiled'),
    ],
    pattern: /^tiled\.exe$/i,
  },
  ldtk: {
    roots: [
      join(process.env.LOCALAPPDATA ?? '', 'Programs', 'ldtk'),
      join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WinGet', 'Packages'),
    ],
    pattern: /^LDtk\.exe$/i,
  },
  comfyui: {
    roots: [
      join(process.env.LOCALAPPDATA ?? '', 'Programs'),
      join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WinGet', 'Packages'),
    ],
    pattern: /^Comfy.*\.exe$/i,
  },
};

async function resolveExecutable(tool) {
  const fromEnv = tool.path_env ? process.env[tool.path_env] : null;
  if (fromEnv && await fileExists(fromEnv)) return { commandPath: fromEnv, source: tool.path_env, installed: true };

  const fromPath = tool.command ? await commandExists(tool.command) : null;
  if (fromPath) return { commandPath: fromPath, source: 'path', installed: true };

  const hint = executableHints[tool.id];
  const fromLocalSearch = hint ? await findExecutableInRoots(hint.roots, hint.pattern) : null;
  if (fromLocalSearch) return { commandPath: fromLocalSearch, source: 'local_search', installed: true };

  const installed = await wingetPackageInstalled(tool.winget_id);
  return { commandPath: null, source: installed ? 'winget_list' : null, installed };
}

async function installWithWinget(tool) {
  if (!tool.winget_id) return { attempted: false, ok: false, note: 'no winget id' };
  const winget = await commandExists('winget');
  if (!winget) return { attempted: false, ok: false, note: 'winget missing' };
  if (['BlenderFoundation.Blender', 'Tiled.Tiled'].includes(tool.winget_id) && await windowsInstallerLocked()) {
    return { attempted: false, ok: false, note: 'Windows Installer is locked by an active msiexec process; reboot or finish the pending install, then rerun.' };
  }
  const result = await run('winget', [
    'install',
    '--id',
    tool.winget_id,
    '--exact',
    '--silent',
    '--accept-package-agreements',
    '--accept-source-agreements',
  ], { timeoutMs: 600000 });
  return {
    attempted: true,
    ok: result.code === 0,
    note: result.code === 0 ? 'installed' : result.timedOut ? 'winget install timed out after 10 minutes' : (result.stderr || result.stdout).slice(-1000),
  };
}

function envStatus(tool) {
  const vars = tool.env ?? [];
  const missing = vars.filter((name) => !process.env[name]);
  return { configured: missing.length === 0, missing };
}

async function assessTool(tool) {
  if (tool.id === 'node_pnpm_git_python') {
    const commands = {
      node: await commandExists('node'),
      git: await commandExists('git'),
      python: await commandExists('python'),
    };
    const pnpm = process.platform === 'win32'
      ? await run('cmd.exe', ['/c', 'corepack', 'pnpm', '--version'])
      : await run('corepack', ['pnpm', '--version']);
    return {
      tool_id: tool.id,
      status: Object.values(commands).every(Boolean) && pnpm.code === 0 ? 'available' : 'missing',
      commands,
      pnpm: pnpm.code === 0 ? pnpm.stdout.trim() : null,
    };
  }

  if (tool.availability === 'bundled') {
    return { tool_id: tool.id, status: 'available', note: 'bundled or generated by Ellipse' };
  }

  let resolved = await resolveExecutable(tool);
  const env = envStatus(tool);
  let status = 'missing';
  let install = null;

  if (installWinget && !resolved.installed && tool.winget_id) {
    install = await installWithWinget(tool);
    resolved = await resolveExecutable(tool);
  }

  if (tool.availability === 'installable') {
    status = resolved.installed ? 'available' : 'missing';
  } else if (tool.availability === 'env_required' || tool.availability === 'account_required') {
    status = env.configured ? 'available' : 'needs_env';
  } else if (tool.availability === 'manual_gpu') {
    status = resolved.installed ? 'available' : 'manual_gpu_required';
  } else {
    status = resolved.installed || env.configured ? 'available' : 'missing';
  }

  return {
    tool_id: tool.id,
    status,
    command: tool.command ?? null,
    command_path: resolved.commandPath,
    detected_by: resolved.source,
    installed: resolved.installed,
    winget_id: tool.winget_id ?? null,
    path_env: tool.path_env ?? null,
    env_missing: env.missing,
    install,
  };
}

function envValue(value) {
  return value ? value.replace(/\r?\n/g, '') : '';
}

function buildEnvExample(assessments) {
  const byId = Object.fromEntries(assessments.map((assessment) => [assessment.tool_id, assessment]));
  const lines = [
    '# Ellipse free factory toolchain',
    '# Copy useful values into your local environment or .env runner. Do not commit real secrets.',
    '',
    '# Local image generation worker. Default ComfyUI port is 8188 once a worker is running.',
    'COMFYUI_URL=http://127.0.0.1:8188',
    `ELLIPSE_COMFYUI_DESKTOP_PATH=${envValue(byId.comfyui?.command_path)}`,
    '',
    '# Optional editor/runtime executable overrides. The doctor also searches common WinGet/AppData locations.',
    `ELLIPSE_GODOT_PATH=${envValue(byId.godot?.command_path)}`,
    `ELLIPSE_BLENDER_PATH=${envValue(byId.blender?.command_path)}`,
    `ELLIPSE_TILED_PATH=${envValue(byId.tiled?.command_path)}`,
    `ELLIPSE_LDTK_PATH=${envValue(byId.ldtk?.command_path)}`,
    '',
    '# Free-tier liveops accounts. Fill only after creating the projects on the provider side.',
    'PLAYFAB_TITLE_ID=',
    'PLAYFAB_DEV_SECRET_KEY=',
    'FIREBASE_CONFIG=',
    'GAMEANALYTICS_GAME_KEY=',
    'GAMEANALYTICS_SECRET_KEY=',
    'UNITY_REMOTE_CONFIG_ENVIRONMENT_ID=',
    '',
  ];
  return lines.join('\n');
}

async function main() {
  const shared = await import('../packages/shared/dist/index.js');
  const { FREE_FACTORY_TOOLS } = shared;
  const tools = FREE_FACTORY_TOOLS;
  const assessments = [];
  for (const tool of tools) assessments.push(await assessTool(tool));

  const report = {
    generated_at: new Date().toISOString(),
    install_winget: installWinget,
    total_tools: tools.length,
    available: assessments.filter((a) => a.status === 'available').length,
    missing: assessments.filter((a) => a.status === 'missing').map((a) => a.tool_id),
    needs_env: assessments.filter((a) => a.status === 'needs_env').map((a) => a.tool_id),
    manual_gpu_required: assessments.filter((a) => a.status === 'manual_gpu_required').map((a) => a.tool_id),
    assessments,
    next_actions: [
      'Set COMFYUI_URL when a local or remote ComfyUI worker is running.',
      'Set PlayFab/Firebase/GameAnalytics credentials only after creating those free-tier projects.',
      'Keep SAM2/BiRefNet as optional GPU workers with Sharp CPU fallback.',
    ],
  };

  const outDir = join(root, '08_ops', 'manifests');
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, 'free-toolchain-report.json');
  const envPath = join(outDir, 'free-toolchain.env.example');
  await writeFile(outPath, JSON.stringify(report, null, 2));
  await writeFile(envPath, buildEnvExample(assessments));
  console.log(JSON.stringify({
    ok: true,
    report: outPath,
    env_example: envPath,
    available: report.available,
    missing: report.missing,
    needs_env: report.needs_env,
    manual_gpu_required: report.manual_gpu_required,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
