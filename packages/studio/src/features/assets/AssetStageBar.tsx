import type { AssetStageId } from '@ellipse/shared';

export interface AssetStageStatus {
  id: AssetStageId;
  label: string;
  labelFr: string;
  complete: boolean;
  artifacts: string[];
}

interface Props {
  stages: AssetStageStatus[];
  busyStage: AssetStageId | null;
  onRunStage: (stageId: AssetStageId) => void;
  disabled?: boolean;
}

const RUNNABLE: AssetStageId[] = ['02_cutouts', '03_cleanup', '05_animation', '08_remote_jobs'];

export function AssetStageBar({ stages, busyStage, onRunStage, disabled }: Props) {
  if (stages.length === 0) {
    return <p className="text-sm text-[var(--color-muted)]">Chargement des stages…</p>;
  }

  const completed = stages.filter((s) => s.complete && s.id !== '08_remote_jobs').length;
  const total = stages.filter((s) => s.id !== '08_remote_jobs').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--color-muted)]">Pipeline production</span>
        <span className="font-medium text-[var(--color-text)]">{completed}/{total} stages</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {stages
          .filter((s) => s.id !== '08_remote_jobs')
          .map((stage) => (
            <StageChip
              key={stage.id}
              stage={stage}
              busy={busyStage === stage.id}
              runnable={RUNNABLE.includes(stage.id)}
              disabled={disabled}
              onRun={() => onRunStage(stage.id)}
            />
          ))}
      </div>
    </div>
  );
}

function StageChip({
  stage,
  busy,
  runnable,
  disabled,
  onRun,
}: {
  stage: AssetStageStatus;
  busy: boolean;
  runnable: boolean;
  disabled?: boolean;
  onRun: () => void;
}) {
  return (
    <div
      className={[
        'flex min-w-[140px] flex-col gap-1 rounded-lg border px-2 py-2 text-xs',
        stage.complete ? 'border-[var(--color-success)]/40 bg-[var(--color-success)]/10' : 'border-white/10 bg-[var(--color-surface-raised)]',
      ].join(' ')}
    >
      <div className="font-medium text-[var(--color-text)]">
        {stage.id === '08_remote_jobs' ? '08 retouche' : stage.id.replace('_', ' ')}
      </div>
      <div className="text-[var(--color-muted)]">{stage.labelFr}</div>
      {runnable ? (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={onRun}
          className="mt-1 rounded-md bg-[var(--color-accent)] px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'En cours…' : stage.complete ? 'Relancer' : 'Lancer'}
        </button>
      ) : (
        <span className="mt-1 text-[10px] text-[var(--color-muted)]">{stage.complete ? 'OK' : '—'}</span>
      )}
    </div>
  );
}
