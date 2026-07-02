import { ASSET_FOLDER_TEMPLATE, ASSET_STAGE_FOLDERS, SYNTHETIC_SLOTS } from './catalog.mjs';
import { roleRoutingProfile } from './routing.mjs';
import { buildProductionWebFiles } from './web-template.mjs';

function createJsonFile(path, payload) {
  return { path, content: JSON.stringify(payload, null, 2) };
}

function createTextFile(path, content) {
  return { path, content };
}

function buildSyntheticAssetFiles(checkedAt, syntheticWorkOrders) {
  const files = [];

  for (const slot of SYNTHETIC_SLOTS) {
    const matchingWorkOrder = syntheticWorkOrders.find((entry) => entry.asset_root === slot.root);
    files.push(createTextFile(`${slot.root}/README.md`, ASSET_FOLDER_TEMPLATE));
    for (const folder of ASSET_STAGE_FOLDERS) {
      files.push(createTextFile(`${slot.root}/${folder}/.gitkeep`, ''));
    }
    files.push(
      createJsonFile(`${slot.root}/pipeline.contract.json`, {
        checked_at: checkedAt,
        title: slot.title,
        role: slot.role,
        kind: slot.kind,
        workspace_root: slot.root,
        pipeline: roleRoutingProfile(slot.role, slot.kind).pipeline,
      }),
    );
    files.push(createJsonFile(`${slot.root}/08_remote_jobs/production.workorder.json`, matchingWorkOrder));
  }

  return files;
}

function buildExistingAssetFiles(currentWorkOrders) {
  return currentWorkOrders
    .filter((order) => order.asset_root)
    .map((order) => createJsonFile(`${order.asset_root}/08_remote_jobs/production.workorder.json`, order));
}

export function buildProductionFilePlan({
  checkedAt,
  assetTaxonomy,
  modelRouting,
  productionBoard,
  productionManifest,
  currentWorkOrders,
  syntheticWorkOrders,
}) {
  const web = buildProductionWebFiles();

  return [
    createJsonFile('03_assets/registry/asset-taxonomy.json', assetTaxonomy),
    createJsonFile('03_assets/registry/model-routing.json', modelRouting),
    createJsonFile('08_ops/manifests/agent-work-orders.json', { checked_at: checkedAt, work_orders: [...currentWorkOrders, ...syntheticWorkOrders] }),
    createJsonFile('08_ops/manifests/production-hq.json', productionBoard),
    createJsonFile('07_exports/web/production-hq.manifest.json', productionManifest),
    createTextFile('07_exports/web/production-hq.html', web.html),
    createTextFile('07_exports/web/production-hq.css', web.css),
    createTextFile('07_exports/web/production-hq.js', web.js),
    ...buildSyntheticAssetFiles(checkedAt, syntheticWorkOrders),
    ...buildExistingAssetFiles(currentWorkOrders),
  ];
}
