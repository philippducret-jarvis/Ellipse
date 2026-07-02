import { useEffect, useMemo, useRef, useState, startTransition } from 'react';
import {
  fetchProjectWorkspace,
  fetchGameProject,
  extractAsset,
  uploadReference,
  type WorkspaceTreeEntry,
  type ExtractAssetResult,
} from '../../api/client.js';
import type { GameProjectSnapshot } from '@ellipse/shared';

const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp'];
interface RefImage { name: string; path: string; url: string }
interface Box { left: number; top: number; width: number; height: number }

function flatten(tree: WorkspaceTreeEntry[], acc: RefImage[] = []): RefImage[] {
  for (const e of tree) {
    if (e.type === 'directory' && e.children) flatten(e.children, acc);
    else if (e.type === 'file' && e.url && IMAGE_EXT.some((x) => e.name.toLowerCase().endsWith(x))) {
      acc.push({ name: e.name, path: e.path, url: e.url });
    }
  }
  return acc;
}

const FAMILIES = ['enemy', 'boss', 'npc', 'hero', 'prop', 'collectible', 'environment', 'fx'];

export function ExtractionTab({ projectId, onUpdate }: { projectId: string; onUpdate: (s: GameProjectSnapshot) => void }) {
  const [images, setImages] = useState<RefImage[]>([]);
  const [selected, setSelected] = useState<RefImage | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [name, setName] = useState('');
  const [family, setFamily] = useState('enemy');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractAssetResult | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  async function loadRefs(): Promise<RefImage[]> {
    try {
      const ws = await fetchProjectWorkspace(projectId);
      const refs = flatten(ws.tree).filter((i) => i.path.includes('01_inputs/references'));
      const list = refs.length ? refs : flatten(ws.tree);
      setImages(list);
      return list;
    } catch {
      setImages([]);
      return [];
    }
  }

  useEffect(() => {
    void loadRefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleUploadRef(file: File | null): Promise<void> {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const up = await uploadReference(projectId, file);
      const list = await loadRefs();
      const justAdded = list.find((i) => i.path === up.path) ?? { name: up.name, path: up.path, url: up.url };
      setSelected(justAdded);
      setBox(null);
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de l’import');
    } finally {
      setUploading(false);
    }
  }

  function pointInImage(e: React.MouseEvent): { x: number; y: number } {
    const r = imgRef.current!.getBoundingClientRect();
    return { x: Math.max(0, Math.min(r.width, e.clientX - r.left)), y: Math.max(0, Math.min(r.height, e.clientY - r.top)) };
  }
  function onDown(e: React.MouseEvent) {
    if (!selected) return;
    const p = pointInImage(e);
    startRef.current = p;
    setDrawing(true);
    setBox({ left: p.x, top: p.y, width: 0, height: 0 });
    setResult(null);
  }
  function onMove(e: React.MouseEvent) {
    if (!drawing || !startRef.current) return;
    const p = pointInImage(e);
    const s = startRef.current;
    setBox({ left: Math.min(s.x, p.x), top: Math.min(s.y, p.y), width: Math.abs(p.x - s.x), height: Math.abs(p.y - s.y) });
  }
  function onUp() {
    setDrawing(false);
  }

  const naturalBox = useMemo(() => {
    if (!box || !imgRef.current) return null;
    const img = imgRef.current;
    const scale = img.naturalWidth / img.clientWidth;
    return {
      left: Math.round(box.left * scale),
      top: Math.round(box.top * scale),
      width: Math.round(box.width * scale),
      height: Math.round(box.height * scale),
    };
  }, [box]);

  async function handleExtract() {
    if (!selected || !naturalBox || naturalBox.width < 8 || naturalBox.height < 8) {
      setError('Trace un rectangle autour du sujet.');
      return;
    }
    if (!name.trim()) {
      setError('Donne un nom à l’asset.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await extractAsset(projectId, { source: selected.path, name: name.trim(), family, box: naturalBox });
      setResult(res);
      const updated = await fetchGameProject(projectId);
      startTransition(() => onUpdate(updated));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec du détourage');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tab-content extract">
      <header className="extract-head">
        <h2>Extraction par sélection</h2>
        <span className="muted">Ouvre une planche, trace un rectangle autour d’un sujet → Ellipse le détoure et l’ajoute aux assets.</span>
      </header>

      <div className="extract-layout">
        <aside className="extract-refs">
          <div className="form-label">Planches & références</div>
          <label className="upload-trigger upload-trigger-sm extract-import">
            {uploading ? 'Import…' : '+ Importer une planche'}
            <input type="file" accept="image/*" disabled={uploading} onChange={(e) => void handleUploadRef(e.target.files?.[0] ?? null)} />
          </label>
          {images.length === 0 ? <p className="muted">Aucune planche. Importe tes images (PNG/JPG) ci-dessus.</p> : null}
          {images.map((img) => (
            <button key={img.path} className={`extract-ref ${selected?.path === img.path ? 'active' : ''}`} onClick={() => { setSelected(img); setBox(null); setResult(null); }}>
              <img src={img.url} alt={img.name} />
              <span>{img.name}</span>
            </button>
          ))}
        </aside>

        <div className="extract-stage">
          {selected ? (
            <div
              className="extract-canvas"
              onMouseDown={onDown}
              onMouseMove={onMove}
              onMouseUp={onUp}
              onMouseLeave={onUp}
            >
              <img ref={imgRef} src={selected.url} alt={selected.name} draggable={false} />
              {box ? <div className="extract-box" style={{ left: box.left, top: box.top, width: box.width, height: box.height }} /> : null}
            </div>
          ) : (
            <div className="extract-placeholder muted">Sélectionne une planche à gauche.</div>
          )}

          <div className="extract-controls">
            <input className="text-input" placeholder="Nom (ex: sporeling)" value={name} onChange={(e) => setName(e.target.value)} />
            <select className="text-input select-sm" value={family} onChange={(e) => setFamily(e.target.value)}>
              {FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <button className="btn-primary" disabled={busy || !selected || !box} onClick={() => void handleExtract()}>
              {busy ? 'Détourage…' : 'Détourer la sélection'}
            </button>
          </div>
          {error ? <p className="form-error">{error}</p> : null}

          {result ? (
            <div className="extract-result">
              <div className="form-label">Résultat ({(result.removed_ratio * 100).toFixed(0)}% fond retiré) · {result.width}×{result.height}</div>
              <img className="extract-result-img" src={result.url} alt={result.name} />
              <p className="muted">Ajouté aux assets : {result.name}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
