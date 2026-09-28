#!/usr/bin/env node
/**
 * Lanceur unique d'Ellipse — une seule fenêtre, zéro cmd parasite.
 *
 *   node tools/launch-ellipse.mjs            # démarre orchestrateur + Ellisphere + studio
 *   node tools/launch-ellipse.mjs --stop     # arrête ce qui a été lancé
 *   node tools/launch-ellipse.mjs --no-browser
 *
 * Les services démarrent en processus cachés (aucune fenêtre) ; leurs sorties vont
 * dans generated/logs/<service>.log. En cas d'échec, la fin du log fautif est
 * affichée pour diagnostiquer immédiatement.
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const LOG_DIR = join(ROOT, 'generated', 'logs');
const PID_FILE = join(LOG_DIR, 'ellipse-pids.json');
const STUDIO_URL = 'http://localhost:4273/';

const SERVICES = [
  {
    id: 'orchestrator',
    label: 'Orchestrateur (API :4400)',
    port: 4400,
    command: 'corepack pnpm --filter @ellipse/orchestrator dev',
    timeoutMs: 180_000,
  },
  {
    id: 'ellisphere',
    label: 'Ellisphere (intelligence :4310)',
    port: 4310,
    identity: 'Ellisphere',
    command: 'corepack pnpm forge:assistant',
    timeoutMs: 60_000,
  },
  {
    id: 'studio',
    label: 'Studio (frontend :4273)',
    port: 4273,
    command: 'corepack pnpm --filter @ellipse/studio dev',
    timeoutMs: 240_000,
  },
];

function portOpenOn(host, port, timeoutMs) {
  return new Promise((resolvePort) => {
    const socket = net.createConnection({ host, port });
    const done = (result) => {
      socket.removeAllListeners();
      socket.destroy();
      resolvePort(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

/** Vite (entre autres) peut écouter en IPv6 seulement : on teste les deux piles. */
async function portOpen(port, timeoutMs = 900) {
  return (await portOpenOn('127.0.0.1', port, timeoutMs)) || portOpenOn('::1', port, timeoutMs);
}

async function serviceReady(service) {
  if (!(await portOpen(service.port))) return false;
  if (!service.identity) return true;
  try {
    const response = await fetch(`http://127.0.0.1:${service.port}/health`, {
      signal: AbortSignal.timeout(1500),
    });
    const health = await response.json();
    return response.ok && health.assistant === service.identity;
  } catch {
    return false;
  }
}

async function legacyEllisphereService(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: AbortSignal.timeout(1500),
    });
    const health = await response.json();
    return response.ok
      && health?.ok === true
      && typeof health?.brain === 'string'
      && health?.assistant == null;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function logTail(id, lines = 25) {
  try {
    const raw = readFileSync(join(LOG_DIR, `${id}.log`), 'utf8');
    return raw.split(/\r?\n/).filter(Boolean).slice(-lines).join('\n');
  } catch {
    return '(log introuvable)';
  }
}

function readPids() {
  try { return JSON.parse(readFileSync(PID_FILE, 'utf8')); } catch { return {}; }
}

function killTree(pid) {
  const result = spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { encoding: 'utf8' });
  return result.status === 0;
}

function pidsListeningOn(port) {
  // netstat sans filtre : les serveurs liés en IPv6 seulement ([::1]:port) comptent aussi.
  const result = spawnSync('netstat', ['-ano'], { encoding: 'utf8' });
  if (result.status !== 0) return [];
  const pids = new Set();
  for (const line of result.stdout.split(/\r?\n/)) {
    const match = line.match(/^\s*TCP\s+(\S+):(\d+)\s+\S+\s+LISTENING\s+(\d+)/);
    if (match && Number(match[2]) === port) pids.add(Number(match[3]));
  }
  return [...pids];
}

async function stop() {
  console.log('Arrêt d\'Ellipse…');
  const pids = readPids();
  for (const [id, pid] of Object.entries(pids)) {
    if (typeof pid === 'number' && killTree(pid)) console.log(`  ✓ ${id} arrêté (pid ${pid})`);
  }
  for (const service of SERVICES) {
    for (const pid of pidsListeningOn(service.port)) {
      if (killTree(pid)) console.log(`  ✓ ${service.label} arrêté via le port (pid ${pid})`);
    }
  }
  try { writeFileSync(PID_FILE, '{}'); } catch { /* sans importance */ }
  console.log('Terminé.');
}

