/**
 * Vérifie que tous les packs Veloria atteignent le seuil shipping IoU.
 */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { ALL_ASSETS } from './data.mjs';
import { WORKSPACE_ROOT } from './constants.mjs';

export const SHIPPING_IOU = 0.72;

async function readQaReport(packRoot) {
  const p = join(WORKSPACE_ROOT, packRoot, '07_qa', 'qa-report.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(await readFile(p, 'utf-8'));
  } catch {
    return null;
  }
}

/** Scan récursif de tous les qa-report.json sous 03_assets. */
export async function scanAllQaReports(workspaceRoot = WORKSPACE_ROOT) {
  const assetsRoot = join(workspaceRoot, '03_assets');
  const reports = [];

  async function walk(dir) {
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
          const qaPath = join(full, 'qa-report.json');
          if (existsSync(qaPath)) {
            try {
              const qa = JSON.parse(await readFile(qaPath, 'utf-8'));
              reports.push({
                path: full.replace(/\\/g, '/'),
                pack_root: full.replace(/\/07_qa$/, '').replace(/\\07_qa$/, ''),
                passed: qa.passed !== false,
                iou: qa.fidelity?.iou ?? qa.iou ?? null,
                method: qa.fidelity?.method ?? qa.method ?? null,
                shipping_ready: (qa.fidelity?.iou ?? qa.iou ?? 0) >= SHIPPING_IOU && qa.passed !== false,
              });
            } catch {
              /* skip */
            }
          }
        } else {
          await walk(full);
        }
      }
    }
  }

  await walk(assetsRoot);
  return reports;
}

/** Vérifie les 29 packs canoniques Veloria. */
export async function verifyVeloriaShippingFidelity(workspaceRoot = WORKSPACE_ROOT) {
  const packs = ALL_ASSETS.filter((a) => a.pack_root);
  const assetReports = [];

  for (const asset of packs) {
    const qa = await readQaReport(asset.pack_root);
    const iou = qa?.fidelity?.iou ?? qa?.iou ?? 0;
    assetReports.push({
      key: asset.key,
      title: asset.title,
      role: asset.role,
      pack_root: asset.pack_root,
      passed: qa?.passed !== false,
      iou,
      method: qa?.fidelity?.method ?? qa?.method ?? null,
      shipping_ready: iou >= SHIPPING_IOU && qa?.passed !== false,
      missing_qa: !qa,
    });
  }

  const shippingReady = assetReports.filter((a) => a.shipping_ready).length;
  const allShipping = shippingReady === packs.length;
  const allPassed = assetReports.every((a) => a.passed && !a.missing_qa);

  return {
    shipping_iou: SHIPPING_IOU,
    generated_at: new Date().toISOString(),
    stats: {
      total: packs.length,
      shipping_ready: shippingReady,
      below_threshold: packs.length - shippingReady,
      all_shipping: allShipping,
      all_qa_passed: allPassed,
    },
    assets: assetReports,
    ready: allShipping && allPassed,
  };
}
