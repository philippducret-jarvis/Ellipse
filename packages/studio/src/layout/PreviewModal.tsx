interface Props {
  url: string;
  title: string;
  onClose: () => void;
}

export function PreviewModal({ url, title, onClose }: Props) {
  return (
    <div className="es-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="es-modal es-modal-preview"
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
          <button type="button" className="es-btn es-btn-ghost es-modal-close" onClick={onClose}>
            Fermer
          </button>
        </header>
        <iframe className="es-preview-frame" src={url} title={title} />
      </div>
    </div>
  );
}
