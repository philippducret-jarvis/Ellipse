import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { MIN_SHIPPING_IOU } from '@ellipse/shared';

export interface ExportQaGateResult {
  blocked: boolean;
  reason?: string;
  reports: Array<{ path: string; passed: boolean; blockers: string[]; iou?: number; shipping_ready?: boolean }>;
  shipping_failures?: number;
}

async function readQaReport(filePath: string): Promise<{ passed: boolean; blockers: string[]; iou?: number } | null> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    const data = JSON.parse(raw) as {
      passed?: boolean;
      blockers?: string[];
      fidelity?: { iou?: number };
      iou?: number;
    };
    const iou = data.fidelity?.iou ?? data.iou;
    return { passed: data.passed !== false, blockers: data.blockers ?? [], iou };
  } catch {
    return null;
  }
}

/** Parcourt les dossiers 07_qa sous 03_assets — bloque export si passed === false. */
export async function evaluateProjectExportQaGate(workspaceRoot: string): Promise<ExportQaGateResult> {
  const assetsRoot = join(workspaceRoot, '03_assets');
  const reports: ExportQaGateResult['reports'] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '07_qa') {
          const report = await readQaReport(join(full, 'qa-report.json'));
          if (report) {
            const shippingReady = report.iou == null || report.iou >= MIN_SHIPPING_IOU;
            reports.push({
              path: full.replace(/\\/g, '/'),
              passed: report.passed && shippingReady,
              blockers: [
                ...report.blockers,
                ...(report.iou != null && report.iou < MIN_SHIPPING_IOU
                  ? [`IoU ${report.iou.toFixed(3)} < shipping ${MIN_SHIPPING_IOU}`]
                  : []),
              ],
              iou: report.iou,
              shipping_ready: shippingReady,
            });
          }
        } else {
          await walk(full);
        }
      }
    }
  }

  await walk(assetsRoot);

  const failed = reports.filter((r) => !r.passed);
  const shippingFailures = reports.filter((r) => r.iou != null && r.iou < MIN_SHIPPING_IOU);
  if (failed.length > 0) {
    return {
      blocked: true,
      reason: `${failed.length} asset(s) en échec QA fidelity — corriger avant export (IoU shipping ≥ ${MIN_SHIPPING_IOU})`,
      reports,
      shipping_failures: shippingFailures.length,
    };
  }

  return { blocked: false, reports };
}

export async function appendTelemetryEvent(
  workspaceRoot: string,
  event: Record<string, unknown>,
): Promise<void> {
  const { mkdir, appendFile } = await import('node:fs/promises');
  const dir = join(workspaceRoot, '08_ops', 'telemetry');
  await mkdir(dir, { recursive: true });
  const line = JSON.stringify({ ...event, recorded_at: new Date().toISOString() }) + '\n';
  await appendFile(join(dir, 'events.jsonl'), line, 'utf-8');
}
