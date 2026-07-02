/**
 * Lance le pipeline fidélité photo Veloria depuis l'orchestrator.
 */
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { MIN_SHIPPING_IOU } from '@ellipse/shared';

export interface VeloriaFidelityReport {
  ready: boolean;
  shipping_ready: number;
  total: number;
  shipping_iou: number;
  report_path?: string;
}

export async function runVeloriaFidelityPipeline(
  projectRoot: string,
  opts: { force?: boolean } = {},
): Promise<VeloriaFidelityReport> {
  const script = join(projectRoot, 'tools', 'lib', 'veloria', 'fidelity-pipeline.mjs');
  if (!existsSync(script)) {
    throw new Error(`Pipeline fidélité introuvable: ${script}`);
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd: projectRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        FORCE_FIDELITY: opts.force ? '1' : process.env.FORCE_FIDELITY ?? '0',
      },
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Pipeline fidélité Veloria échoué (code ${code})`));
    });
  });

  return readVeloriaFidelityStatus(
    join(projectRoot, 'workspaces', 'veloria-veille-des-lames'),
  );
}

export async function readVeloriaFidelityStatus(workspaceRoot: string): Promise<VeloriaFidelityReport> {
  const reportPath = join(workspaceRoot, '08_ops', 'manifests', 'fidelity-pipeline-report.json');
  if (existsSync(reportPath)) {
    try {
      const raw = JSON.parse(await readFile(reportPath, 'utf-8')) as {
        ready?: boolean;
        fidelity?: { stats?: { shipping_ready?: number; total?: number }; ready?: boolean };
        shipping_iou?: number;
      };
      const stats = raw.fidelity?.stats;
      return {
        ready: raw.ready === true || raw.fidelity?.ready === true,
        shipping_ready: stats?.shipping_ready ?? 0,
        total: stats?.total ?? 29,
        shipping_iou: raw.shipping_iou ?? MIN_SHIPPING_IOU,
        report_path: reportPath,
      };
    } catch {
      /* fallback scan */
    }
  }

  const refinePath = join(workspaceRoot, '08_ops', 'manifests', 'refine-all-report.json');
  if (existsSync(refinePath)) {
    try {
      const refine = JSON.parse(await readFile(refinePath, 'utf-8')) as {
        stats?: { shipping_ready?: number; total?: number };
      };
      const sr = refine.stats?.shipping_ready ?? 0;
      const total = refine.stats?.total ?? 29;
      return {
        ready: sr >= total,
        shipping_ready: sr,
        total,
        shipping_iou: MIN_SHIPPING_IOU,
      };
    } catch {
      /* next */
    }
  }

  return { ready: false, shipping_ready: 0, total: 29, shipping_iou: MIN_SHIPPING_IOU };
}
