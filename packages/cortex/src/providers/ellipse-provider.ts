/**
 * Provider Ellipse — modèle Cortex Planner FROM-SCRATCH (cible souveraine, ORDRE-001).
 *
 * Charge le modèle entraîné dans `training/` et exporté en ONNX :
 *   ${ELLIPSE_MODELS_DIR}/cortex-planner-v0/
 *     ├── model.onnx        (poids Ellipse, init aléatoire → entraînés, AUCUN pré-entraîné tiers)
 *     ├── tokenizer.json    ({ max_len, pad_id, unk_id, vocab })
 *     └── labels.json       ({ genres, dimensions, mechanics, features })
 *
 * Inférence via `onnxruntime-node` (dépendance optionnelle) — aucun Python à l'exécution.
 * Tant que les poids ne sont pas exportés, `isAvailable()` renvoie `false` et le routeur
 * retombe sur le pont open-weights puis l'heuristique (cf. provider-registry.ts).
 *
 * Scope v0 : tête de planification non incluse → `planHints` renvoie `null` (la
 * planification reste heuristique). Le Planner v0 prédit l'INTENT (genre, dimension
 * 2d/2.5d/3d, mécaniques, features).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { UserIntent } from '@ellipse/shared';
import type { CortexProvider, LLMPlanHints } from '../provider.js';
import { parseFallbackIntent } from './heuristics.js';

interface TokenizerSpec {
  max_len: number;
  pad_id: number;
  unk_id: number;
  vocab: Record<string, number>;
}

interface LabelsSpec {
  genres: string[];
  dimensions: string[];
  mechanics: string[];
  features: string[];
}

/** Découpage miroir EXACT du tokenizer Python (`training/ellipse_cortex/tokenizer.py`). */
function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function argmax(arr: ArrayLike<number>): number {
  let best = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i]! > arr[best]!) best = i;
  return best;
}

function plannerDir(): string {
  const explicit = process.env.ELLIPSE_CORTEX_PLANNER;
  if (explicit) return explicit;
  const modelsDir = process.env.ELLIPSE_MODELS_DIR ?? './models';
  return join(modelsDir, 'cortex-planner-v0');
}

export class EllipseProvider implements CortexProvider {
  readonly name = 'ellipse';

  private session: any = null;
  private tokenizer: TokenizerSpec | null = null;
  private labels: LabelsSpec | null = null;
  private loadFailed = false;

  async isAvailable(): Promise<boolean> {
    if (this.session) return true;
    if (this.loadFailed) return false;
    const dir = plannerDir();
    const modelPath = join(dir, 'model.onnx');
    const tokPath = join(dir, 'tokenizer.json');
    const labelsPath = join(dir, 'labels.json');
    if (!existsSync(modelPath) || !existsSync(tokPath) || !existsSync(labelsPath)) {
      return false;
    }
    try {
      // Dépendance optionnelle : import indirect pour ne pas exiger le module au build.
      const spec = 'onnxruntime-node';
      const ort: any = await import(spec);
      this.session = await ort.InferenceSession.create(modelPath);
      this.tokenizer = JSON.parse(readFileSync(tokPath, 'utf-8')) as TokenizerSpec;
      this.labels = JSON.parse(readFileSync(labelsPath, 'utf-8')) as LabelsSpec;
      return true;
    } catch {
      this.loadFailed = true;
      return false;
    }
  }

  async parseIntent(prompt: string, sourceImages: string[] = []): Promise<UserIntent> {
    if (!(await this.isAvailable()) || !this.session || !this.tokenizer || !this.labels) {
      return parseFallbackIntent(prompt, sourceImages);
    }
    try {
      const ids = this.encode(prompt);
      const spec = 'onnxruntime-node';
      const ort: any = await import(spec);
      const input = new ort.Tensor('int64', BigInt64Array.from(ids.map((n) => BigInt(n))), [1, ids.length]);
      const out = await this.session.run({ input_ids: input });

      const genreLogits = out.genre_logits.data as Float32Array;
      const dimLogits = out.dimension_logits.data as Float32Array;
      const mechLogits = out.mechanics_logits.data as Float32Array;
      const featLogits = out.features_logits.data as Float32Array;

      const { genres, dimensions, mechanics, features } = this.labels;
      const genre = genres[argmax(genreLogits)] ?? 'platformer';
      const dimension = (dimensions[argmax(dimLogits)] ?? '2d') as UserIntent['dimension'];
      const pickedMechanics = mechanics.filter((_, i) => sigmoid(mechLogits[i] ?? -10) > 0.5);
      const feat = (name: string) => sigmoid(featLogits[features.indexOf(name)] ?? -10) > 0.5;

      return {
        raw_prompt: prompt,
        genre,
        dimension,
        mechanics: pickedMechanics,
        source_images: sourceImages,
        features: { narrative: feat('narrative'), vfx: feat('vfx'), cinematic: feat('cinematic') },
      };
    } catch {
      return parseFallbackIntent(prompt, sourceImages);
    }
  }

  /** v0 : pas de tête de planification → l'heuristique de PlanModule décide. */
  async planHints(_intent: UserIntent): Promise<LLMPlanHints | null> {
    return null;
  }

  private encode(text: string): number[] {
    const tok = this.tokenizer!;
    const tokens = tokenize(text);
    const ids = tokens.map((t) => tok.vocab[t] ?? tok.unk_id);
    if (ids.length >= tok.max_len) return ids.slice(0, tok.max_len);
    return [...ids, ...Array(tok.max_len - ids.length).fill(tok.pad_id)];
  }
}
