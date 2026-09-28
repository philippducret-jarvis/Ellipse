import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.argv[2] ?? process.cwd());
const workspace = path.join(projectRoot, "workspaces", "orbes-d-astra");
const dataRoot = path.join(workspace, "04_runtime", "godot", "data");
const manifestPath = path.join(
  workspace,
  "01_preproduction",
  "manifests",
  "characters-3d.json",
);
const guardianCatalogPath = path.join(dataRoot, "guardians_3d_v2.json");
const supportCatalogPath = path.join(dataRoot, "assets_3d_catalog.json");
const loadoutCatalogPath = path.join(dataRoot, "loadouts_3d_v2.json");
const summonCatalogPath = path.join(dataRoot, "summons_3d_v2.json");
const outputJson = path.join(
  workspace,
  "03_assets",
  "3d",
  "catalog_v2",
  "catalog-audit.json",
);
const outputMarkdown = path.join(
  workspace,
  "01_preproduction",
  "16_ETAT_CATALOGUE_3D.md",
);

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const manifest = readJson(manifestPath);
const guardians = readJson(guardianCatalogPath);
const supportAssets = readJson(supportCatalogPath);
const loadouts = readJson(loadoutCatalogPath);
const summons = readJson(summonCatalogPath);
const failures = [];

function checkGlb(file, label) {
  if (!fs.existsSync(file)) {
    failures.push(`${label}: fichier absent (${file})`);
    return { valid: false, bytes: 0 };
  }
  const buffer = fs.readFileSync(file);
  const valid =
    buffer.length >= 20 &&
    buffer.toString("ascii", 0, 4) === "glTF" &&
    buffer.readUInt32LE(4) === 2 &&
    buffer.readUInt32LE(8) === buffer.length;
  if (!valid) failures.push(`${label}: en-tête GLB invalide`);
  return { valid, bytes: buffer.length };
}

const expectedIds = new Set(manifest.guardians.map((guardian) => guardian.id));
const guardianIds = new Set(guardians.guardians.map((guardian) => guardian.id));
for (const id of expectedIds) {
  if (!guardianIds.has(id)) failures.push(`Gardien absent du catalogue V3: ${id}`);
}
for (const guardian of guardians.guardians) {
  const result = checkGlb(
    path.join(projectRoot, guardian.sourceGlb),
    `Gardien ${guardian.id}`,
  );
  if (guardian.metrics?.bytes !== result.bytes) {
    failures.push(`Gardien ${guardian.id}: taille du catalogue divergente`);
  }
  const reportPath = path.join(
    workspace,
    "03_assets",
    "3d",
    "catalog_v2",
    "guardians",
    guardian.id,
    "qa-report.json",
  );
  if (!fs.existsSync(reportPath)) {
    failures.push(`Gardien ${guardian.id}: rapport QA absent`);
    continue;
  }
  const report = readJson(reportPath);
  if (!report.adultConfirmed) {
    failures.push(`Gardien ${guardian.id}: statut adulte non confirmé`);
  }
  if ((report.deformBones ?? 0) < 50) {
    failures.push(`Gardien ${guardian.id}: squelette incomplet`);
  }
  if ((report.animationClips ?? []).length < 1) {
    failures.push(`Gardien ${guardian.id}: animation absente`);
  }
  if ((report.sockets ?? []).length !== 4) {
    failures.push(`Gardien ${guardian.id}: sockets incomplets`);
  }
}

const supportRoot = path.join(workspace, "03_assets", "3d", "catalog_v1");
const supportByKind = {};
for (const asset of supportAssets.assets) {
  supportByKind[asset.kind] = (supportByKind[asset.kind] ?? 0) + 1;
  checkGlb(path.join(supportRoot, asset.source), `Actif de support ${asset.id}`);
}

const loadoutByKind = {};
const loadoutByGuardian = new Map();
for (const item of loadouts.items) {
  loadoutByKind[item.kind] = (loadoutByKind[item.kind] ?? 0) + 1;
  loadoutByGuardian.set(
    item.guardianId,
    (loadoutByGuardian.get(item.guardianId) ?? 0) + 1,
  );
  checkGlb(path.join(projectRoot, item.source), `Loadout ${item.id}`);
}
for (const id of expectedIds) {
  if ((loadoutByGuardian.get(id) ?? 0) !== 6) {
    failures.push(
      `Loadout ${id}: 6 paquets attendus, ${loadoutByGuardian.get(id) ?? 0} trouvés`,
    );
  }
}

