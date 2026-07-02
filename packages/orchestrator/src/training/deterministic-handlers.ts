/**
 * Handlers d'entraînement sans LLM — patches GDL/workspace déterministes.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  GameDefinitionSchema,
  generateNarrative,
  mergeNpcRoutinesIntoGdl,
  createDefaultNpcRoutinesPack,
  createSurvivorsEnemyAiPack,
  normalizeGdlForParse,
  deriveIntentContract,
  INTENT_CONTRACT_PATH,
} from '@ellipse/shared';
import { runSyntheticPlaytest, loadGdlForPlaytest } from '@ellipse/engine';

const DETERMINISTIC_HANDLERS = new Set([
  'iterate:narrative',
  'iterate:narrative_dialogue',
  'iterate:npc',
  'iterate:npc_routines',
  'iterate:audio',
  'iterate:vfx',
  'iterate:ui',
  'iterate:gameplay_balance',
  'iterate:enemy_waves',
  'iterate:boss_phases',
  'iterate:gameplay',
  'intent:derive',
]);

export function isDeterministicHandler(handler: string): boolean {
  return DETERMINISTIC_HANDLERS.has(handler) || handler === 'qa:playtest';
}

function gdlPath(workspaceRoot: string, slug: string): string {
  const prefix = slug.split('-')[0];
  return join(workspaceRoot, '05_runtime', 'gdl', `${prefix}.preview.gdl.json`);
}

async function loadGdl(workspaceRoot: string, slug: string): Promise<Record<string, unknown>> {
  const path = gdlPath(workspaceRoot, slug);
  return JSON.parse(await readFile(path, 'utf-8')) as Record<string, unknown>;
}

async function saveGdl(workspaceRoot: string, slug: string, gdl: Record<string, unknown>): Promise<void> {
  const path = gdlPath(workspaceRoot, slug);
  await mkdir(join(workspaceRoot, '05_runtime', 'gdl'), { recursive: true });
  await writeFile(path, JSON.stringify(gdl, null, 2));
}

function patchPlayerHealth(gdl: Record<string, unknown>, max = 10): void {
  const entities = gdl.entities as Array<{ id: string; components?: Array<Record<string, unknown>> }> | undefined;
  const player = entities?.find((e) => e.id === 'player');
  if (!player) return;
  player.components ??= [];
  let health = player.components.find((c) => 'health' in c)?.health as { max?: number; current?: number } | undefined;
  if (!health) {
    player.components.push({ health: { max, current: max } });
    return;
  }
  health.max = max;
  health.current = max;
}

function patchVeloriaBalance(gdl: Record<string, unknown>): void {
  patchPlayerHealth(gdl, 15);
  const meta = gdl.meta as { hazard_scripts?: Record<string, { damage_on_active?: number }> } | undefined;
  const scene = (gdl.scenes as Array<{ id?: string; veloria?: { encounters?: { waves?: Array<{ enemies?: Array<{ count?: number }> }>; total_waves?: number } } }> | undefined)?.[0];
  if (meta?.hazard_scripts && scene?.id) {
    const script = meta.hazard_scripts[scene.id];
    if (script) script.damage_on_active = 0;
  }
  if (scene?.veloria?.encounters) {
    for (const wave of scene.veloria.encounters.waves ?? []) {
      for (const group of wave.enemies ?? []) {
        if ((group.count ?? 0) > 2) group.count = 2;
      }
    }
  }
}

function bootstrapNarrative(gdl: Record<string, unknown>, projectTitle: string): void {
  const pack = generateNarrative('rpg', `${projectTitle} dark fantasy survivors`, true);
  pack.dialogues.push(
    { id: 'dlg_boss_intro', speaker: 'Bourreau', text: 'La Veille exige un tribut de sang.', next: 'dlg_boss_taunt' },
    { id: 'dlg_boss_taunt', speaker: 'Bourreau', text: 'Tes lames ne suffiront pas.' },
    { id: 'dlg_merchant_greet', speaker: 'Marchand', text: 'Des reliques pour les braves.' },
    { id: 'dlg_aureline_oath', speaker: 'Auréline', text: 'Je tiendrai la Veille, coûte que coûte.' },
  );
  pack.quests.push({
    id: 'veloria_survive',
    title: 'Tenir la Veille',
    status: 'active',
    objective: 'Survivre 12 vagues et vaincre le Bourreau',
  });
  gdl.narrative = mergeNpcRoutinesIntoGdl(pack as unknown as Record<string, unknown>, createDefaultNpcRoutinesPack());
}

export async function runDeterministicHandler(
  handler: string,
  workspaceRoot: string,
  slug: string,
  projectTitle: string,
  genre?: string | null,
): Promise<{ ok: boolean; detail: string }> {
  if (handler === 'intent:derive') {
    const contract = deriveIntentContract({
      title: projectTitle,
      prompt: 'Veloria survivors portrait dark fantasy',
      genre: genre ?? 'survivors_like',
      dimension: '2d',
      mechanics: ['lane_runner', 'wave_spawner', 'blessing_draft'],
    });
    await mkdir(join(workspaceRoot, '02_design', 'specs'), { recursive: true });
    await writeFile(join(workspaceRoot, ...INTENT_CONTRACT_PATH.split('/')), JSON.stringify(contract, null, 2));
    return { ok: true, detail: 'intent-contract.json' };
  }

  if (handler === 'qa:playtest') {
    const path = gdlPath(workspaceRoot, slug);
    if (!existsSync(path)) return { ok: false, detail: 'GDL absent' };
    const raw = await readFile(path, 'utf-8');
    const gdl = loadGdlForPlaytest(JSON.parse(raw));
    const report = runSyntheticPlaytest(gdl, { runs: 24 });
    const outPath = join(workspaceRoot, '08_ops', 'manifests', 'synthetic-playtest-report.json');
    await mkdir(join(workspaceRoot, '08_ops', 'manifests'), { recursive: true });
    await writeFile(outPath, JSON.stringify(report, null, 2));
    return { ok: true, detail: `wins=${report.wins} losses=${report.losses}` };
  }

  let gdl = await loadGdl(workspaceRoot, slug);

  switch (handler) {
    case 'iterate:narrative':
    case 'iterate:narrative_dialogue':
      bootstrapNarrative(gdl, projectTitle);
      break;
    case 'iterate:npc':
    case 'iterate:npc_routines': {
      const npcPack = createDefaultNpcRoutinesPack();
      await mkdir(join(workspaceRoot, '02_design', 'specs'), { recursive: true });
      await writeFile(join(workspaceRoot, '02_design', 'specs', 'npc-routines.json'), JSON.stringify(npcPack, null, 2));
      bootstrapNarrative(gdl, projectTitle);
      break;
    }
    case 'iterate:audio':
      gdl.audio = {
        bgm: `/workspaces/${slug}/03_assets/audio/bgm_veloria_loop.wav`,
        sfx: { jump: 'procedural:jump', hit: 'procedural:hit', hurt: 'procedural:hurt', collect: 'procedural:collect', victory: 'procedural:victory', draft: 'procedural:draft' },
      };
      break;
    case 'iterate:vfx':
      gdl.vfx = { hazards: { enabled: true }, hit_sparks: { enabled: true }, draft_flash: { enabled: true } };
      break;
    case 'iterate:ui':
      gdl.ui = { hud: { show_health: true, show_wave: true, show_timer: true, draft_keys: ['1', '2', '3'] } };
      break;
    case 'iterate:gameplay_balance':
      patchVeloriaBalance(gdl);
      break;
    case 'iterate:enemy_waves':
    case 'iterate:boss_phases': {
      const enemyPack = createSurvivorsEnemyAiPack();
      await mkdir(join(workspaceRoot, '02_design', 'specs'), { recursive: true });
      await writeFile(join(workspaceRoot, '02_design', 'specs', 'enemy-ai-pack.json'), JSON.stringify(enemyPack, null, 2));
      patchVeloriaBalance(gdl);
      break;
    }
    case 'iterate:gameplay':
      gdl.systems = Array.from(
        new Set([
          ...(Array.isArray(gdl.systems) ? gdl.systems : []),
          'input',
          'physics_topdown',
          'lane_runner',
          'wave_spawner',
          'auto_attack',
          'blessing_draft',
          'hazard_scheduler',
          'boss_phases',
          'camera_follow',
        ]),
      );
      patchVeloriaBalance(gdl);
      break;
    default:
      return { ok: false, detail: `handler non supporté: ${handler}` };
  }

  GameDefinitionSchema.parse(normalizeGdlForParse(gdl));
  await saveGdl(workspaceRoot, slug, gdl);
  return { ok: true, detail: handler };
}
