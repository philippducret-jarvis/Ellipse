import { startTransition, useState } from 'react';
import { useStudioStore } from '../store/studio-store.js';
import { createGameProject, fetchGameProjects, uploadPhoto } from '../api/client.js';

export function NewProjectModal() {
  const setOpen = useStudioStore((s) => s.setNewProjectOpen);
  const setProjects = useStudioStore((s) => s.setProjects);
  const setActiveProject = useStudioStore((s) => s.setActiveProject);
  const setActiveSnapshot = useStudioStore((s) => s.setActiveSnapshot);

  const [title, setTitle] = useState('');
  const [concept, setConcept] = useState('');
  const [story, setStory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImageUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadPhoto(file);
      setUploadedImages((prev) => [...prev, result.url]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi");
    } finally {
      setUploading(false);
    }
  }

  async function handleCreate() {
    const prompt = [concept.trim(), story.trim() ? `Histoire : ${story.trim()}` : ''].filter(Boolean).join('\n\n');
    if (!prompt) return;
    setBusy(true);
    setError(null);
    try {
      const snap = await createGameProject({ title: title.trim() || undefined, prompt, images: uploadedImages });
      const refreshed = await fetchGameProjects();
      startTransition(() => {
        setProjects(refreshed);
        setActiveProject(snap.project.id);
        setActiveSnapshot(snap);
      });
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de la création du projet');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="modal-panel">
        <div className="modal-head">
          <h2>Projet rapide</h2>
          <button className="modal-close" onClick={() => setOpen(false)} aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <label className="form-label">
            Nom du jeu <span className="form-hint">(optionnel)</span>
            <input
              className="text-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex. Course des Cendres"
            />
          </label>

          <label className="form-label">
            Concept central <span className="form-required">*</span>
            <textarea
              className="text-input textarea"
              rows={4}
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Héros, boucle de gameplay, ennemis, style artistique, plateforme…"
            />
          </label>

          <label className="form-label">
            Graine narrative <span className="form-hint">(optionnel)</span>
            <textarea
              className="text-input textarea"
              rows={2}
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="Univers, motivation du héros, antagoniste…"
            />
          </label>

          <div className="form-label">
            Images de référence <span className="form-hint">(optionnel)</span>
            <div className="upload-zone">
              <label className="upload-trigger">
                {uploading ? 'Envoi…' : '+ Ajouter une photo'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={uploading}
                  onChange={(e) => void handleImageUpload(e.target.files?.[0] ?? null)}
                />
              </label>
              {uploadedImages.length > 0 ? (
                <div className="upload-previews">
                  {uploadedImages.map((url) => (
                    <div key={url} className="upload-preview-thumb">
                      <img src={url} alt="" />
                      <button
                        className="upload-remove"
                        onClick={() => setUploadedImages((p) => p.filter((u) => u !== url))}
                        aria-label="Retirer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {error ? <p className="form-error">{error}</p> : null}
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={() => setOpen(false)}>
            Annuler
          </button>
          <button className="btn-primary" disabled={busy || !concept.trim()} onClick={() => void handleCreate()}>
            {busy ? 'Structuration…' : 'Créer le workspace'}
          </button>
        </div>
      </div>
    </div>
  );
}