const summonByKind = {};
for (const item of summons.items) {
  summonByKind[item.kind] = (summonByKind[item.kind] ?? 0) + 1;
  const source = item.sourceGlb ?? item.source;
  checkGlb(path.join(projectRoot, source), `Invocation ${item.id}`);
  if (item.kind === "rigged_familiar") {
    if ((item.animations ?? []).length < 1) {
      failures.push(`Invocation ${item.id}: animation absente`);
    }
    if ((item.deformBones ?? 0) < 1) {
      failures.push(`Invocation ${item.id}: squelette absent`);
    }
  }
}
for (const orb of summons.livingOrbs ?? []) {
  summonByKind.living_orb = (summonByKind.living_orb ?? 0) + 1;
  checkGlb(path.join(projectRoot, orb.source), `Orbe vivante ${orb.id}`);
}
if ((summonByKind.rigged_familiar ?? 0) !== 12) {
  failures.push(
    `Familiers riggés: 12 attendus, ${summonByKind.rigged_familiar ?? 0} trouvés`,
  );
}
if ((summonByKind.living_orb ?? 0) !== 8) {
  failures.push(
    `Orbes vivantes: 8 attendues, ${summonByKind.living_orb ?? 0} trouvées`,
  );
}

const fabricRoot = path.join(
  workspace,
  "03_assets",
  "3d",
  "materials",
  "astra_fabrics_v1",
);
const fabricTextures = fs
  .readdirSync(fabricRoot)
  .filter((name) => name.endsWith("_basecolor.png"));
if (fabricTextures.length !== 4) {
  failures.push(
    `Textures de brocart: 4 attendues, ${fabricTextures.length} trouvées`,
  );
}

const audit = {
  generatedAt: new Date().toISOString(),
  status: failures.length ? "failed" : "passed",
  truth: {
    integrationReady: failures.length === 0,
    commercialFinal: false,
    remainingCommercialGates: [
      "sculpt de finition propre à chaque identité",
      "retopologie et LOD1/LOD2 définitifs",
      "cartes PBR complètes et textures peintes uniques",
      "formes faciales et animation complète",
      "validation des déformations extrêmes PC/mobile",
    ],
  },
  guardians: {
    expected: expectedIds.size,
    catalogued: guardianIds.size,
    bytes: guardians.summary?.bytes ?? 0,
    triangles: guardians.summary?.triangles ?? 0,
  },
  loadouts: {
    total: loadouts.items.length,
    byKind: loadoutByKind,
    expectedPerGuardian: 6,
  },
  summons: {
    total: summons.items.length + (summons.livingOrbs?.length ?? 0),
    byKind: summonByKind,
    animations: summons.summary?.animations ?? 0,
    bytes: summons.summary?.bytes ?? 0,
  },
  proceduralSupportCatalog: {
    total: supportAssets.assets.length,
    byKind: supportByKind,
  },
  fabrics: fabricTextures,
  failures,
};

fs.mkdirSync(path.dirname(outputJson), { recursive: true });
fs.writeFileSync(outputJson, `${JSON.stringify(audit, null, 2)}\n`);

const lines = [
  "# État du catalogue 3D",
  "",
  `Audit généré le ${audit.generatedAt}.`,
  "",
  `Statut automatique : **${audit.status}**.`,
  "",
  "## Livrables vérifiés",
  "",
  `- gardiens V3 : ${audit.guardians.catalogued}/${audit.guardians.expected} ;`,
  `- tenues V2 : ${loadoutByKind.outfit ?? 0} ;`,
  `- armes V2 : ${loadoutByKind.weapon ?? 0} ;`,
  `- artefacts V2 : ${loadoutByKind.artifact ?? 0} ;`,
  `- familiers riggés : ${summonByKind.rigged_familiar ?? 0} ;`,
  `- orbes vivantes : ${summonByKind.living_orb ?? 0} ;`,
  `- clips d'animation des familiers : ${audit.summons.animations} ;`,
  `- actifs procéduraux de support : ${audit.proceduralSupportCatalog.total} ;`,
  `- textures de brocart astral : ${audit.fabrics.length}.`,
  "",
  "## Statut artistique réel",
  "",
  "Le catalogue est destiné à l’intégration et à la validation en jeu. Il ne",
  "porte pas le statut `commercial_final`. Les modèles ont une topologie",
  "humanoïde réelle, un rig, des vêtements pondérés et des GLB vérifiés, mais",
  "les gates suivantes restent obligatoires :",
  "",
  ...audit.truth.remainingCommercialGates.map((gate) => `- ${gate} ;`),
  "",
  "## Échecs",
  "",
  ...(failures.length ? failures.map((failure) => `- ${failure}`) : ["Aucun."]),
  "",
];
fs.writeFileSync(outputMarkdown, `${lines.join("\n")}\n`);

console.log(JSON.stringify(audit, null, 2));
if (failures.length) process.exitCode = 1;
