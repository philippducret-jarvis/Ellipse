import { useState } from 'react';
import type { GameProjectDocument, GameProjectSnapshot } from '@ellipse/shared';

const KIND_LABELS: Record<string, string> = {
  pitch: 'Pitch',
  game_design_document: 'Game Design',
  narrative_bible: 'Story',
  art_direction: 'Art Direction',
  technical_design: 'Technical Design',
  production_plan: 'Production Plan',
  iteration_brief: 'Iteration Brief',
};

const KIND_COLORS: Record<string, string> = {
  pitch: '#9b59b6',
  game_design_document: '#3498db',
  narrative_bible: '#e74c3c',
  art_direction: '#e67e22',
  technical_design: '#1abc9c',
  production_plan: '#f1c40f',
  iteration_brief: '#95a5a6',
};

export function DocumentsTab({ snap }: { snap: GameProjectSnapshot }) {
  const [selected, setSelected] = useState<GameProjectDocument | null>(snap.documents[0] ?? null);

  return (
    <div className="tab-content documents-tab">
      <aside className="doc-sidebar">
        {snap.documents.map((doc) => (
          <button
            key={doc.id}
            className={`doc-nav-item ${selected?.id === doc.id ? 'active' : ''}`}
            onClick={() => setSelected(doc)}
          >
            <span className="doc-kind-dot" style={{ background: KIND_COLORS[doc.kind] ?? '#888' }} />
            <span>{KIND_LABELS[doc.kind] ?? doc.kind}</span>
          </button>
        ))}
        {snap.documents.length === 0 && <p className="muted doc-empty">No documents yet.</p>}
      </aside>

      <div className="doc-viewer">
        {selected ? (
          <>
            <div className="doc-viewer-head">
              <h2>{selected.title}</h2>
              <div className="doc-viewer-meta">
                <span className="chip" style={{ background: (KIND_COLORS[selected.kind] ?? '#888') + '22', color: KIND_COLORS[selected.kind] ?? '#888' }}>
                  {KIND_LABELS[selected.kind] ?? selected.kind}
                </span>
                <span className="muted">{new Date(selected.created_at ?? '').toLocaleDateString()}</span>
              </div>
            </div>
            <div className="doc-viewer-body">
              <MarkdownContent content={selected.content} />
            </div>
          </>
        ) : (
          <div className="doc-empty-state">
            <p className="muted">Select a document to read it here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  // Very simple markdown renderer for headings + paragraphs
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="doc-h2">{line.slice(3)}</h3>);
    } else if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className="doc-h1">{line.slice(2)}</h2>);
    } else if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i] ?? '').startsWith('- ')) {
        items.push((lines[i] ?? '').slice(2));
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="doc-list">{items.map((item, j) => <li key={j}>{item}</li>)}</ul>);
      continue;
    } else if (line.trim()) {
      elements.push(<p key={i} className="doc-para">{line}</p>);
    }
    i++;
  }
  return <div className="doc-markdown">{elements}</div>;
}
