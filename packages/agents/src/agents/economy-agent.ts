import type { TaskSpec } from '@ellipse/shared';
import { BaseAgent } from '../base-agent.js';

interface PullSimulation {
  pulls: number;
  ssr: number;
  sr: number;
  r: number;
  hard_pity_hits: number;
  observed_ssr_rate: number;
}

function simulatePulls(pulls: number, ssrRate: number, srRate: number, hardPity: number): PullSimulation {
  let ssr = 0;
  let sr = 0;
  let r = 0;
  let pity = 0;
  let hardPityHits = 0;
  let seed = 1337;

  for (let i = 0; i < pulls; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const roll = seed / 0xffffffff;
    pity++;
    if (pity >= hardPity || roll < ssrRate) {
      ssr++;
      if (pity >= hardPity && roll >= ssrRate) hardPityHits++;
      pity = 0;
    } else if (roll < ssrRate + srRate) {
      sr++;
    } else {
      r++;
    }
  }

  return {
    pulls,
    ssr,
    sr,
    r,
    hard_pity_hits: hardPityHits,
    observed_ssr_rate: Number((ssr / pulls).toFixed(4)),
  };
}

export class EconomyAgent extends BaseAgent {
  readonly id = 'economy' as const;
  readonly name = "L'Economiste";
  readonly description = 'Gacha, monnaies, inventaire, live-ops et compliance';

  async execute(task: TaskSpec) {
    const genre = String(task.input.genre ?? this.getGenre(task));
    const isGacha = genre === 'gacha_rpg' || (task.input.mechanics as string[] | undefined)?.includes('gacha_summon');
    const ssrRate = Number(task.input.ssr_rate ?? 0.02);
    const srRate = Number(task.input.sr_rate ?? 0.12);
    const hardPity = Number(task.input.hard_pity ?? 60);
    const simulation = simulatePulls(10_000, ssrRate, srRate, hardPity);

    const economy = {
      mode: isGacha ? 'gacha_liveops' : 'progression_economy',
      currencies: [
        { id: 'soft_currency', label: 'Echo Shards', kind: 'earned', paid: false },
        { id: 'premium_currency', label: 'Moon Crystals', kind: 'premium', paid: true },
        { id: 'stamina', label: 'Stamina', kind: 'time_gated', paid: false, regen_minutes: 6 },
      ],
      roster_progression: {
        levels: { max: 80, xp_curve: 'soft_exponential' },
        ascension: { tiers: 6, materials: ['memory_bloom', 'boss_core', 'class_emblem'] },
        duplicates: { conversion: 'fragments', fragments_per_duplicate: { ssr: 50, sr: 10, r: 2 } },
      },
      banners: isGacha
        ? [
            {
              id: 'starter_moonlit_banner',
              label: 'Moonlit Oath',
              cost: { currency: 'premium_currency', amount: 160 },
              rates: { ssr: ssrRate, sr: srRate, r: Number((1 - ssrRate - srRate).toFixed(4)) },
              pity: { hard: hardPity, soft_starts_at: Math.max(1, hardPity - 15), carries_between_banners: true },
              spark: { pulls_required: 180, reward: 'featured_ssr_selector' },
              pool_tags: ['featured', 'standard_roster', 'weapon_relics'],
            },
          ]
        : [],
      liveops: {
        daily_missions: ['clear_one_run', 'upgrade_one_unit', 'open_one_reward'],
        weekly_missions: ['defeat_three_bosses', 'complete_seven_dailies'],
        event_calendar_template: ['launch_week', 'first_balance_patch', 'boss_rerun'],
      },
      remote_config_defaults: {
        ssr_rate: ssrRate,
        sr_rate: srRate,
        hard_pity: hardPity,
        stamina_regen_minutes: 6,
        first_session_reward_multiplier: 1.5,
      },
      analytics_events: [
        'tutorial_step',
        'run_start',
        'run_complete',
        'currency_earned',
        'banner_view',
        'pull_started',
        'pull_resolved',
        'pity_changed',
      ],
      compliance: {
        randomized_paid_rewards: isGacha,
        odds_disclosure_required: isGacha,
        disclose_before_purchase: true,
        disclose_close_to_purchase_button: true,
        audit_outputs: ['odds_table.json', 'pull_history.jsonl', 'economy_balance_report.json'],
      },
      balance_simulation: simulation,
    };

    return this.success(task, {
      gdl_patches: [
        { op: 'replace', path: '/meta/economy', value: economy },
        { op: 'replace', path: '/meta/economy_compliance', value: economy.compliance },
        ...(isGacha ? [{ op: 'replace', path: '/meta/summon_banner', value: economy.banners[0] }] : []),
        { op: 'replace', path: '/meta/telemetry_events', value: economy.analytics_events },
      ],
      agent_notes: isGacha
        ? `Gacha economy · SSR ${ssrRate} · pity ${hardPity} · simulation SSR ${simulation.observed_ssr_rate}`
        : 'Progression economy · currencies, rewards, telemetry and remote config defaults',
    });
  }
}
