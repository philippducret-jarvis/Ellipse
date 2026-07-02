import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import {
  validateIntentContract,
  evaluateGdlAgainstIntent,
  INTENT_CONTRACT_PATH,
  type IntentContract,
  type IntentViolation,
} from '@ellipse/shared';
import type { ExportQaGateResult } from './export-gate.js';

export interface IntentGateResult {
  blocked: boolean;
  reason?: string;
  violations: IntentViolation[];
  contract: IntentContract | null;
}

export async function loadIntentContract(workspaceRoot: string): Promise<IntentContract | null> {
  const path = join(workspaceRoot, INTENT_CONTRACT_PATH);
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(await readFile(path, 'utf-8'));
    const v = validateIntentContract(raw);
    return v.valid ? v.contract! : null;
  } catch {
    return null;
  }
}

export async function evaluateIntentGate(
  workspaceRoot: string,
  gdl?: { systems?: string[]; meta?: Record<string, unknown> },
): Promise<IntentGateResult> {
  const contract = await loadIntentContract(workspaceRoot);
  if (!contract) {
    return {
      blocked: false,
      violations: [{ code: 'INTENT_MISSING', message: 'Contrat intention absent — warning seulement', severity: 'warn' }],
      contract: null,
    };
  }
  const violations = gdl ? evaluateGdlAgainstIntent(contract, gdl) : [];
  const blocking = violations.filter((v) => v.severity === 'block');
  return {
    blocked: blocking.length > 0,
    reason: blocking.length ? blocking.map((b) => b.message).join('; ') : undefined,
    violations,
    contract,
  };
}

/** Combine QA assets + intent contract pour export. */
export async function evaluateFullExportGate(
  workspaceRoot: string,
  qaResult: ExportQaGateResult,
  gdl?: { systems?: string[]; meta?: Record<string, unknown> },
): Promise<{ blocked: boolean; reason?: string }> {
  if (qaResult.blocked) return { blocked: true, reason: qaResult.reason };
  const intent = await evaluateIntentGate(workspaceRoot, gdl);
  if (intent.blocked) return { blocked: true, reason: intent.reason };
  return { blocked: false };
}
