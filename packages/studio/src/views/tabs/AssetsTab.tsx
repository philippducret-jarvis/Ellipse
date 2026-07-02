import { useEffect, useMemo, useState, startTransition } from 'react';
import type { AssetStageId, GameProjectAsset, GameProjectSnapshot } from '@ellipse/shared';
import { getFamilyForRole } from '@ellipse/shared';
import {
  createGameAsset,
  fetchAssetStages,
  fetchGameProject,
  generateAssetPrototypes,
  runAssetStage,
  uploadAssetSource,
  retouchAssetImage,
  type AssetStageStatus,
} from '../../api/client.js';
import { AssetFamilyGrid, filterAssetsByFamily } from '../../features/assets/AssetFamilyGrid.js';
import { AssetStageBar } from '../../features/assets/AssetStageBar.js';
import { CorpsPreview } from '../../components/CorpsPreview.js';
import { fetchProjectWorkspaceFile } from '../../api/client.js';

const STATUS_COLOR: Record<GameProjectAsset['status'], string> = {
  concept: '#888888',
  source_ready: '#f1c40f',
  in_progress: '#3498db',
  review: '#9b59b6',
  approved: '#2ecc71',
};

const PROTOTYPE_PRESETS = [
  { label: 'HD sprite', presets: ['hd_sprite_sheet'] },
  { label: '2.5D turn', presets: ['model_25d_turn'] },
  { label: '3D motion', presets: ['model_3d_motion', 'idle_motion_pack'] },
  { label: 'Auto set', presets: undefined },
] as const;

function packRootOf(asset: GameProjectAsset): string | null {
  if (asset.spec && typeof asset.spec === 'object' && 'pack_root' in asset.spec) {
    const root = (asset.spec as { pack_root?: string }).pack_root;
    return typeof root === 'string' ? root : null;
  }
  return null;
}

function isCuratedWorkspaceAsset(asset: GameProjectAsset): boolean {
  return packRootOf(asset) != null;
}

