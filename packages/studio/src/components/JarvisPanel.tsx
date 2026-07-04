import { useEffect, useRef, useState } from 'react';
import { askAssistant, assistantHealth, type AssistantMessage, type AssistantAction } from '../api/client.js';

interface Turn extends AssistantMessage {
  actions?: AssistantAction[];
}

/** Jarvis — assistant conversationnel du studio (vrai LLM + outils réels). */
export function JarvisPanel() {
  const [open, setOpen] = useState(false);
  const [brain, setBrain] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) void assistantHealth().then((h) => setBrain(h.brain));
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
      const history: AssistantMessage[] = nextTurns.map((t) => ({ role: t.role, content: t.content }));
      const res = await askAssistant(history);
      setBrain(res.brain);
      setTurns([...nextTurns, { role: 'assistant', content: res.reply, actions: res.actions }]);
    } catch {
      setTurns([...nextTurns, { role: 'assistant', content: '⚠ Je suis hors-ligne. Démarre-moi avec `pnpm forge:assistant`.' }]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="es-jarvis-fab" onClick={() => setOpen(true)} title="Parler à Jarvis" type="button">
        🤖
      </button>
    );
  }

  return (
    <div className="es-jarvis">
      <header className="es-jarvis-head">
        <div>
          <strong>Jarvis</strong>
          <span className="es-jarvis-brain">{brain ? `cerveau · ${brain}` : 'connexion…'}</span>
        </div>
        <button className="es-jarvis-close" onClick={() => setOpen(false)} type="button">✕</button>
      </header>
      <div className="es-jarvis-log" ref={scrollRef}>
        {turns.length === 0 ? (
          <div className="es-jarvis-hint">
            Salut, je suis Jarvis. Je connais tes jeux et je peux agir dessus.<br />
            Essaie : « quels jeux ai-je ? », « corse le boss de Veloria », « raconte l’histoire d’Echoes ».
          </div>
        ) : null}
        {turns.map((t, i) => (
          <div key={i} className={`es-jarvis-msg es-jarvis-${t.role}`}>
            {t.actions?.length ? (
              <div className="es-jarvis-actions">
                {t.actions.map((a, j) => <span key={j} className="es-jarvis-action">⚙ {a.tool}</span>)}
              </div>
            ) : null}
            <div className="es-jarvis-bubble">{t.content}</div>
          </div>
        ))}
        {busy ? <div className="es-jarvis-msg es-jarvis-assistant"><div className="es-jarvis-bubble es-jarvis-typing">…</div></div> : null}
      </div>
      <div className="es-jarvis-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder="Parle à Jarvis…"
          rows={2}
        />
        <button onClick={() => void send()} disabled={busy || !input.trim()} type="button">Envoyer</button>
      </div>
    </div>
  );
}
