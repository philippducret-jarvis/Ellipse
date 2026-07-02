import { useEffect, useRef, useState } from 'react';
import { Application, Container } from 'pixi.js';
import { createSkeletal2D, idlePosePhase, parseRigSpec } from '@ellipse/engine';

interface Props {
  rigJson: string | null;
  partUrls?: Record<string, string>;
  title?: string;
}

/** F2 — Preview Corps manipulable (rig bones). */
export function CorpsPreview({ rigJson, partUrls = {}, title = 'Corps' }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el || !rigJson) return;

    let app: Application | null = null;
    let disposed = false;
    let phase = 0;

    void (async () => {
      try {
        const rig = parseRigSpec(JSON.parse(rigJson));
        if (!rig) {
          setError('rig.json invalide');
          return;
        }
        app = new Application();
        await app.init({ width: 320, height: 400, backgroundColor: 0x1a1a2e, antialias: true });
        if (disposed) {
          app.destroy(true);
          return;
        }
        el.innerHTML = '';
        el.appendChild(app.canvas);

        const skel = await createSkeletal2D(rig, partUrls);
        const wrap = new Container();
        wrap.position.set(160, 200);
        wrap.addChild(skel.root);
        app.stage.addChild(wrap);

        app.ticker.add(() => {
          phase += 0.016;
          skel.playPose(idlePosePhase(phase));
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur rig preview');
      }
    })();

    return () => {
      disposed = true;
      app?.destroy(true);
      if (el) el.innerHTML = '';
    };
  }, [rigJson, partUrls]);

  if (!rigJson) {
    return (
      <div className="corps-preview-empty muted">
        Importez et riggez un asset (stage 04) pour manipuler le Corps ici.
      </div>
    );
  }

  return (
    <section className="corps-preview-panel">
      <header>
        <strong>{title}</strong>
        <span className="muted"> F2 — Bones · idle bob</span>
      </header>
      <div ref={mountRef} className="corps-preview-canvas" />
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
