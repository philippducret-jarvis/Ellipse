import { useStudioStore } from '../store/studio-store.js';
import { SERVICE_LABELS } from '../i18n/fr.js';

function serviceState(state: string): 'is-up' | 'is-down' | 'is-off' {
  if (state === 'up' || state === 'ok' || state === 'connected' || state === 'available') return 'is-up';
  if (state === 'off') return 'is-off';
  return 'is-down';
}

function Pill({ label, state }: { label: string; state: string }) {
  return (
    <span className="es-status-pill" title={`${label} : ${state}`}>
      <span className={`es-status-dot ${serviceState(state)}`} />
      {label}
    </span>
  );
}

export function StatusBar() {
  const health = useStudioStore((s) => s.health);

  if (!health) {
    return (
      <div className="es-status-bar">
        <span className="es-status-pill">
          <span className="es-status-dot is-down" />
          Hors ligne
        </span>
      </div>
    );
  }

  return (
    <div className="es-status-bar">
      <Pill label={SERVICE_LABELS.database} state={health.checks.database} />
      <Pill label={SERVICE_LABELS.bus} state={health.checks.bus} />
      <Pill label={SERVICE_LABELS.comfyui} state={health.checks.comfyui} />
    </div>
  );
}
