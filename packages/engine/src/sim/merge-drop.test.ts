import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MERGE_DROP_CONFIG,
  activateMergeDropAbility,
  awakenMergeDropHero,
  createMergeDropWorld,
  dropMergeBall,
  equipMergeDropCompanion,
  equipMergeDropRelic,
  mergeDropAwakenCost,
  mergeDropHeroStars,
  mergeDropModifiers,
  primeMergeDropRun,
  selectMergeDropHero,
  stepMergeDropWorld,
  summonMergeDropHero,
  summonMergeDropHeroTen,
  summonMergeDropRelic,
  summonMergeDropRelicTen,
} from './merge-drop.js';

describe('merge drop simulation', () => {
  function advanceFor(world: ReturnType<typeof createMergeDropWorld>, totalMs: number, frameMs: number): void {
    let remaining = totalMs;
    while (remaining > 0) {
      const dt = Math.min(frameMs, remaining);
      stepMergeDropWorld(world, dt);
      remaining -= dt;
    }
  }

  it('fusionne deux billes identiques et augmente score et charge', () => {
    const world = createMergeDropWorld(DEFAULT_MERGE_DROP_CONFIG, 42);
    world.current_tier = 0;
    world.next_tier = 0;
    world.aim_x = 360;
    expect(dropMergeBall(world)).toBe(true);
    world.drop_cooldown_ms = 0;
    expect(dropMergeBall(world)).toBe(true);

    for (let i = 0; i < 480 && world.best_tier === 0; i++) stepMergeDropWorld(world, 16);

    expect(world.best_tier).toBe(1);
    expect(world.balls.some((ball) => ball.tier === 1)).toBe(true);
    expect(world.score).toBeGreaterThan(0);
    expect(world.ability_charge).toBeGreaterThan(0);
  });

  it('le pouvoir de forge ameliore la prochaine bille', () => {
    const config = {
      ...DEFAULT_MERGE_DROP_CONFIG,
      initial_unlocked_heroes: ['mira', 'brann'],
    };
    const world = createMergeDropWorld(config, 7);
    expect(selectMergeDropHero(world, 'brann')).toBe(true);
    world.ability_charge = 100;
    world.current_tier = 0;
    expect(activateMergeDropAbility(world)).toBe(true);
    expect(world.forge_next).toBe(true);
    expect(dropMergeBall(world)).toBe(true);
    expect(world.balls[0]?.tier).toBe(1);
  });

  it('applique la pitie SSR et debloque un personnage sans achat', () => {
    const world = createMergeDropWorld(DEFAULT_MERGE_DROP_CONFIG, 99);
    world.currency = 1000;
    world.pity = world.config.pity_after - 1;
    const result = summonMergeDropHero(world);

    const ssrIds = world.config.heroes.filter((hero) => hero.rarity === 'SSR').map((hero) => hero.id);
    expect(result?.rarity).toBe('SSR');
    expect(ssrIds).toContain(result?.hero_id);
    expect(world.unlocked_hero_ids).toContain(result?.hero_id);
    expect(world.pity).toBe(0);
  });

  it('donne de l essence pour un doublon sans recrediter la monnaie', () => {
    const config = {
      ...DEFAULT_MERGE_DROP_CONFIG,
      heroes: [DEFAULT_MERGE_DROP_CONFIG.heroes[0]!],
      initial_unlocked_heroes: ['mira'],
    };
    const world = createMergeDropWorld(config, 3);
    world.currency = world.config.summon_cost;

    const result = summonMergeDropHero(world);

    expect(result).toMatchObject({ hero_id: 'mira', duplicate: true, essence_gained: 15 });
    expect(world.currency).toBe(0);
    expect(world.essence).toBe(15);
  });

  it('declenche la defaite apres la grace de debordement configuree', () => {
    const config = { ...DEFAULT_MERGE_DROP_CONFIG, gravity: 0, overflow_grace_ms: 400 };
    const world = createMergeDropWorld(config, 5);
    world.balls.push({
      id: world.next_ball_id++,
      tier: 0,
      x: 360,
      y: config.board.loss_line_y + config.tiers[0]!.radius - 1,
      vx: 0,
      vy: 0,
      born_at_ms: -1000,
    });

    advanceFor(world, 392, 16);
    expect(world.game_over).toBe(false);
    advanceFor(world, 16, 16);
    expect(world.game_over).toBe(true);
  });

  it('fige la partie et recompense la creation du Nexus', () => {
    const config = { ...DEFAULT_MERGE_DROP_CONFIG, gravity: 0 };
    const world = createMergeDropWorld(config, 8);
    const tier = config.tiers.length - 2;
    world.balls.push(
      { id: world.next_ball_id++, tier, x: 330, y: 700, vx: 0, vy: 0, born_at_ms: 0 },
      { id: world.next_ball_id++, tier, x: 390, y: 700, vx: 0, vy: 0, born_at_ms: 0 },
    );

    advanceFor(world, 16, 16);

    expect(world.target_reached).toBe(true);
    expect(world.nexus_completions).toBe(1);
    expect(world.currency).toBe(config.initial_currency + 200 + Math.floor(config.tiers.at(-1)!.score / 35));
    expect(dropMergeBall(world)).toBe(false);
  });

  it('applique les pouvoirs de Mira, Lys et Aster a des etats distincts', () => {
    const config = {
      ...DEFAULT_MERGE_DROP_CONFIG,
      gravity: 0,
      initial_unlocked_heroes: ['mira', 'lys', 'aster'],
    };

    const mira = createMergeDropWorld(config, 10);
    mira.balls.push({ id: 1, tier: 0, x: 120, y: 600, vx: 0, vy: 0, born_at_ms: 0 });
    mira.ability_charge = 100;
    expect(activateMergeDropAbility(mira)).toBe(true);
    expect(mira.balls[0]!.vx).toBeGreaterThan(0);
    expect(mira.balls[0]!.vy).toBeGreaterThan(0);

    const lys = createMergeDropWorld(config, 11);
    lys.balls.push({ id: 1, tier: 0, x: 360, y: 300, vx: 0, vy: 0, born_at_ms: 0 });
    expect(selectMergeDropHero(lys, 'lys')).toBe(true);
    lys.ability_charge = 100;
    expect(activateMergeDropAbility(lys)).toBe(true);
    expect(lys.slow_motion_ms).toBe(6000);
    expect(lys.balls[0]!.y).toBe(396);

    const aster = createMergeDropWorld(config, 12);
    aster.balls.push(
      { id: 1, tier: 0, x: 200, y: 700, vx: 0, vy: 0, born_at_ms: 0 },
      { id: 2, tier: 0, x: 500, y: 700, vx: 0, vy: 0, born_at_ms: 0 },
    );
    expect(selectMergeDropHero(aster, 'aster')).toBe(true);
    aster.ability_charge = 100;
    expect(activateMergeDropAbility(aster)).toBe(true);
    expect(aster.balls).toHaveLength(1);
    expect(aster.balls[0]!.tier).toBe(1);
  });

  it('produit le meme etat physique a 60, 30 et 20 FPS pour les memes entrees', () => {
    const simulate = (frameMs: number) => {
      const world = createMergeDropWorld(DEFAULT_MERGE_DROP_CONFIG, 42);
      world.current_tier = 0;
      world.next_tier = 0;
      world.aim_x = 360;
      dropMergeBall(world);
      world.drop_cooldown_ms = 0;
      dropMergeBall(world);
      advanceFor(world, 4800, frameMs);
      return {
        score: world.score,
        bestTier: world.best_tier,
        balls: world.balls.map((ball) => ({
          tier: ball.tier,
          x: Math.round(ball.x * 1000),
          y: Math.round(ball.y * 1000),
        })),
      };
    };

    expect(simulate(33)).toEqual(simulate(16));
    expect(simulate(50)).toEqual(simulate(16));
  });

  it('l invocation au sanctuaire reste disponible apres une defaite ou une victoire', () => {
    const defeated = createMergeDropWorld(DEFAULT_MERGE_DROP_CONFIG, 55);
    defeated.game_over = true;
    defeated.currency = DEFAULT_MERGE_DROP_CONFIG.summon_cost;
    expect(summonMergeDropHero(defeated)).not.toBeNull();

    const victorious = createMergeDropWorld(DEFAULT_MERGE_DROP_CONFIG, 56);
    victorious.target_reached = true;
    victorious.currency = DEFAULT_MERGE_DROP_CONFIG.summon10_cost;
    expect(summonMergeDropHeroTen(victorious)).not.toBeNull();
  });

  it('invocation x10 : debite le cout unique et garantit au moins un SR+', () => {
    const world = createMergeDropWorld(DEFAULT_MERGE_DROP_CONFIG, 21);
    world.currency = world.config.summon10_cost;

    const batch = summonMergeDropHeroTen(world);

    expect(batch?.results).toHaveLength(10);
    expect(world.currency).toBe(0);
    expect(batch!.results.some((entry) => entry.rarity !== 'R')).toBe(true);
    expect(summonMergeDropHeroTen(world)).toBeNull();
  });

  it('eveil : consomme l essence, monte le niveau et renforce l ult', () => {
    const config = { ...DEFAULT_MERGE_DROP_CONFIG, initial_unlocked_heroes: ['mira', 'lys'] };
    const world = createMergeDropWorld(config, 22);
    world.essence = 500;

    expect(mergeDropAwakenCost(world, 'lys')).toBe(world.config.awaken_base_cost);
    expect(awakenMergeDropHero(world, 'lys')).toBe(true);
    expect(world.hero_levels.lys).toBe(1);
    expect(world.essence).toBe(500 - world.config.awaken_base_cost);
    expect(awakenMergeDropHero(world, 'aster')).toBe(false);

    expect(selectMergeDropHero(world, 'lys')).toBe(true);
    world.ability_charge = 100;
    expect(activateMergeDropAbility(world)).toBe(true);
    expect(world.slow_motion_ms).toBe(7500);
  });

  it('la surpuissance se charge a 200 et renforce fortement la magie', () => {
    const config = { ...DEFAULT_MERGE_DROP_CONFIG, gravity: 0, initial_unlocked_heroes: ['lys'] };
    const world = createMergeDropWorld(config, 23);
    expect(selectMergeDropHero(world, 'lys')).toBe(true);
    world.ability_charge = 200;

    expect(activateMergeDropAbility(world)).toBe(true);
    expect(world.slow_motion_ms).toBe(9000);
    expect(world.ability_charge).toBe(0);
    const cast = world.events.find((event) => event.type === 'ability');
    expect(cast).toMatchObject({ type: 'ability', hero_id: 'lys', overdrive: true });
  });

  it('les ults de Kael, Noor et Elya transforment le plateau chacun a leur facon', () => {
    const config = {
      ...DEFAULT_MERGE_DROP_CONFIG,
      gravity: 0,
      initial_unlocked_heroes: ['kael', 'noor', 'elya'],
    };

    const kael = createMergeDropWorld(config, 30);
    kael.balls.push(
      { id: 1, tier: 0, x: 200, y: 700, vx: 0, vy: 0, born_at_ms: 0 },
      { id: 2, tier: 0, x: 400, y: 700, vx: 0, vy: 0, born_at_ms: 0 },
      { id: 3, tier: 2, x: 300, y: 800, vx: 0, vy: 0, born_at_ms: 0 },
    );
    expect(selectMergeDropHero(kael, 'kael')).toBe(true);
    kael.ability_charge = 100;
    const currencyBefore = kael.currency;
    expect(activateMergeDropAbility(kael)).toBe(true);
    expect(kael.balls).toHaveLength(1);
    expect(kael.balls[0]!.tier).toBe(2);
    expect(kael.score).toBeGreaterThan(0);
    expect(kael.currency).toBeGreaterThan(currencyBefore);

    const noor = createMergeDropWorld(config, 31);
    noor.balls.push(
      { id: 1, tier: 0, x: 200, y: 700, vx: 0, vy: 0, born_at_ms: 0 },
      { id: 2, tier: 1, x: 460, y: 700, vx: 0, vy: 0, born_at_ms: 0 },
    );
    expect(selectMergeDropHero(noor, 'noor')).toBe(true);
    noor.ability_charge = 100;
    expect(activateMergeDropAbility(noor)).toBe(true);
    expect(noor.balls.map((ball) => ball.tier).sort()).toEqual([1, 2]);

    const elya = createMergeDropWorld(config, 32);
    elya.balls.push(
      { id: 1, tier: 0, x: 150, y: 700, vx: 0, vy: 0, born_at_ms: 0 },
      { id: 2, tier: 0, x: 300, y: 700, vx: 0, vy: 0, born_at_ms: 0 },
      { id: 3, tier: 1, x: 450, y: 700, vx: 0, vy: 0, born_at_ms: 0 },
    );
    expect(selectMergeDropHero(elya, 'elya')).toBe(true);
    elya.ability_charge = 100;
    expect(activateMergeDropAbility(elya)).toBe(true);
    // 0+0 -> 1, puis 1+1 -> 2 : la cascade complete ne laisse qu un personnage.
    expect(elya.balls).toHaveLength(1);
    expect(elya.balls[0]!.tier).toBe(2);
  });

  it('un doublon accorde une etoile d evolution qui debloque les competences', () => {
    const config = {
      ...DEFAULT_MERGE_DROP_CONFIG,
      heroes: DEFAULT_MERGE_DROP_CONFIG.heroes.filter((hero) => hero.id === 'mira'),
      initial_unlocked_heroes: ['mira'],
    };
    const world = createMergeDropWorld(config, 60);
    world.currency = 1000;

    expect(mergeDropHeroStars(world, 'mira')).toBe(0);
    expect(mergeDropModifiers(world).eclat_bonus_pct).toBe(0);

    summonMergeDropHero(world);
    expect(mergeDropHeroStars(world, 'mira')).toBe(1);
    // 1 etoile -> competence A de Mira : eclats +10 %.
    expect(mergeDropModifiers(world).eclat_bonus_pct).toBe(10);
    expect(mergeDropModifiers(world).charge_merge_bonus).toBe(0);

    summonMergeDropHero(world);
    summonMergeDropHero(world);
    expect(mergeDropHeroStars(world, 'mira')).toBe(3);
    // 3 etoiles -> competence B : +2 charge par fusion.
    expect(mergeDropModifiers(world).charge_merge_bonus).toBe(2);
  });

  it('le reliquaire tire reliques et compagnons, monte les niveaux et garantit un SR+ en x10', () => {
    const world = createMergeDropWorld(DEFAULT_MERGE_DROP_CONFIG, 61);
    world.currency = DEFAULT_MERGE_DROP_CONFIG.relic_summon_cost + DEFAULT_MERGE_DROP_CONFIG.relic_summon10_cost;

    const single = summonMergeDropRelic(world);
    expect(single).not.toBeNull();
    expect(['relic', 'companion']).toContain(single!.kind);
    expect(single!.level).toBe(1);

    const batch = summonMergeDropRelicTen(world);
    expect(batch).toHaveLength(10);
    expect(batch!.some((entry) => entry.rarity !== 'R')).toBe(true);
    expect(world.currency).toBe(0);
    const owned = { ...world.relic_levels, ...world.companion_levels };
    expect(Object.keys(owned).length).toBeGreaterThan(0);
    // Le premier objet de chaque type est auto-equipe.
    expect(world.equipped_relic ?? world.equipped_companion).toBeTruthy();
  });

  it('la relique equipee applique son passif et prime la charge de depart', () => {
    const world = createMergeDropWorld(DEFAULT_MERGE_DROP_CONFIG, 62);
    world.relic_levels = { coeur_nexus: 1 };
    expect(equipMergeDropRelic(world, 'coeur_nexus')).toBe(true);
    expect(mergeDropModifiers(world).start_charge).toBe(40);
    primeMergeDropRun(world);
    expect(world.ability_charge).toBe(40);

    // Niveau 3 : 40 x 1,5 = 60.
    world.relic_levels = { coeur_nexus: 3 };
    expect(mergeDropModifiers(world).start_charge).toBe(60);
    expect(equipMergeDropRelic(world, 'objet_inconnu')).toBe(false);
  });

  it('le compagnon equipe proc toutes les N fusions', () => {
    const config = { ...DEFAULT_MERGE_DROP_CONFIG, gravity: 0 };
    const world = createMergeDropWorld(config, 63);
    world.companion_levels = { nebulin: 1 };
    expect(equipMergeDropCompanion(world, 'nebulin')).toBe(true);

    // Force 10 fusions successives : paires posees puis pas de simulation.
    for (let i = 0; i < 10; i++) {
      world.balls.push(
        { id: world.next_ball_id++, tier: 0, x: 200, y: 700, vx: 0, vy: 0, born_at_ms: 0 },
        { id: world.next_ball_id++, tier: 0, x: 210, y: 700, vx: 0, vy: 0, born_at_ms: 0 },
      );
      stepMergeDropWorld(world, 16);
      world.balls = [];
    }

    const procs = world.events.filter((event) => event.type === 'companion_proc');
    expect(procs).toHaveLength(1);
    expect(world.ability_charge).toBeGreaterThanOrEqual(8);
  });

  it('pilote une mission de score avec chrono et recompense', () => {
    const config = { ...DEFAULT_MERGE_DROP_CONFIG, gravity: 0 };
    const world = createMergeDropWorld(config, 71, {
      id: 'campaign_1_1',
      name: 'Première lueur',
      mode: 'score',
      target_score: 100,
      time_limit_ms: 30_000,
      reward_currency: 75,
      reward_essence: 4,
    });
    world.balls.push(
      { id: world.next_ball_id++, tier: 2, x: 330, y: 700, vx: 0, vy: 0, born_at_ms: 0 },
      { id: world.next_ball_id++, tier: 2, x: 350, y: 700, vx: 0, vy: 0, born_at_ms: 0 },
    );
    stepMergeDropWorld(world, 16);
    expect(world.target_reached).toBe(true);
    expect(world.currency).toBe(config.initial_currency + 75 + Math.floor(config.tiers[3]!.score / 35));
    expect(world.essence).toBe(4);
    expect(world.events.some((event) => event.type === 'mission_complete')).toBe(true);
  });

  it('termine une survie au chrono et fait echouer un score hors delai', () => {
    const survival = createMergeDropWorld(DEFAULT_MERGE_DROP_CONFIG, 72, {
      id: 'rift_survival', name: 'Faille stable', mode: 'survival', time_limit_ms: 96,
    });
    advanceFor(survival, 104, 16);
    expect(survival.target_reached).toBe(true);
    expect(survival.game_over).toBe(false);

    const score = createMergeDropWorld(DEFAULT_MERGE_DROP_CONFIG, 73, {
      id: 'rift_score', name: 'Blitz', mode: 'score', target_score: 9999, time_limit_ms: 96,
    });
    advanceFor(score, 104, 16);
    expect(score.game_over).toBe(true);
    expect(score.target_reached).toBe(false);
  });

  it('un boss perd des PV sur les fusions et change de phase', () => {
    const config = { ...DEFAULT_MERGE_DROP_CONFIG, gravity: 0 };
    const world = createMergeDropWorld(config, 74, {
      id: 'boss_leviathan', name: 'Léviathan', mode: 'boss', boss_max_hp: 100, reward_currency: 120,
    });
    world.balls.push(
      { id: world.next_ball_id++, tier: 3, x: 330, y: 700, vx: 0, vy: 0, born_at_ms: 0 },
      { id: world.next_ball_id++, tier: 3, x: 350, y: 700, vx: 0, vy: 0, born_at_ms: 0 },
    );
    stepMergeDropWorld(world, 16);
    expect(world.boss_hp).toBe(0);
    expect(world.boss_phase).toBe(3);
    expect(world.target_reached).toBe(true);
    expect(world.events.some((event) => event.type === 'boss_hit')).toBe(true);
  });

  it('respecte la garantie 50-50 de la banniere vedette', () => {
    const config = {
      ...DEFAULT_MERGE_DROP_CONFIG,
      summon_rates: { R: 0, SR: 0, SSR: 1 },
    };
    const world = createMergeDropWorld(config, 75);
    world.currency = config.summon_cost;
    world.featured_guaranteed = true;
    const result = summonMergeDropHero(world, { featured_hero_id: 'solveig' });
    expect(result?.hero_id).toBe('solveig');
    expect(result?.featured).toBe(true);
    expect(world.featured_guaranteed).toBe(false);
  });
});
