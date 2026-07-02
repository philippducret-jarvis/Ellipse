import type { ChangeEvent } from 'react';
import type { GameProjectSnapshot, GenerationPlan } from '@ellipse/shared';
import type { UploadedFile } from '../../../api/client.js';

interface Props {
  snap: GameProjectSnapshot | null;
  prompt: string;
  uploads: UploadedFile[];
  generating: boolean;
  status: string | null;
  error: string | null;
  canGenerate: boolean;
  plan: GenerationPlan | null;
  onPromptChange: (value: string) => void;
  onUploadChange: (file: File | null) => void;
  onRemoveUpload: (path: string) => void;
  onGenerate: () => void;
  onStop: () => void;
}

export function GeneratePromptPanel({
  snap,
  prompt,
  uploads,
  generating,
  status,
  error,
  canGenerate,
  plan,
  onPromptChange,
  onUploadChange,
  onRemoveUpload,
  onGenerate,
  onStop,
}: Props) {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onPromptChange(event.target.value);
  };

  return (
    <section className="panel generate-prompt-panel">
      <h3>Prompt de génération</h3>
      <p className="muted generate-hint">
        {snap ? `Génération pour : ${snap.project.title}` : 'Aucun projet sélectionné'}
      </p>

      <textarea
        className="text-input textarea generate-textarea"
        rows={4}
        value={prompt}
        onChange={handleChange}
        placeholder={
          snap?.project.source_prompt ??
          'Décrivez ce qu’il faut produire, ou laissez vide pour réutiliser le concept d’origine…'
        }
      />

      <div className="generate-upload-row">
        <label className="upload-trigger upload-trigger-sm">
          Ajouter une photo
          <input type="file" accept="image/*" onChange={(event) => onUploadChange(event.target.files?.[0] ?? null)} />
        </label>
        {uploads.map((upload) => (
          <div key={upload.path} className="upload-preview-thumb">
            <img src={upload.url} alt="" />
            <button className="upload-remove" onClick={() => onRemoveUpload(upload.path)} aria-label="Retirer">
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="generate-actions">
        {generating ? (
          <button className="btn-ghost" onClick={onStop}>
            Arrêter
          </button>
        ) : null}
        <button className="btn-primary generate-btn" disabled={generating || !canGenerate} onClick={onGenerate}>
          {generating ? (
            <>
              <span className="spinner-sm" /> Génération en cours…
            </>
          ) : (
            'Lancer les agents'
          )}
        </button>
      </div>

      {status ? (
        <p className="generate-status">
          <span className="spinner-sm" /> {status}
        </p>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}

      {plan ? (
        <div className="plan-summary">
          <p className="plan-summary-label">
            Plan Cortex : {plan.tasks.length} agents · ~{plan.estimated_duration_minutes} min
          </p>
          <p className="muted plan-notes">{plan.master_notes}</p>
        </div>
      ) : null}
    </section>
  );
}
