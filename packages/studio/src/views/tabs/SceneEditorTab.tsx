import { useCallback, useEffect, useState } from 'react';
import type { GameDefinition, GameProjectSnapshot } from '@ellipse/shared';
import { addPlatform, movePlatform } from '@ellipse/shared';
import { fetchProjectWorkspaceFile } from '../../api/client.js';
import { ActionButton } from '../../ui/ActionButton.js';

const DEFAULT_GDL: GameDefinition = {
  meta: { title: 'Scène', dimension: '2d', version: '1.0.0' },
  entities: [],
  scenes: [
    {
      id: 'level_01',
      entities: [],
      layout: {
        width: 800,
        height: 480,
        ground_y: 400,
        spawn: { x: 80, y: 360 },
        platforms: [
          { x: 0, y: 400, w: 800, h: 40, type: 'ground' },
          { x: 200, y: 320, w: 120, h: 20, type: 'platform' },
        ],
        collectibles: [],
        goal: { x: 700, y: 360 },
      },
    },
  ],
  systems: ['physics_platformer', 'collectibles', 'enemy_ai'],
};

export function SceneEditorTab({ snap, onGdlSaved }: { snap: GameProjectSnapshot; onGdlSaved?: () => void }) {
  const [gdl, setGdl] = useState<GameDefinition>(DEFAULT_GDL);
  const [sceneId, setSceneId] = useState('level_01');
  const [platformIndex, setPlatformIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const gdlPath = `05_runtime/gdl/${snap.project.slug.split('-')[0] ?? 'game'}.preview.gdl.json`;

  useEffect(() => {
    void fetchProjectWorkspaceFile(snap.project.id, gdlPath)
      .then((file) => {
        if (file.content) setGdl(JSON.parse(file.content) as GameDefinition);
      })
      .catch(() => {
        void fetchProjectWorkspaceFile(snap.project.id, '05_runtime/gdl/echoes.preview.gdl.json')
          .then((file) => {
            if (file.content) setGdl(JSON.parse(file.content) as GameDefinition);
          })
          .catch(() => {});
      });
  }, [snap.project.id, gdlPath]);

  const scene = gdl.scenes.find((s) => s.id === sceneId) ?? gdl.scenes[0];
  const platforms = scene?.layout?.platforms ?? [];

  const saveGdl = useCallback(async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/projects/${snap.project.id}/gdl`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: gdlPath, gdl }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMessage('GDL enregistré — relancez la preview pour voir les changements.');
      onGdlSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de la sauvegarde');
    } finally {
      setBusy(false);
    }
  }, [gdl, gdlPath, onGdlSaved, snap.project.id]);

  function handleAddPlatform() {
    try {
      const next = addPlatform(gdl, sceneId, { x: 300, y: 300, w: 100, h: 20, type: 'platform' });
      setGdl(next);
      setPlatformIndex(next.scenes.find((s) => s.id === sceneId)?.layout?.platforms.length ?? 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible d\'ajouter la plateforme');
    }
  }

  function handleMovePlatform(dx: number, dy: number) {
    const plat = platforms[platformIndex];
    if (!plat) return;
    try {
      const next = movePlatform(gdl, sceneId, platformIndex, { x: plat.x + dx, y: plat.y + dy });
      setGdl(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Déplacement impossible');
    }
  }

  return (
    <div className="tab-content scene-editor-tab">
      <header className="es-page-header">
        <div>
          <p className="es-kicker">Édition GDL</p>
          <h2 className="es-page-title">Éditeur de scène</h2>
          <p className="es-page-desc">
            Modifiez plateformes et layout — les changements écrivent le GDL typé du projet ({gdlPath}).
          </p>
        </div>
        <ActionButton
          label="Enregistrer le GDL"
          hint="Persiste les modifications dans le workspace et met à jour la preview"
          variant="primary"
          disabled={busy}
          onClick={() => void saveGdl()}
        />
      </header>

      <div className="scene-editor-grid">
        <section className="panel">
          <h3>Scène active</h3>
          <select className="text-input" value={sceneId} onChange={(e) => setSceneId(e.target.value)}>
            {gdl.scenes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}
              </option>
            ))}
          </select>
          <p className="muted" style={{ marginTop: '0.75rem' }}>
            {platforms.length} plateforme(s) · spawn ({scene?.layout?.spawn?.x ?? 0}, {scene?.layout?.spawn?.y ?? 0})
          </p>
        </section>

        <section className="panel">
          <h3>Plateformes</h3>
          <div className="scene-editor-platform-list">
            {platforms.map((p, i) => (
              <button
                key={`${p.x}-${p.y}-${i}`}
                type="button"
                className={`chip ${i === platformIndex ? 'active' : ''}`}
                onClick={() => setPlatformIndex(i)}
              >
                #{i + 1} — {p.type ?? 'platform'} ({p.x}, {p.y})
              </button>
            ))}
          </div>
          <div className="scene-editor-controls" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
            <ActionButton label="Ajouter plateforme" hint="Insère une plateforme à (300, 300)" variant="secondary" onClick={handleAddPlatform} />
            <ActionButton label="← Gauche" hint="Déplace la plateforme sélectionnée" variant="ghost" onClick={() => handleMovePlatform(-16, 0)} />
            <ActionButton label="→ Droite" hint="Déplace la plateforme sélectionnée" variant="ghost" onClick={() => handleMovePlatform(16, 0)} />
            <ActionButton label="↑ Haut" hint="Monte la plateforme" variant="ghost" onClick={() => handleMovePlatform(0, -16)} />
            <ActionButton label="↓ Bas" hint="Descend la plateforme" variant="ghost" onClick={() => handleMovePlatform(0, 16)} />
          </div>
        </section>
      </div>

      {message ? <p className="muted">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <section className="panel" style={{ marginTop: '1rem' }}>
        <h3>Aperçu JSON (scène courante)</h3>
        <pre className="workspace-code-view" style={{ maxHeight: 240, overflow: 'auto' }}>
          {JSON.stringify(scene?.layout ?? {}, null, 2)}
        </pre>
      </section>
    </div>
  );
}