export function AssetsTab({ snap, onUpdate }: { snap: GameProjectSnapshot; onUpdate: (s: GameProjectSnapshot) => void }) {
  const isShowcaseMode = Boolean(snap.project.metadata?.showcase_mode);
  const [newTitle, setNewTitle] = useState('');
  const [newRole, setNewRole] = useState<GameProjectAsset['role']>('hero');
  const [newKind, setNewKind] = useState<GameProjectAsset['kind']>('character');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(snap.assets[0]?.id ?? null);
  const [stages, setStages] = useState<AssetStageStatus[]>([]);
  const [busyStage, setBusyStage] = useState<AssetStageId | null>(null);
  const [rigJson, setRigJson] = useState<string | null>(null);
  const [rigPartUrls, setRigPartUrls] = useState<Record<string, string>>({});

  const visibleAssets = useMemo(() => {
    const hasCuratedWorkspaceAssets = snap.assets.some(isCuratedWorkspaceAsset);
    return hasCuratedWorkspaceAssets ? snap.assets.filter(isCuratedWorkspaceAsset) : snap.assets;
  }, [snap.assets]);

  const filteredAssets = useMemo(
    () => filterAssetsByFamily(visibleAssets, activeFamilyId),
    [visibleAssets, activeFamilyId],
  );

  const sourcesByAsset = useMemo(() => {
    const map = new Map<string, typeof snap.asset_sources>();
    for (const source of snap.asset_sources) {
      const entries = map.get(source.asset_id) ?? [];
      entries.push(source);
      map.set(source.asset_id, entries);
    }
    return map;
  }, [snap.asset_sources]);

  useEffect(() => {
    if (!filteredAssets.length) {
      setSelectedAssetId(null);
      return;
    }
    if (!selectedAssetId || !filteredAssets.some((asset) => asset.id === selectedAssetId)) {
      setSelectedAssetId(filteredAssets[0]?.id ?? null);
    }
  }, [filteredAssets, selectedAssetId]);

  useEffect(() => {
    if (!selectedAssetId || isShowcaseMode) {
      setStages([]);
      return;
    }
    void fetchAssetStages(snap.project.id, selectedAssetId)
      .then(setStages)
      .catch(() => setStages([]));
  }, [selectedAssetId, snap.project.id, isShowcaseMode]);

  const selectedAsset = useMemo(
    () => filteredAssets.find((a) => a.id === selectedAssetId) ?? null,
    [filteredAssets, selectedAssetId],
  );

  useEffect(() => {
    const packRoot = selectedAsset ? packRootOf(selectedAsset) : null;
    if (!packRoot) {
      setRigJson(null);
      setRigPartUrls({});
      return;
    }
    const slug = snap.project.slug;
    const base = `/workspaces/${slug}/${packRoot}`;
    const silhouette = `${base}/03_cleanup/silhouette-clean.png`;
    setRigPartUrls({ body: silhouette, torso: silhouette });
    void fetchProjectWorkspaceFile(snap.project.id, `${packRoot}/04_rig/rig.json`)
      .then((file) => setRigJson(file.content))
      .catch(() => setRigJson(null));
  }, [selectedAsset, snap.project.id, snap.project.slug]);

  async function refresh(): Promise<void> {
    const updated = await fetchGameProject(snap.project.id);
    startTransition(() => onUpdate(updated));
  }

  async function handleCreate(): Promise<void> {
    if (!newTitle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await createGameAsset(snap.project.id, {
        title: newTitle.trim(),
        role: newRole,
        kind: newKind,
      });
      startTransition(() => {
        onUpdate(updated);
        setNewTitle('');
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Échec création asset');
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(assetId: string, file: File | null): Promise<void> {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await uploadAssetSource(snap.project.id, assetId, file);
      startTransition(() => onUpdate(updated));
      if (selectedAssetId === assetId) {
        const nextStages = await fetchAssetStages(snap.project.id, assetId);
        setStages(nextStages);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Échec upload');
    } finally {
      setBusy(false);
    }
  }

  async function handlePrototype(assetId: string, presets?: string[]): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const updated = await generateAssetPrototypes(snap.project.id, assetId, presets);
      startTransition(() => onUpdate(updated));
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Échec génération');
    } finally {
      setBusy(false);
    }
  }

  async function handleRunStage(stageId: AssetStageId): Promise<void> {
    if (!selectedAssetId) return;
    setBusyStage(stageId);
    setError(null);
    try {
      await runAssetStage(snap.project.id, selectedAssetId, stageId);
      const nextStages = await fetchAssetStages(snap.project.id, selectedAssetId);
      setStages(nextStages);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Échec stage');
    } finally {
      setBusyStage(null);
    }
  }

  async function handleRetouch(): Promise<void> {
    if (!selectedAssetId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await retouchAssetImage(snap.project.id, selectedAssetId);
      if (!result.shipping_ready) setError(result.agent_instruction);
      const nextStages = await fetchAssetStages(snap.project.id, selectedAssetId);
      setStages(nextStages);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Retouche échouée');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tab-content assets-tab">
      <div className="assets-toolbar">
        <div>
          <h3>Usine assets — par famille</h3>
          <p className="muted">Héros, ennemis, boss, cartes et props restent isolés. Lancez les stages de découpage et d&apos;animation depuis chaque asset.</p>
          {isShowcaseMode ? <p className="muted">Mode showcase : actions désactivées (BDD hors ligne).</p> : null}
        </div>
        <div className="assets-create-row">
          <input className="text-input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Nom de l'asset" />
          <select className="text-input select-sm" value={newRole} onChange={(e) => setNewRole(e.target.value as GameProjectAsset['role'])}>
            <option value="hero">Héros</option>
            <option value="enemy">Ennemi</option>
            <option value="boss">Boss</option>
            <option value="npc">PNJ</option>
            <option value="environment">Carte / environnement</option>
            <option value="prop">Prop</option>
            <option value="ui">UI</option>
            <option value="fx">FX</option>
            <option value="music">Musique</option>
          </select>
          <select className="text-input select-sm" value={newKind} onChange={(e) => setNewKind(e.target.value as GameProjectAsset['kind'])}>
            <option value="character">Personnage</option>
            <option value="environment">Environnement</option>
            <option value="prop">Prop</option>
            <option value="ui">UI</option>
            <option value="fx">FX</option>
            <option value="audio">Audio</option>
          </select>
          <button className="btn-secondary" disabled={busy || !newTitle.trim() || isShowcaseMode} onClick={() => void handleCreate()}>
            Ajouter
          </button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
      </div>

      <div className="mb-4 mt-4">
        <AssetFamilyGrid
          assets={visibleAssets}
          selectedAssetId={selectedAssetId}
          activeFamilyId={activeFamilyId}
          onSelectFamily={setActiveFamilyId}
        />
      </div>

      <div className="asset-grid">
        {filteredAssets.map((asset) => {
          const sources = sourcesByAsset.get(asset.id) ?? [];
          const preview = sources[0]?.url ?? null;
          const family = getFamilyForRole(asset.role);
          const isSelected = selectedAssetId === asset.id;

          return (
            <article
              key={asset.id}
              className={`asset-card ${isSelected ? 'asset-card-selected' : ''}`}
              onClick={() => setSelectedAssetId(asset.id)}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedAssetId(asset.id)}
              role="button"
              tabIndex={0}
            >
              <div className="asset-card-head">
                <div className="asset-card-tags">
                  <span className="chip chip-sm">{family?.labelFr ?? asset.role}</span>
                  <span className="chip chip-sm chip-muted">{asset.kind}</span>
                  <span className="chip chip-sm" style={{ color: STATUS_COLOR[asset.status] }}>{asset.status}</span>
                </div>
                <strong className="asset-title">{asset.title}</strong>
              </div>

              <div className="asset-preview-area">
                {preview ? <img className="asset-preview-img" src={preview} alt={asset.title} /> : <div className="asset-preview-empty">Aucune référence</div>}
              </div>

              {isSelected && !isShowcaseMode ? (
                <div className="mt-3 border-t border-white/10 pt-3" onClick={(e) => e.stopPropagation()}>
                  <AssetStageBar stages={stages} busyStage={busyStage} disabled={busy} onRunStage={(id) => void handleRunStage(id)} />
                  <button
                    type="button"
                    className="factory-mini-btn mt-2"
                    disabled={busy}
                    onClick={() => void handleRetouch()}
                  >
                    Retoucher image (auto IoU)
                  </button>
                </div>
              ) : null}

              <label className="upload-trigger upload-trigger-sm" onClick={(e) => e.stopPropagation()}>
                Joindre référence
                <input type="file" accept="image/*" disabled={isShowcaseMode} onChange={(e) => void handleUpload(asset.id, e.target.files?.[0] ?? null)} />
              </label>

              <div className="asset-proto-actions" onClick={(e) => e.stopPropagation()}>
                {PROTOTYPE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    className="factory-mini-btn"
                    disabled={busy || isShowcaseMode}
                    onClick={() => void handlePrototype(asset.id, preset.presets ? [...preset.presets] : undefined)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </article>
          );
        })}

        {filteredAssets.length === 0 ? <p className="muted">Aucun asset dans cette famille.</p> : null}
      </div>

      {selectedAsset && (selectedAsset.kind === 'character' || selectedAsset.role === 'hero') ? (
        <CorpsPreview rigJson={rigJson} partUrls={rigPartUrls} title={`Corps — ${selectedAsset.title}`} />
      ) : null}
    </div>
  );
}
