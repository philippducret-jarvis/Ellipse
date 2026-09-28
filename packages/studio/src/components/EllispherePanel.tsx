import { useEffect, useRef, useState } from 'react';
import { askAssistant, assistantHealth, type AssistantMessage, type AssistantAction } from '../api/client.js';

interface Turn extends AssistantMessage {
  actions?: AssistantAction[];
}

/** Ellisphere — intelligence de production du studio, reliée aux états réels. */
export function EllispherePanel() {
  const [open, setOpen] = useState(false);
  const [brain, setBrain] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) void assistantHealth().then((health) => setBrain(health.brain)).catch(() => setBrain(null));
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    const nextTurns: Turn[] = [...turns, { role: 'user', content: text }];
    setTurns(nextTurns);
    setBusy(true);
    try {
      const history: AssistantMessage[] = nextTurns.map((turn) => ({ role: turn.role, content: turn.content }));
      const response = await askAssistant(history);
      setBrain(response.brain);
      setTurns([...nextTurns, { role: 'assistant', content: response.reply, actions: response.actions }]);
    } catch {
      setTurns([...nextTurns, { role: 'assistant', content: '⚠ Je suis hors ligne. Démarre Ellisphere avec `pnpm forge:assistant`.' }]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="es-ellisphere-fab" onClick={() => setOpen(true)} title="Parler à Ellisphere" aria-label="Ouvrir Ellisphere" type="button">
        <span>✦</span>
      </button>
    );
  }

  return (
    <aside className="es-ellisphere" aria-label="Ellisphere, intelligence de production">
      <header className="es-ellisphere-head">
        <div className="es-ellisphere-identity">
          <span className="es-ellisphere-mark">✦</span>
          <span><strong>Ellisphere</strong><small>Intelligence de production</small></span>
        </div>
        <div className="es-ellisphere-health">
          <span className={brain ? 'is-online' : ''}>{brain ? `cerveau · ${brain}` : 'connexion…'}</span>
          <button className="es-ellisphere-close" onClick={() => setOpen(false)} aria-label="Fermer Ellisphere" type="button">✕</button>
        </div>
      </header>
      <div className="es-ellisphere-log" ref={scrollRef} aria-live="polite">
        {turns.length === 0 ? (
          <div className="es-ellisphere-hint">
            <strong>Je vois les jeux, leurs runtimes et leurs gates réels.</strong>
            <span>Essayez : « audite Orbes », « état qualité de Veloria » ou « quels agents travaillent sur Echoes ? »</span>
          </div>
        ) : null}
        {turns.map((turn, index) => (
          <div key={index} className={`es-ellisphere-msg es-ellisphere-${turn.role}`}>
            {turn.actions?.length ? (
              <div className="es-ellisphere-actions">
                {turn.actions.map((action, actionIndex) => <span key={actionIndex} className="es-ellisphere-action">✦ {action.tool}</span>)}
              </div>
            ) : null}
            <div className="es-ellisphere-bubble">{turn.content}</div>
          </div>
        ))}
        {busy ? <div className="es-ellisphere-msg es-ellisphere-assistant"><div className="es-ellisphere-bubble es-ellisphere-typing">✦ · ·</div></div> : null}
      </div>
      <div className="es-ellisphere-input">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }}
          placeholder="Demandez à Ellisphere…"
          aria-label="Message pour Ellisphere"
          rows={2}
        />
        <button onClick={() => void send()} disabled={busy || !input.trim()} type="button">Envoyer</button>
      </div>
    </aside>
  );
}
