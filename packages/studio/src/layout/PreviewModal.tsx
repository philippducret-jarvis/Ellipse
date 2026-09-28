import { useEffect, useRef, useState } from 'react';

interface Props {
  url: string;
  title: string;
  onClose: () => void;
}

export function PreviewModal({ url, title, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);

  useEffect(() => {
    const syncFullscreen = () => {
      const active = document.fullscreenElement === dialogRef.current;
      setNativeFullscreen(previous => {
        if (previous && !active) setExpanded(false);
        return active;
      });
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (document.fullscreenElement === dialogRef.current) return;
      if (expanded) setExpanded(false);
      else onClose();
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [expanded, onClose]);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement === dialogRef.current) {
      await document.exitFullscreen();
      setExpanded(false);
      return;
    }
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    try {
      await dialogRef.current?.requestFullscreen();
    } catch {
      // CSS still fills the Studio window if the host denies the browser API.
    }
  };

  return (
    <div className="es-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className={`es-modal es-modal-preview${expanded ? ' is-expanded' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Aperçu jouable — ${title}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="es-modal-header">
          <div>
            <h2 className="es-modal-title">Preview jouable</h2>
            <p className="es-modal-sub">Moteur Ellipse — validez le rendu avant export</p>
          </div>
          <div className="es-preview-actions">
            <button type="button" className="es-btn es-btn-ghost" onClick={() => void toggleFullscreen()}>
              {expanded || nativeFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            </button>
            <a className="es-btn es-btn-ghost" href={url} target="_blank" rel="noreferrer">Ouvrir à part</a>
            <button type="button" className="es-btn es-btn-ghost es-modal-close" onClick={onClose}>Fermer</button>
          </div>
        </header>
        <iframe className="es-preview-frame" src={url} title={title} allowFullScreen />
      </div>
    </div>
  );
}
