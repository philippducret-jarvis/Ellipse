import { v4 as uuidv4 } from 'uuid';
import type { GenerationPlan, TaskSpec, UserIntent } from '@ellipse/shared';
import type { LLMPlanHints } from '../provider.js';
import { getCortexProvider } from '../provider-registry.js';
import { analyzePrompt } from '../providers/heuristics.js';

type TaskIds = Record<
  | 'character' | 'decor' | 'animation' | 'level' | 'mesh_3d' | 'lighting'
  | 'camera' | 'gameplay' | 'narrative' | 'music' | 'sfx' | 'ui' | 'vfx' | 'qa' | 'integration',
  string
>;

/**
 * Module Plan Ellipse — DAG contextualisé par le provider cognitif sélectionné.
 * Fallback : DAG complet heuristique (quand `planHints` renvoie `null`).
 */
export class PlanModule {
  async buildAsync(intent: UserIntent): Promise<GenerationPlan> {
    const hints = await getCortexProvider().planHints(intent);
    return this.buildFromHints(intent, hints);
  }

  /** Synchrone — fallback legacy. */
  build(intent: UserIntent): GenerationPlan {
    return this.buildFromHints(intent, null);
  }

  private buildFromHints(intent: UserIntent, hints: LLMPlanHints | null): GenerationPlan {
    const ids = this.newTaskIds();
    const tasks: TaskSpec[] = [];
    const styleGuide = {
      dimension: intent.dimension,
      mood: intent.genre,
      reference_assets: intent.source_images,
    };
    const ctx = { gdd_excerpt: intent.raw_prompt, style_guide: styleGuide };
    const hasPhoto = intent.source_images.length > 0;
    const is3d = intent.dimension === '3d';
    // 2.5D : base 2D + profondeur/parallaxe (réutilise lot0 mesh-from-silhouette),
    // sans le pipeline 3D complet (mesh + éclairage dédiés).
    const is25d = intent.dimension === '2.5d';
    const topDownGenres = new Set([
      'rpg',
      'roguelike',
      'twin_stick',
      'tactics',
      'moba',
      'bullet_hell',
      'dungeon_crawler',
      'action_rpg',
      'farming',
      'stealth',
      'survival_horde',
    ]);
    const isTopDown = !is3d && topDownGenres.has(intent.genre ?? '');

    // Agents requis selon LLM ou heuristiques
    const required = new Set<string>(
      hints?.required_agents ?? this.defaultRequiredAgents(intent),
    );

    // Mécaniques enrichies
    const allMechanics = [...new Set([...intent.mechanics, ...(hints?.extra_mechanics ?? [])])];

    // ── character ──
    tasks.push({
      task_id: ids.character, agent: 'character', priority: 10, depends_on: [],
      input: { source_images: intent.source_images, target: 'hero_sprite', procedural: !hasPhoto },
      context: ctx,
    });

    // ── decor ──
    tasks.push({
      task_id: ids.decor, agent: 'decor', priority: 9, depends_on: [],
      input: { source_images: intent.source_images, targets: ['tileset', 'background', 'props'], genre: intent.genre },
      context: ctx,
    });

    // ── animation ──
    if (required.has('animation')) {
      tasks.push({
        task_id: ids.animation, agent: 'animation', priority: 8, depends_on: [ids.character],
        input: { animations: ['idle', 'run', 'jump', 'attack'], dimension: intent.dimension },
        context: ctx,
      });
    }

    // ── level ──
    tasks.push({
      task_id: ids.level, agent: 'level', priority: 7, depends_on: [ids.character, ids.decor],
      input: { genre: intent.genre, source_images: intent.source_images, scene_count: 1 },
      context: ctx,
    });

    // ── 3D mesh + lighting ──
    if (is3d && required.has('mesh_3d')) {
      tasks.push({
        task_id: ids.mesh_3d, agent: 'mesh_3d', priority: 8, depends_on: [ids.character],
        input: { source_images: intent.source_images, format: 'glb', lod: 'medium' },
        context: ctx,
      });
      tasks.push({
        task_id: ids.lighting, agent: 'lighting', priority: 6, depends_on: [ids.mesh_3d, ids.level],
        input: { mood: intent.genre, time_of_day: 'day' },
        context: ctx,
      });
    }

    // ── gameplay ──
    tasks.push({
      task_id: ids.gameplay, agent: 'gameplay', priority: 9,
      depends_on: [ids.character, ids.level],
      input: { genre: intent.genre, mechanics: allMechanics, template: intent.genre ?? 'platformer' },
      context: { gdd_excerpt: intent.raw_prompt },
    });

    // ── narrative ──
    if (required.has('narrative') || intent.features.narrative) {
      tasks.push({
        task_id: ids.narrative, agent: 'narrative', priority: 7, depends_on: [ids.gameplay],
        input: { genre: intent.genre, tone: intent.genre, branching: intent.genre === 'rpg' },
        context: ctx,
      });
    }

    // ── music ──
    tasks.push({
      task_id: ids.music, agent: 'music', priority: 5, depends_on: [ids.gameplay],
      input: { mood: intent.genre, loop: true, adaptive: intent.genre === 'rpg' },
      context: ctx,
    });

    // ── sfx ──
    tasks.push({
      task_id: ids.sfx, agent: 'sfx', priority: 5, depends_on: [ids.gameplay],
      input: { events: ['jump', 'collect', 'hit', 'footstep', 'death'], genre: intent.genre },
      context: ctx,
    });

    // ── ui ──
    tasks.push({
      task_id: ids.ui, agent: 'ui', priority: 5, depends_on: [ids.gameplay],
      input: {
        hud: intent.features.narrative ? ['health', 'score', 'quest_log'] : ['health', 'score'],
        menu: ['pause', 'restart'],
      },
      context: ctx,
    });

    // ── vfx ──
    if (required.has('vfx') || intent.features.vfx) {
      tasks.push({
        task_id: ids.vfx, agent: 'vfx', priority: 4,
        depends_on: [ids.gameplay, ...(hasPhoto ? [ids.animation] : [])],
        input: { effects: ['jump_dust', 'collect_spark', 'hit_flash', 'death_burst'] },
        context: ctx,
      });
    }

    // ── camera ──
    if (required.has('camera') || intent.features.cinematic || is3d || isTopDown) {
      tasks.push({
        task_id: ids.camera, agent: 'camera', priority: 6,
        depends_on: [ids.level, ids.gameplay],
        input: { mode: is3d ? 'third_person' : isTopDown ? 'top_down' : 'side_scroll', bounds: true },
        context: ctx,
      });
    }

    // ── qa ──
    const qaDeps = [ids.gameplay, ids.level, ids.character, ids.music, ids.sfx, ids.ui];
    if (required.has('animation') || hasPhoto) qaDeps.push(ids.animation);
    if (required.has('narrative') || intent.features.narrative) qaDeps.push(ids.narrative);
    if (required.has('vfx') || intent.features.vfx) qaDeps.push(ids.vfx);
    if (required.has('camera') || intent.features.cinematic || is3d) qaDeps.push(ids.camera);
    if (is3d) qaDeps.push(ids.mesh_3d, ids.lighting);

    tasks.push({
      task_id: ids.qa, agent: 'qa', priority: 2, depends_on: [...new Set(qaDeps)],
      input: { smoke_test_seconds: 30, validate_gdl: true },
      context: { gdd_excerpt: intent.raw_prompt },
    });

    // ── integration ──
    tasks.push({
      task_id: ids.integration, agent: 'integration', priority: 1, depends_on: [ids.qa],
      input: { export_targets: ['web_preview', 'html5_zip'], validate_refs: true },
      context: ctx,
    });

    // ── notes ──
    const analysis = analyzePrompt(intent.raw_prompt);
    const notes: string[] = [
      `Genre : ${intent.genre ?? 'générique'}`,
      `Dimension : ${intent.dimension.toUpperCase()}`,
      `${tasks.length} agents spécialisés`,
      'Moteur : Ellipse Cortex' + (hints ? ' + pont open-weights' : ' (heuristique)'),
    ];
    if (analysis.mood) notes.push(`Ambiance : ${analysis.mood}`);
    if (analysis.subjects.length) notes.push(`Sujets : ${analysis.subjects.join(', ')}`);
    if (analysis.difficulty !== 'normal') notes.push(`Difficulté : ${analysis.difficulty}`);
    if (hasPhoto) notes.push(`${intent.source_images.length} photo(s) — Photo-to-Game`);
    if (allMechanics.length > 0) notes.push(`Mécaniques : ${allMechanics.join(', ')}`);
    if (intent.features.narrative) notes.push('Narratif activé');
    if (intent.features.vfx) notes.push('VFX activés');
    if (is25d) notes.push('Pipeline 2.5D (depth/parallax · lot0)');
    if (is3d) notes.push('Pipeline 3D (mesh + éclairage)');
    if (hints?.project_notes) notes.push(hints.project_notes);

    return {
      plan_id: uuidv4(),
      user_intent: { ...intent, mechanics: allMechanics },
      tasks,
      estimated_duration_minutes: hints?.estimated_minutes ?? (hasPhoto ? 15 : is3d ? 18 : is25d ? 13 : 10),
      master_notes: notes.join(' · '),
    };
  }

  private defaultRequiredAgents(intent: UserIntent): string[] {
    const base = ['character', 'decor', 'level', 'gameplay', 'music', 'sfx', 'ui', 'qa', 'integration'];
    if (intent.source_images.length > 0 || intent.genre === 'fighting') base.push('animation');
    if (intent.dimension === '3d') base.push('mesh_3d', 'lighting', 'camera');
    if (intent.features.narrative || intent.genre === 'rpg') base.push('narrative');
    if (intent.features.vfx || intent.genre === 'fighting') base.push('vfx');
    if (intent.features.cinematic) base.push('camera');
    return base;
  }

  private newTaskIds(): TaskIds {
    return {
      character: uuidv4(), decor: uuidv4(), animation: uuidv4(), level: uuidv4(),
      mesh_3d: uuidv4(), lighting: uuidv4(), camera: uuidv4(), gameplay: uuidv4(),
      narrative: uuidv4(), music: uuidv4(), sfx: uuidv4(), ui: uuidv4(),
      vfx: uuidv4(), qa: uuidv4(), integration: uuidv4(),
    };
  }
}