async function launch() {
  const openBrowser = !process.argv.includes('--no-browser');
  mkdirSync(LOG_DIR, { recursive: true });
  console.log('============================================');
  console.log('  Ellipse — démarrage de la plateforme');
  console.log('============================================');

  // Vérifier la vraie connexion SQL avant d’annoncer un Studio opérationnel.
  // Le helper ne gère que l’instance Ellipse locale et son volume persistant.
  const database = spawnSync(process.execPath, [join(ROOT, 'tools', 'ensure-ellipse-database.mjs')], {
    cwd: ROOT, windowsHide: true, encoding: 'utf8', timeout: 120_000,
  });
  if (database.stdout) console.log(database.stdout.trim());
  if (database.status !== 0) {
    console.error(database.stderr?.trim() || 'La vérification de PostgreSQL a échoué.');
    return 1;
  }

  // Chaque service est vérifié individuellement : on ne démarre que ce qui manque,
  // pour qu'un studio déjà ouvert ne masque jamais Ellisphere ou un orchestrateur éteint.
  const pids = readPids();
  const pending = [];
  for (const service of SERVICES) {
    const occupied = await portOpen(service.port);
    if (service.id === 'ellisphere' && occupied && !(await serviceReady(service))) {
      const serviceIds = new Set(SERVICES.map(({ id }) => id));
      const legacyEntry = Object.entries(pids)
        .find(([id, pid]) => !serviceIds.has(id) && typeof pid === 'number');
      const legacyPid = legacyEntry?.[1];
      if (typeof legacyPid === 'number' && killTree(legacyPid)) {
        delete pids[legacyEntry[0]];
        console.log(`• ${service.label} : ancien service géré remplacé`);
        await sleep(700);
      } else if (await legacyEllisphereService(service.port)) {
        const legacyPids = pidsListeningOn(service.port);
        const replaced = legacyPids.some((pid) => killTree(pid));
        if (replaced) {
          if (legacyEntry) delete pids[legacyEntry[0]];
          console.log(`• ${service.label} : ancienne identité du service remplacée`);
          await sleep(700);
        } else {
          console.log(`• ${service.label} : ancien service détecté mais impossible à arrêter`);
        }
      } else {
        console.log(`• ${service.label} : port occupé par un service non identifié`);
      }
    }
    if (await serviceReady(service)) {
      console.log(`• ${service.label} : déjà en cours`);
      continue;
    }
    const logPath = join(LOG_DIR, `${service.id}.log`);
    writeFileSync(logPath, '');
    // La redirection est faite par cmd lui-même (forme canonique cmd /s /c "cmd >> "log" 2>&1",
    // windowsVerbatimArguments évite que Node ré-échappe les guillemets). Pas de detached :
    // il casse la redirection ; windowsHide suffit — l'enfant a sa propre console invisible
    // et survit à la fermeture du lanceur.
    const child = spawn('cmd.exe', ['/d', '/s', '/c', `"${service.command} >> "${logPath}" 2>&1"`], {
      cwd: ROOT,
      windowsHide: true,
      windowsVerbatimArguments: true,
      stdio: 'ignore',
    });
    child.unref();
    pids[service.id] = child.pid;
    pending.push({ ...service, startedAt: Date.now() });
    console.log(`• ${service.label} : démarrage… (log : generated/logs/${service.id}.log)`);
  }
  writeFileSync(PID_FILE, JSON.stringify(pids, null, 2));

  const failed = [];
  const ready = new Set();
  while (pending.some((service) => !ready.has(service.id) && !failed.includes(service))) {
    await sleep(1000);
    for (const service of pending) {
      if (ready.has(service.id) || failed.includes(service)) continue;
      if (await serviceReady(service)) {
        ready.add(service.id);
        console.log(`  ✓ ${service.label} : prêt`);
      } else if (Date.now() - service.startedAt > service.timeoutMs) {
        failed.push(service);
        console.log(`  ✗ ${service.label} : pas de réponse après ${Math.round(service.timeoutMs / 1000)} s`);
      }
    }
  }

  for (const service of failed) {
    console.log(`\n--- Dernières lignes de generated/logs/${service.id}.log (${service.label}) ---`);
    console.log(logTail(service.id));
    console.log('---');
  }

  const studioReady = await portOpen(4273);
  if (studioReady) {
    console.log(`\nEllipse est lancé : ${STUDIO_URL}`);
    // Start-Process = ShellExecute : ouvre l'URL dans le navigateur par défaut. Vérifié sur
    // cette machine ; l'ancien « cmd /s /c start » + detached mangeait la commande et rien
    // ne s'ouvrait (d'où « l'application ne se lance plus »).
    if (openBrowser) {
      await new Promise((resolveOpen, rejectOpen) => {
        const opener = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Start-Process', STUDIO_URL], {
          windowsHide: true,
          stdio: 'ignore',
        });
        opener.once('error', rejectOpen);
        opener.once('exit', (code) => code === 0 ? resolveOpen() : rejectOpen(new Error(`Ouverture du navigateur impossible (${code})`)));
      });
    }
    if (failed.length) console.log('Attention : certains services ne répondent pas (voir logs ci-dessus).');
    console.log('Pour tout arrêter : Ellipse-Stop.cmd (ou node tools/launch-ellipse.mjs --stop).');
  } else {
    console.log('\nLe studio n\'a pas démarré — voir le log ci-dessus.');
  }
  return studioReady && failed.length === 0 ? 0 : 1;
}

const exitCode = process.argv.includes('--stop') ? (await stop(), 0) : await launch();
// Laisser libuv fermer ses sockets HTTP naturellement. process.exit() pouvait
// provoquer UV_HANDLE_CLOSING sous Windows et interrompre l’ouverture du navigateur.
process.exitCode = exitCode;
